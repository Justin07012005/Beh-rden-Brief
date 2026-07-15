/**
 * Tests für die UTF-8-Helfer — kritisch für die Archiv-Verschlüsselung:
 * Ein Kodierungsfehler würde gespeicherte Briefe unlesbar machen.
 */
import { utf8Kodieren, utf8Dekodieren } from '../utf8';

describe('utf8Kodieren / utf8Dekodieren', () => {
  const rundreise = (text: string) => utf8Dekodieren(utf8Kodieren(text));

  it('einfaches ASCII', () => {
    expect(rundreise('Hallo Welt 123')).toBe('Hallo Welt 123');
  });

  it('deutsche Umlaute und ß', () => {
    expect(rundreise('Bescheid über Bürgergeld gemäß § 32 — Änderung')).toBe(
      'Bescheid über Bürgergeld gemäß § 32 — Änderung'
    );
  });

  it('arabisch, ukrainisch, türkisch (Übersetzungssprachen)', () => {
    const text = 'العربية · Українська · Türkçe İĞÜŞÖÇ';
    expect(rundreise(text)).toBe(text);
  });

  it('Emoji (Surrogate-Paare)', () => {
    expect(rundreise('Ampel: 🔴🟡🟢 📬')).toBe('Ampel: 🔴🟡🟢 📬');
  });

  it('JSON-Sonderzeichen', () => {
    const json = JSON.stringify({ a: 'Zeile\nUmbruch "Anführung" \\ Slash' });
    expect(rundreise(json)).toBe(json);
  });

  it('leerer String', () => {
    expect(rundreise('')).toBe('');
  });

  it('kodiert Umlaute als Mehrbyte-Sequenzen (echtes UTF-8)', () => {
    // "ü" ist in UTF-8 die Bytefolge 0xC3 0xBC
    expect(Array.from(utf8Kodieren('ü'))).toEqual([0xc3, 0xbc]);
  });
});
