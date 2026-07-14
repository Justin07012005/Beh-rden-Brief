# BehördenKlar Backend-Proxy

Cloudflare Worker, der den Anthropic-API-Key serverseitig hält. Die App schickt
ihre Claude-Anfragen an diesen Worker statt direkt an Anthropic — kein API-Key
in der App, Missbrauchsschutz inklusive.

## Was der Worker macht

1. Prüft die anonyme Geräte-ID (`x-geraete-id`-Header) und setzt ein
   **Tageslimit pro Gerät** durch (Standard: 20 Anfragen, siehe `wrangler.toml`)
2. Erlaubt nur die **Modelle, die die App nutzt**, und deckelt `max_tokens`
3. Leitet den Request-Body unverändert an `api.anthropic.com/v1/messages`
   weiter und setzt dabei serverseitig `x-api-key` + `anthropic-version`
4. Gibt die Anthropic-Antwort unverändert zurück

## Deployment (einmalig)

```bash
cd proxy
npm install

# Bei Cloudflare anmelden (kostenloser Account reicht für den Start)
npx wrangler login

# KV-Namespace für das Rate-Limit anlegen …
npx wrangler kv namespace create RATE_LIMIT
# … und die ausgegebene ID in wrangler.toml bei [[kv_namespaces]] eintragen

# Anthropic-API-Key als Secret hinterlegen (von console.anthropic.com)
npx wrangler secret put ANTHROPIC_API_KEY

# Deployen
npm run deploy
```

Der Deploy gibt eine URL aus, z. B. `https://behoerdenklar-proxy.<account>.workers.dev`.

## App umstellen

In [`src/services/claudeClient.ts`](../src/services/claudeClient.ts) die URL eintragen:

```ts
const PROXY_URL: string | null = 'https://behoerdenklar-proxy.<account>.workers.dev';
```

Fertig — die App braucht dann keinen API-Key mehr in den Einstellungen.

## Lokal testen

```bash
npm run dev   # startet den Worker auf http://localhost:8787
```

Dann in `claudeClient.ts` vorübergehend `PROXY_URL = 'http://localhost:8787'`
setzen (im Simulator; auf echtem Gerät die LAN-IP des Rechners verwenden).

## Später ergänzen (wenn Abo/IAP kommt)

- Abo-Prüfung: RevenueCat-Webhook oder Receipt-Validierung vor dem Weiterleiten
- Tageslimit je nach Abo-Stufe (Free: 3, Abo: 20+)
- Die Geräte-ID durch eine echte Nutzer-ID ersetzen
