import { describe, expect, it } from 'vitest';
import { erstelleAbrechnung } from './abrechnung';
import type {
  Abrechnungszeitraum,
  Co2Konfiguration,
  Einheit,
  Gebaeude,
  HeizkostenKonfiguration,
  Kostenposition,
} from './types';

function setup() {
  const gebaeude: Gebaeude = {
    id: 'g1',
    adresse: 'Beispielweg 1',
    gesamtwohnflaeche: 200,
    anzahlEinheiten: 2,
    gesamtPersonen: 4,
  };

  const einheiten: Einheit[] = [
    {
      id: 'a',
      lage: 'EG',
      wohnflaeche: 100,
      personen: 2,
      mietbeginn: '2020-01-01',
      vorauszahlungJahr: 600,
      verbrauchWaerme: 4000,
      verbrauchWasser: 30,
    },
    {
      id: 'b',
      lage: 'OG',
      wohnflaeche: 100,
      personen: 2,
      mietbeginn: '2020-01-01',
      vorauszahlungJahr: 600,
      verbrauchWaerme: 6000,
      verbrauchWasser: 70,
    },
  ];

  const kostenpositionen: Kostenposition[] = [
    {
      id: 'k1',
      bezeichnung: 'Grundsteuer',
      betrag: 1000,
      betrKvNr: 1,
      umlageschluessel: 'flaeche',
      istHeizkosten: false,
      umlagefaehig: true,
    },
    {
      id: 'k2',
      bezeichnung: 'Wasser/Abwasser',
      betrag: 1000,
      betrKvNr: 2,
      umlageschluessel: 'verbrauch',
      istHeizkosten: false,
      umlagefaehig: true,
    },
    {
      id: 'k3',
      bezeichnung: 'Heizung',
      betrag: 2000,
      betrKvNr: 4,
      umlageschluessel: 'verbrauch',
      istHeizkosten: true,
      umlagefaehig: true,
    },
    {
      id: 'kv',
      bezeichnung: 'Verwaltung',
      betrag: 500,
      betrKvNr: 0,
      umlageschluessel: 'flaeche',
      istHeizkosten: false,
      umlagefaehig: false,
    },
  ];

  const zeitraum: Abrechnungszeitraum = { von: '2025-01-01', bis: '2025-12-31' };
  const heizkostenConfig: HeizkostenKonfiguration = { verbrauchsquote: 0.7 };
  const co2Config: Co2Konfiguration = { spezifischerAusstoss: 5, preisProTonne: 60 };

  return { gebaeude, einheiten, kostenpositionen, zeitraum, heizkostenConfig, co2Config };
}

function summeMieter(ergebnis: ReturnType<typeof erstelleAbrechnung>): number {
  return ergebnis.mieter.reduce((sum, m) => sum + m.summeKosten, 0);
}

function summeKosten(input: ReturnType<typeof setup>): number {
  return input.kostenpositionen.reduce((sum, k) => sum + k.betrag, 0);
}

describe('erstelleAbrechnung', () => {
  it('liefert je Einheit eine Abrechnung', () => {
    const r = erstelleAbrechnung(setup());
    expect(r.mieter).toHaveLength(2);
  });

  it('verteilt Grundsteuer nach Fläche (50/50)', () => {
    const r = erstelleAbrechnung(setup());
    const grundsteuerA = r.mieter[0].einzelpositionen.find(
      (p) => p.bezeichnung === 'Grundsteuer',
    );
    expect(grundsteuerA?.betrag).toBeCloseTo(500, 2);
  });

  it('verteilt Wasser nach Verbrauch (30/70)', () => {
    const r = erstelleAbrechnung(setup());
    const wasserA = r.mieter[0].einzelpositionen.find(
      (p) => p.bezeichnung === 'Wasser/Abwasser',
    );
    const wasserB = r.mieter[1].einzelpositionen.find(
      (p) => p.bezeichnung === 'Wasser/Abwasser',
    );
    expect(wasserA?.betrag).toBeCloseTo(300, 2);
    expect(wasserB?.betrag).toBeCloseTo(700, 2);
  });

  it('ignoriert nicht umlagefähige Positionen', () => {
    const r = erstelleAbrechnung(setup());
    for (const m of r.mieter) {
      expect(m.einzelpositionen.find((p) => p.bezeichnung === 'Verwaltung')).toBeUndefined();
    }
  });

  it('berechnet Saldo = Kosten - Vorauszahlung', () => {
    const r = erstelleAbrechnung(setup());
    for (const m of r.mieter) {
      expect(m.saldo).toBeCloseTo(m.summeKosten - m.vorauszahlung, 2);
    }
  });

  it('Heizkosten 70/30: Einheit A erhält Grundkostenanteil nach Fläche und Verbrauchsanteil nach Wärme', () => {
    const r = erstelleAbrechnung(setup());
    // Gesamtwärme = 10.000 → A hat 40 %, B 60 %
    // Heizkosten 2000 €, Grundkosten 30 % = 600, Verbrauchskosten 70 % = 1400
    // A: 600*0,5 + 1400*0,4 = 300 + 560 = 860 (vor CO2)
    // bei spez. Ausstoss 5 (Stufe 1) ist Vermieteranteil 0 → keine Korrektur
    const heizA = r.mieter[0].einzelpositionen.find((p) => p.bezeichnung === 'Heizung');
    expect(heizA?.betrag).toBeCloseTo(860, 2);
  });

  it('Leerstand: Einheit wird als leerstehend markiert und Eigentümer trägt Kosten', () => {
    const input = setup();
    input.einheiten[1] = { ...input.einheiten[1], mietende: '2024-06-30' };
    const r = erstelleAbrechnung(input);
    expect(r.mieter[1].hatLeerstand).toBe(true);
    expect(r.mieter[1].summeKosten).toBe(0);
    expect(r.vermieterAnteil).toBeGreaterThan(0);
  });

  it('CO2-Vermieteranteil bei ineffizientem Gebäude reduziert Heizkostenposten', () => {
    const input = setup();
    input.co2Config.spezifischerAusstoss = 60; // Stufe 10 → Vermieter 95 %
    const r = erstelleAbrechnung(input);
    const refInput = setup();
    refInput.co2Config.spezifischerAusstoss = 5; // Stufe 1 → Vermieter 0 %
    const refR = erstelleAbrechnung(refInput);

    const heizA = r.mieter[0].einzelpositionen.find((p) => p.bezeichnung === 'Heizung');
    const refHeizA = refR.mieter[0].einzelpositionen.find((p) => p.bezeichnung === 'Heizung');
    expect(heizA!.betrag).toBeLessThan(refHeizA!.betrag);
  });

  it('rechnet Auszug im laufenden Jahr tagegenau ab', () => {
    const input = setup();
    input.einheiten[1] = { ...input.einheiten[1], mietende: '2025-06-30' };
    const r = erstelleAbrechnung(input);
    const grundsteuerB = r.mieter[1].einzelpositionen.find(
      (p) => p.bezeichnung === 'Grundsteuer',
    );

    expect(r.mieter[1].hatLeerstand).toBe(true);
    expect(r.mieter[1].belegungsquote).toBeCloseTo(181 / 365, 6);
    expect(grundsteuerB?.betrag).toBeCloseTo(500 * (181 / 365), 2);
    expect(grundsteuerB?.vermieterAnteil).toBeCloseTo(500 * (184 / 365), 2);
  });

  it('rechnet Einzug nach Periodenende voll dem Vermieter zu', () => {
    const input = setup();
    input.einheiten[1] = { ...input.einheiten[1], mietbeginn: '2026-01-01' };
    const r = erstelleAbrechnung(input);

    expect(r.mieter[1].belegungsquote).toBe(0);
    expect(r.mieter[1].summeKosten).toBe(0);
    expect(r.mieter[1].vorauszahlung).toBe(0);
    expect(r.mieter[1].vermieterAnteil).toBeGreaterThan(0);
  });

  it('belastet Leerstandsverbrauch nicht den aktiven Mieter', () => {
    const input = setup();
    input.einheiten[1] = { ...input.einheiten[1], mietende: '2024-12-31' };
    const r = erstelleAbrechnung(input);
    const wasserA = r.mieter[0].einzelpositionen.find(
      (p) => p.bezeichnung === 'Wasser/Abwasser',
    );

    expect(wasserA?.betrag).toBeCloseTo(300, 2);
    expect(r.mieter[1].vermieterAnteil).toBeGreaterThan(700);
  });

  it('wendet HeizkostenV-Kuerzung an, wenn kein Waermeverbrauch erfasst ist', () => {
    const input = setup();
    input.einheiten = input.einheiten.map((e) => ({ ...e, verbrauchWaerme: 0 }));
    const r = erstelleAbrechnung(input);
    const heizA = r.mieter[0].einzelpositionen.find((p) => p.bezeichnung === 'Heizung');

    expect(heizA?.betrag).toBeCloseTo(850, 2);
    expect(heizA?.vermieterAnteil).toBeCloseTo(150, 2);
    expect(heizA?.hinweis).toContain('15 % Kuerzung');
  });

  it('ordnet bei komplettem Leerstand alle Kosten genau einmal dem Vermieter zu', () => {
    const input = setup();
    input.einheiten = input.einheiten.map((e) => ({ ...e, mietende: '2024-12-31' }));
    const r = erstelleAbrechnung(input);

    expect(summeMieter(r)).toBe(0);
    expect(r.vermieterAnteil).toBeCloseTo(summeKosten(input), 2);
  });

  it('erhaelt Kostenkonservation inklusive CO2-Korrektur', () => {
    const input = setup();
    input.co2Config.spezifischerAusstoss = 60;
    const r = erstelleAbrechnung(input);

    expect(summeMieter(r) + r.vermieterAnteil).toBeCloseTo(summeKosten(input), 2);
  });
});
