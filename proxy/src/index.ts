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
  /** Geheimnis: `wrangler secret put TURNSTILE_SECRET_KEY` (Web-Demo) */
  TURNSTILE_SECRET_KEY: string;
  /** KV-Namespace für das Rate-Limit (Binding in wrangler.toml) */
  RATE_LIMIT: KVNamespace;
  /** Erlaubte Anfragen pro Gerät und Tag (in wrangler.toml unter [vars]) */
  TAGES_LIMIT: string;
  /** Erlaubte Anfragen pro IP-Adresse und Tag (in wrangler.toml unter [vars]) */
  TAGES_LIMIT_IP: string;
  /** Web-Demo: hartes Tagesbudget über alle Nutzer (Kosten-Deckel) */
  DEMO_TAGES_BUDGET: string;
  /** Web-Demo: max. Analysen pro IP innerhalb von 30 Tagen */
  DEMO_LIMIT_IP: string;
  /** Bezahlung: `wrangler secret put STRIPE_SECRET_KEY` (Test: sk_test_…) */
  STRIPE_SECRET_KEY: string;
  /** Bezahlung: `wrangler secret put STRIPE_WEBHOOK_SECRET` (whsec_…) */
  STRIPE_WEBHOOK_SECRET: string;
  /** Bezahlung: `wrangler secret put TOKEN_SIGNING_SECRET` (langer Zufallswert) */
  TOKEN_SIGNING_SECRET: string;
  /** Bezahlung: `wrangler secret put BREVO_API_KEY` (für die Guthaben-Link-Mail) */
  BREVO_API_KEY: string;
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

// ============================================================
// Web-Demo (/demo): 2 Gratis-Analysen direkt auf der Webseite
// ============================================================
//
// Schutzschichten (jede allein wäre umgehbar, zusammen dicht genug):
//  1. Turnstile-Token (Bot-Mauer, wird serverseitig verifiziert)
//  2. Analyse 1 anonym: max. 1 pro IP / 30 Tage
//  3. Analyse 2 nur mit E-Mail: pro E-Mail (Hash) genau 1 — dauerhaft
//  4. IP-Gesamtlimit über 30 Tage (bremst Verlauf-Löscher)
//  5. Globales Tagesbudget (harter Kosten-Deckel für den Betreiber)

/** Nur die eigene Webseite darf den Demo-Endpunkt aufrufen (CORS). */
const DEMO_ORIGIN_MUSTER = /^https:\/\/([a-z0-9-]+\.)?behoerdenklar\.(de|pages\.dev)$/;

/** ~5 MB Datei entsprechen ~6,7 Mio. Base64-Zeichen. */
const DEMO_MAX_BASE64 = 7_000_000;

/** Bekannte Wegwerf-E-Mail-Domains (kleine, pragmatische Liste). */
const WEGWERF_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'temp-mail.org',
  'tempmail.com', 'trashmail.com', 'yopmail.com', 'sharklasers.com',
  'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
]);

/** Identisch zur App (src/services/analyse.ts) — gleiche Qualität in der Demo. */
const DEMO_SYSTEM_PROMPT = `Du bist ein Assistent, der deutschen Behördenbriefe für Privatpersonen verständlich macht. Die Nutzer sind Deutsche, die Amtsdeutsch schwer verstehen, oder Menschen mit Deutsch als Fremdsprache.

Deine Aufgabe:
1. Lies den fotografierten/hochgeladenen Brief vollständig.
2. Erkläre ihn in einfacher Alltagssprache (Sprachniveau A2/B1): kurze Sätze, keine Schachtelsätze, keine unerklärten Fachbegriffe.
3. Extrahiere Fristen und Termine exakt. Datumsangaben immer als ISO-Format (JJJJ-MM-TT). Wenn du ein Datum nicht sicher lesen kannst, lass das Feld null — erfinde niemals Daten.
4. Erstelle eine konkrete Checkliste, was der Nutzer tun muss.
5. Sei sachlich und beruhigend, nicht alarmierend.

Wichtig: Wenn das Bild kein Behördenbrief ist oder unlesbar ist, schreibe das klar in kernaussage und erklaerung_einfach und lasse frist/termin null.`;

/** Schlanke Demo-Variante des Analyse-Schemas (ohne Antwort-Optionen —
 *  der Antwort-Generator bleibt der App vorbehalten). */
const DEMO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['brieftyp', 'absender', 'kernaussage', 'erklaerung_einfach', 'fachbegriffe', 'frist', 'termin', 'checkliste'],
  properties: {
    brieftyp: { type: 'string', description: 'Kurze Kategorie des Briefs, z. B. "Einladung Jobcenter".' },
    absender: { type: 'string', description: 'Die Behörde, die den Brief geschickt hat.' },
    kernaussage: { type: 'string', description: 'Antwort auf "Was will das Amt von mir?" in 2-3 kurzen Sätzen, Sprachniveau A2.' },
    erklaerung_einfach: { type: 'string', description: 'Erklärung des gesamten Briefs in einfacher Alltagssprache (A2/B1). Kurze Sätze.' },
    fachbegriffe: {
      type: 'array',
      description: 'Fachbegriffe aus dem Brief mit einfacher Erklärung.',
      items: {
        type: 'object', additionalProperties: false, required: ['begriff', 'erklaerung'],
        properties: { begriff: { type: 'string' }, erklaerung: { type: 'string' } },
      },
    },
    frist: {
      description: 'Frist, bis wann reagiert werden muss. null wenn keine Frist im Brief steht.',
      anyOf: [
        {
          type: 'object', additionalProperties: false, required: ['datum', 'aktion'],
          properties: { datum: { type: 'string', description: 'ISO JJJJ-MM-TT' }, aktion: { type: 'string' } },
        },
        { type: 'null' },
      ],
    },
    termin: {
      description: 'Persönlicher Termin. null wenn keiner im Brief steht.',
      anyOf: [
        {
          type: 'object', additionalProperties: false, required: ['datum', 'uhrzeit', 'ort'],
          properties: {
            datum: { type: 'string', description: 'ISO JJJJ-MM-TT' },
            uhrzeit: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            ort: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          },
        },
        { type: 'null' },
      ],
    },
    checkliste: { type: 'array', description: 'To-do-Liste. Leer wenn nichts zu tun ist.', items: { type: 'string' } },
  },
};

function demoCorsHeaders(origin: string | null): Record<string, string> {
  const erlaubt = origin && DEMO_ORIGIN_MUSTER.test(origin) ? origin : 'https://behoerdenklar.de';
  return {
    'access-control-allow-origin': erlaubt,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

/** Fehler für die Demo-Seite: { code, meldung } + CORS. */
function demoFehler(status: number, code: string, meldung: string, origin: string | null): Response {
  return Response.json({ code, meldung }, { status, headers: demoCorsHeaders(origin) });
}

/** SHA-256-Hash der E-Mail (mit Pepper) — es wird nie Klartext gespeichert. */
async function emailHash(email: string, pepper: string): Promise<string> {
  const daten = new TextEncoder().encode(`bk-demo|${pepper}|${email}`);
  const digest = await crypto.subtle.digest('SHA-256', daten);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function demoHandler(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: demoCorsHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return demoFehler(405, 'methode', 'Nur POST erlaubt.', origin);
  }
  if (!origin || !DEMO_ORIGIN_MUSTER.test(origin)) {
    return demoFehler(403, 'origin', 'Aufruf nur von der BehördenKlar-Webseite erlaubt.', origin);
  }

  let body: { bild?: string; mimeType?: string; turnstileToken?: string; email?: string; walletToken?: string };
  try {
    body = await request.json();
  } catch {
    return demoFehler(400, 'json', 'Ungültige Anfrage.', origin);
  }

  const { bild, mimeType, turnstileToken } = body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
  const walletToken = typeof body.walletToken === 'string' ? body.walletToken : null;

  if (typeof bild !== 'string' || bild.length === 0 || bild.length > DEMO_MAX_BASE64) {
    return demoFehler(400, 'datei', 'Die Datei fehlt oder ist zu groß (max. 5 MB).', origin);
  }
  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'application/pdf') {
    return demoFehler(400, 'datei', 'Nur Fotos (JPG/PNG) oder PDF sind möglich.', origin);
  }
  if (typeof turnstileToken !== 'string' || !turnstileToken) {
    return demoFehler(403, 'turnstile', 'Sicherheitsprüfung fehlt. Bitte Seite neu laden.', origin);
  }

  // Schicht 1: Turnstile serverseitig verifizieren (niemals nur im Browser!)
  const ip = request.headers.get('cf-connecting-ip') ?? 'unbekannt';
  const pruefung = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: ip }),
  });
  const pruefungJson = (await pruefung.json()) as { success?: boolean };
  if (!pruefungJson.success) {
    return demoFehler(403, 'turnstile', 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden und erneut versuchen.', origin);
  }

  const heute = new Date().toISOString().slice(0, 10);

  // ── Bezahltes Guthaben? ──────────────────────────────────────────
  // Ein gültiges Wallet-Token mit Guthaben umgeht die Gratis-Grenzen
  // (die sind nur ein Kosten-Deckel für die kostenlose Stufe).
  let walletId: string | null = null;
  let walletRest = 0;
  if (walletToken) {
    walletId = await verifyWallet(walletToken, env.TOKEN_SIGNING_SECRET);
    if (!walletId) {
      return demoFehler(403, 'wallet_ungueltig', 'Ihr Zugangs-Token ist ungültig. Bitte laden Sie die Seite neu.', origin);
    }
    walletRest = parseInt((await env.RATE_LIMIT.get(`wallet:${walletId}`)) ?? '0', 10);
    if (walletRest <= 0) {
      return demoFehler(402, 'kein_guthaben', 'Ihr Guthaben ist aufgebraucht. Bitte kaufen Sie neues Guthaben.', origin);
    }
  }
  const bezahlt = walletId !== null;

  // Gratis-Stufe: Kontingent-Schlüssel (werden nur ohne Guthaben benutzt).
  // IP-/Anon-Zähler sind TÄGLICH (Datum im Schlüssel), damit geteilte
  // Anschlüsse (Familie, WLAN, Mobilfunk/CGNAT) nicht sofort blockieren.
  let tagKey = '', ipKey = '', anonKey = '';
  let mailKey: string | null = null;
  let tagZahl = 0, ipZahl = 0, anonZahl = 0;

  if (!bezahlt) {
    // E-Mail prüfen (nur für die 2. Gratis-Analyse nötig)
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return demoFehler(400, 'email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', origin);
      }
      const domain = email.split('@')[1];
      if (WEGWERF_DOMAINS.has(domain)) {
        return demoFehler(400, 'email', 'Wegwerf-E-Mail-Adressen sind nicht möglich. Bitte nutzen Sie Ihre normale Adresse.', origin);
      }
      mailKey = `demo:mail:${await emailHash(email, env.TURNSTILE_SECRET_KEY)}`;
    }

    tagKey = `demo:tag:${heute}`;
    ipKey = `demo:ip:${ip}:${heute}`;
    anonKey = `demo:anon:${ip}:${heute}`;
    const budget = parseInt(env.DEMO_TAGES_BUDGET || '100', 10);
    const ipLimit = parseInt(env.DEMO_LIMIT_IP || '8', 10);
    const ANON_PRO_IP = 3;

    const [tagWert, ipWert, anonWert, mailWert] = await Promise.all([
      env.RATE_LIMIT.get(tagKey),
      env.RATE_LIMIT.get(ipKey),
      env.RATE_LIMIT.get(anonKey),
      mailKey ? env.RATE_LIMIT.get(mailKey) : Promise.resolve(null),
    ]);
    tagZahl = parseInt(tagWert ?? '0', 10);
    ipZahl = parseInt(ipWert ?? '0', 10);
    anonZahl = parseInt(anonWert ?? '0', 10);

    // globales Tagesbudget (Kosten-Deckel der Gratis-Stufe)
    if (tagZahl >= budget) {
      return demoFehler(429, 'budget', 'Die Gratis-Demo ist für heute ausgebucht. Kommen Sie morgen wieder — oder kaufen Sie Guthaben.', origin);
    }
    // IP-Gesamtlimit pro Tag (Missbrauchs-Damm)
    if (ipZahl >= ipLimit) {
      return demoFehler(429, 'aufgebraucht', 'Für heute wurden über diesen Anschluss viele Gratis-Analysen genutzt. Kommen Sie morgen wieder — oder kaufen Sie Guthaben.', origin);
    }
    // nach mehreren anonymen Analysen E-Mail nötig; pro E-Mail dauerhaft 1x
    if (!email && anonZahl >= ANON_PRO_IP) {
      return demoFehler(403, 'email_noetig', 'Für weitere Gratis-Analysen über diesen Anschluss geben Sie bitte Ihre E-Mail-Adresse ein.', origin);
    }
    if (mailKey && mailWert !== null) {
      return demoFehler(429, 'aufgebraucht', 'Mit dieser E-Mail-Adresse wurde die Gratis-Analyse schon genutzt. Bitte kaufen Sie Guthaben, um weiterzumachen.', origin);
    }
  }

  // KI-Analyse — identischer Aufbau wie in der App
  const dateiBlock =
    mimeType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bild } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data: bild } };

  const antwort = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: MAX_TOKENS_OBERGRENZE,
      system: DEMO_SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: DEMO_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            dateiBlock,
            { type: 'text', text: `Analysiere diesen Behördenbrief. Heute ist der ${heute} (wichtig für relative Datumsangaben wie "innerhalb von 14 Tagen").` },
          ],
        },
      ],
    }),
  });

  if (!antwort.ok) {
    const status = antwort.status;
    // Fehlerdetails ins Worker-Log (wrangler tail) — hilft bei der Diagnose
    console.log('Demo-KI-Fehler', status, (await antwort.text()).slice(0, 500));
    if (status === 429 || status >= 500) {
      return demoFehler(503, 'ki', 'Der KI-Dienst ist gerade ausgelastet. Bitte versuchen Sie es in einer Minute erneut.', origin);
    }
    return demoFehler(502, 'ki', 'Die Analyse ist fehlgeschlagen. Bitte versuchen Sie es mit einem neuen, gut beleuchteten Foto.', origin);
  }

  const daten = (await antwort.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };

  // Erst NACH erfolgreichem KI-Aufruf zählen (Fehler kosten kein Kontingent).
  // Tag-, IP- und Anon-Zähler laufen nach 48h ab (sie sind tagesbasiert).
  const TAG_TTL = 60 * 60 * 48;
  if (bezahlt) {
    // Bezahlte Analyse: Guthaben um 1 verringern (kein TTL — bleibt bestehen)
    await env.RATE_LIMIT.put(`wallet:${walletId}`, String(walletRest - 1));
  } else {
    const schreiben: Promise<void>[] = [
      env.RATE_LIMIT.put(tagKey, String(tagZahl + 1), { expirationTtl: TAG_TTL }),
      env.RATE_LIMIT.put(ipKey, String(ipZahl + 1), { expirationTtl: TAG_TTL }),
    ];
    if (!email) {
      schreiben.push(env.RATE_LIMIT.put(anonKey, String(anonZahl + 1), { expirationTtl: TAG_TTL }));
    }
    if (mailKey) {
      // bewusst OHNE TTL: „pro E-Mail für immer nur 1" — es liegt nur der Hash
      schreiben.push(env.RATE_LIMIT.put(mailKey, heute));
    }
    await Promise.all(schreiben);
  }

  if (daten.stop_reason === 'refusal') {
    return demoFehler(422, 'inhalt', 'Die KI konnte diesen Inhalt nicht verarbeiten. Bitte prüfen Sie, ob das Foto wirklich einen Behördenbrief zeigt.', origin);
  }
  const textBlock = [...(daten.content ?? [])].reverse().find((b) => b.type === 'text');
  if (!textBlock?.text) {
    return demoFehler(502, 'ki', 'Die KI hat keine verwertbare Antwort geliefert. Bitte erneut versuchen.', origin);
  }

  let analyse: unknown;
  try {
    analyse = JSON.parse(textBlock.text);
  } catch {
    return demoFehler(502, 'ki', 'Die Antwort war unlesbar. Bitte erneut versuchen.', origin);
  }

  return Response.json(
    {
      analyse,
      versuch: bezahlt ? 'bezahlt' : email ? 2 : 1,
      guthaben: bezahlt ? walletRest - 1 : undefined,
    },
    { headers: demoCorsHeaders(origin) }
  );
}

// ============================================================
// Bezahlung (Stripe) — Credit-Guthaben, passwortlos ("Gutschein"-Prinzip)
// ============================================================
//
// Ablauf:
//  1. /kaufen        -> legt eine Stripe-Checkout-Session an, gibt URL zurück
//  2. Stripe-Bezahlseite (Kartendaten fasst NUR Stripe an)
//  3a. /kauf-status  -> nach Rückkehr: prüft Zahlung, aktiviert Guthaben,
//                       gibt ein signiertes Wallet-Token zurück (localStorage)
//  3b. /stripe-webhook -> Sicherungsnetz: aktiviert Guthaben + mailt den
//                       Wiederherstellungs-Link (Brevo)
//  4. /demo mit walletToken -> Analyse gegen Guthaben (siehe demoHandler)

/** Credit-Pakete: Stripe-Price-ID -> Anzahl Analysen.
 *  NACH dem Anlegen der Produkte in Stripe die echten `price_…`-IDs eintragen. */
const PAKETE: Record<string, { credits: number }> = {
  // Stripe TEST-Preise (Webklar-Sandbox). Für Live später die Live-price_…-IDs.
  'price_1U5Q7RBsRA1AOdneaik2HGkA': { credits: 5 }, // 2,99 € — 5 Analysen
  'price_1U5Q83BsRA1AOdneNIqu1vQL': { credits: 15 }, // 6,99 € — 15 Analysen
};

/** HMAC-SHA256 als Hex. */
async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Konstantzeit-Vergleich zweier Hex-Strings. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Wallet-Token = `<walletId>.<HMAC>`. */
async function signWallet(walletId: string, secret: string): Promise<string> {
  return `${walletId}.${await hmacHex(secret, walletId)}`;
}
async function verifyWallet(token: string, secret: string): Promise<string | null> {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const walletId = token.slice(0, i);
  const sig = token.slice(i + 1);
  return gleich(sig, await hmacHex(secret, walletId)) ? walletId : null;
}

/** Guthaben idempotent aktivieren (pro Stripe-Session nur einmal). */
async function aktiviereGuthaben(env: Env, sessionId: string, walletId: string, credits: number): Promise<void> {
  const flagKey = `wallet_done:${sessionId}`;
  if (await env.RATE_LIMIT.get(flagKey)) return; // schon aktiviert
  await env.RATE_LIMIT.put(`wallet:${walletId}`, String(credits));
  await env.RATE_LIMIT.put(flagKey, '1', { expirationTtl: 60 * 60 * 24 * 400 });
}

/** Guthaben-/Wiederherstellungs-Link per Brevo-Transaktionsmail. */
async function guthabenMail(env: Env, email: string, link: string, credits: number): Promise<void> {
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'BehördenKlar', email: 'behoerdenbriefhelfer@gmail.com' },
      to: [{ email }],
      subject: 'Ihr BehördenKlar-Guthaben',
      htmlContent:
        `<p>Vielen Dank für Ihren Kauf!</p>` +
        `<p>Ihr Guthaben: <strong>${credits} Analysen</strong>.</p>` +
        `<p>Mit diesem Link nutzen Sie Ihr Guthaben auf jedem Gerät:</p>` +
        `<p><a href="${link}">${link}</a></p>` +
        `<p>Bitte bewahren Sie diese E-Mail auf — der Link ist Ihr Zugang.</p>`,
    }),
  });
}

/** POST /kaufen — Stripe-Checkout-Session anlegen. */
async function kaufenHandler(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: demoCorsHeaders(origin) });
  if (request.method !== 'POST') return demoFehler(405, 'methode', 'Nur POST erlaubt.', origin);
  if (!origin || !DEMO_ORIGIN_MUSTER.test(origin)) return demoFehler(403, 'origin', 'Aufruf nur von der BehördenKlar-Webseite erlaubt.', origin);

  let body: { priceId?: string };
  try {
    body = await request.json();
  } catch {
    return demoFehler(400, 'json', 'Ungültige Anfrage.', origin);
  }
  const priceId = typeof body.priceId === 'string' ? body.priceId : '';
  const paket = PAKETE[priceId];
  if (!paket) return demoFehler(400, 'paket', 'Unbekanntes Paket.', origin);

  const walletId = crypto.randomUUID();
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${origin}/demo?kauf=ok&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/demo?kauf=abbruch`);
  params.set('metadata[walletId]', walletId);
  params.set('metadata[credits]', String(paket.credits));
  params.set('metadata[origin]', origin);

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const s = (await r.json()) as { url?: string };
  if (!r.ok || !s.url) {
    console.log('Stripe-Checkout-Fehler', r.status, JSON.stringify(s).slice(0, 300));
    return demoFehler(502, 'stripe', 'Die Bezahlseite konnte nicht geöffnet werden. Bitte später erneut versuchen.', origin);
  }
  return Response.json({ url: s.url }, { headers: demoCorsHeaders(origin) });
}

/** GET /kauf-status?session_id=… — nach Rückkehr: Zahlung prüfen, Guthaben aktivieren, Token liefern. */
async function kaufStatusHandler(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: demoCorsHeaders(origin) });
  if (!origin || !DEMO_ORIGIN_MUSTER.test(origin)) return demoFehler(403, 'origin', 'Nicht erlaubt.', origin);

  const sessionId = new URL(request.url).searchParams.get('session_id') ?? '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return demoFehler(400, 'session', 'Ungültige Sitzung.', origin);

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const s = (await r.json()) as { payment_status?: string; metadata?: Record<string, string> };
  if (!r.ok || s.payment_status !== 'paid') {
    return demoFehler(402, 'nicht_bezahlt', 'Die Zahlung ist noch nicht bestätigt. Bitte einen Moment warten und neu laden.', origin);
  }
  const walletId = s.metadata?.walletId;
  const credits = parseInt(s.metadata?.credits ?? '0', 10);
  if (!walletId || !credits) return demoFehler(500, 'meta', 'Kaufdaten unvollständig.', origin);

  await aktiviereGuthaben(env, sessionId, walletId, credits);
  const token = await signWallet(walletId, env.TOKEN_SIGNING_SECRET);
  const rest = parseInt((await env.RATE_LIMIT.get(`wallet:${walletId}`)) ?? '0', 10);
  return Response.json({ token, guthaben: rest }, { headers: demoCorsHeaders(origin) });
}

/** POST /stripe-webhook — Sicherungsnetz: Signatur prüfen, Guthaben aktivieren, Link mailen. */
async function webhookHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('nur POST', { status: 405 });
  const sigHeader = request.headers.get('stripe-signature') ?? '';
  const payload = await request.text();
  const teile = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=') as [string, string]));
  const t = teile['t'];
  const v1 = teile['v1'];
  if (!t || !v1) return new Response('Signatur fehlt', { status: 400 });
  const erwartet = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`);
  if (!gleich(v1, erwartet)) return new Response('Signatur ungültig', { status: 400 });

  const event = JSON.parse(payload) as {
    type?: string;
    data?: { object?: { id?: string; metadata?: Record<string, string>; customer_details?: { email?: string } } };
  };
  if (event.type === 'checkout.session.completed') {
    const o = event.data?.object;
    const walletId = o?.metadata?.walletId;
    const credits = parseInt(o?.metadata?.credits ?? '0', 10);
    if (o?.id && walletId && credits) {
      await aktiviereGuthaben(env, o.id, walletId, credits);
      const email = o.customer_details?.email;
      const basis = o.metadata?.origin || 'https://behoerdenklar.de';
      if (email) {
        const token = await signWallet(walletId, env.TOKEN_SIGNING_SECRET);
        await guthabenMail(env, email, `${basis}/demo?wallet=${encodeURIComponent(token)}`, credits).catch(() => {});
      }
    }
  }
  return new Response('ok', { status: 200 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pfad = new URL(request.url).pathname;
    // Web-Demo + Bezahl-Routen haben eigene Regeln
    if (pfad === '/demo') return demoHandler(request, env);
    if (pfad === '/kaufen') return kaufenHandler(request, env);
    if (pfad === '/kauf-status') return kaufStatusHandler(request, env);
    if (pfad === '/stripe-webhook') return webhookHandler(request, env);

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
