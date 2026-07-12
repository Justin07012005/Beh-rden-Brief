/**
 * Dringlichkeits-Ampel — bewusst LOKAL berechnet, nicht von der KI:
 * deterministisch, kostenlos, und immer aktuell relativ zu "heute"
 * (ein archivierter Brief wird automatisch roter, je näher die Frist rückt).
 *
 * 🔴 Rot  = Frist/Termin in < 7 Tagen (oder bereits abgelaufen)
 * 🟡 Gelb = Frist/Termin in 7-21 Tagen
 * 🟢 Grün = keine Frist / rein informativ
 */
import { BriefAnalyse, Dringlichkeit } from '../types';
import { farben } from '../theme';

export interface AmpelStatus {
  stufe: Dringlichkeit;
  /** Kurztext für die UI, z. B. "Frist in 3 Tagen". */
  text: string;
  farbe: string;
  hintergrund: string;
}

/** Ganze Tage von heute bis zum ISO-Datum (negativ = vergangen). */
export function tageBis(datumIso: string): number {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const ziel = new Date(`${datumIso}T00:00:00`);
  return Math.round((ziel.getTime() - heute.getTime()) / 86400000);
}

export function berechneAmpel(analyse: BriefAnalyse): AmpelStatus {
  const daten: { tage: number; label: string }[] = [];
  if (analyse.frist) {
    daten.push({ tage: tageBis(analyse.frist.datum), label: 'Frist' });
  }
  if (analyse.termin) {
    daten.push({ tage: tageBis(analyse.termin.datum), label: 'Termin' });
  }

  if (daten.length === 0) {
    return {
      stufe: 'gruen',
      text: 'Keine Frist — nur zur Information',
      farbe: farben.ampelGruen,
      hintergrund: farben.ampelGruenHintergrund,
    };
  }

  // Das dringendste (kleinste) Datum bestimmt die Ampel
  const dringendstes = daten.reduce((a, b) => (a.tage <= b.tage ? a : b));
  const { tage, label } = dringendstes;

  if (tage < 0) {
    return {
      stufe: 'rot',
      text: `${label} abgelaufen (vor ${Math.abs(tage)} Tag${Math.abs(tage) === 1 ? '' : 'en'})! Schnell handeln.`,
      farbe: farben.ampelRot,
      hintergrund: farben.ampelRotHintergrund,
    };
  }
  if (tage === 0) {
    return {
      stufe: 'rot',
      text: `${label} ist HEUTE!`,
      farbe: farben.ampelRot,
      hintergrund: farben.ampelRotHintergrund,
    };
  }
  if (tage < 7) {
    return {
      stufe: 'rot',
      text: `${label} in ${tage} Tag${tage === 1 ? '' : 'en'} — dringend!`,
      farbe: farben.ampelRot,
      hintergrund: farben.ampelRotHintergrund,
    };
  }
  if (tage <= 21) {
    return {
      stufe: 'gelb',
      text: `${label} in ${tage} Tagen — bald erledigen`,
      farbe: farben.ampelGelb,
      hintergrund: farben.ampelGelbHintergrund,
    };
  }
  return {
    stufe: 'gruen',
    text: `${label} in ${tage} Tagen — genug Zeit`,
    farbe: farben.ampelGruen,
    hintergrund: farben.ampelGruenHintergrund,
  };
}
