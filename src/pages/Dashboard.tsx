import { Building2, Calendar, Euro, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FristenBanner } from '@/components/FristenBanner';
import { formatDatum, formatEuro, formatFlaeche } from '@/domain/format';
import { selectAbrechnung, useAppStore } from '@/store/useAppStore';

export function Dashboard() {
  const ergebnis = useAppStore(selectAbrechnung);
  const gebaeude = useAppStore((s) => s.gebaeude);
  const einheiten = useAppStore((s) => s.einheiten);
  const kostenpositionen = useAppStore((s) => s.kostenpositionen);
  const zeitraum = useAppStore((s) => s.zeitraum);

  const summeKosten = kostenpositionen.reduce((s, k) => s + k.betrag, 0);
  const umlagefaehig = kostenpositionen
    .filter((k) => k.umlagefaehig)
    .reduce((s, k) => s + k.betrag, 0);
  // hatLeerstand markiert jede nicht ganzjährige Belegung (echter Leerstand
  // ODER unterjähriger Mieterwechsel) – daher die neutrale Beschriftung.
  const teilzeitraum = ergebnis.mieter.filter((m) => m.hatLeerstand).length;
  const nachzahlungSumme = ergebnis.mieter
    .filter((m) => m.saldo > 0)
    .reduce((s, m) => s + m.saldo, 0);
  const guthabenSumme = ergebnis.mieter
    .filter((m) => m.saldo < 0)
    .reduce((s, m) => s + Math.abs(m.saldo), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Überblick {gebaeude.adresse}
        </p>
      </div>

      <FristenBanner periodeEnde={zeitraum.bis} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KennzahlCard
          icon={<Building2 className="h-4 w-4" />}
          label="Wohneinheiten"
          value={`${einheiten.length}`}
          sub={`${formatFlaeche(gebaeude.gesamtwohnflaeche)}`}
        />
        <KennzahlCard
          icon={<Users className="h-4 w-4" />}
          label="Personen"
          value={`${gebaeude.gesamtPersonen}`}
          sub={teilzeitraum > 0 ? `${teilzeitraum} mit Teilzeitraum` : 'alle ganzjährig belegt'}
        />
        <KennzahlCard
          icon={<Euro className="h-4 w-4" />}
          label="Kosten gesamt"
          value={formatEuro(summeKosten)}
          sub={`${formatEuro(umlagefaehig)} umlagefähig`}
        />
        <KennzahlCard
          icon={<Calendar className="h-4 w-4" />}
          label="Zeitraum"
          value={`${formatDatum(zeitraum.von)} – ${formatDatum(zeitraum.bis)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salden Übersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Nachzahlungen Mieter" value={formatEuro(nachzahlungSumme)} colorClass="text-destructive" />
            <Row label="Guthaben Mieter" value={formatEuro(guthabenSumme)} colorClass="text-success" />
            <div className="border-t pt-3">
              <Row
                label="Vermieteranteil (Leerstand, n. umlf., CO₂)"
                value={formatEuro(ergebnis.vermieterAnteil)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rechtsgrundlagen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">BetrKV § 2</strong> — Katalog
              umlagefähiger Betriebskosten (17 Positionen)
            </p>
            <p>
              <strong className="text-foreground">§ 556a BGB</strong> —
              Umlagemaßstäbe, Default: Wohnfläche
            </p>
            <p>
              <strong className="text-foreground">HeizkostenV § 7</strong> —
              Aufteilung Grund-/Verbrauchskosten (50–70 %)
            </p>
            <p>
              <strong className="text-foreground">CO2KostAufG</strong> —
              10-Stufenmodell zur Aufteilung CO₂-Kosten
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KennzahlCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <p className="text-xs uppercase tracking-wide">{label}</p>
        </div>
        <p className="num mt-2 text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-semibold ${colorClass ?? ''}`}>{value}</span>
    </div>
  );
}
