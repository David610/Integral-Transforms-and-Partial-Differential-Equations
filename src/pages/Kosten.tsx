import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KostenTable } from '@/components/KostenTable';
import { useAppStore } from '@/store/useAppStore';

export function Kosten() {
  const zeitraum = useAppStore((s) => s.zeitraum);
  const heiz = useAppStore((s) => s.heizkostenConfig);
  const co2 = useAppStore((s) => s.co2Config);
  const updateZeitraum = useAppStore((s) => s.updateZeitraum);
  const updateHeizkosten = useAppStore((s) => s.updateHeizkosten);
  const updateCo2 = useAppStore((s) => s.updateCo2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kosten & Konfiguration</h1>
        <p className="text-sm text-muted-foreground">
          Abrechnungszeitraum, Heizkostenverordnung, CO₂-Stufenmodell und Kostenpositionen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Abrechnungszeitraum</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Von</Label>
              <Input
                type="date"
                value={zeitraum.von}
                onChange={(e) => updateZeitraum({ von: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bis</Label>
              <Input
                type="date"
                value={zeitraum.bis}
                onChange={(e) => updateZeitraum({ bis: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HeizkostenV § 7</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Verbrauchsquote (0,5–0,7)</Label>
              <Input
                type="number"
                min={0.5}
                max={0.7}
                step={0.05}
                value={heiz.verbrauchsquote}
                onChange={(e) =>
                  updateHeizkosten({ verbrauchsquote: Number(e.target.value) || 0.7 })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Default 70 % Verbrauch / 30 % Fläche. Mieter-Kürzungsrecht von 15 %
              bei nicht verbrauchsabhängiger Abrechnung (§ 12).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CO2KostAufG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CO₂-Ausstoß (kg/m²/a)</Label>
                <Input
                  type="number"
                  step={1}
                  value={co2.spezifischerAusstoss}
                  onChange={(e) =>
                    updateCo2({ spezifischerAusstoss: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preis (€/t)</Label>
                <Input
                  type="number"
                  step={1}
                  value={co2.preisProTonne}
                  onChange={(e) => updateCo2({ preisProTonne: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              10-Stufenmodell. CO₂-Vermieteranteil mindert die umlagefähigen Heizkosten.
            </p>
          </CardContent>
        </Card>
      </div>

      <KostenTable />
    </div>
  );
}
