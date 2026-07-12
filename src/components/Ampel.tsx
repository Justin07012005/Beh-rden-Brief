/**
 * Dringlichkeits-Ampel als gut sichtbares Banner.
 * Farbe + Symbol + Text — nicht nur Farbe (Barrierefreiheit: Farbenblindheit).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AmpelStatus } from '../utils/ampel';
import { abstand, schrift } from '../theme';

const SYMBOL: Record<string, string> = { rot: '⚠️', gelb: '⏰', gruen: 'ℹ️' };

export function Ampel({ status }: { status: AmpelStatus }) {
  return (
    <View
      style={[styles.banner, { backgroundColor: status.hintergrund, borderColor: status.farbe }]}
      accessibilityRole="alert"
      accessibilityLabel={`Dringlichkeit: ${status.text}`}
    >
      <Text style={styles.symbol}>{SYMBOL[status.stufe]}</Text>
      <Text style={[styles.text, { color: status.farbe }]}>{status.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: abstand.m,
    gap: abstand.s,
  },
  symbol: { fontSize: 28 },
  text: { flex: 1, fontSize: schrift.gross, fontWeight: '700' },
});
