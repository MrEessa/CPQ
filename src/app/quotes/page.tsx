'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { getQuotes } from '@/lib/data/quotes';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CustomerType, QuoteStatus } from '@/lib/types';

const STATUSES: QuoteStatus[] = ['draft', 'pending_review', 'issued', 'accepted', 'rejected', 'expired'];
const CUSTOMER_TYPES: CustomerType[] = ['residential', 'sme', 'ic'];

export default function QuotesPage() {
  const [filterStatus, setFilterStatus]           = useState<QuoteStatus[]>([]);
  const [filterCustomerType, setFilterCustomerType] = useState<CustomerType[]>([]);

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  const quotes = getQuotes({
    status:       filterStatus.length       ? filterStatus       : undefined,
    customerType: filterCustomerType.length ? filterCustomerType : undefined,
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</h2>
        <Link href="/quotes/new">
          <Button size="sm"><Plus size={14} /> New Quote</Button>
        </Link>
      </div>

      <div className="filter-row">
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Status:</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilterStatus((p) => toggleFilter(p, s))} className={`filter-chip ${filterStatus.includes(s) ? 'active' : ''}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Customer:</span>
          {CUSTOMER_TYPES.map((t) => (
            <button key={t} onClick={() => setFilterCustomerType((p) => toggleFilter(p, t))} className={`filter-chip ${filterCustomerType.includes(t) ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      <Card padding={false}>
        {quotes.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No quotes match the selected filters.{' '}
            <Link href="/quotes/new" className="table-link">Create a new quote</Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Products</th>
                <th className="text-right">Annual Cost (inc VAT)</th>
                <th>Status</th>
                <th>Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className="cell-primary cell-mono">
                    <Link href={`/quotes/${q.id}`} className="table-link flex items-center gap-1.5">
                      <FileText size={13} className="shrink-0" />{q.reference}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{q.customerName}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{q.customerType}</div>
                  </td>
                  <td>{q.products.map((p) => p.productName).join(', ')}</td>
                  <td className="text-right cell-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(q.totalWithVat)}</td>
                  <td><Badge variant={q.status} /></td>
                  <td>{formatDate(q.validUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
