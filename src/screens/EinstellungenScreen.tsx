/**
 * Einstellungen: API-Schlüssel (Dev-Modus), Datenschutz-Info,
 * "Alle Daten löschen".
 */
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { holeApiKey, speichereApiKey, loescheAlleDaten } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import { GrossButton } from '../components/GrossButton';
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Einstellungen'>;

export function EinstellungenScreen({ navigation }: Props) {
  const leereAlles = useAppStore((s) => s.leereAlles);
  const [apiKey, setApiKey] = useState('');
  const [keyVorhanden, setKeyVorhanden] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    holeApiKey().then((k) => setKeyVorhanden(!!k));
  }, []);

  const speichern = async () => {
    await speichereApiKey(apiKey);
    setKeyVorhanden(!!apiKey.trim());
    setApiKey('');
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2500);
  };

  const allesLoeschen = () => {
    Alert.alert(
      'Wirklich ALLE Daten löschen?',
      'Alle gescannten Briefe, Übersetzungen, Entwürfe, der API-Schlüssel und die Einwilligung werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await loescheAlleDaten();
            // Auch geplante Frist-Erinnerungen entfernen
            await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
            leereAlles();
            setKeyVorhanden(false);
            Alert.alert('Erledigt', 'Alle Daten wurden gelöscht.');
            navigation.popToTop();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: abstand.m }}>
      <Text style={styles.abschnittTitel}>KI-Zugang (API-Schlüssel)</Text>
      <Text style={styles.text}>
        Status:{' '}
        <Text style={{ fontWeight: '700', color: keyVorhanden ? farben.ampelGruen : farben.fehler }}>
          {keyVorhanden ? 'Schlüssel hinterlegt ✓' : 'Kein Schlüssel hinterlegt'}
        </Text>
      </Text>
      <Text style={styles.hinweis}>
        Der Schlüssel wird verschlüsselt auf dem Gerät gespeichert (Secure Store)
        und nur für die Brief-Analyse verwendet. Einen Schlüssel erhalten Sie
        unter console.anthropic.com.
      </Text>
      <TextInput
        style={styles.eingabe}
        placeholder="sk-ant-…"
        placeholderTextColor={farben.textSekundaer}
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="API-Schlüssel eingeben"
      />
      <GrossButton
        titel={gespeichert ? 'Gespeichert ✓' : 'Schlüssel speichern'}
        onPress={speichern}
        deaktiviert={!apiKey.trim()}
      />

      <View style={styles.trenner} />

      <Text style={styles.abschnittTitel}>Datenschutz</Text>
      <View style={styles.karte}>
        <Text style={styles.text}>
          • Brieffotos werden nur zur Analyse an Anthropic gesendet und dort
          nicht dauerhaft gespeichert.{'\n\n'}
          • Alle Ergebnisse liegen ausschließlich auf Ihrem Gerät.{'\n\n'}
          • Diese App ersetzt keine Rechtsberatung.
        </Text>
      </View>

      <View style={styles.trenner} />

      <Text style={styles.abschnittTitel}>Daten löschen</Text>
      <GrossButton titel="Alle Daten löschen" symbol="🗑️" variante="gefahr" onPress={allesLoeschen} />
      <View style={{ height: abstand.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  abschnittTitel: {
    fontSize: schrift.gross,
    fontWeight: '700',
    color: farben.primaer,
    marginBottom: abstand.s,
  },
  text: { fontSize: schrift.basis, color: farben.text, lineHeight: 27 },
  hinweis: {
    fontSize: schrift.klein,
    color: farben.textSekundaer,
    lineHeight: 22,
    marginVertical: abstand.s,
  },
  eingabe: {
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: 12,
    padding: abstand.s,
    fontSize: schrift.basis,
    color: farben.text,
    minHeight: 56,
    marginBottom: abstand.s,
  },
  karte: { backgroundColor: farben.flaeche, borderRadius: 14, padding: abstand.m },
  trenner: { height: 1, backgroundColor: farben.rand, marginVertical: abstand.l },
});
