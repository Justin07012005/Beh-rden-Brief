/**
 * Tests für die Logik des Antwort-Assistenten.
 * Kritisch ist vor allem findePlatzhalter: Übersieht die Prüfung eine offene
 * Stelle, verschickt ein Nutzer im Zweifel einen Brief mit "[Ihr Name]" an
 * die Behörde.
 */
import {
  bauAngabenText,
  fehlendePflichtfelder,
  findePlatzhalter,
  setzeAbsenderEin,
} from '../antwortHelfer';
import { AntwortFeld, felderFuer } from '../../data/antwortFelder';

describe('findePlatzhalter', () => {
  it('findet die von der KI gesetzten Platzhalter', () => {
    const text = 'Sehr geehrte Damen und Herren,\n\nmein Name ist [Ihr Name], [Ihre Adresse].';
    expect(findePlatzhalter(text)).toEqual(['[Ihr Name]', '[Ihre Adresse]']);
  });

  it('meldet jeden Platzhalter nur einmal', () => {
    expect(findePlatzhalter('[Aktenzeichen] … erneut [Aktenzeichen]')).toEqual(['[Aktenzeichen]']);
  });

  it('ignoriert den Rechtsberatungs-Hinweis', () => {
    const text = 'Mit freundlichen Grüßen\n[Hinweis: Bei rechtlichen Fragen hilft eine Beratungsstelle.]';
    expect(findePlatzhalter(text)).toEqual([]);
  });

  it('liefert nichts, wenn alle Angaben eingesetzt sind', () => {
    expect(findePlatzhalter('Mein Name ist Justin Meyer, Hauptstraße 1.')).toEqual([]);
  });

  it('hält mehrzeilige Abschnitte in Klammern nicht für Platzhalter', () => {
    expect(findePlatzhalter('[erste Zeile\nzweite Zeile]')).toEqual([]);
  });
});

describe('setzeAbsenderEin', () => {
  const absender = { name: 'Justin Meyer', adresse: 'Hauptstraße 1\n12345 Musterstadt' };

  it('ersetzt Name und Adresse im Entwurf', () => {
    const text = '[Ihr Name]\n[Ihre Adresse]\n\nSehr geehrte Damen und Herren,';
    expect(setzeAbsenderEin(text, absender)).toBe(
      'Justin Meyer\nHauptstraße 1\n12345 Musterstadt\n\nSehr geehrte Damen und Herren,'
    );
  });

  it('erkennt auch die Kurzform und "Anschrift"', () => {
    expect(setzeAbsenderEin('[Name] / [Anschrift]', absender)).toBe(
      'Justin Meyer / Hauptstraße 1\n12345 Musterstadt'
    );
  });

  it('lässt Platzhalter stehen, wenn nichts hinterlegt ist', () => {
    const text = '[Ihr Name], [Ihre Adresse]';
    expect(setzeAbsenderEin(text, null)).toBe(text);
    expect(setzeAbsenderEin(text, { name: '', adresse: '' })).toBe(text);
  });

  it('ersetzt nur, was hinterlegt ist — der Rest bleibt prüfbar', () => {
    expect(setzeAbsenderEin('[Ihr Name], [Ihre Adresse]', { name: 'Justin Meyer', adresse: '' })).toBe(
      'Justin Meyer, [Ihre Adresse]'
    );
  });

  it('behandelt "$"-Zeichen in den Daten als normalen Text', () => {
    // .replace() würde "$&" sonst als Ersetzungsmuster interpretieren
    expect(setzeAbsenderEin('[Ihr Name]', { name: 'A$&B', adresse: '' })).toBe('A$&B');
  });

  it('rührt andere Platzhalter nicht an', () => {
    expect(setzeAbsenderEin('[Aktenzeichen] [Ihr Name]', absender)).toBe('[Aktenzeichen] Justin Meyer');
  });
});

describe('fehlendePflichtfelder', () => {
  const felder = felderFuer('terminverschiebung');

  it('nennt das leere Pflichtfeld', () => {
    expect(fehlendePflichtfelder(felder, {}).map((f) => f.id)).toEqual(['grund']);
  });

  it('wertet reine Leerzeichen als nicht ausgefüllt', () => {
    expect(fehlendePflichtfelder(felder, { grund: '   ' }).map((f) => f.id)).toEqual(['grund']);
  });

  it('ist zufrieden, sobald das Pflichtfeld gefüllt ist', () => {
    expect(fehlendePflichtfelder(felder, { grund: 'Krankheit' })).toEqual([]);
  });

  it('erzwingt keine optionalen Felder', () => {
    // Jede Antwort-Art hat mind. ein Feld, aber "Termin bestätigen" keins mit Pflicht
    expect(fehlendePflichtfelder(felderFuer('terminbestaetigung'), {})).toEqual([]);
  });
});

describe('bauAngabenText', () => {
  const felder: AntwortFeld[] = [
    { id: 'grund', label: 'Warum?', platzhalter: '', pflicht: true },
    { id: 'wunsch', label: 'Wann passt es? (optional)', platzhalter: '' },
  ];

  it('übergibt Label und Wert je gefülltem Feld', () => {
    expect(bauAngabenText(felder, { grund: 'Krankheit', wunsch: 'ab 12.09.' })).toBe(
      '- Warum? Krankheit\n- Wann passt es? ab 12.09.'
    );
  });

  it('lässt leere Felder weg', () => {
    expect(bauAngabenText(felder, { grund: 'Krankheit', wunsch: '  ' })).toBe('- Warum? Krankheit');
  });

  it('sagt "keine", wenn nichts angegeben wurde', () => {
    expect(bauAngabenText(felder, {})).toBe('keine');
  });
});
