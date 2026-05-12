'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Pencil, X, Check, CheckCircle2 } from 'lucide-react';
import { getProductById, updateProductStatus, updateProductPricing } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate, formatRate, formatStandingCharge, describeRule } from '@/lib/utils';
import TouTimeline from '@/components/pricing/TouTimeline';
import { Market, PricingStructure, ProductStatus } from '@/lib/types';

const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft:      ['active'],
  active:     ['deprecated'],
  deprecated: [],
};

const REGULATORY_NOTES: Record<string, string> = {
  Ofgem: 'Office of Gas and Electricity Markets — Great Britain\'s energy regulator',
  CRU: 'Commission for Regulation of Utilities — Ireland\'s energy regulator',
  BNetzA: 'Bundesnetzagentur — Germany\'s Federal Network Agency',
};

interface PricingEditState {
  standingCharge: string;
  vatRate: string;
  effectiveFrom: string;
  rates: { id: string; label: string; unitRate: string }[];
  levies: { name: string; ratePerKwh: string }[];
}

interface Props { params: { id: string } }

export default function ProductDetailPage({ params }: Props) {
  const { id } = params;
  const [, forceUpdate]   = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [editState, setEditState]   = useState<PricingEditState | null>(null);
  const [saveError, setSaveError]   = useState('');

  const productOrUndef = getProductById(id);
  if (!productOrUndef) notFound();
  const product = productOrUndef;

  const allowedTransitions = STATUS_TRANSITIONS[product.status];
  const canEditPricing = product.status !== 'deprecated';
  const isTOU = product.productType === 'time_of_use' || product.productType === 'dynamic';
  const historyNewestFirst = [...product.versionHistory].reverse();

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
      rates: product.pricingStructure.rates.map((r) => ({ id: r.id, label: r.label, unitRate: r.unitRate.toString() })),
      levies: (product.pricingStructure.levies ?? []).map((l) => ({ name: l.name, ratePerKwh: l.ratePerKwh.toString() })),
    });
    setSaveError('');
    setEditMode(true);
  }

  function cancelEdit() { setEditMode(false); setEditState(null); setSaveError(''); }

  function handleSavePricing() {
    if (!editState) return;
    const vatRate = parseFloat(editState.vatRate);
    if (isNaN(vatRate) || vatRate < 0) { setSaveError('VAT rate must be a valid number.'); return; }
    for (const r of editState.rates) {
      if (isNaN(parseFloat(r.unitRate)) || parseFloat(r.unitRate) < 0) { setSaveError(`Unit rate for "${r.label}" must be a valid number.`); return; }
    }
    if (!editState.effectiveFrom) { setSaveError('Effective from date is required.'); return; }
    updateProductPricing(id, {
      currency: product.pricingStructure.currency,
      standingCharge: editState.standingCharge !== '' ? parseFloat(editState.standingCharge) : undefined,
      vatRate,
      rates: editState.rates.map((r, i) => ({ ...product.pricingStructure.rates[i], unitRate: parseFloat(r.unitRate) })),
      levies: editState.levies.length > 0 ? editState.levies.map((l, i) => ({ ...((product.pricingStructure.levies ?? [])[i] ?? { name: l.name }), ratePerKwh: parseFloat(l.ratePerKwh) })) : undefined,
    }, editState.effectiveFrom);
    setEditMode(false); setEditState(null); setSaveError(''); forceUpdate((n) => n + 1);
  }

  // Shared small-button style
  const smallBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' };

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/catalogue" style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
        >
          <ArrowLeft size={16} />
        </Link>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{product.name}</h2>
        <Badge variant={product.status} />
        <Badge variant={product.productType} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Product info */}
        <Card>
          <CardHeader>
            <CardTitle>Product Info</CardTitle>
            <div className="relative">
              <button onClick={() => setStatusOpen((o) => !o)} disabled={allowedTransitions.length === 0} style={smallBtn}>
                Change status <ChevronDown size={12} />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-8 z-10" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, boxShadow: 'var(--shadow-tooltip)', minWidth: 140 }}>
                  {allowedTransitions.map((s) => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      className="block w-full px-4 py-2 text-left text-sm capitalize transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >{s}</button>
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
              ...(product.effectiveTo ? [['Effective to', formatDate(product.effectiveTo)]] : []),
              ['Created', formatDate(product.createdAt)],
              ['Updated', formatDate(product.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                <dd className="font-medium capitalize" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{value}</dd>
              </div>
            ))}
          </dl>
          {product.description && <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>}
        </Card>

        {/* Pricing structure */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Structure</CardTitle>
            {canEditPricing && !editMode && (
              <button onClick={openEdit} style={smallBtn}><Pencil size={11} /> Edit pricing</button>
            )}
            {editMode && (
              <div className="flex items-center gap-2">
                <button onClick={handleSavePricing} style={{ ...smallBtn, background: 'var(--color-primary)', color: '#fff', border: 'none' }}>
                  <Check size={11} /> Save new version
                </button>
                <button onClick={cancelEdit} style={smallBtn}><X size={11} /> Cancel</button>
              </div>
            )}
          </CardHeader>

          {!editMode ? (
            <>
              {product.pricingStructure.standingCharge !== undefined && (
                <div className="mb-3 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Standing charge: </span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatStandingCharge(product.pricingStructure.standingCharge)}</span>
                </div>
              )}
              <div className="space-y-2">
                {product.pricingStructure.rates.map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--border-subtle)' }}>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{rate.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-text)' }}>{formatRate(rate.unitRate)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>VAT: {product.pricingStructure.vatRate}%</span>
                <span>{product.pricingStructure.currency}</span>
              </div>
              {(product.pricingStructure.levies ?? []).length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="mb-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Levies</p>
                  {product.pricingStructure.levies!.map((levy) => (
                    <div key={levy.name} className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{levy.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRate(levy.ratePerKwh)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            editState && (
              <div className="space-y-3 text-sm">
                {product.pricingStructure.standingCharge !== undefined && (
                  <div>
                    <label className="field-label">Standing charge (p/day)</label>
                    <input type="number" min="0" step="0.01" className="field-input" value={editState.standingCharge} onChange={(e) => setEditState((s) => s && { ...s, standingCharge: e.target.value })} />
                  </div>
                )}
                <div>
                  <p className="field-label">Unit rates (p/kWh)</p>
                  <div className="space-y-2">
                    {editState.rates.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                        <input type="number" min="0" step="0.01" className="field-input" value={r.unitRate}
                          onChange={(e) => setEditState((s) => { if (!s) return s; return { ...s, rates: s.rates.map((x, j) => j === i ? { ...x, unitRate: e.target.value } : x) }; })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="field-label">VAT (%)</label>
                  <input type="number" min="0" step="0.1" className="field-input" value={editState.vatRate} onChange={(e) => setEditState((s) => s && { ...s, vatRate: e.target.value })} />
                </div>
                {editState.levies.length > 0 && (
                  <div>
                    <p className="field-label">Levies (p/kWh)</p>
                    <div className="space-y-2">
                      {editState.levies.map((l, i) => (
                        <div key={l.name} className="flex items-center gap-2">
                          <span className="w-36 shrink-0 truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{l.name}</span>
                          <input type="number" min="0" step="0.01" className="field-input" value={l.ratePerKwh}
                            onChange={(e) => setEditState((s) => { if (!s) return s; return { ...s, levies: s.levies.map((x, j) => j === i ? { ...x, ratePerKwh: e.target.value } : x) }; })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <label className="field-label">New version effective from</label>
                  <input type="date" className="field-input" value={editState.effectiveFrom} onChange={(e) => setEditState((s) => s && { ...s, effectiveFrom: e.target.value })} />
                </div>
                {saveError && <p className="text-xs" style={{ color: 'var(--color-danger-text)' }}>{saveError}</p>}
              </div>
            )
          )}
        </Card>
      </div>

      {/* TOU timeline */}
      {isTOU && (
        <Card>
          <CardHeader><CardTitle>Rate Timeline (24h — typical weekday)</CardTitle></CardHeader>
          <TouTimeline rates={product.pricingStructure.rates} />
        </Card>
      )}

      {/* Eligibility rules */}
      {product.eligibilityRules.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Eligibility Rules</CardTitle></CardHeader>
          <ul className="space-y-2">
            {product.eligibilityRules.map((rule) => (
              <li key={rule.id} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-success)', marginTop: 3 }} />
                <span style={{ color: 'var(--text-primary)' }}>{describeRule(rule)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Market configuration */}
      <Card>
        <CardHeader><CardTitle>Market Configuration</CardTitle></CardHeader>
        <div className="space-y-4">
          {product.market.map((m: Market) => (
            <div key={m.code}>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' }}>{m.code}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
              </div>
              <dl className="space-y-1.5 text-sm">
                {[
                  ['Currency', m.currency],
                  ['VAT rate', `${m.vatRate}%`],
                  ['Regulatory scheme', m.regulatoryScheme],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                    <dd className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{value}</dd>
                  </div>
                ))}
              </dl>
              {REGULATORY_NOTES[m.regulatoryScheme] && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {REGULATORY_NOTES[m.regulatoryScheme]}
                </p>
              )}
            </div>
          ))}
          <p className="text-xs pt-2" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
            Products are market-configured, not market-hardcoded. Pricing logic, currency formatting, and VAT calculation adapt to the market config — no bespoke development required per market.
          </p>
        </div>
      </Card>

      {/* Version history */}
      <Card>
        <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
        <div className="space-y-2 text-sm">
          <VersionRow label={`v${product.version} (current)`} effectiveFrom={product.effectiveFrom} effectiveTo={product.effectiveTo} pricingStructure={product.pricingStructure} highlight />
          {historyNewestFirst.map((snap) => (
            <VersionRow key={snap.version} label={`v${snap.version}`} effectiveFrom={snap.effectiveFrom} effectiveTo={snap.effectiveTo} pricingStructure={snap.pricingStructure} />
          ))}
          {product.versionHistory.length === 0 && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No previous versions.</p>}
        </div>
      </Card>
    </div>
  );
}

function VersionRow({ label, effectiveFrom, effectiveTo, pricingStructure, highlight = false }: {
  label: string; effectiveFrom: string; effectiveTo?: string; pricingStructure: PricingStructure; highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md" style={{ border: `1px solid ${highlight ? 'var(--color-primary)' : 'var(--border-subtle)'}`, background: highlight ? 'var(--color-primary-subtle)' : 'var(--bg-elevated)' }}>
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="font-medium" style={{ color: highlight ? 'var(--color-primary-text)' : 'var(--text-primary)' }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {formatDate(effectiveFrom)}{effectiveTo ? ` → ${formatDate(effectiveTo)}` : ' → ongoing'}
          <ChevronDown size={12} className={`ml-2 inline transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {pricingStructure.standingCharge !== undefined && (
            <div className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Standing charge: <span className="font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{formatStandingCharge(pricingStructure.standingCharge)}</span>
            </div>
          )}
          <div className="space-y-1">
            {pricingStructure.rates.map((r) => (
              <div key={r.id} className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-text)' }}>{formatRate(r.unitRate)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>VAT: {pricingStructure.vatRate}%</div>
          {(pricingStructure.levies ?? []).length > 0 && (
            <div className="mt-1 space-y-0.5">
              {pricingStructure.levies!.map((l) => (
                <div key={l.name} className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{l.name}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{formatRate(l.ratePerKwh)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
