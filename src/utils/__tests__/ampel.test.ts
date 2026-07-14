/**
 * Tests für die Dringlichkeits-Ampel — die kritischste Logik der App:
 * Eine falsche Ampel könnte dazu führen, dass ein Nutzer eine Behörden-Frist
 * verpasst. Deshalb hier alle Grenzfälle deterministisch abgesichert.
 */
import { berechneAmpel, tageBis } from '../ampel';
import { BriefAnalyse } from '../../types';

/** Fixes "Heute" für alle Tests: 15.07.2026 (Mitte des Monats, kein Randfall). */
const HEUTE = new Date('2026-07-15T10:30:00');

/** Minimal gültige Analyse; frist/termin pro Test überschreiben. */
function analyse(teile: Partial<BriefAnalyse>): BriefAnalyse {
  return {
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
    ...teile,
  };
}

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(HEUTE);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('tageBis', () => {
  it('liefert 0 für heute', () => {
    expect(tageBis('2026-07-15')).toBe(0);
  });

  it('liefert positive Tage für die Zukunft', () => {
    expect(tageBis('2026-07-16')).toBe(1);
    expect(tageBis('2026-07-22')).toBe(7);
  });

  it('liefert negative Tage für die Vergangenheit', () => {
    expect(tageBis('2026-07-14')).toBe(-1);
    expect(tageBis('2026-07-01')).toBe(-14);
  });

  it('zählt ganze Tage unabhängig von der Uhrzeit "jetzt"', () => {
    // 10:30 Uhr darf keine halben Tage erzeugen
    expect(tageBis('2026-07-18')).toBe(3);
  });

  it('funktioniert über Monatsgrenzen hinweg', () => {
    expect(tageBis('2026-08-01')).toBe(17);
  });
});

describe('berechneAmpel — Stufen', () => {
  it('grün ohne Frist und Termin', () => {
    const status = berechneAmpel(analyse({}));
    expect(status.stufe).toBe('gruen');
    expect(status.text).toContain('Keine Frist');
  });

  it('rot bei abgelaufener Frist (inkl. Hinweis)', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-07-10', aktion: 'Unterlagen einreichen' } })
    );
    expect(status.stufe).toBe('rot');
    expect(status.text).toContain('abgelaufen');
  });

  it('rot bei Frist heute', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-07-15', aktion: 'Antwort' } })
    );
    expect(status.stufe).toBe('rot');
    expect(status.text).toContain('HEUTE');
  });

  it('rot bei Frist in 6 Tagen (< 7)', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-07-21', aktion: 'Antwort' } })
    );
    expect(status.stufe).toBe('rot');
  });

  it('gelb bei Frist in genau 7 Tagen (Grenzwert)', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-07-22', aktion: 'Antwort' } })
    );
    expect(status.stufe).toBe('gelb');
  });

  it('gelb bei Frist in genau 21 Tagen (Grenzwert)', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-08-05', aktion: 'Antwort' } })
    );
    expect(status.stufe).toBe('gelb');
  });

  it('grün bei Frist in 22 Tagen (> 21)', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-08-06', aktion: 'Antwort' } })
    );
    expect(status.stufe).toBe('gruen');
  });
});

describe('berechneAmpel — Frist und Termin kombiniert', () => {
  it('das dringendste Datum bestimmt die Ampel (Termin näher als Frist)', () => {
    const status = berechneAmpel(
      analyse({
        frist: { datum: '2026-08-20', aktion: 'Unterlagen' }, // 36 Tage → grün
        termin: { datum: '2026-07-18', uhrzeit: '09:30', ort: 'Raum 1' }, // 3 Tage → rot
      })
    );
    expect(status.stufe).toBe('rot');
    expect(status.text).toContain('Termin');
  });

  it('das dringendste Datum bestimmt die Ampel (Frist näher als Termin)', () => {
    const status = berechneAmpel(
      analyse({
        frist: { datum: '2026-07-25', aktion: 'Antwort' }, // 10 Tage → gelb
        termin: { datum: '2026-09-01', uhrzeit: null, ort: null }, // weit weg
      })
    );
    expect(status.stufe).toBe('gelb');
    expect(status.text).toContain('Frist');
  });

  it('nur Termin ohne Frist funktioniert', () => {
    const status = berechneAmpel(
      analyse({ termin: { datum: '2026-07-16', uhrzeit: null, ort: null } })
    );
    expect(status.stufe).toBe('rot');
    expect(status.text).toContain('Termin');
  });
});

describe('berechneAmpel — Textdetails', () => {
  it('Einzahl bei 1 Tag ("in 1 Tag", nicht "Tagen")', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-07-16', aktion: 'Antwort' } })
    );
    expect(status.text).toContain('in 1 Tag ');
  });

  it('Einzahl bei 1 Tag abgelaufen', () => {
    const status = berechneAmpel(
      analyse({ frist: { datum: '2026-07-14', aktion: 'Antwort' } })
    );
    expect(status.text).toContain('vor 1 Tag)');
  });
});
