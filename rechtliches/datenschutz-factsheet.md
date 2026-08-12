# BehördenKlar — Datenschutz auf einen Blick

**Für Beratungsstellen, Sozialverbände und Kooperationspartner**
Stand: 15.07.2026 · Kontakt: behoerdenbriefhelfer@gmail.com · behoerdenklar.de

> BehördenKlar hilft Menschen, Behördenbriefe zu verstehen: Brief fotografieren,
> Erklärung in einfacher Sprache erhalten — mit Fristen, Checkliste und
> Antwort-Hilfe, auf Wunsch in 9 weiteren Sprachen.
>
> Weil Behördenbriefe hochsensible Daten enthalten, wurde die App von Grund
> auf datensparsam gebaut. Dieses Dokument erklärt transparent, was mit den
> Daten passiert — einschließlich der Punkte, die noch offen sind.

---

## Das Wichtigste in einem Satz

**Es gibt kein Nutzerkonto und keinen zentralen Datenspeicher — die Briefe
Ihrer Klientinnen und Klienten liegen verschlüsselt auf deren eigenem Handy,
nicht bei uns.**

## Der Datenfluss beim Scannen (vollständig)

1. **Foto entsteht auf dem Gerät** und wird vor dem Versand verkleinert.
2. **Übertragung TLS-verschlüsselt** an unseren Vermittlungsserver
   (Cloudflare Workers). Dieser leitet nur weiter — **er speichert keine
   Briefinhalte** (gespeichert wird ausschließlich ein anonymer Tageszähler
   pro Gerät für 48 h, als Missbrauchsschutz).
3. **KI-Analyse bei Anthropic PBC (USA)**, Betreiber des Modells „Claude":
   Verarbeitung nur zur Analyse, **Löschung nach spätestens 30 Tagen, keine
   Nutzung zum KI-Training.**
4. **Ergebnis zurück aufs Gerät** — dort endet der Weg. Keine Kopie bei uns.

## Schutzmaßnahmen in der App (implementiert und überprüfbar)

| Maßnahme | Detail |
|---|---|
| **Lokale Verschlüsselung** | Das gesamte Brief-Archiv ist mit AES-256-GCM verschlüsselt; der Schlüssel liegt im Sicherheitsspeicher des Geräts (iOS Keychain / Android Keystore) und verlässt es nie |
| **App-Sperre** (optional) | Face ID / Fingerabdruck / Geräte-Code beim Öffnen der App |
| **Sichtschutz** | Im App-Umschalter wird der Inhalt verdeckt — keine Brief-Vorschau |
| **Auto-Löschen** (optional) | Briefe werden nach 30 oder 90 Tagen automatisch entfernt |
| **„Alles löschen"** | Ein Tipp entfernt sämtliche Daten inklusive Verschlüsselungs-Schlüssel |
| **Kein Konto** | Keine Registrierung, keine E-Mail, kein Passwort nötig |
| **Kein Tracking** | Keine Analyse-/Werbe-SDKs, keine Werbung, keine Datenweitergabe an Dritte |
| **Einwilligung zuerst** | Vor dem ersten Scan wird verständlich erklärt und aktiv zugestimmt (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a DSGVO) |
| **Server-Härtung** | API-Zugang nur serverseitig, Anfrage-Limits pro Gerät und IP-Adresse |

## Woran wir transparent erinnern (die ehrlichen Punkte)

- **Verarbeitung in den USA:** Die KI-Analyse läuft bei Anthropic (USA), auf
  Grundlage des EU-U.S. Data Privacy Framework bzw. EU-Standardvertragsklauseln.
  Eine Verarbeitung in der EU ist beim Anbieter derzeit nicht verfügbar; wir
  beobachten das und prüfen als Ausbaupfad den Betrieb über EU-Rechenzentren
  (AWS Bedrock, Region Frankfurt).
- **30-Tage-Fenster:** Anthropic hält Anfragen bis zu 30 Tage zur
  Missbrauchserkennung vor — danach automatische Löschung. Wir sagen das offen,
  statt „Ihre Daten verlassen nie das Handy" zu behaupten.
- **Keine Rechtsberatung:** Die App erklärt Briefe, ersetzt aber keine
  Beratung — sie ist als *Ergänzung* Ihrer Arbeit gedacht, nicht als Ersatz.
- **Dieses Dokument ist eine Selbstauskunft**, kein Zertifikat. Die
  vollständige Datenschutzerklärung ist öffentlich:
  https://behoerdenklar.de/datenschutz

## Warum das für Ihre Beratungsarbeit interessant ist

- Klientinnen und Klienten verstehen Briefe **vor** dem Termin — Ihre
  Beratungszeit geht in die Lösung, nicht ins Vorlesen.
- 9 Übersetzungssprachen (u. a. Türkisch, Arabisch, Ukrainisch, Farsi) —
  die deutschen Fachbegriffe bleiben sichtbar und wiedererkennbar.
- Große Schrift, große Tasten, einfache Sprache (A2/B1), Vorlese-Funktion —
  gebaut für Menschen, für die normale Apps zu kompliziert sind.

**Sprechen Sie uns an — wir zeigen die App gern persönlich und beantworten
jede Datenschutz-Rückfrage:** behoerdenbriefhelfer@gmail.com
