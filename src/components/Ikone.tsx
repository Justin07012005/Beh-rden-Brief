/**
 * Zentrale Icon-Komponente — echte System-Icons statt Emojis:
 * SF Symbols auf iOS (Apple-Look), Material Symbols auf Android.
 * Alle in der App verwendeten Icons sind hier benannt, damit die
 * Plattform-Zuordnung an einer Stelle liegt.
 */
import React from 'react';
import { SymbolView } from 'expo-symbols';

export type IkonenName =
  | 'kamera'
  | 'galerie'
  | 'dokument'
  | 'buch'
  | 'zahnrad'
  | 'brief'
  | 'pfeilRechts'
  | 'vorlesen'
  | 'stopp'
  | 'kalender'
  | 'stift'
  | 'teilen'
  | 'muell'
  | 'globus'
  | 'checkAn'
  | 'checkAus'
  | 'warnung'
  | 'wecker'
  | 'info'
  | 'funken'
  | 'uhr'
  | 'archiv'
  | 'schloss'
  | 'lupe'
  | 'pfeilLinks';

// `as const` hält die Namen als Literal-Typen — so prüft TypeScript gegen
// die offizielle SF-Symbol-/Material-Namensliste von expo-symbols
const NAMEN = {
  kamera: { ios: 'camera.fill', android: 'photo_camera' },
  galerie: { ios: 'photo.on.rectangle', android: 'image' },
  dokument: { ios: 'doc.fill', android: 'description' },
  buch: { ios: 'book.fill', android: 'menu_book' },
  zahnrad: { ios: 'gearshape.fill', android: 'settings' },
  brief: { ios: 'envelope.open.fill', android: 'mail' },
  pfeilRechts: { ios: 'chevron.right', android: 'chevron_right' },
  vorlesen: { ios: 'speaker.wave.2.fill', android: 'volume_up' },
  stopp: { ios: 'stop.fill', android: 'stop' },
  kalender: { ios: 'calendar.badge.plus', android: 'event' },
  stift: { ios: 'square.and.pencil', android: 'edit' },
  teilen: { ios: 'square.and.arrow.up', android: 'share' },
  muell: { ios: 'trash.fill', android: 'delete' },
  globus: { ios: 'globe', android: 'language' },
  checkAn: { ios: 'checkmark.square.fill', android: 'check_box' },
  checkAus: { ios: 'square', android: 'check_box_outline_blank' },
  warnung: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  wecker: { ios: 'alarm.fill', android: 'alarm' },
  info: { ios: 'info.circle.fill', android: 'info' },
  funken: { ios: 'wand.and.stars', android: 'auto_awesome' },
  uhr: { ios: 'clock.fill', android: 'schedule' },
  archiv: { ios: 'archivebox.fill', android: 'inventory_2' },
  schloss: { ios: 'lock.fill', android: 'lock' },
  lupe: { ios: 'magnifyingglass', android: 'search' },
  pfeilLinks: { ios: 'chevron.left', android: 'chevron_left' },
} as const;

interface Props {
  name: IkonenName;
  groesse?: number;
  farbe: string;
}

export function Ikone({ name, groesse = 22, farbe }: Props) {
  const eintrag = NAMEN[name];
  return (
    <SymbolView
      name={{ ios: eintrag.ios, android: eintrag.android }}
      size={groesse}
      tintColor={farbe}
    />
  );
}
