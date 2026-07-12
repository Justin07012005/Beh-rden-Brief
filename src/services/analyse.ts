/**
 * Brief-Analyse: Bild oder PDF -> strukturiertes JSON (BriefAnalyse).
 * Ein einziger Claude-Vision-Aufruf extrahiert alles: Erklärung in einfacher
 * Sprache, Fachbegriffe, Fristen, Termine, Checkliste und Antwort-Optionen.
 */
import { BriefAnalyse } from '../types';
import { claudeJsonAufruf, ContentBlock } from './claudeClient';

/**
 * JSON-Schema für die Analyse. Die Claude API erzwingt dieses Schema
 * (Structured Output) — die Antwort ist damit garantiert valides JSON
 * in exakt dieser Form. Optionale Objekte (frist/termin) sind über
 * anyOf [object, null] modelliert, da Structured Output
 * additionalProperties: false und vollständige required-Listen verlangt.
 */
const ANALYSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'brieftyp',
    'absender',
    'kernaussage',
    'erklaerung_einfach',
    'fachbegriffe',
    'frist',
    'termin',
    'checkliste',
    'antwort_noetig',
    'antwort_optionen',
  ],
  properties: {
    brieftyp: {
      type: 'string',
      description:
        'Kurze Kategorie des Briefs, z. B. "Einladung Jobcenter", "Bescheid Arbeitsagentur", "Steuerbescheid".',
    },
    absender: {
      type: 'string',
      description: 'Die Behörde, die den Brief geschickt hat.',
    },
    kernaussage: {
      type: 'string',
      description:
        'Antwort auf "Was will das Amt von mir?" in 2-3 kurzen Sätzen, Sprachniveau A2.',
    },
    erklaerung_einfach: {
      type: 'string',
      description:
        'Ausführlichere Erklärung des gesamten Briefs in einfacher Alltagssprache (A2/B1-Niveau). Kurze Sätze. Keine Fachbegriffe ohne Erklärung.',
    },
    fachbegriffe: {
      type: 'array',
      description: 'Alle Fachbegriffe/Amtsdeutsch-Wörter aus dem Brief mit einfacher Erklärung.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['begriff', 'erklaerung'],
        properties: {
          begriff: { type: 'string' },
          erklaerung: { type: 'string', description: 'Erklärung in einfacher Sprache (A2).' },
        },
      },
    },
    frist: {
      description: 'Frist, bis wann der Nutzer reagieren muss. null wenn keine Frist im Brief steht.',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['datum', 'aktion'],
          properties: {
            datum: { type: 'string', description: 'ISO-Format JJJJ-MM-TT.' },
            aktion: { type: 'string', description: 'Was bis dahin passieren muss, z. B. "Unterlagen einreichen".' },
          },
        },
        { type: 'null' },
      ],
    },
    termin: {
      description: 'Persönlicher Termin (Vorsprache o. Ä.). null wenn kein Termin im Brief steht.',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['datum', 'uhrzeit', 'ort'],
          properties: {
            datum: { type: 'string', description: 'ISO-Format JJJJ-MM-TT.' },
            uhrzeit: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Format HH:MM, null wenn keine Uhrzeit genannt.',
            },
            ort: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Adresse/Raum, null wenn nicht genannt.',
            },
          },
        },
        { type: 'null' },
      ],
    },
    checkliste: {
      type: 'array',
      description:
        'To-do-Liste für den Nutzer: was tun, was mitbringen, was einreichen. Leer wenn nichts zu tun ist.',
      items: { type: 'string' },
    },
    antwort_noetig: {
      type: 'boolean',
      description: 'true wenn der Nutzer antworten/reagieren muss.',
    },
    antwort_optionen: {
      type: 'array',
      description: 'Welche Antwort-Vorlagen für diesen Brief sinnvoll sind.',
      items: {
        type: 'string',
        enum: [
          'terminbestaetigung',
          'terminverschiebung',
          'widerspruch',
          'unterlagen_nachreichen',
          'rueckfrage',
        ],
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Du bist ein Assistent, der deutschen Behördenbriefe für Privatpersonen verständlich macht. Die Nutzer sind Deutsche, die Amtsdeutsch schwer verstehen, oder Menschen mit Deutsch als Fremdsprache.

Deine Aufgabe:
1. Lies den fotografierten/hochgeladenen Brief vollständig.
2. Erkläre ihn in einfacher Alltagssprache (Sprachniveau A2/B1): kurze Sätze, keine Schachtelsätze, keine unerklärten Fachbegriffe.
3. Extrahiere Fristen und Termine exakt. Datumsangaben immer als ISO-Format (JJJJ-MM-TT). Wenn du ein Datum nicht sicher lesen kannst, lass das Feld null — erfinde niemals Daten.
4. Erstelle eine konkrete Checkliste, was der Nutzer tun muss.
5. Sei sachlich und beruhigend, nicht alarmierend.

Wichtig: Wenn das Bild kein Behördenbrief ist oder unlesbar ist, schreibe das klar in kernaussage und erklaerung_einfach und lasse frist/termin null.`;

/**
 * Analysiert ein Brief-Foto (JPEG/PNG als base64) oder ein PDF.
 *
 * @param base64 - Dateiinhalt als Base64-String (ohne data:-Präfix)
 * @param mimeType - z. B. 'image/jpeg', 'image/png' oder 'application/pdf'
 */
export async function analysiereBrief(
  base64: string,
  mimeType: string
): Promise<BriefAnalyse> {
  // PDF nutzt einen document-Block, Bilder einen image-Block
  const dateiBlock: ContentBlock =
    mimeType === 'application/pdf'
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        }
      : {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 },
        };

  return claudeJsonAufruf<BriefAnalyse>({
    system: SYSTEM_PROMPT,
    schema: ANALYSE_SCHEMA,
    messages: [
      {
        role: 'user',
        content: [
          dateiBlock,
          {
            type: 'text',
            text: `Analysiere diesen Behördenbrief. Heute ist der ${new Date().toISOString().slice(0, 10)} (wichtig für relative Datumsangaben wie "innerhalb von 14 Tagen").`,
          },
        ],
      },
    ],
  });
}
