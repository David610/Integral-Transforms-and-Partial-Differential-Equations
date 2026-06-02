/**
 * Format-Helfer für deutsche Zahlen-, Währungs- und Datumsformate.
 */

const EUR = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUM2 = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUM0 = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatEuro(value: number): string {
  return EUR.format(value);
}

export function formatZahl(value: number, digits = 2): string {
  return digits === 0 ? NUM0.format(value) : NUM2.format(value);
}

export function formatProzent(value: number, digits = 2): string {
  return `${formatZahl(value * 100, digits)} %`;
}

export function formatDatum(iso: string): string {
  if (!iso) return '–';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return DATE.format(date);
}

export function formatFlaeche(value: number): string {
  return `${NUM2.format(value)} m²`;
}
