/**
 * Großer, barrierefreier Button nach iOS-Vorbild:
 * - primär:   gefüllt mit der Marken-Tintfarbe (wie "prominente" iOS-Buttons)
 * - sekundär: hellgraue Fläche mit Tint-Text (wie Apples "graue Taste" —
 *             bewusst keine Umrandung, das wirkt nativer)
 * - gefahr:   rot gefüllt
 * Min. 56px hoch, große Schrift, System-Icons statt Emojis.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';
import { Ikone, IkonenName } from './Ikone';

interface Props {
  titel: string;
  onPress: () => void;
  variante?: 'primaer' | 'sekundaer' | 'gefahr';
  deaktiviert?: boolean;
  laedt?: boolean;
  ikone?: IkonenName;
}

export function GrossButton({
  titel,
  onPress,
  variante = 'primaer',
  deaktiviert = false,
  laedt = false,
  ikone,
}: Props) {
  const istPrimaer = variante === 'primaer';
  const istGefahr = variante === 'gefahr';
  // Sekundär: dunkles Bronze statt hellem Gold — auf grauer Fläche gut lesbar
  const inhaltsFarbe = istPrimaer || istGefahr ? farben.primaerText : farben.primaerFuellung;
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
        <ActivityIndicator color={inhaltsFarbe} />
      ) : (
        <View style={styles.zeile}>
          {ikone ? <Ikone name={ikone} farbe={inhaltsFarbe} /> : null}
          <Text style={[styles.text, { color: inhaltsFarbe }]}>{titel}</Text>
        </View>
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
  zeile: { flexDirection: 'row', alignItems: 'center', gap: abstand.xs + 2 },
  primaer: { backgroundColor: farben.primaerFuellung },
  sekundaer: { backgroundColor: farben.flaecheSekundaer },
  gefahr: { backgroundColor: farben.fehler },
  deaktiviert: { opacity: 0.4 },
  gedrueckt: { opacity: 0.65 },
  text: { fontSize: schrift.gross, fontWeight: '600', textAlign: 'center' },
});
