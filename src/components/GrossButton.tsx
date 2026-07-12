/**
 * Großer, barrierefreier Button: min. 56px hoch, große Schrift,
 * hoher Kontrast. Varianten: primär (gefüllt) und sekundär (Umriss).
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';

interface Props {
  titel: string;
  onPress: () => void;
  variante?: 'primaer' | 'sekundaer' | 'gefahr';
  deaktiviert?: boolean;
  laedt?: boolean;
  symbol?: string;
}

export function GrossButton({
  titel,
  onPress,
  variante = 'primaer',
  deaktiviert = false,
  laedt = false,
  symbol,
}: Props) {
  const istPrimaer = variante === 'primaer';
  const istGefahr = variante === 'gefahr';
  return (
    <Pressable
      onPress={onPress}
      disabled={deaktiviert || laedt}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => [
        styles.button,
        istPrimaer && styles.primaer,
        variante === 'sekundaer' && styles.sekundaer,
        istGefahr && styles.gefahr,
        (deaktiviert || laedt) && styles.deaktiviert,
        pressed && styles.gedrueckt,
      ]}
    >
      {laedt ? (
        <ActivityIndicator color={istPrimaer || istGefahr ? farben.primaerText : farben.primaer} />
      ) : (
        <Text
          style={[
            styles.text,
            (istPrimaer || istGefahr) && { color: farben.primaerText },
            variante === 'sekundaer' && { color: farben.primaer },
          ]}
        >
          {symbol ? `${symbol}  ` : ''}
          {titel}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: abstand.l,
    paddingVertical: abstand.s,
  },
  primaer: { backgroundColor: farben.primaer },
  sekundaer: { backgroundColor: farben.hintergrund, borderWidth: 2, borderColor: farben.primaer },
  gefahr: { backgroundColor: farben.fehler },
  deaktiviert: { opacity: 0.5 },
  gedrueckt: { opacity: 0.8 },
  text: { fontSize: schrift.gross, fontWeight: '700', textAlign: 'center' },
});
