/**
 * Orchestrierung: erzeugt aus Stammdaten, Kosten und Konfiguration je Einheit
 * eine MieterAbrechnung mit allen Einzelpositionen und dem Saldo.
 *
 * Reine Funktion – keine UI-, Storage- oder IO-Abhängigkeiten.
 */

import { berechneCo2Kosten, umlagefaehigeHeizkostenNachCo2 } from './co2';
import { verteileHeizkosten } from './heizkosten';
import {
  berechneAnteil,
  istAktiv,
  summeWaermeverbrauch,
  summeWasserverbrauch,
} from './umlage';
import type {
  Abrechnungszeitraum,
  AbrechnungEinzelposition,
  AbrechnungsErgebnis,
  Co2Konfiguration,
  Einheit,
  Gebaeude,
  HeizkostenKonfiguration,
  Kostenposition,
  MieterAbrechnung,
} from './types';

export interface AbrechnungInput {
  gebaeude: Gebaeude;
  einheiten: Einheit[];
  kostenpositionen: Kostenposition[];
  zeitraum: Abrechnungszeitraum;
  heizkostenConfig: HeizkostenKonfiguration;
  co2Config: Co2Konfiguration;
  /** Emissionsfaktor des Brennstoffs in kg CO2/kWh (Default Erdgas) */
  emissionsfaktor?: number;
}

const DEFAULT_EMISSIONSFAKTOR_ERDGAS = 0.201; // kg CO2 / kWh

export function erstelleAbrechnung(input: AbrechnungInput): AbrechnungsErgebnis {
  const {
    gebaeude,
    einheiten,
    kostenpositionen,
    zeitraum,
    heizkostenConfig,
    co2Config,
    emissionsfaktor = DEFAULT_EMISSIONSFAKTOR_ERDGAS,
  } = input;

  const periodeEnde = zeitraum.bis;
  const wasserSumme = summeWasserverbrauch(einheiten, periodeEnde);
  const waermeSumme = summeWaermeverbrauch(einheiten, periodeEnde);

  // Gesamtbrennstoffmenge schätzen wir aus dem erfassten Wärmeverbrauch (kWh)
  // — in einer realen Abrechnung käme der Wert direkt vom Energielieferanten.
  const co2 = berechneCo2Kosten(
    waermeSumme,
    emissionsfaktor,
    co2Config.spezifischerAusstoss,
    co2Config.preisProTonne,
  );

  // Summe der Heizkostenpositionen im Haus (brutto, vor CO2-Korrektur)
  const heizkostenGesamtBrutto = kostenpositionen
    .filter((k) => k.istHeizkosten && k.umlagefaehig)
    .reduce((sum, k) => sum + k.betrag, 0);

  // Faktor, um den die Heizkostenpositionen aufgrund des CO2-Vermieteranteils
  // verringert werden müssen.
  const heizkostenNachCo2 = umlagefaehigeHeizkostenNachCo2(
    heizkostenGesamtBrutto,
    co2.vermieterAnteilEuro,
  );
  const co2Faktor =
    heizkostenGesamtBrutto > 0 ? heizkostenNachCo2 / heizkostenGesamtBrutto : 1;

  const aktiveEinheiten = einheiten.filter((e) => istAktiv(e, periodeEnde));

  let vermieterAnteilGesamt = 0;
  const mieterAbrechnungen: MieterAbrechnung[] = [];

  for (const einheit of einheiten) {
    const aktiv = istAktiv(einheit, periodeEnde);
    const einzelpositionen: AbrechnungEinzelposition[] = [];

    for (const pos of kostenpositionen) {
      if (!pos.umlagefaehig) continue;

      let anteil = 0;
      let betrag = 0;
      let hinweis: string | undefined;

      if (pos.istHeizkosten) {
        const aufteilung = verteileHeizkosten(
          pos.betrag,
          heizkostenConfig.verbrauchsquote,
          einheit,
          gebaeude,
          waermeSumme,
        );
        // CO2-Vermieteranteil reduziert die umlagefähigen Heizkosten
        const reduziert = aufteilung.summe * co2Faktor;
        anteil = pos.betrag > 0 ? reduziert / pos.betrag : 0;
        betrag = reduziert;
        hinweis = `Grund ${formatPercent(1 - heizkostenConfig.verbrauchsquote)} / Verbrauch ${formatPercent(
          heizkostenConfig.verbrauchsquote,
        )} · CO2-Mieteranteil ${co2.aufteilung.mieterProzent}%`;
      } else {
        const verbrauchSumme =
          pos.umlageschluessel === 'verbrauch' ? wasserSumme : 0;
        anteil = berechneAnteil(pos.umlageschluessel, einheit, gebaeude, verbrauchSumme);
        betrag = pos.betrag * anteil;
      }

      if (!aktiv) {
        // Bei Leerstand trägt der Eigentümer die Kosten dieser Einheit
        vermieterAnteilGesamt += betrag;
        continue;
      }

      einzelpositionen.push({
        kostenpositionId: pos.id,
        bezeichnung: pos.bezeichnung,
        betrKvNr: pos.betrKvNr,
        umlageschluessel: pos.umlageschluessel,
        gesamtkosten: pos.betrag,
        anteil,
        betrag,
        hinweis,
      });
    }

    if (!aktiv) {
      // Leerstand: trotzdem als Zeile mit Saldo 0 aufnehmen, damit die UI
      // den Leerstand transparent ausweist.
      mieterAbrechnungen.push({
        einheitId: einheit.id,
        einheitLage: einheit.lage,
        mieterName: einheit.mieterName,
        einzelpositionen: [],
        summeKosten: 0,
        vorauszahlung: 0,
        saldo: 0,
        hatLeerstand: true,
      });
      continue;
    }

    const summeKosten = einzelpositionen.reduce((s, p) => s + p.betrag, 0);
    const saldo = summeKosten - einheit.vorauszahlungJahr;

    mieterAbrechnungen.push({
      einheitId: einheit.id,
      einheitLage: einheit.lage,
      mieterName: einheit.mieterName,
      einzelpositionen,
      summeKosten,
      vorauszahlung: einheit.vorauszahlungJahr,
      saldo,
      hatLeerstand: false,
    });
  }

  // Nicht umlagefähige Positionen vollständig dem Vermieter zuordnen
  const nichtUmlagefaehigSumme = kostenpositionen
    .filter((k) => !k.umlagefaehig)
    .reduce((s, k) => s + k.betrag, 0);
  vermieterAnteilGesamt += nichtUmlagefaehigSumme;

  // CO2-Vermieteranteil
  vermieterAnteilGesamt += co2.vermieterAnteilEuro;

  // Wenn keine aktiven Einheiten existieren, kommen wir zur Default-Logik
  // (Vermieter trägt alles); bei aktiven Einheiten ist die Verteilung
  // bereits oben erfolgt.
  if (aktiveEinheiten.length === 0) {
    vermieterAnteilGesamt += kostenpositionen
      .filter((k) => k.umlagefaehig)
      .reduce((s, k) => s + k.betrag, 0);
  }

  return {
    zeitraum,
    gebaeude,
    mieter: mieterAbrechnungen,
    vermieterAnteil: vermieterAnteilGesamt,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
