'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getBills } from '@/lib/data/bills';
import { getCustomers } from '@/lib/data/customers';
import { getMarginSummary, WHOLESALE_COST_PER_KWH } from '@/lib/data/finance';
import { getDebtAccounts } from '@/lib/data/debt';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatUsage } from '@/lib/utils';
import type { MarginSummary } from '@/lib/types';

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabId = 'portfolio' | 'billing' | 'behaviour' | 'tariff';

const TABS: { id: TabId; label: string }[] = [
  { id: 'portfolio', label: 'Portfolio Overview' },
  { id: 'billing', label: 'Billing Performance' },
  { id: 'behaviour', label: 'Customer Behaviour' },
  { id: 'tariff', label: 'Tariff Performance' },
];

// ─── Colour palette ───────────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  orange: '#f97316',
  gray: '#6b7280',
} as const;

const TYPE_COLORS: Record<string, string> = {
  Residential: C.blue,
  SME: C.purple,
  'I&C': C.teal,
};

const STATUS_COLORS: Record<string, string> = {
  Active: C.green,
  Pending: C.amber,
  Suspended: C.red,
  Closed: C.gray,
};

const BILL_STATUS_COLORS: Record<string, string> = {
  Paid: C.green,
  Issued: C.blue,
  Overdue: C.red,
  Disputed: C.amber,
};

const METER_COLORS: Record<string, string> = {
  Smart: C.green,
  Traditional: C.amber,
  Prepayment: C.orange,
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function monthLabel(ym: string): string {
  const [yr, mo] = ym.split('-').map(Number);
  return new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
  });
}

function last6MonthKeys(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return d.toISOString().slice(0, 7);
  });
}

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

function PieLegend({ items }: { items: { name: string; color: string; value: number }[] }) {
  return (
    <div className="flex flex-col justify-center gap-2">
      {items.map(({ name, color, value }) => (
        <div key={name} className="flex items-center gap-2 text-xs text-gray-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
          <span className="font-medium">{name}</span>
          <span className="ml-auto text-gray-400">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio');

  const bills = getBills();
  const customers = getCustomers();
  const marginSummaries = getMarginSummary();
  const debtAccounts = getDebtAccounts();

  const now = new Date();
  const months = last6MonthKeys();

  // ── Portfolio data ───────────────────────────────────────────────────────────

  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const ytdRevenue = bills
    .filter((b) => b.issuedAt.slice(0, 4) === String(now.getFullYear()))
    .reduce((s, b) => s + b.amountDue, 0);
  const totalAnnualUsageKwh = customers
    .filter((c) => c.status === 'active')
    .reduce((s, c) => s + (c.annualUsageKwh ?? 0), 0);

  const revenueByMonth = months.map((month) => {
    const mb = bills.filter((b) => b.periodFrom.startsWith(month));
    return {
      month: monthLabel(month),
      Billed: parseFloat(mb.reduce((s, b) => s + b.amountDue, 0).toFixed(2)),
      Collected: parseFloat(mb.reduce((s, b) => s + b.amountPaid, 0).toFixed(2)),
    };
  });

  const customersByType = [
    { name: 'Residential', value: customers.filter((c) => c.customerType === 'residential').length },
    { name: 'SME', value: customers.filter((c) => c.customerType === 'sme').length },
    { name: 'I&C', value: customers.filter((c) => c.customerType === 'ic').length },
  ].filter((d) => d.value > 0);

  const customersByStatus = (
    ['active', 'pending', 'suspended', 'closed'] as const
  )
    .map((s) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: customers.filter((c) => c.status === s).length,
    }))
    .filter((d) => d.value > 0);

  // ── Billing performance data ─────────────────────────────────────────────────

  const totalBilled = bills.reduce((s, b) => s + b.amountDue, 0);
  const totalCollected = bills.reduce((s, b) => s + b.amountPaid, 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  const billingByMonth = months.map((month) => {
    const mb = bills.filter((b) => b.periodFrom.startsWith(month));
    return {
      month: monthLabel(month),
      Billed: parseFloat(mb.reduce((s, b) => s + b.amountDue, 0).toFixed(2)),
      Collected: parseFloat(mb.reduce((s, b) => s + b.amountPaid, 0).toFixed(2)),
    };
  });

  const billStatusCounts = (
    ['paid', 'issued', 'overdue', 'disputed'] as const
  )
    .map((s) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: bills.filter((b) => b.status === s).length,
    }))
    .filter((d) => d.value > 0);

  const avgBillValueByMonth = months.map((month) => {
    const mb = bills.filter((b) => b.periodFrom.startsWith(month));
    const avg = mb.length > 0 ? mb.reduce((s, b) => s + b.amountDue, 0) / mb.length : 0;
    return { month: monthLabel(month), 'Avg Bill': parseFloat(avg.toFixed(2)) };
  });

  // ── Customer behaviour data ──────────────────────────────────────────────────

  const ddCount = customers.filter((c) => c.directDebitAmount != null).length;
  const smartCount = customers.filter((c) => c.meterType === 'smart').length;
  const inCreditCount = customers.filter((c) => (c.balance ?? 0) >= 0).length;
  const inDebtCount = customers.filter((c) => (c.balance ?? 0) < 0).length;

  const meterTypeCounts = (
    ['smart', 'traditional', 'prepayment'] as const
  )
    .map((m) => ({
      name: m.charAt(0).toUpperCase() + m.slice(1),
      value: customers.filter((c) => c.meterType === m).length,
    }))
    .filter((d) => d.value > 0);

  const avgUsageByType = (
    ['residential', 'sme', 'ic'] as const
  ).map((type) => {
    const group = customers.filter((c) => c.customerType === type);
    const avg =
      group.length > 0
        ? group.reduce((s, c) => s + (c.annualUsageKwh ?? 0), 0) / group.length
        : 0;
    return {
      type: type === 'ic' ? 'I&C' : type.charAt(0).toUpperCase() + type.slice(1),
      'Avg kWh': Math.round(avg),
    };
  });

  // ── Tariff performance data ──────────────────────────────────────────────────
  // Revenue and cost derived from SEED_BILLS via getMarginSummary(); WHOLESALE_COST_PER_KWH=0.18

  const tariffChartData = marginSummaries.map((m) => ({
    // Strip version suffix for readability on chart axis
    product: m.productName.replace(/-v\d+$/, ''),
    Revenue: parseFloat(m.totalRevenue.toFixed(2)),
    'Wholesale Cost': parseFloat(m.totalWholesaleCost.toFixed(2)),
    'Gross Margin': parseFloat(m.grossMargin.toFixed(2)),
  }));

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">
          Portfolio metrics, billing trends, customer insights, and tariff performance
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'portfolio' && (
        <PortfolioTab
          activeCustomers={activeCustomers}
          totalCustomers={customers.length}
          ytdRevenue={ytdRevenue}
          totalAnnualUsageKwh={totalAnnualUsageKwh}
          arrearsCount={debtAccounts.length}
          revenueByMonth={revenueByMonth}
          customersByType={customersByType}
          customersByStatus={customersByStatus}
        />
      )}

      {activeTab === 'billing' && (
        <BillingTab
          totalBilled={totalBilled}
          totalCollected={totalCollected}
          collectionRate={collectionRate}
          outstanding={totalBilled - totalCollected}
          billingByMonth={billingByMonth}
          billStatusCounts={billStatusCounts}
          avgBillValueByMonth={avgBillValueByMonth}
        />
      )}

      {activeTab === 'behaviour' && (
        <BehaviourTab
          totalCustomers={customers.length}
          ddCount={ddCount}
          smartCount={smartCount}
          inCreditCount={inCreditCount}
          inDebtCount={inDebtCount}
          meterTypeCounts={meterTypeCounts}
          avgUsageByType={avgUsageByType}
        />
      )}

      {activeTab === 'tariff' && (
        <TariffTab
          marginSummaries={marginSummaries}
          tariffChartData={tariffChartData}
        />
      )}
    </div>
  );
}

// ─── Tab: Portfolio Overview ──────────────────────────────────────────────────

function PortfolioTab({
  activeCustomers,
  totalCustomers,
  ytdRevenue,
  totalAnnualUsageKwh,
  arrearsCount,
  revenueByMonth,
  customersByType,
  customersByStatus,
}: {
  activeCustomers: number;
  totalCustomers: number;
  ytdRevenue: number;
  totalAnnualUsageKwh: number;
  arrearsCount: number;
  revenueByMonth: { month: string; Billed: number; Collected: number }[];
  customersByType: { name: string; value: number }[];
  customersByStatus: { name: string; value: number }[];
}) {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Active Customers"
          value={String(activeCustomers)}
          sub={`${totalCustomers} total`}
          valueClass="text-gray-900"
        />
        <KpiCard
          label="YTD Revenue"
          value={formatCurrency(ytdRevenue)}
          sub="billed this year"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Portfolio Usage"
          value={formatUsage(totalAnnualUsageKwh)}
          sub="active customers, annual"
          valueClass="text-gray-900"
        />
        <KpiCard
          label="Accounts in Arrears"
          value={String(arrearsCount)}
          sub="debt accounts open"
          valueClass={arrearsCount > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      {/* Revenue by month */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue — Billed vs Collected (Last 6 Months)</CardTitle>
        </CardHeader>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueByMonth} margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(v) => formatCurrency(v as number)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Billed" fill={C.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Collected" fill={C.green} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Customer split */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customers by Type</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={customersByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {customersByType.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? C.gray} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend
              items={customersByType.map((d) => ({
                ...d,
                color: TYPE_COLORS[d.name] ?? C.gray,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customers by Status</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={customersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {customersByStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? C.gray} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend
              items={customersByStatus.map((d) => ({
                ...d,
                color: STATUS_COLORS[d.name] ?? C.gray,
              }))}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Billing Performance ─────────────────────────────────────────────────

function BillingTab({
  totalBilled,
  totalCollected,
  collectionRate,
  outstanding,
  billingByMonth,
  billStatusCounts,
  avgBillValueByMonth,
}: {
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
  outstanding: number;
  billingByMonth: { month: string; Billed: number; Collected: number }[];
  billStatusCounts: { name: string; value: number }[];
  avgBillValueByMonth: { month: string; 'Avg Bill': number }[];
}) {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Billed"
          value={formatCurrency(totalBilled)}
          sub="all time"
          valueClass="text-gray-900"
        />
        <KpiCard
          label="Total Collected"
          value={formatCurrency(totalCollected)}
          sub="payments received"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Collection Rate"
          value={`${collectionRate.toFixed(1)}%`}
          sub="collected vs billed"
          valueClass={collectionRate >= 90 ? 'text-green-700' : 'text-amber-600'}
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          sub="unpaid balance"
          valueClass={outstanding > 0.01 ? 'text-red-600' : 'text-green-700'}
        />
      </div>

      {/* Monthly billed vs collected */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Billed vs Collected</CardTitle>
        </CardHeader>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={billingByMonth} margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(v) => formatCurrency(v as number)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Billed" fill={C.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Collected" fill={C.green} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Bill status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Status Breakdown</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={billStatusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {billStatusCounts.map((entry) => (
                    <Cell key={entry.name} fill={BILL_STATUS_COLORS[entry.name] ?? C.gray} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend
              items={billStatusCounts.map((d) => ({
                ...d,
                color: BILL_STATUS_COLORS[d.name] ?? C.gray,
              }))}
            />
          </div>
        </Card>

        {/* Average bill value by month */}
        <Card>
          <CardHeader>
            <CardTitle>Average Bill Value by Month</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={avgBillValueByMonth} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `£${v}`}
              />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar dataKey="Avg Bill" fill={C.purple} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Customer Behaviour ──────────────────────────────────────────────────

function BehaviourTab({
  totalCustomers,
  ddCount,
  smartCount,
  inCreditCount,
  inDebtCount,
  meterTypeCounts,
  avgUsageByType,
}: {
  totalCustomers: number;
  ddCount: number;
  smartCount: number;
  inCreditCount: number;
  inDebtCount: number;
  meterTypeCounts: { name: string; value: number }[];
  avgUsageByType: { type: string; 'Avg kWh': number }[];
}) {
  const ddRate = totalCustomers > 0 ? (ddCount / totalCustomers) * 100 : 0;
  const smartRate = totalCustomers > 0 ? (smartCount / totalCustomers) * 100 : 0;
  const creditRate = totalCustomers > 0 ? (inCreditCount / totalCustomers) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="DD Adoption"
          value={`${ddRate.toFixed(0)}%`}
          sub={`${ddCount} of ${totalCustomers} customers`}
          valueClass={ddRate >= 80 ? 'text-green-700' : 'text-amber-600'}
        />
        <KpiCard
          label="Smart Meter Rate"
          value={`${smartRate.toFixed(0)}%`}
          sub={`${smartCount} smart meters`}
          valueClass="text-gray-900"
        />
        <KpiCard
          label="In Credit"
          value={String(inCreditCount)}
          sub={`${creditRate.toFixed(0)}% of portfolio`}
          valueClass="text-green-700"
        />
        <KpiCard
          label="In Debt"
          value={String(inDebtCount)}
          sub="negative balance"
          valueClass={inDebtCount > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Meter type breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Meter Type Breakdown</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={meterTypeCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {meterTypeCounts.map((entry) => (
                    <Cell key={entry.name} fill={METER_COLORS[entry.name] ?? C.gray} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend
              items={meterTypeCounts.map((d) => ({
                ...d,
                color: METER_COLORS[d.name] ?? C.gray,
              }))}
            />
          </div>
        </Card>

        {/* Avg annual usage by customer type */}
        <Card>
          <CardHeader>
            <CardTitle>Avg Annual Usage by Customer Type</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={avgUsageByType}
              layout="vertical"
              margin={{ top: 4, right: 32, bottom: 0, left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => `${(v as number).toLocaleString()} kWh`} />
              <Bar dataKey="Avg kWh" fill={C.teal} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Balance distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Distribution</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-8 py-2">
          <div className="flex flex-1 overflow-hidden rounded-full" style={{ height: 16 }}>
            <div
              className="bg-green-500 transition-all"
              style={{
                width: `${totalCustomers > 0 ? (inCreditCount / totalCustomers) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-red-400 transition-all"
              style={{
                width: `${totalCustomers > 0 ? (inDebtCount / totalCustomers) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex shrink-0 gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
              In credit ({inCreditCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
              In debt ({inDebtCount})
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Tariff Performance ──────────────────────────────────────────────────
// Margin data from getMarginSummary() via finance.ts — uses WHOLESALE_COST_PER_KWH=0.18

function TariffTab({
  marginSummaries,
  tariffChartData,
}: {
  marginSummaries: MarginSummary[];
  tariffChartData: {
    product: string;
    Revenue: number;
    'Wholesale Cost': number;
    'Gross Margin': number;
  }[];
}) {
  const totalRevenue = marginSummaries.reduce((s, m) => s + m.totalRevenue, 0);
  const totalWholesale = marginSummaries.reduce((s, m) => s + m.totalWholesaleCost, 0);
  const totalMargin = marginSummaries.reduce((s, m) => s + m.grossMargin, 0);
  const blendedMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
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
          label="Gross Margin"
          value={formatCurrency(totalMargin)}
          sub="revenue minus wholesale"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Blended Margin %"
          value={`${blendedMarginPct.toFixed(1)}%`}
          sub="portfolio average"
          valueClass={blendedMarginPct >= 30 ? 'text-green-700' : 'text-amber-600'}
        />
      </div>

      {/* Revenue vs cost vs margin chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue, Wholesale Cost &amp; Gross Margin by Tariff</CardTitle>
        </CardHeader>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={tariffChartData} margin={{ top: 4, right: 12, bottom: 0, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="product" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(v) => formatCurrency(v as number)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Revenue" fill={C.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Wholesale Cost" fill={C.amber} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Gross Margin" fill={C.green} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gross margin summary table — data source shared with Phase 10 Finance module */}
      <Card padding={false}>
        <div className="px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-900">Gross Margin Summary</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Wholesale proxy: £{WHOLESALE_COST_PER_KWH}/kWh · Source:{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">finance.getMarginSummary()</code>
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
                <td className="px-5 py-3 text-right text-gray-600">
                  {formatUsage(m.totalUsageKwh)}
                </td>
                <td className="px-5 py-3 text-right text-gray-900">
                  {formatCurrency(m.totalRevenue)}
                </td>
                <td className="px-5 py-3 text-right text-gray-600">
                  {formatCurrency(m.totalWholesaleCost)}
                </td>
                <td className="px-5 py-3 text-right font-medium text-green-700">
                  {formatCurrency(m.grossMargin)}
                </td>
                <td className="px-5 py-3 text-right">
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
          <tfoot className="border-t border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
            <tr>
              <td className="px-5 py-2.5">Total</td>
              <td className="px-5 py-2.5 text-right">
                {formatUsage(marginSummaries.reduce((s, m) => s + m.totalUsageKwh, 0))}
              </td>
              <td className="px-5 py-2.5 text-right">{formatCurrency(totalRevenue)}</td>
              <td className="px-5 py-2.5 text-right">{formatCurrency(totalWholesale)}</td>
              <td className="px-5 py-2.5 text-right text-green-700">
                {formatCurrency(totalMargin)}
              </td>
              <td className="px-5 py-2.5 text-right text-green-700">
                {blendedMarginPct.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
