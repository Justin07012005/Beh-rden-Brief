const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Numbering, LevelFormat, PageBreak,
} = require('docx');
const fs = require('fs');

// --- Markenfarben ---
const BLAU = '1A365D';      // primär (dunkles Blau)
const BLAU_HELL = 'E8EEF5';
const GRUEN = '276749';
const GELB = 'B7791F';
const GRAU = '5A6472';
const GRAU_HELL = 'F4F6F8';
const TINTE = '1A202C';
const WEISS = 'FFFFFF';

const FONT = 'Calibri';

// ---------- Hilfsfunktionen ----------
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, bold: true, size: 30, color: BLAU, font: FONT })],
  });
}
function absatz(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 140, line: 276 },
    alignment: opts.align,
    children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 21, color: TINTE, font: FONT })],
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: 'punkte', level: 0 },
    spacing: { after: 90, line: 264 },
    children: [
      opts.fett
        ? new TextRun({ text: opts.fett + ' ', bold: true, size: 21, color: TINTE, font: FONT })
        : null,
      new TextRun({ text, size: 21, color: TINTE, font: FONT }),
    ].filter(Boolean),
  });
}

// ---------- Tabelle: Schutzmaßnahmen ----------
function zelle(text, { fett, breite, farbe, textColor, size } = {}) {
  return new TableCell({
    width: { size: breite, type: WidthType.DXA },
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    shading: farbe ? { type: ShadingType.CLEAR, fill: farbe, color: 'auto' } : undefined,
    children: [new Paragraph({
      spacing: { after: 0, line: 252 },
      children: [new TextRun({ text, bold: fett, size: size ?? 20, color: textColor ?? TINTE, font: FONT })],
    })],
  });
}
function massnahmeTabelle() {
  const B1 = 3100, B2 = 6260; // Summe = 9360 (Textbreite bei 2,5cm Rändern)
  const kopf = new TableRow({
    tableHeader: true,
    children: [
      zelle('Maßnahme', { fett: true, breite: B1, farbe: BLAU, textColor: WEISS }),
      zelle('Was das konkret bedeutet', { fett: true, breite: B2, farbe: BLAU, textColor: WEISS }),
    ],
  });
  const daten = [
    ['Lokale Verschlüsselung', 'Das gesamte Brief-Archiv ist mit AES-256-GCM verschlüsselt. Der Schlüssel liegt im Sicherheitsspeicher des Geräts (iOS Keychain / Android Keystore) und verlässt es nie.'],
    ['App-Sperre (optional)', 'Face ID / Fingerabdruck / Geräte-Code beim Öffnen der App.'],
    ['Sichtschutz', 'Im App-Umschalter wird der Inhalt verdeckt — keine Brief-Vorschau.'],
    ['Auto-Löschen (optional)', 'Briefe werden nach 30 oder 90 Tagen automatisch entfernt.'],
    ['„Alles löschen"', 'Ein Tipp entfernt sämtliche Daten inklusive Verschlüsselungs-Schlüssel.'],
    ['Kein Konto', 'Keine Registrierung, keine E-Mail, kein Passwort nötig.'],
    ['Kein Tracking', 'Keine Analyse- oder Werbe-Bausteine, keine Werbung, keine Datenweitergabe an Dritte.'],
    ['Einwilligung zuerst', 'Vor dem ersten Scan wird verständlich erklärt und aktiv zugestimmt (Art. 6 & 9 DSGVO).'],
    ['Server-Härtung', 'KI-Zugang nur serverseitig, Anfrage-Limits pro Gerät und pro IP-Adresse.'],
  ];
  const zeilen = daten.map(([a, b], i) => new TableRow({
    children: [
      zelle(a, { fett: true, breite: B1, farbe: i % 2 ? GRAU_HELL : WEISS }),
      zelle(b, { breite: B2, farbe: i % 2 ? GRAU_HELL : WEISS }),
    ],
  }));
  return new Table({
    columnWidths: [B1, B2],
    width: { size: B1 + B2, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'D5DBE2' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D5DBE2' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'D5DBE2' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'D5DBE2' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D5DBE2' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D5DBE2' },
    },
    rows: [kopf, ...zeilen],
  });
}

// ---------- Datenfluss-Schritt (nummerierte Box) ----------
function flussSchritt(nr, titel, text) {
  return new Table({
    columnWidths: [720, 8640],
    width: { size: 9360, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: 720, type: WidthType.DXA },
        verticalAlign: 'center',
        children: [new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [new TextRun({ text: String(nr), bold: true, size: 34, color: BLAU, font: FONT })],
        })],
      }),
      new TableCell({
        width: { size: 8640, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 120 },
        children: [new Paragraph({
          spacing: { after: 40, line: 264 },
          children: [
            new TextRun({ text: titel + '  ', bold: true, size: 21, color: TINTE, font: FONT }),
            new TextRun({ text, size: 21, color: GRAU, font: FONT }),
          ],
        })],
      }),
    ] })],
  });
}

function trennlinie() {
  return new Paragraph({
    spacing: { before: 60, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLAU } },
    children: [new TextRun({ text: '', size: 2 })],
  });
}

// ---------- Dokument ----------
const doc = new Document({
  creator: 'BehördenKlar',
  title: 'BehördenKlar — Datenschutz & Sicherheit',
  numbering: {
    config: [{
      reference: 'punkte',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•',
        alignment: AlignmentType.LEFT,
        style: { run: { color: BLAU }, paragraph: { indent: { left: 360, hanging: 220 } } },
      }],
    }],
  },
  styles: { default: { document: { run: { font: FONT, size: 21, color: TINTE } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1250, bottom: 1250, left: 1418, right: 1418 }, // ~2,5 cm
      },
    },
    children: [
      // ===== Kopf =====
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: '📬  BehördenKlar', bold: true, size: 40, color: BLAU, font: FONT })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Datenschutz & Sicherheit auf einen Blick', size: 26, color: TINTE, font: FONT })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'Für Beratungsstellen, Sozialverbände und Kooperationspartner', italics: true, size: 21, color: GRAU, font: FONT })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: 'Stand: 15.07.2026   ·   behoerdenbriefhelfer@gmail.com   ·   behoerdenklar.de', size: 18, color: GRAU, font: FONT })],
      }),
      trennlinie(),

      // ===== Was ist die App =====
      absatz([
        new TextRun({ text: 'BehördenKlar hilft Menschen, Behördenbriefe zu verstehen: ', size: 21, color: TINTE, font: FONT }),
        new TextRun({ text: 'Brief fotografieren, Erklärung in einfacher Sprache erhalten — mit Fristen, Checkliste und Antwort-Hilfe, auf Wunsch in 9 weiteren Sprachen. Weil Behördenbriefe hochsensible Daten enthalten, wurde die App von Grund auf datensparsam gebaut. Dieses Dokument erklärt transparent, was mit den Daten passiert — auch die Punkte, die noch offen sind.', size: 21, color: TINTE, font: FONT }),
      ], { after: 160 }),

      // ===== Kernaussage-Box =====
      new Table({
        columnWidths: [9360],
        width: { size: 9360, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: BLAU_HELL },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: BLAU_HELL },
          left: { style: BorderStyle.SINGLE, size: 18, color: BLAU },
          right: { style: BorderStyle.SINGLE, size: 2, color: BLAU_HELL },
        },
        rows: [new TableRow({ children: [new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: BLAU_HELL, color: 'auto' },
          margins: { top: 130, bottom: 130, left: 170, right: 170 },
          children: [new Paragraph({
            spacing: { after: 0, line: 276 },
            children: [
              new TextRun({ text: 'Das Wichtigste in einem Satz:  ', bold: true, size: 21, color: BLAU, font: FONT }),
              new TextRun({ text: 'Es gibt kein Nutzerkonto und keinen zentralen Datenspeicher — die Briefe Ihrer Klientinnen und Klienten liegen verschlüsselt auf deren eigenem Handy, nicht bei uns.', size: 21, color: TINTE, font: FONT }),
            ],
          })],
        })] })],
      }),

      // ===== Datenfluss =====
      h1('Der Datenfluss beim Scannen'),
      flussSchritt(1, 'Foto entsteht auf dem Gerät', 'und wird vor dem Versand verkleinert.'),
      flussSchritt(2, 'Übertragung TLS-verschlüsselt', 'an unseren Vermittlungsserver (Cloudflare). Dieser leitet nur weiter und speichert keine Briefinhalte — nur einen anonymen Tageszähler pro Gerät für 48 Stunden.'),
      flussSchritt(3, 'KI-Analyse bei Anthropic (USA)', 'Verarbeitung nur zur Analyse, Löschung nach spätestens 30 Tagen, keine Nutzung zum KI-Training.'),
      flussSchritt(4, 'Ergebnis zurück aufs Gerät', 'dort endet der Weg. Keine Kopie bei uns.'),

      // ===== Schutzmaßnahmen =====
      h1('Schutzmaßnahmen in der App'),
      absatz([new TextRun({ text: 'Alle folgenden Maßnahmen sind umgesetzt und technisch überprüfbar:', size: 21, color: GRAU, font: FONT, italics: true })], { after: 120 }),
      massnahmeTabelle(),

      // ===== Ehrliche Punkte (auf neuer Seite) =====
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 320, after: 140 },
        children: [new TextRun({ text: 'Woran wir transparent erinnern', bold: true, size: 30, color: BLAU, font: FONT })],
      }),
      absatz([new TextRun({ text: 'Vertrauen entsteht durch Ehrlichkeit — deshalb benennen wir auch das, was nicht perfekt ist:', size: 21, color: GRAU, font: FONT, italics: true })], { after: 120 }),
      bullet('Die KI-Analyse läuft bei Anthropic (USA), auf Grundlage des EU-U.S. Data Privacy Framework bzw. EU-Standardvertragsklauseln. Eine Verarbeitung in der EU ist beim Anbieter derzeit nicht verfügbar; als Ausbaupfad prüfen wir den Betrieb über EU-Rechenzentren (AWS Frankfurt).', { fett: 'Verarbeitung in den USA:' }),
      bullet('Anthropic hält Anfragen bis zu 30 Tage zur Missbrauchserkennung vor — danach automatische Löschung. Wir sagen das offen, statt „Ihre Daten verlassen nie das Handy" zu behaupten.', { fett: '30-Tage-Fenster:' }),
      bullet('Die App erklärt Briefe, ersetzt aber keine Beratung — sie ist als Ergänzung Ihrer Arbeit gedacht, nicht als Ersatz.', { fett: 'Keine Rechtsberatung:' }),
      bullet('Dieses Dokument ist eine Selbstauskunft, kein Zertifikat. Die vollständige Datenschutzerklärung ist öffentlich unter behoerdenklar.de/datenschutz.', { fett: 'Transparenz:' }),

      // ===== Nutzen für die Beratung =====
      h1('Warum das für Ihre Beratungsarbeit interessant ist'),
      bullet('Klientinnen und Klienten verstehen Briefe bereits vor dem Termin — Ihre Beratungszeit fließt in die Lösung, nicht ins Vorlesen.'),
      bullet('9 Übersetzungssprachen (u. a. Türkisch, Arabisch, Ukrainisch, Farsi) — die deutschen Fachbegriffe bleiben sichtbar und wiedererkennbar.'),
      bullet('Große Schrift, große Tasten, einfache Sprache (A2/B1), Vorlese-Funktion — gebaut für Menschen, für die normale Apps zu kompliziert sind.'),

      // ===== Abschluss-Box =====
      new Paragraph({ spacing: { before: 200 } }),
      new Table({
        columnWidths: [9360],
        width: { size: 9360, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: GRUEN },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: GRUEN },
          left: { style: BorderStyle.SINGLE, size: 18, color: GRUEN },
          right: { style: BorderStyle.SINGLE, size: 2, color: GRUEN },
        },
        rows: [new TableRow({ children: [new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'EAF6EE', color: 'auto' },
          margins: { top: 150, bottom: 150, left: 170, right: 170 },
          children: [
            new Paragraph({ spacing: { after: 60, line: 276 }, children: [
              new TextRun({ text: 'Sprechen Sie uns an. ', bold: true, size: 22, color: GRUEN, font: FONT }),
              new TextRun({ text: 'Wir zeigen die App gern persönlich und beantworten jede Datenschutz-Rückfrage.', size: 21, color: TINTE, font: FONT }),
            ] }),
            new Paragraph({ spacing: { after: 0 }, children: [
              new TextRun({ text: '📧  behoerdenbriefhelfer@gmail.com      🌐  behoerdenklar.de', size: 21, color: TINTE, font: FONT, bold: true }),
            ] }),
          ],
        })] })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2] || 'BehoerdenKlar-Datenschutz.docx';
  fs.writeFileSync(out, buf);
  console.log('geschrieben:', out);
});
