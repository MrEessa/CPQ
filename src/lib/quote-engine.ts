import {
  Customer,
  EligibilityResult,
  EligibilityRule,
  Product,
  Quote,
  QuoteLineItem,
  QuoteStatus,
  StatusEvent,
  UsageProfile,
} from '@/lib/types';
import { calculateCost } from '@/lib/pricing-engine';

// ─── Status transition graph ──────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['pending_review', 'issued'],
  pending_review: ['issued', 'draft'],
  issued: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
};

// ─── Eligibility ──────────────────────────────────────────────────────────────

function evaluateRule(rule: EligibilityRule, customer: Customer): boolean {
  const customerRecord = customer as unknown as Record<string, unknown>;
  const fieldValue = customerRecord[rule.field];

  switch (rule.operator) {
    case 'eq':
      return fieldValue === rule.value;
    case 'neq':
      return fieldValue !== rule.value;
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (rule.value as number);
    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= (rule.value as number);
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (rule.value as number);
    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= (rule.value as number);
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
    default:
      return false;
  }
}

export function checkEligibility(
  product: Product,
  customer: Customer,
): EligibilityResult {
  const failedReasons: string[] = [];
  const failedRules: EligibilityRule[] = [];

  for (const rule of product.eligibilityRules) {
    if (!evaluateRule(rule, customer)) {
      failedReasons.push(rule.description);
      failedRules.push(rule);
    }
  }

  return {
    eligible: failedReasons.length === 0,
    reasons: failedReasons,
    failedRules,
  };
}

// ─── Quote creation ───────────────────────────────────────────────────────────

function generateId(): string {
  return `qt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateReference(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `QT-${year}-${seq}`;
}

function validUntilDefault(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

export function createQuote(
  customer: Customer,
  products: Product[],
  usageKwh: number,
  usageProfile?: UsageProfile,
  annualExportKwh?: number,
): Quote {
  const now = new Date().toISOString();

  const lineItems: QuoteLineItem[] = products.map((product) => {
    const breakdown = calculateCost({ product, annualUsageKwh: usageKwh, annualExportKwh, usageProfile });
    return {
      productId: product.id,
      productName: product.name,
      pricingSnapshot: product.pricingStructure,
      estimatedAnnualCost: parseFloat(breakdown.subtotal.toFixed(2)),
    };
  });

  const estimatedAnnualCost = parseFloat(
    lineItems.reduce((sum, item) => sum + item.estimatedAnnualCost, 0).toFixed(2),
  );

  // Use the VAT rate from the first product's pricing structure for the total
  const vatRate =
    products.length > 0 ? products[0].pricingStructure.vatRate : 5;
  const totalWithVat = parseFloat(
    (estimatedAnnualCost * (1 + vatRate / 100)).toFixed(2),
  );

  return {
    id: generateId(),
    reference: generateReference(),
    status: 'draft',
    customerId: customer.id,
    customerName: customer.name,
    customerType: customer.customerType,
    products: lineItems,
    annualUsageKwh: usageKwh,
    ...(annualExportKwh !== undefined ? { annualExportKwh } : {}),
    estimatedAnnualCost,
    totalWithVat,
    validUntil: validUntilDefault(),
    createdAt: now,
    updatedAt: now,
    statusHistory: [],
  };
}

// ─── Status transitions ───────────────────────────────────────────────────────

export function advanceStatus(
  quote: Quote,
  newStatus: QuoteStatus,
  note?: string,
): Quote {
  const allowed = ALLOWED_TRANSITIONS[quote.status];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${quote.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
    );
  }

  const now = new Date().toISOString();

  const event: StatusEvent = {
    from: quote.status,
    to: newStatus,
    at: now,
    ...(note ? { note } : {}),
  };

  return {
    ...quote,
    status: newStatus,
    updatedAt: now,
    ...(newStatus === 'issued' ? { issuedAt: now } : {}),
    statusHistory: [...quote.statusHistory, event],
  };
}

export { ALLOWED_TRANSITIONS };
