/**
 * BehördenKlar — Behördenbriefe verstehen, übersetzen, beantworten.
 * Einstiegspunkt: Navigation + Initialisierung (Archiv, Benachrichtigungen).
 *
 * Aufbau: untere Tab-Leiste (Fristen · Scannen · Archiv) mit darüber
 * liegenden Detail-Screens (Analyse, Antwort, Einstellungen …).
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HauptTabParamList, RootStackParamList } from './src/types';
import { useAppStore } from './src/store/useAppStore';
import { initialisiereBenachrichtigungen } from './src/services/erinnerungen';
import { holeConsent } from './src/services/storage';
import { AppSchutz } from './src/components/AppSchutz';
import { Ikone } from './src/components/Ikone';
import { farben, schrift } from './src/theme';
import { FristenScreen } from './src/screens/FristenScreen';
import { ArchivScreen } from './src/screens/ArchivScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { AnalyseScreen } from './src/screens/AnalyseScreen';
import { AntwortScreen } from './src/screens/AntwortScreen';
import { GlossarScreen } from './src/screens/GlossarScreen';
import { EinstellungenScreen } from './src/screens/EinstellungenScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HauptTabParamList>();

/** Platzhalter für den mittleren Scan-Tab — seine Taste öffnet den Scan-Flow,
 *  der Inhalt wird nie angezeigt (der Tab-Wechsel wird abgefangen). */
const LeererScreen = () => null;

/** Erhabener runder Scan-Knopf in der Mitte der Tab-Leiste. */
function ScanKnopf({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.scanWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Brief scannen"
        style={({ pressed }) => [styles.scanKnopf, pressed && { opacity: 0.85 }]}
      >
        <Ikone name="kamera" groesse={26} farbe={farben.primaerText} />
      </Pressable>
    </View>
  );
}

function HauptTabs() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const scanStarten = async () => {
    const ok = await holeConsent();
    navigation.navigate(ok ? 'Scan' : 'Consent');
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: farben.primaer,
        tabBarInactiveTintColor: farben.textTertiaer,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: farben.flaeche,
          borderTopColor: farben.rand,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tab.Screen
        name="Fristen"
        component={FristenScreen}
        options={{
          tabBarLabel: 'Fristen',
          tabBarIcon: ({ color }) => <Ikone name="uhr" groesse={23} farbe={color} />,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={LeererScreen}
        options={{ tabBarButton: () => <ScanKnopf onPress={scanStarten} /> }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen
        name="Archiv"
        component={ArchivScreen}
        options={{
          tabBarLabel: 'Archiv',
          tabBarIcon: ({ color }) => <Ikone name="archiv" groesse={23} farbe={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const initialisiere = useAppStore((s) => s.initialisiere);

  useEffect(() => {
    initialisiereBenachrichtigungen();
    initialisiere();
  }, [initialisiere]);

  return (
    <AppSchutz>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: farben.hintergrund },
            headerShadowVisible: false,
            headerTintColor: farben.primaer,
            headerTitleStyle: { fontSize: schrift.gross, fontWeight: '700', color: farben.text },
            headerBackTitle: 'Zurück',
            contentStyle: { backgroundColor: farben.hintergrund },
          }}
        >
          <Stack.Screen name="Tabs" component={HauptTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Consent" component={ConsentScreen} options={{ title: 'Datenschutz' }} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Brief scannen' }} />
          <Stack.Screen name="Analyse" component={AnalyseScreen} options={{ title: 'Ihr Brief erklärt' }} />
          <Stack.Screen name="Antwort" component={AntwortScreen} options={{ title: 'Antwort erstellen' }} />
          <Stack.Screen name="Glossar" component={GlossarScreen} options={{ title: 'Behörden-Glossar' }} />
          <Stack.Screen name="Einstellungen" component={EinstellungenScreen} options={{ title: 'Einstellungen' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppSchutz>
  );
}

const styles = StyleSheet.create({
  scanWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  scanKnopf: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -18,
    backgroundColor: farben.primaerFuellung,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: farben.flaeche,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});
