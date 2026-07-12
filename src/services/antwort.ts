/**
 * Antwort-Generator: erzeugt einen formellen deutschen Antwort-Entwurf
 * passend zum Brieftyp und zur gewählten Vorlage. Der Nutzer kann den
 * Entwurf danach frei bearbeiten und als PDF exportieren.
 */
import { AntwortTyp, ANTWORT_TYP_LABEL, BriefAnalyse } from '../types';
import { claudeJsonAufruf } from './claudeClient';

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
 * @param hinweise  - optionale Angaben des Nutzers (z. B. Wunschtermin, Grund)
 */
export async function generiereAntwort(
  analyse: BriefAnalyse,
  typ: AntwortTyp,
  hinweise: string
): Promise<AntwortEntwurf> {
  return claudeJsonAufruf<AntwortEntwurf>({
    system: `Du schreibst formelle, höfliche Antwortbriefe an deutsche Behörden im Namen von Privatpersonen. Regeln:
- Korrektes, formelles Deutsch (der Empfänger ist eine Behörde — hier KEINE einfache Sprache).
- Kurz und präzise, keine Floskeln über das Nötige hinaus.
- Persönliche Daten, die du nicht kennst, als Platzhalter in eckigen Klammern: [Ihr Name], [Ihre Adresse], [Aktenzeichen] usw.
- Aktenzeichen/Kundennummer aus dem Original-Brief referenzieren, falls bekannt.
- Bei Widersprüchen: sachlich, Frist wahren, Begründung ankündigen falls der Nutzer keine angegeben hat. Weise am Ende des Textes in einer Zeile "[Hinweis: ...]" darauf hin, dass bei rechtlichen Fragen eine Beratungsstelle oder ein Anwalt helfen kann — die App ersetzt keine Rechtsberatung.`,
    schema: ANTWORT_SCHEMA,
    messages: [
      {
        role: 'user',
        content: `Schreibe eine Antwort auf diesen Behördenbrief.

Art der Antwort: ${ANTWORT_TYP_LABEL[typ]}

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

Zusätzliche Angaben des Nutzers: ${hinweise.trim() || 'keine'}`,
      },
    ],
  });
}
