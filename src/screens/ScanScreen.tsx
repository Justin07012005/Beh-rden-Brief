/**
 * Brief erfassen: Foto aufnehmen, aus Galerie wählen oder PDF hochladen.
 * Danach läuft die KI-Analyse; bei Erfolg geht es direkt zum Ergebnis.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, BriefEintrag } from '../types';
import { analysiereBrief } from '../services/analyse';
import { ClaudeFehler, NUTZT_PROXY } from '../services/claudeClient';
import {
  GRATIS_ANALYSEN,
  holeAnzahlAnalysen,
  holeGratisKontingent,
  zaehleAnalyse,
} from '../services/storage';
import { planeErinnerungen } from '../services/erinnerungen';
import { useAppStore, neueId } from '../store/useAppStore';
import { GrossButton } from '../components/GrossButton';
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

/**
 * Maximale Kantenlänge fürs KI-Bild. Ein A4-Brief bleibt bei 2000px gut
 * lesbar (~170 dpi); moderne Handyfotos (4000px+) würden unverkleinert
 * bis zu 3x mehr Bild-Token kosten.
 */
const MAX_BILD_KANTE = 2000;

/**
 * Verkleinert ein Foto auf max. MAX_BILD_KANTE (lange Kante, Seitenverhältnis
 * bleibt erhalten), komprimiert als JPEG und liefert base64 für die Analyse.
 */
async function bildFuerAnalyse(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const kontext = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_BILD_KANTE) {
    kontext.resize(
      asset.width >= asset.height
        ? { width: MAX_BILD_KANTE }
        : { height: MAX_BILD_KANTE }
    );
  }
  const bild = await kontext.renderAsync();
  const ergebnis = await bild.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.6,
    base64: true,
  });
  return ergebnis.base64!;
}

export function ScanScreen({ navigation }: Props) {
  const addBrief = useAppStore((s) => s.addBrief);
  const [laedt, setLaedt] = useState(false);
  const [verbraucht, setVerbraucht] = useState(0);
  const [kontingent, setKontingent] = useState(GRATIS_ANALYSEN);

  // Zähler + Kontingent bei jedem Screen-Besuch frisch laden
  // (Kontingent kann sich ändern, wenn in den Einstellungen ein
  // Aktions-Code eingelöst wurde)
  useFocusEffect(
    useCallback(() => {
      holeAnzahlAnalysen().then(setVerbraucht);
      holeGratisKontingent().then(setKontingent);
    }, [])
  );

  // Freemium gilt nur im Produktionsmodus (Proxy). Im Dev-Modus mit
  // eigenem API-Key zahlt der Entwickler selbst — kein Limit nötig.
  const uebrig = kontingent - verbraucht;
  const kontingentLeer = NUTZT_PROXY && uebrig <= 0;

  /** Prüft das Gratis-Kontingent; false = Analyse nicht starten. */
  const pruefeKontingent = (): boolean => {
    if (!kontingentLeer) return true;
    Alert.alert(
      'Gratis-Analysen aufgebraucht',
      `Sie haben Ihre ${kontingent} kostenlosen Brief-Analysen genutzt. Bald können Sie hier ein Abo abschließen, um weiter Briefe zu analysieren.`
    );
    return false;
  };

  /** Gemeinsamer Abschluss: analysieren, speichern, Erinnerungen, weiter. */
  const verarbeite = async (base64: string, mimeType: string) => {
    setLaedt(true);
    try {
      const analyse = await analysiereBrief(base64, mimeType);
      await zaehleAnalyse();
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
    if (!pruefeKontingent()) return;
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Kamera-Zugriff nötig', 'Bitte erlauben Sie den Kamera-Zugriff in den Geräte-Einstellungen.');
      return;
    }
    const ergebnis = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      // Volle Qualität vom Picker — verkleinert & komprimiert wird einmal
      // zentral in bildFuerAnalyse (doppelte JPEG-Kompression vermeiden)
      quality: 1,
    });
    if (!ergebnis.canceled && ergebnis.assets[0]) {
      await verarbeite(await bildFuerAnalyse(ergebnis.assets[0]), 'image/jpeg');
    }
  };

  const ausGalerie = async () => {
    if (!pruefeKontingent()) return;
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Foto-Zugriff nötig', 'Bitte erlauben Sie den Zugriff auf Ihre Fotos in den Geräte-Einstellungen.');
      return;
    }
    const ergebnis = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
    });
    if (!ergebnis.canceled && ergebnis.assets[0]) {
      await verarbeite(await bildFuerAnalyse(ergebnis.assets[0]), 'image/jpeg');
    }
  };

  const pdfWaehlen = async () => {
    if (!pruefeKontingent()) return;
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
      <GrossButton titel="Foto aufnehmen" ikone="kamera" onPress={fotoAufnehmen} />
      <GrossButton titel="Aus Galerie wählen" ikone="galerie" variante="sekundaer" onPress={ausGalerie} />
      <GrossButton titel="PDF hochladen" ikone="dokument" variante="sekundaer" onPress={pdfWaehlen} />
      {NUTZT_PROXY && (
        <Text style={styles.kontingent}>
          {kontingentLeer
            ? 'Gratis-Analysen aufgebraucht — Abo folgt in Kürze'
            : `Noch ${uebrig} von ${kontingent} kostenlosen Analysen`}
        </Text>
      )}
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
  kontingent: {
    fontSize: schrift.klein,
    color: farben.textSekundaer,
    textAlign: 'center',
    marginTop: abstand.m,
  },
  ladeText: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
  ladeHinweis: {
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    textAlign: 'center',
    lineHeight: 26,
  },
});
