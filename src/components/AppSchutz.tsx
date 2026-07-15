/**
 * Schützt den App-Inhalt auf zwei Ebenen:
 * 1. App-Sperre (optional, Einstellungen): Beim Öffnen und nach jedem
 *    Wechsel in den Hintergrund muss das Gerät entsperrt werden
 *    (Face ID / Touch ID / Geräte-Code).
 * 2. Sichtschutz (immer): Im App-Umschalter wird der Inhalt verdeckt,
 *    damit Briefe dort nicht als Vorschau lesbar sind.
 *
 * Der Inhalt bleibt gemountet (Navigation geht nicht verloren) — die
 * Schutzschichten legen sich als Overlay darüber.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { holeAppSperre } from '../services/storage';
import { GrossButton } from './GrossButton';
import { farben, schrift, abstand } from '../theme';

export function AppSchutz({ children }: { children: React.ReactNode }) {
  const [entsperrt, setEntsperrt] = useState(false);
  const [bereit, setBereit] = useState(false);
  const [verdeckt, setVerdeckt] = useState(false);
  const authLaeuft = useRef(false);

  const entsperren = useCallback(async () => {
    if (authLaeuft.current) return;
    authLaeuft.current = true;
    try {
      const ergebnis = await LocalAuthentication.authenticateAsync({
        promptMessage: 'BehördenKlar entsperren',
        cancelLabel: 'Abbrechen',
      });
      if (ergebnis.success) setEntsperrt(true);
    } finally {
      authLaeuft.current = false;
    }
  }, []);

  // Beim Start: Sperre-Einstellung prüfen und ggf. direkt entsperren lassen
  useEffect(() => {
    holeAppSperre().then((aktiv) => {
      if (!aktiv) {
        setEntsperrt(true);
      } else {
        entsperren();
      }
      setBereit(true);
    });
  }, [entsperren]);

  // Hintergrund-Wechsel: Sichtschutz an/aus, Sperre ggf. neu scharf stellen.
  // Die Einstellung wird hier frisch gelesen, damit ein Umschalten in den
  // Einstellungen sofort wirkt.
  useEffect(() => {
    const abo = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        setVerdeckt(false);
      } else {
        setVerdeckt(true);
        if (status === 'background') {
          holeAppSperre().then((aktiv) => {
            if (aktiv) setEntsperrt(false);
          });
        }
      }
    });
    return () => abo.remove();
  }, []);

  if (!bereit) return <View style={styles.deckschicht} />;

  return (
    <View style={{ flex: 1 }}>
      {children}
      {!entsperrt && (
        <View style={[StyleSheet.absoluteFill, styles.deckschicht, styles.sperrschirm]}>
          <Text style={styles.symbol}>🔒</Text>
          <Text style={styles.titel}>BehördenKlar ist gesperrt</Text>
          <Text style={styles.text}>Ihre Briefe sind geschützt.</Text>
          <GrossButton titel="Entsperren" onPress={entsperren} />
        </View>
      )}
      {entsperrt && verdeckt && (
        <View style={[StyleSheet.absoluteFill, styles.deckschicht, styles.sichtschutz]}>
          <Text style={styles.symbol}>📬</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deckschicht: { flex: 1, backgroundColor: farben.hintergrund },
  sperrschirm: {
    justifyContent: 'center',
    padding: abstand.xl,
    gap: abstand.m,
  },
  sichtschutz: { justifyContent: 'center', alignItems: 'center' },
  symbol: { fontSize: 56, textAlign: 'center' },
  titel: {
    fontSize: schrift.titel,
    fontWeight: '700',
    color: farben.text,
    textAlign: 'center',
  },
  text: {
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    textAlign: 'center',
    marginBottom: abstand.m,
  },
});
