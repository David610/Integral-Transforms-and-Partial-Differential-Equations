import { describe, expect, it } from 'vitest';
import {
  berechneCo2Kosten,
  stufenmodell,
  umlagefaehigeHeizkostenNachCo2,
} from './co2';

describe('stufenmodell CO2KostAufG', () => {
  it('Stufe 1 < 12 kg: Mieter trägt 100 %', () => {
    expect(stufenmodell(0)).toEqual({ vermieterProzent: 0, mieterProzent: 100 });
    expect(stufenmodell(11.99)).toEqual({ vermieterProzent: 0, mieterProzent: 100 });
  });

  it('Stufe 2 12–17 kg: Vermieter 10 %, Mieter 90 %', () => {
    expect(stufenmodell(12)).toEqual({ vermieterProzent: 10, mieterProzent: 90 });
    expect(stufenmodell(16.5)).toEqual({ vermieterProzent: 10, mieterProzent: 90 });
  });

  it('Stufe 6 32–37 kg: 50/50', () => {
    expect(stufenmodell(35)).toEqual({ vermieterProzent: 50, mieterProzent: 50 });
  });

  it('Stufe 10 >= 52 kg: Vermieter 95 %, Mieter 5 %', () => {
    expect(stufenmodell(52)).toEqual({ vermieterProzent: 95, mieterProzent: 5 });
    expect(stufenmodell(100)).toEqual({ vermieterProzent: 95, mieterProzent: 5 });
  });

  it('alle 10 Stufen liefern Summen = 100 %', () => {
    const samples = [5, 14, 19, 24, 29, 34, 39, 44, 49, 60];
    for (const s of samples) {
      const { vermieterProzent, mieterProzent } = stufenmodell(s);
      expect(vermieterProzent + mieterProzent).toBe(100);
    }
  });
});

describe('berechneCo2Kosten', () => {
  it('berechnet CO2-Kosten und Aufteilung korrekt', () => {
    // 100.000 kWh Erdgas, 0,201 kg/kWh, 35 kg/m²/a (Stufe 6 = 50/50), 60 €/t
    // Emission = 20.100 kg → 20,1 t × 60 € = 1206 €
    const r = berechneCo2Kosten(100_000, 0.201, 35, 60);
    expect(r.co2KostenGesamt).toBeCloseTo(1206, 2);
    expect(r.vermieterAnteilEuro).toBeCloseTo(603, 2);
    expect(r.mieterAnteilEuro).toBeCloseTo(603, 2);
  });

  it('Mieter trägt alles bei sehr effizientem Gebäude', () => {
    const r = berechneCo2Kosten(100_000, 0.201, 5, 60);
    expect(r.vermieterAnteilEuro).toBe(0);
    expect(r.mieterAnteilEuro).toBeCloseTo(r.co2KostenGesamt, 2);
  });
});

describe('umlagefaehigeHeizkostenNachCo2', () => {
  it('zieht den Vermieteranteil ab', () => {
    expect(umlagefaehigeHeizkostenNachCo2(10_000, 1500)).toBe(8500);
  });

  it('clampt auf 0', () => {
    expect(umlagefaehigeHeizkostenNachCo2(100, 5000)).toBe(0);
  });
});
