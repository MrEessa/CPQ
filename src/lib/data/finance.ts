import {
  AuditEntry,
  AuditEntryAction,
  Customer,
  LedgerEntry,
  LedgerEntryType,
  MarginSummary,
} from '@/lib/types';
import {
  SEED_AUDIT_ENTRIES,
  SEED_BILLS,
  SEED_CUSTOMERS,
  SEED_LEDGER_ENTRIES,
} from '@/lib/data/seed';
import { getProductById } from '@/lib/data/products';

// Single wholesale cost constant — shared with Analytics so both screens agree
export const WHOLESALE_COST_PER_KWH = 0.18; // £/kWh

let ledgerStore: LedgerEntry[] = structuredClone(SEED_LEDGER_ENTRIES);
let auditStore: AuditEntry[] = structuredClone(SEED_AUDIT_ENTRIES);

// ─── Ledger ───────────────────────────────────────────────────────────────────

interface LedgerFilters {
  customerId?: string;
  type?: LedgerEntryType;
  from?: string; // ISO date
  to?: string;   // ISO date
}

export function getLedgerEntries(filters?: LedgerFilters): LedgerEntry[] {
  let result = ledgerStore;

  if (filters?.customerId) {
    result = result.filter((e) => e.customerId === filters.customerId);
  }
  if (filters?.type) {
    result = result.filter((e) => e.type === filters.type);
  }
  if (filters?.from) {
    result = result.filter((e) => e.effectiveDate >= filters.from!);
  }
  if (filters?.to) {
    result = result.filter((e) => e.effectiveDate <= filters.to!);
  }

  return [...result].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
}

export function appendLedgerEntry(
  draft: Omit<LedgerEntry, 'id' | 'postedAt'>,
): LedgerEntry {
  const entry: LedgerEntry = {
    ...structuredClone(draft),
    id: `led-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    postedAt: new Date().toISOString(),
  };
  ledgerStore = [...ledgerStore, entry];
  return entry;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

interface AuditFilters {
  entityType?: string;
  entityId?: string;
  action?: AuditEntryAction;
}

export function getAuditEntries(filters?: AuditFilters): AuditEntry[] {
  let result = auditStore;

  if (filters?.entityType) {
    result = result.filter((e) => e.entityType === filters.entityType);
  }
  if (filters?.entityId) {
    result = result.filter((e) => e.entityId === filters.entityId);
  }
  if (filters?.action) {
    result = result.filter((e) => e.action === filters.action);
  }

  return [...result].sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

// Called by all mutators across the data layer to maintain a live audit trail
export function appendAuditEntry(
  draft: Omit<AuditEntry, 'id' | 'performedAt'>,
): AuditEntry {
  const entry: AuditEntry = {
    ...structuredClone(draft),
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    performedAt: new Date().toISOString(),
  };
  auditStore = [...auditStore, entry];
  return entry;
}

// ─── Margin summary ───────────────────────────────────────────────────────────

// Reads SEED_BILLS directly (not the live store) so finance.ts avoids a
// circular dependency with bills.ts. Aggregate analytics are seed-based.
export function getMarginSummary(): MarginSummary[] {
  const byProduct = new Map<string, { totalRevenue: number; totalUsageKwh: number }>();

  for (const bill of SEED_BILLS) {
    const existing = byProduct.get(bill.productId) ?? { totalRevenue: 0, totalUsageKwh: 0 };
    byProduct.set(bill.productId, {
      totalRevenue: existing.totalRevenue + bill.breakdown.total,
      totalUsageKwh: existing.totalUsageKwh + bill.usageKwh,
    });
  }

  return Array.from(byProduct.entries()).map(([productId, agg]) => {
    const product = getProductById(productId);
    const totalWholesaleCost = agg.totalUsageKwh * WHOLESALE_COST_PER_KWH;
    const grossMargin = agg.totalRevenue - totalWholesaleCost;
    const grossMarginPercent =
      agg.totalRevenue > 0 ? (grossMargin / agg.totalRevenue) * 100 : 0;

    return {
      productId,
      productName: product?.name ?? productId,
      totalRevenue: parseFloat(agg.totalRevenue.toFixed(2)),
      totalWholesaleCost: parseFloat(totalWholesaleCost.toFixed(2)),
      grossMargin: parseFloat(grossMargin.toFixed(2)),
      grossMarginPercent: parseFloat(grossMarginPercent.toFixed(1)),
      totalUsageKwh: agg.totalUsageKwh,
    } satisfies MarginSummary;
  });
}

// ─── Unbilled accounts ────────────────────────────────────────────────────────

// Customers are considered unbilled if they have active products but no bill
// issued within the last 60 days. Uses SEED_BILLS to avoid circular deps.
const UNBILLED_THRESHOLD_DAYS = 60;

export function getUnbilledAccounts(): Customer[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - UNBILLED_THRESHOLD_DAYS);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const recentlyBilledIds = new Set(
    SEED_BILLS
      .filter((b) => b.issuedAt >= cutoffStr)
      .map((b) => b.customerId),
  );

  return SEED_CUSTOMERS.filter(
    (c) =>
      c.status === 'active' &&
      c.currentProducts.length > 0 &&
      !recentlyBilledIds.has(c.id),
  );
}
