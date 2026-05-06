'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getProducts, addProduct } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { FuelType, Market, ProductStatus, ProductType } from '@/lib/types';
import { GB_MARKET, IE_MARKET } from '@/lib/data/seed';

const MARKETS = [GB_MARKET, IE_MARKET];
const PRODUCT_TYPES: ProductType[] = ['flat_rate', 'time_of_use', 'dynamic', 'export', 'bundled'];
const STATUSES: ProductStatus[] = ['draft', 'active', 'deprecated'];
const FUEL_TYPES: FuelType[] = ['electricity', 'gas', 'dual_fuel', 'ev'];

export default function CataloguePage() {
  const [filterStatus, setFilterStatus]   = useState<ProductStatus[]>([]);
  const [filterType, setFilterType]       = useState<ProductType[]>([]);
  const [filterMarket, setFilterMarket]   = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [, forceUpdate]                   = useState(0);
  const [form, setForm]                   = useState({ name: '', productType: '' as ProductType | '', fuelType: '' as FuelType | '', markets: [] as string[] });

  const products = getProducts({
    status:      filterStatus.length ? filterStatus : undefined,
    productType: filterType.length   ? filterType   : undefined,
    market:      filterMarket        || undefined,
  });

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function handleAddProduct() {
    if (!form.name || !form.productType || !form.fuelType || !form.markets.length) return;
    const selectedMarkets: Market[] = MARKETS.filter((m) => form.markets.includes(m.code));
    addProduct({
      name: form.name, description: '', productType: form.productType as ProductType,
      fuelType: form.fuelType as FuelType, market: selectedMarkets, eligibilityRules: [],
      pricingStructure: { currency: selectedMarkets[0]?.currency ?? 'GBP', rates: [], vatRate: selectedMarkets[0]?.vatRate ?? 5 },
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
        <Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Product</Button>
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
          {MARKETS.map((m) => (
            <button key={m.code} onClick={() => setFilterMarket((p) => (p === m.code ? '' : m.code))} className={`filter-chip ${filterMarket === m.code ? 'active' : ''}`}>{m.code}</button>
          ))}
        </div>
      </div>

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
              {MARKETS.map((m) => (
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
