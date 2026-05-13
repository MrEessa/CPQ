'use client';

import { Cpu, Globe, Zap, Package, CheckCircle2, CircleDot, Circle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// ─── Data model ───────────────────────────────────────────────────────────────

type Theme = 'ai' | 'product' | 'international' | 'smart';
type Horizon = 'shipped' | 'next' | 'later';

interface Initiative {
  id: string;
  title: string;
  description: string;
  theme: Theme;
  horizon: Horizon;
  quarter: string;
}

// ─── Roadmap data ─────────────────────────────────────────────────────────────

const INITIATIVES: Initiative[] = [
  // ── Shipped ──────────────────────────────────────────────────────────────
  {
    id: 'ai-recommendations',
    title: 'AI-Assisted Product Matching',
    description: 'Rule-based recommendation engine surfaces best-fit products in the quote builder with confidence scoring, plain-English reasoning, and live savings estimates against a flat-rate baseline.',
    theme: 'ai',
    horizon: 'shipped',
    quarter: 'Q1 2026',
  },
  {
    id: 'solar-export',
    title: 'Solar Export Tariff (SEG)',
    description: 'Smart Export Guarantee-style product with dedicated export pricing, device-gated eligibility, net cost display in the quote builder, and income-vs-cost visual treatment throughout.',
    theme: 'product',
    horizon: 'shipped',
    quarter: 'Q1 2026',
  },
  {
    id: 'smart-meter-profiles',
    title: 'Smart Meter Usage Profiles',
    description: 'Quote builder accepts half-hourly consumption splits (peak / off-peak / night) and routes them through the pricing engine, enabling accurate TOU cost estimates without manual rate allocation.',
    theme: 'smart',
    horizon: 'shipped',
    quarter: 'Q4 2025',
  },
  {
    id: 'ie-market',
    title: 'Ireland (IE) Market Launch',
    description: 'Full market configuration for CRU-regulated products — EUR currency, 9% / 13.5% VAT rates, and two active tariffs (flat rate and TOU). No bespoke code: adding a market requires a config object only.',
    theme: 'international',
    horizon: 'shipped',
    quarter: 'Q4 2025',
  },
  {
    id: 'ai-rate-health',
    title: 'AI Rate Health Advisor',
    description: 'Margin monitoring panel that calculates the minimum rate adjustment required to restore a 20% target margin per product, linked directly to the pricing editor in the product catalogue.',
    theme: 'ai',
    horizon: 'shipped',
    quarter: 'Q2 2026',
  },
  {
    id: 'product-versioning',
    title: 'Product Versioning & Quote Snapshots',
    description: 'Rate changes create a new product version with a full history log. Quotes are locked to the pricing at the time of issuance — retrospective repricing is architecturally impossible.',
    theme: 'product',
    horizon: 'shipped',
    quarter: 'Q3 2025',
  },

  // ── Now & Next ────────────────────────────────────────────────────────────
  {
    id: 'heat-pump-tariff',
    title: 'Heat Pump Tariff',
    description: 'Dedicated off-peak TOU product for heat pump owners — overnight cheap rate for thermal storage charging. Eligibility gated on hasHeatPump device flag. Targets government BUS-scheme recipients.',
    theme: 'smart',
    horizon: 'next',
    quarter: 'Q3 2026',
  },
  {
    id: 'de-market-alpha',
    title: 'Germany (DE) Market Alpha',
    description: 'BNetzA regulatory configuration for the DE market. EUR pricing, German VAT rate, and network tariff levy structure. Alpha scoped to a single flat-rate product for piloting with one retail partner.',
    theme: 'international',
    horizon: 'next',
    quarter: 'Q3 2026',
  },
  {
    id: 'ai-catalogue-gaps',
    title: 'AI Catalogue Gap Analysis',
    description: 'Automated coverage analysis that identifies missing product types per market — surfaced directly in the catalogue with pre-populated "Create product" shortcuts. Drives catalogue completeness as a measurable KPI.',
    theme: 'ai',
    horizon: 'next',
    quarter: 'Q3 2026',
  },
  {
    id: 'quoting-analytics',
    title: 'Quoting Conversion Analytics',
    description: 'Quote funnel analytics covering conversion rate, pipeline value, product frequency, and monthly volume trends — giving PMs and commercial leads the leading indicators to track before revenue hits billing.',
    theme: 'product',
    horizon: 'next',
    quarter: 'Q2 2026',
  },

  // ── Later ─────────────────────────────────────────────────────────────────
  {
    id: 'ml-pricing',
    title: 'ML-Driven Pricing Optimisation',
    description: 'Connect the rate health advisor to live wholesale market feeds and a trained regression model. Shift from manual what-if modelling to automated rate suggestions that update on procurement data changes.',
    theme: 'ai',
    horizon: 'later',
    quarter: 'Q4 2026',
  },
  {
    id: 'v2g-battery',
    title: 'V2G & Battery Storage Tariff',
    description: 'Bidirectional pricing for vehicle-to-grid and home battery customers. Import tariff paired with a demand-response export rate during peak grid stress events — requires half-hourly settlement integration.',
    theme: 'smart',
    horizon: 'later',
    quarter: 'Q1 2027',
  },
  {
    id: 'ic-demand-response',
    title: 'I&C Demand Response Tariff',
    description: 'Half-hourly demand management product for industrial and commercial customers. Incorporates Triad avoidance signals, DUoS colour banding, and interruptible supply clauses.',
    theme: 'product',
    horizon: 'later',
    quarter: 'Q4 2026',
  },
  {
    id: 'multi-market-expand',
    title: 'NL & FR Market Expansion',
    description: 'Netherlands (ACM regulatory scheme) and France (CRE) market configurations. Builds on the market-agnostic architecture established by GB and IE — target is configuration-only onboarding for each new market.',
    theme: 'international',
    horizon: 'later',
    quarter: 'Q1 2027',
  },
];

// ─── Theme config ─────────────────────────────────────────────────────────────

const THEMES: Record<Theme, { label: string; Icon: React.ElementType; color: string; subtleColor: string }> = {
  ai:            { label: 'AI & Automation',    Icon: Cpu,     color: 'var(--color-primary-text)',  subtleColor: 'var(--color-primary-subtle)' },
  product:       { label: 'Product Modelling',  Icon: Package, color: 'var(--color-info-text)',     subtleColor: 'var(--color-info-subtle)' },
  international: { label: 'International',      Icon: Globe,   color: 'var(--color-success-text)',  subtleColor: 'var(--color-success-subtle)' },
  smart:         { label: 'Smart Devices',      Icon: Zap,     color: 'var(--color-warning-text)',  subtleColor: 'var(--color-warning-subtle)' },
};

const HORIZONS: { id: Horizon; label: string; sub: string; Icon: React.ElementType; borderColor: string }[] = [
  { id: 'shipped', label: 'Shipped',      sub: 'H2 2025 – Q2 2026', Icon: CheckCircle2, borderColor: 'var(--color-success)' },
  { id: 'next',    label: 'Now & Next',   sub: 'Q2–Q3 2026',        Icon: CircleDot,    borderColor: 'var(--color-primary)' },
  { id: 'later',   label: 'Later',        sub: 'Q4 2026 – Q1 2027', Icon: Circle,       borderColor: 'var(--border-strong)' },
];

// ─── Components ───────────────────────────────────────────────────────────────

function ThemeChip({ theme }: { theme: Theme }) {
  const { label, Icon, color, subtleColor } = THEMES[theme];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded"
      style={{ background: subtleColor, color }}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

function InitiativeCard({ initiative }: { initiative: Initiative }) {
  const isShipped = initiative.horizon === 'shipped';
  return (
    <div
      className="rounded-md p-3"
      style={{
        background: isShipped ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        opacity: initiative.horizon === 'later' ? 0.85 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <ThemeChip theme={initiative.theme} />
        <span className="shrink-0 text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {initiative.quarter}
        </span>
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {initiative.title}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {initiative.description}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const shippedItems = INITIATIVES.filter((i) => i.horizon === 'shipped');
  const nextItems    = INITIATIVES.filter((i) => i.horizon === 'next');
  const laterItems   = INITIATIVES.filter((i) => i.horizon === 'later');

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="section-title">Product Roadmap</h2>
        <p className="section-subtitle">CPQ platform strategy — Q2 2026 view</p>
      </div>

      {/* Strategic context */}
      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary-text)', fontFamily: 'var(--font-display)' }}>
          Strategic direction
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Building for AI-enabled energy operating models. The platform roadmap is organised around three compounding bets:
          embedding AI at every decision point in the quote lifecycle; expanding to new regulatory markets without bespoke development;
          and capturing the smart device segment — EV, solar, heat pump, battery — before it becomes a commodity.
          Each shipped initiative creates leverage for the next. The versioning and market config architecture is the foundation
          that makes both AI and international expansion tractable at speed.
        </p>
      </div>

      {/* Theme legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(THEMES) as [Theme, typeof THEMES[Theme]][]).map(([key, { label, Icon, color, subtleColor }]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: subtleColor, color }}
          >
            <Icon size={12} />
            {label}
          </span>
        ))}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-3 gap-5">
        {HORIZONS.map(({ id, label, sub, Icon, borderColor }) => {
          const items = id === 'shipped' ? shippedItems : id === 'next' ? nextItems : laterItems;
          return (
            <div key={id}>
              {/* Column header */}
              <div
                className="flex items-center gap-2 mb-3 pb-3"
                style={{ borderBottom: `2px solid ${borderColor}` }}
              >
                <Icon size={15} style={{ color: borderColor }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
                </div>
                <span
                  className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  {items.length}
                </span>
              </div>

              {/* Initiative cards */}
              <div className="space-y-2.5">
                {items.map((initiative) => (
                  <InitiativeCard key={initiative.id} initiative={initiative} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footnote */}
      <Card>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Roadmap principles:</span>{' '}
          Shipped items are in this demo codebase and fully functional.
          Now &amp; Next items are scoped and have engineering estimates.
          Later items are directionally committed — sequencing may shift based on customer demand signals, regulatory developments, and procurement data availability.
          All international expansion targets are configuration-first: no new market ships with bespoke code.
        </p>
      </Card>
    </div>
  );
}
