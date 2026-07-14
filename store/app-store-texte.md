# App-Store-Texte — BehördenKlar (iOS)

Vorbereitet zum Einfügen in App Store Connect, sobald das Apple-Developer-Konto
da ist. Zeichenlimits sind von Apple vorgegeben und hier eingehalten.

---

## App-Name (max. 30 Zeichen)

```
BehördenKlar – Brief-Hilfe
```
*(26 Zeichen ✓ — Alternative: „BehördenKlar" pur; der Untertitel trägt dann den Slogan)*

## Untertitel (max. 30 Zeichen)

```
Amtsdeutsch einfach erklärt
```

## Kategorie

- Primär: **Dienstprogramme** (Utilities)
- Sekundär: **Produktivität**

## Keywords (max. 100 Zeichen, kommagetrennt, ohne Leerzeichen)

```
behörde,amt,brief,bescheid,jobcenter,widerspruch,frist,amtsdeutsch,einfache sprache,übersetzen
```

## Werbetext / Promo-Text (max. 170 Zeichen, jederzeit änderbar)

```
Brief vom Amt? Einfach fotografieren – BehördenKlar erklärt ihn in einfacher Sprache, findet Fristen und hilft beim Antworten. In 10 Sprachen.
```

## Beschreibung (max. 4000 Zeichen)

```
Ein Brief vom Amt – und nichts verstanden? Damit sind Sie nicht allein. BehördenKlar übersetzt Amtsdeutsch in einfache, klare Sprache.

SO FUNKTIONIERT ES
Fotografieren Sie den Brief. Nach weniger als einer Minute wissen Sie:

• Was will das Amt von mir? – in 2-3 einfachen Sätzen
• Was muss ich jetzt tun? – als klare Checkliste
• Bis wann? – alle Fristen und Termine auf einen Blick

DIE AMPEL ZEIGT, WIE DRINGEND ES IST
🔴 Rot: Frist in weniger als 7 Tagen – jetzt handeln
🟡 Gelb: bald erledigen
🟢 Grün: keine Frist, nur zur Information

VERSTEHEN IN IHRER SPRACHE
Alle Erklärungen lassen sich in 9 weitere Sprachen übersetzen: Türkisch, Arabisch, Englisch, Russisch, Ukrainisch, Französisch, Farsi, Rumänisch und Polnisch. Die deutschen Fachbegriffe bleiben stehen, damit Sie sie im Brief wiederfinden.

ANTWORTEN LEICHT GEMACHT
BehördenKlar erstellt Ihnen einen fertigen Antwort-Entwurf – zum Beispiel um einen Termin zu bestätigen oder zu verschieben, Unterlagen nachzureichen oder Widerspruch einzulegen. Sie können den Text frei bearbeiten und als PDF teilen oder drucken.

NICHTS MEHR VERPASSEN
• Termine mit einem Tipp in Ihren Kalender übernehmen
• Automatische Erinnerungen vor jeder Frist
• Alle gescannten Briefe übersichtlich im Archiv

IHRE DATEN GEHÖREN IHNEN
• Alle Ergebnisse werden nur auf Ihrem Gerät gespeichert
• Kein Konto, keine Registrierung nötig
• Mit einem Tipp alles löschen

AUSSERDEM
• Behörden-Glossar: die wichtigsten Amtsbegriffe einfach erklärt – auch offline
• Vorlese-Funktion für alle Erklärungen
• Große Schrift und große Tasten – einfach zu bedienen

3 Brief-Analysen sind kostenlos. Danach analysieren Sie mit dem Abo unbegrenzt weiter.

Wichtig: BehördenKlar erklärt Briefe verständlich, ersetzt aber keine Rechtsberatung. Bei rechtlich wichtigen Entscheidungen wenden Sie sich bitte an eine Beratungsstelle oder eine Anwältin/einen Anwalt.
```

## Screenshot-Plan (6,7"-iPhone Pflicht, je 1290×2796 px)

1. **Hero:** Scan-Screen mit Slogan „Brief fotografieren – sofort verstehen"
2. **Analyse:** Ergebnis mit Kernaussage + roter Ampel „Frist in 5 Tagen"
3. **Checkliste:** „Das müssen Sie tun" mit Häkchen-Liste
4. **Übersetzung:** dieselbe Analyse auf Türkisch oder Arabisch
5. **Antwort:** fertiger Antwort-Entwurf mit „Als PDF teilen"-Button
6. **Archiv:** Briefliste mit Ampeln

*Tipp: Screenshots im Simulator (iPhone 17 Pro Max) mit dem Testbrief erstellen —
Cmd+S speichert einen Screenshot in der passenden Auflösung.*

## Altersfreigabe

4+ (keine bedenklichen Inhalte)

## App-Review-Hinweise (Feld „Notes" bei der Einreichung)

```
Die App analysiert Fotos von deutschen Behördenbriefen mit einem KI-Dienst
(Anthropic Claude) über unseren eigenen Backend-Server. Zum Testen:
Ein Beispiel-Behördenbrief zum Abfotografieren liegt unter [URL ZU TESTBRIEF
EINFÜGEN] bereit, oder nutzen Sie einen beliebigen deutschen Behördenbrief.
Vor dem ersten Scan erscheint eine Datenschutz-Einwilligung. 3 Analysen sind
ohne Kauf möglich.
```

## URLs (live, für die Formularfelder in App Store Connect)

- **Support-URL:** https://behoerdenklar.pages.dev
- **Datenschutz-URL:** https://behoerdenklar.pages.dev/datenschutz
- Kontakt-E-Mail: behoerdenbriefhelfer@gmail.com
- Quelldateien: `webseite/` — neu deployen mit
  `npx wrangler pages deploy ../webseite --project-name behoerdenklar` (aus proxy/)

## Noch offen (vor Einreichung)

- [ ] „App-Datenschutz"-Fragebogen in App Store Connect ausfüllen
      (Datenerfassung: Fotos → werden verarbeitet, nicht mit Identität verknüpft,
      kein Tracking)
- [ ] Screenshots erstellen (siehe Plan oben)
```
