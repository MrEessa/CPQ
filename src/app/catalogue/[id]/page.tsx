'use client';

import { use, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { getProductById, updateProductStatus } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate, formatRate, formatStandingCharge } from '@/lib/utils';
import { ProductStatus } from '@/lib/types';

const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['active'],
  active: ['deprecated'],
  deprecated: [],
};

// Colours for TOU timeline bands
const BAND_COLOURS = [
  'bg-blue-400',
  'bg-purple-400',
  'bg-orange-400',
  'bg-teal-400',
  'bg-pink-400',
  'bg-green-400',
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { id } = use(params);
  const [, forceUpdate] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);

  const product = getProductById(id);
  if (!product) notFound();

  const allowedTransitions = STATUS_TRANSITIONS[product.status];

  function handleStatusChange(newStatus: ProductStatus) {
    updateProductStatus(id, newStatus);
    setStatusOpen(false);
    forceUpdate((n) => n + 1);
  }

  const isTOU =
    product.productType === 'time_of_use' || product.productType === 'dynamic';

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/catalogue" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
        <Badge variant={product.status} />
        <Badge variant={product.productType} />
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Product Info</CardTitle>
            {/* Status editor */}
            <div className="relative">
              <button
                onClick={() => setStatusOpen((o) => !o)}
                disabled={allowedTransitions.length === 0}
                className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Change status <ChevronDown size={12} />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-7 z-10 rounded-md border border-gray-200 bg-white shadow-lg">
                  {allowedTransitions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="block w-full px-4 py-2 text-left text-sm capitalize text-gray-700 hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            {[
              ['ID', product.id],
              ['Fuel type', product.fuelType.replace(/_/g, ' ')],
              ['Market(s)', product.market.map((m) => `${m.name} (${m.code})`).join(', ')],
              ['Version', `v${product.version}`],
              ['Effective from', formatDate(product.effectiveFrom)],
              ...(product.effectiveTo
                ? [['Effective to', formatDate(product.effectiveTo)]]
                : []),
              ['Created', formatDate(product.createdAt)],
              ['Updated', formatDate(product.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium capitalize text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          {product.description && (
            <p className="mt-3 text-sm text-gray-500">{product.description}</p>
          )}
        </Card>

        {/* Pricing structure */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Structure</CardTitle>
          </CardHeader>

          {product.pricingStructure.standingCharge !== undefined && (
            <div className="mb-3 rounded-md bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-500">Standing charge: </span>
              <span className="font-medium">
                {formatStandingCharge(product.pricingStructure.standingCharge)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            {product.pricingStructure.rates.map((rate) => (
              <div
                key={rate.id}
                className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm"
              >
                <span className="font-medium text-gray-800">{rate.label}</span>
                <span className="font-mono text-blue-700">{formatRate(rate.unitRate)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>VAT: {product.pricingStructure.vatRate}%</span>
            <span>{product.pricingStructure.currency}</span>
          </div>

          {(product.pricingStructure.levies ?? []).length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Levies</p>
              {product.pricingStructure.levies!.map((levy) => (
                <div key={levy.name} className="flex justify-between text-xs text-gray-600">
                  <span>{levy.name}</span>
                  <span>{formatRate(levy.ratePerKwh)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* TOU timeline */}
      {isTOU && (
        <Card>
          <CardHeader>
            <CardTitle>Rate Timeline (24h)</CardTitle>
          </CardHeader>
          <div className="relative h-10 overflow-hidden rounded-md bg-gray-100">
            {product.pricingStructure.rates.map((rate, rateIdx) =>
              (rate.timeWindows ?? []).flatMap((tw, twIdx) =>
                tw.daysOfWeek.includes(1) ? ( // show Mon as representative day
                  <div
                    key={`${rate.id}-${twIdx}`}
                    className={`absolute top-0 h-full ${BAND_COLOURS[rateIdx % BAND_COLOURS.length]} flex items-center justify-center overflow-hidden`}
                    style={{
                      left: `${(timeToMinutes(tw.startTime) / 1440) * 100}%`,
                      width: `${
                        ((timeToMinutes(tw.endTime === '24:00' ? '00:00' : tw.endTime) -
                          timeToMinutes(tw.startTime) +
                          1440) %
                          1440) /
                        1440 *
                        100
                      }%`,
                    }}
                    title={`${rate.label}: ${tw.startTime}–${tw.endTime}`}
                  >
                    <span className="truncate px-1 text-xs font-medium text-white">
                      {rate.label}
                    </span>
                  </div>
                ) : [],
              ),
            )}
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.pricingStructure.rates.map((rate, i) => (
              <div key={rate.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div
                  className={`h-2.5 w-2.5 rounded-sm ${BAND_COLOURS[i % BAND_COLOURS.length]}`}
                />
                {rate.label} — {formatRate(rate.unitRate)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Eligibility rules */}
      {product.eligibilityRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Rules</CardTitle>
          </CardHeader>
          <ul className="space-y-1.5">
            {product.eligibilityRules.map((rule) => (
              <li key={rule.id} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                {rule.description}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Version history */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <div className="text-sm">
          <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2">
            <span className="font-medium text-blue-800">v{product.version} (current)</span>
            <span className="text-gray-500">
              Effective {formatDate(product.effectiveFrom)}
              {product.effectiveTo ? ` → ${formatDate(product.effectiveTo)}` : ' → ongoing'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
