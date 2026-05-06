'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getBills } from '@/lib/data/bills';
import { getCustomers } from '@/lib/data/customers';
import { getMarginSummary, WHOLESALE_COST_PER_KWH } from '@/lib/data/finance';
import { getDebtAccounts } from '@/lib/data/debt';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatUsage } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

type TabId = 'portfolio' | 'billing' | 'behaviour' | 'tariff';
const TABS: { id: TabId; label: string }[] = [
  { id: 'portfolio', label: 'Portfolio Overview' },
  { id: 'billing',   label: 'Billing Performance' },
  { id: 'behaviour', label: 'Customer Behaviour' },
  { id: 'tariff',    label: 'Tariff Performance' },
];

// Theme-aware chart palettes
const CHART_PALETTES = {
  dark:  { primary: '#6366f1', success: '#10b981', danger: '#ef4444', accent: '#f59e0b', purple: '#a855f7', teal: '#14b8a6', gray: '#5a5a70', grid: '#1e1e28', axis: '#5a5a70' },
  light: { primary: '#4f46e5', success: '#059669', danger: '#dc2626', accent: '#d97706', purple: '#9333ea', teal: '#0d9488', gray: '#9090a8', grid: '#ebebf5', axis: '#9090a8' },
};

function KpiCard({ label, value, sub, valueColor = 'var(--text-primary)' }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <Card>
      <p style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</p>
      <p style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: valueColor }}>{value}</p>
      <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</p>
    </Card>
  );
}

function PieLegend({ items }: { items: { name: string; color: string; value: number }[] }) {
  return (
    <div className="flex flex-col justify-center gap-2">
      {items.map(({ name, color, value }) => (
        <div key={name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
          <span className="font-medium">{name}</span>
          <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function monthLabel(ym: string): string {
  const [yr, mo] = ym.split('-').map(Number);
  return new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function last6MonthKeys(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return d.toISOString().slice(0, 7); });
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio');
  const { theme } = useTheme();
  const C = CHART_PALETTES[theme];

  const bills     = getBills();
  const customers = getCustomers();
  const marginSummaries = getMarginSummary();
  const debtAccounts    = getDebtAccounts();
  const now    = new Date();
  const months = last6MonthKeys();

  // Portfolio
  const activeCustomers     = customers.filter((c) => c.status === 'active').length;
  const ytdRevenue          = bills.filter((b) => b.issuedAt.slice(0, 4) === String(now.getFullYear())).reduce((s, b) => s + b.amountDue, 0);
  const totalAnnualUsageKwh = customers.filter((c) => c.status === 'active').reduce((s, c) => s + (c.annualUsageKwh ?? 0), 0);
  const revenueByMonth      = months.map((month) => { const mb = bills.filter((b) => b.periodFrom.startsWith(month)); return { month: monthLabel(month), Billed: parseFloat(mb.reduce((s, b) => s + b.amountDue, 0).toFixed(2)), Collected: parseFloat(mb.reduce((s, b) => s + b.amountPaid, 0).toFixed(2)) }; });
  const customersByType     = [{ name: 'Residential', value: customers.filter((c) => c.customerType === 'residential').length }, { name: 'SME', value: customers.filter((c) => c.customerType === 'sme').length }, { name: 'I&C', value: customers.filter((c) => c.customerType === 'ic').length }].filter((d) => d.value > 0);
  const customersByStatus   = (['active', 'pending', 'suspended', 'closed'] as const).map((s) => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: customers.filter((c) => c.status === s).length })).filter((d) => d.value > 0);
  const typeColors: Record<string, string>   = { Residential: C.primary, SME: C.purple, 'I&C': C.teal };
  const statusColors: Record<string, string> = { Active: C.success, Pending: C.accent, Suspended: C.danger, Closed: C.gray };

  // Billing
  const totalBilled    = bills.reduce((s, b) => s + b.amountDue, 0);
  const totalCollected = bills.reduce((s, b) => s + b.amountPaid, 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  const billingByMonth = months.map((month) => { const mb = bills.filter((b) => b.periodFrom.startsWith(month)); return { month: monthLabel(month), Billed: parseFloat(mb.reduce((s, b) => s + b.amountDue, 0).toFixed(2)), Collected: parseFloat(mb.reduce((s, b) => s + b.amountPaid, 0).toFixed(2)) }; });
  const billStatusCounts    = (['paid', 'issued', 'overdue', 'disputed'] as const).map((s) => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: bills.filter((b) => b.status === s).length })).filter((d) => d.value > 0);
  const avgBillValueByMonth = months.map((month) => { const mb = bills.filter((b) => b.periodFrom.startsWith(month)); const avg = mb.length > 0 ? mb.reduce((s, b) => s + b.amountDue, 0) / mb.length : 0; return { month: monthLabel(month), 'Avg Bill': parseFloat(avg.toFixed(2)) }; });
  const billStatusColors: Record<string, string> = { Paid: C.success, Issued: C.primary, Overdue: C.danger, Disputed: C.accent };

  // Behaviour
  const ddCount       = customers.filter((c) => c.directDebitAmount != null).length;
  const smartCount    = customers.filter((c) => c.meterType === 'smart').length;
  const inCreditCount = customers.filter((c) => (c.balance ?? 0) >= 0).length;
  const inDebtCount   = customers.filter((c) => (c.balance ?? 0) < 0).length;
  const meterTypeCounts  = (['smart', 'traditional', 'prepayment'] as const).map((m) => ({ name: m.charAt(0).toUpperCase() + m.slice(1), value: customers.filter((c) => c.meterType === m).length })).filter((d) => d.value > 0);
  const avgUsageByType   = (['residential', 'sme', 'ic'] as const).map((type) => { const group = customers.filter((c) => c.customerType === type); const avg = group.length > 0 ? group.reduce((s, c) => s + (c.annualUsageKwh ?? 0), 0) / group.length : 0; return { type: type === 'ic' ? 'I&C' : type.charAt(0).toUpperCase() + type.slice(1), 'Avg kWh': Math.round(avg) }; });
  const meterColors: Record<string, string> = { Smart: C.success, Traditional: C.accent, Prepayment: C.teal };
  const ddRate     = customers.length > 0 ? (ddCount / customers.length) * 100 : 0;
  const smartRate  = customers.length > 0 ? (smartCount / customers.length) * 100 : 0;
  const creditRate = customers.length > 0 ? (inCreditCount / customers.length) * 100 : 0;

  // Tariff
  const tariffChartData = marginSummaries.map((m) => ({ product: m.productName.replace(/-v\d+$/, ''), Revenue: parseFloat(m.totalRevenue.toFixed(2)), 'Wholesale Cost': parseFloat(m.totalWholesaleCost.toFixed(2)), 'Gross Margin': parseFloat(m.grossMargin.toFixed(2)) }));
  const totalRevenue    = marginSummaries.reduce((s, m) => s + m.totalRevenue, 0);
  const totalWholesale  = marginSummaries.reduce((s, m) => s + m.totalWholesaleCost, 0);
  const totalMargin     = marginSummaries.reduce((s, m) => s + m.grossMargin, 0);
  const blendedMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const axisStyle = { fontSize: 11, fill: C.axis };
  const tooltipStyle = { contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }, labelStyle: { color: 'var(--text-secondary)' } };
  const legendStyle  = { iconSize: 10, wrapperStyle: { fontSize: 11, color: 'var(--text-secondary)' } };

  return (
    <div className="w-full space-y-5">
      <div>
        <h2 className="section-title">Analytics</h2>
        <p className="section-subtitle">Portfolio metrics, billing trends, customer insights, and tariff performance</p>
      </div>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}>{tab.label}</button>
        ))}
      </div>

      {/* Portfolio Overview */}
      {activeTab === 'portfolio' && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Active Customers"    value={String(activeCustomers)}       sub={`${customers.length} total`} />
            <KpiCard label="YTD Revenue"         value={formatCurrency(ytdRevenue)}    sub="billed this year"            valueColor="var(--color-success-text)" />
            <KpiCard label="Portfolio Usage"     value={formatUsage(totalAnnualUsageKwh)} sub="active customers, annual" />
            <KpiCard label="Accounts in Arrears" value={String(debtAccounts.length)}   sub="debt accounts open"          valueColor={debtAccounts.length > 0 ? 'var(--color-danger-text)' : 'var(--text-primary)'} />
          </div>
          <Card>
            <CardHeader><CardTitle>Revenue — Billed vs Collected (Last 6 Months)</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByMonth} margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
                <Legend {...legendStyle} />
                <Bar dataKey="Billed"    fill={C.primary}  radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" fill={C.success}  radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {[{ title: 'Customers by Type', data: customersByType, colors: typeColors }, { title: 'Customers by Status', data: customersByStatus, colors: statusColors }].map(({ title, data, colors }) => (
              <Card key={title}>
                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {data.map((entry) => <Cell key={entry.name} fill={colors[entry.name] ?? C.gray} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend items={data.map((d) => ({ ...d, color: colors[d.name] ?? C.gray }))} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Billing Performance */}
      {activeTab === 'billing' && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Total Billed"    value={formatCurrency(totalBilled)}    sub="all time" />
            <KpiCard label="Total Collected" value={formatCurrency(totalCollected)} sub="payments received"       valueColor="var(--color-success-text)" />
            <KpiCard label="Collection Rate" value={`${collectionRate.toFixed(1)}%`} sub="collected vs billed"    valueColor={collectionRate >= 90 ? 'var(--color-success-text)' : 'var(--color-warning-text)'} />
            <KpiCard label="Outstanding"     value={formatCurrency(totalBilled - totalCollected)} sub="unpaid balance" valueColor={(totalBilled - totalCollected) > 0.01 ? 'var(--color-danger-text)' : 'var(--color-success-text)'} />
          </div>
          <Card>
            <CardHeader><CardTitle>Monthly Billed vs Collected</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={billingByMonth} margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
                <Legend {...legendStyle} />
                <Bar dataKey="Billed"    fill={C.primary} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" fill={C.success} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Bill Status Breakdown</CardTitle></CardHeader>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={billStatusCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {billStatusCounts.map((entry) => <Cell key={entry.name} fill={billStatusColors[entry.name] ?? C.gray} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <PieLegend items={billStatusCounts.map((d) => ({ ...d, color: billStatusColors[d.name] ?? C.gray }))} />
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Average Bill Value by Month</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={avgBillValueByMonth} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
                  <Bar dataKey="Avg Bill" fill={C.purple} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* Customer Behaviour */}
      {activeTab === 'behaviour' && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="DD Adoption"      value={`${ddRate.toFixed(0)}%`}     sub={`${ddCount} of ${customers.length} customers`} valueColor={ddRate >= 80 ? 'var(--color-success-text)' : 'var(--color-warning-text)'} />
            <KpiCard label="Smart Meter Rate" value={`${smartRate.toFixed(0)}%`}  sub={`${smartCount} smart meters`} />
            <KpiCard label="In Credit"        value={String(inCreditCount)}        sub={`${creditRate.toFixed(0)}% of portfolio`}      valueColor="var(--color-success-text)" />
            <KpiCard label="In Debt"          value={String(inDebtCount)}          sub="negative balance"                               valueColor={inDebtCount > 0 ? 'var(--color-danger-text)' : 'var(--text-primary)'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Meter Type Breakdown</CardTitle></CardHeader>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={meterTypeCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {meterTypeCounts.map((entry) => <Cell key={entry.name} fill={meterColors[entry.name] ?? C.gray} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <PieLegend items={meterTypeCounts.map((d) => ({ ...d, color: meterColors[d.name] ?? C.gray }))} />
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Avg Annual Usage by Customer Type</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={avgUsageByType} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="type" tick={axisStyle} axisLine={false} tickLine={false} width={60} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `${(v as number).toLocaleString()} kWh`} />
                  <Bar dataKey="Avg kWh" fill={C.teal} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Balance Distribution</CardTitle></CardHeader>
            <div className="flex items-center gap-8 py-2">
              <div className="flex flex-1 overflow-hidden rounded-full" style={{ height: 16, background: 'var(--bg-elevated)' }}>
                <div style={{ width: `${customers.length > 0 ? (inCreditCount / customers.length) * 100 : 0}%`, background: C.success, transition: 'all 300ms' }} />
                <div style={{ width: `${customers.length > 0 ? (inDebtCount / customers.length) * 100 : 0}%`, background: C.danger, transition: 'all 300ms' }} />
              </div>
              <div className="flex shrink-0 gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.success }} />In credit ({inCreditCount})</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.danger }} />In debt ({inDebtCount})</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tariff Performance */}
      {activeTab === 'tariff' && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Total Revenue"   value={formatCurrency(totalRevenue)}  sub="across all tariffs" />
            <KpiCard label="Wholesale Cost"  value={formatCurrency(totalWholesale)} sub={`@ £${WHOLESALE_COST_PER_KWH}/kWh proxy`} />
            <KpiCard label="Gross Margin"    value={formatCurrency(totalMargin)}   sub="revenue minus wholesale"    valueColor="var(--color-success-text)" />
            <KpiCard label="Blended Margin %" value={`${blendedMarginPct.toFixed(1)}%`} sub="portfolio average"    valueColor={blendedMarginPct >= 30 ? 'var(--color-success-text)' : 'var(--color-warning-text)'} />
          </div>
          <Card>
            <CardHeader><CardTitle>Revenue, Wholesale Cost &amp; Gross Margin by Tariff</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tariffChartData} margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="product" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
                <Legend {...legendStyle} />
                <Bar dataKey="Revenue"        fill={C.primary} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Wholesale Cost" fill={C.accent}  radius={[3, 3, 0, 0]} />
                <Bar dataKey="Gross Margin"   fill={C.success} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padding={false}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Gross Margin Summary</h3>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>Wholesale proxy: £{WHOLESALE_COST_PER_KWH}/kWh · Source: <code style={{ background: 'var(--bg-elevated)', borderRadius: 3, padding: '1px 4px', fontFamily: 'var(--font-mono)' }}>finance.getMarginSummary()</code></p>
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
              <tfoot style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
                <tr>
                  <td className="px-5 py-2.5 font-semibold" style={{ color: 'var(--text-primary)', fontSize: '0.75rem' }}>Total</td>
                  <td className="px-5 py-2.5 text-right cell-mono">{formatUsage(marginSummaries.reduce((s, m) => s + m.totalUsageKwh, 0))}</td>
                  <td className="px-5 py-2.5 text-right cell-mono">{formatCurrency(totalRevenue)}</td>
                  <td className="px-5 py-2.5 text-right cell-mono">{formatCurrency(totalWholesale)}</td>
                  <td className="px-5 py-2.5 text-right cell-mono font-semibold" style={{ color: 'var(--color-success-text)' }}>{formatCurrency(totalMargin)}</td>
                  <td className="px-5 py-2.5 text-right cell-mono font-semibold" style={{ color: 'var(--color-success-text)' }}>{blendedMarginPct.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
