/**
 * Verschlüsselung des Brief-Archivs (AES-256-GCM, nativ via expo-crypto).
 *
 * Warum: Die analysierten Briefe enthalten hochsensible Daten (Sozialleistungen,
 * Gesundheit, Finanzen). AsyncStorage ist unverschlüsselter Klartext auf der
 * Platte — deshalb wird das Archiv vor dem Speichern verschlüsselt.
 *
 * Schlüsselverwaltung: Ein 256-Bit-Schlüssel wird beim ersten Bedarf erzeugt
 * und im Secure Store des Geräts abgelegt (iOS Keychain / Android Keystore).
 * Er verlässt das Gerät nie. GCM liefert zusätzlich Integritätsschutz —
 * manipulierte Daten fallen beim Entschlüsseln auf.
 */
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { utf8Dekodieren, utf8Kodieren } from '../utils/utf8';

const KEY_ARCHIV_SCHLUESSEL = 'behoerdenklar_archiv_schluessel';

/** Im Speicher gehaltener Schlüssel — spart SecureStore-Zugriffe pro Aufruf. */
let schluesselCache: AESEncryptionKey | null = null;

async function holeSchluessel(): Promise<AESEncryptionKey> {
  if (schluesselCache) return schluesselCache;
  const hex = await SecureStore.getItemAsync(KEY_ARCHIV_SCHLUESSEL);
  if (hex) {
    schluesselCache = await AESEncryptionKey.import(hex, 'hex');
  } else {
    schluesselCache = await AESEncryptionKey.generate(); // 256 Bit (Default)
    await SecureStore.setItemAsync(
      KEY_ARCHIV_SCHLUESSEL,
      await schluesselCache.encoded('hex')
    );
  }
  return schluesselCache;
}

/** Verschlüsselt Text -> base64-String (IV + Ciphertext + GCM-Tag kombiniert). */
export async function verschluesseleText(klartext: string): Promise<string> {
  const schluessel = await holeSchluessel();
  const versiegelt = await aesEncryptAsync(utf8Kodieren(klartext), schluessel);
  return (await versiegelt.combined('base64')) as string;
}

/** Entschlüsselt einen base64-String zurück zu Text. Wirft bei Manipulation. */
export async function entschluesseleText(chiffrat: string): Promise<string> {
  const schluessel = await holeSchluessel();
  const versiegelt = AESSealedData.fromCombined(chiffrat);
  const bytes = (await aesDecryptAsync(versiegelt, schluessel)) as Uint8Array;
  return utf8Dekodieren(bytes);
}

/** Für "Alle Daten löschen": Schlüssel unwiderruflich entfernen. */
export async function loescheArchivSchluessel(): Promise<void> {
  schluesselCache = null;
  await SecureStore.deleteItemAsync(KEY_ARCHIV_SCHLUESSEL);
}
