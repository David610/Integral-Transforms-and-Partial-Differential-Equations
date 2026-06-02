/**
 * PDF-Export einer Mieterabrechnung mit @react-pdf/renderer.
 *
 * Print-freundliches Layout mit Briefkopf, Mieter-/Objektdaten,
 * Positionstabelle, Saldo und Fristenhinweis.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import { formatDatum, formatEuro, formatProzent } from '@/domain/format';
import type { AbrechnungsErgebnis, MieterAbrechnung } from '@/domain/types';

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  brief: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1pt solid #d1d5db',
    paddingBottom: 12,
    marginBottom: 18,
  },
  briefkopfTitel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#0f172a',
  },
  briefkopfSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  datum: {
    fontSize: 9,
    color: '#64748b',
  },
  block: {
    marginBottom: 16,
  },
  blockTitel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  titel: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitel: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaWert: {
    fontSize: 10,
    color: '#0f172a',
    marginTop: 2,
  },
  tabelleHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #d1d5db',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tabelleZeile: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottom: '0.5pt solid #e5e7eb',
  },
  thPos: { flex: 3, fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  thNr: { width: 32, fontSize: 8, color: '#64748b', textAlign: 'left' },
  thZahl: { flex: 1, fontSize: 8, color: '#64748b', textAlign: 'right', textTransform: 'uppercase' },
  tdPos: { flex: 3 },
  tdNr: { width: 32, fontSize: 9 },
  tdZahl: { flex: 1, textAlign: 'right', fontSize: 9 },
  tdPosName: { fontSize: 10 },
  tdPosHinweis: { fontSize: 8, color: '#64748b', marginTop: 1 },
  summe: {
    flexDirection: 'row',
    borderTop: '1pt solid #cbd5e1',
    paddingTop: 6,
    marginTop: 4,
  },
  summeLabel: { flex: 3, fontSize: 10 },
  summeWert: { flex: 1, fontSize: 10, textAlign: 'right' },
  saldoBox: {
    marginTop: 18,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderLeft: '3pt solid #0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saldoLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  saldoWert: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  hinweis: {
    marginTop: 24,
    padding: 10,
    backgroundColor: '#fefce8',
    borderLeft: '2pt solid #ca8a04',
    fontSize: 8,
    color: '#713f12',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 6,
  },
});

interface DocProps {
  ergebnis: AbrechnungsErgebnis;
  mieter: MieterAbrechnung;
}

function AbrechnungDocument({ ergebnis, mieter }: DocProps) {
  const nachzahlung = mieter.saldo > 0;
  const periodeEnde = new Date(ergebnis.zeitraum.bis);
  const frist = new Date(periodeEnde);
  frist.setFullYear(frist.getFullYear() + 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brief}>
          <View>
            <Text style={styles.briefkopfTitel}>NK-EXPRESS</Text>
            <Text style={styles.briefkopfSub}>Betriebskostenabrechnung</Text>
          </View>
          <Text style={styles.datum}>{formatDatum(new Date().toISOString().slice(0, 10))}</Text>
        </View>

        <Text style={styles.titel}>Betriebskostenabrechnung</Text>
        <Text style={styles.subtitel}>
          Abrechnungszeitraum {formatDatum(ergebnis.zeitraum.von)} – {formatDatum(ergebnis.zeitraum.bis)}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Objekt</Text>
            <Text style={styles.metaWert}>{ergebnis.gebaeude.adresse}</Text>
            <Text style={[styles.metaWert, { color: '#64748b', fontSize: 9 }]}>
              {ergebnis.gebaeude.anzahlEinheiten} Einheiten · {ergebnis.gebaeude.gesamtwohnflaeche.toLocaleString('de-DE')} m²
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Mieter / Einheit</Text>
            <Text style={styles.metaWert}>{mieter.mieterName ?? '—'}</Text>
            <Text style={[styles.metaWert, { color: '#64748b', fontSize: 9 }]}>
              {mieter.einheitLage}
            </Text>
          </View>
        </View>

        <View style={styles.tabelleHeader}>
          <Text style={styles.thPos}>Position</Text>
          <Text style={styles.thNr}>Nr.</Text>
          <Text style={styles.thZahl}>Gesamt</Text>
          <Text style={styles.thZahl}>Anteil</Text>
          <Text style={styles.thZahl}>Betrag</Text>
        </View>

        {mieter.einzelpositionen.map((p) => (
          <View key={p.kostenpositionId} style={styles.tabelleZeile}>
            <View style={styles.tdPos}>
              <Text style={styles.tdPosName}>{p.bezeichnung}</Text>
              {p.hinweis && <Text style={styles.tdPosHinweis}>{p.hinweis}</Text>}
            </View>
            <Text style={styles.tdNr}>{String(p.betrKvNr).padStart(2, '0')}</Text>
            <Text style={styles.tdZahl}>{formatEuro(p.gesamtkosten)}</Text>
            <Text style={styles.tdZahl}>{formatProzent(p.anteil, 3)}</Text>
            <Text style={styles.tdZahl}>{formatEuro(p.betrag)}</Text>
          </View>
        ))}

        <View style={styles.summe}>
          <Text style={styles.summeLabel}>Summe Betriebskosten</Text>
          <Text style={styles.summeWert}></Text>
          <Text style={styles.summeWert}></Text>
          <Text style={[styles.summeWert, { fontFamily: 'Helvetica-Bold' }]}>
            {formatEuro(mieter.summeKosten)}
          </Text>
        </View>
        <View style={styles.tabelleZeile}>
          <Text style={styles.summeLabel}>./. Vorauszahlungen</Text>
          <Text style={styles.summeWert}></Text>
          <Text style={styles.summeWert}></Text>
          <Text style={styles.summeWert}>{formatEuro(mieter.vorauszahlung)}</Text>
        </View>

        <View style={styles.saldoBox}>
          <Text style={styles.saldoLabel}>
            {nachzahlung ? 'Nachzahlung' : 'Guthaben'}
          </Text>
          <Text
            style={[
              styles.saldoWert,
              { color: nachzahlung ? '#b91c1c' : '#15803d' },
            ]}
          >
            {formatEuro(Math.abs(mieter.saldo))}
          </Text>
        </View>

        <Text style={styles.hinweis}>
          Hinweise § 556 Abs. 3 BGB: Diese Abrechnung muss dem Mieter spätestens zum{' '}
          {formatDatum(frist.toISOString().slice(0, 10))} zugehen. Einwendungen sind binnen
          12 Monaten nach Zugang zu erheben. Bei nicht-verbrauchsabhängiger Heizkostenabrechnung
          besteht ggf. ein Kürzungsrecht von 15 % nach § 12 HeizkostenV. Aufteilung Heizkosten
          gemäß HeizkostenV § 7, CO₂-Kosten gemäß CO2KostAufG.
        </Text>

        <Text style={styles.footer} fixed>
          NK-Express · Demonstrationsbeleg · Rechtsverbindlich nur nach Prüfung durch den Vermieter
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Erzeugt eine PDF-Datei für den gegebenen Mieter und startet einen Download.
 */
export async function erzeugePdf(
  ergebnis: AbrechnungsErgebnis,
  mieter: MieterAbrechnung,
): Promise<void> {
  const blob = await pdf(<AbrechnungDocument ergebnis={ergebnis} mieter={mieter} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateiname = `NK-${ergebnis.zeitraum.von.slice(0, 4)}-${slug(mieter.einheitLage)}.pdf`;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] ?? c)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
