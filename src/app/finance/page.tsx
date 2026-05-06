'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  getLedgerEntries,
  getMarginSummary,
  getUnbilledAccounts,
  getAuditEntries,
  WHOLESALE_COST_PER_KWH,
} from '@/lib/data/finance';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatDateTime, formatUsage } from '@/lib/utils';
import type { LedgerEntryType, AuditEntryAction } from '@/lib/types';

// ─── Section nav ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'ledger', label: 'Ledger' },
  { id: 'gross-margin', label: 'Gross Margin' },
  { id: 'revenue-assurance', label: 'Revenue Assurance' },
  { id: 'audit-log', label: 'Audit Log' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueClass = 'text-gray-900',
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </Card>
  );
}

const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  charge: 'Charge',
  payment: 'Payment',
  credit: 'Credit',
  adjustment: 'Adjustment',
  refund: 'Refund',
};

const LEDGER_TYPE_PILL: Record<LedgerEntryType, string> = {
  charge: 'bg-blue-100 text-blue-700',
  payment: 'bg-green-100 text-green-700',
  credit: 'bg-teal-100 text-teal-700',
  adjustment: 'bg-yellow-100 text-yellow-700',
  refund: 'bg-red-100 text-red-700',
};

const CUSTOMER_TYPE_PILL: Record<string, string> = {
  residential: 'bg-blue-100 text-blue-700',
  sme: 'bg-purple-100 text-purple-700',
  ic: 'bg-teal-100 text-teal-700',
};

function formatAction(action: AuditEntryAction): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const ledgerEntries = getLedgerEntries();
  const marginSummaries = getMarginSummary();
  const unbilledAccounts = getUnbilledAccounts();
  const auditEntries = getAuditEntries();

  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<LedgerEntryType[]>([]);

  const filteredLedger = ledgerTypeFilter.length
    ? ledgerEntries.filter((e) => ledgerTypeFilter.includes(e.type))
    : ledgerEntries;

  // KPI derivations
  const totalCharges = ledgerEntries
    .filter((e) => e.type === 'charge')
    .reduce((s, e) => s + e.amount, 0);
  const totalPaymentsIn = ledgerEntries
    .filter((e) => e.type === 'payment')
    .reduce((s, e) => s + e.amount, 0);
  const totalRevenue = marginSummaries.reduce((s, m) => s + m.totalRevenue, 0);
  const totalGrossMargin = marginSummaries.reduce((s, m) => s + m.grossMargin, 0);
  const totalWholesale = marginSummaries.reduce((s, m) => s + m.totalWholesaleCost, 0);
  const blendedMarginPct = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;

  function toggleLedgerType(t: LedgerEntryType) {
    setLedgerTypeFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Financial Control</h2>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Charges"
          value={formatCurrency(totalCharges)}
          sub="billed to customers"
          valueClass="text-gray-900"
        />
        <KpiCard
          label="Payments In"
          value={formatCurrency(totalPaymentsIn)}
          sub="received from customers"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Gross Margin"
          value={formatCurrency(totalGrossMargin)}
          sub={`${blendedMarginPct.toFixed(1)}% blended margin`}
          valueClass="text-green-700"
        />
        <KpiCard
          label="Unbilled Accounts"
          value={String(unbilledAccounts.length)}
          sub={flagged.size > 0 ? `${flagged.size} flagged for review` : 'no flags raised'}
          valueClass={unbilledAccounts.length > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
      </div>

      {/* Section anchor nav */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-t px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* ── Ledger ────────────────────────────────────────────────────────────── */}
      <section id="ledger" className="scroll-mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Ledger</h3>
          <div className="flex gap-2">
            {(Object.keys(LEDGER_TYPE_LABELS) as LedgerEntryType[]).map((t) => (
              <button
                key={t}
                onClick={() => toggleLedgerType(t)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  ledgerTypeFilter.includes(t)
                    ? LEDGER_TYPE_PILL[t]
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {LEDGER_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <Card padding={false}>
          {filteredLedger.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No ledger entries match the selected filter.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-left">Type</th>
                  <th className="px-5 py-2.5 text-left">Description</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.slice(0, 50).map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-5 py-3 text-gray-500">{formatDate(entry.effectiveDate)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEDGER_TYPE_PILL[entry.type]}`}
                      >
                        {LEDGER_TYPE_LABELS[entry.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{entry.description}</td>
                    <td
                      className={`px-5 py-3 text-right font-medium tabular-nums ${
                        entry.amount < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredLedger.length > 50 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} className="px-5 py-2 text-center text-xs text-gray-400">
                      Showing 50 of {filteredLedger.length} entries
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </Card>
      </section>

      {/* ── Gross Margin ──────────────────────────────────────────────────────── */}
      <section id="gross-margin" className="scroll-mt-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Gross Margin</h3>

        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="Total Revenue"
            value={formatCurrency(totalRevenue)}
            sub="across all tariffs"
            valueClass="text-gray-900"
          />
          <KpiCard
            label="Wholesale Cost"
            value={formatCurrency(totalWholesale)}
            sub={`@ £${WHOLESALE_COST_PER_KWH}/kWh proxy`}
            valueClass="text-gray-900"
          />
          <KpiCard
            label="Blended Margin"
            value={`${blendedMarginPct.toFixed(1)}%`}
            sub={formatCurrency(totalGrossMargin) + ' gross margin'}
            valueClass={blendedMarginPct >= 30 ? 'text-green-700' : 'text-amber-600'}
          />
        </div>

        <Card padding={false}>
          <div className="px-5 py-3.5">
            <p className="text-xs text-gray-400">
              Wholesale proxy: £{WHOLESALE_COST_PER_KWH}/kWh · Single source:{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">finance.getMarginSummary()</code>
              {' '}— same data as Analytics → Tariff Performance
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Tariff</th>
                <th className="px-5 py-2.5 text-right">Usage (kWh)</th>
                <th className="px-5 py-2.5 text-right">Revenue</th>
                <th className="px-5 py-2.5 text-right">Wholesale Cost</th>
                <th className="px-5 py-2.5 text-right">Gross Margin</th>
                <th className="px-5 py-2.5 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {marginSummaries.map((m, i) => (
                <tr
                  key={m.productId}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{m.productName}</td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                    {formatUsage(m.totalUsageKwh)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-900 tabular-nums">
                    {formatCurrency(m.totalRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                    {formatCurrency(m.totalWholesaleCost)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-green-700 tabular-nums">
                    {formatCurrency(m.grossMargin)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span
                      className={`font-medium ${
                        m.grossMarginPercent >= 30 ? 'text-green-700' : 'text-amber-600'
                      }`}
                    >
                      {m.grossMarginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── Revenue Assurance ─────────────────────────────────────────────────── */}
      <section id="revenue-assurance" className="scroll-mt-4 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Revenue Assurance</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Active customers with no bill raised in the last 60 days — potential unbilled
            revenue risk. Flag accounts for follow-up.
          </p>
        </div>

        <Card padding={false}>
          {unbilledAccounts.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              All active accounts have been billed within the last 60 days.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-2.5 text-left">Account Ref</th>
                  <th className="px-5 py-2.5 text-left">Customer</th>
                  <th className="px-5 py-2.5 text-left">Type</th>
                  <th className="px-5 py-2.5 text-right">Products</th>
                  <th className="px-5 py-2.5 text-right">Balance</th>
                  <th className="px-5 py-2.5 text-center">Review Flag</th>
                </tr>
              </thead>
              <tbody>
                {unbilledAccounts.map((account, i) => (
                  <tr
                    key={account.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      {account.accountRef}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{account.name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          CUSTOMER_TYPE_PILL[account.customerType] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {account.customerType === 'ic' ? 'I&C' : account.customerType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {account.currentProducts.length}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-medium tabular-nums ${
                        account.balance >= 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(account.balance)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => toggleFlag(account.id)}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          flagged.has(account.id)
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
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

      {/* ── Audit Log ─────────────────────────────────────────────────────────── */}
      <section id="audit-log" className="scroll-mt-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Audit Log</h3>

        <Card padding={false}>
          {auditEntries.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No audit entries.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-2.5 text-left">Timestamp</th>
                  <th className="px-5 py-2.5 text-left">Action</th>
                  <th className="px-5 py-2.5 text-left">Entity</th>
                  <th className="px-5 py-2.5 text-left">Description</th>
                  <th className="px-5 py-2.5 text-left">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.slice(0, 50).map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-400">
                      {formatDateTime(entry.performedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <span className="font-medium text-gray-600">{entry.entityType}</span>
                      <span className="ml-1 font-mono text-gray-400">{entry.entityId}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{entry.description}</td>
                    <td className="px-5 py-3 text-gray-400">{entry.performedBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {auditEntries.length > 50 && (
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-5 py-2 text-center text-xs text-gray-400">
                      Showing 50 of {auditEntries.length} entries
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
