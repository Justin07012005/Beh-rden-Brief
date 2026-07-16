# Nachweis: Auftragsverarbeitungsverträge (AVV / DPA)

Dokumentation für die Rechenschaftspflicht (Art. 5 Abs. 2, Art. 28 DSGVO) —
z. B. bei Rückfragen von Kooperationspartnern, Aufsichtsbehörden oder bei der
anwaltlichen Prüfung vorlegen.

Geprüft am: **16.07.2026** (bei Gelegenheit jährlich neu prüfen)

## Verantwortlicher

Justin Klein, Am Schwimmbad 10, 67722 Winnweiler
Konto-E-Mail bei beiden Anbietern: einkauf.justin@gmail.com

## Auftragsverarbeiter 1: Anthropic PBC (KI-Analyse)

| Punkt | Detail |
|---|---|
| Zweck | KI-Analyse der Brieffotos (Claude API) |
| Vertragsgrundlage | Commercial Terms of Service — das **Data Processing Addendum (DPA) ist automatisch Bestandteil**; mit Annahme der Commercial Terms (Konto-Erstellung auf console.anthropic.com) gilt der AVV. Keine separate Unterschrift erforderlich. |
| Drittlandtransfer | EU-Standardvertragsklauseln (SCCs) im DPA enthalten; zusätzlich EU-U.S. Data Privacy Framework |
| Speicherdauer | API-Eingaben max. 30 Tage (Missbrauchserkennung), kein Training mit API-Daten |
| Quellen | https://privacy.claude.com/en/articles/7996862 · https://www.anthropic.com/legal/commercial-terms · https://www.anthropic.com/legal/data-processing-addendum |

## Auftragsverarbeiter 2: Cloudflare, Inc. (Proxy-Server + Webseite)

| Punkt | Detail |
|---|---|
| Zweck | Weiterleitung der Analyse-Anfragen (Worker), Rate-Limit-Zähler (KV), Hosting der Webseite (Pages) |
| Vertragsgrundlage | Self-Serve Subscription Agreement — das **Customer DPA ist per Verweis automatisch Bestandteil**, auch für kostenlose Konten. Keine separate Unterschrift erforderlich. |
| Drittlandtransfer | EU-SCCs im DPA enthalten; Cloudflare ist zudem unter dem EU-U.S. Data Privacy Framework zertifiziert |
| Quellen | https://www.cloudflare.com/cloudflare-customer-dpa/ · https://www.cloudflare.com/trust-hub/gdpr/ |

## Noch zu tun

- [ ] Aktuelle DPA-PDFs beider Anbieter herunterladen und in diesem Ordner
      ablegen (Versionsstand einfrieren — Webseiten ändern sich)
- [ ] Bei der anwaltlichen Prüfung der Datenschutzerklärung diesen Nachweis
      mit vorlegen
- [ ] Wenn später ein Newsletter-Dienst (z. B. Brevo) dazukommt: dessen AVV
      hier ergänzen
