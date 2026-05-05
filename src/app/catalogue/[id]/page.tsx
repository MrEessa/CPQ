'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Pencil, X, Check } from 'lucide-react';
import { getProductById, updateProductStatus, updateProductPricing } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate, formatRate, formatStandingCharge } from '@/lib/utils';
import { PricingStructure, ProductStatus, ProductVersionSnapshot } from '@/lib/types';

const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['active'],
  active: ['deprecated'],
  deprecated: [],
};

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

interface PricingEditState {
  standingCharge: string;
  vatRate: string;
  effectiveFrom: string;
  rates: { id: string; label: string; unitRate: string }[];
  levies: { name: string; ratePerKwh: string }[];
}

interface Props {
  params: { id: string };
}

export default function ProductDetailPage({ params }: Props) {
  const { id } = params;
  const [, forceUpdate] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editState, setEditState] = useState<PricingEditState | null>(null);
  const [saveError, setSaveError] = useState('');

  const productOrUndef = getProductById(id);
  if (!productOrUndef) notFound();
  const product = productOrUndef;

  const allowedTransitions = STATUS_TRANSITIONS[product.status];
  const canEditPricing = product.status !== 'deprecated';

  function handleStatusChange(newStatus: ProductStatus) {
    updateProductStatus(id, newStatus);
    setStatusOpen(false);
    forceUpdate((n) => n + 1);
  }

  function openEdit() {
    setEditState({
      standingCharge: product.pricingStructure.standingCharge?.toString() ?? '',
      vatRate: product.pricingStructure.vatRate.toString(),
      effectiveFrom: new Date().toISOString().split('T')[0],
      rates: product.pricingStructure.rates.map((r) => ({
        id: r.id,
        label: r.label,
        unitRate: r.unitRate.toString(),
      })),
      levies: (product.pricingStructure.levies ?? []).map((l) => ({
        name: l.name,
        ratePerKwh: l.ratePerKwh.toString(),
      })),
    });
    setSaveError('');
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditState(null);
    setSaveError('');
  }

  function handleSavePricing() {
    if (!editState) return;

    const vatRate = parseFloat(editState.vatRate);
    if (isNaN(vatRate) || vatRate < 0) {
      setSaveError('VAT rate must be a valid number.');
      return;
    }
    for (const r of editState.rates) {
      if (isNaN(parseFloat(r.unitRate)) || parseFloat(r.unitRate) < 0) {
        setSaveError(`Unit rate for "${r.label}" must be a valid number.`);
        return;
      }
    }
    if (!editState.effectiveFrom) {
      setSaveError('Effective from date is required.');
      return;
    }

    const newPricing: PricingStructure = {
      currency: product.pricingStructure.currency,
      standingCharge: editState.standingCharge !== ''
        ? parseFloat(editState.standingCharge)
        : undefined,
      vatRate,
      rates: editState.rates.map((r, i) => ({
        ...product.pricingStructure.rates[i],
        unitRate: parseFloat(r.unitRate),
      })),
      levies: editState.levies.length > 0
        ? editState.levies.map((l, i) => ({
            ...((product.pricingStructure.levies ?? [])[i] ?? { name: l.name }),
            ratePerKwh: parseFloat(l.ratePerKwh),
          }))
        : undefined,
    };

    updateProductPricing(id, newPricing, editState.effectiveFrom);
    setEditMode(false);
    setEditState(null);
    setSaveError('');
    forceUpdate((n) => n + 1);
  }

  const isTOU = product.productType === 'time_of_use' || product.productType === 'dynamic';

  // Version history newest-first (current is always first)
  const historyNewestFirst = [...product.versionHistory].reverse();

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
            {canEditPricing && !editMode && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Pencil size={11} /> Edit pricing
              </button>
            )}
            {editMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePricing}
                  className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Check size={11} /> Save new version
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X size={11} /> Cancel
                </button>
              </div>
            )}
          </CardHeader>

          {!editMode ? (
            <>
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
            </>
          ) : (
            editState && (
              <div className="space-y-3 text-sm">
                {/* Standing charge */}
                {product.pricingStructure.standingCharge !== undefined && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Standing charge (p/day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editState.standingCharge}
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, standingCharge: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Rate bands */}
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Unit rates (p/kWh)</p>
                  <div className="space-y-2">
                    {editState.rates.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate text-xs text-gray-600">{r.label}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.unitRate}
                          onChange={(e) =>
                            setEditState((s) => {
                              if (!s) return s;
                              const rates = s.rates.map((x, j) =>
                                j === i ? { ...x, unitRate: e.target.value } : x,
                              );
                              return { ...s, rates };
                            })
                          }
                          className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* VAT */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">VAT (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editState.vatRate}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, vatRate: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Levies */}
                {editState.levies.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Levies (p/kWh)</p>
                    <div className="space-y-2">
                      {editState.levies.map((l, i) => (
                        <div key={l.name} className="flex items-center gap-2">
                          <span className="w-36 shrink-0 truncate text-xs text-gray-600">{l.name}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.ratePerKwh}
                            onChange={(e) =>
                              setEditState((s) => {
                                if (!s) return s;
                                const levies = s.levies.map((x, j) =>
                                  j === i ? { ...x, ratePerKwh: e.target.value } : x,
                                );
                                return { ...s, levies };
                              })
                            }
                            className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Effective from */}
                <div className="border-t border-gray-100 pt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    New version effective from
                  </label>
                  <input
                    type="date"
                    value={editState.effectiveFrom}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, effectiveFrom: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {saveError && (
                  <p className="text-xs text-red-600">{saveError}</p>
                )}
              </div>
            )
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
                tw.daysOfWeek.includes(1) ? (
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
                <div className={`h-2.5 w-2.5 rounded-sm ${BAND_COLOURS[i % BAND_COLOURS.length]}`} />
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
        <div className="space-y-2 text-sm">
          {/* Current version */}
          <VersionRow
            label={`v${product.version} (current)`}
            effectiveFrom={product.effectiveFrom}
            effectiveTo={product.effectiveTo}
            pricingStructure={product.pricingStructure}
            highlight
          />
          {/* Historical versions newest-first */}
          {historyNewestFirst.map((snap) => (
            <VersionRow
              key={snap.version}
              label={`v${snap.version}`}
              effectiveFrom={snap.effectiveFrom}
              effectiveTo={snap.effectiveTo}
              pricingStructure={snap.pricingStructure}
            />
          ))}
          {product.versionHistory.length === 0 && (
            <p className="text-xs text-gray-400">No previous versions.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function VersionRow({
  label,
  effectiveFrom,
  effectiveTo,
  pricingStructure,
  highlight = false,
}: {
  label: string;
  effectiveFrom: string;
  effectiveTo?: string;
  pricingStructure: PricingStructure;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-md border ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className={`font-medium ${highlight ? 'text-blue-800' : 'text-gray-700'}`}>
          {label}
        </span>
        <span className="text-xs text-gray-500">
          {formatDate(effectiveFrom)}
          {effectiveTo ? ` → ${formatDate(effectiveTo)}` : ' → ongoing'}
          <ChevronDown
            size={12}
            className={`ml-2 inline transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 px-3 pb-3 pt-2">
          {pricingStructure.standingCharge !== undefined && (
            <div className="mb-2 text-xs text-gray-600">
              Standing charge: <span className="font-medium">{formatStandingCharge(pricingStructure.standingCharge)}</span>
            </div>
          )}
          <div className="space-y-1">
            {pricingStructure.rates.map((r) => (
              <div key={r.id} className="flex justify-between text-xs text-gray-600">
                <span>{r.label}</span>
                <span className="font-mono text-blue-700">{formatRate(r.unitRate)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">VAT: {pricingStructure.vatRate}%</div>
          {(pricingStructure.levies ?? []).length > 0 && (
            <div className="mt-1 space-y-0.5">
              {pricingStructure.levies!.map((l) => (
                <div key={l.name} className="flex justify-between text-xs text-gray-500">
                  <span>{l.name}</span>
                  <span>{formatRate(l.ratePerKwh)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
