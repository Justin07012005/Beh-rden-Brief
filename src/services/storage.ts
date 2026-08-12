/**
 * Lokale Speicherung.
 * - API-Key: expo-secure-store (verschlüsselt, nie im Klartext auf der Platte)
 * - Brief-Archiv: AsyncStorage, aber AES-256-GCM-verschlüsselt (siehe krypto.ts)
 * - Einwilligung & Einstellungen: AsyncStorage (unkritische Flags)
 *
 * Datenschutz: Alle Daten bleiben lokal. Nichts wird an Server gesendet,
 * außer dem Briefinhalt zur KI-Analyse (nach expliziter Einwilligung).
 * loescheAlleDaten() entfernt restlos alles — inklusive Archiv-Schlüssel.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Absender, BriefEintrag } from '../types';
import {
  entschluesseleText,
  loescheArchivSchluessel,
  verschluesseleText,
} from './krypto';

const KEY_API = 'anthropic_api_key';
const KEY_BRIEFE = 'behoerdenklar_briefe';
const KEY_CONSENT = 'behoerdenklar_consent';
const KEY_GERAETE_ID = 'behoerdenklar_geraete_id';
const KEY_SCAN_ANZAHL = 'behoerdenklar_scan_anzahl';

/**
 * Freemium: so viele Brief-Analysen sind kostenlos. Danach braucht es das
 * Abo (kommt mit dem IAP-Einbau). Der Zähler liegt lokal — das ist bewusst
 * "weich" (Neuinstallation setzt ihn zurück); die harte Grenze ist das
 * Tageslimit des Backend-Proxys. Echte Abo-Prüfung folgt serverseitig.
 */
export const GRATIS_ANALYSEN = 3;

/** Erhöhtes Kontingent für Warteliste-Anmelder (Code aus der Willkommens-Mail). */
export const BONUS_ANALYSEN = 5;
const KEY_BONUS = 'behoerdenklar_bonus';

/**
 * Aktions-Codes der Landingpage-Warteliste. Bewusst ein geteilter Code
 * (kein Einmal-Code): Der "Schaden" bei Weitergabe sind 2 Extra-Analysen
 * (~5 Cent) — dafür brauchen wir keinerlei Server-Logik.
 */
const GUELTIGE_CODES = ['FRUEHSTART'];

export async function holeBonusAktiv(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_BONUS)) === 'ja';
}

/** true = Code war gültig und wurde eingelöst. */
export async function loeseBonusCodeEin(code: string): Promise<boolean> {
  if (!GUELTIGE_CODES.includes(code.trim().toUpperCase())) return false;
  await AsyncStorage.setItem(KEY_BONUS, 'ja');
  return true;
}

/** Aktuelles Gratis-Kontingent dieses Geräts (3, mit Aktions-Code 5). */
export async function holeGratisKontingent(): Promise<number> {
  return (await holeBonusAktiv()) ? BONUS_ANALYSEN : GRATIS_ANALYSEN;
}

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

// ---- Geräte-ID (anonym, nur fürs Tageslimit des Backend-Proxys) ----

/**
 * Liefert eine zufällige, anonyme Geräte-ID (wird beim ersten Aufruf erzeugt).
 * Sie enthält keine Gerätedaten und dient dem Proxy ausschließlich dazu,
 * das Anfrage-Tageslimit pro Installation durchzusetzen.
 */
export async function holeGeraeteId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY_GERAETE_ID);
  if (!id) {
    // Math.random reicht hier: die ID ist kein Geheimnis, nur ein Zähl-Schlüssel
    id =
      'g_' +
      Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join('');
    await AsyncStorage.setItem(KEY_GERAETE_ID, id);
  }
  return id;
}

// ---- Freemium-Zähler ----

/** Wie viele Brief-Analysen wurden auf diesem Gerät schon durchgeführt? */
export async function holeAnzahlAnalysen(): Promise<number> {
  const roh = await AsyncStorage.getItem(KEY_SCAN_ANZAHL);
  const anzahl = roh ? parseInt(roh, 10) : 0;
  return Number.isFinite(anzahl) ? anzahl : 0;
}

/** Nach jeder erfolgreichen Analyse aufrufen. */
export async function zaehleAnalyse(): Promise<void> {
  const bisher = await holeAnzahlAnalysen();
  await AsyncStorage.setItem(KEY_SCAN_ANZAHL, String(bisher + 1));
}

// ---- Einwilligung (Datenschutz-Consent) ----

export async function holeConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_CONSENT)) === 'ja';
}

export async function speichereConsent(): Promise<void> {
  await AsyncStorage.setItem(KEY_CONSENT, 'ja');
}

// ---- Brief-Archiv (verschlüsselt) ----

export async function ladeBriefe(): Promise<BriefEintrag[]> {
  const roh = await AsyncStorage.getItem(KEY_BRIEFE);
  if (!roh) return [];
  try {
    // Migration: Bestände aus Versionen vor der Verschlüsselung liegen als
    // Klartext-JSON-Array vor ('['), base64-Chiffrate nie. Einmalig
    // verschlüsselt neu schreiben.
    if (roh.startsWith('[')) {
      const briefe = JSON.parse(roh) as BriefEintrag[];
      await speichereBriefe(briefe);
      return briefe;
    }
    return JSON.parse(await entschluesseleText(roh)) as BriefEintrag[];
  } catch {
    // Korrupte/unlesbare Daten nicht crashen lassen — leeres Archiv liefern
    return [];
  }
}

export async function speichereBriefe(briefe: BriefEintrag[]): Promise<void> {
  await AsyncStorage.setItem(
    KEY_BRIEFE,
    await verschluesseleText(JSON.stringify(briefe))
  );
}

// ---- Absenderdaten für Antwortbriefe (verschlüsselt) ----

const KEY_ABSENDER = 'behoerdenklar_absender';

/**
 * Name und Anschrift des Nutzers. Genauso schützenswert wie die Briefe
 * selbst, deshalb mit demselben Archiv-Schlüssel verschlüsselt und nicht
 * als Klartext-Einstellung abgelegt.
 */
export async function holeAbsender(): Promise<Absender | null> {
  const roh = await AsyncStorage.getItem(KEY_ABSENDER);
  if (!roh) return null;
  try {
    return JSON.parse(await entschluesseleText(roh)) as Absender;
  } catch {
    return null;
  }
}

export async function speichereAbsender(absender: Absender): Promise<void> {
  const name = absender.name.trim();
  const adresse = absender.adresse.trim();
  if (!name && !adresse) {
    await AsyncStorage.removeItem(KEY_ABSENDER);
    return;
  }
  await AsyncStorage.setItem(
    KEY_ABSENDER,
    await verschluesseleText(JSON.stringify({ name, adresse }))
  );
}

// ---- Sicherheits-Einstellungen ----

const KEY_APP_SPERRE = 'behoerdenklar_app_sperre';
const KEY_AUTO_LOESCHEN = 'behoerdenklar_auto_loeschen_tage';

/** Ist die App-Sperre (Face ID / Geräte-Code beim Öffnen) aktiviert? */
export async function holeAppSperre(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_APP_SPERRE)) === 'ja';
}

export async function setzeAppSperre(aktiv: boolean): Promise<void> {
  if (aktiv) {
    await AsyncStorage.setItem(KEY_APP_SPERRE, 'ja');
  } else {
    await AsyncStorage.removeItem(KEY_APP_SPERRE);
  }
}

/** Nach wie vielen Tagen Briefe automatisch gelöscht werden (0 = nie). */
export async function holeAutoLoeschTage(): Promise<number> {
  const roh = await AsyncStorage.getItem(KEY_AUTO_LOESCHEN);
  const tage = roh ? parseInt(roh, 10) : 0;
  return Number.isFinite(tage) && tage > 0 ? tage : 0;
}

export async function setzeAutoLoeschTage(tage: number): Promise<void> {
  if (tage > 0) {
    await AsyncStorage.setItem(KEY_AUTO_LOESCHEN, String(tage));
  } else {
    await AsyncStorage.removeItem(KEY_AUTO_LOESCHEN);
  }
}

// ---- Alles löschen (Datenschutz-Anforderung) ----

export async function loescheAlleDaten(): Promise<void> {
  // "Alle Daten löschen" heißt wirklich alle — auch Zähler und Geräte-ID.
  // Dass damit das Gratis-Kontingent zurücksetzbar ist, nehmen wir in Kauf
  // (Neuinstallation könnte das ohnehin); der Proxy limitiert weiterhin.
  await AsyncStorage.multiRemove([
    KEY_BRIEFE,
    KEY_CONSENT,
    KEY_GERAETE_ID,
    KEY_SCAN_ANZAHL,
    KEY_BONUS,
    KEY_APP_SPERRE,
    KEY_AUTO_LOESCHEN,
    KEY_ABSENDER,
  ]);
  await SecureStore.deleteItemAsync(KEY_API);
  // Archiv-Schlüssel zuletzt: danach wären Restdaten ohnehin unlesbar
  await loescheArchivSchluessel();
}
