import { Market, Product, ProductVersionSnapshot, Quote } from '@/lib/types';

// ─── Markets ──────────────────────────────────────────────────────────────────

export const GB_MARKET: Market = {
  code: 'GB',
  name: 'Great Britain',
  currency: 'GBP',
  vatRate: 5,
  regulatoryScheme: 'Ofgem',
};

export const IE_MARKET: Market = {
  code: 'IE',
  name: 'Ireland',
  currency: 'EUR',
  vatRate: 13.5,
  regulatoryScheme: 'CRU',
};

export const SEED_MARKETS: Market[] = [GB_MARKET, IE_MARKET];

// ─── Products ─────────────────────────────────────────────────────────────────

export const SEED_PRODUCTS: Product[] = [
  // 1. Flat rate electricity — GB residential
  {
    id: 'prod-001',
    name: 'StandardElec-v2',
    description: 'Simple single-rate electricity tariff for residential customers.',
    productType: 'flat_rate',
    fuelType: 'electricity',
    status: 'active',
    version: 2,
    market: [GB_MARKET],
    eligibilityRules: [
      {
        id: 'er-001-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential', 'sme'],
        description: 'Available to residential and SME customers',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      standingCharge: 61.64, // p/day
      rates: [
        {
          id: 'rate-001-1',
          label: 'Unit Rate',
          unitRate: 24.5, // p/kWh
        },
      ],
      vatRate: 5,
      levies: [
        { name: 'Renewables Obligation', ratePerKwh: 1.96 },
        { name: 'Feed-in Tariff (FIT)', ratePerKwh: 0.18 },
      ],
    },
    effectiveFrom: '2024-04-01',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-03-20T14:30:00Z',
    versionHistory: [
      {
        version: 1,
        pricingStructure: {
          currency: 'GBP',
          standingCharge: 59.00,
          rates: [{ id: 'rate-001-1-v1', label: 'Unit Rate', unitRate: 26.8 }],
          vatRate: 5,
          levies: [
            { name: 'Renewables Obligation', ratePerKwh: 1.96 },
            { name: 'Feed-in Tariff (FIT)', ratePerKwh: 0.18 },
          ],
        },
        effectiveFrom: '2023-10-01',
        effectiveTo: '2024-04-01',
        updatedAt: '2024-03-20T14:30:00Z',
      } satisfies ProductVersionSnapshot,
    ],
  },

  // 2. Time-of-use electricity — GB
  {
    id: 'prod-002',
    name: 'EcoTOU-v1',
    description: 'Time-of-use electricity tariff with day and night rates. Save by shifting usage to off-peak hours.',
    productType: 'time_of_use',
    fuelType: 'electricity',
    status: 'active',
    version: 1,
    market: [GB_MARKET],
    eligibilityRules: [
      {
        id: 'er-002-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential', 'sme'],
        description: 'Available to residential and SME customers',
      },
      {
        id: 'er-002-2',
        field: 'meterType',
        operator: 'eq',
        value: 'smart',
        description: 'Requires a smart meter',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      standingCharge: 55.00,
      rates: [
        {
          id: 'rate-002-1',
          label: 'Day Rate',
          unitRate: 28.0,
          timeWindows: [
            {
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '07:00',
              endTime: '23:00',
            },
            {
              daysOfWeek: [0, 6],
              startTime: '08:00',
              endTime: '22:00',
            },
          ],
        },
        {
          id: 'rate-002-2',
          label: 'Night Rate',
          unitRate: 14.0,
          timeWindows: [
            {
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '23:00',
              endTime: '07:00',
            },
            {
              daysOfWeek: [0, 6],
              startTime: '22:00',
              endTime: '08:00',
            },
          ],
        },
      ],
      vatRate: 5,
      levies: [
        { name: 'Renewables Obligation', ratePerKwh: 1.96 },
      ],
    },
    effectiveFrom: '2024-06-01',
    createdAt: '2024-05-01T10:00:00Z',
    updatedAt: '2024-05-15T11:00:00Z',
    versionHistory: [],
  },

  // 3. Dynamic / Agile electricity — GB
  {
    id: 'prod-003',
    name: 'AgileElec-v1',
    description: 'Agile-style dynamic electricity tariff. Rates update regularly to reflect wholesale market prices. Three representative rate bands shown.',
    productType: 'dynamic',
    fuelType: 'electricity',
    status: 'active',
    version: 1,
    market: [GB_MARKET],
    eligibilityRules: [
      {
        id: 'er-003-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential', 'sme'],
        description: 'Available to residential and SME customers',
      },
      {
        id: 'er-003-2',
        field: 'meterType',
        operator: 'eq',
        value: 'smart',
        description: 'Requires a smart meter',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      standingCharge: 50.00,
      // Three representative 30-min slots modelling a typical day
      rates: [
        {
          id: 'rate-003-1',
          label: 'Off-Peak',
          unitRate: 18.0,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '07:00' },
          ],
        },
        {
          id: 'rate-003-2',
          label: 'Standard',
          unitRate: 28.5,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '16:00' },
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '19:00', endTime: '24:00' },
          ],
        },
        {
          id: 'rate-003-3',
          label: 'Peak',
          unitRate: 45.0,
          timeWindows: [
            { daysOfWeek: [1, 2, 3, 4, 5], startTime: '16:00', endTime: '19:00' },
          ],
        },
      ],
      vatRate: 5,
      levies: [
        { name: 'Renewables Obligation', ratePerKwh: 1.96 },
      ],
    },
    effectiveFrom: '2024-09-01',
    createdAt: '2024-08-01T08:00:00Z',
    updatedAt: '2024-08-20T16:00:00Z',
    versionHistory: [],
  },

  // 4. Export / SEG tariff — GB
  {
    id: 'prod-004',
    name: 'ExportFIT-v1',
    description: 'Smart Export Guarantee (SEG) style tariff. Earn money for electricity exported back to the grid from solar panels or other generators.',
    productType: 'export',
    fuelType: 'electricity',
    status: 'active',
    version: 1,
    market: [GB_MARKET],
    eligibilityRules: [
      {
        id: 'er-004-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential', 'sme'],
        description: 'Available to residential and SME customers',
      },
      {
        id: 'er-004-2',
        field: 'meterType',
        operator: 'eq',
        value: 'smart',
        description: 'Requires a smart meter for export measurement',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      rates: [
        {
          id: 'rate-004-1',
          label: 'Export Rate',
          unitRate: 15.0, // p/kWh earned for export
        },
      ],
      vatRate: 0, // export payments are not subject to VAT
    },
    effectiveFrom: '2024-01-01',
    createdAt: '2023-12-01T09:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    versionHistory: [],
  },

  // 5. Bundled dual fuel — GB
  {
    id: 'prod-005',
    name: 'GreenBundle-v1',
    description: 'Bundled green electricity and gas tariff. Combines our standard electricity rate with a competitive gas rate under a single contract.',
    productType: 'bundled',
    fuelType: 'dual_fuel',
    status: 'active',
    version: 1,
    market: [GB_MARKET],
    bundleComponents: ['prod-001', 'prod-006-gas'],
    eligibilityRules: [
      {
        id: 'er-005-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential'],
        description: 'Available to residential customers only',
      },
      {
        id: 'er-005-2',
        field: 'annualUsageKwh',
        operator: 'lte',
        value: 20000,
        description: 'Annual usage must not exceed 20,000 kWh',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      standingCharge: 118.00, // combined standing charge p/day
      rates: [
        {
          id: 'rate-005-1',
          label: 'Electricity Unit Rate',
          unitRate: 23.5,
        },
        {
          id: 'rate-005-2',
          label: 'Gas Unit Rate',
          unitRate: 6.24,
          fuelType: 'gas' as const,
        },
      ],
      vatRate: 5,
      levies: [
        { name: 'Renewables Obligation', ratePerKwh: 1.96 },
      ],
    },
    effectiveFrom: '2024-04-01',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-25T15:00:00Z',
    versionHistory: [],
  },

  // 6. Flat rate electricity — IE market
  {
    id: 'prod-006',
    name: 'IEFlatElec-v1',
    description: 'Standard flat rate electricity tariff for the Irish market. Regulatory rates apply under CRU guidelines.',
    productType: 'flat_rate',
    fuelType: 'electricity',
    status: 'active',
    version: 1,
    market: [IE_MARKET],
    eligibilityRules: [
      {
        id: 'er-006-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential', 'sme'],
        description: 'Available to residential and SME customers',
      },
    ],
    pricingStructure: {
      currency: 'EUR',
      standingCharge: 55.00, // euro cents/day
      rates: [
        {
          id: 'rate-006-1',
          label: 'Unit Rate',
          unitRate: 32.8, // euro cents/kWh
        },
      ],
      vatRate: 13.5,
    },
    effectiveFrom: '2025-01-01',
    createdAt: '2024-11-01T09:00:00Z',
    updatedAt: '2024-11-15T12:00:00Z',
    versionHistory: [],
  },

  // 7. Dynamic EV tariff — GB (smart meter + EV required)
  {
    id: 'prod-007',
    name: 'AgileEV-v1',
    description: 'Dynamic overnight electricity tariff optimised for EV owners. Super off-peak rate for overnight charging, with standard and peak bands during the day.',
    productType: 'dynamic',
    fuelType: 'electricity',
    status: 'active',
    version: 1,
    market: [GB_MARKET],
    eligibilityRules: [
      {
        id: 'er-007-1',
        field: 'meterType',
        operator: 'eq',
        value: 'smart',
        description: 'Requires a smart meter',
      },
      {
        id: 'er-007-2',
        field: 'hasEV',
        operator: 'eq',
        value: true,
        description: 'Requires EV ownership',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      standingCharge: 45.00,
      rates: [
        {
          id: 'rate-007-3',
          label: 'Peak',
          unitRate: 38.0,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '16:00', endTime: '19:00' },
          ],
        },
        {
          id: 'rate-007-2',
          label: 'Standard',
          unitRate: 24.5,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '16:00' },
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '19:00', endTime: '24:00' },
          ],
        },
        {
          id: 'rate-007-1',
          label: 'Super Off-Peak',
          unitRate: 8.0,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '07:00' },
          ],
        },
      ],
      vatRate: 5,
      levies: [
        { name: 'Renewables Obligation', ratePerKwh: 1.96 },
      ],
    },
    effectiveFrom: '2025-03-01',
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-15T14:00:00Z',
    versionHistory: [],
  },

  // 8. Solar export tariff — GB (SEG-style, hasSolar required)
  {
    id: 'prod-008',
    name: 'SolarExport-v2',
    description: 'Smart Export Guarantee (SEG) tariff for solar panel owners. Earn a fixed rate for every unit of electricity exported back to the grid.',
    productType: 'export',
    fuelType: 'electricity',
    status: 'active',
    version: 2,
    market: [GB_MARKET],
    eligibilityRules: [
      {
        id: 'er-008-1',
        field: 'hasSolar',
        operator: 'eq',
        value: true,
        description: 'Requires solar panel installation',
      },
    ],
    pricingStructure: {
      currency: 'GBP',
      rates: [
        {
          id: 'rate-008-1',
          label: 'Export Rate',
          unitRate: 15.0,
        },
      ],
      vatRate: 0,
    },
    effectiveFrom: '2025-01-01',
    createdAt: '2024-12-01T09:00:00Z',
    updatedAt: '2025-01-05T11:00:00Z',
    versionHistory: [],
  },

  // 9. Time-of-use electricity — IE market
  {
    id: 'prod-009',
    name: 'IETOUElec-v1',
    description: 'Time-of-use electricity tariff for the Irish market. Cheaper night rates to reward off-peak usage. CRU regulated.',
    productType: 'time_of_use',
    fuelType: 'electricity',
    status: 'active',
    version: 1,
    market: [IE_MARKET],
    eligibilityRules: [
      {
        id: 'er-009-1',
        field: 'customerType',
        operator: 'in',
        value: ['residential', 'sme'],
        description: 'Available to residential and SME customers',
      },
    ],
    pricingStructure: {
      currency: 'EUR',
      standingCharge: 55.00,
      rates: [
        {
          id: 'rate-009-1',
          label: 'Day Rate',
          unitRate: 28.5,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '23:00' },
          ],
        },
        {
          id: 'rate-009-2',
          label: 'Night Rate',
          unitRate: 14.0,
          timeWindows: [
            { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '23:00', endTime: '07:00' },
          ],
        },
      ],
      vatRate: 9,
    },
    effectiveFrom: '2025-04-01',
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-15T11:00:00Z',
    versionHistory: [],
  },
];

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const SEED_QUOTES: Quote[] = [
  // Issued quote 1
  {
    id: 'qt-001',
    reference: 'QT-2024-0038',
    status: 'issued',
    customerId: 'cust-005',
    customerName: 'Greenleaf Homes Ltd',
    customerType: 'sme',
    annualUsageKwh: 12500,
    products: [
      {
        productId: 'prod-001',
        productName: 'StandardElec-v2',
        pricingSnapshot: SEED_PRODUCTS[0].pricingStructure,
        estimatedAnnualCost: 3221.50,
      },
    ],
    estimatedAnnualCost: 3221.50,
    totalWithVat: 3382.58,
    notes: 'Customer requires paper invoicing. Contacted via account manager.',
    validUntil: '2024-11-30',
    issuedAt: '2024-10-28T09:15:00Z',
    createdAt: '2024-10-25T14:00:00Z',
    updatedAt: '2024-10-28T09:15:00Z',
    statusHistory: [
      { from: 'draft', to: 'pending_review', at: '2024-10-26T10:00:00Z', note: 'Sent for pricing sign-off' },
      { from: 'pending_review', to: 'issued', at: '2024-10-28T09:15:00Z', note: 'Approved by pricing team' },
    ],
  },

  // Issued quote 2
  {
    id: 'qt-002',
    reference: 'QT-2024-0041',
    status: 'issued',
    customerId: 'cust-009',
    customerName: 'Sunrise Community Solar CIC',
    customerType: 'sme',
    annualUsageKwh: 8200,
    products: [
      {
        productId: 'prod-002',
        productName: 'EcoTOU-v1',
        pricingSnapshot: SEED_PRODUCTS[1].pricingStructure,
        estimatedAnnualCost: 2487.60,
      },
      {
        productId: 'prod-004',
        productName: 'ExportFIT-v1',
        pricingSnapshot: SEED_PRODUCTS[3].pricingStructure,
        estimatedAnnualCost: -630.00,
      },
    ],
    estimatedAnnualCost: 1857.60,
    totalWithVat: 1950.48,
    notes: 'Bundle includes SEG export. Net cost reflects projected export earnings.',
    validUntil: '2024-12-15',
    issuedAt: '2024-11-01T11:30:00Z',
    createdAt: '2024-10-30T16:45:00Z',
    updatedAt: '2024-11-01T11:30:00Z',
    statusHistory: [
      { from: 'draft', to: 'issued', at: '2024-11-01T11:30:00Z', note: 'Issued directly — standard pricing' },
    ],
  },

  // Accepted quote
  {
    id: 'qt-003',
    reference: 'QT-2024-0029',
    status: 'accepted',
    customerId: 'cust-010',
    customerName: 'Fairview Properties',
    customerType: 'residential',
    annualUsageKwh: 3500,
    annualGasUsageKwh: 11500,
    products: [
      {
        productId: 'prod-005',
        productName: 'GreenBundle-v1',
        pricingSnapshot: SEED_PRODUCTS[4].pricingStructure,
        annualGasUsageKwh: 11500,
        estimatedAnnualCost: 2039.40,
      },
    ],
    estimatedAnnualCost: 2039.40,
    totalWithVat: 2141.37,
    validUntil: '2024-10-31',
    issuedAt: '2024-09-15T10:00:00Z',
    createdAt: '2024-09-10T09:30:00Z',
    updatedAt: '2024-09-20T16:00:00Z',
    statusHistory: [
      { from: 'draft', to: 'pending_review', at: '2024-09-11T08:00:00Z' },
      { from: 'pending_review', to: 'issued', at: '2024-09-15T10:00:00Z', note: 'Issued after eligibility confirmed' },
      { from: 'issued', to: 'accepted', at: '2024-09-20T16:00:00Z', note: 'Customer signed contract' },
    ],
  },

  // Draft quote
  {
    id: 'qt-004',
    reference: 'QT-2025-0001',
    status: 'draft',
    customerId: 'cust-004',
    customerName: 'Harlow Manufacturing Ltd',
    customerType: 'ic',
    annualUsageKwh: 47000,
    products: [
      {
        productId: 'prod-003',
        productName: 'AgileElec-v1',
        pricingSnapshot: SEED_PRODUCTS[2].pricingStructure,
        estimatedAnnualCost: 14201.00,
      },
    ],
    estimatedAnnualCost: 14201.00,
    totalWithVat: 14911.05,
    notes: 'Awaiting usage data verification from customer.',
    validUntil: '2025-02-28',
    createdAt: '2025-01-05T10:00:00Z',
    updatedAt: '2025-01-05T10:00:00Z',
    statusHistory: [
      { from: 'draft', to: 'draft', at: '2025-01-05T10:00:00Z', note: 'Initial draft created' },
    ],
  },

  // Expired quote
  {
    id: 'qt-005',
    reference: 'QT-2024-0017',
    status: 'expired',
    customerId: 'cust-006',
    customerName: 'Riverside Retail Group',
    customerType: 'sme',
    annualUsageKwh: 9800,
    products: [
      {
        productId: 'prod-001',
        productName: 'StandardElec-v2',
        pricingSnapshot: SEED_PRODUCTS[0].pricingStructure,
        estimatedAnnualCost: 2573.00,
      },
    ],
    estimatedAnnualCost: 2573.00,
    totalWithVat: 2701.65,
    validUntil: '2024-07-31',
    issuedAt: '2024-06-28T14:00:00Z',
    createdAt: '2024-06-25T11:00:00Z',
    updatedAt: '2024-08-01T00:01:00Z',
    statusHistory: [
      { from: 'draft', to: 'issued', at: '2024-06-28T14:00:00Z', note: 'Issued to customer' },
      { from: 'issued', to: 'expired', at: '2024-08-01T00:01:00Z', note: 'Quote validity period elapsed' },
    ],
  },
];

// ─── Re-exports from per-entity seed files ────────────────────────────────────

export { SEED_CUSTOMERS, SEED_COMMUNICATIONS, SEED_TASKS } from './seed-customers';
export { SEED_BILLS } from './seed-bills';
export { SEED_DEBT_ACCOUNTS, SEED_PAYMENT_PLANS } from './seed-debt';
export { SEED_MARKET_MESSAGES, SEED_SWITCHES, SEED_METER_READINGS, SEED_COMPLIANCE_ITEMS } from './seed-market';
export { SEED_LEDGER_ENTRIES, SEED_AUDIT_ENTRIES } from './seed-finance';
