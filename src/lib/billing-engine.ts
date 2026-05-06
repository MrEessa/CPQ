import { Bill, CostBreakdown, Customer, Product } from '@/lib/types';

const PENCE_PER_POUND = 100;

// Default TOU apportionment when no profile is given — mirrors pricing-engine defaults
const DEFAULT_PEAK_PERCENT = 60;
const DEFAULT_OFF_PEAK_PERCENT = 40;

// Computes a cost breakdown for an actual billing period (not annualised).
// Standing charge scales to daysInPeriod; rates apply to the measured usageKwh.
function computePeriodBreakdown(
  product: Product,
  usageKwh: number,
  daysInPeriod: number,
): CostBreakdown {
  const { standingCharge = 0, rates, vatRate, levies = [] } = product.pricingStructure;

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
  const vat = (subtotal * vatRate) / 100;
  const total = subtotal + vat;

  return { standingChargeAnnual, rateLines, leviesTotal, subtotal, vat, total };
}

function daysBetween(from: string, to: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay);
}

let billSeq = 1000;

function generateBillReference(): string {
  billSeq += 1;
  return `BILL-${new Date().getFullYear()}-${String(billSeq).padStart(3, '0')}`;
}

export function generateBill(
  customer: Customer,
  product: Product,
  periodFrom: string,
  periodTo: string,
  usageKwh: number,
): Bill {
  const now = new Date().toISOString();
  const daysInPeriod = daysBetween(periodFrom, periodTo);
  const breakdown = computePeriodBreakdown(product, usageKwh, daysInPeriod);
  const amountDue = parseFloat(breakdown.total.toFixed(2));

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  return {
    id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerId: customer.id,
    productId: product.id,
    reference: generateBillReference(),
    status: 'issued',
    periodFrom,
    periodTo,
    usageKwh,
    breakdown,
    amountDue,
    amountPaid: 0,
    payments: [],
    issuedAt: now,
    dueDate: dueDate.toISOString().split('T')[0],
    createdAt: now,
    updatedAt: now,
  };
}
