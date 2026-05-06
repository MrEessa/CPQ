'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Info } from 'lucide-react';
import { getProducts } from '@/lib/data/products';
import { saveQuote } from '@/lib/data/quotes';
import { createQuote, checkEligibility, advanceStatus } from '@/lib/quote-engine';
import { calculateCost } from '@/lib/pricing-engine';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatRate, formatStandingCharge } from '@/lib/utils';
import { Customer, CustomerType, Product } from '@/lib/types';

type Step = 1 | 2 | 3;

const CUSTOMER_TYPES: CustomerType[] = ['residential', 'sme', 'ic'];
const MARKETS = ['GB', 'IE'];

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Customer' },
    { n: 2, label: 'Products' },
    { n: 3, label: 'Review' },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              current === s.n
                ? 'bg-blue-600 text-white'
                : current > s.n
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {current > s.n ? <CheckCircle size={14} /> : s.n}
          </div>
          <span
            className={`ml-1.5 text-xs font-medium ${current === s.n ? 'text-blue-700' : 'text-gray-400'}`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <div className="mx-3 h-px w-8 bg-gray-200" />}
        </div>
      ))}
    </div>
  );
}

export default function NewQuotePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('residential');
  const [annualUsage, setAnnualUsage] = useState(3500);
  const [market, setMarket] = useState('GB');

  // Step 2 state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Step 3 state
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const now = new Date().toISOString();
  const customer: Customer = {
    id: `cust-new-${Date.now()}`,
    accountRef: '',
    name: customerName,
    customerType,
    status: 'active',
    supplyAddress: { line1: '', city: '', postcode: '', countryCode: market },
    billingAddress: { line1: '', city: '', postcode: '', countryCode: market },
    meterType: 'smart',
    currentProducts: [],
    annualUsageKwh: annualUsage,
    market,
    supplyStartDate: now.split('T')[0],
    balance: 0,
    createdAt: now,
    updatedAt: now,
  };

  const activeProducts = getProducts({ status: ['active'], market });

  const selectedProducts = activeProducts.filter((p) =>
    selectedProductIds.includes(p.id),
  );

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }

  function liveEstimate(products: Product[]): number {
    return products.reduce((sum, p) => {
      const bd = calculateCost({ product: p, annualUsageKwh: annualUsage });
      return sum + bd.subtotal;
    }, 0);
  }

  function handleSaveDraft() {
    const quote = createQuote(customer, selectedProducts, annualUsage);
    const saved = saveQuote({ ...quote, notes, validUntil });
    router.push(`/quotes/${saved.id}`);
  }

  function handleIssue() {
    const quote = createQuote(customer, selectedProducts, annualUsage);
    const issued = advanceStatus({ ...quote, notes, validUntil }, 'issued');
    const saved = saveQuote(issued);
    router.push(`/quotes/${saved.id}`);
  }

  const step1Valid = customerName.trim().length > 0 && annualUsage > 0;
  const step2Valid = selectedProductIds.length > 0;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">New Quote</h2>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 1: Customer ── */}
      {step === 1 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Customer Details</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Customer Name *
              </label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corp Ltd"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Customer Type *
              </label>
              <div className="flex gap-2">
                {CUSTOMER_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCustomerType(t)}
                    className={`rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${
                      customerType === t
                        ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Annual Usage Estimate (kWh) *
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                value={annualUsage}
                onChange={(e) => setAnnualUsage(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-gray-400">
                Typical residential ~3,500 kWh/yr · SME ~10,000–50,000 kWh/yr
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Market *</label>
              <div className="flex gap-2">
                {MARKETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMarket(m);
                      setSelectedProductIds([]);
                    }}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      market === m
                        ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button size="sm" disabled={!step1Valid} onClick={() => setStep(2)}>
              Next: Products <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Product Selection ── */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="rounded-md bg-blue-50 px-4 py-2 text-xs text-blue-700">
            Showing active products for <strong>{market}</strong> market. Ineligible
            products are greyed out.
          </div>

          {activeProducts.length === 0 && (
            <Card>
              <p className="text-sm text-gray-400">
                No active products available for the {market} market.
              </p>
            </Card>
          )}

          {activeProducts.map((product) => {
            const eligibility = checkEligibility(product, customer);
            const selected = selectedProductIds.includes(product.id);
            const breakdown = selected
              ? calculateCost({ product, annualUsageKwh: annualUsage })
              : null;

            return (
              <div
                key={product.id}
                className={`rounded-lg border bg-white p-4 transition-all ${
                  !eligibility.eligible
                    ? 'cursor-not-allowed border-gray-100 opacity-50'
                    : selected
                      ? 'border-blue-400 shadow-sm ring-1 ring-blue-200'
                      : 'cursor-pointer border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => eligibility.eligible && toggleProduct(product.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      disabled={!eligibility.eligible}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900">
                          {product.name}
                        </span>
                        <Badge variant={product.productType} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">{product.description}</p>
                    </div>
                  </div>
                  {breakdown && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Est. annual (ex VAT)</p>
                      <p className="font-semibold text-blue-700">
                        {formatCurrency(breakdown.subtotal)}
                      </p>
                    </div>
                  )}
                </div>

                {!eligibility.eligible && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>{eligibility.reasons.join(' · ')}</span>
                  </div>
                )}

                {selected && breakdown && (
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                    <div>
                      <p className="text-gray-400">Standing charge</p>
                      <p className="font-medium">
                        {product.pricingStructure.standingCharge !== undefined
                          ? formatStandingCharge(product.pricingStructure.standingCharge)
                          : '—'}
                      </p>
                    </div>
                    {product.pricingStructure.rates.slice(0, 2).map((r) => (
                      <div key={r.id}>
                        <p className="text-gray-400">{r.label}</p>
                        <p className="font-medium">{formatRate(r.unitRate)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {selectedProductIds.length > 0 && (
            <div className="rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
              Live estimate (ex VAT):{' '}
              <strong>{formatCurrency(liveEstimate(selectedProducts))}</strong>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="sm" disabled={!step2Valid} onClick={() => setStep(3)}>
              Next: Review <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Issue ── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Customer</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Name</p>
                <p className="font-medium">{customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="font-medium capitalize">{customerType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Annual Usage</p>
                <p className="font-medium">{annualUsage.toLocaleString()} kWh</p>
              </div>
            </div>
          </Card>

          {selectedProducts.map((product) => {
            const bd = calculateCost({ product, annualUsageKwh: annualUsage });
            return (
              <Card key={product.id}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{product.name}</h3>
                  <Badge variant={product.productType} />
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {bd.standingChargeAnnual > 0 && (
                      <tr className="border-b border-gray-50">
                        <td className="py-1 text-gray-500">Standing charge</td>
                        <td className="py-1 text-right text-gray-700">
                          {formatCurrency(bd.standingChargeAnnual)}
                        </td>
                      </tr>
                    )}
                    {bd.rateLines.map((line) => (
                      <tr key={line.label} className="border-b border-gray-50">
                        <td className="py-1 text-gray-500">
                          {line.label}{' '}
                          <span className="text-gray-400">
                            ({line.kwhUsed.toLocaleString()} kWh @ {formatRate(line.unitRate)})
                          </span>
                        </td>
                        <td className="py-1 text-right text-gray-700">
                          {formatCurrency(line.cost)}
                        </td>
                      </tr>
                    ))}
                    {bd.leviesTotal > 0 && (
                      <tr className="border-b border-gray-50">
                        <td className="py-1 text-gray-500">Levies</td>
                        <td className="py-1 text-right text-gray-700">
                          {formatCurrency(bd.leviesTotal)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td className="py-1.5 font-medium text-gray-800">Subtotal (ex VAT)</td>
                      <td className="py-1.5 text-right font-medium text-gray-900">
                        {formatCurrency(bd.subtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-500">VAT ({bd.vat > 0 ? ((bd.vat / bd.subtotal) * 100).toFixed(0) : 0}%)</td>
                      <td className="py-1 text-right text-gray-700">
                        {formatCurrency(bd.vat)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="rounded-l px-2 py-1.5 font-semibold text-blue-900">
                        Total (inc VAT)
                      </td>
                      <td className="rounded-r px-2 py-1.5 text-right font-semibold text-blue-900">
                        {formatCurrency(bd.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            );
          })}

          <Card>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Valid Until
                </label>
                <input
                  type="date"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
                Save as Draft
              </Button>
              <Button size="sm" onClick={handleIssue}>
                Issue Quote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
