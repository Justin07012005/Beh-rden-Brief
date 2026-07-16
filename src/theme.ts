/**
 * Design-System: ruhig, vertrauenswürdig, barrierefrei.
 * - Große Schrift (Basis 18) für die Zielgruppe
 * - Hoher Kontrast (dunkles Blau auf Weiß, WCAG AA)
 * - Große Touch-Targets (min. 56px Höhe)
 */
export const farben = {
  // Grundfarben — warmer Papier-Ton als Markenzeichen (wie die Webseite):
  // Inhalte liegen als weiße "Blätter" auf Papier
  hintergrund: '#FAF7F0',
  flaeche: '#FFFFFF',
  primaer: '#1A365D',      // dunkles, ruhiges Blau
  primaerText: '#FFFFFF',
  text: '#1A202C',
  textSekundaer: '#4A5568',
  rand: '#E4DECF',
  // Akzent: Textmarker-Gelb (sparsam einsetzen — nur für DIE Kernaussage)
  markerHintergrund: '#FFF6D2',
  markerRand: '#EBDD9A',

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

/** Dezenter Schatten, damit weiße Karten sich vom Papier-Grund abheben. */
export const kartenSchatten = {
  shadowColor: '#1A202C',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 2,
} as const;
