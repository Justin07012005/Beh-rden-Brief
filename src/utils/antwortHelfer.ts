/**
 * Reine Logik des Antwort-Assistenten — bewusst ohne React-Native-Importe,
 * damit sie unter Jest direkt testbar ist (der Screen bleibt reine Darstellung).
 */
import { AntwortFeld } from '../data/antwortFelder';
import { Absender } from '../types';

/**
 * Der Rechtsberatungs-Hinweis kommt laut System-Prompt selbst in eckigen
 * Klammern ("[Hinweis: …]"). Er ist fertiger Text, kein Feld zum Ausfüllen —
 * sonst würde die App vor dem Export fälschlich warnen.
 */
const HINWEIS_MUSTER = /^\[\s*hinweis\b/i;

/**
 * Findet die von der KI gesetzten Platzhalter ("[Ihr Name]"), die der Nutzer
 * vor dem Absenden noch ersetzen muss. Duplikate werden zusammengefasst,
 * die Reihenfolge des ersten Auftretens bleibt erhalten.
 */
export function findePlatzhalter(text: string): string[] {
  // Keine Zeilenumbrüche und max. 60 Zeichen: So bleibt "[…]" als Platzhalter
  // erkennbar, ohne dass ganze Absätze zwischen zwei Klammern zusammenfallen.
  const treffer = text.match(/\[[^[\]\n]{1,60}\]/g) ?? [];
  return [...new Set(treffer.filter((p) => !HINWEIS_MUSTER.test(p)))];
}

// Schreibweisen, die der System-Prompt für die Absender-Platzhalter vorgibt —
// tolerant genug, falls die KI "Name" statt "Ihr Name" schreibt.
const NAME_MUSTER = /\[\s*(?:ihr\s+)?name\s*\]/gi;
const ADRESSE_MUSTER = /\[\s*(?:ihre\s+)?(?:adresse|anschrift)\s*\]/gi;

/**
 * Setzt Name und Anschrift des Nutzers lokal in den fertigen Entwurf ein.
 *
 * Datenschutz: Diese Daten gehen bewusst NICHT an die KI. Sie schreibt
 * immer Platzhalter, die erst hier auf dem Gerät ersetzt werden — so
 * verlässt die Anschrift des Nutzers das Handy nie. Unbekannte Angaben
 * bleiben als Platzhalter stehen, damit die Prüfung vor dem Export greift.
 */
export function setzeAbsenderEin(text: string, absender: Absender | null): string {
  const name = absender?.name.trim() ?? '';
  const adresse = absender?.adresse.trim() ?? '';
  let ergebnis = text;
  // Ersatz als Funktion: Sonst würden "$&" o. Ä. in einer Adresse als
  // Ersetzungsmuster interpretiert.
  if (name) ergebnis = ergebnis.replace(NAME_MUSTER, () => name);
  if (adresse) ergebnis = ergebnis.replace(ADRESSE_MUSTER, () => adresse);
  return ergebnis;
}

/** Pflichtfelder, die der Nutzer noch nicht ausgefüllt hat. */
export function fehlendePflichtfelder(
  felder: AntwortFeld[],
  angaben: Record<string, string>
): AntwortFeld[] {
  return felder.filter((f) => f.pflicht && !(angaben[f.id] ?? '').trim());
}

/**
 * Baut aus den Nutzer-Angaben den Prompt-Block für die KI. Leere Felder
 * fallen weg, das "(optional)" im Label ebenfalls — es ist eine Anweisung
 * an den Nutzer, nicht an die KI.
 */
export function bauAngabenText(
  felder: AntwortFeld[],
  angaben: Record<string, string>
): string {
  const zeilen = felder
    .map((f) => ({ label: f.label.replace(/\s*\(optional\)\s*$/i, ''), wert: (angaben[f.id] ?? '').trim() }))
    .filter(({ wert }) => wert.length > 0)
    .map(({ label, wert }) => `- ${label} ${wert}`);
  return zeilen.length > 0 ? zeilen.join('\n') : 'keine';
}
