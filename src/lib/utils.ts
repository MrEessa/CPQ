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

// ─── Eligibility rule → plain English ────────────────────────────────────────

import { EligibilityRule } from '@/lib/types';

const FIELD_LABELS: Record<string, string> = {
  customerType: 'customer type',
  meterType: 'meter type',
  hasEV: 'EV ownership',
  hasSolar: 'solar panel installation',
  hasBattery: 'home battery',
  hasHeatPump: 'heat pump',
  annualUsageKwh: 'annual usage',
  region: 'region',
};

const METER_TYPE_LABELS: Record<string, string> = {
  smart: 'smart / AMR meter',
  traditional: 'traditional meter',
  prepayment: 'prepayment meter',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  sme: 'SME',
  ic: 'I&C',
};

function labelValue(field: string, value: unknown): string {
  if (field === 'meterType' && typeof value === 'string') {
    return METER_TYPE_LABELS[value] ?? value;
  }
  if (field === 'customerType' && typeof value === 'string') {
    return CUSTOMER_TYPE_LABELS[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => (field === 'customerType' ? CUSTOMER_TYPE_LABELS[v as string] ?? v : String(v)))
      .join(' and ');
  }
  return String(value);
}

export function describeRule(rule: EligibilityRule): string {
  const { field, operator, value } = rule;

  // Device-ownership boolean rules
  if (field === 'hasEV' && operator === 'eq' && value === true) {
    return 'Customer must own an electric vehicle (EV)';
  }
  if (field === 'hasEV' && operator === 'eq' && value === false) {
    return 'Customer must not own an EV';
  }
  if (field === 'hasSolar' && operator === 'eq' && value === true) {
    return 'Customer must have solar panels installed';
  }
  if (field === 'hasBattery' && operator === 'eq' && value === true) {
    return 'Customer must have a home battery installed';
  }
  if (field === 'hasHeatPump' && operator === 'eq' && value === true) {
    return 'Customer must have a heat pump installed';
  }

  // Meter type
  if (field === 'meterType' && operator === 'eq') {
    return `Customer must have a ${labelValue(field, value)}`;
  }
  if (field === 'meterType' && operator === 'neq') {
    return `Not available for ${labelValue(field, value)} sites`;
  }

  // Customer type
  if (field === 'customerType' && operator === 'in' && Array.isArray(value)) {
    return `Available to ${labelValue(field, value)} customers only`;
  }
  if (field === 'customerType' && operator === 'not_in' && Array.isArray(value)) {
    return `Not available to ${labelValue(field, value)} customers`;
  }

  // Annual usage thresholds
  if (field === 'annualUsageKwh') {
    const kwh = Number(value).toLocaleString('en-GB');
    if (operator === 'gte') return `Annual usage must be ${kwh} kWh or more`;
    if (operator === 'gt') return `Annual usage must be more than ${kwh} kWh`;
    if (operator === 'lte') return `Annual usage must not exceed ${kwh} kWh`;
    if (operator === 'lt') return `Annual usage must be less than ${kwh} kWh`;
  }

  // Region
  if (field === 'region' && operator === 'in' && Array.isArray(value)) {
    return `Available in ${(value as string[]).join(', ')} only`;
  }
  if (field === 'region' && operator === 'eq') {
    return `Available in ${value} only`;
  }

  // Generic fallback
  const fieldLabel = FIELD_LABELS[field] ?? field;
  const opLabel: Record<string, string> = {
    eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', in: 'in', not_in: 'not in',
  };
  return `${fieldLabel} ${opLabel[operator] ?? operator} ${Array.isArray(value) ? `[${(value as unknown[]).join(', ')}]` : String(value)}`;
}
