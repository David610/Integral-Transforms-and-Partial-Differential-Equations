import { AbrechnungPreview } from '@/components/AbrechnungPreview';
import { FristenBanner } from '@/components/FristenBanner';
import { selectAbrechnung, useAppStore } from '@/store/useAppStore';

export function Abrechnung() {
  const ergebnis = useAppStore(selectAbrechnung);
  const periodeEnde = useAppStore((s) => s.zeitraum.bis);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abrechnung</h1>
        <p className="text-sm text-muted-foreground">
          Vorschau und PDF-Export je Mieter.
        </p>
      </div>
      <FristenBanner periodeEnde={periodeEnde} />
      <AbrechnungPreview ergebnis={ergebnis} />
    </div>
  );
}
