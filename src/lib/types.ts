// ─── Market ───────────────────────────────────────────────────────────────────

export interface Market {
  code: string;
  name: string;
  currency: string;
  vatRate: number;
  regulatoryScheme: string;
}

// ─── Pricing structures ───────────────────────────────────────────────────────

export interface TimeWindow {
  daysOfWeek: number[]; // 0=Sun … 6=Sat
  startTime: string;    // 'HH:MM'
  endTime: string;      // 'HH:MM'
}

export interface TierRule {
  thresholdKwh: number;
  isOverThreshold: boolean;
}

export interface PricingRate {
  id: string;
  label: string;
  unitRate: number; // p/kWh
  timeWindows?: TimeWindow[];
  tier?: TierRule;
}

export interface Levy {
  name: string;
  ratePerKwh: number;
}

export interface PricingStructure {
  currency: string;
  standingCharge?: number; // p/day
  rates: PricingRate[];
  vatRate: number;         // percentage, e.g. 5
  levies?: Levy[];
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

export type EligibilityOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in';

export interface EligibilityRule {
  id: string;
  field: string;
  operator: EligibilityOperator;
  value: unknown;
  description: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductType =
  | 'flat_rate'
  | 'time_of_use'
  | 'dynamic'
  | 'export'
  | 'bundled';

export type ProductStatus = 'draft' | 'active' | 'deprecated';

export type FuelType = 'electricity' | 'gas' | 'dual_fuel' | 'ev';

export interface Product {
  id: string;
  name: string;
  description: string;
  productType: ProductType;
  fuelType: FuelType;
  status: ProductStatus;
  version: number;
  market: Market[];
  eligibilityRules: EligibilityRule[];
  pricingStructure: PricingStructure;
  bundleComponents?: string[]; // product IDs
  effectiveFrom: string;       // ISO date
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export type QuoteStatus =
  | 'draft'
  | 'pending_review'
  | 'issued'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type CustomerType = 'residential' | 'sme' | 'corporate';

export interface QuoteLineItem {
  productId: string;
  productName: string;
  pricingSnapshot: PricingStructure;
  estimatedAnnualCost: number;
}

export interface StatusEvent {
  from: QuoteStatus;
  to: QuoteStatus;
  at: string;
  note?: string;
}

export interface Quote {
  id: string;
  reference: string;
  status: QuoteStatus;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  products: QuoteLineItem[];
  annualUsageKwh: number;
  estimatedAnnualCost: number;
  totalWithVat: number;
  notes?: string;
  validUntil: string;
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusEvent[];
}

// ─── Pricing engine I/O ───────────────────────────────────────────────────────

export interface UsageProfile {
  peakPercent: number;
  offPeakPercent: number;
  nightPercent?: number;
}

export interface PricingInput {
  product: Product;
  annualUsageKwh: number;
  usageProfile?: UsageProfile;
}

export interface CostBreakdownLine {
  label: string;
  kwhUsed: number;
  unitRate: number;
  cost: number;
}

export interface CostBreakdown {
  standingChargeAnnual: number;
  rateLines: CostBreakdownLine[];
  leviesTotal: number;
  subtotal: number;
  vat: number;
  total: number;
}

// ─── Eligibility check result ─────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// ─── Customer (used in quote builder) ────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  customerType: CustomerType;
  annualUsageKwh: number;
  market: string; // market code e.g. 'GB'
  region?: string;
  meterType?: string;
}
