/**
 * Dringlichkeits-Ampel als gut sichtbares Banner.
 * Farbe + Icon + Text — nicht nur Farbe (Barrierefreiheit: Farbenblindheit).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AmpelStatus } from '../utils/ampel';
import { abstand, schrift } from '../theme';
import { Ikone, IkonenName } from './Ikone';

const IKONE: Record<string, IkonenName> = { rot: 'warnung', gelb: 'wecker', gruen: 'info' };

export function Ampel({ status }: { status: AmpelStatus }) {
  return (
    <View
      style={[styles.banner, { backgroundColor: status.hintergrund, borderLeftColor: status.farbe }]}
      accessibilityRole="alert"
      accessibilityLabel={`Dringlichkeit: ${status.text}`}
    >
      <Ikone name={IKONE[status.stufe]} groesse={26} farbe={status.farbe} />
      <Text style={[styles.text, { color: status.farbe }]}>{status.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    borderRadius: 12,
    padding: abstand.m,
    gap: abstand.s,
  },
  text: { flex: 1, fontSize: schrift.gross, fontWeight: '700' },
});
