import { describe, expect, it } from 'vitest';
import { addYearsIso, daysBetweenInclusive, daysUntilIso, isoToUtcDay } from './date';
import { formatDatum } from './format';

describe('ISO-Datumshilfen', () => {
  it('formatiert YYYY-MM-DD ohne Zeitzonenverschiebung', () => {
    expect(formatDatum('2025-01-01')).toBe('01.01.2025');
    expect(formatDatum('2025-12-31')).toBe('31.12.2025');
  });

  it('laesst ungueltige Datumsstrings unveraendert', () => {
    expect(formatDatum('kein-datum')).toBe('kein-datum');
  });

  it('berechnet Fristen und Tagesdifferenzen kalendertaggenau', () => {
    expect(addYearsIso('2025-12-31', 1)).toBe('2026-12-31');
    expect(daysUntilIso('2026-12-31', '2025-12-31')).toBe(365);
    expect(daysBetweenInclusive('2025-01-01', '2025-12-31')).toBe(365);
  });

  it('parst gleiche ISO-Daten immer auf denselben UTC-Tag', () => {
    expect(isoToUtcDay('2025-06-01')).toBe(isoToUtcDay('2025-06-01'));
    expect(isoToUtcDay('2025-02-30')).toBeNull();
  });
});
