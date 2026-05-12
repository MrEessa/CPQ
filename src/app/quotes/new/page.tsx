'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Zap, Car, Sun, Battery, Thermometer } from 'lucide-react';
import { getProducts } from '@/lib/data/products';
import { saveQuote } from '@/lib/data/quotes';
import { createQuote, checkEligibility, advanceStatus } from '@/lib/quote-engine';
import { calculateCost } from '@/lib/pricing-engine';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import TouTimeline from '@/components/pricing/TouTimeline';
import { formatCurrency, formatRate, formatStandingCharge, describeRule } from '@/lib/utils';
import { Customer, CustomerType, EligibilityRule, MeterType, Product, UsageProfile } from '@/lib/types';

type Step = 1 | 2 | 3;

const CUSTOMER_TYPES: CustomerType[] = ['residential', 'sme', 'ic'];
const MARKETS = ['GB', 'IE'];
const METER_TYPES: { value: MeterType; label: string }[] = [
  { value: 'traditional', label: 'Traditional' },
  { value: 'smart',       label: 'Smart' },
  { value: 'prepayment',  label: 'Prepayment' },
  { value: 'hh',          label: 'Half-Hourly (HH)' },
];
const DEFAULT_METER_TYPE: Record<CustomerType, MeterType> = {
  residential: 'traditional',
  sme: 'smart',
  ic: 'hh',
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

export default function NewQuotePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
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

  const isSmart = meterType === 'smart';
  const usageProfile: UsageProfile | undefined = isSmart
    ? { peakPercent: peakPct, offPeakPercent: offPeakPct, nightPercent: nightPct }
    : undefined;

  const now = new Date().toISOString();
  const customer: Customer = {
    id: `cust-new-${Date.now()}`, accountRef: '', name: customerName, customerType, status: 'active',
    supplyAddress: { line1: '', city: '', postcode: '', countryCode: market },
    billingAddress: { line1: '', city: '', postcode: '', countryCode: market },
    meterType, currentProducts: [], annualUsageKwh: annualUsage, market,
    supplyStartDate: now.split('T')[0], balance: 0, createdAt: now, updatedAt: now,
    ...(isSmart ? { hasEV, hasSolar, hasBattery, hasHeatPump } : {}),
  };

  const activeProducts = getProducts({ status: ['active'], market });
  const selectedProducts = activeProducts.filter((p) => selectedProductIds.includes(p.id));

  const eligibilityResults = activeProducts.map((p) => ({ product: p, result: checkEligibility(p, customer) }));
  const eligibleCount = eligibilityResults.filter((r) => r.result.eligible).length;
  const ineligibleCount = eligibilityResults.length - eligibleCount;

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) => prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]);
  }

  const exportKwh = hasSolar ? annualExportKwh : undefined;

  function liveEstimate(products: Product[]): number {
    return products.reduce((sum, p) => sum + calculateCost({ product: p, annualUsageKwh: annualUsage, annualExportKwh: exportKwh, usageProfile }).subtotal, 0);
  }

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

  const step1Valid = customerName.trim().length > 0 && annualUsage > 0 && (!isSmart || profileValid);
  const step2Valid = selectedProductIds.length > 0;

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
            <div>
              <label className="field-label">Customer Name *</label>
              <input className="field-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Acme Corp Ltd" />
            </div>
            <div>
              <label className="field-label">Customer Type *</label>
              <div className="flex gap-2">
                {CUSTOMER_TYPES.map((t) => (
                  <button key={t} onClick={() => { setCustomerType(t); setMeterType(DEFAULT_METER_TYPE[t]); }} style={toggleBtn(customerType === t)} className="capitalize">{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Meter Type *</label>
              <div className="flex flex-wrap gap-2">
                {METER_TYPES.map(({ value, label }) => (
                  <button key={value} onClick={() => setMeterType(value)} style={toggleBtn(meterType === value)}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Annual Usage Estimate (kWh) *</label>
              <input type="number" min={1} className="field-input" value={annualUsage} onChange={(e) => setAnnualUsage(Number(e.target.value))} />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Typical residential ~3,500 kWh/yr · SME ~10,000–50,000 kWh/yr</p>
            </div>

            {/* Usage profile — smart meter only */}
            {isSmart && (
              <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Usage Profile</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Peak %', value: peakPct, setter: setPeakPct },
                    { label: 'Off-Peak %', value: offPeakPct, setter: setOffPeakPct },
                    { label: 'Night %', value: nightPct, setter: setNightPct },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="field-label">{label}</label>
                      <input
                        type="number" min={0} max={100} className="field-input"
                        value={value}
                        onChange={(e) => setter(Math.max(0, Math.min(100, Number(e.target.value))))}
                      />
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
                  Defaults reflect a typical residential profile. Smart meter half-hourly data would populate this automatically in production.
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

            <div>
              <label className="field-label">Market *</label>
              <div className="flex gap-2">
                {MARKETS.map((m) => (
                  <button key={m} onClick={() => { setMarket(m); setSelectedProductIds([]); }} style={toggleBtn(market === m)}>{m}</button>
                ))}
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Products, pricing, and regulatory rules are scoped to the selected market. Adding a new market requires market configuration only — no changes to the pricing or quoting engine.
              </p>
            </div>
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

          {activeProducts.length === 0 && (
            <Card><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active products available for the {market} market.</p></Card>
          )}

          {activeProducts.map((product) => {
            const eligibility = checkEligibility(product, customer);
            const selected = selectedProductIds.includes(product.id);
            const breakdown = selected ? calculateCost({ product, annualUsageKwh: annualUsage, annualExportKwh: exportKwh, usageProfile }) : null;
            const isTOU = product.productType === 'time_of_use' || product.productType === 'dynamic';
            const currency = currencyForProduct(product);

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
                  border: selected ? `1px solid var(--color-primary)` : `1px solid var(--border-default)`,
                  background: selected ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  boxShadow: selected ? `0 0 0 1px var(--color-primary)` : 'none',
                }}
                onClick={() => toggleProduct(product.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selected} readOnly className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</span>
                        <Badge variant={product.productType} />
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                    </div>
                  </div>
                  {breakdown && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Est. annual (ex VAT)</p>
                      <p className="font-semibold" style={{ color: 'var(--color-primary-text)', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(breakdown.subtotal, currency)}
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
                        borderTop: '1px solid var(--border-subtle)',
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
                          <p className="font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{formatRate(r.unitRate)}</p>
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

          {selectedProductIds.length > 0 && (
            <div className="rounded-md px-4 py-2 text-sm" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' }}>
              Live estimate (ex VAT): <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(liveEstimate(selectedProducts))}</strong>
            </div>
          )}

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
            return (
              <Card key={product.id}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{product.name}</h3>
                  <Badge variant={product.productType} />
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
                          {line.label} <span style={{ color: 'var(--text-tertiary)' }}>({line.kwhUsed.toLocaleString()} kWh @ {formatRate(line.unitRate)})</span>
                        </td>
                        <td className="py-1 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(line.cost, currency)}</td>
                      </tr>
                    ))}
                    {bd.leviesTotal > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-1" style={{ color: 'var(--text-secondary)' }}>Levies</td>
                        <td className="py-1 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.leviesTotal, currency)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '1px solid var(--border-default)' }}>
                      <td className="py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>Subtotal (ex VAT)</td>
                      <td className="py-1.5 text-right font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.subtotal, currency)}</td>
                    </tr>
                    <tr>
                      <td className="py-1" style={{ color: 'var(--text-secondary)' }}>VAT ({bd.vat > 0 ? ((bd.vat / bd.subtotal) * 100).toFixed(0) : 0}%)</td>
                      <td className="py-1 text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.vat, currency)}</td>
                    </tr>
                    <tr style={{ background: 'var(--color-primary-subtle)' }}>
                      <td className="rounded-l px-2 py-1.5 font-semibold" style={{ color: 'var(--color-primary-text)' }}>Total (inc VAT)</td>
                      <td className="rounded-r px-2 py-1.5 text-right font-semibold" style={{ color: 'var(--color-primary-text)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.total, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            );
          })}

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
