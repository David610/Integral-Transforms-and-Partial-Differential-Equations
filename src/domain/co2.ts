/**
 * CO2-Kostenaufteilung nach CO2KostAufG (Wohngebäude, 10-Stufenmodell).
 *
 * Das Gesetz teilt die CO2-Kosten (CO2-Preis × verbrauchsbedingte CO2-Emission)
 * zwischen Vermieter und Mieter abhängig von der Energieeffizienz des Gebäudes
 * (spezifischer CO2-Ausstoß in kg CO2 / m² Wohnfläche / Jahr).
 *
 * Je schlechter das Gebäude (höherer Ausstoß), desto höher der Vermieteranteil.
 */

export interface Co2Aufteilung {
  /** Vermieteranteil in Prozent (0–100) */
  vermieterProzent: number;
  /** Mieteranteil in Prozent (0–100) */
  mieterProzent: number;
}

/**
 * Liefert die Aufteilung der CO2-Kosten nach 10-Stufenmodell § 5 CO2KostAufG.
 *
 * @param spezifischerAusstossKgProQm kg CO2 pro m² Wohnfläche pro Jahr
 */
export function stufenmodell(spezifischerAusstossKgProQm: number): Co2Aufteilung {
  const x = spezifischerAusstossKgProQm;
  if (x < 12) return { vermieterProzent: 0, mieterProzent: 100 };
  if (x < 17) return { vermieterProzent: 10, mieterProzent: 90 };
  if (x < 22) return { vermieterProzent: 20, mieterProzent: 80 };
  if (x < 27) return { vermieterProzent: 30, mieterProzent: 70 };
  if (x < 32) return { vermieterProzent: 40, mieterProzent: 60 };
  if (x < 37) return { vermieterProzent: 50, mieterProzent: 50 };
  if (x < 42) return { vermieterProzent: 60, mieterProzent: 40 };
  if (x < 47) return { vermieterProzent: 70, mieterProzent: 30 };
  if (x < 52) return { vermieterProzent: 80, mieterProzent: 20 };
  return { vermieterProzent: 95, mieterProzent: 5 };
}

export interface Co2Berechnung {
  /** CO2-Gesamtkosten des Gebäudes in € */
  co2KostenGesamt: number;
  /** Vermieteranteil in € (vermindert umlagefähige Heizkosten) */
  vermieterAnteilEuro: number;
  /** Mieteranteil in € (verbleibt umlagefähig) */
  mieterAnteilEuro: number;
  aufteilung: Co2Aufteilung;
}

/**
 * Berechnet die CO2-Kosten und die Aufteilung zwischen Vermieter und Mieter.
 *
 * @param brennstoffmengeKWh oder verbrauchsbedingter Energiewert in kWh
 * @param emissionsfaktor kg CO2 / kWh (Erdgas ≈ 0,201, Heizöl ≈ 0,266, Fernwärme variabel)
 * @param spezifischerAusstossKgProQm kg CO2 / m² / a (für Stufenmodell)
 * @param preisProTonne CO2-Preis in € pro Tonne (2026: 60)
 */
export function berechneCo2Kosten(
  brennstoffmengeKWh: number,
  emissionsfaktor: number,
  spezifischerAusstossKgProQm: number,
  preisProTonne: number,
): Co2Berechnung {
  const emissionKg = brennstoffmengeKWh * emissionsfaktor;
  const co2KostenGesamt = (emissionKg / 1000) * preisProTonne;
  const aufteilung = stufenmodell(spezifischerAusstossKgProQm);

  return {
    co2KostenGesamt,
    vermieterAnteilEuro: co2KostenGesamt * (aufteilung.vermieterProzent / 100),
    mieterAnteilEuro: co2KostenGesamt * (aufteilung.mieterProzent / 100),
    aufteilung,
  };
}

/**
 * Minderung der umlagefähigen Heizkosten um den CO2-Vermieteranteil.
 * Bereits in den Heizkosten enthaltene CO2-Anteile werden um den Vermieterteil
 * reduziert, bevor sie auf die Mieter umgelegt werden.
 */
export function umlagefaehigeHeizkostenNachCo2(
  heizkostenBrutto: number,
  vermieterAnteilCo2Euro: number,
): number {
  return Math.max(heizkostenBrutto - vermieterAnteilCo2Euro, 0);
}
