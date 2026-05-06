'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { getLedgerEntries, getMarginSummary, getUnbilledAccounts, getAuditEntries, WHOLESALE_COST_PER_KWH } from '@/lib/data/finance';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatDateTime, formatUsage } from '@/lib/utils';
import type { LedgerEntryType, AuditEntryAction } from '@/lib/types';

const SECTIONS = [
  { id: 'ledger',            label: 'Ledger' },
  { id: 'gross-margin',      label: 'Gross Margin' },
  { id: 'revenue-assurance', label: 'Revenue Assurance' },
  { id: 'audit-log',         label: 'Audit Log' },
] as const;

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

export default function FinancePage() {
  const ledgerEntries   = getLedgerEntries();
  const marginSummaries = getMarginSummary();
  const unbilledAccounts = getUnbilledAccounts();
  const auditEntries    = getAuditEntries();

  const [flagged, setFlagged]                   = useState<Set<string>>(new Set());
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<LedgerEntryType[]>([]);

  const filteredLedger = ledgerTypeFilter.length ? ledgerEntries.filter((e) => ledgerTypeFilter.includes(e.type)) : ledgerEntries;

  const totalCharges     = ledgerEntries.filter((e) => e.type === 'charge').reduce((s, e) => s + e.amount, 0);
  const totalPaymentsIn  = ledgerEntries.filter((e) => e.type === 'payment').reduce((s, e) => s + e.amount, 0);
  const totalRevenue     = marginSummaries.reduce((s, m) => s + m.totalRevenue, 0);
  const totalGrossMargin = marginSummaries.reduce((s, m) => s + m.grossMargin, 0);
  const totalWholesale   = marginSummaries.reduce((s, m) => s + m.totalWholesaleCost, 0);
  const blendedMarginPct = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;

  function toggleLedgerType(t: LedgerEntryType) {
    setLedgerTypeFilter((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function toggleFlag(id: string) {
    setFlagged((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h2 className="section-title">Financial Control</h2>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Charges"    value={formatCurrency(totalCharges)}    sub="billed to customers" />
        <KpiCard label="Payments In"      value={formatCurrency(totalPaymentsIn)} sub="received from customers"           valueColor="var(--color-success-text)" />
        <KpiCard label="Gross Margin"     value={formatCurrency(totalGrossMargin)} sub={`${blendedMarginPct.toFixed(1)}% blended margin`} valueColor="var(--color-success-text)" />
        <KpiCard label="Unbilled Accounts" value={String(unbilledAccounts.length)} sub={flagged.size > 0 ? `${flagged.size} flagged for review` : 'no flags raised'} valueColor={unbilledAccounts.length > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)'} />
      </div>

      {/* Section anchor nav */}
      <div className="tab-bar">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="tab-btn">{s.label}</a>
        ))}
      </div>

      {/* ── Ledger ── */}
      <section id="ledger" className="scroll-mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Ledger</h3>
          <div className="flex gap-2">
            {(Object.keys(LEDGER_TYPE_LABELS) as LedgerEntryType[]).map((t) => (
              <button key={t} onClick={() => toggleLedgerType(t)}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
                style={ledgerTypeFilter.includes(t) ? LEDGER_TYPE_STYLE[t] : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                {LEDGER_TYPE_LABELS[t]}
              </button>
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
      </section>

      {/* ── Gross Margin ── */}
      <section id="gross-margin" className="scroll-mt-4 space-y-4">
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Gross Margin</h3>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Total Revenue"   value={formatCurrency(totalRevenue)}  sub="across all tariffs" />
          <KpiCard label="Wholesale Cost"  value={formatCurrency(totalWholesale)} sub={`@ £${WHOLESALE_COST_PER_KWH}/kWh proxy`} />
          <KpiCard label="Blended Margin"  value={`${blendedMarginPct.toFixed(1)}%`} sub={`${formatCurrency(totalGrossMargin)} gross margin`} valueColor={blendedMarginPct >= 30 ? 'var(--color-success-text)' : 'var(--color-warning-text)'} />
        </div>
        <Card padding={false}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Wholesale proxy: £{WHOLESALE_COST_PER_KWH}/kWh · Single source:{' '}
              <code style={{ background: 'var(--bg-elevated)', borderRadius: 3, padding: '1px 4px', fontFamily: 'var(--font-mono)' }}>finance.getMarginSummary()</code>
              {' '}— same data as Analytics → Tariff Performance
            </p>
          </div>
          <table className="data-table">
            <thead><tr><th>Tariff</th><th className="text-right">Usage (kWh)</th><th className="text-right">Revenue</th><th className="text-right">Wholesale Cost</th><th className="text-right">Gross Margin</th><th className="text-right">Margin %</th></tr></thead>
            <tbody>
              {marginSummaries.map((m) => (
                <tr key={m.productId}>
                  <td className="cell-primary">{m.productName}</td>
                  <td className="text-right cell-mono">{formatUsage(m.totalUsageKwh)}</td>
                  <td className="text-right cell-mono cell-primary">{formatCurrency(m.totalRevenue)}</td>
                  <td className="text-right cell-mono">{formatCurrency(m.totalWholesaleCost)}</td>
                  <td className="text-right cell-mono font-medium" style={{ color: 'var(--color-success-text)' }}>{formatCurrency(m.grossMargin)}</td>
                  <td className="text-right cell-mono font-medium" style={{ color: m.grossMarginPercent >= 30 ? 'var(--color-success-text)' : 'var(--color-warning-text)' }}>{m.grossMarginPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── Revenue Assurance ── */}
      <section id="revenue-assurance" className="scroll-mt-4 space-y-4">
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Revenue Assurance</h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>Active customers with no bill raised in the last 60 days — potential unbilled revenue risk. Flag accounts for follow-up.</p>
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
                    <td>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={CUSTOMER_TYPE_STYLE[account.customerType] ?? { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {account.customerType === 'ic' ? 'I&C' : account.customerType.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right">{account.currentProducts.length}</td>
                    <td className="text-right cell-mono font-medium" style={{ color: account.balance >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>{formatCurrency(account.balance)}</td>
                    <td className="text-center">
                      <button
                        onClick={() => toggleFlag(account.id)}
                        className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all"
                        style={flagged.has(account.id)
                          ? { background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }
                          : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                        }
                        onMouseEnter={(e) => { if (!flagged.has(account.id)) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { if (!flagged.has(account.id)) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                      >
                        <Flag className="h-3 w-3" />
                        {flagged.has(account.id) ? 'Flagged' : 'Flag for review'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* ── Audit Log ── */}
      <section id="audit-log" className="scroll-mt-4 space-y-4">
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
                    <td>
                      <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{formatAction(entry.action)}</span>
                    </td>
                    <td className="text-xs">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{entry.entityType}</span>
                      <span className="ml-1 cell-mono" style={{ color: 'var(--text-tertiary)' }}>{entry.entityId}</span>
                    </td>
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
      </section>
    </div>
  );
}
