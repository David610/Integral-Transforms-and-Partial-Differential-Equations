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
    },
  ),
);

/** Selector: aktuelle Abrechnung berechnen */
export function selectAbrechnung(s: AppState): AbrechnungsErgebnis {
  return erstelleAbrechnung({
    gebaeude: s.gebaeude,
    einheiten: s.einheiten,
    kostenpositionen: s.kostenpositionen,
    zeitraum: s.zeitraum,
    heizkostenConfig: s.heizkostenConfig,
    co2Config: s.co2Config,
  });
}
