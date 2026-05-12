'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { getLedgerEntries, getMarginSummary, getUnbilledAccounts, getAuditEntries, WHOLESALE_COST_PER_KWH } from '@/lib/data/finance';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatDateTime, formatUsage } from '@/lib/utils';
import type { LedgerEntryType, AuditEntryAction } from '@/lib/types';

type TabId = 'ledger' | 'margin' | 'revenue-assurance' | 'audit-log';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ledger',            label: 'Ledger' },
  { id: 'margin',            label: 'Gross Margin' },
  { id: 'revenue-assurance', label: 'Revenue Assurance' },
  { id: 'audit-log',         label: 'Audit Log' },
];

const MARGIN_THRESHOLD = 15;

function KpiCard({ label, value, sub, valueColor = 'var(--text-primary)' }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <Card>
      <p style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</p>
      <p style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: valueColor }}>{value}</p>
      <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</p>
    </Card>
  );
}

const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  charge: 'Charge', payment: 'Payment', credit: 'Credit', adjustment: 'Adjustment', refund: 'Refund',
};
const LEDGER_TYPE_STYLE: Record<LedgerEntryType, React.CSSProperties> = {
  charge:     { background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' },
  payment:    { background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' },
  credit:     { background: 'var(--color-info-subtle)',    color: 'var(--color-info-text)' },
  adjustment: { background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' },
  refund:     { background: 'var(--color-danger-subtle)',  color: 'var(--color-danger-text)' },
};
const CUSTOMER_TYPE_STYLE: Record<string, React.CSSProperties> = {
  residential: { background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' },
  sme:         { background: 'var(--color-info-subtle)',    color: 'var(--color-info-text)' },
  ic:          { background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' },
};

function formatAction(action: AuditEntryAction): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function barColor(marginPct: number): string {
  if (marginPct >= 30) return 'var(--color-success)';
  if (marginPct >= MARGIN_THRESHOLD) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function FinancePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') ?? 'ledger') as TabId;
  const validTab = TABS.find((t) => t.id === initialTab)?.id ?? 'ledger';
  const [activeTab, setActiveTab] = useState<TabId>(validTab);

  // Sync URL when tab changes
  function switchTab(id: TabId) {
    setActiveTab(id);
    router.replace(`/finance?tab=${id}`);
  }

  // Wholesale cost state (p/kWh — stored as pence for the input, converted to £ for calculations)
  const [wholesalePence, setWholesalePence] = useState(WHOLESALE_COST_PER_KWH * 100); // default 18.0p

  const ledgerEntries    = getLedgerEntries();
  const unbilledAccounts = getUnbilledAccounts();
  const auditEntries     = getAuditEntries();

  // Reactive margin summaries
  const marginSummaries  = getMarginSummary(wholesalePence / 100);

  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<LedgerEntryType[]>([]);
  const filteredLedger = ledgerTypeFilter.length ? ledgerEntries.filter((e) => ledgerTypeFilter.includes(e.type)) : ledgerEntries;

  const totalCharges    = ledgerEntries.filter((e) => e.type === 'charge').reduce((s, e) => s + e.amount, 0);
  const totalPaymentsIn = ledgerEntries.filter((e) => e.type === 'payment').reduce((s, e) => s + e.amount, 0);
  const totalRevenue    = marginSummaries.reduce((s, m) => s + m.totalRevenue, 0);
  const totalWholesale  = marginSummaries.reduce((s, m) => s + m.totalWholesaleCost, 0);
  const totalMargin     = marginSummaries.reduce((s, m) => s + m.grossMargin, 0);
  const blendedPct      = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const atRisk = marginSummaries.filter((m) => m.grossMarginPercent < MARGIN_THRESHOLD);

  const chartData = marginSummaries.map((m) => ({
    name: m.productName.length > 14 ? m.productName.slice(0, 14) + '…' : m.productName,
    fullName: m.productName,
    marginPct: parseFloat(m.grossMarginPercent.toFixed(1)),
    revenue: m.totalRevenue,
    wholesale: m.totalWholesaleCost,
  }));

  function toggleLedgerType(t: LedgerEntryType) {
    setLedgerTypeFilter((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function toggleFlag(id: string) {
    setFlagged((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return (
    <div className="w-full space-y-6">
      <h2 className="section-title">Financial Control</h2>

      {/* Top KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Charges"    value={formatCurrency(totalCharges)}    sub="billed to customers" />
        <KpiCard label="Payments In"      value={formatCurrency(totalPaymentsIn)} sub="received from customers" valueColor="var(--color-success-text)" />
        <KpiCard label="Gross Margin"     value={formatCurrency(totalMargin)}     sub={`${blendedPct.toFixed(1)}% blended margin`} valueColor="var(--color-success-text)" />
        <KpiCard label="Unbilled Accounts" value={String(unbilledAccounts.length)} sub={flagged.size > 0 ? `${flagged.size} flagged for review` : 'no flags raised'} valueColor={unbilledAccounts.length > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)'} />
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => switchTab(t.id)} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {/* ── Ledger ── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Ledger</h3>
            <div className="flex gap-2">
              {(Object.keys(LEDGER_TYPE_LABELS) as LedgerEntryType[]).map((t) => (
                <button key={t} onClick={() => toggleLedgerType(t)}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
                  style={ledgerTypeFilter.includes(t) ? LEDGER_TYPE_STYLE[t] : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >{LEDGER_TYPE_LABELS[t]}</button>
              ))}
            </div>
          </div>
          <Card padding={false}>
            {filteredLedger.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No ledger entries match the selected filter.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {filteredLedger.slice(0, 50).map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.effectiveDate)}</td>
                      <td><span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={LEDGER_TYPE_STYLE[entry.type]}>{LEDGER_TYPE_LABELS[entry.type]}</span></td>
                      <td className="cell-primary">{entry.description}</td>
                      <td className="text-right tabular-nums cell-mono font-medium" style={{ color: entry.amount < 0 ? 'var(--color-danger-text)' : 'var(--text-primary)' }}>{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                {filteredLedger.length > 50 && (
                  <tfoot><tr><td colSpan={4} className="px-5 py-2 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>Showing 50 of {filteredLedger.length} entries</td></tr></tfoot>
                )}
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── Gross Margin ── */}
      {activeTab === 'margin' && (
        <div className="space-y-4">
          {/* Wholesale cost input */}
          <Card>
            <div className="flex items-end gap-4">
              <div>
                <label className="field-label" style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>
                  Wholesale cost proxy (p/kWh)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={5}
                    max={40}
                    step={0.1}
                    value={wholesalePence}
                    onChange={(e) => setWholesalePence(parseFloat(e.target.value) || WHOLESALE_COST_PER_KWH * 100)}
                    className="field-input"
                    style={{ width: 90 }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>p/kWh</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Adjust to model margin under different procurement scenarios. In production, this would pull from live procurement data.
                </p>
              </div>
            </div>
          </Card>

          {/* KPI cards (reactive) */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Total Revenue"  value={formatCurrency(totalRevenue)}  sub="across GBP tariffs" />
            <KpiCard label="Total Wholesale Cost" value={formatCurrency(totalWholesale)} sub={`@ ${wholesalePence.toFixed(1)}p/kWh proxy`} />
            <KpiCard
              label="Blended Margin %"
              value={`${blendedPct.toFixed(1)}%`}
              sub={formatCurrency(totalMargin) + ' gross margin'}
              valueColor={blendedPct >= 25 ? 'var(--color-success-text)' : blendedPct >= 15 ? 'var(--color-warning-text)' : 'var(--color-danger-text)'}
            />
          </div>

          {/* Margin bar chart */}
          {chartData.length > 0 && (
            <Card>
              <p className="mb-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gross Margin % by Product</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
                    formatter={(value, name, props) => {
                      const d = props.payload;
                      return [
                        <span key="tip" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11 }}>
                          Revenue: {formatCurrency(d.revenue)}<br />
                          Wholesale: {formatCurrency(d.wholesale)}<br />
                          Margin: {d.marginPct}%
                        </span>,
                        '',
                      ];
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ''}
                  />
                  <Bar dataKey="marginPct" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={barColor(entry.marginPct)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-success)', display: 'inline-block' }} /> ≥ 30%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-warning)', display: 'inline-block' }} /> 15–29%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-danger)', display: 'inline-block' }} /> {'<'} 15%</span>
              </div>
            </Card>
          )}

          {/* Margin table */}
          <Card padding={false}>
            <table className="data-table">
              <thead><tr><th>Tariff</th><th className="text-right">Usage (kWh)</th><th className="text-right">Revenue</th><th className="text-right">Wholesale Cost</th><th className="text-right">Gross Margin</th><th className="text-right">Margin %</th></tr></thead>
              <tbody>
                {marginSummaries.map((m) => (
                  <tr key={m.productId}>
                    <td className="cell-primary">{m.productName}</td>
                    <td className="text-right cell-mono">{formatUsage(m.totalUsageKwh)}</td>
                    <td className="text-right cell-mono cell-primary">{formatCurrency(m.totalRevenue)}</td>
                    <td className="text-right cell-mono">{formatCurrency(m.totalWholesaleCost)}</td>
                    <td className="text-right cell-mono font-medium" style={{ color: m.grossMargin >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>{formatCurrency(m.grossMargin)}</td>
                    <td className="text-right cell-mono font-medium" style={{ color: m.grossMarginPercent >= 30 ? 'var(--color-success-text)' : m.grossMarginPercent >= MARGIN_THRESHOLD ? 'var(--color-warning-text)' : 'var(--color-danger-text)' }}>
                      {m.grossMarginPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Margin-at-risk callout */}
          {atRisk.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md px-4 py-3 text-sm" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' }}>
              <CheckCircle2 size={15} />
              All products above the {MARGIN_THRESHOLD}% margin threshold at current wholesale assumptions.
            </div>
          ) : (
            <div className="rounded-md px-4 py-3 text-sm" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)', border: '1px solid var(--color-warning)' }}>
              <div className="flex items-center gap-2 mb-1.5 font-semibold">
                <AlertTriangle size={14} />
                {atRisk.length === 1 ? '1 product is' : `${atRisk.length} products are`} below the {MARGIN_THRESHOLD}% margin threshold
              </div>
              <ul className="space-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {atRisk.map((m) => (
                  <li key={m.productId}>
                    • <strong>{m.productName}</strong> — {m.grossMarginPercent.toFixed(1)}% margin at {wholesalePence.toFixed(1)}p/kWh wholesale. Consider a pricing review.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Revenue Assurance ── */}
      {activeTab === 'revenue-assurance' && (
        <div className="space-y-4">
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Revenue Assurance</h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>Active customers with no bill raised in the last 60 days — potential unbilled revenue risk.</p>
          </div>
          <Card padding={false}>
            {unbilledAccounts.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>All active accounts have been billed within the last 60 days.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Account Ref</th><th>Customer</th><th>Type</th><th className="text-right">Products</th><th className="text-right">Balance</th><th className="text-center">Review Flag</th></tr></thead>
                <tbody>
                  {unbilledAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="cell-mono text-xs">{account.accountRef}</td>
                      <td className="cell-primary">{account.name}</td>
                      <td><span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={CUSTOMER_TYPE_STYLE[account.customerType] ?? { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{account.customerType === 'ic' ? 'I&C' : account.customerType.toUpperCase()}</span></td>
                      <td className="text-right">{account.currentProducts.length}</td>
                      <td className="text-right cell-mono font-medium" style={{ color: account.balance >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>{formatCurrency(account.balance)}</td>
                      <td className="text-center">
                        <button onClick={() => toggleFlag(account.id)}
                          className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all"
                          style={flagged.has(account.id) ? { background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => { if (!flagged.has(account.id)) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { if (!flagged.has(account.id)) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                        >
                          <Flag className="h-3 w-3" />{flagged.has(account.id) ? 'Flagged' : 'Flag for review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── Audit Log ── */}
      {activeTab === 'audit-log' && (
        <div className="space-y-4">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Audit Log</h3>
          <Card padding={false}>
            {auditEntries.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No audit entries.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Description</th><th>Performed By</th></tr></thead>
                <tbody>
                  {auditEntries.slice(0, 50).map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap text-xs cell-mono">{formatDateTime(entry.performedAt)}</td>
                      <td><span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{formatAction(entry.action)}</span></td>
                      <td className="text-xs"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{entry.entityType}</span><span className="ml-1 cell-mono" style={{ color: 'var(--text-tertiary)' }}>{entry.entityId}</span></td>
                      <td className="cell-primary">{entry.description}</td>
                      <td style={{ color: 'var(--text-tertiary)' }}>{entry.performedBy ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {auditEntries.length > 50 && (
                  <tfoot><tr><td colSpan={5} className="px-5 py-2 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>Showing 50 of {auditEntries.length} entries</td></tr></tfoot>
                )}
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="w-full py-20 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading…</div>}>
      <FinancePageInner />
    </Suspense>
  );
}
