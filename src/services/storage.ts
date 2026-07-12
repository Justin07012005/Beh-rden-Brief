/**
 * Lokale Speicherung.
 * - API-Key: expo-secure-store (verschlüsselt, nie im Klartext auf der Platte)
 * - Brief-Archiv + Einwilligung: AsyncStorage (bleibt auf dem Gerät)
 *
 * Datenschutz: Alle Daten bleiben lokal. Nichts wird an Server gesendet,
 * außer dem Briefinhalt zur KI-Analyse (nach expliziter Einwilligung).
 * loescheAlleDaten() entfernt restlos alles.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { BriefEintrag } from '../types';

const KEY_API = 'anthropic_api_key';
const KEY_BRIEFE = 'behoerdenklar_briefe';
const KEY_CONSENT = 'behoerdenklar_consent';

// ---- API-Key (sensibel -> SecureStore) ----

export async function holeApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_API);
}

export async function speichereApiKey(key: string): Promise<void> {
  if (key.trim()) {
    await SecureStore.setItemAsync(KEY_API, key.trim());
  } else {
    await SecureStore.deleteItemAsync(KEY_API);
  }
}

// ---- Einwilligung (Datenschutz-Consent) ----

export async function holeConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_CONSENT)) === 'ja';
}

export async function speichereConsent(): Promise<void> {
  await AsyncStorage.setItem(KEY_CONSENT, 'ja');
}

// ---- Brief-Archiv ----

export async function ladeBriefe(): Promise<BriefEintrag[]> {
  const roh = await AsyncStorage.getItem(KEY_BRIEFE);
  if (!roh) return [];
  try {
    return JSON.parse(roh) as BriefEintrag[];
  } catch {
    // Korrupte Daten nicht crashen lassen — leeres Archiv liefern
    return [];
  }
}

export async function speichereBriefe(briefe: BriefEintrag[]): Promise<void> {
  await AsyncStorage.setItem(KEY_BRIEFE, JSON.stringify(briefe));
}

// ---- Alles löschen (Datenschutz-Anforderung) ----

export async function loescheAlleDaten(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_BRIEFE, KEY_CONSENT]);
  await SecureStore.deleteItemAsync(KEY_API);
}
