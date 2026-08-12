/**
 * Antwort-Assistent — 3-Schritte-Assistent nach dem Claude-Design-Entwurf:
 *   1. Antwort-Art wählen   2. Angaben ergänzen   3. Entwurf prüfen & exportieren
 *
 * Schritt 2 fragt je Antwort-Art gezielt die Punkte ab, ohne die kein
 * brauchbarer Brief entsteht (siehe data/antwortFelder.ts) — statt eines
 * Freitextfelds, bei dem der Nutzer raten muss, was die KI braucht.
 * Alle Eingaben und Änderungen am Entwurf werden laufend gesichert, damit
 * niemand seine Arbeit verliert, wenn er den Screen verlässt.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { Absender, AntwortTyp, ANTWORT_TYP_LABEL, RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { generiereAntwort } from '../services/antwort';
import { holeAbsender, speichereAbsender } from '../services/storage';
import { ClaudeFehler } from '../services/claudeClient';
import { felderFuer } from '../data/antwortFelder';
import { fehlendePflichtfelder, findePlatzhalter } from '../utils/antwortHelfer';
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

/** Verzögerung der automatischen Sicherung — nicht bei jedem Tastendruck ins Archiv schreiben. */
const SICHERN_VERZOEGERUNG_MS = 800;

export function AntwortScreen({ route }: Props) {
  const brief = useAppStore((s) => s.briefe.find((b) => b.id === route.params.briefId));
  const setzeAntwortEntwurf = useAppStore((s) => s.setzeAntwortEntwurf);
  const gespeichert = brief?.antwortEntwurf;

  const [schritt, setSchritt] = useState<1 | 2 | 3>(gespeichert?.text ? 3 : 1);
  const [typ, setTyp] = useState<AntwortTyp | null>(gespeichert?.typ ?? null);
  const [angaben, setAngaben] = useState<Record<string, string>>(gespeichert?.angaben ?? {});
  const [betreff, setBetreff] = useState(gespeichert?.betreff ?? '');
  const [text, setText] = useState(gespeichert?.text ?? '');
  const [laedt, setLaedt] = useState(false);
  const [absender, setAbsender] = useState<Absender>({ name: '', adresse: '' });

  const felder = useMemo(() => (typ ? felderFuer(typ) : []), [typ]);
  const fehlend = useMemo(() => fehlendePflichtfelder(felder, angaben), [felder, angaben]);
  const offenePlatzhalter = useMemo(() => findePlatzhalter(`${betreff}\n${text}`), [betreff, text]);

  // Hinterlegte Absenderdaten einmalig laden — sie ersetzen die Platzhalter
  // [Ihr Name]/[Ihre Adresse] im erzeugten Brief.
  useEffect(() => {
    let aktiv = true;
    void holeAbsender().then((a) => {
      if (aktiv && a) setAbsender(a);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  // Änderungen am fertigen Entwurf automatisch sichern. Ohne das gingen
  // manuelle Korrekturen verloren, sobald der Nutzer den Screen verlässt,
  // ohne vorher zu exportieren.
  useEffect(() => {
    if (!brief || schritt !== 3 || !typ || !text.trim()) return;
    if (gespeichert?.betreff === betreff && gespeichert?.text === text) return;
    const timer = setTimeout(() => {
      void setzeAntwortEntwurf(brief.id, { typ, betreff, text, angaben });
    }, SICHERN_VERZOEGERUNG_MS);
    return () => clearTimeout(timer);
  }, [brief, schritt, typ, betreff, text, angaben, gespeichert, setzeAntwortEntwurf]);

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
    // Bei einem Wechsel der Antwort-Art passen die alten Angaben nicht mehr —
    // gleiche Art heißt: der Nutzer setzt seine Eingaben fort.
    if (t !== typ) setAngaben({});
    setTyp(t);
    setSchritt(2);
  };

  const setzeAngabe = (id: string, wert: string) =>
    setAngaben((bisher) => ({ ...bisher, [id]: wert }));

  const erzeugen = async () => {
    if (!typ) return;
    setLaedt(true);
    try {
      await speichereAbsender(absender);
      const entwurf = await generiereAntwort(brief.analyse, typ, angaben, absender);
      setBetreff(entwurf.betreff);
      setText(entwurf.text);
      await setzeAntwortEntwurf(brief.id, { typ, ...entwurf, angaben });
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

  /** Vor dem Neu-Erzeugen warnen, wenn dabei ein bearbeiteter Entwurf verloren ginge. */
  const entwurfAnfordern = () => {
    if (!text.trim()) {
      void erzeugen();
      return;
    }
    Alert.alert(
      'Entwurf ersetzen?',
      'Der bisherige Entwurf wird durch einen neuen ersetzt. Ihre Änderungen daran gehen verloren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Neu erstellen', style: 'destructive', onPress: () => void erzeugen() },
      ]
    );
  };

  const sichern = async () => {
    if (typ && text) await setzeAntwortEntwurf(brief.id, { typ, betreff, text, angaben });
  };

  /** Export erst nach Hinweis auf noch nicht ersetzte Platzhalter. */
  const exportieren = async (versand: () => Promise<void>) => {
    await sichern();
    if (offenePlatzhalter.length === 0) {
      await versand();
      return;
    }
    Alert.alert(
      'Noch nicht ausgefüllt',
      `Diese Stellen stehen noch in eckigen Klammern:\n\n${offenePlatzhalter.join('\n')}\n\n` +
        'Die Behörde erwartet dort Ihre Angaben.',
      [
        { text: 'Zurück zum Bearbeiten', style: 'cancel' },
        { text: 'Trotzdem exportieren', onPress: () => void versand() },
      ]
    );
  };

  const alsPdf = async () => {
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
            <Text style={styles.unterTitel}>
              Nur das, was nicht schon im Brief steht. Den Rest übernimmt die App.
            </Text>

            {felder.map((feld) => (
              <View key={feld.id}>
                <Text style={styles.feldLabel}>
                  {feld.label}
                  {feld.pflicht && <Text style={styles.pflichtStern}> *</Text>}
                </Text>
                <TextInput
                  style={[styles.eingabe, feld.mehrzeilig && styles.mehrzeilig]}
                  placeholder={feld.platzhalter}
                  placeholderTextColor={farben.textTertiaer}
                  value={angaben[feld.id] ?? ''}
                  onChangeText={(w) => setzeAngabe(feld.id, w)}
                  multiline={feld.mehrzeilig}
                  textAlignVertical={feld.mehrzeilig ? 'top' : 'center'}
                  accessibilityLabel={feld.label}
                />
              </View>
            ))}

            {/* Absenderdaten: einmal eintragen, danach in jedem Brief automatisch */}
            <Text style={styles.abschnitt}>Ihre Absenderdaten</Text>
            <Text style={styles.feldLabel}>Ihr Name</Text>
            <TextInput
              style={styles.eingabe}
              placeholder="Vor- und Nachname"
              placeholderTextColor={farben.textTertiaer}
              value={absender.name}
              onChangeText={(name) => setAbsender((a) => ({ ...a, name }))}
              accessibilityLabel="Ihr Name"
            />
            <Text style={styles.feldLabel}>Ihre Anschrift</Text>
            <TextInput
              style={[styles.eingabe, styles.mehrzeilig]}
              placeholder={'Straße und Hausnummer\nPLZ Ort'}
              placeholderTextColor={farben.textTertiaer}
              value={absender.adresse}
              onChangeText={(adresse) => setAbsender((a) => ({ ...a, adresse }))}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Ihre Anschrift"
            />

            <View style={styles.infoBox}>
              <Ikone name="schloss" groesse={16} farbe={farben.primaerFuellung} />
              <Text style={styles.infoBoxText}>
                Ihre Absenderdaten bleiben verschlüsselt auf diesem Gerät und werden
                nicht an die KI übertragen — sie werden erst hier in den fertigen Brief
                eingesetzt. Einmal eintragen genügt.
              </Text>
            </View>

            {fehlend.length > 0 && (
              <Text style={styles.pflichtHinweis}>
                Bitte noch ausfüllen: {fehlend.map((f) => f.label).join(', ')}
              </Text>
            )}

            <View style={{ marginTop: abstand.m }}>
              <GrossButton
                titel="Entwurf erstellen"
                ikone="funken"
                onPress={entwurfAnfordern}
                laedt={laedt}
                deaktiviert={fehlend.length > 0}
              />
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
              {offenePlatzhalter.length > 0
                ? 'Prüfen Sie den Entwurf und ersetzen Sie die markierten Stellen durch Ihre Daten.'
                : 'Prüfen Sie den Entwurf — alle Angaben sind eingesetzt.'}
            </Text>

            {offenePlatzhalter.length > 0 && (
              <View style={styles.platzhalterBox}>
                <Ikone name="stift" groesse={16} farbe={farben.ampelGelb} />
                <Text style={styles.platzhalterText}>
                  Noch auszufüllen: {offenePlatzhalter.join(', ')}
                </Text>
              </View>
            )}

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
              <GrossButton titel="Als PDF exportieren" ikone="dokument" onPress={() => void exportieren(alsPdf)} />
              <GrossButton
                titel="Als Text teilen / kopieren"
                ikone="teilen"
                variante="sekundaer"
                onPress={() => void exportieren(alsText)}
              />
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
  abschnitt: {
    fontSize: schrift.basis, fontWeight: '700', color: farben.text,
    marginTop: abstand.l, paddingTop: abstand.m, borderTopWidth: 1, borderTopColor: farben.rand,
  },
  feldLabel: { fontSize: schrift.klein, color: farben.textSekundaer, fontWeight: '600', marginTop: abstand.s, marginBottom: 6 },
  pflichtStern: { color: farben.fehler },
  pflichtHinweis: { fontSize: schrift.klein, color: farben.fehler, marginTop: abstand.m, lineHeight: 21 },
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
  platzhalterBox: {
    flexDirection: 'row', gap: abstand.s, alignItems: 'flex-start',
    backgroundColor: farben.ampelGelbHintergrund, borderRadius: 12, padding: abstand.m, marginBottom: abstand.s,
  },
  platzhalterText: { flex: 1, fontSize: schrift.klein, color: farben.ampelGelb, lineHeight: 21, fontWeight: '600' },
  zurueck: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: abstand.m, paddingVertical: abstand.s },
  zurueckText: { fontSize: schrift.klein, color: farben.primaerFuellung, fontWeight: '600' },
});
