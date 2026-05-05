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

const STATUSES: QuoteStatus[] = [
  'draft',
  'pending_review',
  'issued',
  'accepted',
  'rejected',
  'expired',
];
const CUSTOMER_TYPES: CustomerType[] = ['residential', 'sme', 'corporate'];

export default function QuotesPage() {
  const [filterStatus, setFilterStatus] = useState<QuoteStatus[]>([]);
  const [filterCustomerType, setFilterCustomerType] = useState<CustomerType[]>([]);

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  const quotes = getQuotes({
    status: filterStatus.length ? filterStatus : undefined,
    customerType: filterCustomerType.length ? filterCustomerType : undefined,
  });

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
        </h2>
        <Link href="/quotes/new">
          <Button size="sm">
            <Plus size={14} /> New Quote
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-3">
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
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Customer:</span>
          {CUSTOMER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterCustomerType((prev) => toggleFilter(prev, t))}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterCustomerType.includes(t)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Card padding={false}>
        {quotes.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No quotes match the selected filters.{' '}
            <Link href="/quotes/new" className="text-blue-600 hover:underline">
              Create a new quote
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Reference</th>
                <th className="px-5 py-2.5 text-left">Customer</th>
                <th className="px-5 py-2.5 text-left">Products</th>
                <th className="px-5 py-2.5 text-right">Annual Cost (inc VAT)</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => (
                <tr
                  key={q.id}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/quotes/${q.id}`}
                      className="flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
                    >
                      <FileText size={13} className="shrink-0" />
                      {q.reference}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{q.customerName}</div>
                    <div className="text-xs capitalize text-gray-400">{q.customerType}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {q.products.map((p) => p.productName).join(', ')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(q.totalWithVat)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={q.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(q.validUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
