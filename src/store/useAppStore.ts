/**
 * Zustand-Store mit localStorage-Persistenz.
 *
 * Hält Stammdaten, Kosten und Konfiguration. Die Berechnung der Abrechnung
 * passiert NICHT im Store, sondern als Selector über erstelleAbrechnung().
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { erstelleAbrechnung } from '@/domain/abrechnung';
import type {
  Abrechnungszeitraum,
  AbrechnungsErgebnis,
  Co2Konfiguration,
  Einheit,
  Gebaeude,
  HeizkostenKonfiguration,
  Kostenposition,
} from '@/domain/types';
import {
  seedCo2,
  seedEinheiten,
  seedGebaeude,
  seedHeizkosten,
  seedKosten,
  seedZeitraum,
} from '@/data/seed';

interface AppState {
  gebaeude: Gebaeude;
  einheiten: Einheit[];
  kostenpositionen: Kostenposition[];
  zeitraum: Abrechnungszeitraum;
  heizkostenConfig: HeizkostenKonfiguration;
  co2Config: Co2Konfiguration;

  // Actions
  updateGebaeude: (patch: Partial<Gebaeude>) => void;
  upsertEinheit: (einheit: Einheit) => void;
  removeEinheit: (id: string) => void;
  upsertKosten: (kosten: Kostenposition) => void;
  removeKosten: (id: string) => void;
  updateZeitraum: (patch: Partial<Abrechnungszeitraum>) => void;
  updateHeizkosten: (patch: Partial<HeizkostenKonfiguration>) => void;
  updateCo2: (patch: Partial<Co2Konfiguration>) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      gebaeude: seedGebaeude,
      einheiten: seedEinheiten,
      kostenpositionen: seedKosten,
      zeitraum: seedZeitraum,
      heizkostenConfig: seedHeizkosten,
      co2Config: seedCo2,

      updateGebaeude: (patch) =>
        set((s) => ({ gebaeude: { ...s.gebaeude, ...patch } })),

      upsertEinheit: (einheit) =>
        set((s) => {
          const idx = s.einheiten.findIndex((e) => e.id === einheit.id);
          if (idx === -1) return { einheiten: [...s.einheiten, einheit] };
          const next = s.einheiten.slice();
          next[idx] = einheit;
          return { einheiten: next };
        }),

      removeEinheit: (id) =>
        set((s) => ({ einheiten: s.einheiten.filter((e) => e.id !== id) })),

      upsertKosten: (kosten) =>
        set((s) => {
          const idx = s.kostenpositionen.findIndex((k) => k.id === kosten.id);
          if (idx === -1) return { kostenpositionen: [...s.kostenpositionen, kosten] };
          const next = s.kostenpositionen.slice();
          next[idx] = kosten;
          return { kostenpositionen: next };
        }),

      removeKosten: (id) =>
        set((s) => ({ kostenpositionen: s.kostenpositionen.filter((k) => k.id !== id) })),

      updateZeitraum: (patch) =>
        set((s) => ({ zeitraum: { ...s.zeitraum, ...patch } })),

      updateHeizkosten: (patch) =>
        set((s) => ({ heizkostenConfig: { ...s.heizkostenConfig, ...patch } })),

      updateCo2: (patch) =>
        set((s) => ({ co2Config: { ...s.co2Config, ...patch } })),

      reset: () =>
        set({
          gebaeude: seedGebaeude,
          einheiten: seedEinheiten,
          kostenpositionen: seedKosten,
          zeitraum: seedZeitraum,
          heizkostenConfig: seedHeizkosten,
          co2Config: seedCo2,
        }),
    }),
    {
      name: 'nk-express-store-v1',
      version: 1,
      /**
       * Migriert persistierten State über Schema-Versionen hinweg. Ohne diese
       * Funktion würde älterer localStorage-Stand flach in die Defaults gemischt,
       * sodass neu hinzugekommene Felder `undefined` bleiben.
       */
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState> | undefined;
        if (!state) return state as unknown as AppState;
        if (version < 1) {
          // v0 -> v1: verbrauchsbasis auf Verbrauchspositionen ergänzen.
          const kostenpositionen = (state.kostenpositionen ?? []).map((k) => ({
            ...k,
            verbrauchsbasis: k.verbrauchsbasis ?? 'wasser',
          }));
          return { ...state, kostenpositionen } as AppState;
        }
        return state as AppState;
      },
    },
  ),
);

// Einfacher Single-Slot-Memo: hält die Referenz des Ergebnisses stabil, solange
// sich keine der Eingabe-Slices ändert. Das vermeidet unnötige Re-Renders (das
// Ergebnisobjekt wäre sonst bei jedem Aufruf neu) und Mehrfachberechnungen.
let abrechnungCache: { deps: readonly unknown[]; result: AbrechnungsErgebnis } | null = null;

/** Selector: aktuelle Abrechnung berechnen (memoisiert über die Eingabe-Slices) */
export function selectAbrechnung(s: AppState): AbrechnungsErgebnis {
  const deps = [
    s.gebaeude,
    s.einheiten,
    s.kostenpositionen,
    s.zeitraum,
    s.heizkostenConfig,
    s.co2Config,
  ] as const;

  if (abrechnungCache && abrechnungCache.deps.every((d, i) => d === deps[i])) {
    return abrechnungCache.result;
  }

  const result = erstelleAbrechnung({
    gebaeude: s.gebaeude,
    einheiten: s.einheiten,
    kostenpositionen: s.kostenpositionen,
    zeitraum: s.zeitraum,
    heizkostenConfig: s.heizkostenConfig,
    co2Config: s.co2Config,
  });
  abrechnungCache = { deps, result };
  return result;
}
