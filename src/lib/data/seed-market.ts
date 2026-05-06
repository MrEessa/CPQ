import { ComplianceItem, MarketMessage, MeterReading, Switch } from '@/lib/types';

// ─── Market messages (15) ─────────────────────────────────────────────────────

export const SEED_MARKET_MESSAGES: MarketMessage[] = [
  // D0010 Meter read notifications
  {
    id: 'msg-001',
    type: 'D0010',
    status: 'completed',
    customerId: 'cust-001',
    direction: 'inbound',
    body: 'Smart meter read received for MPAN 1100053892014: 4821 kWh at 2026-03-31.',
    sentAt: '2026-04-01T02:00:00Z',
    acknowledgedAt: '2026-04-01T02:05:00Z',
    completedAt: '2026-04-01T02:05:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-002',
    type: 'D0010',
    status: 'completed',
    customerId: 'cust-006',
    direction: 'inbound',
    body: 'Smart meter read received for MPAN 1600029384711: 23410 kWh at 2026-03-31.',
    sentAt: '2026-04-01T02:00:00Z',
    acknowledgedAt: '2026-04-01T02:06:00Z',
    completedAt: '2026-04-01T02:06:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-003',
    type: 'D0010',
    status: 'failed',
    customerId: 'cust-003',
    direction: 'inbound',
    body: 'D0010 read request for MPAN 2000074419033 failed — no response from industry system. Traditional meter; manual read required.',
    sentAt: '2026-04-01T02:00:00Z',
    retryCount: 2,
    errorReason: 'MPAN not registered for AMR reads — traditional meter site',
  },
  {
    id: 'msg-004',
    type: 'D0010',
    status: 'acknowledged',
    customerId: 'cust-012',
    direction: 'inbound',
    body: 'Smart meter half-hourly data request for MPAN 1300058290441 acknowledged. Data file pending.',
    sentAt: '2026-04-01T06:00:00Z',
    acknowledgedAt: '2026-04-01T06:15:00Z',
    retryCount: 0,
  },

  // D0301 / D0302 Switch notifications
  {
    id: 'msg-005',
    type: 'D0301',
    status: 'completed',
    customerId: 'cust-001',
    direction: 'inbound',
    body: 'Gain switch initiated for MPAN 1100053892014. Effective date: 2026-06-01. Previous supplier: OctoPower.',
    sentAt: '2026-03-20T10:00:00Z',
    acknowledgedAt: '2026-03-20T10:30:00Z',
    completedAt: '2026-03-25T14:00:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-006',
    type: 'D0302',
    status: 'completed',
    customerId: 'cust-001',
    direction: 'outbound',
    body: 'Switch confirmation sent to industry for MPAN 1100053892014. Gain confirmed for 2026-06-01.',
    sentAt: '2026-03-25T14:05:00Z',
    acknowledgedAt: '2026-03-25T14:10:00Z',
    completedAt: '2026-03-25T14:10:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-007',
    type: 'D0301',
    status: 'completed',
    customerId: 'cust-009',
    direction: 'inbound',
    body: 'Loss switch initiated for MPAN 1900051847320 by GreenGrid Energy. Effective date: 2026-04-10.',
    sentAt: '2026-03-15T10:00:00Z',
    acknowledgedAt: '2026-03-15T10:45:00Z',
    completedAt: '2026-03-20T09:00:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-008',
    type: 'D0302',
    status: 'rejected',
    customerId: 'cust-009',
    direction: 'outbound',
    body: 'Objection raised for switch on MPAN 1900051847320 — customer within objection window (contract end date 2026-03-31).',
    sentAt: '2026-03-16T09:00:00Z',
    acknowledgedAt: '2026-03-16T09:30:00Z',
    retryCount: 0,
    errorReason: 'Objection raised — contract terms not satisfied',
  },

  // D0055 Supply data requests
  {
    id: 'msg-009',
    type: 'D0055',
    status: 'completed',
    customerId: 'cust-007',
    direction: 'outbound',
    body: 'Supply data request for MPAN 2100056783002 submitted to National Grid ahead of smart meter installation.',
    sentAt: '2026-03-01T09:00:00Z',
    acknowledgedAt: '2026-03-01T09:30:00Z',
    completedAt: '2026-03-03T11:00:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-010',
    type: 'D0055',
    status: 'acknowledged',
    customerId: 'cust-005',
    direction: 'outbound',
    body: 'Supply data request for MPAN 2200083920441 submitted — required to resolve meter reading dispute for March bill.',
    sentAt: '2026-04-14T10:00:00Z',
    acknowledgedAt: '2026-04-14T10:20:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-011',
    type: 'D0055',
    status: 'failed',
    direction: 'outbound',
    body: 'D0055 supply data request for new acquisition site MPAN 1900098345501 failed — site not found in national registry.',
    sentAt: '2026-04-10T14:00:00Z',
    retryCount: 3,
    errorReason: 'MPAN not found in national meter point registry',
  },

  // D0150 Data aggregation
  {
    id: 'msg-012',
    type: 'D0150',
    status: 'completed',
    direction: 'inbound',
    body: 'Monthly settlement data file (March 2026) received from Data Aggregator. 47 meter points included.',
    sentAt: '2026-04-05T06:00:00Z',
    acknowledgedAt: '2026-04-05T06:10:00Z',
    completedAt: '2026-04-05T07:30:00Z',
    retryCount: 0,
  },
  {
    id: 'msg-013',
    type: 'D0150',
    status: 'sent',
    direction: 'inbound',
    body: 'Q4 2025 balancing settlement data file received. Processing in progress.',
    sentAt: '2026-04-20T06:00:00Z',
    retryCount: 0,
  },

  // DC Debt communications
  {
    id: 'msg-014',
    type: 'DC',
    status: 'completed',
    customerId: 'cust-011',
    direction: 'outbound',
    body: 'Formal debt notice issued to customer ACC-00011 (Margaret Wilson) — outstanding balance £579.37. Regulatory requirement SLC 27.4.',
    sentAt: '2026-04-20T09:00:00Z',
    acknowledgedAt: '2026-04-20T09:05:00Z',
    completedAt: '2026-04-20T09:05:00Z',
    retryCount: 0,
  },

  // ERS Erroneous registration
  {
    id: 'msg-015',
    type: 'ERS',
    status: 'completed',
    direction: 'inbound',
    body: 'Erroneous registration query received for MPAN 1300062748510. Reviewed — registration correct, no action required.',
    sentAt: '2026-03-28T11:00:00Z',
    acknowledgedAt: '2026-03-28T11:30:00Z',
    completedAt: '2026-04-02T14:00:00Z',
    retryCount: 0,
  },
];

// ─── Switches (5) ─────────────────────────────────────────────────────────────
// 2 gains (cust-001, cust-007), 3 losses (cust-003, cust-009, cust-012)

export const SEED_SWITCHES: Switch[] = [
  // Gain 1 — Sarah Mitchell gaining (from OctoPower)
  {
    id: 'sw-001',
    customerId: 'cust-001',
    type: 'gain',
    stage: 'confirmed',
    mpan: '1100053892014',
    gainDate: '2026-06-01',
    initiatedAt: '2026-03-20T10:00:00Z',
  },

  // Gain 2 — Priya Patel gaining (new customer, switching from BrightEnergy)
  {
    id: 'sw-002',
    customerId: 'cust-007',
    type: 'gain',
    stage: 'initiated',
    mpan: '2100056783002',
    gainDate: '2026-06-15',
    initiatedAt: '2026-04-28T14:00:00Z',
  },

  // Loss 1 — Emma Clarke switching away (loss still in objection window)
  {
    id: 'sw-003',
    customerId: 'cust-003',
    type: 'loss',
    stage: 'initiated',
    mpan: '2000074419033',
    gainDate: '2026-06-01',
    initiatedAt: '2026-04-25T10:00:00Z',
  },

  // Loss 2 — Sunrise Community Solar switching away (objected by us)
  {
    id: 'sw-004',
    customerId: 'cust-009',
    type: 'loss',
    stage: 'objected',
    mpan: '1900051847320',
    gainDate: '2026-04-10',
    initiatedAt: '2026-03-15T10:00:00Z',
    objectedAt: '2026-03-16T09:00:00Z',
    objectionReason: 'Customer within contract term — contract end date 31 March 2026. Objection raised per SLC 14.1.',
  },

  // Loss 3 — Northern Wind Energy switching away (completed loss)
  {
    id: 'sw-005',
    customerId: 'cust-012',
    type: 'loss',
    stage: 'completed',
    mpan: '1300058290441',
    gainDate: '2026-07-01',
    initiatedAt: '2026-04-01T09:00:00Z',
    completedAt: '2026-04-10T00:00:00Z',
  },
];

// ─── Meter readings (8) ───────────────────────────────────────────────────────

export const SEED_METER_READINGS: MeterReading[] = [
  // Smart reads from end-of-month automated collection
  {
    id: 'mr-001',
    customerId: 'cust-001',
    mpan: '1100053892014',
    readingDate: '2026-03-31',
    readingKwh: 4821,
    source: 'smart',
  },
  {
    id: 'mr-002',
    customerId: 'cust-002',
    mpan: '1900041756202',
    readingDate: '2026-03-31',
    readingKwh: 11430,
    source: 'smart',
  },
  {
    id: 'mr-003',
    customerId: 'cust-006',
    mpan: '1600029384711',
    readingDate: '2026-03-31',
    readingKwh: 23410,
    source: 'smart',
  },
  // Customer-submitted read for traditional meter
  {
    id: 'mr-004',
    customerId: 'cust-003',
    mpan: '2000074419033',
    readingDate: '2026-03-28',
    readingKwh: 19842,
    source: 'customer',
  },
  // Industry read (post-D0055 for dispute resolution)
  {
    id: 'mr-005',
    customerId: 'cust-005',
    mpan: '2200083920441',
    readingDate: '2026-04-15',
    readingKwh: 48203,
    source: 'industry',
  },
  // Estimated read for Margaret Wilson (suspended — no access for actual read)
  {
    id: 'mr-006',
    customerId: 'cust-011',
    mpan: '1100047820193',
    readingDate: '2026-03-31',
    readingKwh: 24917,
    source: 'estimated',
  },
  // Smart half-hourly data for I&C customers
  {
    id: 'mr-007',
    customerId: 'cust-004',
    mpan: '1300062748501',
    readingDate: '2026-03-31',
    readingKwh: 183450,
    source: 'smart',
  },
  {
    id: 'mr-008',
    customerId: 'cust-012',
    mpan: '1300058290441',
    readingDate: '2026-03-31',
    readingKwh: 941220,
    source: 'smart',
  },
];

// ─── Compliance items (6, 2 overdue) ─────────────────────────────────────────

export const SEED_COMPLIANCE_ITEMS: ComplianceItem[] = [
  // 1. Open — due this week
  {
    id: 'comp-001',
    title: 'Priority Services Register review',
    description: 'Annual review of all customers on the PSR to ensure records are current and support needs are being met.',
    status: 'open',
    dueDate: '2026-05-09',
    assignedTo: 'agent-04',
    regulatoryReference: 'SLC 26B',
  },

  // 2. In progress
  {
    id: 'comp-002',
    title: 'Smart meter rollout — quarterly milestone report',
    description: 'Submit Q1 2026 smart meter installation progress report to Ofgem showing percentage of eligible sites upgraded.',
    status: 'in_progress',
    dueDate: '2026-05-30',
    assignedTo: 'agent-01',
    regulatoryReference: 'SMIP Section 4.3',
  },

  // 3. Completed
  {
    id: 'comp-003',
    title: 'Annual tariff comparison letter — residential customers',
    description: 'Issue mandatory annual tariff comparison letter to all residential customers. Completed for 2026 cohort.',
    status: 'completed',
    dueDate: '2026-03-31',
    completedAt: '2026-03-28T17:00:00Z',
    regulatoryReference: 'SLC 31A.3',
  },

  // 4. Overdue 1 — missed deadline
  {
    id: 'comp-004',
    title: 'Vulnerable customer winter health check calls',
    description: 'Complete welfare check calls to all PSR-flagged customers before end of winter period. 3 customers not yet contacted.',
    status: 'overdue',
    dueDate: '2026-03-31',
    assignedTo: 'agent-04',
    regulatoryReference: 'SLC 26B.3',
  },

  // 5. Overdue 2 — debt communications audit
  {
    id: 'comp-005',
    title: 'Debt communications audit — Q1 2026',
    description: 'Internal audit of all debt-related communications sent in Q1 2026 to verify compliance with SLC 27 requirements. Overdue — escalate to compliance manager.',
    status: 'overdue',
    dueDate: '2026-04-15',
    assignedTo: 'agent-03',
    regulatoryReference: 'SLC 27',
  },

  // 6. Open — upcoming
  {
    id: 'comp-006',
    title: 'Half-yearly billing accuracy self-assessment',
    description: 'Prepare self-assessment report on billing accuracy metrics for H1 2026. Include error rate, dispute rate, and corrective actions.',
    status: 'open',
    dueDate: '2026-06-30',
    assignedTo: 'agent-01',
    regulatoryReference: 'SLC 21A',
  },
];
