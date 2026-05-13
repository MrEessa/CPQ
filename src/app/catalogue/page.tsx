'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Sparkles, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { getProducts, addProduct } from '@/lib/data/products';
import { getCatalogueGaps } from '@/lib/catalogue-analysis';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { FuelType, Market, PricingRate, ProductStatus, ProductType } from '@/lib/types';
import { getMarkets } from '@/lib/data/markets';

function defaultRates(productType: ProductType): PricingRate[] {
  const ts = Date.now();
  switch (productType) {
    case 'flat_rate':
      return [{ id: `rate-${ts}-1`, label: 'Unit Rate', unitRate: 0 }];
    case 'time_of_use':
      return [
        { id: `rate-${ts}-1`, label: 'Day Rate', unitRate: 0, timeWindows: [{ daysOfWeek: [1,2,3,4,5], startTime: '07:00', endTime: '23:00' }, { daysOfWeek: [0,6], startTime: '08:00', endTime: '22:00' }] },
        { id: `rate-${ts}-2`, label: 'Night Rate', unitRate: 0, timeWindows: [{ daysOfWeek: [1,2,3,4,5], startTime: '23:00', endTime: '07:00' }, { daysOfWeek: [0,6], startTime: '22:00', endTime: '08:00' }] },
      ];
    case 'dynamic':
      return [
        { id: `rate-${ts}-1`, label: 'Off-Peak', unitRate: 0, timeWindows: [{ daysOfWeek: [0,1,2,3,4,5,6], startTime: '00:00', endTime: '07:00' }] },
        { id: `rate-${ts}-2`, label: 'Standard', unitRate: 0, timeWindows: [{ daysOfWeek: [0,1,2,3,4,5,6], startTime: '07:00', endTime: '16:00' }, { daysOfWeek: [0,1,2,3,4,5,6], startTime: '19:00', endTime: '24:00' }] },
        { id: `rate-${ts}-3`, label: 'Peak', unitRate: 0, timeWindows: [{ daysOfWeek: [1,2,3,4,5], startTime: '16:00', endTime: '19:00' }] },
      ];
    case 'export':
      return [{ id: `rate-${ts}-1`, label: 'Export Rate', unitRate: 0 }];
    case 'bundled':
      return [
        { id: `rate-${ts}-1`, label: 'Electricity Unit Rate', unitRate: 0 },
        { id: `rate-${ts}-2`, label: 'Gas Unit Rate', unitRate: 0 },
      ];
  }
}

const PRODUCT_TYPES: ProductType[] = ['flat_rate', 'time_of_use', 'dynamic', 'export', 'bundled'];
const STATUSES: ProductStatus[] = ['draft', 'active', 'deprecated'];
const FUEL_TYPES: FuelType[] = ['electricity', 'gas', 'dual_fuel', 'ev'];

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  high:   { background: 'var(--color-danger-subtle)',  color: 'var(--color-danger-text)' },
  medium: { background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' },
};

export default function CataloguePage() {
  const [filterStatus, setFilterStatus]   = useState<ProductStatus[]>([]);
  const [filterType, setFilterType]       = useState<ProductType[]>([]);
  const [filterMarket, setFilterMarket]   = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [gapPanelOpen, setGapPanelOpen]   = useState(true);
  const [, forceUpdate]                   = useState(0);
  const [form, setForm]                   = useState({
    name: '', productType: '' as ProductType | '',
    fuelType: '' as FuelType | '', markets: [] as string[],
  });

  const markets = getMarkets();
  const allProducts = getProducts({});
  const products = getProducts({
    status:      filterStatus.length ? filterStatus : undefined,
    productType: filterType.length   ? filterType   : undefined,
    market:      filterMarket        || undefined,
  });

  // Gap analysis scoped to active market filter (or all markets)
  const gaps = getCatalogueGaps(allProducts, filterMarket || undefined);

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function openModalWithSuggestion(productType: ProductType, fuelType: FuelType, market: string) {
    setForm({ name: '', productType, fuelType, markets: [market] });
    setShowModal(true);
  }

  function handleAddProduct() {
    if (!form.name || !form.productType || !form.fuelType || !form.markets.length) return;
    const selectedMarkets: Market[] = markets.filter((m) => form.markets.includes(m.code));
    const pt = form.productType as ProductType;
    const hasStandingCharge = pt !== 'export';
    addProduct({
      name: form.name, description: '', productType: pt,
      fuelType: form.fuelType as FuelType, market: selectedMarkets, eligibilityRules: [],
      pricingStructure: {
        currency: selectedMarkets[0]?.currency ?? 'GBP',
        vatRate: selectedMarkets[0]?.vatRate ?? 5,
        standingCharge: hasStandingCharge ? 0 : undefined,
        rates: defaultRates(pt),
      },
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setShowModal(false);
    setForm({ name: '', productType: '', fuelType: '', markets: [] });
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{products.length} product{products.length !== 1 ? 's' : ''}</h2>
        <Button size="sm" onClick={() => { setForm({ name: '', productType: '', fuelType: '', markets: [] }); setShowModal(true); }}>
          <Plus size={14} /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Status:</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilterStatus((p) => toggleFilter(p, s))} className={`filter-chip ${filterStatus.includes(s) ? 'active' : ''}`}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Type:</span>
          {PRODUCT_TYPES.map((t) => (
            <button key={t} onClick={() => setFilterType((p) => toggleFilter(p, t))} className={`filter-chip ${filterType.includes(t) ? 'active' : ''}`}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Market:</span>
          {markets.map((m) => (
            <button key={m.code} onClick={() => setFilterMarket((p) => (p === m.code ? '' : m.code))} className={`filter-chip ${filterMarket === m.code ? 'active' : ''}`}>{m.code}</button>
          ))}
        </div>
      </div>

      {/* AI Catalogue Gap Analysis */}
      {gaps.length > 0 && (
        <div className="rounded-lg" style={{ border: '1px dashed var(--color-primary)', background: 'var(--bg-elevated)' }}>
          {/* Panel header — always visible */}
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => setGapPanelOpen((o) => !o)}
          >
            <Sparkles size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              AI Catalogue Analysis
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)', fontWeight: 500 }}>
              beta
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
              {gaps.length} coverage gap{gaps.length !== 1 ? 's' : ''} identified
              {filterMarket ? ` in ${filterMarket} market` : ' across active markets'}
            </span>
            <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
              {gapPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {/* Gap cards */}
          {gapPanelOpen && (
            <div
              className="grid gap-3 px-4 pb-4"
              style={{
                gridTemplateColumns: gaps.length > 2 ? 'repeat(2, 1fr)' : `repeat(${gaps.length}, 1fr)`,
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
              }}
            >
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="rounded-md p-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={PRIORITY_STYLE[gap.priority]}
                      >
                        {gap.priority === 'high' ? 'High priority' : 'Medium priority'}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)', fontWeight: 500 }}
                      >
                        {gap.market}
                      </span>
                    </div>
                    <button
                      onClick={() => openModalWithSuggestion(gap.suggestedProductType, gap.suggestedFuelType, gap.market)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-medium"
                      style={{
                        color: 'var(--color-primary-text)',
                        background: 'var(--color-primary-subtle)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Create <ArrowRight size={10} />
                    </button>
                  </div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{gap.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{gap.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product table */}
      <Card padding={false}>
        {products.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No products match the selected filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Fuel</th>
                <th>Status</th>
                <th>Market(s)</th>
                <th className="text-center">Ver.</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="cell-primary">
                    <Link href={`/catalogue/${p.id}`} className="table-link">{p.name}</Link>
                  </td>
                  <td><Badge variant={p.productType} /></td>
                  <td className="capitalize">{p.fuelType.replace(/_/g, ' ')}</td>
                  <td><Badge variant={p.status} /></td>
                  <td>{p.market.map((m) => m.code).join(', ')}</td>
                  <td className="text-center cell-mono">v{p.version}</td>
                  <td>{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Product">
        <div className="space-y-3">
          <div>
            <label className="field-label">Name *</label>
            <input className="field-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. StandardElec-v3" />
          </div>
          <div>
            <label className="field-label">Product Type *</label>
            <select className="field-input" value={form.productType} onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value as ProductType }))}>
              <option value="">Select…</option>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Fuel Type *</label>
            <select className="field-input" value={form.fuelType} onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value as FuelType }))}>
              <option value="">Select…</option>
              {FUEL_TYPES.map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Market(s) *</label>
            <div className="flex gap-4">
              {markets.map((m) => (
                <label key={m.code} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={form.markets.includes(m.code)}
                    onChange={() => setForm((f) => ({ ...f, markets: f.markets.includes(m.code) ? f.markets.filter((c) => c !== m.code) : [...f.markets, m.code] }))}
                  />
                  {m.name} ({m.code})
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddProduct} disabled={!form.name || !form.productType || !form.fuelType || !form.markets.length}>Create Product</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
