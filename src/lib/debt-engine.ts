import {
  CollectionStage,
  InstalmentFrequency,
  PaymentPlan,
  PaymentPlanStatus,
  PlanInstalment,
} from '@/lib/types';

// ─── Payment plan status transitions ─────────────────────────────────────────

export const PLAN_STATUS_TRANSITIONS: Record<PaymentPlanStatus, PaymentPlanStatus[]> = {
  active: ['completed', 'breached', 'cancelled'],
  completed: [],
  breached: ['active', 'cancelled'], // 're-plan' after breach restarts as active
  cancelled: [],
};

// ─── Collection stage ordering ────────────────────────────────────────────────

const STAGE_ORDER: CollectionStage[] = [
  'monitoring',
  'contact_attempted',
  'formal_notice',
  'field_visit',
  'legal',
];

export function isValidStageAdvance(from: CollectionStage, to: CollectionStage): boolean {
  return STAGE_ORDER.indexOf(to) > STAGE_ORDER.indexOf(from);
}

// ─── Instalment generation ────────────────────────────────────────────────────

function generateInstalments(
  totalDebt: number,
  instalmentAmount: number,
  frequency: InstalmentFrequency,
  startDate: string,
): PlanInstalment[] {
  const count = Math.ceil(totalDebt / instalmentAmount);
  const instalments: PlanInstalment[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast
      ? parseFloat((totalDebt - instalmentAmount * i).toFixed(2))
      : instalmentAmount;

    instalments.push({
      id: `inst-${Date.now()}-${i}`,
      dueDate: current.toISOString().split('T')[0],
      amount,
      status: 'pending',
    });

    if (frequency === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else if (frequency === 'fortnightly') {
      current.setDate(current.getDate() + 14);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return instalments;
}

// ─── Plan construction ────────────────────────────────────────────────────────

export interface CreatePlanInput {
  debtAccountId: string;
  customerId: string;
  totalDebt: number;
  instalmentAmount: number;
  frequency: InstalmentFrequency;
  startDate: string;
}

export function buildPaymentPlan(input: CreatePlanInput): Omit<PaymentPlan, 'id'> {
  const now = new Date().toISOString();
  const instalments = generateInstalments(
    input.totalDebt,
    input.instalmentAmount,
    input.frequency,
    input.startDate,
  );

  return {
    customerId: input.customerId,
    debtAccountId: input.debtAccountId,
    status: 'active',
    totalDebt: input.totalDebt,
    instalmentAmount: input.instalmentAmount,
    frequency: input.frequency,
    instalments,
    startDate: input.startDate,
    endDate: instalments[instalments.length - 1].dueDate,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Plan mutations ───────────────────────────────────────────────────────────

export function markInstalmentPaid(plan: PaymentPlan, instalmentId: string): PaymentPlan {
  const now = new Date().toISOString();
  const instalments = plan.instalments.map((inst) =>
    inst.id === instalmentId
      ? { ...inst, status: 'paid' as const, paidAt: now }
      : inst,
  );
  const allPaid = instalments.every((i) => i.status === 'paid');

  return {
    ...plan,
    instalments,
    status: allPaid ? 'completed' : plan.status,
    updatedAt: now,
  };
}

export function markPlanBreached(plan: PaymentPlan): PaymentPlan {
  const allowed = PLAN_STATUS_TRANSITIONS[plan.status];
  if (!allowed.includes('breached')) {
    throw new Error(`Cannot breach plan in status: ${plan.status}`);
  }
  return { ...plan, status: 'breached', updatedAt: new Date().toISOString() };
}
