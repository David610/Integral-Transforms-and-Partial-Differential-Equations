/**
 * Domain-Typen für die NK-Express Betriebskostenabrechnung.
 *
 * Die Begriffe orientieren sich an der Betriebskostenverordnung (BetrKV),
 * § 556a BGB (Umlageschlüssel) und der HeizkostenV.
 */

export type UmlageSchluessel = 'flaeche' | 'einheiten' | 'personen' | 'verbrauch';

/**
 * Bezugsgröße für verbrauchsabhängige Positionen (Umlageschlüssel 'verbrauch').
 * Bestimmt, welcher erfasste Zählerwert der Einheit als Maßstab dient.
 * Für Heizkostenpositionen (istHeizkosten) ist dieser Wert ohne Belang –
 * dort greift die HeizkostenV-Aufteilung über den Wärmeverbrauch.
 */
export type VerbrauchsBasis = 'wasser' | 'waerme';

/**
 * BetrKV-Nummer 1–17 nach § 2 BetrKV. 0 = nicht umlagefähig.
 */
export type BetrKvNr = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

export interface Gebaeude {
  id: string;
  adresse: string;
  /** Gesamtwohnfläche in m² */
  gesamtwohnflaeche: number;
  anzahlEinheiten: number;
  /** Summe aller gemeldeten Personen im Haus */
  gesamtPersonen: number;
}

export interface Einheit {
  id: string;
  /** Lage-Bezeichnung (z. B. "EG links", "1. OG Mitte") */
  lage: string;
  mieterName?: string;
  /** Wohnfläche in m² */
  wohnflaeche: number;
  personen: number;
  /** ISO-Datum YYYY-MM-DD */
  mietbeginn: string;
  /** Wenn gesetzt: Mietende, ggf. Leerstand */
  mietende?: string;
  /** Geleistete Vorauszahlung im Abrechnungsjahr in € */
  vorauszahlungJahr: number;
  /** Wärmeverbrauch in kWh (oder Einheiten wie Zähler liefert) */
  verbrauchWaerme: number;
  /** Wasserverbrauch in m³ */
  verbrauchWasser: number;
}

export interface Kostenposition {
  id: string;
  bezeichnung: string;
  /** Gesamtkosten der Position für den Abrechnungszeitraum in € */
  betrag: number;
  betrKvNr: BetrKvNr;
  umlageschluessel: UmlageSchluessel;
  /**
   * Bezugsgröße bei Umlageschlüssel 'verbrauch'. Default 'wasser'.
   * Verhindert, dass z. B. eine wärmebasierte Position versehentlich nach
   * Wasserverbrauch verteilt wird.
   */
  verbrauchsbasis?: VerbrauchsBasis;
  /** True, wenn die Position über die HeizkostenV verteilt wird */
  istHeizkosten: boolean;
  /** False = Verwaltungskosten, Instandhaltung etc. (nicht umlagefähig) */
  umlagefaehig: boolean;
}

export interface Abrechnungszeitraum {
  /** ISO-Datum YYYY-MM-DD */
  von: string;
  /** ISO-Datum YYYY-MM-DD */
  bis: string;
}

export interface Co2Konfiguration {
  /** Spezifischer CO2-Ausstoß des Gebäudes in kg/m²/a */
  spezifischerAusstoss: number;
  /** CO2-Preis in €/t (Default 2026: 60) */
  preisProTonne: number;
}

export interface HeizkostenKonfiguration {
  /** Anteil Verbrauchskosten 0,5–0,7 (HeizkostenV § 7) */
  verbrauchsquote: number;
}

export interface AbrechnungEinzelposition {
  kostenpositionId: string;
  bezeichnung: string;
  betrKvNr: BetrKvNr;
  umlageschluessel: UmlageSchluessel;
  /** Gesamtkosten der Position im Haus */
  gesamtkosten: number;
  /** Umlageanteil dieser Einheit (0–1) */
  anteil: number;
  /** Kosten für diese Einheit nach Umlage */
  betrag: number;
  /** Vom Vermieter getragener Anteil dieser Einheit/Position */
  vermieterAnteil?: number;
  /** Optionaler Hinweis (z. B. CO2-Korrektur, Heizkosten-Aufteilung) */
  hinweis?: string;
}

export interface MieterAbrechnung {
  einheitId: string;
  einheitLage: string;
  mieterName?: string;
  einzelpositionen: AbrechnungEinzelposition[];
  summeKosten: number;
  vorauszahlung: number;
  /** positiv = Nachzahlung, negativ = Guthaben */
  saldo: number;
  /** True, wenn diese Einheit im Zeitraum (teilweise) leer stand */
  hatLeerstand: boolean;
  /** Anteil der Abrechnungsperiode, in dem die Einheit vermietet war (0-1) */
  belegungsquote: number;
  /** Vom Vermieter getragener Anteil dieser Einheit */
  vermieterAnteil: number;
}

export interface AbrechnungsErgebnis {
  zeitraum: Abrechnungszeitraum;
  gebaeude: Gebaeude;
  mieter: MieterAbrechnung[];
  /** Vom Vermieter zu tragen (Leerstand + nicht umlagefähig + CO2-Vermieteranteil) */
  vermieterAnteil: number;
}
