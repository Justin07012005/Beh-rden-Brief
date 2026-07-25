/**
 * Archiv — alle Briefe durchsuchbar und nach Behörde filterbar.
 * (Übernimmt die Listen-/Suchfunktion, die vorher auf dem Start-Screen lag.)
 */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BriefEintrag, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { berechneAmpel } from '../utils/ampel';
import { formatiereDatum } from '../services/erinnerungen';
import { Ikone } from '../components/Ikone';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Kurzschlüssel einer Behörde: erstes Wort des Absenders (z. B. „Jobcenter"). */
function behoerdenSchluessel(absender: string): string {
  return absender.trim().split(/\s+/)[0] || absender;
}

export function ArchivScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const briefe = useAppStore((s) => s.briefe);
  const removeBrief = useAppStore((s) => s.removeBrief);
  const [suche, setSuche] = useState('');
  const [behoerde, setBehoerde] = useState('alle');

  // Behörden-Chips aus den echten Absendern ableiten
  const behoerden = Array.from(new Set(briefe.map((b) => behoerdenSchluessel(b.analyse.absender))));
  const filter = ['alle', ...behoerden];

  const gefiltert = briefe.filter((b) => {
    const s = suche.trim().toLowerCase();
    const passtBehoerde = behoerde === 'alle' || behoerdenSchluessel(b.analyse.absender) === behoerde;
    const passtSuche =
      !s ||
      b.analyse.brieftyp.toLowerCase().includes(s) ||
      b.analyse.absender.toLowerCase().includes(s) ||
      b.analyse.kernaussage.toLowerCase().includes(s);
    return passtBehoerde && passtSuche;
  });

  const loeschen = (brief: BriefEintrag) => {
    Alert.alert(
      'Brief löschen?',
      `„${brief.analyse.brieftyp}" wird dauerhaft vom Gerät gelöscht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => removeBrief(brief.id) },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: abstand.m, paddingBottom: abstand.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.kicker}>Archiv</Text>
      <Text style={styles.titel}>Alle Briefe</Text>

      {/* Suche */}
      <View style={styles.sucheBox}>
        <Ikone name="lupe" groesse={17} farbe={farben.textTertiaer} />
        <TextInput
          style={styles.sucheFeld}
          placeholder="Behörde, Brieftyp oder Inhalt suchen"
          placeholderTextColor={farben.textTertiaer}
          value={suche}
          onChangeText={setSuche}
          accessibilityLabel="Archiv durchsuchen"
        />
      </View>

      {/* Behörden-Filter */}
      {behoerden.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: abstand.m }}
          contentContainerStyle={{ gap: 8, paddingRight: abstand.m }}
        >
          {filter.map((f) => {
            const aktiv = behoerde === f;
            return (
              <Pressable
                key={f}
                onPress={() => setBehoerde(f)}
                accessibilityRole="button"
                style={[styles.chip, aktiv && styles.chipAktiv]}
              >
                <Text style={[styles.chipText, aktiv && styles.chipTextAktiv]}>
                  {f === 'alle' ? 'Alle' : f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Text style={styles.zahlZeile}>
        {gefiltert.length} Brief{gefiltert.length === 1 ? '' : 'e'}
      </Text>

      {gefiltert.length === 0 ? (
        <View style={styles.leerBox}>
          <Text style={styles.leerTitel}>{briefe.length === 0 ? 'Noch keine Briefe' : 'Kein Treffer'}</Text>
          <Text style={styles.leerText}>
            {briefe.length === 0
              ? 'Gescannte Briefe erscheinen hier — durchsuchbar und sicher auf Ihrem Gerät.'
              : 'Für Ihre Suche wurde nichts gefunden.'}
          </Text>
        </View>
      ) : (
        <View>
          {gefiltert.map((b) => {
            const ampel = berechneAmpel(b.analyse);
            return (
              <Pressable
                key={b.id}
                onPress={() => navigation.navigate('Analyse', { briefId: b.id })}
                onLongPress={() => loeschen(b)}
                accessibilityRole="button"
                accessibilityLabel={`Brief: ${b.analyse.brieftyp}. ${ampel.text}. Lange drücken zum Löschen.`}
                style={({ pressed }) => [styles.zeile, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.punkt, { backgroundColor: ampel.farbe }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Text style={styles.zeileTyp} numberOfLines={1}>{b.analyse.brieftyp}</Text>
                    <Text style={styles.datum}>{formatiereDatum(b.erstelltAm.slice(0, 10))}</Text>
                  </View>
                  <Text style={styles.zeileMeta} numberOfLines={1}>{b.analyse.absender}</Text>
                  <Text style={[styles.ampelText, { color: ampel.farbe }]} numberOfLines={1}>{ampel.text}</Text>
                </View>
                <Ikone name="pfeilRechts" groesse={16} farbe={farben.textTertiaer} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  kicker: {
    fontSize: 12, letterSpacing: 1.3, textTransform: 'uppercase',
    color: farben.primaer, fontWeight: '600', marginBottom: 4,
  },
  titel: { fontSize: schrift.riesig, fontWeight: '800', color: farben.text, marginBottom: abstand.m },
  sucheBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: farben.flaeche, borderRadius: 12,
    paddingHorizontal: abstand.s, marginBottom: abstand.s, minHeight: 48,
  },
  sucheFeld: { flex: 1, fontSize: schrift.basis, color: farben.text, paddingVertical: abstand.s },
  chip: {
    borderRadius: 9999, borderWidth: 1, borderColor: farben.rand,
    backgroundColor: farben.flaeche, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipAktiv: { borderColor: farben.primaer, backgroundColor: farben.hervorhebung },
  chipText: { fontSize: schrift.klein, color: farben.textSekundaer },
  chipTextAktiv: { color: farben.primaer, fontWeight: '600' },
  zahlZeile: {
    fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
    color: farben.textTertiaer, marginBottom: abstand.s,
  },
  zeile: {
    flexDirection: 'row', alignItems: 'center', gap: abstand.s,
    backgroundColor: farben.flaeche, borderRadius: 12,
    padding: abstand.m, marginBottom: abstand.s, minHeight: TOUCH_TARGET,
  },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  zeileTyp: { flex: 1, fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  datum: { fontSize: schrift.klein, color: farben.textTertiaer, fontVariant: ['tabular-nums'] },
  zeileMeta: { fontSize: schrift.klein, color: farben.textSekundaer, marginTop: 2 },
  ampelText: { fontSize: schrift.klein, fontWeight: '600', marginTop: 2 },
  leerBox: { alignItems: 'center', gap: abstand.s, marginTop: abstand.xl },
  leerTitel: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
  leerText: { fontSize: schrift.basis, color: farben.textSekundaer, textAlign: 'center', lineHeight: 26 },
});
