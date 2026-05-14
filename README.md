# Energy Retail Operations Platform

A full-stack demo of retail energy operations, built as a portfolio piece. It covers the full energy retail lifecycle - CPQ, customer management, billing, debt & collections, analytics, financial control, and market communications - end-to-end in a single app.

I built this to show how product and technical thinking combine in an energy SaaS context. The data model and state machines reflect how these systems could actually work, not a toy approximation.

Next.js 14, TypeScript, Tailwind CSS. In-memory data - no database needed.

> **Note on AI features:** The AI-labelled features - AI-Assisted Match, AI Rate Health Advisor, AI Catalogue Analysis - are deterministic rule-based logic, not real ML models. They show what these capabilities would look like as product surfaces: how recommendations get presented, what signals drive them, and how they connect to downstream actions (selecting a product, editing a rate, creating a catalogue entry). In a production system, the same surfaces would connect to trained models, live wholesale feeds, and half-hourly consumption data. The design intent is the same; the inference engine behind it would differ. 

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or access via [https://cpq-seven.vercel.app/](https://cpq-seven.vercel.app/)

---

## Modules

Navigation is grouped by operational domain. All sections are reachable from the left sidebar.


| Module                | Path          | Purpose                                                    |
| --------------------- | ------------- | ---------------------------------------------------------- |
| Dashboard             | `/`           | KPI cards, activity feed, billing and switch charts        |
| Product Catalogue     | `/catalogue`  | Browse, configure, and version energy products             |
| Quotes                | `/quotes`     | Quote list and status management                           |
| Quote Builder         | `/quotes/new` | Multi-step quote creation with live pricing                |
| Customers             | `/customers`  | Customer accounts with full operational detail             |
| Billing               | `/billing`    | Bill generation, payment recording, dispute handling       |
| Debt & Collections    | `/debt`       | Arrears management, payment plans, vulnerability flags     |
| Analytics             | `/analytics`  | Portfolio, billing, behaviour, tariff performance, quoting |
| Financial Control     | `/finance`    | Ledger, gross margin, revenue assurance, audit log         |
| Market Communications | `/market`     | Industry messages, switches, meter reads, compliance queue |


---

## Feature Walkthrough

### Dashboard (`/`)

Five KPI cards (active customers, MTD revenue, open tasks, accounts in arrears, compliance items due this week). Eight module quick-links with one-line status. A 6-month billing revenue bar chart and a switches gained/lost chart. Live activity feed from the audit log - entries link through to the affected record.

### Product Catalogue (`/catalogue`)

Table of all products: name, type, fuel, status, market, version, last updated. Filter by status, product type, or market.

An **AI Catalogue Analysis** panel sits above the table. It checks for coverage gaps per market (e.g. no export tariff for IE, no heat pump tariff for GB) and flags each one with a rationale and a **Create →** shortcut that opens the Add Product modal pre-filled with the suggested type and market. The panel rescopes when a market filter is active and clears a gap once the product exists.

Product detail (`/catalogue/[id]`): pricing is visualised by type - flat rate shows a rate card; TOU shows a 24-hour band timeline; bundled lists component rates (electricity + gas). Eligibility rules are rendered in plain English. Full version history with expandable snapshots, and a note that quotes lock pricing at issuance - rate changes never affect issued quotes. Pricing on draft/active products can be edited; saves a versioned archive and activates a new pricing record from the date specified.

### Quotes (`/quotes`, `/quotes/new`, `/quotes/[id]`)

Quote list with status and customer - type filters.

Builder (three steps): customer details and usage estimate → active products filtered by market with live eligibility check and cost estimate → full cost breakdown with notes and valid-until date. Save as draft or issue directly.

Step 1 captures meter type and smart device ownership (EV, solar, battery, heat pump). Smart meter customers also set a usage profile (peak / off-peak / night percentages) that flows through the pricing engine for accurate TOU cost estimates.

Step 2 shows an **AI-Assisted Match** panel above the product list. The recommendation engine evaluates the customer's profile against eligible products and returns up to two recommendations with a confidence level, plain-English rationale, and an estimated saving vs. a flat-rate baseline. Export products (SEG-style tariffs) are visually distinguished as income-bearing rather than cost-bearing, with a `+£X` display. When both import and export products are selected, a net cost summary (import cost − export income) replaces the simple live estimate banner.

Step 3 review shows each product's full cost breakdown. Export product cards display income labels and green totals. A Net Cost Summary card appears when the selection mixes import and export products.

Quote detail: status badge, available transition buttons (e.g. issued → accepted / rejected), status timeline with timestamps, per-product pricing breakdown.

### Customer Management (`/customers`, `/customers/[id]`)

Filterable customer list (type, status, balance bucket) with an Add Customer modal.

Customer detail: tabbed layout - Overview (supply address, meter info, contract dates, direct debit), Billing (bill history with links), Communications, Tasks, Documents, Notes. Right-hand quick-stats panel (balance, usage, product, direct debit). Send Communication and Create Task via modals. Supports deep-linking to a specific tab via `?tab=` query param.

### Billing (`/billing`, `/billing/[id]`)

Overview: 4 KPI cards (total billed MTD, collected, outstanding, overdue) and a recent-bills table with status filters. Generate Bill modal runs the billing engine against a customer and period.

Bill detail: itemised breakdown (standing charge, rate lines, levies, VAT, total) - same visual treatment as quote detail. Payment history. Action buttons: Record Payment, Raise Dispute, Reissue. Status machine enforces valid transitions (issued → paid / overdue / disputed).

### Debt & Collections (`/debt`, `/debt/[customerId]`)

Overview: 4 KPI cards + arrears table with vulnerability indicator and plan-status columns.

Debt detail: arrears summary, payment plan (create/active/breached states with instalment schedule), vulnerability flag toggles, collection stage advancer with confirmation modal. Overdue bills table links through to billing detail.

### Analytics (`/analytics`)

Five tabs:

- **Portfolio Overview** - active customers, revenue and usage trends, product mix, market split
- **Billing Performance** - collection rate, overdue ageing, payment method breakdown
- **Customer Behaviour** - churn indicators, usage distribution, direct debit vs. prepayment split
- **Tariff Performance** - revenue and gross margin per product, bridging into Financial Control
- **Quoting** - conversion funnel (quotes by status, accepted rate), pipeline value (issued quotes), top products by quote frequency, monthly volume trend, and an issued pipeline detail table

All charts use recharts. Figures derive from seed data where possible; static supplementary values are kept consistent with derived totals.

### Financial Control (`/finance`)

Four tabs: Ledger (filterable by entry type), Gross Margin, Revenue Assurance (unbilled accounts with flag-for-review toggle), Audit Log (chronological entries for all mutating operations).

The **Gross Margin** tab has an adjustable wholesale cost proxy (p/kWh) for what-if modelling - change the assumption and the bar chart, KPI cards, and margin-at-risk callout all update reactively. When products fall below the 15% threshold, an **AI Rate Health Advisor** panel appears. For each at-risk product it calculates the minimum rate adjustment needed to restore a 20% target margin (using billed volume as the basis) and shows the precise suggestion - e.g. *"Unit Rate: 24.5p/kWh → 27.1p/kWh (+2.6p/kWh)"* - with a direct link to the product's pricing editor. Both Gross Margin and Analytics → Tariff Performance use the same `getMarginSummary()` source, so the figures always agree.

### Market Communications (`/market`)

Four tabs:

- **Industry Messages** - inbound/outbound messages with Retry action on failures
- **Switch Management** - gain and loss switches; Object action available within the objection window on in-progress gains
- **Meter Reads** - submitted reads by meter and date
- **Compliance Queue** - compliance items with status advancement and overdue highlighting

---

## Seed Data

Loads on startup - no setup needed.

- **Products (9):** GB - flat rate (StandardElec-v2), time-of-use (EcoTOU-v1), dynamic/agile (AgileElec-v1), EV overnight dynamic (AgileEV-v1), SEG export (ExportFIT-v1, SolarExport-v2), bundled dual-fuel (GreenBundle-v1); IE - flat rate (IEFlatElec-v1), time-of-use (IETOUElec-v1)
- **Customers (12):** mix of residential / SME / I&C; smart, traditional, and prepayment meters; a spread of balances including credit, debt, and a suspended account
- **Quotes (5):** two issued, one accepted, one draft, one expired
- **Bills (~40):** mix of paid, overdue, disputed, and issued - generated via the billing engine so totals reconcile with the pricing engine
- **Debt (4 accounts):** active plan, breached plan, vulnerable customer, monitoring stage
- **Market data:** 15 industry messages, 5 switches (2 gain / 3 loss), 8 meter reads, 6 compliance items (2 overdue)
- **Finance:** ledger entries and audit log consistent with seed billing and payment activity

---

## Stack

- Next.js 14 (App Router)
- TypeScript (strict mode, no `any`)
- Tailwind CSS
- lucide-react - icons
- recharts - all data visualisations
- In-memory data layer - no database or external API

---

## Project Structure

```
src/
  app/
    page.tsx                        # Dashboard
    catalogue/                      # Product catalogue + detail
    quotes/                         # Quote list, builder, detail
    customers/                      # Customer list + detail
    billing/                        # Billing overview + bill detail
    debt/                           # Debt overview + customer debt detail
    analytics/                      # Analytics (5 tabs)
    finance/                        # Financial control
    market/                         # Market communications (4 tabs)
  components/
    ui/                             # Button, Badge, Card, Table, Modal
    layout/                         # Grouped sidebar, header shell
    catalogue/                      # Product components
    quotes/                         # Quote builder components
    customers/                      # Customer components
    billing/                        # Billing components
    debt/                           # Debt & collections components
    analytics/                      # Chart components
    finance/                        # Finance components
    market/                         # Market comms components
  lib/
    types.ts                        # All TypeScript interfaces
    pricing-engine.ts               # Core pricing calculation
    quote-engine.ts                 # Quote lifecycle / status machine
    ai-recommendations.ts           # Rule-based product recommendation engine
    catalogue-analysis.ts           # Catalogue coverage gap analysis
    billing-engine.ts               # Bill generation
    debt-engine.ts                  # Payment plan + collection state machine
    market-engine.ts                # Switch / message status transitions
    utils.ts                        # formatCurrency, formatDate, etc.
    data/
      seed.ts                       # Re-exports all seed modules
      seed-customers.ts
      seed-bills.ts
      seed-debt.ts
      seed-market.ts
      seed-finance.ts
      products.ts / quotes.ts / customers.ts / bills.ts
      communications.ts / tasks.ts / debt.ts / market.ts / finance.ts
  hooks/
    useCatalogue.ts
    useQuote.ts
```

