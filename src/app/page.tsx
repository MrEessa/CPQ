'use client';

import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { getProducts } from '@/lib/data/products';
import { getRecentQuotes, getQuotes } from '@/lib/data/quotes';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QuoteStatus } from '@/lib/types';

const QUOTE_STATUSES: QuoteStatus[] = [
  'draft',
  'pending_review',
  'issued',
  'accepted',
  'rejected',
  'expired',
];

export default function DashboardPage() {
  const products = getProducts();
  const allQuotes = getQuotes();
  const recentQuotes = getRecentQuotes(5);

  const productsByStatus = {
    active: products.filter((p) => p.status === 'active').length,
    draft: products.filter((p) => p.status === 'draft').length,
    deprecated: products.filter((p) => p.status === 'deprecated').length,
  };

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const quotesThisMonth = allQuotes.filter(
    (q) => new Date(q.createdAt) >= thisMonth,
  );

  const pipelineValue = allQuotes
    .filter((q) => q.status === 'issued')
    .reduce((sum, q) => sum + q.totalWithVat, 0);

  const quoteCountByStatus = QUOTE_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: quotesThisMonth.filter((q) => q.status === s).length }),
    {} as Record<QuoteStatus, number>,
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-500">Energy CPQ — portfolio demo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes/new">
            <Button size="sm">
              <Plus size={14} /> New Quote
            </Button>
          </Link>
          <Link href="/catalogue">
            <Button variant="secondary" size="sm">
              <Plus size={14} /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Products
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{products.length}</p>
          <div className="mt-2 flex gap-2 text-xs text-gray-500">
            <span className="font-medium text-green-600">{productsByStatus.active} active</span>
            <span>·</span>
            <span>{productsByStatus.draft} draft</span>
            {productsByStatus.deprecated > 0 && (
              <>
                <span>·</span>
                <span>{productsByStatus.deprecated} deprecated</span>
              </>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Quotes This Month
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{quotesThisMonth.length}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {QUOTE_STATUSES.filter((s) => quoteCountByStatus[s] > 0).map((s) => (
              <span key={s} className="text-xs text-gray-500">
                {quoteCountByStatus[s]} {s.replace(/_/g, ' ')}
              </span>
            ))}
            {quotesThisMonth.length === 0 && (
              <span className="text-xs text-gray-400">None yet this month</span>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Pipeline Value (Issued)
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {formatCurrency(pipelineValue)}
          </p>
          <p className="mt-2 text-xs text-gray-500">Inc. VAT — issued quotes only</p>
        </Card>
      </div>

      <Card padding={false}>
        <CardHeader className="px-5 pt-4">
          <CardTitle>Recent Quotes</CardTitle>
          <Link href="/quotes" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        {recentQuotes.length === 0 ? (
          <div className="px-5 pb-6 text-center text-sm text-gray-400">
            No quotes yet.{' '}
            <Link href="/quotes/new" className="text-blue-600 hover:underline">
              Create your first quote
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-t border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Reference</th>
                <th className="px-5 py-2.5 text-left">Customer</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-right">Total (inc VAT)</th>
                <th className="px-5 py-2.5 text-left">Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {recentQuotes.map((q, i) => (
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
                  <td className="px-5 py-3 text-gray-700">{q.customerName}</td>
                  <td className="px-5 py-3">
                    <Badge variant={q.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(q.totalWithVat)}
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
