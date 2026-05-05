# Energy CPQ — Configure, Price, Quote Demo

A working CPQ demo for energy retail. Products are configured with tariff structures (flat-rate, TOU, dynamic/agile, export, bundled), priced through a calculation engine, and quoted through a status-managed workflow.

Next.js 14, TypeScript, Tailwind. Data is in-memory — no database needed.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Application Overview

Four sections via the left sidebar:

| Section | Path | Purpose |
|---|---|---|
| Dashboard | `/` | Summary stats and recent activity |
| Catalogue | `/catalogue` | Browse and manage energy products |
| Quotes | `/quotes` | View and create customer quotes |
| Pricing Rules | `/pricing` | Overview of pricing structures |

---

## How to Use

### Dashboard

Summary cards showing products by status, quotes this month, and pipeline value (issued quote totals). Below that: the last 5 quotes and shortcuts to New Quote and Add Product.

---

### Product Catalogue (`/catalogue`)

Lists all products — name, type, fuel, status, market, version, last updated.

**Filtering:** Status, product type, or market via the filter bar.

**Adding a product:** Click **Add Product**. Name, product type, fuel type, market(s) are required. Products start in `draft`.

**Viewing a product:** Click any row.

---

### Product Detail (`/catalogue/[id]`)

Full product record including:

- **Pricing structure** — flat rate shows standing charge + unit rate; TOU shows a 24-hour rate band timeline; bundled shows component products and their rates
- **Eligibility rules** — plain-language conditions (e.g. "Customer type must be residential")
- **Version history** — version number and effective dates

**Status changes:** The dropdown moves a product through `draft → active → deprecated`. Only `active` products show up in the quote builder.

---

### Quote List (`/quotes`)

All quotes: reference, customer, products, annual cost (inc. VAT), status, expiry. Filter by status or customer type.

---

### Quote Builder (`/quotes/new`)

Three steps:

**Step 1 — Customer**
Name, type (residential / SME / corporate), estimated annual usage in kWh, and market. There's a benchmark note for residential usage (3,500 kWh/yr).

**Step 2 — Product Selection**
Active products for the chosen market. Eligibility runs against the customer inputs — ineligible products are greyed out with a reason on hover. Cost estimate updates as you select.

**Step 3 — Review & Issue**
Itemised cost breakdown (standing charge, rate lines, levies, VAT, total), a notes field, and a valid-until date (default 30 days). Save as draft or issue.

---

### Quote Detail (`/quotes/[id]`)

Full quote record. The status badge shows available transitions as action buttons — an `issued` quote gets "Mark Accepted" and "Mark Rejected". Below: status timeline with timestamps and the per-product pricing breakdown.

---

## Seed Data

Six products and five quotes load on startup, so there's something to explore immediately.

**Products:**

| ID | Type | Market | Status |
|---|---|---|---|
| StandardElec-v2 | Flat rate | GB | Active |
| EcoTOU-v1 | Time-of-use | GB | Active |
| AgileElec-v1 | Dynamic/agile | GB | Active |
| ExportFIT-v1 | Export (SEG-style) | GB | Active |
| GreenBundle-v1 | Bundled (elec + gas) | GB | Active |
| IEFlatElec-v1 | Flat rate | IE | Draft |

**Quotes (5):** Two issued, one accepted, one draft, one expired — each with a multi-event status history.

---

## Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **lucide-react** — icons
- **recharts** — pricing visualisations
- In-memory data layer — no database

---

## Project Structure

```
src/
  app/               # Pages (dashboard, catalogue, quotes, pricing)
  components/
    ui/              # Button, Badge, Card, Table, Modal
    layout/          # Sidebar, header shell
    catalogue/       # Product-specific components
    quotes/          # Quote builder components
    pricing/         # Pricing rule components
  lib/
    types.ts         # TypeScript interfaces
    pricing-engine.ts
    quote-engine.ts
    data/            # Seed data + data access
  hooks/             # useCatalogue, useQuote
```