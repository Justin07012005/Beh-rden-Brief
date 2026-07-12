/**
 * Behörden-Glossar: häufige Amtsbegriffe mit Erklärung in einfacher Sprache.
 * Statisch und lokal — funktioniert offline, kostet keine API-Aufrufe.
 */
export interface GlossarEintrag {
  begriff: string;
  erklaerung: string;
}

export const GLOSSAR: GlossarEintrag[] = [
  {
    begriff: 'Widerspruch',
    erklaerung:
      'Wenn Sie mit einer Entscheidung des Amts nicht einverstanden sind, können Sie schriftlich "Nein" sagen. Das nennt man Widerspruch. Dafür gibt es meist eine Frist von einem Monat.',
  },
  {
    begriff: 'Mitwirkungspflicht',
    erklaerung:
      'Sie müssen dem Amt helfen, Ihren Fall zu bearbeiten. Zum Beispiel: Unterlagen abgeben, Fragen beantworten, zu Terminen kommen. Wenn Sie das nicht tun, kann das Amt Geld kürzen.',
  },
  {
    begriff: 'Bescheid',
    erklaerung:
      'Ein offizieller Brief mit einer Entscheidung des Amts. Zum Beispiel: wie viel Geld Sie bekommen, oder ob ein Antrag angenommen wurde.',
  },
  {
    begriff: 'Frist',
    erklaerung:
      'Ein Datum, bis zu dem Sie etwas tun müssen. Nach der Frist ist es oft zu spät. Fristen sind sehr wichtig — verpassen Sie sie nicht!',
  },
  {
    begriff: 'Anhörung',
    erklaerung:
      'Bevor das Amt etwas Negatives entscheidet, dürfen Sie Ihre Sicht erklären. Das Amt schickt dazu einen Brief mit Fragen. Antworten Sie unbedingt!',
  },
  {
    begriff: 'Bewilligung',
    erklaerung: 'Das Amt sagt "Ja" zu Ihrem Antrag. Sie bekommen, was Sie beantragt haben.',
  },
  {
    begriff: 'Ablehnung / Ablehnungsbescheid',
    erklaerung:
      'Das Amt sagt "Nein" zu Ihrem Antrag. Wenn Sie das falsch finden, können Sie oft Widerspruch einlegen.',
  },
  {
    begriff: 'Aktenzeichen / Geschäftszeichen',
    erklaerung:
      'Eine Nummer für Ihren Fall. Schreiben Sie diese Nummer immer in Ihre Briefe an das Amt — dann findet das Amt Ihren Fall schneller.',
  },
  {
    begriff: 'Sanktion / Minderung',
    erklaerung:
      'Eine Strafe vom Jobcenter: Sie bekommen weniger Geld, zum Beispiel weil Sie einen Termin verpasst haben.',
  },
  {
    begriff: 'Eingliederungsvereinbarung / Kooperationsplan',
    erklaerung:
      'Ein Vertrag zwischen Ihnen und dem Jobcenter. Darin steht, was Sie tun müssen (z. B. Bewerbungen schreiben) und wie das Jobcenter hilft.',
  },
  {
    begriff: 'Vorsprache',
    erklaerung: 'Sie sollen persönlich zum Amt kommen. Das ist ein Termin vor Ort.',
  },
  {
    begriff: 'Nachweis',
    erklaerung:
      'Ein Papier, das etwas beweist. Zum Beispiel: eine Lohnabrechnung beweist Ihr Gehalt, ein Mietvertrag beweist Ihre Miete.',
  },
  {
    begriff: 'Bedarfsgemeinschaft',
    erklaerung:
      'Alle Menschen, die zusammen in einer Wohnung leben und gemeinsam Geld vom Jobcenter bekommen — z. B. Partner und Kinder.',
  },
  {
    begriff: 'Regelbedarf / Regelsatz',
    erklaerung: 'Das Geld, das Sie jeden Monat für Essen, Kleidung und Alltag bekommen.',
  },
  {
    begriff: 'Aufenthaltstitel',
    erklaerung:
      'Ein offizielles Dokument, das erlaubt, in Deutschland zu leben. Zum Beispiel: Visum, Aufenthaltserlaubnis, Niederlassungserlaubnis.',
  },
  {
    begriff: 'Fiktionsbescheinigung',
    erklaerung:
      'Ein vorläufiges Papier von der Ausländerbehörde. Es gilt, solange über Ihren Antrag noch entschieden wird. Ihr Aufenthalt bleibt damit erlaubt.',
  },
  {
    begriff: 'Duldung',
    erklaerung:
      'Sie müssen Deutschland eigentlich verlassen, aber die Abschiebung ist ausgesetzt. Die Duldung ist kein Aufenthaltstitel.',
  },
  {
    begriff: 'Säumniszuschlag',
    erklaerung:
      'Extra-Geld, das Sie zahlen müssen, weil Sie zu spät gezahlt haben. Je später, desto teurer.',
  },
  {
    begriff: 'Vollstreckung / Zwangsvollstreckung',
    erklaerung:
      'Wenn Sie nicht zahlen, holt sich das Amt das Geld mit Zwang — z. B. direkt vom Konto. Davor kommen Mahnungen. Reagieren Sie früh!',
  },
  {
    begriff: 'Einspruch',
    erklaerung:
      'Wie ein Widerspruch, aber beim Finanzamt: Sie sagen schriftlich, dass Sie den Steuerbescheid falsch finden. Frist: meist ein Monat.',
  },
  {
    begriff: 'Bestandskraft / rechtskräftig',
    erklaerung:
      'Die Entscheidung ist endgültig, weil die Frist für Widerspruch vorbei ist. Danach kann man kaum noch etwas ändern.',
  },
  {
    begriff: 'Amtsgericht',
    erklaerung: 'Das örtliche Gericht. Zuständig z. B. für Mahnbescheide, Familiensachen, kleinere Streitfälle.',
  },
  {
    begriff: 'Mahnbescheid',
    erklaerung:
      'Ein gelber Brief vom Gericht: Jemand sagt, Sie schulden Geld. Sie haben 2 Wochen Zeit für Widerspruch. Nicht ignorieren — sonst wird es teuer!',
  },
  {
    begriff: 'Ratenzahlung',
    erklaerung:
      'Sie zahlen eine Schuld in kleinen Teilen jeden Monat, statt alles auf einmal. Das können Sie beim Amt beantragen.',
  },
  {
    begriff: 'Stundung',
    erklaerung: 'Das Amt erlaubt Ihnen, später zu zahlen. Sie müssen das beantragen und begründen.',
  },
];
