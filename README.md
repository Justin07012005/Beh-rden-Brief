# BehördenKlar

Behördenbriefe scannen, in einfacher Sprache verstehen, übersetzen und direkt beantworten.

## Funktionen

- 📷 **Brief scannen** — Foto, Galerie-Bild oder PDF
- 🧠 **KI-Analyse** (Claude Vision) — ein Aufruf liefert strukturiert:
  - „Was will das Amt von mir?" in 2-3 Sätzen (A2-Niveau)
  - Ausführliche Erklärung in einfacher Sprache
  - Fachbegriffe mit Erklärung
  - Fristen & Termine (exakte Daten)
  - Checkliste („Diese Unterlagen mitbringen…")
- 🚦 **Dringlichkeits-Ampel** — lokal berechnet: 🔴 < 7 Tage · 🟡 7–21 Tage · 🟢 keine Frist
- 🌐 **Übersetzung** in 9 Sprachen (Türkisch, Arabisch, Englisch, Russisch, Ukrainisch, Französisch, Farsi, Rumänisch, Polnisch) — on demand, gecacht
- ✍️ **Antwort-Assistent** in 3 Schritten — Art wählen (Terminbestätigung,
  Verschiebung, Widerspruch, Unterlagen nachreichen, Rückfrage) → je Art gezielt
  Angaben ergänzen → Entwurf prüfen. Frei editierbar (wird laufend gesichert),
  Warnung vor dem Export, wenn noch Platzhalter offen sind, PDF- und Text-Export.
  Absenderdaten werden einmal hinterlegt, bleiben verschlüsselt auf dem Gerät und
  werden erst lokal in den fertigen Brief eingesetzt — nie an die KI übertragen.
- 🗓️ **Kalender-Export** für Termine, ⏰ **lokale Erinnerungen** 3 + 1 Tage vor Fristen
- 📖 **Behörden-Glossar** (offline), 🔊 **Vorlese-Funktion**, 📡 **Offline-Hinweis**
- 🔒 **Datenschutz**: Einwilligung vor erstem Scan, alle Daten nur lokal, „Alles löschen"-Funktion

## Starten (Entwicklung)

```bash
npm install
npx expo start
```

App in Expo Go (oder Development Build) öffnen, dann:

1. **Einstellungen** → Anthropic-API-Schlüssel eintragen (von console.anthropic.com).
   Der Schlüssel landet verschlüsselt im Secure Store des Geräts.
2. **Brief scannen** → Einwilligung bestätigen → Foto machen.

> Hinweis: Erinnerungen (Benachrichtigungen) sind in Expo Go auf Android
> eingeschränkt — im Development Build (`npx expo run:android`) voll verfügbar.

## Produktion: Backend-Proxy statt API-Key in der App

Für Endkunden darf kein API-Key in der App stecken. Der fertige Proxy
(Cloudflare Worker) liegt in [`proxy/`](proxy/README.md) — er hält den Key
serverseitig, erlaubt nur die App-Modelle, deckelt `max_tokens` und setzt ein
Tageslimit pro Gerät durch.

Nach dem Deployment (Anleitung: `proxy/README.md`) in
`src/services/claudeClient.ts` die Worker-URL eintragen:

```ts
const PROXY_URL: string | null = 'https://behoerdenklar-proxy.<account>.workers.dev';
```

Abrechnung der Endkunden dann per Abo/In-App-Kauf (Abo-Prüfung im Proxy ergänzen).

## Architektur

```
src/
  services/
    claudeClient.ts   – Low-Level Claude-API-Client (Dev-Direkt / Prod-Proxy)
    analyse.ts        – Vision-Aufruf + JSON-Schema (Structured Output)
    uebersetzung.ts   – Übersetzung pro Sprache, gecacht
    antwort.ts        – Antwort-Entwurf-Generator
    storage.ts        – SecureStore (Key) + AsyncStorage (Archiv, Consent)
    erinnerungen.ts   – lokale Benachrichtigungen vor Fristen
    kalender.ts       – Termin-Export
  utils/ampel.ts      – Dringlichkeits-Ampel (deterministisch, lokal)
  store/useAppStore.ts – Zustand-Store, synchron zu AsyncStorage
  screens/            – Home, Consent, Scan, Analyse, Antwort, Glossar, Einstellungen
  components/         – GrossButton, Ampel (barrierefrei: 56px-Targets, große Schrift)
  data/glossar.ts     – Offline-Glossar
```

Die KI-Antworten sind über **Structured Output** (JSON-Schema) garantiert
valide — kein fragiles Text-Parsing.

## Wichtig

Diese App ersetzt keine Rechtsberatung. Bei rechtlich relevanten Antworten
(z. B. Widerspruch) Beratungsstelle oder Anwalt hinzuziehen.
# Beh-rden-Brief
