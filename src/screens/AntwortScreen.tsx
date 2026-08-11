/**
 * Antwort-Assistent — 3-Schritte-Assistent nach dem Claude-Design-Entwurf:
 *   1. Antwort-Art wählen   2. Angaben ergänzen   3. Entwurf prüfen & exportieren
 * Der KI-Entwurf (generiereAntwort) bleibt das Herzstück; nur die Führung ist
 * jetzt klar in Schritte gegliedert, mit Fortschrittsbalken.
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AntwortTyp, ANTWORT_TYP_LABEL, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { generiereAntwort } from '../services/antwort';
import { ClaudeFehler } from '../services/claudeClient';
import { GrossButton } from '../components/GrossButton';
import { Ikone, IkonenName } from '../components/Ikone';
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Antwort'>;

const ALLE_TYPEN: AntwortTyp[] = [
  'terminbestaetigung',
  'terminverschiebung',
  'widerspruch',
  'unterlagen_nachreichen',
  'rueckfrage',
];

const TYP_INFO: Record<AntwortTyp, { ikone: IkonenName; beschreibung: string }> = {
  terminbestaetigung: { ikone: 'checkAn', beschreibung: 'Sie bestätigen, dass Sie zum Termin kommen.' },
  terminverschiebung: { ikone: 'kalender', beschreibung: 'Sie bitten um einen neuen Termin.' },
  widerspruch: { ikone: 'warnung', beschreibung: 'Sie sind nicht einverstanden und legen Einspruch ein.' },
  unterlagen_nachreichen: { ikone: 'dokument', beschreibung: 'Sie reichen die geforderten Unterlagen ein.' },
  rueckfrage: { ikone: 'info', beschreibung: 'Sie haben eine Frage zum Brief.' },
};

export function AntwortScreen({ route }: Props) {
  const brief = useAppStore((s) => s.briefe.find((b) => b.id === route.params.briefId));
  const setzeAntwortEntwurf = useAppStore((s) => s.setzeAntwortEntwurf);

  const [schritt, setSchritt] = useState<1 | 2 | 3>(brief?.antwortEntwurf?.text ? 3 : 1);
  const [typ, setTyp] = useState<AntwortTyp | null>(brief?.antwortEntwurf?.typ ?? null);
  const [hinweise, setHinweise] = useState('');
  const [betreff, setBetreff] = useState(brief?.antwortEntwurf?.betreff ?? '');
  const [text, setText] = useState(brief?.antwortEntwurf?.text ?? '');
  const [laedt, setLaedt] = useState(false);

  if (!brief) {
    return (
      <View style={styles.zentriert}>
        <Text style={styles.text}>Brief nicht gefunden.</Text>
      </View>
    );
  }

  const optionen = [
    ...brief.analyse.antwort_optionen,
    ...ALLE_TYPEN.filter((t) => !brief.analyse.antwort_optionen.includes(t)),
  ];

  const typWaehlen = (t: AntwortTyp) => {
    setTyp(t);
    setSchritt(2);
  };

  const erzeugen = async () => {
    if (!typ) return;
    setLaedt(true);
    try {
      const entwurf = await generiereAntwort(brief.analyse, typ, hinweise);
      setBetreff(entwurf.betreff);
      setText(entwurf.text);
      await setzeAntwortEntwurf(brief.id, { typ, ...entwurf });
      setSchritt(3);
    } catch (e) {
      Alert.alert(
        'Fehler',
        e instanceof ClaudeFehler ? e.message : 'Der Entwurf konnte nicht erstellt werden.'
      );
    } finally {
      setLaedt(false);
    }
  };

  const sichern = async () => {
    if (typ && text) await setzeAntwortEntwurf(brief.id, { typ, betreff, text });
  };

  const alsPdf = async () => {
    await sichern();
    try {
      const html = `
        <html><head><meta charset="utf-8"><style>
          body { font-family: Helvetica, Arial, sans-serif; font-size: 12pt; margin: 2.5cm; color: #111; }
          .betreff { font-weight: bold; margin: 24pt 0 16pt 0; }
          .text { white-space: pre-wrap; line-height: 1.5; }
        </style></head><body>
          <div class="betreff">${escapeHtml(betreff)}</div>
          <div class="text">${escapeHtml(text)}</div>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Antwort als PDF' });
      }
    } catch {
      Alert.alert('Fehler', 'Das PDF konnte nicht erstellt werden.');
    }
  };

  const alsText = async () => {
    await sichern();
    await Share.share({ message: `${betreff}\n\n${text}` });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: abstand.m, paddingBottom: abstand.xl }}>
        {/* Fortschritt */}
        <Text style={styles.schrittLabel}>Schritt {schritt} von 3</Text>
        <View style={styles.fortschritt}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={[styles.balken, { backgroundColor: n <= schritt ? farben.primaer : farben.rand }]}
            />
          ))}
        </View>

        {/* ── Schritt 1: Art wählen ── */}
        {schritt === 1 && (
          <View>
            <Text style={styles.titel}>Welche Antwort brauchen Sie?</Text>
            <Text style={styles.unterTitel}>
              Für {brief.analyse.brieftyp} von {brief.analyse.absender}.
            </Text>
            <View style={{ gap: abstand.s, marginTop: abstand.s }}>
              {optionen.map((t) => {
                const empfohlen = brief.analyse.antwort_optionen.includes(t);
                return (
                  <Pressable
                    key={t}
                    onPress={() => typWaehlen(t)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.typKarte, pressed && { opacity: 0.7 }]}
                  >
                    <View style={styles.typIkone}>
                      <Ikone name={TYP_INFO[t].ikone} groesse={22} farbe={farben.primaer} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.typTitel}>{ANTWORT_TYP_LABEL[t]}</Text>
                        {empfohlen && (
                          <View style={styles.empfohlenTag}>
                            <Text style={styles.empfohlenText}>Empfohlen</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.typBeschreibung}>{TYP_INFO[t].beschreibung}</Text>
                    </View>
                    <Ikone name="pfeilRechts" groesse={16} farbe={farben.textTertiaer} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Schritt 2: Angaben ── */}
        {schritt === 2 && typ && (
          <View>
            <View style={styles.wahlPill}>
              <Ikone name={TYP_INFO[typ].ikone} groesse={15} farbe={farben.primaerFuellung} />
              <Text style={styles.wahlPillText}>{ANTWORT_TYP_LABEL[typ]}</Text>
            </View>
            <Text style={styles.titel}>Angaben ergänzen</Text>
            <Text style={styles.feldLabel}>Zusätzliche Angaben (optional)</Text>
            <TextInput
              style={[styles.eingabe, styles.mehrzeilig]}
              placeholder="z. B. Wunschtermin, Grund der Verschiebung, was Sie beilegen…"
              placeholderTextColor={farben.textTertiaer}
              value={hinweise}
              onChangeText={setHinweise}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.infoBox}>
              <Ikone name="funken" groesse={16} farbe={farben.primaerFuellung} />
              <Text style={styles.infoBoxText}>
                Aktenzeichen, Behörde und die Angaben aus dem Brief übernimmt die App
                automatisch — Sie müssen nichts abtippen.
              </Text>
            </View>
            <View style={{ marginTop: abstand.m }}>
              <GrossButton titel="Entwurf erstellen" ikone="funken" onPress={erzeugen} laedt={laedt} />
            </View>
            <Pressable onPress={() => setSchritt(1)} style={styles.zurueck} accessibilityRole="button">
              <Ikone name="pfeilLinks" groesse={14} farbe={farben.primaerFuellung} />
              <Text style={styles.zurueckText}>Andere Antwort wählen</Text>
            </Pressable>
          </View>
        )}

        {/* ── Schritt 3: Entwurf ── */}
        {schritt === 3 && (
          <View>
            <Text style={styles.titel}>Ihr Schreiben ist fertig</Text>
            <Text style={styles.unterTitel}>
              Prüfen Sie den Entwurf und ersetzen Sie die Platzhalter in [eckigen
              Klammern] durch Ihre Daten.
            </Text>
            <Text style={styles.feldLabel}>Betreff</Text>
            <TextInput
              style={[styles.eingabe, { fontWeight: '700' }]}
              value={betreff}
              onChangeText={setBetreff}
              accessibilityLabel="Betreff"
            />
            <Text style={styles.feldLabel}>Schreiben</Text>
            <TextInput
              style={[styles.eingabe, styles.briefText]}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Brieftext"
            />
            <View style={{ gap: abstand.s, marginTop: abstand.s }}>
              <GrossButton titel="Als PDF exportieren" ikone="dokument" onPress={alsPdf} />
              <GrossButton titel="Als Text teilen / kopieren" ikone="teilen" variante="sekundaer" onPress={alsText} />
            </View>
            <Pressable onPress={() => setSchritt(2)} style={styles.zurueck} accessibilityRole="button">
              <Ikone name="pfeilLinks" groesse={14} farbe={farben.primaerFuellung} />
              <Text style={styles.zurueckText}>Angaben ändern & neu erstellen</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  zentriert: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: schrift.basis, color: farben.text },

  schrittLabel: { fontSize: schrift.klein, color: farben.textSekundaer, fontWeight: '600', marginBottom: abstand.xs },
  fortschritt: { flexDirection: 'row', gap: 6, marginBottom: abstand.l },
  balken: { flex: 1, height: 5, borderRadius: 3 },

  titel: { fontSize: schrift.titel, fontWeight: '800', color: farben.text, marginBottom: 4 },
  unterTitel: { fontSize: schrift.klein, color: farben.textSekundaer, lineHeight: 22, marginBottom: abstand.s },

  // Schritt 1 — Karten
  typKarte: {
    flexDirection: 'row', alignItems: 'center', gap: abstand.s,
    backgroundColor: farben.flaeche, borderRadius: 14, padding: abstand.m,
  },
  typIkone: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: farben.primaer,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  typTitel: { fontSize: schrift.basis, fontWeight: '700', color: farben.text },
  typBeschreibung: { fontSize: schrift.klein, color: farben.textSekundaer, marginTop: 2, lineHeight: 20 },
  empfohlenTag: { backgroundColor: farben.hervorhebung, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  empfohlenText: { fontSize: 11, fontWeight: '700', color: farben.primaerFuellung },

  // Schritt 2/3
  wahlPill: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: farben.primaer, borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: abstand.m,
  },
  wahlPillText: { fontSize: schrift.klein, color: farben.primaerFuellung, fontWeight: '600' },
  feldLabel: { fontSize: schrift.klein, color: farben.textSekundaer, fontWeight: '600', marginTop: abstand.s, marginBottom: 6 },
  eingabe: {
    borderWidth: 1, borderColor: farben.rand, borderRadius: 12, padding: abstand.s,
    fontSize: schrift.basis, color: farben.text, backgroundColor: farben.flaeche, minHeight: 52,
  },
  mehrzeilig: { minHeight: 110 },
  briefText: { minHeight: 300, lineHeight: 26 },
  infoBox: {
    flexDirection: 'row', gap: abstand.s, alignItems: 'flex-start',
    backgroundColor: farben.hervorhebung, borderRadius: 12, padding: abstand.m, marginTop: abstand.m,
  },
  infoBoxText: { flex: 1, fontSize: schrift.klein, color: farben.text, lineHeight: 21 },
  zurueck: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: abstand.m, paddingVertical: abstand.s },
  zurueckText: { fontSize: schrift.klein, color: farben.primaerFuellung, fontWeight: '600' },
});
