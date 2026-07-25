/**
 * Design-System: ruhig, vertrauenswürdig, barrierefrei.
 * - Große Schrift (Basis 18) für die Zielgruppe
 * - Hoher Kontrast (dunkles Blau auf Weiß, WCAG AA)
 * - Große Touch-Targets (min. 56px Höhe)
 */
export const farben = {
  // Warme, ruhige Palette nach dem Claude-Design-Entwurf ("Postklar/Classical")
  // und passend zur Website: Papier-Beige, Gold-Akzent, dunkle Tinte.
  // Gut lesbar (hoher Kontrast bei Fließtext), nur die Schrift bleibt
  // die klare System-Schrift statt der dünnen Serifenschrift.
  hintergrund: '#F1EFE9',      // warmes Off-White (Grund)
  flaeche: '#FBFAF6',          // warme, fast weiße Karten
  flaecheSekundaer: '#EAE7E0', // gedämpfte Fläche (graue Taste)
  primaer: '#B68235',          // Gold-Akzent (Icons, aktive Tabs, Rahmen, Punkte)
  primaerFuellung: '#7D5411',  // dunkles Bronze — Hintergrund gefüllter Buttons (weiße Schrift lesbar)
  primaerText: '#FBF7EF',      // warmes Weiß (Text auf gefüllten Buttons)
  text: '#201F1D',             // dunkle Tinte
  textSekundaer: '#6B675E',    // warmes Grau (wie --grau der Website)
  textTertiaer: '#A8A29A',     // helles warmes Grau (Chevrons)
  rand: '#E2DED6',             // warme Trennlinie
  // Dezente Gold-Hervorhebung (z. B. aktive Filter-Chips)
  hervorhebung: '#F7EFE0',
  hervorhebungRand: '#E9D8BC',

  // Dringlichkeits-Ampel in den warmen Design-Tönen — als Text auf hellem
  // Tint gut lesbar (WCAG): Backstein-Rot, Bronze-Gold, Salbei-Grün.
  ampelRot: '#A23B2B',
  ampelGelb: '#8A5E14',
  ampelGruen: '#3F5A4C',
  ampelRotHintergrund: '#F5E9E5',
  ampelGelbHintergrund: '#F5EEDF',
  ampelGruenHintergrund: '#E8EFEA',

  fehler: '#A23B2B',
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
