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
  flaecheSekundaer: '#E9E9EB', // "graue Taste" nach Apple-Art (statt Umrandung)
  primaer: '#007AFF',      // Apple-System-Blau (Tint für Buttons, Icons, Links)
  primaerText: '#FFFFFF',
  text: '#1A202C',
  textSekundaer: '#4A5568',
  textTertiaer: '#AEAEB2',  // z. B. Chevrons (iOS systemGray2)
  rand: '#E2E2E7',
  // Dezente Hervorhebung für DIE Kernaussage (leichter Blau-Tint)
  hervorhebung: '#EAF3FF',
  hervorhebungRand: '#D4E6FB',

  // Dringlichkeits-Ampel: frische Signalfarben in Apples "zugänglichen"
  // Varianten — kräftig, aber als Text auf Weiß noch gut lesbar (WCAG)
  ampelRot: '#D70015',
  ampelGelb: '#C25400',
  ampelGruen: '#1E7E34',
  ampelRotHintergrund: '#FFEAE8',
  ampelGelbHintergrund: '#FFF1E0',
  ampelGruenHintergrund: '#E7F6EB',

  fehler: '#D70015',
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
