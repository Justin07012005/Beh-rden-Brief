/**
 * Antwort-Generator: erzeugt einen formellen deutschen Antwort-Entwurf
 * passend zum Brieftyp und zur gewählten Vorlage. Der Nutzer kann den
 * Entwurf danach frei bearbeiten und als PDF exportieren.
 */
import { Absender, AntwortTyp, ANTWORT_TYP_LABEL, BriefAnalyse } from '../types';
import { felderFuer } from '../data/antwortFelder';
import { bauAngabenText, setzeAbsenderEin } from '../utils/antwortHelfer';
import { claudeJsonAufruf, MODELL_EINFACH } from './claudeClient';

const ANTWORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['betreff', 'text'],
  properties: {
    betreff: { type: 'string', description: 'Betreffzeile des Antwortbriefs.' },
    text: {
      type: 'string',
      description:
        'Vollständiger Brieftext inkl. Anrede und Grußformel. Platzhalter in eckigen Klammern für persönliche Daten, z. B. [Ihr Name], [Ihre Adresse], [Kundennummer].',
    },
  },
} as const;

export interface AntwortEntwurf {
  betreff: string;
  text: string;
}

/**
 * @param analyse   - Analyse des Original-Briefs (liefert Kontext)
 * @param typ       - gewählte Antwort-Vorlage
 * @param angaben   - Antworten aus Schritt 2 des Assistenten (Feld-ID -> Wert)
 * @param absender  - Name/Anschrift des Nutzers, falls hinterlegt. Wird NICHT
 *                    an die KI übergeben, sondern erst lokal in den fertigen
 *                    Entwurf eingesetzt; ohne Angabe bleiben Platzhalter stehen.
 */
export async function generiereAntwort(
  analyse: BriefAnalyse,
  typ: AntwortTyp,
  angaben: Record<string, string>,
  absender: Absender | null
): Promise<AntwortEntwurf> {
  const entwurf = await claudeJsonAufruf<AntwortEntwurf>({
    modell: MODELL_EINFACH,
    maxTokens: 4000,
    system: `Du schreibst formelle, höfliche Antwortbriefe an deutsche Behörden im Namen von Privatpersonen. Regeln:
- Korrektes, formelles Deutsch (der Empfänger ist eine Behörde — hier KEINE einfache Sprache).
- Kurz und präzise, keine Floskeln über das Nötige hinaus.
- Für den Absender IMMER exakt die Platzhalter [Ihr Name] und [Ihre Adresse] verwenden — genau in dieser Schreibweise. Die App setzt die echten Daten anschließend auf dem Gerät ein.
- Weitere persönliche Daten, die du nicht kennst, ebenfalls als Platzhalter in eckigen Klammern: [Aktenzeichen], [Kundennummer] usw. Setze NIEMALS Platzhalter für etwas, das der Nutzer bereits angegeben hat.
- Die Angaben des Nutzers vollständig einarbeiten und nichts hinzuerfinden — was er nicht genannt hat, wird nicht behauptet.
- Aktenzeichen/Kundennummer aus dem Original-Brief referenzieren, falls bekannt.
- Bei Widersprüchen: sachlich, Frist wahren, Begründung ankündigen falls der Nutzer keine angegeben hat. Weise am Ende des Textes in einer Zeile "[Hinweis: ...]" darauf hin, dass bei rechtlichen Fragen eine Beratungsstelle oder ein Anwalt helfen kann — die App ersetzt keine Rechtsberatung.`,
    schema: ANTWORT_SCHEMA,
    messages: [
      {
        role: 'user',
        content: `Schreibe eine Antwort auf diesen Behördenbrief.

Art der Antwort: ${ANTWORT_TYP_LABEL[typ]}
Heutiges Datum (für die Datumszeile): ${heuteDeutsch()}

Analyse des Original-Briefs:
${JSON.stringify(
  {
    brieftyp: analyse.brieftyp,
    absender: analyse.absender,
    kernaussage: analyse.kernaussage,
    frist: analyse.frist,
    termin: analyse.termin,
  },
  null,
  2
)}

Angaben des Nutzers:
${bauAngabenText(felderFuer(typ), angaben)}`,
      },
    ],
  });

  // Absenderdaten erst hier — auf dem Gerät — einsetzen (siehe setzeAbsenderEin).
  return {
    betreff: setzeAbsenderEin(entwurf.betreff, absender),
    text: setzeAbsenderEin(entwurf.text, absender),
  };
}

/** Datum im deutschen Briefformat, z. B. "12.08.2026". */
function heuteDeutsch(): string {
  const jetzt = new Date();
  const zweistellig = (n: number) => String(n).padStart(2, '0');
  return `${zweistellig(jetzt.getDate())}.${zweistellig(jetzt.getMonth() + 1)}.${jetzt.getFullYear()}`;
}
