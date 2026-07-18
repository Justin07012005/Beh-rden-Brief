# Feature-Backlog (nach dem Launch)

Grundsatz: Der Kern-Flow (Scannen → Verstehen → Reagieren) bleibt 3 Tipps
kurz. Neues kommt hinter Kacheln/Tabs, nie in den Hauptweg. Erst bauen,
wenn echtes Nutzer-Feedback den Bedarf zeigt.

## Naheliegend (hoher Nutzen, kleiner Aufwand — Kandidaten für v1.1)

- [ ] **Fristen-Übersicht**: alle Fristen/Termine aller Briefe in einer
      sortierten Liste (Daten sind schon da — nur ein neuer Screen).
      Passt perfekt zum Kern-Job "nichts verpassen".
- [ ] **App-Icon** im Marken-Stil der Webseite (Briefumschlag/Stempel-Motiv)
- [ ] **Home-Widget** (iOS): nächste Frist auf dem Homescreen

## Mittelfristig (validieren, dann bauen)

- [ ] Ordner/Kategorien im Archiv (erst relevant, wenn Nutzer >10 Briefe haben)
- [ ] Briefe nach Behörde/Aktenzeichen gruppieren
- [ ] Musterbrief-Bibliothek offline (häufige Antworten ohne KI-Kosten)
- [ ] On-Device-Texterkennung (Apple Vision Framework): Foto verlässt das
      Handy nie — primär Datenschutz-Feature; braucht Dev-Build + Qualitätstest
      der Fristen-Erkennung gegen Claude Vision (siehe Gespräch 16.07.)

## Groß (eigene Projekte, nicht nebenbei)

- [ ] Formular-Ausfüllhilfe (Anträge) — rechtlich heikler, eigener Freigabe-Check
- [ ] Familien-/Betreuer-Modus (Briefe für Angehörige verwalten)
- [ ] EU-Datenverarbeitung via AWS Bedrock Frankfurt (Proxy-Umbau)
- [ ] **Berater-Modus für Beratungsstellen** (B2B, Lizenz-Modell ~50–100 €/Monat
      pro Stelle): eigene Oberfläche mit Fall-Ordnern ("Nummer pro Klient" —
      Idee von Justin, 18.07.) auf dem Berater-Gerät; Beraterin scannt Briefe
      im Termin und legt sie pro Fall ab, kein Gratis-Limit. WICHTIG: kein
      Fernzugriff aufs Klienten-Handy (zerstört das Datenschutz-Versprechen) —
      stattdessen Fall-Ordner lokal beim Berater + optional aktives Teilen
      einzelner Analysen durch den Klienten. Vor dem Bauen in den
      Beratungsstellen-Besuchen validieren (Interview-Fragen: Nutzen?
      Anforderungen? Zahlungsbereitschaft des Trägers?)

## UI-Wachstumspfad (damit es nie überladen wirkt)

1. Jetzt: 1 Hero-Button + 2 Kacheln
2. Bis 4 Funktionen: Kachel-Reihe erweitern (2x2)
3. Darüber: Tab-Leiste (Home / Fristen / Mehr) — Standard-iOS-Muster
