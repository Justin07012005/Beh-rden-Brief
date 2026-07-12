/**
 * Datenschutz-Einwilligung — MUSS vor dem ersten Scan bestätigt werden.
 * Erklärt klar, dass der Briefinhalt zur KI-Analyse gesendet wird.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { speichereConsent } from '../services/storage';
import { GrossButton } from '../components/GrossButton';
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Consent'>;

export function ConsentScreen({ navigation }: Props) {
  const einverstanden = async () => {
    await speichereConsent();
    navigation.replace('Scan');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inhalt}>
      <Text style={styles.titel}>Bevor es losgeht</Text>

      <View style={styles.karte}>
        <Text style={styles.punkt}>
          📤 Wenn Sie einen Brief scannen, wird das Foto zur Analyse an den
          KI-Dienst von Anthropic (USA) gesendet.
        </Text>
        <Text style={styles.punkt}>
          🔒 Behördenbriefe enthalten sehr persönliche Daten (Name, Adresse,
          Aktenzeichen, finanzielle Angaben). Senden Sie nur Briefe, deren
          Analyse Sie wirklich möchten.
        </Text>
        <Text style={styles.punkt}>
          📱 Die Analyse-Ergebnisse werden nur auf Ihrem Gerät gespeichert —
          nicht auf unseren Servern.
        </Text>
        <Text style={styles.punkt}>
          🗑️ Sie können in den Einstellungen jederzeit alle Daten vollständig
          löschen.
        </Text>
        <Text style={styles.punkt}>
          ⚖️ Die App gibt keine Rechtsberatung. Bei wichtigen Entscheidungen
          (z. B. Widerspruch) fragen Sie eine Beratungsstelle oder einen Anwalt.
        </Text>
      </View>

      <GrossButton titel="Ich bin einverstanden" onPress={einverstanden} />
      <View style={{ height: abstand.s }} />
      <GrossButton
        titel="Abbrechen"
        variante="sekundaer"
        onPress={() => navigation.goBack()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  inhalt: { padding: abstand.l },
  titel: {
    fontSize: schrift.titel,
    fontWeight: '700',
    color: farben.text,
    marginBottom: abstand.l,
  },
  karte: {
    backgroundColor: farben.flaeche,
    borderRadius: 14,
    padding: abstand.m,
    marginBottom: abstand.xl,
    gap: abstand.m,
  },
  punkt: { fontSize: schrift.basis, color: farben.text, lineHeight: 27 },
});
