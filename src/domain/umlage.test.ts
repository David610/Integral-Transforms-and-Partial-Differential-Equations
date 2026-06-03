import { describe, expect, it } from 'vitest';
import {
  berechneAnteil,
  berechneBelegung,
  istAktiv,
  kostenEinheit,
  summeWaermeverbrauch,
  summeWasserverbrauch,
} from './umlage';
import type { Einheit, Gebaeude } from './types';

const gebaeude: Gebaeude = {
  id: 'g1',
  adresse: 'Teststraße 1',
  gesamtwohnflaeche: 1000,
  anzahlEinheiten: 10,
  gesamtPersonen: 20,
};

function einheit(overrides: Partial<Einheit> = {}): Einheit {
  return {
    id: 'e1',
    lage: 'EG links',
    wohnflaeche: 100,
    personen: 2,
    mietbeginn: '2020-01-01',
    vorauszahlungJahr: 0,
    verbrauchWaerme: 5000,
    verbrauchWasser: 50,
    ...overrides,
  };
}

describe('berechneAnteil', () => {
  it('flaeche: liefert Wohnflaechenanteil', () => {
    expect(berechneAnteil('flaeche', einheit({ wohnflaeche: 100 }), gebaeude, 0)).toBe(0.1);
  });

  it('einheiten: gleicher Anteil je Einheit', () => {
    expect(berechneAnteil('einheiten', einheit(), gebaeude, 0)).toBe(0.1);
  });

  it('personen: anteilig nach Personenzahl', () => {
    expect(berechneAnteil('personen', einheit({ personen: 4 }), gebaeude, 0)).toBe(0.2);
  });

  it('verbrauch: anteilig nach Wasserverbrauch', () => {
    expect(
      berechneAnteil('verbrauch', einheit({ verbrauchWasser: 50 }), gebaeude, 500),
    ).toBe(0.1);
  });

  it('liefert 0 wenn Bezugsgröße null ist', () => {
    const leerGebaeude: Gebaeude = { ...gebaeude, gesamtwohnflaeche: 0 };
    expect(berechneAnteil('flaeche', einheit(), leerGebaeude, 0)).toBe(0);
  });
});

describe('kostenEinheit', () => {
  it('multipliziert Gesamtkosten mit Anteil', () => {
    expect(kostenEinheit(1000, 0.1)).toBe(100);
    expect(kostenEinheit(0, 0.5)).toBe(0);
  });
});

describe('istAktiv', () => {
  it('Einheit ohne Mietende ist aktiv', () => {
    expect(istAktiv(einheit(), '2025-12-31')).toBe(true);
  });

  it('Einheit mit Mietende vor Periodenende ist nicht aktiv (Leerstand)', () => {
    expect(istAktiv(einheit({ mietende: '2024-06-30' }), '2025-12-31')).toBe(false);
  });

  it('Einheit mit Mietende nach Periodenende ist aktiv', () => {
    expect(istAktiv(einheit({ mietende: '2026-06-30' }), '2025-12-31')).toBe(true);
  });
});

describe('berechneBelegung', () => {
  const zeitraum = { von: '2025-01-01', bis: '2025-12-31' };

  it('erkennt ganzjaehrige Belegung', () => {
    const belegung = berechneBelegung(einheit(), zeitraum);
    expect(belegung.belegteTage).toBe(365);
    expect(belegung.belegungsquote).toBe(1);
    expect(belegung.hatLeerstand).toBe(false);
  });

  it('berechnet Einzug im laufenden Jahr tagegenau', () => {
    const belegung = berechneBelegung(einheit({ mietbeginn: '2025-07-01' }), zeitraum);
    expect(belegung.belegteTage).toBe(184);
    expect(belegung.belegungsquote).toBeCloseTo(184 / 365, 6);
    expect(belegung.hatLeerstand).toBe(true);
  });

  it('berechnet Auszug im laufenden Jahr tagegenau', () => {
    const belegung = berechneBelegung(einheit({ mietende: '2025-02-28' }), zeitraum);
    expect(belegung.belegteTage).toBe(59);
    expect(belegung.belegungsquote).toBeCloseTo(59 / 365, 6);
  });

  it('belegt vor oder nach dem Zeitraum nicht', () => {
    expect(berechneBelegung(einheit({ mietende: '2024-12-31' }), zeitraum).belegteTage).toBe(0);
    expect(berechneBelegung(einheit({ mietbeginn: '2026-01-01' }), zeitraum).belegteTage).toBe(0);
  });
});

describe('summeWasserverbrauch', () => {
  it('summiert den Verbrauch aller Einheiten als Hausdenominator', () => {
    const einheiten: Einheit[] = [
      einheit({ id: 'a', verbrauchWasser: 100 }),
      einheit({ id: 'b', verbrauchWasser: 200 }),
      einheit({ id: 'c', verbrauchWasser: 999, mietende: '2024-06-30' }),
    ];
    expect(summeWasserverbrauch(einheiten, '2025-12-31')).toBe(1299);
  });

  it('summiert den Waermeverbrauch aller Einheiten als Hausdenominator', () => {
    const einheiten: Einheit[] = [
      einheit({ id: 'a', verbrauchWaerme: 100 }),
      einheit({ id: 'b', verbrauchWaerme: 200 }),
      einheit({ id: 'c', verbrauchWaerme: 999, mietende: '2024-06-30' }),
    ];
    expect(summeWaermeverbrauch(einheiten, '2025-12-31')).toBe(1299);
  });
});
