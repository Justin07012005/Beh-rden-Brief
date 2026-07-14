/**
 * Übersetzung der Analyse in eine Zielsprache — on demand, eine Sprache
 * pro Aufruf (spart Tokens). Ergebnisse werden pro Brief+Sprache im
 * Archiv gecacht (siehe store), damit kein Aufruf doppelt läuft.
 */
import { BriefAnalyse, Sprache, Uebersetzung } from '../types';
import { claudeJsonAufruf, MODELL_EINFACH } from './claudeClient';

const UEBERSETZUNG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kernaussage', 'erklaerung_einfach', 'checkliste', 'fachbegriffe'],
  properties: {
    kernaussage: { type: 'string' },
    erklaerung_einfach: { type: 'string' },
    checkliste: { type: 'array', items: { type: 'string' } },
    fachbegriffe: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['begriff', 'erklaerung'],
        properties: {
          // Der deutsche Begriff bleibt stehen (steht so im Brief!),
          // nur die Erklärung wird übersetzt.
          begriff: { type: 'string' },
          erklaerung: { type: 'string' },
        },
      },
    },
  },
} as const;

export async function uebersetzeAnalyse(
  analyse: BriefAnalyse,
  sprache: Sprache
): Promise<Uebersetzung> {
  return claudeJsonAufruf<Uebersetzung>({
    modell: MODELL_EINFACH,
    maxTokens: 6000,
    system: `Du übersetzt Erklärungen deutscher Behördenbriefe in andere Sprachen. Übersetze in einfache, klare Sprache (Niveau A2/B1 der Zielsprache). Deutsche Fachbegriffe (Feld "begriff") NICHT übersetzen — sie stehen so im Original-Brief und der Nutzer muss sie wiedererkennen. Nur die Erklärungen übersetzen.`,
    schema: UEBERSETZUNG_SCHEMA,
    messages: [
      {
        role: 'user',
        content: `Übersetze die folgenden Felder nach ${sprache.name} (${sprache.code}):\n\n${JSON.stringify(
          {
            kernaussage: analyse.kernaussage,
            erklaerung_einfach: analyse.erklaerung_einfach,
            checkliste: analyse.checkliste,
            fachbegriffe: analyse.fachbegriffe,
          },
          null,
          2
        )}`,
      },
    ],
  });
}
