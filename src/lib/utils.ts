export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRate(pencePerKwh: number): string {
  return `${pencePerKwh.toFixed(2)}p/kWh`;
}

export function formatStandingCharge(pencePerDay: number): string {
  return `${pencePerDay.toFixed(2)}p/day`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatUsage(kwh: number): string {
  return `${kwh.toLocaleString('en-GB')} kWh`;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-');
}
