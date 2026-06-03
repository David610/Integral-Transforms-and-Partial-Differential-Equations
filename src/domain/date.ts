const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

function parseIsoParts(iso: string): IsoDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isIsoDate(iso: string): boolean {
  return parseIsoParts(iso) !== null;
}

export function isoToUtcDay(iso: string): number | null {
  const parts = parseIsoParts(iso);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

export function isoToUtcDate(iso: string): Date | null {
  const parts = parseIsoParts(iso);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function todayIso(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
}

export function addYearsIso(iso: string, years: number): string {
  const parts = parseIsoParts(iso);
  if (!parts) return iso;
  const date = new Date(Date.UTC(parts.year + years, parts.month - 1, parts.day));
  return date.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = isoToUtcDay(startIso);
  const end = isoToUtcDay(endIso);
  if (start === null || end === null || end < start) return 0;
  return end - start + 1;
}

export function daysUntilIso(deadlineIso: string, fromIso = todayIso()): number {
  const deadline = isoToUtcDay(deadlineIso);
  const from = isoToUtcDay(fromIso);
  if (deadline === null || from === null) return 0;
  return deadline - from;
}
