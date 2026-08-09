/**
 * Brief-Detail ("Ihr Brief erklärt") — Layout nach dem Claude-Design-Entwurf:
 * große Frist-Karte mit Countdown oben, dann "Das ist passiert",
 * "Das müssen Sie tun", schwere Wörter und der Einstieg zur Antwort.
 * Alle Funktionen bleiben: Übersetzung, Vorlesen, Kalender, Löschen.
 */
import React, { useLayoutEffect, useState } from 'react';
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
import { berechneAmpel, naechsteFrist, formatiereLangDatum } from '../utils/ampel';
import { GrossButton } from '../components/GrossButton';
import { Ikone } from '../components/Ikone';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Analyse'>;

const DEUTSCH: Sprache = { code: 'de', name: 'Deutsch', eigenname: 'Deutsch' };

const STUFEN_LABEL: Record<string, string> = {
  rot: 'Dringend',
  gelb: 'Handlung nötig',
  gruen: 'Zur Kenntnis',
};

export function AnalyseScreen({ navigation, route }: Props) {
  const brief = useAppStore((s) => s.briefe.find((b) => b.id === route.params.briefId));
  const setzeUebersetzung = useAppStore((s) => s.setzeUebersetzung);
  const removeBrief = useAppStore((s) => s.removeBrief);

  const [sprache, setSprache] = useState<Sprache>(DEUTSCH);
  const [sprachwahlOffen, setSprachwahlOffen] = useState(false);
  const [uebersetzt, setUebersetzt] = useState(false);
  const [liest, setLiest] = useState(false);
  const [erledigt, setErledigt] = useState<Record<number, boolean>>({});

  // Header-Titel = Brieftyp (wie im Entwurf), sobald der Brief geladen ist
  useLayoutEffect(() => {
    if (brief) navigation.setOptions({ title: brief.analyse.brieftyp });
  }, [navigation, brief]);

  if (!brief) {
    return (
      <View style={styles.zentriert}>
        <Text style={styles.text}>Brief nicht gefunden.</Text>
      </View>
    );
  }

  const { analyse } = brief;
  const ampel = berechneAmpel(analyse);
  const frist = naechsteFrist(analyse);
  const stufenLabel = STUFEN_LABEL[ampel.stufe];

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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: abstand.m, paddingBottom: abstand.xl }}>
      {/* ── Frist-Karte mit Countdown ── */}
      {frist ? (
        <View style={[styles.fristKarte, { backgroundColor: ampel.hintergrund, borderColor: ampel.farbe }]}>
          <View style={styles.fristKopf}>
            <Ikone name="uhr" groesse={16} farbe={ampel.farbe} />
            <Text style={[styles.fristKicker, { color: ampel.farbe }]}>
              {frist.label} · {stufenLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <Text style={[styles.grosseZahl, { color: ampel.farbe }]}>
              {frist.tage < 0 ? '!' : frist.tage}
            </Text>
            <View style={{ paddingBottom: 8 }}>
              <Text style={[styles.zahlEinheit, { color: ampel.farbe }]}>
                {frist.tage < 0 ? 'überfällig' : 'Tage'}
              </Text>
              <Text style={styles.zahlUnter}>{frist.tage < 0 ? '' : 'verbleiben'}</Text>
            </View>
          </View>
          <View style={styles.trenner} />
          <View style={styles.datenZeile}>
            <Text style={styles.datenLabel}>{frist.label === 'Termin' ? 'Termin am' : 'Fällig am'}</Text>
            <Text style={styles.datenWert}>{formatiereLangDatum(frist.datumIso)}</Text>
          </View>
          {analyse.frist?.aktion && (
            <View style={styles.datenZeile}>
              <Text style={styles.datenLabel}>Zu tun</Text>
              <Text style={[styles.datenWert, { color: ampel.farbe, flex: 1, textAlign: 'right' }]}>
                {analyse.frist.aktion}
              </Text>
            </View>
          )}
          {analyse.termin && (
            <>
              {(analyse.termin.uhrzeit || analyse.termin.ort) && (
                <View style={styles.datenZeile}>
                  <Text style={styles.datenLabel}>Wo & wann</Text>
                  <Text style={[styles.datenWert, { flex: 1, textAlign: 'right' }]}>
                    {analyse.termin.uhrzeit ? `${analyse.termin.uhrzeit} Uhr` : ''}
                    {analyse.termin.uhrzeit && analyse.termin.ort ? ' · ' : ''}
                    {analyse.termin.ort ?? ''}
                  </Text>
                </View>
              )}
              <View style={{ marginTop: abstand.s }}>
                <GrossButton
                  titel="Termin zum Kalender hinzufügen"
                  ikone="kalender"
                  variante="sekundaer"
                  onPress={kalenderExport}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={styles.keineFrist}>
          <Ikone name="info" groesse={20} farbe={farben.ampelGruen} />
          <View style={{ flex: 1 }}>
            <Text style={styles.keineFristTitel}>Keine Frist</Text>
            <Text style={styles.keineFristText}>Dieser Brief ist nur zur Kenntnis. Sie müssen nichts tun.</Text>
          </View>
        </View>
      )}

      {/* ── Steuerung: Sprache + Vorlesen ── */}
      <View style={styles.werkzeugZeile}>
        <Pressable
          style={styles.werkzeug}
          onPress={() => setSprachwahlOffen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Sprache ändern. Aktuell: ${sprache.name}`}
        >
          <Ikone name="globus" groesse={18} farbe={farben.primaer} />
          <Text style={styles.werkzeugText} numberOfLines={1}>
            {uebersetzt ? 'übersetzt…' : sprache.eigenname}
          </Text>
        </Pressable>
        <Pressable style={styles.werkzeug} onPress={vorlesen} accessibilityRole="button">
          <Ikone name={liest ? 'stopp' : 'vorlesen'} groesse={18} farbe={farben.primaer} />
          <Text style={styles.werkzeugText}>{liest ? 'Stopp' : 'Vorlesen'}</Text>
        </Pressable>
      </View>

      {/* ── Das ist passiert ── */}
      <Text style={styles.kicker}>Das ist passiert</Text>
      <Text style={styles.kernaussage}>{kernaussage}</Text>
      <Text style={styles.erklaerung}>{erklaerung}</Text>

      {/* ── Das müssen Sie tun ── */}
      {checkliste.length > 0 && (
        <>
          <View style={styles.dünnerTrenner} />
          <Text style={styles.kicker}>Das müssen Sie tun</Text>
          <View style={{ gap: abstand.s }}>
            {checkliste.map((punkt, i) => {
              const fertig = !!erledigt[i];
              return (
                <Pressable
                  key={i}
                  style={styles.todoZeile}
                  onPress={() => setErledigt((e) => ({ ...e, [i]: !e[i] }))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: fertig }}
                >
                  <View style={[styles.todoKreis, fertig && styles.todoKreisFertig]}>
                    {fertig ? (
                      <Ikone name="checkAn" groesse={16} farbe={farben.primaerText} />
                    ) : (
                      <Text style={styles.todoNummer}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.todoText, fertig && styles.durchgestrichen]}>{punkt}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* ── Schwere Wörter ── */}
      {fachbegriffe.length > 0 && (
        <>
          <View style={styles.dünnerTrenner} />
          <Text style={styles.kicker}>Schwere Wörter erklärt</Text>
          <View style={{ gap: abstand.s }}>
            {fachbegriffe.map((f, i) => (
              <View key={i} style={styles.begriffKarte}>
                <Text style={styles.begriff}>{f.begriff}</Text>
                <Text style={styles.begriffText}>{f.erklaerung}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Antwort ── */}
      {analyse.antwort_noetig && (
        <View style={{ marginTop: abstand.l }}>
          <GrossButton
            titel="Antwort erstellen"
            ikone="stift"
            onPress={() => navigation.navigate('Antwort', { briefId: brief.id })}
          />
        </View>
      )}

      {/* ── Datenschutz-Fuß + Löschen ── */}
      <View style={styles.schutzZeile}>
        <Ikone name="schloss" groesse={13} farbe={farben.textTertiaer} />
        <Text style={styles.schutzText}>Auf Ihrem Gerät ausgewertet · verschlüsselt gespeichert</Text>
      </View>
      <View style={{ marginTop: abstand.m }}>
        <GrossButton titel="Brief löschen" ikone="muell" variante="gefahr" onPress={loeschen} />
      </View>

      {/* Sprach-Auswahl-Dialog */}
      <Modal visible={sprachwahlOffen} transparent animationType="fade">
        <Pressable style={styles.modalHintergrund} onPress={() => setSprachwahlOffen(false)}>
          <View style={styles.modalKarte}>
            <Text style={styles.modalTitel}>Sprache wählen</Text>
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
                      s.code === sprache.code && { fontWeight: '700', color: farben.primaerFuellung },
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

  // Frist-Karte
  fristKarte: { borderRadius: 16, borderWidth: 1, padding: abstand.l },
  fristKopf: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  fristKicker: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '700' },
  grosseZahl: { fontSize: 64, lineHeight: 64, fontWeight: '800', fontVariant: ['tabular-nums'] },
  zahlEinheit: { fontSize: 22, fontWeight: '700', lineHeight: 24 },
  zahlUnter: { fontSize: 13, color: farben.textSekundaer },
  trenner: { height: 1, backgroundColor: farben.rand, marginVertical: 14 },
  datenZeile: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 5 },
  datenLabel: { fontSize: schrift.klein, color: farben.textSekundaer },
  datenWert: { fontSize: schrift.klein, fontWeight: '700', color: farben.text },

  keineFrist: {
    flexDirection: 'row', gap: abstand.s, alignItems: 'center',
    backgroundColor: farben.ampelGruenHintergrund, borderRadius: 12,
    borderLeftWidth: 4, borderLeftColor: farben.ampelGruen, padding: abstand.m,
  },
  keineFristTitel: { fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  keineFristText: { fontSize: schrift.klein, color: farben.textSekundaer, marginTop: 2 },

  // Werkzeuge
  werkzeugZeile: { flexDirection: 'row', gap: abstand.s, marginTop: abstand.m },
  werkzeug: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: farben.flaeche, borderRadius: 12, minHeight: 48, paddingHorizontal: abstand.s,
  },
  werkzeugText: { fontSize: schrift.klein, fontWeight: '600', color: farben.primaerFuellung },

  kicker: {
    fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase',
    color: farben.primaer, fontWeight: '700', marginTop: abstand.l, marginBottom: abstand.xs,
  },
  kernaussage: { fontSize: schrift.gross, color: farben.text, lineHeight: 29, fontWeight: '600' },
  erklaerung: { fontSize: schrift.basis, color: farben.textSekundaer, lineHeight: 27, marginTop: abstand.s },
  dünnerTrenner: { height: 1, backgroundColor: farben.rand, marginTop: abstand.l },

  // To-do
  todoZeile: { flexDirection: 'row', gap: abstand.s, alignItems: 'flex-start', minHeight: 40 },
  todoKreis: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: farben.primaer,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  todoKreisFertig: { backgroundColor: farben.ampelGruen, borderColor: farben.ampelGruen },
  todoNummer: { fontSize: schrift.klein, fontWeight: '700', color: farben.primaerFuellung, fontVariant: ['tabular-nums'] },
  todoText: { flex: 1, fontSize: schrift.basis, color: farben.text, lineHeight: 25, paddingTop: 3 },
  durchgestrichen: { textDecorationLine: 'line-through', color: farben.textSekundaer },

  // Fachbegriffe
  begriffKarte: { backgroundColor: farben.flaeche, borderRadius: 12, padding: abstand.m },
  begriff: { fontSize: schrift.basis, fontWeight: '700', color: farben.text, marginBottom: 3 },
  begriffText: { fontSize: schrift.klein, color: farben.textSekundaer, lineHeight: 23 },

  schutzZeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: abstand.l },
  schutzText: { fontSize: 11.5, color: farben.textTertiaer },

  text: { fontSize: schrift.basis, color: farben.text, lineHeight: 27 },

  // Modal
  modalHintergrund: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: abstand.l },
  modalKarte: { backgroundColor: farben.flaeche, borderRadius: 14, padding: abstand.m, maxHeight: '75%' },
  modalTitel: { fontSize: schrift.gross, fontWeight: '700', color: farben.text, marginBottom: abstand.xs },
  sprachZeile: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  sprachZeileText: { fontSize: schrift.gross, color: farben.text },
});
