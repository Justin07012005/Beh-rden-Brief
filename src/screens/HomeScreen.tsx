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
import { Ikone, IkonenName } from '../components/Ikone';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/** Quadratische Navigations-Kachel: Icon oben, Beschriftung darunter.
 *  (Löst das Platzproblem nebeneinanderstehender Text-Buttons.) */
function Kachel({
  ikone,
  titel,
  onPress,
}: {
  ikone: IkonenName;
  titel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.kachel, pressed && { opacity: 0.65 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titel}
    >
      <Ikone name={ikone} groesse={26} farbe={farben.primaer} />
      <Text style={styles.kachelTitel} numberOfLines={1}>
        {titel}
      </Text>
    </Pressable>
  );
}

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
        style={({ pressed }) => [
          styles.karte,
          { borderLeftColor: ampel.farbe },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => navigation.navigate('Analyse', { briefId: item.id })}
        onLongPress={() => loeschenBestaetigen(item)}
        accessibilityRole="button"
        accessibilityLabel={`Brief: ${item.analyse.brieftyp}. ${ampel.text}. Lange drücken zum Löschen.`}
      >
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
        <Ikone name="pfeilRechts" groesse={18} farbe={farben.textTertiaer} />
      </Pressable>
    );
  };

  return (
    <FlatList
      style={styles.container}
      // iOS: sorgt beim großen Titel für korrekte Abstände + Kollabieren beim Scrollen
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      data={gefiltert}
      keyExtractor={(b) => b.id}
      renderItem={renderBrief}
      contentContainerStyle={styles.inhalt}
      ListHeaderComponent={
        <View style={styles.kopf}>
          <GrossButton titel="Brief scannen" ikone="kamera" onPress={scanStarten} />
          <View style={styles.reihe}>
            <Kachel ikone="buch" titel="Glossar" onPress={() => navigation.navigate('Glossar')} />
            <Kachel
              ikone="zahnrad"
              titel="Einstellungen"
              onPress={() => navigation.navigate('Einstellungen')}
            />
          </View>
          {briefe.length > 0 && (
            <>
              <Text style={styles.abschnittsLabel}>Ihre Briefe</Text>
              <TextInput
                style={styles.suche}
                placeholder="Im Archiv suchen…"
                placeholderTextColor={farben.textSekundaer}
                value={suche}
                onChangeText={setSuche}
                accessibilityLabel="Archiv durchsuchen"
              />
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        briefe.length === 0 ? (
          <View style={styles.leerBox}>
            <Ikone name="brief" groesse={48} farbe={farben.textTertiaer} />
            <Text style={styles.leerTitel}>Noch keine Briefe</Text>
            <Text style={styles.leer}>
              Scannen Sie Ihren ersten Behördenbrief —{'\n'}in einer Minute
              wissen Sie, was er bedeutet.
            </Text>
          </View>
        ) : (
          <Text style={styles.leer}>Keine Treffer.</Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  inhalt: { paddingHorizontal: abstand.m, paddingBottom: abstand.l },
  kopf: { paddingTop: abstand.s, paddingBottom: abstand.s, gap: abstand.s },
  reihe: { flexDirection: 'row', gap: abstand.s },
  kachel: {
    flex: 1,
    minHeight: TOUCH_TARGET + 22,
    backgroundColor: farben.flaeche,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: abstand.s,
    gap: 6,
  },
  kachelTitel: { fontSize: schrift.klein + 1, fontWeight: '600', color: farben.primaer },
  abschnittsLabel: {
    marginTop: abstand.m,
    fontSize: schrift.klein - 1,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: farben.textSekundaer,
  },
  suche: {
    backgroundColor: farben.flaeche,
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
    borderRadius: 12,
    borderLeftWidth: 6,
    padding: abstand.m,
    marginBottom: abstand.s,
    gap: abstand.s,
  },
  kartenTitel: { fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  kartenUntertitel: { fontSize: schrift.klein, color: farben.textSekundaer, marginTop: 2 },
  kartenAmpelText: { fontSize: schrift.klein, fontWeight: '600', marginTop: 2 },
  leerBox: { alignItems: 'center', marginTop: abstand.xl, gap: abstand.s },
  leerTitel: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
  leer: {
    textAlign: 'center',
    fontSize: schrift.basis,
    color: farben.textSekundaer,
    lineHeight: 28,
  },
});
