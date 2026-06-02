/**
 * Erfassung der Kostenpositionen mit BetrKV-Nummer, Umlageschlüssel und
 * Flag "umlagefähig".
 */

import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatEuro } from '@/domain/format';
import type { BetrKvNr, Kostenposition, UmlageSchluessel } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';

const SCHLUESSEL_LABEL: Record<UmlageSchluessel, string> = {
  flaeche: 'Wohnfläche',
  einheiten: 'Anzahl Einheiten',
  personen: 'Personen',
  verbrauch: 'Verbrauch',
};

/** Sprechende Bezeichner der BetrKV-Positionen (§ 2 BetrKV). */
const BETRKV_LABEL: Record<number, string> = {
  0: 'nicht umlagefähig',
  1: '01 Grundsteuer',
  2: '02 Wasser',
  3: '03 Entwässerung',
  4: '04 Heizung',
  5: '05 Warmwasser',
  6: '06 verbundene Heiz-/Warmwasseranlagen',
  7: '07 Aufzug',
  8: '08 Straßenreinigung & Müll',
  9: '09 Gebäudereinigung',
  10: '10 Gartenpflege',
  11: '11 Allgemeinbeleuchtung',
  12: '12 Schornsteinfeger',
  13: '13 Versicherung',
  14: '14 Hauswart',
  15: '15 Gemeinschaftsantenne',
  16: '16 Wäscheeinrichtungen',
  17: '17 sonstige',
};

export function KostenTable() {
  const kosten = useAppStore((s) => s.kostenpositionen);
  const upsert = useAppStore((s) => s.upsertKosten);
  const remove = useAppStore((s) => s.removeKosten);

  function patch<K extends keyof Kostenposition>(
    pos: Kostenposition,
    key: K,
    value: Kostenposition[K],
  ) {
    upsert({ ...pos, [key]: value });
  }

  function handleNew() {
    upsert({
      id: `k-${Date.now()}`,
      bezeichnung: 'Neue Position',
      betrag: 0,
      betrKvNr: 17,
      umlageschluessel: 'flaeche',
      istHeizkosten: false,
      umlagefaehig: true,
    });
  }

  const summeUmlagefaehig = kosten
    .filter((k) => k.umlagefaehig)
    .reduce((s, k) => s + k.betrag, 0);
  const summeAlle = kosten.reduce((s, k) => s + k.betrag, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Kostenpositionen ({kosten.length})</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Auswahl der BetrKV-Nummer und des Umlageschlüssels nach § 556a BGB.
          </p>
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus className="h-4 w-4" />
          Position hinzufügen
        </Button>
      </CardHeader>
      <CardContent>
        <Table className="table-zebra">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Bezeichnung</TableHead>
              <TableHead className="min-w-[170px]">BetrKV-Nr.</TableHead>
              <TableHead className="min-w-[140px]">Schlüssel</TableHead>
              <TableHead>Heizk.</TableHead>
              <TableHead>Umlagef.</TableHead>
              <TableHead className="min-w-[140px] text-right">Betrag</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kosten.map((k) => (
              <TableRow key={k.id}>
                <TableCell>
                  <Input
                    value={k.bezeichnung}
                    onChange={(e) => patch(k, 'bezeichnung', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={String(k.betrKvNr)}
                    onChange={(e) => patch(k, 'betrKvNr', Number(e.target.value) as BetrKvNr)}
                  >
                    {(Object.keys(BETRKV_LABEL) as unknown as string[]).map((n) => (
                      <option key={n} value={n}>
                        {BETRKV_LABEL[Number(n)]}
                      </option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={k.umlageschluessel}
                    onChange={(e) =>
                      patch(k, 'umlageschluessel', e.target.value as UmlageSchluessel)
                    }
                  >
                    {(Object.keys(SCHLUESSEL_LABEL) as UmlageSchluessel[]).map((s) => (
                      <option key={s} value={s}>
                        {SCHLUESSEL_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={k.istHeizkosten}
                      onChange={(e) => patch(k, 'istHeizkosten', e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    HeizV
                  </label>
                </TableCell>
                <TableCell>
                  {k.umlagefaehig ? (
                    <Badge variant="success" className="cursor-pointer" onClick={() => patch(k, 'umlagefaehig', false)}>
                      ja
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="cursor-pointer" onClick={() => patch(k, 'umlagefaehig', true)}>
                      nein
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step={0.01}
                    className="num text-right"
                    value={k.betrag}
                    onChange={(e) => patch(k, 'betrag', Number(e.target.value) || 0)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(k.id)}
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-right uppercase text-xs tracking-wide text-muted-foreground">
                Summe umlagefähig
              </TableCell>
              <TableCell className="num text-right">{formatEuro(summeUmlagefaehig)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={5} className="text-right uppercase text-xs tracking-wide text-muted-foreground">
                Summe gesamt
              </TableCell>
              <TableCell className="num text-right font-semibold">{formatEuro(summeAlle)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
