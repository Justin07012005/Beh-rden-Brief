/**
 * Low-Level-Client für die Claude API (Anthropic).
 *
 * Zwei Betriebsmodi:
 *  1. DEV (Standard): Direkter Aufruf der Anthropic-API mit dem API-Key aus
 *     expo-secure-store (Nutzer trägt ihn in den Einstellungen ein).
 *  2. PROD: PROXY_URL setzen — dann laufen alle Anfragen über den eigenen
 *     Server, der den API-Key hält. Endkunden brauchen dann keinen Key.
 *     Der Proxy muss denselben Request-Body akzeptieren und die
 *     Anthropic-Antwort unverändert durchreichen.
 *
 * Hinweis: Das offizielle @anthropic-ai/sdk unterstützt React Native nicht,
 * deshalb hier bewusst rohes fetch gegen die Messages API.
 */
import * as Network from 'expo-network';
import { holeApiKey, holeGeraeteId } from './storage';

/**
 * Für Produktion hier die URL des deployten Workers eintragen,
 * z. B. 'https://behoerdenklar-proxy.<account>.workers.dev'.
 * Setup-Anleitung: proxy/README.md
 */
const PROXY_URL: string | null =
  'https://behoerdenklar-proxy.behoerdenbrief.workers.dev';

/** true = Produktionsmodus über den Backend-Proxy (kein API-Key in der App nötig). */
export const NUTZT_PROXY = PROXY_URL !== null;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Modell-Split zur Kostenoptimierung:
 * - Brief-Analyse (Vision, Genauigkeit wichtig): Sonnet 5 (~2,5 Cent/Brief)
 * - Übersetzung & Antwort-Entwürfe (einfache Textaufgaben): Haiku 4.5 (~halber Preis)
 *
 * Hinweis: Der Backend-Proxy erlaubt nur diese Modelle (Whitelist in
 * proxy/src/index.ts) — bei Änderungen dort mitziehen.
 */
export const MODELL_ANALYSE = 'claude-sonnet-5';
export const MODELL_EINFACH = 'claude-haiku-4-5';

// ---- Typen für den Request-Body (Teilmenge der Messages API) ----

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
}

export interface DocumentBlock {
  type: 'document';
  source: { type: 'base64'; media_type: 'application/pdf'; data: string };
}

export type ContentBlock = TextBlock | ImageBlock | DocumentBlock;

export interface ClaudeRequest {
  /** Welches Modell: MODELL_ANALYSE (Vision) oder MODELL_EINFACH (Text). */
  modell: string;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string | ContentBlock[] }[];
  /** JSON-Schema für Structured Output — garantiert valides JSON in der Antwort. */
  schema?: object;
  maxTokens?: number;
}

/** Fehler mit nutzerfreundlicher deutscher Meldung. */
export class ClaudeFehler extends Error {
  constructor(meldung: string, public readonly technisch?: string) {
    super(meldung);
    this.name = 'ClaudeFehler';
  }
}

/**
 * Führt einen Claude-Aufruf aus und gibt das geparste JSON-Objekt zurück.
 * Nur für Aufrufe mit `schema` (Structured Output) gedacht — alle
 * BehördenKlar-Aufrufe nutzen Structured Output.
 */
export async function claudeJsonAufruf<T>(anfrage: ClaudeRequest): Promise<T> {
  // 1. Offline-Check mit klarer Meldung (Anforderung: Offline-Hinweis)
  const netz = await Network.getNetworkStateAsync();
  if (!netz.isConnected || netz.isInternetReachable === false) {
    throw new ClaudeFehler(
      'Keine Internetverbindung. Bitte verbinden Sie sich mit dem Internet und versuchen Sie es erneut.'
    );
  }

  // 2. Request-Body bauen
  const body: Record<string, unknown> = {
    model: anfrage.modell,
    max_tokens: anfrage.maxTokens ?? 16000,
    // Kein explizites thinking-Feld: Sonnet 5 denkt adaptiv von selbst
    // (gut für die Extraktions-Genauigkeit), Haiku 4.5 unterstützt den
    // adaptiven Modus nicht und würde die Anfrage ablehnen.
    messages: anfrage.messages,
  };
  if (anfrage.system) body.system = anfrage.system;
  if (anfrage.schema) {
    body.output_config = {
      format: { type: 'json_schema', schema: anfrage.schema },
    };
  }

  // 3. Endpunkt + Header je nach Modus
  let url = ANTHROPIC_URL;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  };
  if (PROXY_URL) {
    url = PROXY_URL; // Der Proxy hält den API-Key serverseitig
    // Anonyme ID, damit der Proxy das Tageslimit pro Gerät durchsetzen kann
    headers['x-geraete-id'] = await holeGeraeteId();
  } else {
    const apiKey = await holeApiKey();
    if (!apiKey) {
      throw new ClaudeFehler(
        'Kein API-Schlüssel hinterlegt. Bitte tragen Sie Ihren Anthropic-API-Schlüssel in den Einstellungen ein.'
      );
    }
    headers['x-api-key'] = apiKey;
  }

  // 4. Aufruf
  let antwort: Response;
  try {
    antwort = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ClaudeFehler(
      'Verbindung fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.',
      String(e)
    );
  }

  // 5. HTTP-Fehler in verständliche Meldungen übersetzen
  if (!antwort.ok) {
    let technisch = '';
    try {
      const fehlerJson = await antwort.json();
      technisch = fehlerJson?.error?.message ?? '';
    } catch {
      /* Fehler-Body war kein JSON */
    }
    switch (antwort.status) {
      case 401:
        throw new ClaudeFehler(
          'Der API-Schlüssel ist ungültig. Bitte in den Einstellungen prüfen.',
          technisch
        );
      case 429:
        // Direkt-Modus: API-Rate-Limit. Proxy-Modus: Tageslimit pro Gerät.
        throw new ClaudeFehler(
          PROXY_URL
            ? 'Das tägliche Kontingent ist aufgebraucht. Bitte versuchen Sie es morgen erneut.'
            : 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
          technisch
        );
      case 413:
        throw new ClaudeFehler(
          'Das Bild ist zu groß. Bitte fotografieren Sie den Brief erneut.',
          technisch
        );
      default:
        if (antwort.status >= 500) {
          throw new ClaudeFehler(
            'Der KI-Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.',
            technisch
          );
        }
        throw new ClaudeFehler(
          'Die Analyse ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
          `HTTP ${antwort.status}: ${technisch}`
        );
    }
  }

  const daten = await antwort.json();

  // 6. Stop-Reason prüfen (Sicherheits-Ablehnung / abgeschnittene Antwort)
  if (daten.stop_reason === 'refusal') {
    throw new ClaudeFehler(
      'Die KI konnte diesen Inhalt nicht verarbeiten. Bitte prüfen Sie, ob das Foto wirklich einen Behördenbrief zeigt.'
    );
  }
  if (daten.stop_reason === 'max_tokens') {
    throw new ClaudeFehler(
      'Der Brief ist sehr lang — die Analyse wurde abgeschnitten. Bitte fotografieren Sie ggf. nur die wichtigste Seite.'
    );
  }

  // 7. Structured Output: der letzte Text-Block enthält garantiert valides JSON
  //    (davor können Thinking-Blöcke stehen — deshalb nicht content[0] nehmen)
  const textBlock = [...(daten.content ?? [])]
    .reverse()
    .find((b: { type: string }) => b.type === 'text');
  if (!textBlock) {
    throw new ClaudeFehler('Die KI hat keine verwertbare Antwort geliefert.');
  }
  return JSON.parse(textBlock.text) as T;
}
