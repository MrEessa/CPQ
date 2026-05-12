'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getQuoteById, saveQuote } from '@/lib/data/quotes';
import { advanceStatus, ALLOWED_TRANSITIONS } from '@/lib/quote-engine';
import { calculateCostFromSnapshot } from '@/lib/pricing-engine';
import { getProductById } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate, formatDateTime, formatRate, formatStandingCharge, formatUsage } from '@/lib/utils';
import { QuoteStatus } from '@/lib/types';

const STATUS_ICONS: Partial<Record<QuoteStatus, React.ReactNode>> = {
  accepted: <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />,
  rejected: <XCircle    size={14} style={{ color: 'var(--color-danger)' }} />,
  expired:  <Clock      size={14} style={{ color: 'var(--text-tertiary)' }} />,
};

const TRANSITION_LABELS: Record<QuoteStatus, string> = {
  draft:          'Draft',
  pending_review: 'Send for Review',
  issued:         'Issue Quote',
  accepted:       'Mark Accepted',
  rejected:       'Mark Rejected',
  expired:        'Mark Expired',
};

const TRANSITION_VARIANTS: Partial<Record<QuoteStatus, 'primary' | 'secondary' | 'danger' | 'ghost'>> = {
  issued:         'primary',
  accepted:       'primary',
  rejected:       'danger',
  expired:        'ghost',
  pending_review: 'secondary',
  draft:          'secondary',
};

interface Props { params: { id: string } }

export default function QuoteDetailPage({ params }: Props) {
  const { id } = params;
  const [, forceUpdate] = useState(0);

  const quoteOrUndefined = getQuoteById(id);
  if (!quoteOrUndefined) notFound();
  const quote = quoteOrUndefined;
  const allowedNext = ALLOWED_TRANSITIONS[quote.status];

  function handleTransition(newStatus: QuoteStatus) {
    saveQuote(advanceStatus(quote, newStatus));
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/quotes" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
          >
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{quote.reference}</h2>
          <Badge variant={quote.status} />
        </div>
        {allowedNext.length > 0 && (
          <div className="flex gap-2">
            {allowedNext.map((next) => (
              <Button key={next} size="sm" variant={TRANSITION_VARIANTS[next] ?? 'secondary'} onClick={() => handleTransition(next)}>
                {STATUS_ICONS[next]}{TRANSITION_LABELS[next]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
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
                <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                <dd className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{value}</dd>
              </div>
            ))}
          </dl>
          {quote.notes && (
            <div className="mt-3 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{quote.notes}</div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>Subtotal (ex VAT)</dt>
              <dd className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(quote.estimatedAnnualCost)}</dd>
            </div>
            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)' }}>VAT</dt>
              <dd className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(quote.totalWithVat - quote.estimatedAnnualCost)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>Total (inc VAT)</dt>
              <dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary-text)' }}>{formatCurrency(quote.totalWithVat)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Line items */}
      {quote.products.map((item) => {
        const product = getProductById(item.productId);
        // Export tariffs are priced on export volume; use the stored export figure if available
        const usageForItem =
          product?.productType === 'export' && quote.annualExportKwh !== undefined
            ? quote.annualExportKwh
            : quote.annualUsageKwh;
        // Always calculate from the snapshot taken at quote time, not live product pricing
        const bd = calculateCostFromSnapshot(item.pricingSnapshot, usageForItem);
        return (
          <Card key={item.productId}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{item.productName}</CardTitle>
                {product && <Badge variant={product.productType} />}
                <span className="ml-1 rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>pricing locked at quote time</span>
              </div>
              <Link href={`/catalogue/${item.productId}`} className="table-link text-xs">View product →</Link>
            </CardHeader>
            <table className="w-full text-sm">
              <tbody>
                {bd.standingChargeAnnual > 0 && (
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Standing charge
                      {item.pricingSnapshot.standingCharge !== undefined && (
                        <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>({formatStandingCharge(item.pricingSnapshot.standingCharge)})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.standingChargeAnnual)}</td>
                  </tr>
                )}
                {bd.rateLines.map((line) => (
                  <tr key={line.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {line.label}
                      <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>({line.kwhUsed.toLocaleString()} kWh @ {formatRate(line.unitRate)})</span>
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(line.cost)}</td>
                  </tr>
                ))}
                {bd.leviesTotal > 0 && (
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>Levies</td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.leviesTotal)}</td>
                  </tr>
                )}
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <td className="rounded-l px-1 py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>Subtotal (ex VAT)</td>
                  <td className="rounded-r px-1 py-1.5 text-right font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(bd.subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        );
      })}

      {/* Status timeline */}
      <Card>
        <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
        <ol className="relative pl-5" style={{ borderLeft: '1px solid var(--border-default)' }}>
          {quote.statusHistory.map((event, i) => (
            <li key={i} className="mb-4 last:mb-0">
              <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full" style={{ border: '2px solid var(--bg-surface)', background: 'var(--color-primary)' }} />
              <div className="ml-1">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={event.from} />
                  <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                  <Badge variant={event.to} />
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatDateTime(event.at)}</span>
                </div>
                {event.note && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{event.note}</p>}
              </div>
            </li>
          ))}
          {quote.statusHistory.length === 0 && <li className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No status changes recorded yet.</li>}
        </ol>
      </Card>
    </div>
  );
}
