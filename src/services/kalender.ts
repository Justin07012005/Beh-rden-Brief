/**
 * Termin-Export in den Geräte-Kalender (expo-calendar).
 */
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Termin } from '../types';

async function holeKalenderId(): Promise<string | null> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  if (!granted) return null;

  if (Platform.OS === 'ios') {
    const standard = await Calendar.getDefaultCalendarAsync();
    return standard?.id ?? null;
  }
  // Android: ersten beschreibbaren Kalender nehmen
  const kalender = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const beschreibbar = kalender.find((k) => k.allowsModifications);
  return beschreibbar?.id ?? null;
}

/**
 * Legt den Behörden-Termin im Kalender an.
 * @returns true bei Erfolg, false wenn Berechtigung fehlt / kein Kalender.
 */
export async function terminZumKalender(
  termin: Termin,
  titel: string
): Promise<boolean> {
  try {
    const kalenderId = await holeKalenderId();
    if (!kalenderId) return false;

    // Startzeit: genannte Uhrzeit oder 09:00 als Standard
    const uhrzeit = termin.uhrzeit ?? '09:00';
    const start = new Date(`${termin.datum}T${uhrzeit}:00`);
    if (isNaN(start.getTime())) return false;
    const ende = new Date(start.getTime() + 60 * 60 * 1000); // 1 Stunde

    await Calendar.createEventAsync(kalenderId, {
      title: titel,
      startDate: start,
      endDate: ende,
      location: termin.ort ?? undefined,
      notes: 'Erstellt mit BehördenKlar',
      alarms: [{ relativeOffset: -60 * 24 }], // Erinnerung 1 Tag vorher
    });
    return true;
  } catch {
    return false;
  }
}
