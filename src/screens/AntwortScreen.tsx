/**
 * Antwort-Generator: Vorlage wählen -> KI-Entwurf -> frei bearbeiten ->
 * als PDF exportieren oder als Text teilen.
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { farben, schrift, abstand } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Antwort'>;

const ALLE_TYPEN: AntwortTyp[] = [
  'terminbestaetigung',
  'terminverschiebung',
  'widerspruch',
  'unterlagen_nachreichen',
  'rueckfrage',
];

export function AntwortScreen({ route }: Props) {
  const brief = useAppStore((s) => s.briefe.find((b) => b.id === route.params.briefId));
  const setzeAntwortEntwurf = useAppStore((s) => s.setzeAntwortEntwurf);

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

  // Vom Brief vorgeschlagene Vorlagen zuerst, Rest danach
  const optionen = [
    ...brief.analyse.antwort_optionen,
    ...ALLE_TYPEN.filter((t) => !brief.analyse.antwort_optionen.includes(t)),
  ];

  const erzeugen = async () => {
    if (!typ) return;
    setLaedt(true);
    try {
      const entwurf = await generiereAntwort(brief.analyse, typ, hinweise);
      setBetreff(entwurf.betreff);
      setText(entwurf.text);
      await setzeAntwortEntwurf(brief.id, { typ, ...entwurf });
    } catch (e) {
      Alert.alert(
        'Fehler',
        e instanceof ClaudeFehler ? e.message : 'Der Entwurf konnte nicht erstellt werden.'
      );
    } finally {
      setLaedt(false);
    }
  };

  /** Bearbeiteten Stand sichern (beim Export/Teilen automatisch). */
  const sichern = async () => {
    if (typ && text) {
      await setzeAntwortEntwurf(brief.id, { typ, betreff, text });
    }
  };

  const alsPdf = async () => {
    await sichern();
    try {
      // Einfaches, sauberes Brief-Layout für den Ausdruck
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
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Antwort als PDF',
        });
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: abstand.m }}>
        <Text style={styles.abschnittTitel}>1. Was möchten Sie antworten?</Text>
        <View style={styles.typListe}>
          {optionen.map((t) => (
            <GrossButton
              key={t}
              titel={
                ANTWORT_TYP_LABEL[t] +
                (brief.analyse.antwort_optionen.includes(t) ? '  ★' : '')
              }
              variante={typ === t ? 'primaer' : 'sekundaer'}
              onPress={() => setTyp(t)}
            />
          ))}
        </View>

        <Text style={styles.abschnittTitel}>2. Zusätzliche Angaben (optional)</Text>
        <TextInput
          style={styles.eingabe}
          placeholder="z. B. Wunschtermin, Grund der Verschiebung…"
          placeholderTextColor={farben.textSekundaer}
          value={hinweise}
          onChangeText={setHinweise}
          multiline
        />

        <GrossButton
          titel={text ? 'Neuen Entwurf erstellen' : 'Entwurf erstellen'}
          symbol="✨"
          onPress={erzeugen}
          deaktiviert={!typ}
          laedt={laedt}
        />

        {text !== '' && (
          <>
            <Text style={styles.abschnittTitel}>3. Entwurf prüfen und anpassen</Text>
            <Text style={styles.hinweis}>
              Ersetzen Sie die Platzhalter in [eckigen Klammern] durch Ihre Daten.
            </Text>
            <TextInput
              style={[styles.eingabe, styles.betreffEingabe]}
              value={betreff}
              onChangeText={setBetreff}
              accessibilityLabel="Betreff"
            />
            <TextInput
              style={[styles.eingabe, styles.textEingabe]}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Brieftext"
            />
            <View style={{ gap: abstand.s }}>
              <GrossButton titel="Als PDF exportieren" symbol="📄" onPress={alsPdf} />
              <GrossButton titel="Als Text teilen / kopieren" symbol="📤" variante="sekundaer" onPress={alsText} />
            </View>
          </>
        )}
        <View style={{ height: abstand.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: farben.hintergrund },
  zentriert: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  abschnittTitel: {
    fontSize: schrift.gross,
    fontWeight: '700',
    color: farben.primaer,
    marginTop: abstand.l,
    marginBottom: abstand.s,
  },
  typListe: { gap: abstand.s },
  eingabe: {
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: 12,
    padding: abstand.s,
    fontSize: schrift.basis,
    color: farben.text,
    backgroundColor: farben.hintergrund,
    minHeight: 56,
    marginBottom: abstand.m,
  },
  betreffEingabe: { fontWeight: '700' },
  textEingabe: { minHeight: 320, lineHeight: 26 },
  hinweis: { fontSize: schrift.klein, color: farben.textSekundaer, marginBottom: abstand.s },
  text: { fontSize: schrift.basis, color: farben.text },
});
