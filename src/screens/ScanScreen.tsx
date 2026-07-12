/**
 * Brief erfassen: Foto aufnehmen, aus Galerie wählen oder PDF hochladen.
 * Danach läuft die KI-Analyse; bei Erfolg geht es direkt zum Ergebnis.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, BriefEintrag } from '../types';
import { analysiereBrief } from '../services/analyse';
import { ClaudeFehler } from '../services/claudeClient';
import { planeErinnerungen } from '../services/erinnerungen';
import { useAppStore, neueId } from '../store/useAppStore';
import { GrossButton } from '../components/GrossButton';
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export function ScanScreen({ navigation }: Props) {
  const addBrief = useAppStore((s) => s.addBrief);
  const [laedt, setLaedt] = useState(false);

  /** Gemeinsamer Abschluss: analysieren, speichern, Erinnerungen, weiter. */
  const verarbeite = async (base64: string, mimeType: string) => {
    setLaedt(true);
    try {
      const analyse = await analysiereBrief(base64, mimeType);
      const brief: BriefEintrag = {
        id: neueId(),
        erstelltAm: new Date().toISOString(),
        analyse,
        uebersetzungen: {},
      };
      await addBrief(brief);
      // Erinnerungen im Hintergrund planen — Fehler hier sind unkritisch
      planeErinnerungen(brief).catch(() => {});
      navigation.replace('Analyse', { briefId: brief.id });
    } catch (e) {
      const meldung =
        e instanceof ClaudeFehler
          ? e.message
          : 'Die Analyse ist fehlgeschlagen. Bitte versuchen Sie es erneut.';
      Alert.alert('Fehler', meldung);
    } finally {
      setLaedt(false);
    }
  };

  const fotoAufnehmen = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Kamera-Zugriff nötig', 'Bitte erlauben Sie den Kamera-Zugriff in den Geräte-Einstellungen.');
      return;
    }
    const ergebnis = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.6, // Kompromiss: lesbar für die KI, aber kleine Datenmenge
      base64: true,
    });
    if (!ergebnis.canceled && ergebnis.assets[0]?.base64) {
      // base64 der ImagePicker-Assets ist laut Doku immer JPEG
      await verarbeite(ergebnis.assets[0].base64, 'image/jpeg');
    }
  };

  const ausGalerie = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Foto-Zugriff nötig', 'Bitte erlauben Sie den Zugriff auf Ihre Fotos in den Geräte-Einstellungen.');
      return;
    }
    const ergebnis = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.6,
      base64: true,
    });
    if (!ergebnis.canceled && ergebnis.assets[0]?.base64) {
      await verarbeite(ergebnis.assets[0].base64, 'image/jpeg');
    }
  };

  const pdfWaehlen = async () => {
    const ergebnis = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (ergebnis.canceled || !ergebnis.assets[0]) return;
    try {
      // Neues expo-file-system API (SDK 57): File-Klasse mit base64()
      const datei = new File(ergebnis.assets[0].uri);
      const base64 = await datei.base64();
      await verarbeite(base64, 'application/pdf');
    } catch {
      Alert.alert('Fehler', 'Die PDF-Datei konnte nicht gelesen werden.');
    }
  };

  if (laedt) {
    return (
      <View style={styles.ladeContainer}>
        <ActivityIndicator size="large" color={farben.primaer} />
        <Text style={styles.ladeText}>Ihr Brief wird analysiert…</Text>
        <Text style={styles.ladeHinweis}>
          Das kann bis zu einer Minute dauern. Bitte lassen Sie die App geöffnet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.anleitung}>
        Fotografieren Sie den Brief gut beleuchtet und von oben. Der ganze Text
        muss auf dem Foto sein.
      </Text>
      <GrossButton titel="Foto aufnehmen" symbol="📷" onPress={fotoAufnehmen} />
      <GrossButton titel="Aus Galerie wählen" symbol="🖼️" variante="sekundaer" onPress={ausGalerie} />
      <GrossButton titel="PDF hochladen" symbol="📄" variante="sekundaer" onPress={pdfWaehlen} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: farben.hintergrund,
    padding: abstand.l,
    gap: abstand.m,
    justifyContent: 'center',
  },
  anleitung: {
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: abstand.l,
  },
  ladeContainer: {
    flex: 1,
    backgroundColor: farben.hintergrund,
    justifyContent: 'center',
    alignItems: 'center',
    padding: abstand.xl,
    gap: abstand.m,
  },
  ladeText: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
  ladeHinweis: {
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    textAlign: 'center',
    lineHeight: 26,
  },
});
