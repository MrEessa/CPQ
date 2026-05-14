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

export interface ProductVersionSnapshot {
  version: number;
  pricingStructure: PricingStructure;
  effectiveFrom: string;
  effectiveTo: string;
  updatedAt: string;
}

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
  versionHistory: ProductVersionSnapshot[];
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export type QuoteStatus =
  | 'draft'
  | 'pending_review'
  | 'issued'
  | 'accepted'
  | 'rejected'
  | 'expired';

export interface QuoteLineItem {
  productId: string;
  productName: string;
  pricingSnapshot: PricingStructure;
  usageProfile?: UsageProfile;
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
  annualExportKwh?: number;       // only set when quote includes an export tariff
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
  annualExportKwh?: number;   // overrides annualUsageKwh for export-type products
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
  failedRules: EligibilityRule[];
}

// === Customer Management ======================================================

export type CustomerType = 'residential' | 'sme' | 'ic';

export interface DeviceOwnership {
  hasEV?: boolean;
  hasSolar?: boolean;
  hasBattery?: boolean;
  hasHeatPump?: boolean;
}
export type CustomerStatus = 'active' | 'pending' | 'suspended' | 'closed';
export type MeterType = 'smart' | 'traditional' | 'prepayment';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  countryCode: string; // 'GB', 'IE', etc.
}

export interface Customer {
  id: string;
  accountRef: string;          // e.g. 'ACC-00001'
  name: string;
  customerType: CustomerType;
  status: CustomerStatus;
  supplyAddress: Address;
  billingAddress: Address;
  meterType: MeterType;
  mpan?: string;               // electricity meter point ref
  mprn?: string;               // gas meter point ref
  currentProducts: string[];   // product IDs
  annualUsageKwh: number;
  market: string;              // market code, e.g. 'GB'
  region?: string;             // used by eligibility rules
  supplyStartDate: string;     // ISO date
  contractEndDate?: string;
  balance: number;             // £ — positive = credit, negative = debt
  directDebitAmount?: number;  // £/month
  directDebitDay?: number;     // day of month 1–28
  hasEV?: boolean;
  hasSolar?: boolean;
  hasBattery?: boolean;
  hasHeatPump?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationChannel = 'email' | 'letter' | 'sms' | 'portal' | 'phone';
export type CommunicationStatus = 'sent' | 'delivered' | 'failed' | 'read';

export interface Communication {
  id: string;
  customerId: string;
  channel: CommunicationChannel;
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
  sentAt: string;
  status: CommunicationStatus;
  agentId?: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'closed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// === Billing ==================================================================

export type BillStatus = 'issued' | 'paid' | 'overdue' | 'disputed';
export type PaymentMethod = 'direct_debit' | 'card' | 'bank_transfer' | 'cheque';

export interface MeterReading {
  id: string;
  customerId: string;
  mpan?: string;
  mprn?: string;
  readingDate: string;
  readingKwh: number;
  source: 'smart' | 'customer' | 'estimated' | 'industry';
}

export interface Payment {
  id: string;
  billId: string;
  customerId: string;
  amount: number;      // £
  method: PaymentMethod;
  paidAt: string;
  reference?: string;
}

export interface Bill {
  id: string;
  customerId: string;
  productId: string;
  reference: string;   // e.g. 'BILL-2025-001'
  status: BillStatus;
  periodFrom: string;  // ISO date
  periodTo: string;
  usageKwh: number;
  breakdown: CostBreakdown;
  amountDue: number;   // = breakdown.total
  amountPaid: number;
  payments: Payment[];
  issuedAt: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

// === Debt & Collections =======================================================

export type PaymentPlanStatus = 'active' | 'completed' | 'breached' | 'cancelled';
export type InstalmentFrequency = 'weekly' | 'fortnightly' | 'monthly';
export type CollectionStage =
  | 'monitoring'
  | 'contact_attempted'
  | 'formal_notice'
  | 'field_visit'
  | 'legal';

export type VulnerabilityFlag =
  | 'financial_difficulty'
  | 'health_condition'
  | 'elderly'
  | 'young_children'
  | 'mental_health'
  | 'life_support';

export interface PlanInstalment {
  id: string;
  dueDate: string;
  amount: number;  // £
  paidAt?: string;
  status: 'pending' | 'paid' | 'missed';
}

export interface PaymentPlan {
  id: string;
  customerId: string;
  debtAccountId: string;
  status: PaymentPlanStatus;
  totalDebt: number;         // £ at plan creation
  instalmentAmount: number;  // £ per instalment
  frequency: InstalmentFrequency;
  instalments: PlanInstalment[];
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtAccount {
  id: string;
  customerId: string;
  debtAmount: number;          // £ at point of formal recognition
  currentBalance: number;      // £ remaining
  collectionStage: CollectionStage;
  vulnerabilityFlags: VulnerabilityFlag[];
  paymentPlanId?: string;
  lastContactDate?: string;
  nextActionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// === Finance ==================================================================

export type LedgerEntryType = 'charge' | 'payment' | 'credit' | 'adjustment' | 'refund';

export interface LedgerEntry {
  id: string;
  customerId?: string;
  billId?: string;
  paymentId?: string;
  type: LedgerEntryType;
  amount: number;      // £ — positive = revenue in, negative = refund/credit out
  description: string;
  effectiveDate: string;
  postedAt: string;
}

export interface MarginSummary {
  productId: string;
  productName: string;
  totalRevenue: number;        // £
  totalWholesaleCost: number;  // £
  grossMargin: number;         // £
  grossMarginPercent: number;  // %
  totalUsageKwh: number;
}

export type AuditEntryAction =
  | 'bill_generated'
  | 'payment_recorded'
  | 'quote_created'
  | 'quote_status_changed'
  | 'customer_updated'
  | 'plan_created'
  | 'plan_breached'
  | 'stage_advanced'
  | 'message_retried'
  | 'switch_objected'
  | 'meter_read_submitted'
  | 'compliance_item_updated';

export interface AuditEntry {
  id: string;
  action: AuditEntryAction;
  entityType: string;     // 'bill' | 'quote' | 'customer' | 'payment_plan' | etc.
  entityId: string;
  description: string;
  performedBy?: string;   // agent/user ref
  performedAt: string;
  meta?: Record<string, unknown>;
}

// === Market Communications ====================================================

export type MarketMessageType =
  | 'D0010'  // Meter read notification
  | 'D0052'  // Meter point registration
  | 'D0055'  // Supply data request
  | 'D0150'  // Data aggregation
  | 'D0301'  // Switch initiation
  | 'D0302'  // Switch confirmation
  | 'ERS'    // Erroneous registration
  | 'DC'     // Debt comms
  | 'other';

export type MarketMessageStatus =
  | 'sent'
  | 'acknowledged'
  | 'completed'
  | 'failed'
  | 'rejected';

export interface MarketMessage {
  id: string;
  type: MarketMessageType;
  status: MarketMessageStatus;
  customerId?: string;
  direction: 'inbound' | 'outbound';
  body: string;
  sentAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  retryCount: number;
  errorReason?: string;
}

export type SwitchType = 'gain' | 'loss';
export type SwitchStage =
  | 'initiated'
  | 'confirmed'
  | 'completed'
  | 'objected'
  | 'rejected';

export interface Switch {
  id: string;
  customerId: string;
  type: SwitchType;
  stage: SwitchStage;
  mpan?: string;
  mprn?: string;
  gainDate: string;        // scheduled effective date
  initiatedAt: string;
  completedAt?: string;
  objectedAt?: string;
  objectionReason?: string;
}

export type ComplianceStatus = 'open' | 'in_progress' | 'completed' | 'overdue';

export interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  status: ComplianceStatus;
  dueDate: string;
  assignedTo?: string;
  completedAt?: string;
  regulatoryReference?: string; // e.g. 'SLC 27.2'
}
