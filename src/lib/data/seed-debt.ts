import { DebtAccount, PaymentPlan } from '@/lib/types';

// ─── Debt accounts ────────────────────────────────────────────────────────────
//
// Four accounts derived from customers with negative balances:
//   debt-001  cust-003 Emma Clarke         monitoring stage (no plan)
//   debt-002  cust-008 David Okafor        active payment plan
//   debt-003  cust-011 Margaret Wilson     breached plan + vulnerability flags
//   debt-004  cust-012 Northern Wind       formal_notice stage (no plan yet)

export const SEED_DEBT_ACCOUNTS: DebtAccount[] = [
  // 1. Monitoring — Emma Clarke
  // Small balance (-£85.20), early-stage watchlist, no formal plan yet
  {
    id: 'debt-001',
    customerId: 'cust-003',
    debtAmount: 85.20,
    currentBalance: 85.20,
    collectionStage: 'monitoring',
    vulnerabilityFlags: [],
    lastContactDate: '2026-04-08',
    nextActionDate: '2026-04-22',
    notes: 'Customer states cheque posted 1 April. Monitoring to confirm receipt. If unpaid by 22 April, move to contact_attempted.',
    createdAt: '2026-04-05T09:00:00Z',
    updatedAt: '2026-04-08T11:30:00Z',
  },

  // 2. Active payment plan — David Okafor
  // Plan agreed 14 April 2026: 3 monthly instalments of £37.16
  {
    id: 'debt-002',
    customerId: 'cust-008',
    debtAmount: 111.48,
    currentBalance: 111.48,
    collectionStage: 'contact_attempted',
    vulnerabilityFlags: [],
    paymentPlanId: 'plan-001',
    lastContactDate: '2026-04-14',
    nextActionDate: '2026-05-14',
    notes: 'Payment plan agreed on 14 April 2026. Customer set up standing order for £37.16/month. First instalment due 14 May.',
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-14T16:00:00Z',
  },

  // 3. Breached plan + vulnerable — Margaret Wilson
  // Account suspended. Vulnerability flags raised. Previous plan breached.
  {
    id: 'debt-003',
    customerId: 'cust-011',
    debtAmount: 579.37,
    currentBalance: 579.37,
    collectionStage: 'formal_notice',
    vulnerabilityFlags: ['financial_difficulty', 'elderly', 'health_condition'],
    paymentPlanId: 'plan-002',
    lastContactDate: '2026-04-22',
    nextActionDate: '2026-04-30',
    notes: 'Previous plan plan-002 breached — customer missed 4 instalments. Vulnerability review in progress (task-011). Do not escalate to field visit until review complete.',
    createdAt: '2025-11-20T09:00:00Z',
    updatedAt: '2026-04-22T11:00:00Z',
  },

  // 4. Formal notice — Northern Wind Energy Ltd
  // Large I&C debt. CHAPS payment promised — awaiting clearance.
  {
    id: 'debt-004',
    customerId: 'cust-012',
    debtAmount: 1243.16,
    currentBalance: 1243.16,
    collectionStage: 'formal_notice',
    vulnerabilityFlags: [],
    lastContactDate: '2026-04-26',
    nextActionDate: '2026-04-30',
    notes: 'Formal notice issued 25 April. Customer confirmed CHAPS payment of £1,243.16 authorised 26 April. Awaiting clearance. Will close debt account once received.',
    createdAt: '2026-04-20T09:00:00Z',
    updatedAt: '2026-04-26T14:00:00Z',
  },
];

// ─── Payment plans ────────────────────────────────────────────────────────────

export const SEED_PAYMENT_PLANS: PaymentPlan[] = [
  // plan-001: Active plan for David Okafor (debt-002)
  // 3 monthly instalments of £37.16, starting May 2026
  {
    id: 'plan-001',
    customerId: 'cust-008',
    debtAccountId: 'debt-002',
    status: 'active',
    totalDebt: 111.48,
    instalmentAmount: 37.16,
    frequency: 'monthly',
    instalments: [
      {
        id: 'inst-001-1',
        dueDate: '2026-05-14',
        amount: 37.16,
        status: 'pending',
      },
      {
        id: 'inst-001-2',
        dueDate: '2026-06-14',
        amount: 37.16,
        status: 'pending',
      },
      {
        id: 'inst-001-3',
        dueDate: '2026-07-14',
        amount: 37.16,
        status: 'pending',
      },
    ],
    startDate: '2026-04-14',
    endDate: '2026-07-14',
    createdAt: '2026-04-14T16:00:00Z',
    updatedAt: '2026-04-14T16:00:00Z',
  },

  // plan-002: Breached plan for Margaret Wilson (debt-003)
  // 12 monthly instalments of £48.28 — customer missed 4 consecutive payments
  {
    id: 'plan-002',
    customerId: 'cust-011',
    debtAccountId: 'debt-003',
    status: 'breached',
    totalDebt: 579.37,
    instalmentAmount: 48.28,
    frequency: 'monthly',
    instalments: [
      {
        id: 'inst-002-1',
        dueDate: '2025-12-15',
        amount: 48.28,
        paidAt: '2025-12-15T00:00:00Z',
        status: 'paid',
      },
      {
        id: 'inst-002-2',
        dueDate: '2026-01-15',
        amount: 48.28,
        paidAt: '2026-01-15T00:00:00Z',
        status: 'paid',
      },
      {
        id: 'inst-002-3',
        dueDate: '2026-02-15',
        amount: 48.28,
        status: 'missed',
      },
      {
        id: 'inst-002-4',
        dueDate: '2026-03-15',
        amount: 48.28,
        status: 'missed',
      },
      {
        id: 'inst-002-5',
        dueDate: '2026-04-15',
        amount: 48.28,
        status: 'missed',
      },
      {
        id: 'inst-002-6',
        dueDate: '2026-05-15',
        amount: 48.28,
        status: 'pending',
      },
      {
        id: 'inst-002-7',
        dueDate: '2026-06-15',
        amount: 48.28,
        status: 'pending',
      },
      {
        id: 'inst-002-8',
        dueDate: '2026-07-15',
        amount: 48.28,
        status: 'pending',
      },
      {
        id: 'inst-002-9',
        dueDate: '2026-08-15',
        amount: 48.28,
        status: 'pending',
      },
      {
        id: 'inst-002-10',
        dueDate: '2026-09-15',
        amount: 48.28,
        status: 'pending',
      },
      {
        id: 'inst-002-11',
        dueDate: '2026-10-15',
        amount: 48.28,
        status: 'pending',
      },
      {
        id: 'inst-002-12',
        dueDate: '2026-11-15',
        amount: 48.28,
        status: 'pending',
      },
    ],
    startDate: '2025-11-20',
    endDate: '2026-11-15',
    createdAt: '2025-11-20T09:00:00Z',
    updatedAt: '2026-04-16T09:00:00Z',
  },
];
