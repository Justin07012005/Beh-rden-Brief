/**
 * BehördenKlar — Behördenbriefe verstehen, übersetzen, beantworten.
 * Einstiegspunkt: Navigation + Initialisierung (Archiv, Benachrichtigungen).
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types';
import { useAppStore } from './src/store/useAppStore';
import { initialisiereBenachrichtigungen } from './src/services/erinnerungen';
import { AppSchutz } from './src/components/AppSchutz';
import { farben, schrift } from './src/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { AnalyseScreen } from './src/screens/AnalyseScreen';
import { AntwortScreen } from './src/screens/AntwortScreen';
import { GlossarScreen } from './src/screens/GlossarScreen';
import { EinstellungenScreen } from './src/screens/EinstellungenScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          headerTitleStyle: { fontSize: schrift.gross, fontWeight: '700' },
          headerBackTitle: 'Zurück',
          contentStyle: { backgroundColor: farben.hintergrund },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'BehördenKlar',
            headerLargeTitle: true,
            headerLargeTitleStyle: { color: farben.primaer },
          }}
        />
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
