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
  einheitVerbrauch = einheit.verbrauchWasser,
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
      // Maßstab ist der erfasste Verbrauch der Einheit (Default: Wasser).
      // Die Bezugsgröße wird von der aufrufenden Stelle passend zur
      // verbrauchsbasis der Position übergeben.
      return einheitVerbrauch / verbrauchSummeHaus;
  }
}

/**
 * Summiert den Wasserverbrauch über alle Einheiten (inkl. Leerstand).
 * Der Verbrauch leerstehender Einheiten bleibt im Nenner, damit sein Anteil
 * dem Eigentümer und nicht den aktiven Mietern zugerechnet wird.
 */
export function summeWasserverbrauch(einheiten: Einheit[]): number {
  return einheiten.reduce((sum, e) => sum + Math.max(e.verbrauchWasser, 0), 0);
}

/**
 * Summiert den Wärmeverbrauch über alle Einheiten (inkl. Leerstand).
 * Siehe {@link summeWasserverbrauch} zur Behandlung des Leerstands.
 */
export function summeWaermeverbrauch(einheiten: Einheit[]): number {
  return einheiten.reduce((sum, e) => sum + Math.max(e.verbrauchWaerme, 0), 0);
}

/**
 * Prüft die Stammdaten auf Inkonsistenzen, die zu falschen Umlagen führen.
 *
 * Die Bezugsgrößen `gesamtPersonen` und `gesamtwohnflaeche` am Gebäude sind
 * frei pflegbar und bilden den Nenner der personen- bzw. flächenbasierten
 * Umlage. Weichen sie von der Summe der Einheiten ab, summieren sich die
 * Mieteranteile nicht auf 100 % – die Differenz landet stillschweigend beim
 * Eigentümer. Diese Funktion macht solche Abweichungen sichtbar.
 */
export function pruefeStammdaten(gebaeude: Gebaeude, einheiten: Einheit[]): string[] {
  const warnungen: string[] = [];
  const TOLERANZ = 0.01;

  const summeFlaeche = einheiten.reduce((s, e) => s + e.wohnflaeche, 0);
  if (Math.abs(summeFlaeche - gebaeude.gesamtwohnflaeche) > TOLERANZ) {
    warnungen.push(
      `Gesamtwohnfläche (${gebaeude.gesamtwohnflaeche} m²) weicht von der Summe ` +
        `der Einheiten (${round2(summeFlaeche)} m²) ab.`,
    );
  }

  const summePersonen = einheiten.reduce((s, e) => s + e.personen, 0);
  if (Math.abs(summePersonen - gebaeude.gesamtPersonen) > TOLERANZ) {
    warnungen.push(
      `Personen gesamt (${gebaeude.gesamtPersonen}) weicht von der Summe der ` +
        `Einheiten (${summePersonen}) ab.`,
    );
  }

  if (einheiten.length !== gebaeude.anzahlEinheiten) {
    warnungen.push(
      `Anzahl Einheiten (${gebaeude.anzahlEinheiten}) weicht von den erfassten ` +
        `Einheiten (${einheiten.length}) ab.`,
    );
  }

  return warnungen;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
