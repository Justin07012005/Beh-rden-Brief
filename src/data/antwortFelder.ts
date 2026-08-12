/**
 * Welche Angaben der Assistent in Schritt 2 abfragt — pro Antwort-Art.
 *
 * Hintergrund: Ein einziges Freitextfeld ("Zusätzliche Angaben") überfordert
 * die Zielgruppe — sie weiß nicht, was die KI überhaupt braucht. Deshalb
 * fragt der Assistent je Antwort-Art genau die Punkte ab, ohne die der Brief
 * nicht schreibbar ist (Pflicht), plus optionale Verfeinerungen.
 *
 * Die Labels landen 1:1 im Prompt (siehe utils/antwortHelfer.ts), damit die
 * KI den Kontext jeder Angabe kennt — Feld-IDs sieht sie nie.
 */
import { AntwortTyp } from '../types';

export interface AntwortFeld {
  /** Stabiler Schlüssel im gespeicherten Entwurf. */
  id: string;
  /** Frage an den Nutzer; wird auch als Kontext an die KI übergeben. */
  label: string;
  platzhalter: string;
  mehrzeilig?: boolean;
  /** Ohne diese Angabe kann die KI keinen brauchbaren Brief schreiben. */
  pflicht?: boolean;
}

/** Bekommt jede Antwort-Art als letztes Feld — Auffangbecken für alles Übrige. */
export const FREITEXT_FELD: AntwortFeld = {
  id: 'sonstiges',
  label: 'Sonstiges (optional)',
  platzhalter: 'Alles, was sonst noch in den Brief soll',
  mehrzeilig: true,
};

const FELDER: Record<AntwortTyp, AntwortFeld[]> = {
  terminbestaetigung: [
    {
      id: 'anmerkung',
      label: 'Anmerkung zum Termin (optional)',
      platzhalter: 'z. B. „Ich bringe eine Begleitperson mit."',
      mehrzeilig: true,
    },
  ],
  terminverschiebung: [
    {
      id: 'grund',
      label: 'Warum können Sie den Termin nicht wahrnehmen?',
      platzhalter: 'z. B. Arbeit, Krankheit, Kinderbetreuung',
      mehrzeilig: true,
      pflicht: true,
    },
    {
      id: 'wunschtermin',
      label: 'Wann würde es Ihnen passen? (optional)',
      platzhalter: 'z. B. ab 12.09., am liebsten vormittags',
    },
  ],
  widerspruch: [
    {
      id: 'begruendung',
      label: 'Warum sind Sie nicht einverstanden?',
      platzhalter: 'z. B. „Mein Einkommen wurde falsch berechnet."',
      mehrzeilig: true,
      pflicht: true,
    },
    {
      id: 'bescheid_datum',
      label: 'Datum des Bescheids (optional)',
      platzhalter: 'TT.MM.JJJJ — steht meist oben im Brief',
    },
  ],
  unterlagen_nachreichen: [
    {
      id: 'unterlagen',
      label: 'Welche Unterlagen legen Sie bei?',
      platzhalter: 'z. B. Lohnabrechnung Juli, Mietvertrag',
      mehrzeilig: true,
      pflicht: true,
    },
    {
      id: 'fehlend',
      label: 'Fehlt noch etwas? (optional)',
      platzhalter: 'z. B. „Die Bescheinigung reiche ich bis 20.09. nach."',
    },
  ],
  rueckfrage: [
    {
      id: 'frage',
      label: 'Was möchten Sie wissen?',
      platzhalter: 'z. B. „Welche Unterlagen genau brauchen Sie?"',
      mehrzeilig: true,
      pflicht: true,
    },
  ],
};

/** Alle Felder einer Antwort-Art, inkl. abschließendem Freitextfeld. */
export function felderFuer(typ: AntwortTyp): AntwortFeld[] {
  return [...FELDER[typ], FREITEXT_FELD];
}
