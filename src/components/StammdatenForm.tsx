/**
 * Stammdatenpflege: Gebäude bearbeiten + Einheiten verwalten.
 */

import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDatum, formatEuro, formatFlaeche, formatZahl } from '@/domain/format';
import type { Einheit, Gebaeude } from '@/domain/types';
import { pruefeStammdaten } from '@/domain/umlage';
import { useAppStore } from '@/store/useAppStore';

export function StammdatenForm() {
  const gebaeude = useAppStore((s) => s.gebaeude);
  const einheiten = useAppStore((s) => s.einheiten);
  const updateGebaeude = useAppStore((s) => s.updateGebaeude);
  const upsertEinheit = useAppStore((s) => s.upsertEinheit);
  const removeEinheit = useAppStore((s) => s.removeEinheit);

  const [editId, setEditId] = useState<string | null>(null);

  const warnungen = pruefeStammdaten(gebaeude, einheiten);

  function handleNew() {
    const id = `e-${Date.now()}`;
    upsertEinheit({
      id,
      lage: 'Neue Einheit',
      wohnflaeche: 50,
      personen: 1,
      mietbeginn: new Date().toISOString().slice(0, 10),
      vorauszahlungJahr: 1500,
      verbrauchWaerme: 0,
      verbrauchWasser: 0,
    });
    setEditId(id);
  }

  return (
    <div className="space-y-6">
      {warnungen.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Stammdaten prüfen</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {warnungen.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="text-xs text-amber-800">
              Abweichende Bezugsgrößen führen dazu, dass sich die Mieteranteile nicht
              auf 100 % summieren – die Differenz trägt der Eigentümer.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gebäudestammdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <GebaeudeFeld
            label="Adresse"
            value={gebaeude.adresse}
            onChange={(v) => updateGebaeude({ adresse: v })}
            type="text"
            className="md:col-span-2 lg:col-span-2"
          />
          <NumberFeld
            label="Gesamtwohnfläche (m²)"
            value={gebaeude.gesamtwohnflaeche}
            onChange={(v) => updateGebaeude({ gesamtwohnflaeche: v })}
            step={0.1}
          />
          <NumberFeld
            label="Anzahl Einheiten"
            value={gebaeude.anzahlEinheiten}
            onChange={(v) => updateGebaeude({ anzahlEinheiten: Math.round(v) })}
          />
          <NumberFeld
            label="Personen gesamt"
            value={gebaeude.gesamtPersonen}
            onChange={(v) => updateGebaeude({ gesamtPersonen: Math.round(v) })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Mieteinheiten ({einheiten.length})</CardTitle>
          <Button onClick={handleNew} size="sm">
            <Plus className="h-4 w-4" />
            Einheit hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          <Table className="table-zebra">
            <TableHeader>
              <TableRow>
                <TableHead>Lage</TableHead>
                <TableHead>Mieter</TableHead>
                <TableHead className="text-right">Fläche</TableHead>
                <TableHead className="text-right">Personen</TableHead>
                <TableHead>Mietbeginn</TableHead>
                <TableHead>Mietende</TableHead>
                <TableHead className="text-right">Vorauszahlung</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {einheiten.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.lage}</TableCell>
                  <TableCell>
                    {e.mieterName || <span className="text-muted-foreground">–</span>}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatFlaeche(e.wohnflaeche)}
                  </TableCell>
                  <TableCell className="num text-right">{e.personen}</TableCell>
                  <TableCell>{formatDatum(e.mietbeginn)}</TableCell>
                  <TableCell>
                    {e.mietende ? (
                      <Badge variant="warn">{formatDatum(e.mietende)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatEuro(e.vorauszahlungJahr)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditId(e.id === editId ? null : e.id)}
                        aria-label="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEinheit(e.id)}
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {editId && (
            <EinheitForm
              einheit={einheiten.find((e) => e.id === editId)!}
              onChange={upsertEinheit}
              onClose={() => setEditId(null)}
            />
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <Statistik label="Wohnfläche" value={formatFlaeche(summe(einheiten, (e) => e.wohnflaeche))} />
            <Statistik label="Personen" value={formatZahl(summe(einheiten, (e) => e.personen), 0)} />
            <Statistik
              label="Vorauszahlungen"
              value={formatEuro(summe(einheiten, (e) => e.vorauszahlungJahr))}
            />
            <Statistik
              label="Leerstand"
              value={`${einheiten.filter((e) => e.mietende).length} Einheit(en)`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GebaeudeFeld({
  label,
  value,
  onChange,
  type = 'text',
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberFeld({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function Statistik({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num text-base font-semibold">{value}</p>
    </div>
  );
}

function summe(arr: Einheit[], pick: (e: Einheit) => number): number {
  return arr.reduce((s, e) => s + pick(e), 0);
}

function EinheitForm({
  einheit,
  onChange,
  onClose,
}: {
  einheit: Einheit;
  onChange: (e: Einheit) => void;
  onClose: () => void;
}) {
  function patch<K extends keyof Einheit>(key: K, value: Einheit[K]) {
    onChange({ ...einheit, [key]: value });
  }
  return (
    <Card className="mt-6 border-primary/30 bg-muted/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Einheit bearbeiten: {einheit.lage}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Schließen
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Lage</Label>
          <Input value={einheit.lage} onChange={(e) => patch('lage', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Mieter</Label>
          <Input
            value={einheit.mieterName ?? ''}
            onChange={(e) => patch('mieterName', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Wohnfläche (m²)</Label>
          <Input
            type="number"
            step={0.1}
            value={einheit.wohnflaeche}
            onChange={(e) => patch('wohnflaeche', Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Personen</Label>
          <Input
            type="number"
            value={einheit.personen}
            onChange={(e) => patch('personen', Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mietbeginn</Label>
          <Input
            type="date"
            value={einheit.mietbeginn}
            onChange={(e) => patch('mietbeginn', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mietende (optional)</Label>
          <Input
            type="date"
            value={einheit.mietende ?? ''}
            onChange={(e) => patch('mietende', e.target.value || undefined)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vorauszahlung Jahr (€)</Label>
          <Input
            type="number"
            step={1}
            value={einheit.vorauszahlungJahr}
            onChange={(e) => patch('vorauszahlungJahr', Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Wärmeverbrauch (kWh)</Label>
          <Input
            type="number"
            value={einheit.verbrauchWaerme}
            onChange={(e) => patch('verbrauchWaerme', Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Wasserverbrauch (m³)</Label>
          <Input
            type="number"
            value={einheit.verbrauchWasser}
            onChange={(e) => patch('verbrauchWasser', Number(e.target.value) || 0)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
