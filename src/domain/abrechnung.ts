/**
 * Orchestrierung: erzeugt aus Stammdaten, Kosten und Konfiguration je Einheit
 * eine MieterAbrechnung mit allen Einzelpositionen und dem Saldo.
 *
 * Reine Funktion - keine UI-, Storage- oder IO-Abhaengigkeiten.
 */

import { berechneCo2Kosten, umlagefaehigeHeizkostenNachCo2 } from './co2';
import {
  HEIZKOSTEN_KUERZUNG_PROZENT,
  kuerzungsrechtAnwenden,
  verteileHeizkosten,
} from './heizkosten';
import {
  berechneAnteil,
  berechneBelegung,
  summeWaermeverbrauch,
  summeWasserverbrauch,
  type Belegung,
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

interface EinheitenKontext {
  einheit: Einheit;
  belegung: Belegung;
  einzelpositionen: AbrechnungEinzelposition[];
  vermieterAnteil: number;
}

interface PositionsZuordnung {
  vollerEinheitenanteil: number;
  mieterBetrag: number;
  vermieterBetrag: number;
  hinweis?: string;
}

const DEFAULT_EMISSIONSFAKTOR_ERDGAS = 0.201; // kg CO2 / kWh
const EPS = 1e-9;

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

  const wasserSumme = summeWasserverbrauch(einheiten);
  const waermeSumme = summeWaermeverbrauch(einheiten);

  // Gesamtbrennstoffmenge schaetzen wir aus dem erfassten Waermeverbrauch (kWh).
  // In einer realen Abrechnung kaeme der Wert direkt vom Energielieferanten.
  const co2 = berechneCo2Kosten(
    waermeSumme,
    emissionsfaktor,
    co2Config.spezifischerAusstoss,
    co2Config.preisProTonne,
  );

  const heizkostenGesamtBrutto = kostenpositionen
    .filter((k) => k.istHeizkosten && k.umlagefaehig)
    .reduce((sum, k) => sum + k.betrag, 0);
  const co2VermieterAnteil = Math.min(
    co2.vermieterAnteilEuro,
    Math.max(heizkostenGesamtBrutto, 0),
  );
  const heizkostenNachCo2 = umlagefaehigeHeizkostenNachCo2(
    heizkostenGesamtBrutto,
    co2VermieterAnteil,
  );
  const co2Faktor =
    heizkostenGesamtBrutto > 0 ? heizkostenNachCo2 / heizkostenGesamtBrutto : 1;

  const kontexte: EinheitenKontext[] = einheiten.map((einheit) => ({
    einheit,
    belegung: berechneBelegung(einheit, zeitraum),
    einzelpositionen: [],
    vermieterAnteil: 0,
  }));

  let vermieterAnteilGesamt = 0;

  for (const pos of kostenpositionen) {
    if (!pos.umlagefaehig) {
      vermieterAnteilGesamt += pos.betrag;
      continue;
    }

    const umlagefaehigeKosten = pos.istHeizkosten ? pos.betrag * co2Faktor : pos.betrag;
    let verteilteKosten = 0;

    for (const kontext of kontexte) {
      const zuordnung = verteilePosition({
        pos,
        umlagefaehigeKosten,
        kontext,
        gebaeude,
        wasserSumme,
        waermeSumme,
        heizkostenConfig,
        co2MieterProzent: co2.aufteilung.mieterProzent,
        co2Reduziert: pos.istHeizkosten && co2VermieterAnteil > EPS,
      });

      verteilteKosten += zuordnung.vollerEinheitenanteil;
      vermieterAnteilGesamt += zuordnung.vermieterBetrag;
      kontext.vermieterAnteil += zuordnung.vermieterBetrag;

      if (kontext.belegung.belegteTage <= 0 || Math.abs(zuordnung.mieterBetrag) <= EPS) {
        continue;
      }

      kontext.einzelpositionen.push({
        kostenpositionId: pos.id,
        bezeichnung: pos.bezeichnung,
        betrKvNr: pos.betrKvNr,
        umlageschluessel: pos.umlageschluessel,
        gesamtkosten: pos.betrag,
        anteil: pos.betrag !== 0 ? zuordnung.mieterBetrag / pos.betrag : 0,
        betrag: zuordnung.mieterBetrag,
        vermieterAnteil:
          Math.abs(zuordnung.vermieterBetrag) > EPS ? zuordnung.vermieterBetrag : undefined,
        hinweis: zuordnung.hinweis,
      });
    }

    const residual = umlagefaehigeKosten - verteilteKosten;
    if (Math.abs(residual) > EPS) {
      vermieterAnteilGesamt += residual;
    }
  }

  vermieterAnteilGesamt += co2VermieterAnteil;

  return {
    zeitraum,
    gebaeude,
    mieter: kontexte.map((kontext) => mieterAbrechnung(kontext)),
    vermieterAnteil: vermieterAnteilGesamt,
  };
}

function verteilePosition({
  pos,
  umlagefaehigeKosten,
  kontext,
  gebaeude,
  wasserSumme,
  waermeSumme,
  heizkostenConfig,
  co2MieterProzent,
  co2Reduziert,
}: {
  pos: Kostenposition;
  umlagefaehigeKosten: number;
  kontext: EinheitenKontext;
  gebaeude: Gebaeude;
  wasserSumme: number;
  waermeSumme: number;
  heizkostenConfig: HeizkostenKonfiguration;
  co2MieterProzent: number;
  co2Reduziert: boolean;
}): PositionsZuordnung {
  if (pos.istHeizkosten && waermeSumme <= 0) {
    return verteileHeizkostenOhneVerbrauch({
      pos,
      umlagefaehigeKosten,
      kontext,
      gebaeude,
      co2MieterProzent,
      co2Reduziert,
    });
  }

  const istWaermeBasis = pos.verbrauchsbasis === 'waerme';
  const verbrauchSummeHaus =
    pos.umlageschluessel === 'verbrauch' ? (istWaermeBasis ? waermeSumme : wasserSumme) : 0;
  const einheitVerbrauch = istWaermeBasis
    ? kontext.einheit.verbrauchWaerme
    : kontext.einheit.verbrauchWasser;

  const vollerEinheitenanteil = pos.istHeizkosten
    ? verteileHeizkosten(
        umlagefaehigeKosten,
        heizkostenConfig.verbrauchsquote,
        kontext.einheit,
        gebaeude,
        waermeSumme,
      ).summe
    : umlagefaehigeKosten *
      berechneAnteil(
        pos.umlageschluessel,
        kontext.einheit,
        gebaeude,
        verbrauchSummeHaus,
        einheitVerbrauch,
      );
  const mieterBetrag = vollerEinheitenanteil * kontext.belegung.belegungsquote;
  const vermieterBetrag = vollerEinheitenanteil - mieterBetrag;

  return {
    vollerEinheitenanteil,
    mieterBetrag,
    vermieterBetrag,
    hinweis: hinweis({
      pos,
      belegung: kontext.belegung,
      heizkostenConfig,
      co2MieterProzent,
      co2Reduziert,
    }),
  };
}

function verteileHeizkostenOhneVerbrauch({
  pos,
  umlagefaehigeKosten,
  kontext,
  gebaeude,
  co2MieterProzent,
  co2Reduziert,
}: {
  pos: Kostenposition;
  umlagefaehigeKosten: number;
  kontext: EinheitenKontext;
  gebaeude: Gebaeude;
  co2MieterProzent: number;
  co2Reduziert: boolean;
}): PositionsZuordnung {
  const flaechenanteil = berechneAnteil('flaeche', kontext.einheit, gebaeude, 0);
  const vollerEinheitenanteil = umlagefaehigeKosten * flaechenanteil;
  const mieterVorKuerzung = vollerEinheitenanteil * kontext.belegung.belegungsquote;
  const mieterBetrag = kuerzungsrechtAnwenden(mieterVorKuerzung);
  const vermieterBetrag = vollerEinheitenanteil - mieterBetrag;

  return {
    vollerEinheitenanteil,
    mieterBetrag,
    vermieterBetrag,
    hinweis: hinweis({
      pos,
      belegung: kontext.belegung,
      co2MieterProzent,
      co2Reduziert,
      ohneVerbrauch: true,
    }),
  };
}

function mieterAbrechnung(kontext: EinheitenKontext): MieterAbrechnung {
  const summeKosten = kontext.einzelpositionen.reduce((s, p) => s + p.betrag, 0);
  const vorauszahlung =
    kontext.belegung.belegteTage > 0 ? kontext.einheit.vorauszahlungJahr : 0;
  const saldo = summeKosten - vorauszahlung;

  return {
    einheitId: kontext.einheit.id,
    einheitLage: kontext.einheit.lage,
    mieterName: kontext.einheit.mieterName,
    einzelpositionen: kontext.einzelpositionen,
    summeKosten,
    vorauszahlung,
    saldo,
    hatLeerstand: kontext.belegung.hatLeerstand,
    belegungsquote: kontext.belegung.belegungsquote,
    vermieterAnteil: kontext.vermieterAnteil,
  };
}

function hinweis({
  pos,
  belegung,
  heizkostenConfig,
  co2MieterProzent,
  co2Reduziert,
  ohneVerbrauch = false,
}: {
  pos: Kostenposition;
  belegung: Belegung;
  heizkostenConfig?: HeizkostenKonfiguration;
  co2MieterProzent: number;
  co2Reduziert: boolean;
  ohneVerbrauch?: boolean;
}): string | undefined {
  const teile: string[] = [];

  if (pos.istHeizkosten && ohneVerbrauch) {
    teile.push(
      `Verbrauch nicht erfasst: Flaechenverteilung mit ${Math.round(
        HEIZKOSTEN_KUERZUNG_PROZENT * 100,
      )} % Kuerzung`,
    );
  } else if (pos.istHeizkosten && heizkostenConfig) {
    teile.push(
      `Grund ${formatPercent(1 - heizkostenConfig.verbrauchsquote)} / Verbrauch ${formatPercent(
        heizkostenConfig.verbrauchsquote,
      )}`,
    );
  }

  if (pos.istHeizkosten && co2Reduziert) {
    teile.push(`CO2-Mieteranteil ${co2MieterProzent}%`);
  }

  if (belegung.hatLeerstand) {
    teile.push(`Belegung ${belegung.belegteTage}/${belegung.periodenTage} Tage`);
  }

  return teile.length > 0 ? teile.join(' · ') : undefined;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
