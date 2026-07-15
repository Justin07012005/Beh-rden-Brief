/**
 * Tests fürs Auto-Löschen — löschen ist unumkehrbar, deshalb müssen die
 * Grenzfälle sitzen (nichts zu früh löschen, "nie" respektieren).
 */
import { filtereAlteBriefe } from '../aufbewahrung';
import { BriefEintrag } from '../../types';

const JETZT = new Date('2026-07-15T12:00:00Z').getTime();
const TAG = 86400000;

function brief(id: string, alterInTagen: number): BriefEintrag {
  return {
    id,
    erstelltAm: new Date(JETZT - alterInTagen * TAG).toISOString(),
    analyse: {
      brieftyp: 'Test',
      absender: 'Testamt',
      kernaussage: '',
      erklaerung_einfach: '',
      fachbegriffe: [],
      frist: null,
      termin: null,
      checkliste: [],
      antwort_noetig: false,
      antwort_optionen: [],
    },
    uebersetzungen: {},
  };
}

describe('filtereAlteBriefe', () => {
  it('0 Tage = nie löschen, alles bleibt', () => {
    const briefe = [brief('a', 1), brief('b', 500)];
    expect(filtereAlteBriefe(briefe, 0, JETZT)).toHaveLength(2);
  });

  it('löscht Briefe, die älter als die Frist sind', () => {
    const briefe = [brief('neu', 5), brief('alt', 40)];
    const ergebnis = filtereAlteBriefe(briefe, 30, JETZT);
    expect(ergebnis.map((b) => b.id)).toEqual(['neu']);
  });

  it('behält Briefe exakt am Grenzwert (30 Tage alt bei 30-Tage-Frist)', () => {
    const briefe = [brief('grenze', 30)];
    expect(filtereAlteBriefe(briefe, 30, JETZT)).toHaveLength(1);
  });

  it('löscht bei 90-Tage-Frist erst nach 90 Tagen', () => {
    const briefe = [brief('a', 89), brief('b', 91)];
    expect(filtereAlteBriefe(briefe, 90, JETZT).map((b) => b.id)).toEqual(['a']);
  });

  it('behält Briefe mit kaputtem Datum (lieber zu viel als zu wenig)', () => {
    const kaputt = { ...brief('kaputt', 0), erstelltAm: 'kein-datum' };
    expect(filtereAlteBriefe([kaputt], 30, JETZT)).toHaveLength(1);
  });

  it('leeres Archiv bleibt leer', () => {
    expect(filtereAlteBriefe([], 30, JETZT)).toEqual([]);
  });
});
