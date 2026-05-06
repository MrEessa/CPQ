import {
  CollectionStage,
  DebtAccount,
  PaymentPlan,
  PaymentPlanStatus,
  VulnerabilityFlag,
} from '@/lib/types';
import { SEED_DEBT_ACCOUNTS, SEED_PAYMENT_PLANS } from '@/lib/data/seed';
import { appendAuditEntry } from '@/lib/data/finance';
import {
  buildPaymentPlan,
  CreatePlanInput,
  isValidStageAdvance,
  markInstalmentPaid,
  markPlanBreached,
} from '@/lib/debt-engine';

let debtStore: DebtAccount[] = structuredClone(SEED_DEBT_ACCOUNTS);
let planStore: PaymentPlan[] = structuredClone(SEED_PAYMENT_PLANS);

// ─── Getters ──────────────────────────────────────────────────────────────────

export function getDebtAccounts(filters?: {
  customerId?: string;
  stage?: CollectionStage;
}): DebtAccount[] {
  let result = debtStore;
  if (filters?.customerId) {
    result = result.filter((d) => d.customerId === filters.customerId);
  }
  if (filters?.stage) {
    result = result.filter((d) => d.collectionStage === filters.stage);
  }
  return result;
}

export function getDebtAccountById(id: string): DebtAccount | undefined {
  return debtStore.find((d) => d.id === id);
}

export function getDebtAccountByCustomerId(customerId: string): DebtAccount | undefined {
  return debtStore.find((d) => d.customerId === customerId);
}

export function getPaymentPlans(filters?: {
  customerId?: string;
  status?: PaymentPlanStatus;
}): PaymentPlan[] {
  let result = planStore;
  if (filters?.customerId) {
    result = result.filter((p) => p.customerId === filters.customerId);
  }
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }
  return result;
}

export function getPaymentPlanById(id: string): PaymentPlan | undefined {
  return planStore.find((p) => p.id === id);
}

// ─── Plan creation ────────────────────────────────────────────────────────────

export function createPaymentPlan(input: CreatePlanInput): PaymentPlan {
  const plan: PaymentPlan = {
    ...buildPaymentPlan(input),
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  planStore = [...planStore, plan];

  // Link plan to its debt account
  const debtIdx = debtStore.findIndex((d) => d.id === input.debtAccountId);
  if (debtIdx !== -1) {
    const updated: DebtAccount = {
      ...debtStore[debtIdx],
      paymentPlanId: plan.id,
      updatedAt: new Date().toISOString(),
    };
    debtStore = [...debtStore.slice(0, debtIdx), updated, ...debtStore.slice(debtIdx + 1)];
  }

  appendAuditEntry({
    action: 'plan_created',
    entityType: 'payment_plan',
    entityId: plan.id,
    description: `Payment plan created for customer ${input.customerId} — £${input.totalDebt.toFixed(2)} over ${plan.instalments.length} instalments`,
    meta: { debtAccountId: input.debtAccountId, totalDebt: input.totalDebt, frequency: input.frequency },
  });

  return plan;
}

// ─── Instalment recording ─────────────────────────────────────────────────────

export function recordInstalment(planId: string, instalmentId: string): PaymentPlan | undefined {
  const index = planStore.findIndex((p) => p.id === planId);
  if (index === -1) return undefined;

  const updated = markInstalmentPaid(planStore[index], instalmentId);
  planStore = [...planStore.slice(0, index), updated, ...planStore.slice(index + 1)];

  appendAuditEntry({
    action: 'payment_recorded',
    entityType: 'payment_plan',
    entityId: planId,
    description: `Instalment ${instalmentId} marked paid on plan ${planId}`,
  });

  return updated;
}

// ─── Plan breach ──────────────────────────────────────────────────────────────

export function breachPlan(planId: string): PaymentPlan | undefined {
  const index = planStore.findIndex((p) => p.id === planId);
  if (index === -1) return undefined;

  const updated = markPlanBreached(planStore[index]);
  planStore = [...planStore.slice(0, index), updated, ...planStore.slice(index + 1)];

  appendAuditEntry({
    action: 'plan_breached',
    entityType: 'payment_plan',
    entityId: planId,
    description: `Payment plan ${planId} breached`,
  });

  return updated;
}

// ─── Collection stage ─────────────────────────────────────────────────────────

export function advanceCollectionStage(
  debtAccountId: string,
  newStage: CollectionStage,
): DebtAccount | undefined {
  const index = debtStore.findIndex((d) => d.id === debtAccountId);
  if (index === -1) return undefined;

  const current = debtStore[index];
  if (!isValidStageAdvance(current.collectionStage, newStage)) {
    throw new Error(
      `Invalid stage advance: ${current.collectionStage} → ${newStage}. Stage must advance forward.`,
    );
  }

  const updated: DebtAccount = {
    ...current,
    collectionStage: newStage,
    updatedAt: new Date().toISOString(),
  };
  debtStore = [...debtStore.slice(0, index), updated, ...debtStore.slice(index + 1)];

  appendAuditEntry({
    action: 'stage_advanced',
    entityType: 'debt_account',
    entityId: debtAccountId,
    description: `Collection stage advanced: ${current.collectionStage} → ${newStage}`,
  });

  return updated;
}

// ─── Vulnerability flags ──────────────────────────────────────────────────────

export function setVulnerabilityFlags(
  debtAccountId: string,
  flags: VulnerabilityFlag[],
): DebtAccount | undefined {
  const index = debtStore.findIndex((d) => d.id === debtAccountId);
  if (index === -1) return undefined;

  const updated: DebtAccount = {
    ...debtStore[index],
    vulnerabilityFlags: flags,
    updatedAt: new Date().toISOString(),
  };
  debtStore = [...debtStore.slice(0, index), updated, ...debtStore.slice(index + 1)];
  return updated;
}
