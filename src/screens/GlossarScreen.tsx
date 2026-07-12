/**
 * Behörden-Glossar: durchsuchbares Nachschlagewerk, komplett offline.
 */
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { GLOSSAR } from '../data/glossar';
import { farben, schrift, abstand } from '../theme';

export function GlossarScreen() {
  const [suche, setSuche] = useState('');

  const gefiltert = GLOSSAR.filter(
    (e) =>
      !suche ||
      e.begriff.toLowerCase().includes(suche.toLowerCase()) ||
      e.erklaerung.toLowerCase().includes(suche.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.suche}
        placeholder="Begriff suchen, z. B. Widerspruch…"
        placeholderTextColor={farben.textSekundaer}
        value={suche}
        onChangeText={setSuche}
        accessibilityLabel="Glossar durchsuchen"
      />
      <FlatList
        data={gefiltert}
        keyExtractor={(e) => e.begriff}
        contentContainerStyle={{ padding: abstand.m, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={styles.karte}>
            <Text style={styles.begriff}>{item.begriff}</Text>
            <Text style={styles.erklaerung}>{item.erklaerung}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.leer}>Kein Begriff gefunden.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  suche: {
    margin: abstand.m,
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: 12,
    padding: abstand.s,
    fontSize: schrift.basis,
    color: farben.text,
    minHeight: 48,
  },
  karte: {
    backgroundColor: farben.flaeche,
    borderRadius: 14,
    padding: abstand.m,
    marginBottom: abstand.s,
  },
  begriff: { fontSize: schrift.gross, fontWeight: '700', color: farben.primaer },
  erklaerung: {
    fontSize: schrift.basis,
    color: farben.text,
    lineHeight: 27,
    marginTop: abstand.xs,
  },
  leer: {
    textAlign: 'center',
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    marginTop: abstand.xl,
  },
});
