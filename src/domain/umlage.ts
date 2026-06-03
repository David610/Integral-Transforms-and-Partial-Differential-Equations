/**
 * Umlageschlüssel nach § 556a BGB.
 *
 * Soweit nichts anderes vereinbart ist, sind die Betriebskosten nach
 * Wohnfläche umzulegen ("Default = Fläche"). Verbrauchsabhängige Positionen
 * (Wasser, Heizung) sind nach erfasstem Verbrauch zu verteilen.
 */

import { daysBetweenInclusive, isoToUtcDay } from './date';
import type { Abrechnungszeitraum, Einheit, Gebaeude, UmlageSchluessel } from './types';

export interface Belegung {
  belegteTage: number;
  periodenTage: number;
  belegungsquote: number;
  leerstandsquote: number;
  hatLeerstand: boolean;
}

/**
 * Aktive Einheit = nicht im gesamten Zeitraum leerstehend.
 * Für die Anteilsberechnung zählen wir Einheiten als aktiv, wenn sie im
 * Abrechnungszeitraum überhaupt vermietet waren. Eine korrektere zeitanteilige
 * Berücksichtigung wäre möglich, ist hier aber vereinfacht.
 */
export function berechneBelegung(
  einheit: Einheit,
  zeitraum: Abrechnungszeitraum,
): Belegung {
  const periodenTage = daysBetweenInclusive(zeitraum.von, zeitraum.bis);
  const periodenStart = isoToUtcDay(zeitraum.von);
  const periodenEnde = isoToUtcDay(zeitraum.bis);

  if (periodenTage === 0 || periodenStart === null || periodenEnde === null) {
    return {
      belegteTage: 0,
      periodenTage: 0,
      belegungsquote: 0,
      leerstandsquote: 1,
      hatLeerstand: true,
    };
  }

  const mietbeginn = isoToUtcDay(einheit.mietbeginn) ?? periodenStart;
  const mietende = einheit.mietende
    ? isoToUtcDay(einheit.mietende) ?? periodenEnde
    : periodenEnde;
  const belegungStart = Math.max(periodenStart, mietbeginn);
  const belegungEnde = Math.min(periodenEnde, mietende);
  const belegteTage = Math.max(0, belegungEnde - belegungStart + 1);
  const belegungsquote = belegteTage / periodenTage;

  return {
    belegteTage,
    periodenTage,
    belegungsquote,
    leerstandsquote: 1 - belegungsquote,
    hatLeerstand: belegungsquote < 1,
  };
}

export function istAktiv(
  einheit: Einheit,
  periodeEnde: string,
  periodeStart = periodeEnde,
): boolean {
  return berechneBelegung(einheit, { von: periodeStart, bis: periodeEnde }).belegteTage > 0;
}

/**
 * Berechnet den Umlageanteil (0–1) einer Einheit für einen bestimmten Schlüssel.
 *
 * Wichtig: Bei Leerstand darf der Anteil der leerstehenden Einheit nicht auf
 * die anderen Mieter umgelegt werden — er bleibt beim Eigentümer (§ 556a BGB).
 * Deshalb arbeiten wir hier weiterhin mit den Gesamtbezugsgrößen des Gebäudes
 * (Gesamtfläche, Gesamtpersonen, Anzahl Einheiten). Die Differenz zur Summe
 * "aller Mieter" bildet den Vermieteranteil.
 */
export function berechneAnteil(
  schluessel: UmlageSchluessel,
  einheit: Einheit,
  gebaeude: Gebaeude,
  verbrauchSummeHaus: number,
): number {
  switch (schluessel) {
    case 'flaeche':
      if (gebaeude.gesamtwohnflaeche <= 0) return 0;
      return einheit.wohnflaeche / gebaeude.gesamtwohnflaeche;
    case 'einheiten':
      if (gebaeude.anzahlEinheiten <= 0) return 0;
      return 1 / gebaeude.anzahlEinheiten;
    case 'personen':
      if (gebaeude.gesamtPersonen <= 0) return 0;
      return einheit.personen / gebaeude.gesamtPersonen;
    case 'verbrauch':
      if (verbrauchSummeHaus <= 0) return 0;
      // Default: Wasserverbrauch; spezialisierter Verbrauch wird in heizkosten.ts
      // separat behandelt. Hier nutzen wir Wasserverbrauch als generischen Wert.
      return einheit.verbrauchWasser / verbrauchSummeHaus;
  }
}

export function kostenEinheit(gesamtkosten: number, anteil: number): number {
  return gesamtkosten * anteil;
}

/**
 * Summiert den Wasserverbrauch über alle aktiven Einheiten.
 */
export function summeWasserverbrauch(einheiten: Einheit[], _periodeEnde?: string): number {
  return einheiten.reduce((sum, e) => sum + Math.max(e.verbrauchWasser, 0), 0);
}

/**
 * Summiert den Wärmeverbrauch über alle aktiven Einheiten.
 */
export function summeWaermeverbrauch(einheiten: Einheit[], _periodeEnde?: string): number {
  return einheiten.reduce((sum, e) => sum + Math.max(e.verbrauchWaerme, 0), 0);
}
