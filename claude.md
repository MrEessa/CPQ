# Energy CPQ — Product, Pricing & Quoting Platform

A portfolio demo project: a Configure, Price, Quote (CPQ) tool for energy retailers.
Models how energy products are configured, priced, and quoted across multiple tariff
structures, including time-of-use, dynamic/agile, export, and bundled propositions.

Built as a working proof of concept to demonstrate CPQ domain knowledge for an energy
SaaS product management context. 

---

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State**: React state + context (no external state library)
- **Data**: In-memory data layer with seed data (no database required for demo)
- **Icons**: lucide-react
- **Charts**: recharts (for pricing visualisations)

Do not add any other libraries without flagging first.

---

## Project structure

```
src/
  app/
    layout.tsx
    page.tsx                    # Dashboard / home
    catalogue/
      page.tsx                  # Product catalogue list
      [id]/page.tsx             # Product detail / edit
    quotes/
      page.tsx                  # Quote list
      new/page.tsx              # Quote builder
      [id]/page.tsx             # Quote detail / status
    pricing/
      page.tsx                  # Pricing rules overview
  components/
    ui/                         # Shared primitives (Button, Badge, Card, Table, Modal)
    layout/                     # Shell, Sidebar, Header
    catalogue/                  # Product-specific components
    pricing/                    # Pricing rule components
    quotes/                     # Quote builder components
  lib/
    data/
      seed.ts                   # All seed data
      products.ts               # Product data access
      quotes.ts                 # Quote data access
      pricing.ts                # Pricing rule data access
    types.ts                    # All TypeScript types
    pricing-engine.ts           # Core pricing calculation logic
    quote-engine.ts             # Quote lifecycle logic
  hooks/
    useCatalogue.ts
    useQuote.ts
```

---

## Domain model

### Product

A product is a configurable energy offer that can be priced and quoted.

```typescript
type ProductType =
  | 'flat_rate'         // Single unit rate, standing charge
  | 'time_of_use'       // Multiple rate bands keyed to time windows
  | 'dynamic'           // Variable rate, updated periodically (e.g. Agile-style)
  | 'export'            // Feed-in / export tariff
  | 'bundled';          // Composite of multiple product components

type ProductStatus = 'draft' | 'active' | 'deprecated';

type FuelType = 'electricity' | 'gas' | 'dual_fuel' | 'ev';

interface Product {
  id: string;
  name: string;
  description: string;
  productType: ProductType;
  fuelType: FuelType;
  status: ProductStatus;
  version: number;
  market: Market[];             // Which geographic markets this applies to
  eligibilityRules: EligibilityRule[];
  pricingStructure: PricingStructure;
  bundleComponents?: string[];  // Product IDs if bundled
  effectiveFrom: string;        // ISO date
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Pricing structure

Each product has a pricing structure that defines how costs are calculated.

```typescript
interface PricingStructure {
  currency: string;             // 'GBP', 'EUR', etc.
  standingCharge?: number;      // p/day
  rates: PricingRate[];
  vatRate: number;              // Percentage, e.g. 5
  levies?: Levy[];              // Environmental / policy levies
}

interface PricingRate {
  id: string;
  label: string;                // e.g. 'Day Rate', 'Peak', 'Off-Peak', 'Night'
  unitRate: number;             // p/kWh
  timeWindows?: TimeWindow[];   // Only set for TOU products
  tier?: TierRule;              // Only set for tiered products
}

interface TimeWindow {
  daysOfWeek: number[];         // 0=Sun, 1=Mon ... 6=Sat
  startTime: string;            // 'HH:MM'
  endTime: string;              // 'HH:MM'
}

interface TierRule {
  thresholdKwh: number;         // Usage up to this threshold uses this rate
  isOverThreshold: boolean;
}

interface Levy {
  name: string;                 // e.g. 'Renewables Obligation', 'FIT'
  ratePerKwh: number;
}
```

### Eligibility rules

Controls which customers or accounts can be offered a product.

```typescript
interface EligibilityRule {
  id: string;
  field: string;           // e.g. 'customerType', 'meterType', 'region', 'annualUsageKwh'
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
  value: unknown;
  description: string;
}
```

### Quote

A quote represents a priced offer for a specific customer against one or more products.

```typescript
type QuoteStatus = 'draft' | 'pending_review' | 'issued' | 'accepted' | 'rejected' | 'expired';

interface Quote {
  id: string;
  reference: string;           // Human-readable, e.g. 'QT-2024-0042'
  status: QuoteStatus;
  customerId: string;
  customerName: string;
  customerType: 'residential' | 'sme' | 'corporate';
  products: QuoteLineItem[];
  annualUsageKwh: number;
  estimatedAnnualCost: number; // Pre-tax total
  totalWithVat: number;
  notes?: string;
  validUntil: string;
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusEvent[];
}

interface QuoteLineItem {
  productId: string;
  productName: string;
  pricingSnapshot: PricingStructure;  // Snapshot at time of quoting
  estimatedAnnualCost: number;
}

interface StatusEvent {
  from: QuoteStatus;
  to: QuoteStatus;
  at: string;
  note?: string;
}
```

### Market

```typescript
interface Market {
  code: string;           // 'GB', 'IE', 'DE', etc.
  name: string;
  currency: string;
  vatRate: number;
  regulatoryScheme: string;  // e.g. 'Ofgem', 'CRU', 'BNetzA'
}
```

---

## Seed data

Create realistic seed data in `src/lib/data/seed.ts`. Include:

**Products (at least one of each type):**

1. `StandardElec-v2` — Flat rate electricity, active, GB market, residential
2. `EcoTOU-v1` — Time-of-use electricity (Day 28p, Night 14p, peak windows defined), active, GB market
3. `AgileElec-v1` — Dynamic/agile-style electricity with 30-min rate slots (model as 3 representative rates for demo), active, GB market
4. `ExportFIT-v1` — Export tariff (SEG-style), active, GB market
5. `GreenBundle-v1` — Bundled product combining StandardElec + a gas rate, active, GB market
6. `IEFlatElec-v1` — Flat rate electricity for IE market (EUR, CRU regulatory scheme), draft

**Quotes (at least 5, spread across statuses):**

- Two `issued` quotes
- One `accepted` quote
- One `draft` quote
- One `expired` quote

Each quote should include `statusHistory` with at least 2 events.

---

## Pricing engine

Implement `src/lib/pricing-engine.ts`. This module takes a product and an annual usage
figure and returns a cost breakdown.

```typescript
interface PricingInput {
  product: Product;
  annualUsageKwh: number;
  usageProfile?: UsageProfile;  // Optional TOU split
}

interface UsageProfile {
  peakPercent: number;
  offPeakPercent: number;
  nightPercent?: number;
}

interface CostBreakdown {
  standingChargeAnnual: number;
  rateLines: { label: string; kwhUsed: number; unitRate: number; cost: number }[];
  leviesTotal: number;
  subtotal: number;
  vat: number;
  total: number;
}

function calculateCost(input: PricingInput): CostBreakdown
```

For TOU products, if no `usageProfile` is supplied, default to 60% peak / 40% off-peak.
For bundled products, sum the cost of each component.

---

## Quote engine

Implement `src/lib/quote-engine.ts`:

- `createQuote(customer, products, usageKwh)` — builds a Quote in draft status
- `advanceStatus(quote, newStatus, note?)` — validates the transition and appends to statusHistory
- `checkEligibility(product, customer)` — runs eligibility rules and returns pass/fail with reasons

Valid status transitions:
- `draft` → `pending_review`, `issued`
- `pending_review` → `issued`, `draft`
- `issued` → `accepted`, `rejected`, `expired`
- Terminal states: `accepted`, `rejected`, `expired`

---

## Pages and UI

### 1. Dashboard (`/`)

Show:
- Summary stats: total products (by status), quotes this month (by status), estimated pipeline value (sum of issued quote totals)
- Recent quotes table (last 5, with status badge)
- Quick action buttons: "New Quote", "Add Product"

### 2. Product Catalogue (`/catalogue`)

Table view of all products. Columns: Name, Type, Fuel, Status, Market(s), Version, Last Updated.

Filters: status (multi-select), product type (multi-select), market.

Each row links to the product detail page.

"Add Product" button opens a modal with a form. Required fields: name, product type,
fuel type, market(s). On submit, add to the in-memory catalogue with `draft` status.

### 3. Product Detail (`/catalogue/[id]`)

Show all product fields. Display pricing structure visually:
- For flat rate: standing charge + unit rate card
- For TOU: a simple visual timeline showing rate bands across a 24h day (use a horizontal
  bar divided into segments coloured by rate band, with a recharts BarChart or a custom
  SVG strip — keep it simple)
- For bundled: list of component products with their rates

Show eligibility rules as a readable list (e.g. "Customer type must be residential").

Show a "Version history" section (version number, effective dates).

Allow editing product status (draft → active → deprecated) via a dropdown.

### 4. Quote List (`/quotes`)

Table view of all quotes. Columns: Reference, Customer, Products, Annual Cost (inc VAT),
Status, Valid Until.

Filters: status, customer type.

"New Quote" button links to `/quotes/new`.

### 5. Quote Builder (`/quotes/new`)

Multi-step form:

**Step 1 — Customer**
- Customer name (text)
- Customer type (residential / SME / corporate)
- Annual usage estimate (kWh input, with a helper note: "typical residential ~3,500 kWh/yr")
- Market (GB / IE / etc.)

**Step 2 — Product Selection**
- Filtered list of `active` products matching the selected market
- Run eligibility check against the customer inputs; show ineligible products greyed out
  with a tooltip explaining why
- Allow selecting one or more products
- Show live cost estimate (call pricing engine) as products are selected

**Step 3 — Review & Issue**
- Full cost breakdown per product (from pricing engine)
- Total estimated annual cost inc VAT
- Notes field
- Valid until date (default: 30 days from today)
- Two actions: "Save as Draft" and "Issue Quote"

### 6. Quote Detail (`/quotes/[id]`)

Show all quote fields. Show status as a badge with the allowed next-status actions as
buttons (e.g. an issued quote shows "Mark Accepted" and "Mark Rejected" buttons).

Show a status timeline — a vertical list of `statusHistory` events with timestamps.

Show the pricing breakdown per line item.

---

## UI conventions

- Use a left sidebar for navigation. Items: Dashboard, Catalogue, Quotes, Pricing Rules.
- Status badges: use colour-coded pills. draft=gray, pending_review=yellow, issued=blue,
  accepted=green, rejected=red, expired=gray.
- Product type badges: use subtle coloured pills (flat_rate=blue, time_of_use=purple,
  dynamic=orange, export=teal, bundled=pink).
- All currency values: format as GBP with £ symbol, 2dp. Rates in p/kWh with 2dp.
- Dates: format as DD MMM YYYY.
- Empty states: show a friendly message and a relevant action (e.g. "No products yet —
  add your first product").
- Tables: sortable columns where relevant. Zebra striping optional.
- Responsive layout is not required — design for a 1280px desktop viewport.

---

## What NOT to build

- Authentication / login
- Backend API or database
- Email / notification sending
- Payment flows
- A mobile layout

---

## Build order

Follow this sequence:

1. Types (`src/lib/types.ts`) — define all interfaces above
2. Seed data (`src/lib/data/seed.ts`) — all products and quotes
3. Pricing engine (`src/lib/pricing-engine.ts`) + tests (inline console assertions are fine)
4. Quote engine (`src/lib/quote-engine.ts`)
5. Data access layer (`src/lib/data/products.ts`, `quotes.ts`, `pricing.ts`)
6. UI primitives (`src/components/ui/`) — Button, Badge, Card, Table, Modal
7. Layout shell — sidebar + header
8. Dashboard page
9. Catalogue list page
10. Product detail page
11. Quote list page
12. Quote builder (multi-step)
13. Quote detail page

At each step, confirm the build compiles before moving to the next step.

---

## Tone of the codebase

This is a portfolio demo. Code should be:
- Clean and readable — clear variable names, no magic numbers
- Well-typed — no `any`, use discriminated unions where the type narrows naturally
- Commented where the domain logic is non-obvious (e.g. TOU rate calculation, eligibility
  rule evaluation)

The goal is to demonstrate product domain understanding and technical literacy, not
production hardening.