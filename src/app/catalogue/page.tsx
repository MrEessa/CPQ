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

const PRODUCT_TYPES: ProductType[] = [
  'flat_rate',
  'time_of_use',
  'dynamic',
  'export',
  'bundled',
];

const STATUSES: ProductStatus[] = ['draft', 'active', 'deprecated'];
const FUEL_TYPES: FuelType[] = ['electricity', 'gas', 'dual_fuel', 'ev'];

export default function CataloguePage() {
  const [filterStatus, setFilterStatus] = useState<ProductStatus[]>([]);
  const [filterType, setFilterType] = useState<ProductType[]>([]);
  const [filterMarket, setFilterMarket] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [, forceUpdate] = useState(0);

  // Form state
  const [form, setForm] = useState({
    name: '',
    productType: '' as ProductType | '',
    fuelType: '' as FuelType | '',
    markets: [] as string[],
  });

  const products = getProducts({
    status: filterStatus.length ? filterStatus : undefined,
    productType: filterType.length ? filterType : undefined,
    market: filterMarket || undefined,
  });

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function handleAddProduct() {
    if (!form.name || !form.productType || !form.fuelType || !form.markets.length) return;

    const selectedMarkets: Market[] = MARKETS.filter((m) =>
      form.markets.includes(m.code),
    );

    addProduct({
      name: form.name,
      description: '',
      productType: form.productType as ProductType,
      fuelType: form.fuelType as FuelType,
      market: selectedMarkets,
      eligibilityRules: [],
      pricingStructure: {
        currency: selectedMarkets[0]?.currency ?? 'GBP',
        rates: [],
        vatRate: selectedMarkets[0]?.vatRate ?? 5,
      },
      effectiveFrom: new Date().toISOString().split('T')[0],
    });

    setShowModal(false);
    setForm({ name: '', productType: '', fuelType: '', markets: [] });
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </h2>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Status:</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus((prev) => toggleFilter(prev, s))}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterStatus.includes(s)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Type:</span>
          {PRODUCT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType((prev) => toggleFilter(prev, t))}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterType.includes(t)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Market:</span>
          {MARKETS.map((m) => (
            <button
              key={m.code}
              onClick={() => setFilterMarket((prev) => (prev === m.code ? '' : m.code))}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterMarket === m.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.code}
            </button>
          ))}
        </div>
      </div>

      <Card padding={false}>
        {products.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No products match the selected filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-5 py-2.5 text-left">Type</th>
                <th className="px-5 py-2.5 text-left">Fuel</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Market(s)</th>
                <th className="px-5 py-2.5 text-center">Ver.</th>
                <th className="px-5 py-2.5 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/catalogue/${p.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={p.productType} />
                  </td>
                  <td className="px-5 py-3 capitalize text-gray-600">
                    {p.fuelType.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={p.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.market.map((m) => m.code).join(', ')}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-500">v{p.version}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Product">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. StandardElec-v3"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Product Type *</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              value={form.productType}
              onChange={(e) =>
                setForm((f) => ({ ...f, productType: e.target.value as ProductType }))
              }
            >
              <option value="">Select…</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Fuel Type *</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              value={form.fuelType}
              onChange={(e) =>
                setForm((f) => ({ ...f, fuelType: e.target.value as FuelType }))
              }
            >
              <option value="">Select…</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Market(s) *</label>
            <div className="flex gap-2">
              {MARKETS.map((m) => (
                <label key={m.code} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.markets.includes(m.code)}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        markets: f.markets.includes(m.code)
                          ? f.markets.filter((c) => c !== m.code)
                          : [...f.markets, m.code],
                      }))
                    }
                  />
                  {m.name} ({m.code})
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddProduct}
              disabled={
                !form.name || !form.productType || !form.fuelType || !form.markets.length
              }
            >
              Create Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
