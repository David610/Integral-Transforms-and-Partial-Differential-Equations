/**
 * Heizkostenverteilung nach HeizkostenV § 7.
 *
 * Heiz- und Warmwasserkosten werden in einen Grundkostenanteil und einen
 * Verbrauchskostenanteil aufgeteilt. Der Verbrauchskostenanteil muss
 * mindestens 50 % und höchstens 70 % der Kosten betragen (Default 70 %).
 *
 * Wird der Verbrauch nicht erfasst (z. B. fehlende Erfassungsgeräte), hat
 * der Mieter ein Kürzungsrecht in Höhe von 15 % (§ 12 HeizkostenV).
 */

import type { Einheit, Gebaeude } from './types';

export interface HeizkostenAufteilung {
  /** Anteil Grundkosten dieser Einheit in € */
  grundkostenAnteil: number;
  /** Anteil Verbrauchskosten dieser Einheit in € */
  verbrauchskostenAnteil: number;
  /** Summe für diese Einheit */
  summe: number;
}

/**
 * Verteilt Heizkosten gemäß HeizkostenV.
 *
 * @param gesamtkosten Gesamtkosten der Heizung/Warmwasser im Abrechnungszeitraum
 * @param verbrauchsquote Anteil Verbrauchskosten (0,5–0,7), Default 0,7
 * @param einheit aktuelle Einheit
 * @param gebaeude Gebäudedaten
 * @param verbrauchSummeHaus Summe Verbrauch aller Einheiten
 */
export function verteileHeizkosten(
  gesamtkosten: number,
  verbrauchsquote: number,
  einheit: Einheit,
  gebaeude: Gebaeude,
  verbrauchSummeHaus: number,
): HeizkostenAufteilung {
  const quote = clamp(verbrauchsquote, 0.5, 0.7);

  const grundkostenGesamt = gesamtkosten * (1 - quote);
  const verbrauchskostenGesamt = gesamtkosten * quote;

  // Grundkosten nach Wohnfläche
  const flaechenanteil =
    gebaeude.gesamtwohnflaeche > 0 ? einheit.wohnflaeche / gebaeude.gesamtwohnflaeche : 0;
  const grundkostenAnteil = grundkostenGesamt * flaechenanteil;

  // Verbrauchskosten nach erfasstem Wärmeverbrauch
  const verbrauchsanteil =
    verbrauchSummeHaus > 0 ? einheit.verbrauchWaerme / verbrauchSummeHaus : 0;
  const verbrauchskostenAnteil = verbrauchskostenGesamt * verbrauchsanteil;

  return {
    grundkostenAnteil,
    verbrauchskostenAnteil,
    summe: grundkostenAnteil + verbrauchskostenAnteil,
  };
}

/**
 * Kürzungssatz des Mieters bei nicht-verbrauchsabhängiger Abrechnung
 * gemäß § 12 HeizkostenV (15 %). Einzige Quelle der Wahrheit für diesen Wert.
 */
export const HEIZKOSTEN_KUERZUNG_PROZENT = 0.15;

/**
 * Kürzungsrecht des Mieters bei nicht-verbrauchsabhängiger Abrechnung
 * gemäß § 12 HeizkostenV (15 % Kürzung der Heizkostenposition).
 */
export function kuerzungsrechtAnwenden(heizkostenAnteil: number): number {
  return heizkostenAnteil * (1 - HEIZKOSTEN_KUERZUNG_PROZENT);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
