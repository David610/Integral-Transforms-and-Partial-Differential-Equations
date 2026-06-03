import { describe, expect, it } from 'vitest';
import { fristEnde, tageRestFrist } from './FristenBanner';

describe('FristenBanner-Fristlogik (§ 556 Abs. 3 BGB)', () => {
  it('die Abrechnungsfrist endet 12 Monate nach Periodenende', () => {
    expect(fristEnde('2025-12-31')).toBe('2026-12-31');
    expect(fristEnde('2024-02-29')).toBe('2025-02-28');
  });

  it('Resttage werden kalendertaggenau gegenüber heute berechnet', () => {
    // Ein in der Zukunft liegendes Periodenende hat eine positive Restfrist.
    const naechstesJahr = new Date().getUTCFullYear() + 1;
    expect(tageRestFrist(`${naechstesJahr}-12-31`)).toBeGreaterThan(0);

    // Eine lange zurückliegende Periode ist überzogen (negativ).
    expect(tageRestFrist('2000-12-31')).toBeLessThan(0);
  });
});
