/**
 * Startbildschirm: großer Scan-Button + durchsuchbares Brief-Archiv.
 */
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BriefEintrag, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { holeConsent } from '../services/storage';
import { berechneAmpel } from '../utils/ampel';
import { formatiereDatum } from '../services/erinnerungen';
import { GrossButton } from '../components/GrossButton';
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const briefe = useAppStore((s) => s.briefe);
  const removeBrief = useAppStore((s) => s.removeBrief);
  const [suche, setSuche] = useState('');

  /** Scan starten — beim ersten Mal zuerst die Einwilligung einholen. */
  const scanStarten = async () => {
    const ok = await holeConsent();
    navigation.navigate(ok ? 'Scan' : 'Consent');
  };

  const gefiltert = briefe.filter((b) => {
    const s = suche.toLowerCase();
    return (
      !s ||
      b.analyse.brieftyp.toLowerCase().includes(s) ||
      b.analyse.absender.toLowerCase().includes(s) ||
      b.analyse.kernaussage.toLowerCase().includes(s)
    );
  });

  const loeschenBestaetigen = (brief: BriefEintrag) => {
    Alert.alert(
      'Brief löschen?',
      `„${brief.analyse.brieftyp}" wird dauerhaft vom Gerät gelöscht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => removeBrief(brief.id) },
      ]
    );
  };

  const renderBrief = ({ item }: { item: BriefEintrag }) => {
    const ampel = berechneAmpel(item.analyse);
    return (
      <Pressable
        style={({ pressed }) => [styles.karte, pressed && { opacity: 0.7 }]}
        onPress={() => navigation.navigate('Analyse', { briefId: item.id })}
        onLongPress={() => loeschenBestaetigen(item)}
        accessibilityRole="button"
        accessibilityLabel={`Brief: ${item.analyse.brieftyp}. ${ampel.text}. Lange drücken zum Löschen.`}
      >
        <View style={[styles.ampelPunkt, { backgroundColor: ampel.farbe }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kartenTitel} numberOfLines={1}>
            {item.analyse.brieftyp}
          </Text>
          <Text style={styles.kartenUntertitel} numberOfLines={1}>
            {item.analyse.absender} · {formatiereDatum(item.erstelltAm.slice(0, 10))}
          </Text>
          <Text style={[styles.kartenAmpelText, { color: ampel.farbe }]} numberOfLines={1}>
            {ampel.text}
          </Text>
        </View>
        <Text style={styles.pfeil}>›</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.kopf}>
        <GrossButton titel="Brief scannen" symbol="📷" onPress={scanStarten} />
        <View style={styles.reihe}>
          <View style={{ flex: 1 }}>
            <GrossButton
              titel="Glossar"
              variante="sekundaer"
              symbol="📖"
              onPress={() => navigation.navigate('Glossar')}
            />
          </View>
          <View style={{ width: abstand.s }} />
          <View style={{ flex: 1 }}>
            <GrossButton
              titel="Einstellungen"
              variante="sekundaer"
              symbol="⚙️"
              onPress={() => navigation.navigate('Einstellungen')}
            />
          </View>
        </View>
      </View>

      {briefe.length > 0 && (
        <TextInput
          style={styles.suche}
          placeholder="Im Archiv suchen…"
          placeholderTextColor={farben.textSekundaer}
          value={suche}
          onChangeText={setSuche}
          accessibilityLabel="Archiv durchsuchen"
        />
      )}

      <FlatList
        data={gefiltert}
        keyExtractor={(b) => b.id}
        renderItem={renderBrief}
        contentContainerStyle={{ padding: abstand.m, paddingTop: 0 }}
        ListEmptyComponent={
          <Text style={styles.leer}>
            {briefe.length === 0
              ? 'Noch keine Briefe.\nScannen Sie Ihren ersten Behördenbrief!'
              : 'Keine Treffer.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  kopf: { padding: abstand.m, gap: abstand.s },
  reihe: { flexDirection: 'row' },
  suche: {
    marginHorizontal: abstand.m,
    marginBottom: abstand.s,
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: 12,
    padding: abstand.s,
    fontSize: schrift.basis,
    color: farben.text,
    minHeight: 48,
  },
  karte: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: farben.flaeche,
    borderRadius: 14,
    padding: abstand.m,
    marginBottom: abstand.s,
    gap: abstand.s,
  },
  ampelPunkt: { width: 16, height: 16, borderRadius: 8 },
  kartenTitel: { fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  kartenUntertitel: { fontSize: schrift.klein, color: farben.textSekundaer, marginTop: 2 },
  kartenAmpelText: { fontSize: schrift.klein, fontWeight: '600', marginTop: 2 },
  pfeil: { fontSize: 32, color: farben.textSekundaer },
  leer: {
    textAlign: 'center',
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    marginTop: abstand.xl,
    lineHeight: 28,
  },
});
