import { describe, expect, it } from 'vitest';
import { kuerzungsrechtAnwenden, verteileHeizkosten } from './heizkosten';
import type { Einheit, Gebaeude } from './types';

const gebaeude: Gebaeude = {
  id: 'g1',
  adresse: 'Teststraße 1',
  gesamtwohnflaeche: 1000,
  anzahlEinheiten: 10,
  gesamtPersonen: 20,
};

const einheit: Einheit = {
  id: 'e1',
  lage: 'EG links',
  wohnflaeche: 100, // 10 %
  personen: 2,
  mietbeginn: '2020-01-01',
  vorauszahlungJahr: 0,
  verbrauchWaerme: 1000, // 20 %
  verbrauchWasser: 50,
};

describe('verteileHeizkosten', () => {
  it('Default 70/30: korrekte Aufteilung', () => {
    // Gesamt 10.000 €, Verbrauchsquote 0,7
    // Grundkosten = 3000 €, davon 10 % = 300 €
    // Verbrauchskosten = 7000 €, davon 20 % = 1400 €
    const result = verteileHeizkosten(10_000, 0.7, einheit, gebaeude, 5000);
    expect(result.grundkostenAnteil).toBeCloseTo(300, 2);
    expect(result.verbrauchskostenAnteil).toBeCloseTo(1400, 2);
    expect(result.summe).toBeCloseTo(1700, 2);
  });

  it('50/50-Aufteilung', () => {
    const result = verteileHeizkosten(10_000, 0.5, einheit, gebaeude, 5000);
    expect(result.grundkostenAnteil).toBeCloseTo(500, 2); // 10 % von 5000
    expect(result.verbrauchskostenAnteil).toBeCloseTo(1000, 2); // 20 % von 5000
  });

  it('clampt Verbrauchsquote auf 0,5–0,7', () => {
    const niedrig = verteileHeizkosten(10_000, 0.2, einheit, gebaeude, 5000);
    const hoch = verteileHeizkosten(10_000, 0.9, einheit, gebaeude, 5000);
    const refLow = verteileHeizkosten(10_000, 0.5, einheit, gebaeude, 5000);
    const refHigh = verteileHeizkosten(10_000, 0.7, einheit, gebaeude, 5000);
    expect(niedrig.summe).toBeCloseTo(refLow.summe, 2);
    expect(hoch.summe).toBeCloseTo(refHigh.summe, 2);
  });

  it('Verbrauchssumme 0 -> Verbrauchsanteil 0', () => {
    const result = verteileHeizkosten(10_000, 0.7, einheit, gebaeude, 0);
    expect(result.verbrauchskostenAnteil).toBe(0);
    expect(result.grundkostenAnteil).toBeCloseTo(300, 2);
  });
});

describe('kuerzungsrechtAnwenden', () => {
  it('reduziert um 15 %', () => {
    expect(kuerzungsrechtAnwenden(1000)).toBeCloseTo(850, 2);
  });
});
