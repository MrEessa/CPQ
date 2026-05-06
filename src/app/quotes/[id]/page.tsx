'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getQuoteById, saveQuote } from '@/lib/data/quotes';
import { advanceStatus, ALLOWED_TRANSITIONS } from '@/lib/quote-engine';
import { calculateCost } from '@/lib/pricing-engine';
import { getProductById } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate, formatDateTime, formatRate, formatStandingCharge, formatUsage } from '@/lib/utils';
import { QuoteStatus } from '@/lib/types';

const STATUS_ICONS: Partial<Record<QuoteStatus, React.ReactNode>> = {
  accepted: <CheckCircle size={14} className="text-green-500" />,
  rejected: <XCircle size={14} className="text-red-500" />,
  expired: <Clock size={14} className="text-gray-400" />,
};

const TRANSITION_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  pending_review: 'Send for Review',
  issued: 'Issue Quote',
  accepted: 'Mark Accepted',
  rejected: 'Mark Rejected',
  expired: 'Mark Expired',
};

const TRANSITION_VARIANTS: Partial<Record<QuoteStatus, 'primary' | 'secondary' | 'danger' | 'ghost'>> = {
  issued: 'primary',
  accepted: 'primary',
  rejected: 'danger',
  expired: 'ghost',
  pending_review: 'secondary',
  draft: 'secondary',
};

interface Props {
  params: { id: string };
}

export default function QuoteDetailPage({ params }: Props) {
  const { id } = params;
  const [, forceUpdate] = useState(0);

  const quoteOrUndefined = getQuoteById(id);
  if (!quoteOrUndefined) notFound();
  const quote = quoteOrUndefined;

  const allowedNext = ALLOWED_TRANSITIONS[quote.status];

  function handleTransition(newStatus: QuoteStatus) {
    const updated = advanceStatus(quote, newStatus);
    saveQuote(updated);
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/quotes" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">{quote.reference}</h2>
          <Badge variant={quote.status} />
        </div>

        {/* Status transition buttons */}
        {allowedNext.length > 0 && (
          <div className="flex gap-2">
            {allowedNext.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={TRANSITION_VARIANTS[next] ?? 'secondary'}
                onClick={() => handleTransition(next)}
              >
                {STATUS_ICONS[next]}
                {TRANSITION_LABELS[next]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Customer info */}
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            {[
              ['Name', quote.customerName],
              ['Type', <span key="type" className="capitalize">{quote.customerType}</span>],
              ['Customer ID', quote.customerId],
              ['Annual usage', formatUsage(quote.annualUsageKwh)],
              ['Quote created', formatDate(quote.createdAt)],
              ['Valid until', formatDate(quote.validUntil)],
              ...(quote.issuedAt ? [['Issued at', formatDateTime(quote.issuedAt)]] : []),
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          {quote.notes && (
            <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {quote.notes}
            </div>
          )}
        </Card>

        {/* Cost summary */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal (ex VAT)</dt>
              <dd className="font-medium text-gray-900">
                {formatCurrency(quote.estimatedAnnualCost)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">VAT</dt>
              <dd className="font-medium text-gray-900">
                {formatCurrency(quote.totalWithVat - quote.estimatedAnnualCost)}
              </dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-base font-semibold text-gray-900">Total (inc VAT)</dt>
              <dd className="text-base font-bold text-blue-700">
                {formatCurrency(quote.totalWithVat)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Line items */}
      {quote.products.map((item) => {
        const product = getProductById(item.productId);
        const bd = product
          ? calculateCost({ product, annualUsageKwh: quote.annualUsageKwh })
          : null;

        return (
          <Card key={item.productId}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{item.productName}</CardTitle>
                {product && <Badge variant={product.productType} />}
              </div>
              <Link
                href={`/catalogue/${item.productId}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View product →
              </Link>
            </CardHeader>

            {bd ? (
              <table className="w-full text-sm">
                <tbody>
                  {bd.standingChargeAnnual > 0 && (
                    <tr className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-500">
                        Standing charge
                        {item.pricingSnapshot.standingCharge !== undefined && (
                          <span className="ml-1 text-gray-400">
                            ({formatStandingCharge(item.pricingSnapshot.standingCharge)})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-right text-gray-700">
                        {formatCurrency(bd.standingChargeAnnual)}
                      </td>
                    </tr>
                  )}
                  {bd.rateLines.map((line) => (
                    <tr key={line.label} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-500">
                        {line.label}
                        <span className="ml-1 text-gray-400">
                          ({line.kwhUsed.toLocaleString()} kWh @ {formatRate(line.unitRate)})
                        </span>
                      </td>
                      <td className="py-1.5 text-right text-gray-700">
                        {formatCurrency(line.cost)}
                      </td>
                    </tr>
                  ))}
                  {bd.leviesTotal > 0 && (
                    <tr className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-500">Levies</td>
                      <td className="py-1.5 text-right text-gray-700">
                        {formatCurrency(bd.leviesTotal)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-50">
                    <td className="rounded-l px-1 py-1.5 font-medium text-gray-800">
                      Subtotal (ex VAT)
                    </td>
                    <td className="rounded-r px-1 py-1.5 text-right font-semibold text-gray-900">
                      {formatCurrency(bd.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">Product no longer available.</p>
            )}
          </Card>
        );
      })}

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <ol className="relative border-l border-gray-200 pl-5">
          {quote.statusHistory.map((event, i) => (
            <li key={i} className="mb-4 last:mb-0">
              <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-blue-400" />
              <div className="ml-1">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={event.from} />
                  <span className="text-gray-400">→</span>
                  <Badge variant={event.to} />
                  <span className="ml-auto text-xs text-gray-400">
                    {formatDateTime(event.at)}
                  </span>
                </div>
                {event.note && (
                  <p className="mt-0.5 text-xs text-gray-500">{event.note}</p>
                )}
              </div>
            </li>
          ))}
          {quote.statusHistory.length === 0 && (
            <li className="text-sm text-gray-400">No status changes recorded yet.</li>
          )}
        </ol>
      </Card>
    </div>
  );
}
