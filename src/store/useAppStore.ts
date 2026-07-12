/**
 * Globaler App-State (Zustand). Hält das Brief-Archiv im Speicher und
 * synchronisiert jede Änderung sofort nach AsyncStorage.
 */
import { create } from 'zustand';
import { BriefEintrag, Uebersetzung, AntwortTyp } from '../types';
import { ladeBriefe, speichereBriefe } from '../services/storage';

interface AppState {
  briefe: BriefEintrag[];
  geladen: boolean;

  /** Archiv beim App-Start aus AsyncStorage laden. */
  initialisiere: () => Promise<void>;
  addBrief: (brief: BriefEintrag) => Promise<void>;
  removeBrief: (id: string) => Promise<void>;
  /** Übersetzung in den Cache des Briefs schreiben. */
  setzeUebersetzung: (id: string, sprachCode: string, u: Uebersetzung) => Promise<void>;
  setzeAntwortEntwurf: (
    id: string,
    entwurf: { typ: AntwortTyp; betreff: string; text: string }
  ) => Promise<void>;
  leereAlles: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  briefe: [],
  geladen: false,

  initialisiere: async () => {
    const briefe = await ladeBriefe();
    set({ briefe, geladen: true });
  },

  addBrief: async (brief) => {
    const briefe = [brief, ...get().briefe]; // neueste zuerst
    set({ briefe });
    await speichereBriefe(briefe);
  },

  removeBrief: async (id) => {
    const briefe = get().briefe.filter((b) => b.id !== id);
    set({ briefe });
    await speichereBriefe(briefe);
  },

  setzeUebersetzung: async (id, sprachCode, u) => {
    const briefe = get().briefe.map((b) =>
      b.id === id
        ? { ...b, uebersetzungen: { ...b.uebersetzungen, [sprachCode]: u } }
        : b
    );
    set({ briefe });
    await speichereBriefe(briefe);
  },

  setzeAntwortEntwurf: async (id, entwurf) => {
    const briefe = get().briefe.map((b) =>
      b.id === id ? { ...b, antwortEntwurf: entwurf } : b
    );
    set({ briefe });
    await speichereBriefe(briefe);
  },

  leereAlles: () => set({ briefe: [] }),
}));

/** Einfache eindeutige ID ohne externe Abhängigkeit. */
export function neueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
