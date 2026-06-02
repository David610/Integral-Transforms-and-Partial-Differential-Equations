/**
 * Fristen-Banner gemäß § 556 Abs. 3 BGB.
 *
 * Berechnet aus dem Periodenende, wie viele Tage zur Abrechnung bzw. zur
 * Mieter-Einwendung verbleiben, und warnt rechtzeitig.
 */

import { AlertTriangle, Info } from 'lucide-react';
import { formatDatum } from '@/domain/format';
import { cn } from '@/lib/utils';

interface Props {
  periodeEnde: string;
}

export function FristenBanner({ periodeEnde }: Props) {
  const tageRest = tageRestFrist(periodeEnde);
  const frist = fristEnde(periodeEnde);
  const krit = tageRest < 60;
  const ueberzogen = tageRest < 0;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        ueberzogen
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : krit
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-border bg-muted/40 text-muted-foreground',
      )}
      role="status"
    >
      {ueberzogen || krit ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          Abrechnungsfrist § 556 Abs. 3 BGB
        </p>
        <p>
          Spätester Zugang beim Mieter: <strong>{formatDatum(frist)}</strong>{' '}
          {ueberzogen ? (
            <span>– Frist überschritten, Nachforderungen sind ausgeschlossen.</span>
          ) : (
            <span>– noch {tageRest} Tage. Einwendungsfrist Mieter: 12 Monate nach Zugang.</span>
          )}
        </p>
      </div>
    </div>
  );
}

function fristEnde(periodeEnde: string): string {
  const end = new Date(periodeEnde);
  end.setFullYear(end.getFullYear() + 1);
  return end.toISOString().slice(0, 10);
}

function tageRestFrist(periodeEnde: string): number {
  const heute = new Date();
  const frist = new Date(fristEnde(periodeEnde));
  const diffMs = frist.getTime() - heute.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
