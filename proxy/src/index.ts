/**
 * BehördenKlar Backend-Proxy — Cloudflare Worker
 *
 * Hält den Anthropic-API-Key serverseitig, damit kein Key in der App steckt.
 * Die App schickt denselben Request-Body wie an die Anthropic Messages API;
 * der Worker prüft, limitiert und leitet weiter — die Antwort geht
 * unverändert zurück (die App parst sie wie eine direkte Anthropic-Antwort).
 *
 * Schutzmaßnahmen gegen Missbrauch des Endpunkts:
 *  - Nur POST, nur erlaubte Modelle, max_tokens gedeckelt
 *  - Tageslimit pro Geräte-ID (KV-basiert, weiches Limit)
 *
 * Deployment: siehe proxy/README.md
 */

interface Env {
  /** Geheimnis: `wrangler secret put ANTHROPIC_API_KEY` */
  ANTHROPIC_API_KEY: string;
  /** KV-Namespace für das Rate-Limit (Binding in wrangler.toml) */
  RATE_LIMIT: KVNamespace;
  /** Erlaubte Anfragen pro Gerät und Tag (in wrangler.toml unter [vars]) */
  TAGES_LIMIT: string;
  /** Erlaubte Anfragen pro IP-Adresse und Tag (in wrangler.toml unter [vars]) */
  TAGES_LIMIT_IP: string;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Nur Modelle, die die App tatsächlich nutzt — verhindert, dass ein
 *  extrahierter Endpunkt als Gratis-Zugang für teure Modelle dient. */
const ERLAUBTE_MODELLE = new Set([
  'claude-sonnet-5', // Brief-Analyse (Vision)
  'claude-haiku-4-5', // Übersetzung & Antwort-Entwürfe
]);

const MAX_TOKENS_OBERGRENZE = 16000;

/** Fehlerantwort im Anthropic-Format, damit die App sie normal verarbeitet. */
function fehler(status: number, typ: string, meldung: string): Response {
  return Response.json(
    { type: 'error', error: { type: typ, message: meldung } },
    { status }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return fehler(405, 'invalid_request_error', 'Nur POST erlaubt.');
    }

    // Geräte-ID der App (anonym, dient nur dem Tageslimit)
    const geraeteId = request.headers.get('x-geraete-id');
    if (!geraeteId || !/^g_[a-z0-9]{24}$/.test(geraeteId)) {
      return fehler(400, 'invalid_request_error', 'Fehlende oder ungültige Geräte-ID.');
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return fehler(400, 'invalid_request_error', 'Request-Body ist kein gültiges JSON.');
    }

    if (typeof body.model !== 'string' || !ERLAUBTE_MODELLE.has(body.model)) {
      return fehler(400, 'invalid_request_error', 'Dieses Modell ist nicht erlaubt.');
    }
    // max_tokens deckeln statt ablehnen — schützt vor Kosten-Missbrauch
    if (typeof body.max_tokens !== 'number' || body.max_tokens > MAX_TOKENS_OBERGRENZE) {
      body.max_tokens = MAX_TOKENS_OBERGRENZE;
    }
    // Die App streamt nicht; Streaming würde das Durchreichen verkomplizieren
    if (body.stream) {
      return fehler(400, 'invalid_request_error', 'Streaming wird nicht unterstützt.');
    }

    // Tageslimits prüfen (weiche Limits: KV ist eventually consistent,
    // parallele Anfragen können das Limit minimal überschreiten — okay).
    // Zwei Ebenen: pro Gerät (normale Nutzung) und pro IP-Adresse (dämmt
    // Angreifer ein, die sich beliebig neue Geräte-IDs ausdenken). Das
    // IP-Limit ist bewusst höher, weil sich viele Nutzer eine IP teilen
    // können (Familien-WLAN, Mobilfunk/CGNAT).
    const heute = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get('cf-connecting-ip') ?? 'unbekannt';
    const kvKey = `rl:${geraeteId}:${heute}`;
    const kvKeyIp = `rlip:${ip}:${heute}`;
    const limit = parseInt(env.TAGES_LIMIT || '20', 10);
    const limitIp = parseInt(env.TAGES_LIMIT_IP || '100', 10);
    const [bisher, bisherIp] = (
      await Promise.all([env.RATE_LIMIT.get(kvKey), env.RATE_LIMIT.get(kvKeyIp)])
    ).map((wert) => parseInt(wert ?? '0', 10));
    if (bisher >= limit || bisherIp >= limitIp) {
      return fehler(
        429,
        'rate_limit_error',
        'Tageslimit erreicht. Bitte versuchen Sie es morgen erneut.'
      );
    }

    // An Anthropic weiterleiten — Header werden frisch gebaut, nichts vom
    // Client wird durchgereicht (außer dem geprüften Body)
    const antwort = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    // Nur zählen, wenn die Anfrage Anthropic erreicht hat (5xx kostet kein Kontingent)
    if (antwort.status < 500) {
      await Promise.all([
        env.RATE_LIMIT.put(kvKey, String(bisher + 1), { expirationTtl: 60 * 60 * 48 }),
        env.RATE_LIMIT.put(kvKeyIp, String(bisherIp + 1), { expirationTtl: 60 * 60 * 48 }),
      ]);
    }

    return new Response(antwort.body, {
      status: antwort.status,
      headers: {
        'content-type': antwort.headers.get('content-type') ?? 'application/json',
      },
    });
  },
} satisfies ExportedHandler<Env>;
