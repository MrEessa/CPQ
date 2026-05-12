import { Bill, CostBreakdown, Payment, PricingStructure } from '@/lib/types';

// ─── Billing computation helper ───────────────────────────────────────────────
//
// Mirrors the formula in pricing-engine.ts so bill totals reconcile exactly
// with calculateCost() output. Uses the product's own pricingStructure directly
// (avoids bundle-component lookup issues at seed-init time) and accepts a
// daysInPeriod arg so the standing charge reflects the actual billing period
// rather than a full 365-day year.

const PENCE_PER_POUND = 100;
const DEFAULT_PEAK_PERCENT = 60;
const DEFAULT_OFF_PEAK_PERCENT = 40;

function computeBillBreakdown(
  pricing: PricingStructure,
  usageKwh: number,
  daysInPeriod: number,
): CostBreakdown {
  const { standingCharge = 0, rates, vatRate, levies = [] } = pricing;

  const standingChargeAnnual = (standingCharge * daysInPeriod) / PENCE_PER_POUND;

  const rateLines = rates.map((rate, index) => {
    let kwhUsed: number;
    if (rates.length === 1) {
      kwhUsed = usageKwh;
    } else if (index === 0) {
      kwhUsed = (usageKwh * DEFAULT_PEAK_PERCENT) / 100;
    } else if (index === rates.length - 1) {
      kwhUsed = (usageKwh * DEFAULT_OFF_PEAK_PERCENT) / 100;
    } else {
      const remaining = 100 - DEFAULT_PEAK_PERCENT - DEFAULT_OFF_PEAK_PERCENT;
      const middleBands = rates.length - 2;
      kwhUsed = (usageKwh * (remaining / middleBands)) / 100;
    }
    const cost = (kwhUsed * rate.unitRate) / PENCE_PER_POUND;
    return { label: rate.label, kwhUsed, unitRate: rate.unitRate, cost };
  });

  const leviesTotal =
    levies.reduce((sum, levy) => sum + levy.ratePerKwh * usageKwh, 0) / PENCE_PER_POUND;

  const ratesCost = rateLines.reduce((sum, l) => sum + l.cost, 0);
  const subtotal = standingChargeAnnual + ratesCost + leviesTotal;
  const vat = (subtotal * vatRate) / PENCE_PER_POUND;
  const total = subtotal + vat;

  return { standingChargeAnnual, rateLines, leviesTotal, subtotal, vat, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Product pricing structures (inline so seed is self-contained) ────────────

// prod-001 StandardElec-v2
const P001: PricingStructure = {
  currency: 'GBP',
  standingCharge: 61.64,
  rates: [{ id: 'rate-001-1', label: 'Unit Rate', unitRate: 24.5 }],
  vatRate: 5,
  levies: [
    { name: 'Renewables Obligation', ratePerKwh: 1.96 },
    { name: 'Feed-in Tariff (FIT)', ratePerKwh: 0.18 },
  ],
};

// prod-002 EcoTOU-v1
const P002: PricingStructure = {
  currency: 'GBP',
  standingCharge: 55.0,
  rates: [
    { id: 'rate-002-1', label: 'Day Rate', unitRate: 28.0 },
    { id: 'rate-002-2', label: 'Night Rate', unitRate: 14.0 },
  ],
  vatRate: 5,
  levies: [{ name: 'Renewables Obligation', ratePerKwh: 1.96 }],
};

// prod-003 AgileElec-v1
const P003: PricingStructure = {
  currency: 'GBP',
  standingCharge: 50.0,
  rates: [
    { id: 'rate-003-1', label: 'Off-Peak', unitRate: 18.0 },
    { id: 'rate-003-2', label: 'Standard', unitRate: 28.5 },
    { id: 'rate-003-3', label: 'Peak', unitRate: 45.0 },
  ],
  vatRate: 5,
  levies: [{ name: 'Renewables Obligation', ratePerKwh: 1.96 }],
};

// prod-005 GreenBundle-v1 (own pricing structure — bundle components not
// resolvable at seed-init time, so the bundle's own rates are used directly,
// matching the pricing-engine fallback path)
const P005: PricingStructure = {
  currency: 'GBP',
  standingCharge: 118.0,
  rates: [
    { id: 'rate-005-1', label: 'Electricity Unit Rate', unitRate: 23.5 },
    { id: 'rate-005-2', label: 'Gas Unit Rate', unitRate: 6.24 },
  ],
  vatRate: 5,
  levies: [{ name: 'Renewables Obligation', ratePerKwh: 1.96 }],
};

// prod-006 IEFlatElec-v1
const P006: PricingStructure = {
  currency: 'EUR',
  standingCharge: 55.00,
  rates: [{ id: 'rate-006-1', label: 'Unit Rate', unitRate: 32.8 }],
  vatRate: 13.5,
};

// ─── Bill factory ─────────────────────────────────────────────────────────────

type BillStatusInput = 'paid' | 'overdue' | 'issued' | 'disputed';

function makeBill(opts: {
  id: string;
  customerId: string;
  productId: string;
  ref: string;
  status: BillStatusInput;
  periodFrom: string;
  periodTo: string;
  daysInPeriod: number;
  usageKwh: number;
  pricing: PricingStructure;
  issuedAt: string;
  dueDate: string;
  createdAt: string;
  amountPaid?: number; // overrides full-payment assumption
  payments?: Payment[];
}): Bill {
  const breakdown = computeBillBreakdown(opts.pricing, opts.usageKwh, opts.daysInPeriod);
  const amountDue = round2(breakdown.total);
  const amountPaid = opts.amountPaid !== undefined ? opts.amountPaid : opts.status === 'paid' ? amountDue : 0;

  return {
    id: opts.id,
    customerId: opts.customerId,
    productId: opts.productId,
    reference: opts.ref,
    status: opts.status,
    periodFrom: opts.periodFrom,
    periodTo: opts.periodTo,
    usageKwh: opts.usageKwh,
    breakdown,
    amountDue,
    amountPaid: round2(amountPaid),
    payments: opts.payments ?? (opts.status === 'paid' ? [{
      id: `pay-${opts.id}`,
      billId: opts.id,
      customerId: opts.customerId,
      amount: amountDue,
      method: 'direct_debit',
      paidAt: opts.dueDate,
      reference: `DD-${opts.ref}`,
    }] : []),
    issuedAt: opts.issuedAt,
    dueDate: opts.dueDate,
    createdAt: opts.createdAt,
    updatedAt: opts.createdAt,
  };
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export const SEED_BILLS: Bill[] = [
  // ── cust-001 Sarah Mitchell (prod-001, 3500 kWh/yr, ~292 kWh/month) ─────────
  makeBill({
    id: 'bill-001', customerId: 'cust-001', productId: 'prod-001',
    ref: 'BILL-2026-001', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 292,
    pricing: P001, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-002', customerId: 'cust-001', productId: 'prod-001',
    ref: 'BILL-2026-002', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 263,
    pricing: P001, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-003', customerId: 'cust-001', productId: 'prod-001',
    ref: 'BILL-2026-003', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 292,
    pricing: P001, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-002 James Thornton (prod-002, 4200 kWh/yr, ~350 kWh/month) ─────────
  makeBill({
    id: 'bill-004', customerId: 'cust-002', productId: 'prod-002',
    ref: 'BILL-2026-004', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 350,
    pricing: P002, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-005', customerId: 'cust-002', productId: 'prod-002',
    ref: 'BILL-2026-005', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 316,
    pricing: P002, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-006', customerId: 'cust-002', productId: 'prod-002',
    ref: 'BILL-2026-006', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 350,
    pricing: P002, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-003 Emma Clarke (prod-001, 3800 kWh/yr, ~317 kWh/month) ─────────────
  // balance -£85.20: Feb overdue with partial payment (amountPaid=21.60)
  makeBill({
    id: 'bill-007', customerId: 'cust-003', productId: 'prod-001',
    ref: 'BILL-2026-007', status: 'paid',
    periodFrom: '2025-12-01', periodTo: '2025-12-31', daysInPeriod: 31, usageKwh: 317,
    pricing: P001, issuedAt: '2026-01-02T08:00:00Z', dueDate: '2026-01-16',
    createdAt: '2026-01-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-008', customerId: 'cust-003', productId: 'prod-001',
    ref: 'BILL-2026-008', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 317,
    pricing: P001, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-009', customerId: 'cust-003', productId: 'prod-001',
    ref: 'BILL-2026-009', status: 'overdue',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 285,
    pricing: P001, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
    amountPaid: 21.60,
    payments: [{
      id: 'pay-bill-009',
      billId: 'bill-009',
      customerId: 'cust-003',
      amount: 21.60,
      method: 'bank_transfer',
      paidAt: '2026-03-20T00:00:00Z',
      reference: 'BACS-20260320-003',
    }],
  }),

  // ── cust-004 Harlow Manufacturing (prod-003, 47000 kWh/yr, ~3917 kWh/month) ─
  makeBill({
    id: 'bill-010', customerId: 'cust-004', productId: 'prod-003',
    ref: 'BILL-2026-010', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 3917,
    pricing: P003, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-011', customerId: 'cust-004', productId: 'prod-003',
    ref: 'BILL-2026-011', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 3528,
    pricing: P003, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-012', customerId: 'cust-004', productId: 'prod-003',
    ref: 'BILL-2026-012', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 3917,
    pricing: P003, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-005 Greenleaf Homes (prod-001, 12500 kWh/yr, ~1042 kWh/month) ───────
  // balance -£231.94: March overdue, partial payment of £79.60
  makeBill({
    id: 'bill-013', customerId: 'cust-005', productId: 'prod-001',
    ref: 'BILL-2026-013', status: 'paid',
    periodFrom: '2025-12-01', periodTo: '2025-12-31', daysInPeriod: 31, usageKwh: 1042,
    pricing: P001, issuedAt: '2026-01-02T08:00:00Z', dueDate: '2026-01-16',
    createdAt: '2026-01-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-014', customerId: 'cust-005', productId: 'prod-001',
    ref: 'BILL-2026-014', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 1042,
    pricing: P001, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-015', customerId: 'cust-005', productId: 'prod-001',
    ref: 'BILL-2026-015', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 938,
    pricing: P001, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-016', customerId: 'cust-005', productId: 'prod-001',
    ref: 'BILL-2026-016', status: 'overdue',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 1042,
    pricing: P001, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
    amountPaid: 79.60,
    payments: [{
      id: 'pay-bill-016',
      billId: 'bill-016',
      customerId: 'cust-005',
      amount: 79.60,
      method: 'bank_transfer',
      paidAt: '2026-04-18T00:00:00Z',
      reference: 'BACS-20260418-005',
    }],
  }),

  // ── cust-006 Riverside Retail (prod-002, 9500 kWh/yr, ~792 kWh/month) ────────
  makeBill({
    id: 'bill-017', customerId: 'cust-006', productId: 'prod-002',
    ref: 'BILL-2026-017', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 792,
    pricing: P002, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-018', customerId: 'cust-006', productId: 'prod-002',
    ref: 'BILL-2026-018', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 713,
    pricing: P002, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-019', customerId: 'cust-006', productId: 'prod-002',
    ref: 'BILL-2026-019', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 792,
    pricing: P002, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-007 Priya Patel (prod-001, 2800 kWh/yr, ~233 kWh/month) ─────────────
  makeBill({
    id: 'bill-020', customerId: 'cust-007', productId: 'prod-001',
    ref: 'BILL-2026-020', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 233,
    pricing: P001, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-021', customerId: 'cust-007', productId: 'prod-001',
    ref: 'BILL-2026-021', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 210,
    pricing: P001, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-022', customerId: 'cust-007', productId: 'prod-001',
    ref: 'BILL-2026-022', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 233,
    pricing: P001, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-008 David Okafor (prod-005, 4500 kWh/yr, ~375 kWh/month) ────────────
  // balance -£111.48: March overdue, no payment yet
  makeBill({
    id: 'bill-023', customerId: 'cust-008', productId: 'prod-005',
    ref: 'BILL-2026-023', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 375,
    pricing: P005, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-024', customerId: 'cust-008', productId: 'prod-005',
    ref: 'BILL-2026-024', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 338,
    pricing: P005, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-025', customerId: 'cust-008', productId: 'prod-005',
    ref: 'BILL-2026-025', status: 'overdue',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 375,
    pricing: P005, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-009 Sunrise Community Solar (prod-002, 8200 kWh/yr, ~683 kWh/month) ─
  // March bill disputed
  makeBill({
    id: 'bill-026', customerId: 'cust-009', productId: 'prod-002',
    ref: 'BILL-2026-026', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 683,
    pricing: P002, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-027', customerId: 'cust-009', productId: 'prod-002',
    ref: 'BILL-2026-027', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 615,
    pricing: P002, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-028', customerId: 'cust-009', productId: 'prod-002',
    ref: 'BILL-2026-028', status: 'disputed',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 683,
    pricing: P002, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-010 Fairview Properties (prod-005, 3500 kWh/yr, ~292 kWh/month) ─────
  makeBill({
    id: 'bill-029', customerId: 'cust-010', productId: 'prod-005',
    ref: 'BILL-2026-029', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 292,
    pricing: P005, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-030', customerId: 'cust-010', productId: 'prod-005',
    ref: 'BILL-2026-030', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 263,
    pricing: P005, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-031', customerId: 'cust-010', productId: 'prod-005',
    ref: 'BILL-2026-031', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 292,
    pricing: P005, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-011 Margaret Wilson (prod-001, 3300 kWh/yr, ~275 kWh/month) ─────────
  // Suspended — 6 months overdue, balance -£579.37
  makeBill({
    id: 'bill-032', customerId: 'cust-011', productId: 'prod-001',
    ref: 'BILL-2025-032', status: 'overdue',
    periodFrom: '2025-10-01', periodTo: '2025-10-31', daysInPeriod: 31, usageKwh: 275,
    pricing: P001, issuedAt: '2025-11-02T08:00:00Z', dueDate: '2025-11-16',
    createdAt: '2025-11-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-033', customerId: 'cust-011', productId: 'prod-001',
    ref: 'BILL-2025-033', status: 'overdue',
    periodFrom: '2025-11-01', periodTo: '2025-11-30', daysInPeriod: 30, usageKwh: 275,
    pricing: P001, issuedAt: '2025-12-02T08:00:00Z', dueDate: '2025-12-16',
    createdAt: '2025-12-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-034', customerId: 'cust-011', productId: 'prod-001',
    ref: 'BILL-2025-034', status: 'overdue',
    periodFrom: '2025-12-01', periodTo: '2025-12-31', daysInPeriod: 31, usageKwh: 275,
    pricing: P001, issuedAt: '2026-01-02T08:00:00Z', dueDate: '2026-01-16',
    createdAt: '2026-01-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-035', customerId: 'cust-011', productId: 'prod-001',
    ref: 'BILL-2026-035', status: 'overdue',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 275,
    pricing: P001, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-036', customerId: 'cust-011', productId: 'prod-001',
    ref: 'BILL-2026-036', status: 'overdue',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 248,
    pricing: P001, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-037', customerId: 'cust-011', productId: 'prod-001',
    ref: 'BILL-2026-037', status: 'overdue',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 275,
    pricing: P001, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),

  // ── cust-012 Northern Wind Energy (prod-003, 120000 kWh/yr, ~10000 kWh/month) ─
  // balance -£1243.16: March overdue with partial payment of £2002.92
  makeBill({
    id: 'bill-038', customerId: 'cust-012', productId: 'prod-003',
    ref: 'BILL-2026-038', status: 'paid',
    periodFrom: '2026-01-01', periodTo: '2026-01-31', daysInPeriod: 31, usageKwh: 10000,
    pricing: P003, issuedAt: '2026-02-02T08:00:00Z', dueDate: '2026-02-16',
    createdAt: '2026-02-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-039', customerId: 'cust-012', productId: 'prod-003',
    ref: 'BILL-2026-039', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 9000,
    pricing: P003, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-040', customerId: 'cust-012', productId: 'prod-003',
    ref: 'BILL-2026-040', status: 'overdue',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 10000,
    pricing: P003, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
    amountPaid: 2002.92,
    payments: [{
      id: 'pay-bill-040',
      billId: 'bill-040',
      customerId: 'cust-012',
      amount: 2002.92,
      method: 'bank_transfer',
      paidAt: '2026-04-18T00:00:00Z',
      reference: 'CHAPS-20260418-012',
    }],
  }),

  // ── cust-013 Galway Precision Engineering (prod-006, 25000 kWh/yr, ~2083 kWh/month) ─
  // EUR bills — demonstrates currency-aware rendering
  makeBill({
    id: 'bill-041', customerId: 'cust-013', productId: 'prod-006',
    ref: 'BILL-2026-041', status: 'paid',
    periodFrom: '2026-02-01', periodTo: '2026-02-28', daysInPeriod: 28, usageKwh: 1917,
    pricing: P006, issuedAt: '2026-03-02T08:00:00Z', dueDate: '2026-03-16',
    createdAt: '2026-03-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-042', customerId: 'cust-013', productId: 'prod-006',
    ref: 'BILL-2026-042', status: 'paid',
    periodFrom: '2026-03-01', periodTo: '2026-03-31', daysInPeriod: 31, usageKwh: 2083,
    pricing: P006, issuedAt: '2026-04-02T08:00:00Z', dueDate: '2026-04-16',
    createdAt: '2026-04-02T08:00:00Z',
  }),
  makeBill({
    id: 'bill-043', customerId: 'cust-013', productId: 'prod-006',
    ref: 'BILL-2026-043', status: 'issued',
    periodFrom: '2026-04-01', periodTo: '2026-04-30', daysInPeriod: 30, usageKwh: 2083,
    pricing: P006, issuedAt: '2026-05-02T08:00:00Z', dueDate: '2026-05-16',
    createdAt: '2026-05-02T08:00:00Z',
  }),
];
