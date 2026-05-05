# Energy CPQ — Configure, Price, Quote Demo

A portfolio project demonstrating CPQ (Configure, Price, Quote) domain knowledge for an energy retail context. It models how energy products are configured, priced, and quoted across multiple tariff structures — including flat-rate, time-of-use, dynamic/agile, export, and bundled propositions.

Built with Next.js 14, TypeScript, and Tailwind CSS. All data is in-memory — no database or backend required.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Application Overview

The app has four main sections, accessible from the left sidebar:

| Section | Path | Purpose |
|---|---|---|
| Dashboard | `/` | Summary stats and recent activity |
| Catalogue | `/catalogue` | Browse and manage energy products |
| Quotes | `/quotes` | View and create customer quotes |
| Pricing Rules | `/pricing` | Overview of pricing structures |

---

## How to Use

### Dashboard

The home screen shows:
- **Summary cards** — total products by status, quotes this month by status, and estimated pipeline value (sum of all issued quote totals)
- **Recent quotes table** — the last 5 quotes with status badges and customer details
- **Quick actions** — buttons to jump directly to "New Quote" or "Add Product"

---

### Product Catalogue (`/catalogue`)

Lists all energy products with columns for name, type, fuel, status, market, version, and last updated date.

**Filtering:** Use the filter bar at the top to narrow by status (draft / active / deprecated), product type, or market.

**Adding a product:**
1. Click **Add Product** (top right)
2. Fill in the required fields: name, product type, fuel type, and market(s)
3. Submit — the product is created in `draft` status and appears in the catalogue

**Viewing a product:** Click any row to open the product detail page.

---

### Product Detail (`/catalogue/[id]`)

Shows the full product record, including:

- **Pricing structure** — displayed visually depending on product type:
  - *Flat rate*: standing charge + unit rate card
  - *Time-of-use*: a 24-hour timeline bar showing rate bands (peak, off-peak, night) by time window
  - *Bundled*: component products listed with their individual rates
- **Eligibility rules** — rendered as readable conditions (e.g. "Customer type must be residential")
- **Version history** — version number and effective date range

**Changing status:** Use the status dropdown to move a product through `draft → active → deprecated`. Only `active` products are available for quoting.

---

### Quote List (`/quotes`)

Lists all quotes with reference number, customer, products, annual cost (inc. VAT), status, and validity date.

**Filtering:** Filter by status or customer type using the dropdowns above the table.

**Opening a quote:** Click any row to view the full quote detail.

---

### Quote Builder (`/quotes/new`)

A three-step wizard for creating a new quote:

**Step 1 — Customer**
- Enter customer name, customer type (residential / SME / corporate), estimated annual usage in kWh, and market (GB / IE)
- A helper note shows a typical residential usage benchmark (3,500 kWh/yr)

**Step 2 — Product Selection**
- Shows all `active` products matching the selected market
- Eligibility is checked automatically against the customer inputs — ineligible products are greyed out with a tooltip explaining the reason
- Select one or more products; a live cost estimate updates as you make selections (powered by the pricing engine)

**Step 3 — Review & Issue**
- Full cost breakdown per product: standing charge, rate lines (kWh × unit rate), levies, subtotal, VAT, and total
- A notes field and valid-until date (defaults to 30 days from today)
- **Save as Draft** — saves the quote without issuing it
- **Issue Quote** — sets status to `issued` and records the status event

---

### Quote Detail (`/quotes/[id]`)

Shows the full quote record including:

- **Status badge** with available next-action buttons (e.g. an `issued` quote shows "Mark Accepted" and "Mark Rejected")
- **Status timeline** — a vertical log of all status transitions with timestamps and optional notes
- **Pricing breakdown** per line item, mirroring the builder review step

---

## Seed Data

The app loads with pre-built seed data so you can explore without creating anything from scratch:

**Products (6):**

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

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **lucide-react** — icons
- **recharts** — pricing visualisations
- In-memory data layer — no database or API needed

---

## Project Structure

```
src/
  app/               # Next.js pages (dashboard, catalogue, quotes, pricing)
  components/
    ui/              # Shared primitives: Button, Badge, Card, Table, Modal
    layout/          # Sidebar, header shell
    catalogue/       # Product-specific components
    quotes/          # Quote builder components
    pricing/         # Pricing rule components
  lib/
    types.ts         # All TypeScript interfaces
    pricing-engine.ts
    quote-engine.ts
    data/            # Seed data + data access (products, quotes, pricing)
  hooks/             # useCatalogue, useQuote
```
