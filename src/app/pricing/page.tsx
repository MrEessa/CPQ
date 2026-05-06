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
    <div className="w-full space-y-4">
      <div>
        <h2 className="section-title">Pricing Rules</h2>
        <p className="section-subtitle">All rate lines across active and draft products</p>
      </div>

      <div className="filter-row">
        <span className="filter-label">Market:</span>
        <button onClick={() => setFilterMarket('')} className={`filter-chip ${filterMarket === '' ? 'active' : ''}`}>All</button>
        {MARKETS.map((m) => (
          <button key={m} onClick={() => setFilterMarket((p) => (p === m ? '' : m))} className={`filter-chip ${filterMarket === m ? 'active' : ''}`}>{m}</button>
        ))}
      </div>

      <Card padding={false}>
        {rules.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No pricing rules found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Rate Band</th>
                <th className="text-right">Unit Rate</th>
                <th className="text-right">Standing Charge</th>
                <th className="text-center">VAT</th>
                <th>Levies</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.rateId}>
                  <td className="cell-primary">
                    <Link href={`/catalogue/${r.productId}`} className="table-link">{r.productName}</Link>
                  </td>
                  <td><Badge variant={r.productType} /></td>
                  <td>{r.rateLabel}</td>
                  <td className="text-right cell-mono" style={{ color: 'var(--color-primary-text)' }}>{formatRate(r.unitRate)}</td>
                  <td className="text-right">{r.standingCharge !== undefined ? formatStandingCharge(r.standingCharge) : '—'}</td>
                  <td className="text-center">{r.vatRate}%</td>
                  <td>{r.levies.length > 0 ? r.levies.map((l) => l.name).join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
