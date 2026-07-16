/**
 * Design-System: ruhig, vertrauenswürdig, barrierefrei.
 * - Große Schrift (Basis 18) für die Zielgruppe
 * - Hoher Kontrast (dunkles Blau auf Weiß, WCAG AA)
 * - Große Touch-Targets (min. 56px Höhe)
 */
export const farben = {
  // Grundfarben — natives iOS-Vorbild: gruppierter System-Hintergrund,
  // Inhalte als weiße Karten ohne Rahmen und Schatten (wie Einstellungen/Health)
  hintergrund: '#F2F2F7',
  flaeche: '#FFFFFF',
  flaecheSekundaer: '#E9EDF3', // "graue Taste" nach Apple-Art (statt Umrandung)
  primaer: '#1A365D',      // dunkles, ruhiges Blau (Marken-Tint)
  primaerText: '#FFFFFF',
  text: '#1A202C',
  textSekundaer: '#4A5568',
  textTertiaer: '#AEAEB2',  // z. B. Chevrons (iOS systemGray2)
  rand: '#E2E2E7',
  // Dezente Hervorhebung für DIE Kernaussage (leichter Marken-Tint)
  hervorhebung: '#EDF2F9',
  hervorhebungRand: '#DCE5F1',

  // Dringlichkeits-Ampel (kräftig, gut unterscheidbar)
  ampelRot: '#C0392B',
  ampelGelb: '#B7791F',
  ampelGruen: '#276749',
  ampelRotHintergrund: '#FDECEA',
  ampelGelbHintergrund: '#FDF6E3',
  ampelGruenHintergrund: '#EAF6EE',

  fehler: '#C0392B',
};

export const schrift = {
  klein: 15,
  basis: 18,
  gross: 21,
  titel: 26,
  riesig: 32,
};

export const abstand = {
  xs: 6,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
};

/** Mindesthöhe für alle interaktiven Elemente (Barrierefreiheit). */
export const TOUCH_TARGET = 56;

/**
 * Bewusst leer: Nach Apple-Vorbild heben sich weiße Karten allein durch
 * den grauen System-Hintergrund ab — ohne Schatten und Rahmen.
 * (Als No-Op behalten, damit bestehende Spreads harmlos bleiben.)
 */
export const kartenSchatten = {} as const;
