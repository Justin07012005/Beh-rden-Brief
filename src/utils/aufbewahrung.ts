/**
 * Auto-Löschen alter Briefe (Datensparsamkeit, DSGVO-Grundsatz).
 * Reine Funktion — die Anwendung passiert beim App-Start im Store.
 */
import { BriefEintrag } from '../types';

/**
 * Filtert Briefe heraus, die älter als die Aufbewahrungsdauer sind.
 *
 * @param briefe            - das aktuelle Archiv
 * @param aufbewahrungTage  - 0 = nie löschen (alles behalten)
 * @param jetztMs           - aktueller Zeitpunkt (injizierbar für Tests)
 */
export function filtereAlteBriefe(
  briefe: BriefEintrag[],
  aufbewahrungTage: number,
  jetztMs: number = Date.now()
): BriefEintrag[] {
  if (aufbewahrungTage <= 0) return briefe;
  const grenzeMs = jetztMs - aufbewahrungTage * 86400000;
  return briefe.filter((brief) => {
    const erstellt = new Date(brief.erstelltAm).getTime();
    // Unlesbare Datumswerte lieber behalten als versehentlich löschen
    if (!Number.isFinite(erstellt)) return true;
    return erstellt >= grenzeMs;
  });
}
