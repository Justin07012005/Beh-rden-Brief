/**
 * Fristen-Übersicht (Start) — Briefe nach Dringlichkeit statt nach Datum.
 * Das Wichtigste zuerst: die nächste Frist groß mit Countdown, darunter
 * weitere offene Fristen und zuletzt reine Info-Briefe.
 *
 * Aufbau übernommen aus dem „Postklar"-Design (Claude Design), umgesetzt
 * im bestehenden, gut lesbaren iOS-Look von BehördenKlar.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BriefEintrag, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { holeConsent } from '../services/storage';
import {
  berechneAmpel,
  naechsteFrist,
  formatiereLangDatum,
  NaechsteFrist,
} from '../utils/ampel';
import { Ikone } from '../components/Ikone';
import { farben, schrift, abstand, TOUCH_TARGET } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Anzeige-Daten eines Briefs für die Fristen-Übersicht. */
interface FristBrief {
  brief: BriefEintrag;
  frist: NaechsteFrist | null;
  farbe: string;
  hintergrund: string;
  stufenLabel: string;
}

const STUFEN_LABEL: Record<string, string> = {
  rot: 'Dringend',
  gelb: 'Handlung nötig',
  gruen: 'Zur Kenntnis',
};

function bereiteAuf(brief: BriefEintrag): FristBrief {
  const ampel = berechneAmpel(brief.analyse);
  return {
    brief,
    frist: naechsteFrist(brief.analyse),
    farbe: ampel.farbe,
    hintergrund: ampel.hintergrund,
    stufenLabel: STUFEN_LABEL[ampel.stufe],
  };
}

/** Runder Kopf-Knopf (Glossar / Einstellungen). */
function KopfKnopf({ ikone, label, onPress }: { ikone: 'buch' | 'zahnrad'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.kopfKnopf, pressed && { opacity: 0.6 }]}
    >
      <Ikone name={ikone} groesse={20} farbe={farben.primaer} />
    </Pressable>
  );
}

export function FristenScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const briefe = useAppStore((s) => s.briefe);

  const scanStarten = async () => {
    const ok = await holeConsent();
    navigation.navigate(ok ? 'Scan' : 'Consent');
  };

  const aufbereitet = briefe.map(bereiteAuf);
  const mitFrist = aufbereitet
    .filter((f) => f.frist !== null)
    .sort((a, b) => (a.frist!.tage - b.frist!.tage));
  const naechste = mitFrist[0];
  const weitere = mitFrist.slice(1);
  const infoBriefe = aufbereitet.filter((f) => f.frist === null);

  const oeffne = (id: string) => navigation.navigate('Analyse', { briefId: id });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: abstand.xl }}
    >
      {/* Kopf */}
      <View style={styles.kopf}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ikone name="uhr" groesse={22} farbe={farben.primaer} />
          <Text style={styles.marke}>BehördenKlar</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <KopfKnopf ikone="buch" label="Glossar" onPress={() => navigation.navigate('Glossar')} />
          <KopfKnopf ikone="zahnrad" label="Einstellungen" onPress={() => navigation.navigate('Einstellungen')} />
        </View>
      </View>

      <View style={{ paddingHorizontal: abstand.m }}>
        <Text style={styles.kicker}>Fristen-Übersicht</Text>
        <Text style={styles.titel}>Ihre Fristen</Text>
        <Text style={styles.unterTitel}>
          Nach Dringlichkeit geordnet. Kümmern Sie sich zuerst um das Oberste.
        </Text>

        {briefe.length === 0 ? (
          <View style={styles.leerBox}>
            <Ikone name="brief" groesse={44} farbe={farben.textTertiaer} />
            <Text style={styles.leerTitel}>Noch keine Briefe</Text>
            <Text style={styles.leerText}>
              Scannen Sie Ihren ersten Behördenbrief — in einer Minute wissen
              Sie, was er bedeutet und bis wann Sie handeln müssen.
            </Text>
          </View>
        ) : (
          <>
            {/* Nächste Frist — groß */}
            {naechste && (
              <Pressable
                onPress={() => oeffne(naechste.brief.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.heldKarte,
                  { backgroundColor: naechste.hintergrund, borderLeftColor: naechste.farbe },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.heldKopf}>
                  <View style={[styles.punkt, { backgroundColor: naechste.farbe }]} />
                  <Text style={[styles.heldKicker, { color: naechste.farbe }]}>
                    Nächste Frist · {naechste.stufenLabel}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                  <Text style={[styles.grosseZahl, { color: naechste.farbe }]}>
                    {naechste.frist!.tage < 0 ? '!' : naechste.frist!.tage}
                  </Text>
                  <View style={{ paddingBottom: 8 }}>
                    <Text style={[styles.zahlEinheit, { color: naechste.farbe }]}>
                      {naechste.frist!.tage < 0 ? 'überfällig' : 'Tage'}
                    </Text>
                    <Text style={styles.zahlDatum}>bis {formatiereLangDatum(naechste.frist!.datumIso)}</Text>
                  </View>
                </View>
                <View style={styles.trenner} />
                <Text style={styles.briefTyp}>{naechste.brief.analyse.brieftyp}</Text>
                <Text style={styles.briefMeta}>
                  {naechste.brief.analyse.absender}
                  {naechste.frist!.aktion ? ` · ${naechste.frist!.aktion}` : ''}
                </Text>
              </Pressable>
            )}

            {/* Weitere offene Fristen */}
            {weitere.length > 0 && (
              <>
                <Text style={styles.abschnitt}>Weitere offene Fristen</Text>
                <View style={{ gap: abstand.s }}>
                  {weitere.map((f) => (
                    <Pressable
                      key={f.brief.id}
                      onPress={() => oeffne(f.brief.id)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.zeile,
                        { borderLeftColor: f.farbe },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={styles.zahlBox}>
                        <Text style={[styles.zahlKlein, { color: f.farbe }]}>
                          {f.frist!.tage < 0 ? '!' : f.frist!.tage}
                        </Text>
                        <Text style={styles.zahlBoxLabel}>Tage</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.zeileTyp} numberOfLines={1}>{f.brief.analyse.brieftyp}</Text>
                        <Text style={styles.zeileMeta} numberOfLines={1}>{f.brief.analyse.absender}</Text>
                        <View style={[styles.tag, { backgroundColor: f.hintergrund }]}>
                          <Text style={[styles.tagText, { color: f.farbe }]}>{f.stufenLabel}</Text>
                        </View>
                      </View>
                      <Ikone name="pfeilRechts" groesse={16} farbe={farben.textTertiaer} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Ohne Frist */}
            {infoBriefe.length > 0 && (
              <>
                <Text style={styles.abschnitt}>Ohne Frist · nur zur Kenntnis</Text>
                <View style={{ gap: abstand.s }}>
                  {infoBriefe.map((f) => (
                    <Pressable
                      key={f.brief.id}
                      onPress={() => oeffne(f.brief.id)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.infoZeile, pressed && { opacity: 0.7 }]}
                    >
                      <View style={[styles.punkt, { backgroundColor: f.farbe }]} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.zeileTyp} numberOfLines={1}>{f.brief.analyse.brieftyp}</Text>
                        <Text style={styles.zeileMeta} numberOfLines={1}>{f.brief.analyse.absender}</Text>
                      </View>
                      <Ikone name="pfeilRechts" groesse={16} farbe={farben.textTertiaer} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Datenschutz-Hinweis */}
        <View style={styles.schutz}>
          <Ikone name="schloss" groesse={16} farbe={farben.textSekundaer} />
          <Text style={styles.schutzText}>
            Ihre Briefe sind verschlüsselt und werden nur auf Ihrem Gerät
            ausgewertet. Nichts wird ohne Ihre Freigabe geteilt.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: abstand.m,
    marginBottom: abstand.m,
  },
  marke: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
  kopfKnopf: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: farben.flaeche,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: farben.primaer,
    fontWeight: '600',
    marginBottom: 4,
  },
  titel: { fontSize: schrift.riesig, fontWeight: '800', color: farben.text, marginBottom: 4 },
  unterTitel: { fontSize: schrift.klein, color: farben.textSekundaer, marginBottom: abstand.l },
  heldKarte: {
    borderRadius: 16,
    borderLeftWidth: 5,
    padding: abstand.l,
    marginBottom: abstand.l,
  },
  heldKopf: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  punkt: { width: 9, height: 9, borderRadius: 5 },
  heldKicker: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '700' },
  grosseZahl: { fontSize: 68, lineHeight: 68, fontWeight: '800', fontVariant: ['tabular-nums'] },
  zahlEinheit: { fontSize: 22, fontWeight: '700', lineHeight: 24 },
  zahlDatum: { fontSize: 13, color: farben.textSekundaer, marginTop: 2 },
  trenner: { height: 1, backgroundColor: farben.rand, marginVertical: 15 },
  briefTyp: { fontSize: schrift.gross, fontWeight: '700', color: farben.text, marginBottom: 3 },
  briefMeta: { fontSize: schrift.klein, color: farben.textSekundaer },
  abschnitt: {
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: farben.textSekundaer,
    fontWeight: '600',
    marginTop: abstand.l,
    marginBottom: abstand.s,
  },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: abstand.m,
    backgroundColor: farben.flaeche,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: abstand.m,
  },
  zahlBox: { width: 54, alignItems: 'center' },
  zahlKlein: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 32 },
  zahlBoxLabel: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textTertiaer },
  zeileTyp: { fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  zeileMeta: { fontSize: schrift.klein, color: farben.textSekundaer, marginTop: 2 },
  tag: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 3, marginTop: 7 },
  tagText: { fontSize: 11, fontWeight: '600' },
  infoZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: abstand.s,
    backgroundColor: farben.flaeche,
    borderRadius: 12,
    padding: abstand.m,
    minHeight: TOUCH_TARGET,
  },
  schutz: {
    flexDirection: 'row',
    gap: abstand.s,
    alignItems: 'flex-start',
    backgroundColor: farben.flaeche,
    borderRadius: 12,
    padding: abstand.m,
    marginTop: abstand.l,
  },
  schutzText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: farben.textSekundaer },
  leerBox: { alignItems: 'center', gap: abstand.s, marginTop: abstand.xl, marginBottom: abstand.l },
  leerTitel: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
  leerText: { fontSize: schrift.basis, color: farben.textSekundaer, textAlign: 'center', lineHeight: 26 },
});
