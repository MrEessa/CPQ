'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Zap, Car, Sun, Battery, Thermometer, Sparkles, TrendingDown, DollarSign } from 'lucide-react';
import { getProducts } from '@/lib/data/products';
import { getCustomers, getCustomerById } from '@/lib/data/customers';
import { saveQuote } from '@/lib/data/quotes';
import { createQuote, checkEligibility, advanceStatus } from '@/lib/quote-engine';
import { calculateCost } from '@/lib/pricing-engine';
import { getAIRecommendations, AIRecommendation } from '@/lib/ai-recommendations';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import TouTimeline from '@/components/pricing/TouTimeline';
import { formatCurrency, formatRate, formatStandingCharge, describeRule } from '@/lib/utils';
import { Customer, CustomerType, EligibilityRule, MeterType, Product, UsageProfile } from '@/lib/types';
import { getMarkets } from '@/lib/data/markets';

type Step = 1 | 2 | 3;

const CUSTOMER_TYPES: CustomerType[] = ['residential', 'sme', 'ic'];
const METER_TYPES: { value: MeterType; label: string }[] = [
  { value: 'traditional', label: 'Traditional' },
  { value: 'smart',       label: 'Smart / AMR' },
  { value: 'prepayment',  label: 'Prepayment' },
];
const DEFAULT_METER_TYPE: Record<CustomerType, MeterType> = {
  residential: 'traditional',
  sme: 'smart',
  ic: 'smart',
};

const DEVICE_OPTIONS = [
  { key: 'hasEV' as const,       label: 'Electric Vehicle',  Icon: Car },
  { key: 'hasSolar' as const,    label: 'Solar Panels',      Icon: Sun },
  { key: 'hasBattery' as const,  label: 'Home Battery',      Icon: Battery },
  { key: 'hasHeatPump' as const, label: 'Heat Pump',         Icon: Thermometer },
];

function StepIndicator({ current }: { current: Step }) {
  const steps = [{ n: 1, label: 'Customer' }, { n: 2, label: 'Products' }, { n: 3, label: 'Review' }];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              background: current === s.n ? 'var(--color-primary)' : current > s.n ? 'var(--color-success)' : 'var(--bg-elevated)',
              color: current >= s.n ? '#ffffff' : 'var(--text-tertiary)',
            }}
          >
            {current > s.n ? <CheckCircle size={14} /> : s.n}
          </div>
          <span className="ml-1.5 text-xs font-medium" style={{ color: current === s.n ? 'var(--color-primary-text)' : 'var(--text-tertiary)' }}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className="mx-3 h-px w-8" style={{ background: 'var(--border-default)' }} />}
        </div>
      ))}
    </div>
  );
}

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    borderRadius: 6, border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-default)'}`,
    background: active ? 'var(--color-primary-subtle)' : 'transparent',
    color: active ? 'var(--color-primary-text)' : 'var(--text-secondary)',
    padding: '6px 14px', fontSize: '0.875rem', cursor: 'pointer',
    fontWeight: active ? 500 : 400, transition: 'all 150ms ease', fontFamily: 'var(--font-body)',
  };
}

function eligibilityHint(failedRules: EligibilityRule[]): string {
  const hints = failedRules.map((rule) => {
    if (rule.field === 'meterType' && rule.operator === 'eq') return 'upgrade to the required meter type';
    if (rule.field === 'meterType' && rule.operator === 'neq') return 'use a different meter type';
    if (rule.field === 'hasEV') return 'indicate EV ownership in the customer profile';
    if (rule.field === 'hasSolar') return 'confirm solar panel installation';
    if (rule.field === 'hasBattery') return 'confirm home battery installation';
    if (rule.field === 'hasHeatPump') return 'confirm heat pump installation';
    if (rule.field === 'customerType') return 'check the customer type meets the tariff requirements';
    if (rule.field === 'annualUsageKwh') return 'adjust the annual usage estimate';
    return rule.description;
  });
  return hints.join('; ');
}

function currencyForProduct(p: Product): string {
  return p.pricingStructure.currency ?? 'GBP';
}

// ── AI Recommendations Panel ─────────────────────────────────────────────────

function AIRecommendationsPanel({
  recommendations,
  allProducts,
  selectedProductIds,
  onAdd,
}: {
  recommendations: AIRecommendation[];
  allProducts: Product[];
  selectedProductIds: string[];
  onAdd: (id: string) => void;
}) {
  if (recommendations.length === 0) return null;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px dashed var(--color-primary)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          AI-Assisted Match
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)', fontWeight: 500 }}
        >
          beta
        </span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Based on customer profile and usage pattern
        </span>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((rec) => {
          const product = allProducts.find((p) => p.id === rec.productId);
          if (!product) return null;
          const isSelected = selectedProductIds.includes(rec.productId);
          const isExport = product.productType === 'export';

          return (
            <div
              key={rec.productId}
              className="rounded-md p-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: rec.confidence === 'high' ? 'var(--color-success-subtle)' : 'var(--color-warning-subtle)',
                      color: rec.confidence === 'high' ? 'var(--color-success-text)' : 'var(--color-warning-text)',
                    }}
                  >
                    {rec.confidence === 'high' ? 'High match' : 'Good match'}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</span>
                  <Badge variant={product.productType} />
                  {isExport && (
                    <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>
                      <DollarSign size={11} /> income
                    </span>
                  )}
                </div>
                {isSelected ? (
                  <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>✓ Added</span>
                ) : (
                  <button
                    onClick={() => onAdd(rec.productId)}
                    className="shrink-0 text-xs font-medium"
                    style={{
                      color: 'var(--color-primary-text)',
                      background: 'var(--color-primary-subtle)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 4,
                      padding: '2px 10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Add to quote
                  </button>
                )}
              </div>

              <p className="mt-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {rec.reason}
              </p>

              {rec.estimatedSavingVsFlat !== undefined && rec.estimatedSavingVsFlat > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: 'var(--color-success-text)' }}>
                  <TrendingDown size={11} />
                  <span className="font-medium">Estimated £{rec.estimatedSavingVsFlat.toFixed(0)}/yr saving vs flat rate</span>
                </div>
              )}

              <ul className="mt-1.5 space-y-0.5">
                {rec.detailLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }}>•</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NewQuotePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);

  // Customer selection mode: 'existing' picks from the customer list, 'prospect' is free-text
  const [customerMode, setCustomerMode] = useState<'existing' | 'prospect'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const allCustomers = getCustomers();
  const marketCodes = getMarkets().map((m) => m.code);

  // Step 1 state — populated from selected customer or entered manually
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('residential');
  const [meterType, setMeterType] = useState<MeterType>('traditional');
  const [annualUsage, setAnnualUsage] = useState(3500);
  const [market, setMarket] = useState('GB');

  // Usage profile (smart meter only)
  const [peakPct, setPeakPct] = useState(60);
  const [offPeakPct, setOffPeakPct] = useState(35);
  const [nightPct, setNightPct] = useState(5);
  const profileSum = peakPct + offPeakPct + nightPct;
  const profileValid = profileSum === 100;

  // Smart devices (smart meter only)
  const [hasEV, setHasEV] = useState(false);
  const [hasSolar, setHasSolar] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);
  const [hasHeatPump, setHasHeatPump] = useState(false);
  const [annualExportKwh, setAnnualExportKwh] = useState(1200);

  // Step 2 / 3 state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0];
  });

  // Pre-select customer from ?customerId= query param
  useEffect(() => {
    const paramId = searchParams.get('customerId');
    if (paramId) {
      const found = getCustomerById(paramId);
      if (found) populateFromCustomer(found, paramId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function populateFromCustomer(c: NonNullable<ReturnType<typeof getCustomerById>>, id: string) {
    setCustomerMode('existing');
    setSelectedCustomerId(id);
    setCustomerName(c.name);
    setCustomerType(c.customerType);
    setMeterType(c.meterType);
    setAnnualUsage(c.annualUsageKwh);
    setMarket(c.market);
    setHasEV(c.hasEV ?? false);
    setHasSolar(c.hasSolar ?? false);
    setHasBattery(c.hasBattery ?? false);
    setHasHeatPump(c.hasHeatPump ?? false);
    setSelectedProductIds([]);
  }

  function handleCustomerSelect(id: string) {
    if (!id) { setSelectedCustomerId(''); return; }
    const c = getCustomerById(id);
    if (c) populateFromCustomer(c, id);
  }

  const isSmart = meterType === 'smart';
  const usageProfile: UsageProfile | undefined = isSmart
    ? { peakPercent: peakPct, offPeakPercent: offPeakPct, nightPercent: nightPct }
    : undefined;

  const now = new Date().toISOString();
  const customerId = customerMode === 'existing' && selectedCustomerId
    ? selectedCustomerId
    : `cust-prospect-${Date.now()}`;
  const customer: Customer = {
    id: customerId, accountRef: '', name: customerName, customerType, status: 'active',
    supplyAddress: { line1: '', city: '', postcode: '', countryCode: market },
    billingAddress: { line1: '', city: '', postcode: '', countryCode: market },
    meterType, currentProducts: [], annualUsageKwh: annualUsage, market,
    supplyStartDate: now.split('T')[0], balance: 0, createdAt: now, updatedAt: now,
    ...(isSmart ? { hasEV, hasSolar, hasBattery, hasHeatPump } : {}),
  };

  const allProducts = getProducts({});
  const activeProducts = getProducts({ status: ['active'], market });
  const selectedProducts = activeProducts.filter((p) => selectedProductIds.includes(p.id));

  const eligibilityResults = activeProducts.map((p) => ({ product: p, result: checkEligibility(p, customer) }));
  const eligibleProducts = eligibilityResults.filter((r) => r.result.eligible).map((r) => r.product);
  const eligibleCount = eligibleProducts.length;
  const ineligibleCount = eligibilityResults.length - eligibleCount;

  const recommendations = getAIRecommendations(
    customer,
    eligibleProducts,
    allProducts,
    annualUsage,
    usageProfile,
    isSmart && hasSolar ? annualExportKwh : undefined,
  );

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) => prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]);
  }

  const exportKwh = hasSolar ? annualExportKwh : undefined;

  function handleSaveDraft() {
    const quote = createQuote(customer, selectedProducts, annualUsage, usageProfile, exportKwh);
    const saved = saveQuote({ ...quote, notes, validUntil });
    router.push(`/quotes/${saved.id}`);
  }

  function handleIssue() {
    const quote = createQuote(customer, selectedProducts, annualUsage, usageProfile, exportKwh);
    const issued = advanceStatus({ ...quote, notes, validUntil }, 'issued');
    router.push(`/quotes/${saveQuote(issued).id}`);
  }

  const customerIdentified = customerMode === 'existing' ? !!selectedCustomerId : customerName.trim().length > 0;
  const step1Valid = customerIdentified && annualUsage > 0 && (!isSmart || profileValid);
  const step2Valid = selectedProductIds.length > 0;

  // Net cost summary for mixed import + export selections
  function netCostSummary() {
    const importProducts = selectedProducts.filter((p) => p.productType !== 'export');
    const exportProducts = selectedProducts.filter((p) => p.productType === 'export');
    const importCost = importProducts.reduce(
      (sum, p) => sum + calculateCost({ product: p, annualUsageKwh: annualUsage, annualExportKwh: exportKwh, usageProfile }).subtotal, 0,
    );
    const exportIncome = exportProducts.reduce(
      (sum, p) => sum + calculateCost({ product: p, annualUsageKwh: annualUsage, annualExportKwh: exportKwh, usageProfile }).subtotal, 0,
    );
    const currency = importProducts[0] ? currencyForProduct(importProducts[0]) : 'GBP';
    return { importCost, exportIncome, net: importCost - exportIncome, hasExport: exportProducts.length > 0, currency };
  }

  return (
    <div className="w-full max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
          style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
        >
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>New Quote</h2>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 1: Customer ── */}
      {step === 1 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Customer Details</h3>
          <div className="space-y-4">

            {/* Mode toggle */}
            <div className="flex gap-2">
              {(['existing', 'prospect'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setCustomerMode(mode); setSelectedCustomerId(''); setCustomerName(''); }}
                  style={toggleBtn(customerMode === mode)}
                >
                  {mode === 'existing' ? 'Existing customer' : 'New prospect'}
                </button>
              ))}
            </div>

            {/* Existing customer picker */}
            {customerMode === 'existing' && (
              <div>
                <label className="field-label">Select customer *</label>
                <select
                  className="field-input"
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                >
                  <option value="">— choose a customer —</option>
                  {allCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.accountRef})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Prospect: free-text name */}
            {customerMode === 'prospect' && (
              <div>
                <label className="field-label">Customer Name *</label>
                <input className="field-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Acme Corp Ltd" />
              </div>
            )}

            {/* Fields — shown once a customer is identified */}
            {(customerMode === 'prospect' || selectedCustomerId) && (
              <>
            <div>
              <label className="field-label">Customer Type</label>
              <div className="flex gap-2">
                {CUSTOMER_TYPES.map((t) => (
                  <button key={t} disabled={customerMode === 'existing'} onClick={() => { setCustomerType(t); setMeterType(DEFAULT_METER_TYPE[t]); }} style={{ ...toggleBtn(customerType === t), opacity: customerMode === 'existing' ? 0.6 : 1, cursor: customerMode === 'existing' ? 'default' : 'pointer' }} className="capitalize">{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Meter Type</label>
              <div className="flex flex-wrap gap-2">
                {METER_TYPES.map(({ value, label }) => (
                  <button key={value} disabled={customerMode === 'existing'} onClick={() => setMeterType(value)} style={{ ...toggleBtn(meterType === value), opacity: customerMode === 'existing' ? 0.6 : 1, cursor: customerMode === 'existing' ? 'default' : 'pointer' }}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Annual Usage Estimate (kWh)</label>
              <input type="number" min={1} className="field-input" value={annualUsage} onChange={(e) => setAnnualUsage(Number(e.target.value))} readOnly={customerMode === 'existing'} style={{ opacity: customerMode === 'existing' ? 0.7 : 1 }} />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Typical residential ~3,500 kWh/yr · SME ~10,000–50,000 kWh/yr</p>
            </div>
              </>
            )}

            {/* Usage profile — smart meter only */}
            {isSmart && (
              <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Usage Profile</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Peak %',     hint: '16:00–19:00 weekdays',          value: peakPct,     setter: setPeakPct },
                    { label: 'Off-Peak %', hint: '07:00–16:00 & 19:00–23:00',     value: offPeakPct,  setter: setOffPeakPct },
                    { label: 'Night %',    hint: '23:00–07:00',                   value: nightPct,    setter: setNightPct },
                  ].map(({ label, hint, value, setter }) => (
                    <div key={label}>
                      <label className="field-label">{label}</label>
                      <input
                        type="number" min={0} max={100} className="field-input"
                        value={value}
                        onChange={(e) => setter(Math.max(0, Math.min(100, Number(e.target.value))))}
                      />
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
                    </div>
                  ))}
                </div>
                {!profileValid && (
                  <p className="text-xs font-medium" style={{ color: 'var(--color-danger-text)' }}>
                    Percentages must sum to 100% (currently {profileSum}%)
                  </p>
                )}
                {profileValid && (
                  <p className="text-xs" style={{ color: 'var(--color-success-text)' }}>✓ Profile sums to 100%</p>
                )}
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Time windows are indicative and based on typical TOU rate bands. In production, these splits would be derived automatically from smart meter half-hourly reads.
                </p>
              </div>
            )}

            {/* Smart devices — smart meter only */}
            {isSmart && (
              <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Smart Devices</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEVICE_OPTIONS.map(({ key, label, Icon }) => {
                    const values: Record<string, boolean> = { hasEV, hasSolar, hasBattery, hasHeatPump };
                    const setters: Record<string, (v: boolean) => void> = { hasEV: setHasEV, hasSolar: setHasSolar, hasBattery: setHasBattery, hasHeatPump: setHasHeatPump };
                    const active = values[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setters[key](!active)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left"
                        style={{
                          border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-default)'}`,
                          background: active ? 'var(--color-primary-subtle)' : 'transparent',
                          color: active ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {hasSolar && (
                  <div>
                    <label className="field-label">Annual export estimate (kWh)</label>
                    <input
                      type="number" min={0} className="field-input"
                      value={annualExportKwh}
                      onChange={(e) => setAnnualExportKwh(Math.max(0, Number(e.target.value)))}
                    />
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Typical 3–4 kWp system exports ~1,000–1,700 kWh/yr after self-consumption
                    </p>
                  </div>
                )}
              </div>
            )}

            {(customerMode === 'prospect' || selectedCustomerId) && (
              <div>
                <label className="field-label">Market</label>
                <div className="flex gap-2">
                  {marketCodes.map((m) => (
                    <button key={m} disabled={customerMode === 'existing'} onClick={() => { setMarket(m); setSelectedProductIds([]); }} style={{ ...toggleBtn(market === m), opacity: customerMode === 'existing' ? 0.6 : 1, cursor: customerMode === 'existing' ? 'default' : 'pointer' }}>{m}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Products, pricing, and regulatory rules are scoped to the selected market. Adding a new market requires market configuration only — no changes to the pricing or quoting engine.
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end">
            <Button size="sm" disabled={!step1Valid} onClick={() => setStep(2)}>Next: Products <ArrowRight size={14} /></Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Product Selection ── */}
      {step === 2 && (
        <div className="space-y-3">
          {/* Eligibility summary banner */}
          <div className="rounded-md px-4 py-2.5 text-sm" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' }}>
            <strong>{eligibleCount} of {eligibilityResults.length}</strong> products are eligible for this customer.
            {ineligibleCount > 0 && <> <span style={{ opacity: 0.8 }}>{ineligibleCount} {ineligibleCount === 1 ? 'product is' : 'products are'} unavailable — see details below.</span></>}
          </div>

          {/* AI Recommendations Panel */}
          <AIRecommendationsPanel
            recommendations={recommendations}
            allProducts={activeProducts}
            selectedProductIds={selectedProductIds}
            onAdd={toggleProduct}
          />

          {activeProducts.length === 0 && (
            <Card><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active products available for the {market} market.</p></Card>
          )}

          {activeProducts.map((product) => {
            const eligibility = checkEligibility(product, customer);
            const selected = selectedProductIds.includes(product.id);
            const breakdown = selected ? calculateCost({ product, annualUsageKwh: annualUsage, annualExportKwh: exportKwh, usageProfile }) : null;
            const isTOU = product.productType === 'time_of_use' || product.productType === 'dynamic';
            const isExport = product.productType === 'export';
            const isBundle = product.productType === 'bundled';
            const currency = currencyForProduct(product);
            const isAIRecommended = recommendations.some((r) => r.productId === product.id);

            if (!eligibility.eligible) {
              return (
                <div
                  key={product.id}
                  className="rounded-lg p-4"
                  style={{ border: '1px solid var(--color-danger)', background: 'var(--bg-surface)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={false} readOnly disabled className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{product.name}</span>
                          <Badge variant={product.productType} />
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{product.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md p-3" style={{ background: 'var(--color-danger-subtle)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <XCircle size={13} style={{ color: 'var(--color-danger)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-danger-text)' }}>Not eligible for this customer</span>
                    </div>
                    <ul className="space-y-1">
                      {eligibility.failedRules.map((rule) => (
                        <li key={rule.id} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }}>•</span>
                          {describeRule(rule)}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid var(--color-danger)', color: 'var(--text-tertiary)' }}>
                      <span className="font-medium">What would make this eligible?</span> {eligibilityHint(eligibility.failedRules)}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={product.id}
                className="rounded-lg p-4 transition-all"
                style={{
                  border: selected
                    ? `1px solid ${isExport ? 'var(--color-success)' : 'var(--color-primary)'}`
                    : isAIRecommended
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--border-default)',
                  background: selected
                    ? (isExport ? 'var(--color-success-subtle)' : 'var(--color-primary-subtle)')
                    : 'var(--bg-surface)',
                  cursor: 'pointer',
                  boxShadow: selected
                    ? `0 0 0 1px ${isExport ? 'var(--color-success)' : 'var(--color-primary)'}`
                    : 'none',
                }}
                onClick={() => toggleProduct(product.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selected} readOnly className="mt-0.5" />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</span>
                        <Badge variant={product.productType} />
                        {isBundle && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
                            Electricity + Gas
                          </span>
                        )}
                        {isExport && (
                          <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>
                            <DollarSign size={11} /> earns income
                          </span>
                        )}
                        {isAIRecommended && !selected && (
                          <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'var(--color-primary-text)' }}>
                            <Sparkles size={10} /> AI Recommended
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                    </div>
                  </div>
                  {breakdown && (
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {isExport ? 'Est. annual income' : 'Est. annual (ex VAT)'}
                      </p>
                      <p
                        className="font-semibold"
                        style={{
                          color: isExport ? 'var(--color-success-text)' : 'var(--color-primary-text)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {isExport ? '+' : ''}{formatCurrency(breakdown.subtotal, currency)}
                      </p>
                    </div>
                  )}
                </div>

                {selected && breakdown && (() => {
                  const hasStanding = product.pricingStructure.standingCharge !== undefined;
                  const colCount = (hasStanding ? 1 : 0) + product.pricingStructure.rates.length;
                  return (
                    <div
                      className="mt-3 gap-2 pt-3 text-xs"
                      style={{
                        borderTop: `1px solid ${isExport ? 'var(--color-success)' : 'var(--border-subtle)'}`,
                        color: 'var(--text-secondary)',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                      }}
                    >
                      {hasStanding && (
                        <div>
                          <p style={{ color: 'var(--text-tertiary)' }}>Standing charge</p>
                          <p className="font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
                            {formatStandingCharge(product.pricingStructure.standingCharge!)}
                          </p>
                        </div>
                      )}
                      {product.pricingStructure.rates.map((r) => (
                        <div key={r.id}>
                          <p style={{ color: 'var(--text-tertiary)' }}>{r.label}</p>
                          <p className="font-medium" style={{ fontFamily: 'var(--font-mono)', color: isExport ? 'var(--color-success-text)' : undefined }}>{formatRate(r.unitRate)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Inline TOU timeline for TOU/dynamic products */}
                {selected && isTOU && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Rate timeline — typical weekday</p>
                    <TouTimeline rates={product.pricingStructure.rates} compact />
                  </div>
                )}
              </div>
            );
          })}

          {/* Live estimate / net cost banner */}
          {selectedProductIds.length > 0 && (() => {
            const { importCost, exportIncome, net, hasExport, currency } = netCostSummary();
            if (hasExport) {
              return (
                <div className="rounded-md px-4 py-2.5 text-sm space-y-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Import cost (ex VAT)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{formatCurrency(importCost, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-success-text)' }}>Export income</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success-text)' }}>− {formatCurrency(exportIncome, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Net estimate (ex VAT)</span>
                    <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-text)' }}>{formatCurrency(net, currency)}</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="rounded-md px-4 py-2 text-sm" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' }}>
                Live estimate (ex VAT): <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(importCost, currency)}</strong>
              </div>
            );
          })()}

          <div className="flex justify-between">
            <Button variant="secondary" size="sm" onClick={() => setStep(1)}>Back</Button>
            <Button size="sm" disabled={!step2Valid} onClick={() => setStep(3)}>Next: Review <ArrowRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Issue ── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Customer</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {[['Name', customerName], ['Type', customerType], ['Annual Usage', `${annualUsage.toLocaleString()} kWh`], ['Market', market], ['Meter', meterType]].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                  <p className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{val}</p>
                </div>
              ))}
            </div>
            {isSmart && (
              <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                Usage profile: <span style={{ fontFamily: 'var(--font-mono)' }}>Peak {peakPct}% / Off-Peak {offPeakPct}% / Night {nightPct}%</span>
              </div>
            )}
          </Card>

          {selectedProducts.map((product) => {
            const bd = calculateCost({ product, annualUsageKwh: annualUsage, annualExportKwh: exportKwh, usageProfile });
            const currency = currencyForProduct(product);
            const isExport = product.productType === 'export';
            const isBundle = product.productType === 'bundled';

            return (
              <Card key={product.id}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{product.name}</h3>
                  <Badge variant={product.productType} />
                  {isExport && (
                    <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>
                      <DollarSign size={11} /> Export income
                    </span>
                  )}
                  {isBundle && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
                      Electricity + Gas bundle
                    </span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {bd.standingChargeAnnual > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-1" style={{ color: 'var(--text-secondary)' }}>Standing charge</td>
                        <td className="py-1 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.standingChargeAnnual, currency)}</td>
                      </tr>
                    )}
                    {bd.rateLines.map((line) => (
                      <tr key={line.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-1" style={{ color: 'var(--text-secondary)' }}>
                          {line.label} <span style={{ color: 'var(--text-tertiary)' }}>({line.kwhUsed.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh @ {formatRate(line.unitRate)})</span>
                        </td>
                        <td className="py-1 text-right" style={{ color: isExport ? 'var(--color-success-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {isExport ? '+' : ''}{formatCurrency(line.cost, currency)}
                        </td>
                      </tr>
                    ))}
                    {bd.leviesTotal > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-1" style={{ color: 'var(--text-secondary)' }}>Levies</td>
                        <td className="py-1 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.leviesTotal, currency)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '1px solid var(--border-default)' }}>
                      <td className="py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {isExport ? 'Annual income (ex VAT)' : 'Subtotal (ex VAT)'}
                      </td>
                      <td className="py-1.5 text-right font-medium" style={{ color: isExport ? 'var(--color-success-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {isExport ? '+' : ''}{formatCurrency(bd.subtotal, currency)}
                      </td>
                    </tr>
                    {!isExport && (
                      <>
                        <tr>
                          <td className="py-1" style={{ color: 'var(--text-secondary)' }}>VAT ({bd.vat > 0 ? ((bd.vat / bd.subtotal) * 100).toFixed(0) : 0}%)</td>
                          <td className="py-1 text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.vat, currency)}</td>
                        </tr>
                        <tr style={{ background: 'var(--color-primary-subtle)' }}>
                          <td className="rounded-l px-2 py-1.5 font-semibold" style={{ color: 'var(--color-primary-text)' }}>Total (inc VAT)</td>
                          <td className="rounded-r px-2 py-1.5 text-right font-semibold" style={{ color: 'var(--color-primary-text)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.total, currency)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </Card>
            );
          })}

          {/* Net cost summary when export products are included */}
          {selectedProducts.some((p) => p.productType === 'export') && (() => {
            const { importCost, exportIncome, net, currency } = netCostSummary();
            const vatRate = selectedProducts.find((p) => p.productType !== 'export')?.pricingStructure.vatRate ?? 5;
            const netWithVat = net * (1 + vatRate / 100);
            return (
              <Card>
                <h3 className="mb-3 text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Net Cost Summary</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="py-1" style={{ color: 'var(--text-secondary)' }}>Total import cost (ex VAT)</td>
                      <td className="py-1 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(importCost, currency)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="py-1" style={{ color: 'var(--color-success-text)' }}>Export income (ex VAT)</td>
                      <td className="py-1 text-right" style={{ color: 'var(--color-success-text)', fontFamily: 'var(--font-mono)' }}>− {formatCurrency(exportIncome, currency)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>Net cost (ex VAT)</td>
                      <td className="py-1.5 text-right font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(net, currency)}</td>
                    </tr>
                    <tr style={{ background: 'var(--color-primary-subtle)' }}>
                      <td className="rounded-l px-2 py-1.5 font-semibold" style={{ color: 'var(--color-primary-text)' }}>Estimated net (inc VAT)</td>
                      <td className="rounded-r px-2 py-1.5 text-right font-semibold" style={{ color: 'var(--color-primary-text)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(netWithVat, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            );
          })()}

          <Card>
            <div className="space-y-3">
              <div>
                <label className="field-label">Notes</label>
                <textarea className="field-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
              </div>
              <div>
                <label className="field-label">Valid Until</label>
                <input type="date" className="field-input" style={{ width: 'auto' }} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" size="sm" onClick={() => setStep(2)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleSaveDraft}>Save as Draft</Button>
              <Button size="sm" onClick={handleIssue}>Issue Quote</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense>
      <NewQuotePageInner />
    </Suspense>
  );
}
