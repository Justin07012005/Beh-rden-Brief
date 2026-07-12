# webklar-preview-template

Vorlage fuer Kunden-Websites mit automatischer Preview unter `*.project.webklar.com`.

## Preview aktivieren

Dieses Repo enthaelt [`.webklar-preview.json`](.webklar-preview.json). Beim Push auf den konfigurierten Branch startet der Deploy:

- URL: `https://project.webklar.com/webhook/gitea`
- Vorschau: `https://<subdomain>.project.webklar.com`

## Konfiguration (`.webklar-preview.json`)

| Feld | Beschreibung |
|------|----------------|
| `enabled` | `true` = Preview-Deploy aktiv |
| `type` | `static` (Dateien direkt) oder `node_build` (npm build) |
| `branch` | Branch fuer Deploy, z. B. `main` |
| `displayName` | Anzeigename im Kundenportal |
| `subdomain` | Optional; Default = Repo-Name |

**Keine Passwoerter** in dieser Datei.

### Beispiel fuer statische Seite

```json
{
  "enabled": true,
  "type": "static",
  "branch": "main",
  "displayName": "Friseur Mueller",
  "subdomain": "friseur-mueller"
}
```

### Beispiel fuer Vite/React (Build)

```json
{
  "enabled": true,
  "type": "node_build",
  "branch": "main",
  "displayName": "Restaurant Demo",
  "subdomain": "restaurant-demo"
}
```

## Neues Projekt aus dieser Vorlage

1. In Gitea: **Use this template** / Repository aus Template erstellen
2. `displayName` und `subdomain` in `.webklar-preview.json` anpassen
3. Website-Inhalt ersetzen (`index.html` oder eigenes Frontend)
4. Push auf `main` – Webhook deployt automatisch
5. Im Admin-Portal (`project.webklar.com`) Kunde dem Projekt zuweisen

## Gitea-Webhook (einmalig pro Org/Repo)

- **URL:** `https://project.webklar.com/webhook/gitea`
- **Secret:** `GITEA_WEBHOOK_TOKEN` (Server-`.env`)
- **Events:** Push
