/**
 * Ergebnis-Ansicht: Ampel, einfache Erklärung, Übersetzung, Fachbegriffe,
 * Frist/Termin mit Kalender-Export, Checkliste und Antwort-Einstieg.
 */
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, SPRACHEN, Sprache } from '../types';
import { useAppStore } from '../store/useAppStore';
import { uebersetzeAnalyse } from '../services/uebersetzung';
import { ClaudeFehler } from '../services/claudeClient';
import { terminZumKalender } from '../services/kalender';
import { formatiereDatum } from '../services/erinnerungen';
import { berechneAmpel } from '../utils/ampel';
import { Ampel } from '../components/Ampel';
import { GrossButton } from '../components/GrossButton';
import { Ikone } from '../components/Ikone';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Analyse'>;

const DEUTSCH: Sprache = { code: 'de', name: 'Deutsch', eigenname: 'Deutsch' };

export function AnalyseScreen({ navigation, route }: Props) {
  const brief = useAppStore((s) => s.briefe.find((b) => b.id === route.params.briefId));
  const setzeUebersetzung = useAppStore((s) => s.setzeUebersetzung);
  const removeBrief = useAppStore((s) => s.removeBrief);

  const [sprache, setSprache] = useState<Sprache>(DEUTSCH);
  const [sprachwahlOffen, setSprachwahlOffen] = useState(false);
  const [uebersetzt, setUebersetzt] = useState(false);
  const [liest, setLiest] = useState(false);
  const [erledigt, setErledigt] = useState<Record<number, boolean>>({});

  if (!brief) {
    // Brief wurde gelöscht — zurück zum Start
    return (
      <View style={styles.zentriert}>
        <Text style={styles.text}>Brief nicht gefunden.</Text>
      </View>
    );
  }

  const { analyse } = brief;
  const ampel = berechneAmpel(analyse);

  // Anzeige-Inhalte: deutsch oder aus dem Übersetzungs-Cache
  const cache = sprache.code !== 'de' ? brief.uebersetzungen[sprache.code] : undefined;
  const kernaussage = cache?.kernaussage ?? analyse.kernaussage;
  const erklaerung = cache?.erklaerung_einfach ?? analyse.erklaerung_einfach;
  const checkliste = cache?.checkliste ?? analyse.checkliste;
  const fachbegriffe = cache?.fachbegriffe ?? analyse.fachbegriffe;

  const sprscheWaehlen = async (neu: Sprache) => {
    setSprachwahlOffen(false);
    setSprache(neu);
    if (neu.code === 'de' || brief.uebersetzungen[neu.code]) return;
    // Noch nicht im Cache -> einmalig übersetzen
    setUebersetzt(true);
    try {
      const u = await uebersetzeAnalyse(analyse, neu);
      await setzeUebersetzung(brief.id, neu.code, u);
    } catch (e) {
      setSprache(DEUTSCH);
      Alert.alert(
        'Übersetzung fehlgeschlagen',
        e instanceof ClaudeFehler ? e.message : 'Bitte versuchen Sie es erneut.'
      );
    } finally {
      setUebersetzt(false);
    }
  };

  /** Vorlese-Funktion für Menschen mit Leseschwäche. */
  const vorlesen = () => {
    if (liest) {
      Speech.stop();
      setLiest(false);
      return;
    }
    setLiest(true);
    Speech.speak(`${kernaussage}. ${erklaerung}`, {
      language: sprache.code,
      onDone: () => setLiest(false),
      onStopped: () => setLiest(false),
      onError: () => setLiest(false),
    });
  };

  const kalenderExport = async () => {
    if (!analyse.termin) return;
    const ok = await terminZumKalender(analyse.termin, `Behörden-Termin: ${analyse.brieftyp}`);
    Alert.alert(
      ok ? 'Termin gespeichert' : 'Nicht möglich',
      ok
        ? 'Der Termin wurde in Ihren Kalender eingetragen (mit Erinnerung 1 Tag vorher).'
        : 'Bitte erlauben Sie den Kalender-Zugriff in den Geräte-Einstellungen.'
    );
  };

  const loeschen = () => {
    Alert.alert('Brief löschen?', 'Der Brief wird dauerhaft vom Gerät gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          Speech.stop();
          await removeBrief(brief.id);
          navigation.popToTop();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: abstand.m }}>
      {/* Dringlichkeits-Ampel ganz oben */}
      <Ampel status={ampel} />

      {/* Sprach-Auswahl */}
      <Pressable
        style={styles.sprachButton}
        onPress={() => setSprachwahlOffen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sprache ändern. Aktuell: ${sprache.name}`}
      >
        <View style={styles.sprachZeileInhalt}>
          <Ikone name="globus" groesse={20} farbe={farben.primaer} />
          <Text style={styles.sprachButtonText}>
            {sprache.eigenname} {uebersetzt ? ' (übersetzt…)' : ''}
          </Text>
          <Ikone name="pfeilRechts" groesse={16} farbe={farben.textTertiaer} />
        </View>
      </Pressable>

      {/* Kernaussage: Was will das Amt von mir? */}
      <View style={styles.karteWichtig}>
        <Text style={styles.abschnittTitel}>Was will das Amt von mir?</Text>
        <Text style={styles.kernaussage}>{kernaussage}</Text>
        <View style={{ marginTop: abstand.s }}>
          <GrossButton
            titel={liest ? 'Vorlesen stoppen' : 'Vorlesen'}
            ikone={liest ? 'stopp' : 'vorlesen'}
            variante="sekundaer"
            onPress={vorlesen}
          />
        </View>
      </View>

      {/* Frist / Termin */}
      {(analyse.frist || analyse.termin) && (
        <View
          style={[
            styles.karte,
            { backgroundColor: ampel.hintergrund, borderLeftWidth: 6, borderLeftColor: ampel.farbe },
          ]}
        >
          {analyse.frist && (
            <Text style={styles.fristText}>
              Frist: <Text style={styles.fett}>{formatiereDatum(analyse.frist.datum)}</Text>
              {'\n'}
              {analyse.frist.aktion}
            </Text>
          )}
          {analyse.termin && (
            <>
              <Text style={styles.fristText}>
                Termin: <Text style={styles.fett}>{formatiereDatum(analyse.termin.datum)}</Text>
                {analyse.termin.uhrzeit ? ` um ${analyse.termin.uhrzeit} Uhr` : ''}
                {analyse.termin.ort ? `\nOrt: ${analyse.termin.ort}` : ''}
              </Text>
              <GrossButton
                titel="Termin zum Kalender hinzufügen"
                ikone="kalender"
                variante="sekundaer"
                onPress={kalenderExport}
              />
            </>
          )}
        </View>
      )}

      {/* Ausführliche Erklärung */}
      <View style={styles.karte}>
        <Text style={styles.abschnittTitel}>Erklärung in einfacher Sprache</Text>
        <Text style={styles.text}>{erklaerung}</Text>
      </View>

      {/* Checkliste */}
      {checkliste.length > 0 && (
        <View style={styles.karte}>
          <Text style={styles.abschnittTitel}>Das müssen Sie tun</Text>
          {checkliste.map((punkt, i) => (
            <Pressable
              key={i}
              style={styles.checkZeile}
              onPress={() => setErledigt((e) => ({ ...e, [i]: !e[i] }))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!erledigt[i] }}
            >
              <Ikone
                name={erledigt[i] ? 'checkAn' : 'checkAus'}
                groesse={26}
                farbe={erledigt[i] ? farben.ampelGruen : farben.textTertiaer}
              />
              <Text style={[styles.text, { flex: 1 }, erledigt[i] && styles.durchgestrichen]}>
                {punkt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Fachbegriffe */}
      {fachbegriffe.length > 0 && (
        <View style={styles.karte}>
          <Text style={styles.abschnittTitel}>Schwere Wörter erklärt</Text>
          {fachbegriffe.map((f, i) => (
            <View key={i} style={styles.begriffBlock}>
              <Text style={styles.begriff}>{f.begriff}</Text>
              <Text style={styles.text}>{f.erklaerung}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Antwort erstellen */}
      {analyse.antwort_noetig && (
        <GrossButton
          titel="Antwort erstellen"
          ikone="stift"
          onPress={() => navigation.navigate('Antwort', { briefId: brief.id })}
        />
      )}

      <View style={{ height: abstand.m }} />
      <GrossButton titel="Brief löschen" ikone="muell" variante="gefahr" onPress={loeschen} />
      <View style={{ height: abstand.xl }} />

      {/* Sprach-Auswahl-Dialog */}
      <Modal visible={sprachwahlOffen} transparent animationType="fade">
        <Pressable style={styles.modalHintergrund} onPress={() => setSprachwahlOffen(false)}>
          <View style={styles.modalKarte}>
            <Text style={styles.abschnittTitel}>Sprache wählen</Text>
            <ScrollView>
              {[DEUTSCH, ...SPRACHEN].map((s) => (
                <Pressable
                  key={s.code}
                  style={styles.sprachZeile}
                  onPress={() => sprscheWaehlen(s)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.sprachZeileText,
                      s.code === sprache.code && { fontWeight: '700', color: farben.primaer },
                    ]}
                  >
                    {s.eigenname} {s.code !== 'de' ? `(${s.name})` : ''}
                    {brief.uebersetzungen[s.code] ? '  ✓' : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  zentriert: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  karte: {
    backgroundColor: farben.flaeche,
    borderRadius: 12,
    padding: abstand.m,
    marginTop: abstand.m,
    gap: abstand.s,
  },
  // DIE Antwort der App — dezent im Marken-Tint hervorgehoben
  karteWichtig: {
    backgroundColor: farben.hervorhebung,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: farben.hervorhebungRand,
    padding: abstand.m,
    marginTop: abstand.m,
  },
  abschnittTitel: {
    fontSize: schrift.gross,
    fontWeight: '700',
    color: farben.primaer,
    marginBottom: abstand.xs,
  },
  kernaussage: { fontSize: schrift.gross, color: farben.text, lineHeight: 30, fontWeight: '500' },
  text: { fontSize: schrift.basis, color: farben.text, lineHeight: 27 },
  fett: { fontWeight: '700' },
  fristText: { fontSize: schrift.basis, color: farben.text, lineHeight: 28 },
  checkZeile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: abstand.s,
    minHeight: 44,
    paddingVertical: 4,
  },
  durchgestrichen: { textDecorationLine: 'line-through', color: farben.textSekundaer },
  begriffBlock: { marginBottom: abstand.s },
  begriff: { fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  sprachButton: {
    marginTop: abstand.m,
    minHeight: TOUCH_TARGET,
    borderRadius: 12,
    backgroundColor: farben.flaeche,
    justifyContent: 'center',
    paddingHorizontal: abstand.m,
  },
  sprachZeileInhalt: { flexDirection: 'row', alignItems: 'center', gap: abstand.s },
  sprachButtonText: { flex: 1, fontSize: schrift.basis, color: farben.text, fontWeight: '600' },
  modalHintergrund: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: abstand.l,
  },
  modalKarte: {
    backgroundColor: farben.flaeche,
    borderRadius: 14,
    padding: abstand.m,
    maxHeight: '75%',
  },
  sprachZeile: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  sprachZeileText: { fontSize: schrift.gross, color: farben.text },
});
