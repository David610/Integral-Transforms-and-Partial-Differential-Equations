/**
 * Vorschau der Abrechnung je Mieter mit Einzelpositionen und Saldo.
 */

import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDatum, formatEuro, formatProzent } from '@/domain/format';
import type { AbrechnungsErgebnis, MieterAbrechnung } from '@/domain/types';
import { cn } from '@/lib/utils';
import { erzeugePdf } from './AbrechnungPdf';

interface Props {
  ergebnis: AbrechnungsErgebnis;
}

export function AbrechnungPreview({ ergebnis }: Props) {
  const aktive = ergebnis.mieter.filter((m) => !m.hatLeerstand);
  const leerstand = ergebnis.mieter.filter((m) => m.hatLeerstand);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  async function downloadPdf(mieter: MieterAbrechnung) {
    setPdfLoading(mieter.einheitId);
    try {
      await erzeugePdf(ergebnis, mieter);
    } finally {
      setPdfLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Abrechnungszeitraum</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Von" value={formatDatum(ergebnis.zeitraum.von)} />
          <Stat label="Bis" value={formatDatum(ergebnis.zeitraum.bis)} />
          <Stat label="Mieter" value={`${aktive.length} aktiv`} />
          <Stat
            label="Vermieteranteil"
            value={formatEuro(ergebnis.vermieterAnteil)}
            hint="Leerstand, nicht umlagefähige Kosten & CO₂-Anteil"
          />
        </CardContent>
      </Card>

      {aktive.map((m) => (
        <MieterCard
          key={m.einheitId}
          mieter={m}
          ergebnis={ergebnis}
          onPdf={() => downloadPdf(m)}
          loading={pdfLoading === m.einheitId}
        />
      ))}

      {leerstand.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leerstand</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Folgende Einheiten standen im Abrechnungszeitraum (teilweise) leer.
              Die anteiligen Kosten trägt der Eigentümer (§ 556a BGB):
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {leerstand.map((m) => (
                <li key={m.einheitId} className="flex items-center gap-2">
                  <Badge variant="warn">{m.einheitLage}</Badge>
                  <span className="text-muted-foreground">{m.mieterName ?? '–'}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MieterCard({
  mieter,
  ergebnis,
  onPdf,
  loading,
}: {
  mieter: MieterAbrechnung;
  ergebnis: AbrechnungsErgebnis;
  onPdf: () => void;
  loading: boolean;
}) {
  const nachzahlung = mieter.saldo > 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>
            {mieter.einheitLage}
            {mieter.mieterName && (
              <span className="ml-2 font-normal text-muted-foreground">
                · {mieter.mieterName}
              </span>
            )}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {ergebnis.gebaeude.adresse}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onPdf} disabled={loading}>
          {loading ? (
            <>Erzeuge...</>
          ) : (
            <>
              <Download className="h-4 w-4" />
              PDF erzeugen
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Table className="table-zebra">
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>BetrKV</TableHead>
              <TableHead>Schlüssel</TableHead>
              <TableHead className="text-right">Gesamtkosten</TableHead>
              <TableHead className="text-right">Anteil</TableHead>
              <TableHead className="text-right">Ihr Anteil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mieter.einzelpositionen.map((p) => (
              <TableRow key={p.kostenpositionId}>
                <TableCell>
                  <div className="font-medium">{p.bezeichnung}</div>
                  {p.hinweis && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.hinweis}</div>
                  )}
                </TableCell>
                <TableCell className="num">{p.betrKvNr.toString().padStart(2, '0')}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.umlageschluessel}
                </TableCell>
                <TableCell className="num text-right">
                  {formatEuro(p.gesamtkosten)}
                </TableCell>
                <TableCell className="num text-right">{formatProzent(p.anteil, 3)}</TableCell>
                <TableCell className="num text-right font-medium">
                  {formatEuro(p.betrag)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-right uppercase text-xs tracking-wide text-muted-foreground">
                Summe Betriebskosten
              </TableCell>
              <TableCell className="num text-right font-semibold">
                {formatEuro(mieter.summeKosten)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={5} className="text-right uppercase text-xs tracking-wide text-muted-foreground">
                ./. Vorauszahlungen
              </TableCell>
              <TableCell className="num text-right">
                {formatEuro(mieter.vorauszahlung)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-right text-sm uppercase tracking-wide"
              >
                {nachzahlung ? 'Nachzahlung' : 'Guthaben'}
              </TableCell>
              <TableCell
                className={cn(
                  'num text-right text-base font-bold',
                  nachzahlung ? 'text-destructive' : 'text-success',
                )}
              >
                {formatEuro(Math.abs(mieter.saldo))}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num text-base font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
