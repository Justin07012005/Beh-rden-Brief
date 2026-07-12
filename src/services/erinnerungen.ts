/**
 * Lokale Erinnerungen vor ablaufenden Fristen und Terminen.
 * Nutzt lokal geplante Benachrichtigungen (expo-notifications) —
 * funktioniert ohne Push-Server. Hinweis: In Expo Go auf Android sind
 * Benachrichtigungen eingeschränkt; im Development Build voll verfügbar.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { BriefEintrag } from '../types';

/** Muss einmalig beim App-Start laufen (siehe App.tsx). */
export function initialisiereBenachrichtigungen(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function stelleKanalUndRechteSicher(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fristen', {
        name: 'Fristen und Termine',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/** Plant eine Benachrichtigung um 9:00 Uhr am angegebenen Tag (falls in der Zukunft). */
async function planeUm9Uhr(datumIso: string, titel: string, text: string): Promise<void> {
  const datum = new Date(`${datumIso}T09:00:00`);
  if (isNaN(datum.getTime()) || datum.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: titel, body: text, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: datum,
      channelId: 'fristen',
    },
  });
}

/** Verschiebt ein ISO-Datum um n Tage. */
function tageVorher(datumIso: string, tage: number): string {
  const d = new Date(`${datumIso}T00:00:00`);
  d.setDate(d.getDate() - tage);
  return d.toISOString().slice(0, 10);
}

/**
 * Plant Erinnerungen für einen Brief: je 3 Tage und 1 Tag vor Frist/Termin.
 * Vergangene Zeitpunkte werden übersprungen. Fehler (z. B. verweigerte
 * Berechtigung) brechen die App nicht — Erinnerungen sind ein Bonus.
 *
 * @returns true wenn mindestens eine Erinnerung geplant wurde
 */
export async function planeErinnerungen(brief: BriefEintrag): Promise<boolean> {
  const ok = await stelleKanalUndRechteSicher();
  if (!ok) return false;

  let geplant = false;
  try {
    const { frist, termin, brieftyp } = brief.analyse;
    if (frist) {
      for (const abstand of [3, 1]) {
        await planeUm9Uhr(
          tageVorher(frist.datum, abstand),
          `Frist in ${abstand} Tag${abstand > 1 ? 'en' : ''}: ${brieftyp}`,
          `Bis ${formatiereDatum(frist.datum)}: ${frist.aktion}`
        );
        geplant = true;
      }
    }
    if (termin) {
      for (const abstand of [3, 1]) {
        await planeUm9Uhr(
          tageVorher(termin.datum, abstand),
          `Termin in ${abstand} Tag${abstand > 1 ? 'en' : ''}: ${brieftyp}`,
          `Am ${formatiereDatum(termin.datum)}${termin.uhrzeit ? ` um ${termin.uhrzeit} Uhr` : ''}${termin.ort ? ` — ${termin.ort}` : ''}`
        );
        geplant = true;
      }
    }
  } catch {
    return geplant;
  }
  return geplant;
}

/** ISO-Datum -> deutsches Format TT.MM.JJJJ. */
export function formatiereDatum(iso: string): string {
  const [j, m, t] = iso.split('-');
  if (!j || !m || !t) return iso;
  return `${t}.${m}.${j}`;
}
