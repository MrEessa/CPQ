'use client';

import { useState } from 'react';
import { getAllPricingRules } from '@/lib/data/pricing';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatRate, formatStandingCharge } from '@/lib/utils';
import Link from 'next/link';

const MARKETS = ['GB', 'IE'];

export default function PricingPage() {
  const [filterMarket, setFilterMarket] = useState('');

  const rules = getAllPricingRules(filterMarket || undefined);

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pricing Rules</h2>
          <p className="text-sm text-gray-500">All rate lines across active and draft products</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <span className="text-xs font-medium text-gray-500">Market:</span>
        <button
          onClick={() => setFilterMarket('')}
          className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            filterMarket === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {MARKETS.map((m) => (
          <button
            key={m}
            onClick={() => setFilterMarket((prev) => (prev === m ? '' : m))}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              filterMarket === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {rules.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No pricing rules found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Product</th>
                <th className="px-5 py-2.5 text-left">Type</th>
                <th className="px-5 py-2.5 text-left">Rate Band</th>
                <th className="px-5 py-2.5 text-right">Unit Rate</th>
                <th className="px-5 py-2.5 text-right">Standing Charge</th>
                <th className="px-5 py-2.5 text-center">VAT</th>
                <th className="px-5 py-2.5 text-left">Levies</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr
                  key={r.rateId}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/catalogue/${r.productId}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {r.productName}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={r.productType} />
                  </td>
                  <td className="px-5 py-3 text-gray-700">{r.rateLabel}</td>
                  <td className="px-5 py-3 text-right font-mono text-blue-700">
                    {formatRate(r.unitRate)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {r.standingCharge !== undefined
                      ? formatStandingCharge(r.standingCharge)
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600">{r.vatRate}%</td>
                  <td className="px-5 py-3 text-gray-500">
                    {r.levies.length > 0
                      ? r.levies.map((l) => l.name).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
