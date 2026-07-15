/**
 * UTF-8-Kodierung ohne Plattform-Abhängigkeiten.
 *
 * Warum selbst gebaut: expo-crypto akzeptiert Klartext nur als Uint8Array
 * (oder base64-String), und TextEncoder/TextDecoder sind in Hermes nicht
 * zuverlässig über alle Versionen verfügbar. Der encodeURIComponent-Trick
 * ist korrekt für alle Unicode-Zeichen (Umlaute, Arabisch, Emoji —
 * inklusive Surrogate-Paaren) und in Jest testbar.
 */

/** JavaScript-String -> UTF-8-Bytes. */
export function utf8Kodieren(text: string): Uint8Array {
  const prozentKodiert = encodeURIComponent(text);
  const bytes: number[] = [];
  for (let i = 0; i < prozentKodiert.length; i++) {
    if (prozentKodiert[i] === '%') {
      bytes.push(parseInt(prozentKodiert.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(prozentKodiert.charCodeAt(i));
    }
  }
  return new Uint8Array(bytes);
}

/** UTF-8-Bytes -> JavaScript-String. Wirft bei ungültigem UTF-8 (URIError). */
export function utf8Dekodieren(bytes: Uint8Array): string {
  let prozentKodiert = '';
  for (const byte of bytes) {
    prozentKodiert += '%' + byte.toString(16).padStart(2, '0');
  }
  return decodeURIComponent(prozentKodiert);
}
