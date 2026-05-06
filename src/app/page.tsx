'use client';

import Link from 'next/link';
import {
  Users,
  Receipt,
  AlertTriangle,
  CheckSquare,
  ShieldAlert,
  Package,
  FileText,
  FilePlus,
  Radio,
  BarChart2,
  Landmark,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getCustomers } from '@/lib/data/customers';
import { getBills } from '@/lib/data/bills';
import { getTasks } from '@/lib/data/tasks';
import { getDebtAccounts } from '@/lib/data/debt';
import { getComplianceItems, getSwitches, getMarketMessages } from '@/lib/data/market';
import { getAuditEntries, getUnbilledAccounts } from '@/lib/data/finance';
import { getProducts } from '@/lib/data/products';
import { getQuotes } from '@/lib/data/quotes';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { AuditEntryAction } from '@/lib/types';

// ─── Audit action → icon mapping ─────────────────────────────────────────────

const AUDIT_ICONS: Record<AuditEntryAction, React.ElementType> = {
  bill_generated: Receipt,
  payment_recorded: CheckSquare,
  quote_created: FilePlus,
  quote_status_changed: FilePlus,
  plan_created: FileText,
  plan_breached: AlertTriangle,
  stage_advanced: ArrowRight,
  customer_updated: Users,
  message_retried: Radio,
  switch_objected: Activity,
  meter_read_submitted: BarChart2,
  compliance_item_updated: ShieldAlert,
};

export default function DashboardPage() {
  // ── Core data ──────────────────────────────────────────────────────────────
  const customers = getCustomers();
  const bills = getBills();
  const tasks = getTasks();
  const debtAccounts = getDebtAccounts();
  const complianceItems = getComplianceItems();
  const switches = getSwitches();
  const messages = getMarketMessages();
  const products = getProducts();
  const quotes = getQuotes();
  const auditEntries = getAuditEntries().slice(0, 10);
  const unbilledAccounts = getUnbilledAccounts();

  // ── KPI 1: Active customers ────────────────────────────────────────────────
  const activeCustomers = customers.filter((c) => c.status === 'active').length;

  // ── KPI 2: MTD revenue — sum of amountDue for bills issued this month ──────
  const now = new Date();
  const mtdStartStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const mtdRevenue = bills
    .filter((b) => b.issuedAt.slice(0, 10) >= mtdStartStr)
    .reduce((s, b) => s + b.amountDue, 0);

  // ── KPI 3: Open tasks ──────────────────────────────────────────────────────
  const openTaskCount = tasks.filter(
    (t) => t.status === 'open' || t.status === 'in_progress',
  ).length;

  // ── KPI 4: Accounts in arrears ─────────────────────────────────────────────
  const arrearsCount = debtAccounts.length;
  const totalArrears = debtAccounts.reduce((s, d) => s + d.currentBalance, 0);

  // ── KPI 5: Compliance items due this week ──────────────────────────────────
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const complianceDueThisWeek = complianceItems.filter(
    (c) => c.status !== 'completed' && c.dueDate <= weekEndStr,
  ).length;

  // ── Module quick-link status lines ────────────────────────────────────────
  const activeProducts = products.filter((p) => p.status === 'active').length;
  const draftProducts = products.filter((p) => p.status === 'draft').length;

  const issuedQuotes = quotes.filter((q) => q.status === 'issued');
  const pipelineValue = issuedQuotes.reduce((s, q) => s + q.totalWithVat, 0);

  const pendingCustomers = customers.filter((c) => c.status === 'pending').length;

  const overdueBills = bills.filter((b) => b.status === 'overdue').length;
  const disputedBills = bills.filter((b) => b.status === 'disputed').length;

  const failedMessages = messages.filter((m) => m.status === 'failed').length;

  // ── 6-month billing chart data ─────────────────────────────────────────────
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return d.toISOString().slice(0, 7); // 'YYYY-MM'
  });

  const billingChartData = last6Months.map((month) => {
    const monthBills = bills.filter((b) => b.periodFrom.startsWith(month));
    const revenue = monthBills.reduce((s, b) => s + b.amountDue, 0);
    const [yr, mo] = month.split('-').map(Number);
    const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit',
    });
    return { month: label, revenue: parseFloat(revenue.toFixed(2)) };
  });

  // ── Switch activity chart data ─────────────────────────────────────────────
  const switchChartData = last6Months.map((month) => {
    const monthSwitches = switches.filter((s) => s.initiatedAt.startsWith(month));
    const [yr, mo] = month.split('-').map(Number);
    const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit',
    });
    return {
      month: label,
      gained: monthSwitches.filter((s) => s.type === 'gain').length,
      lost: monthSwitches.filter((s) => s.type === 'loss').length,
    };
  });

  return (
    <div className="max-w-6xl space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Operations Dashboard</h2>
        <p className="text-sm text-gray-500">Energy retail operations — live platform overview</p>
      </div>

      {/* ── 5 KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          label="Active Customers"
          value={activeCustomers}
          sub={`${pendingCustomers} pending`}
          icon={Users}
          href="/customers"
          color="blue"
        />
        <KpiCard
          label="MTD Revenue"
          value={formatCurrency(mtdRevenue)}
          sub="billed this month"
          icon={Receipt}
          href="/billing"
          color="green"
        />
        <KpiCard
          label="Open Tasks"
          value={openTaskCount}
          sub="open or in progress"
          icon={CheckSquare}
          href="/customers"
          color="yellow"
        />
        <KpiCard
          label="Accounts in Arrears"
          value={arrearsCount}
          sub={`${formatCurrency(totalArrears)} outstanding`}
          icon={AlertTriangle}
          href="/debt"
          color="red"
        />
        <KpiCard
          label="Compliance Due"
          value={complianceDueThisWeek}
          sub="items due this week"
          icon={ShieldAlert}
          href="/market"
          color={complianceDueThisWeek > 0 ? 'red' : 'green'}
        />
      </div>

      {/* ── Module quick-links + Activity feed ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Module quick-links (2/3 width) */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <ModuleCard
            href="/catalogue"
            icon={Package}
            label="Product Catalogue"
            status={`${activeProducts} active · ${draftProducts} draft`}
          />
          <ModuleCard
            href="/quotes"
            icon={FilePlus}
            label="Quotes"
            status={`${issuedQuotes.length} issued · ${formatCurrency(pipelineValue)} pipeline`}
          />
          <ModuleCard
            href="/customers"
            icon={Users}
            label="Customers"
            status={`${activeCustomers} active · ${pendingCustomers} pending`}
          />
          <ModuleCard
            href="/billing"
            icon={Receipt}
            label="Billing"
            status={`${overdueBills} overdue · ${disputedBills} disputed`}
            alert={overdueBills > 0}
          />
          <ModuleCard
            href="/debt"
            icon={AlertTriangle}
            label="Debt & Collections"
            status={`${arrearsCount} accounts · ${formatCurrency(totalArrears)}`}
            alert={arrearsCount > 0}
          />
          <ModuleCard
            href="/market"
            icon={Radio}
            label="Market Communications"
            status={`${failedMessages} failed messages`}
            alert={failedMessages > 0}
          />
          <ModuleCard
            href="/analytics"
            icon={BarChart2}
            label="Analytics"
            status={`${products.length} products · ${formatCurrency(mtdRevenue)} MTD`}
          />
          <ModuleCard
            href="/finance"
            icon={Landmark}
            label="Financial Control"
            status={`${unbilledAccounts.length} unbilled accounts`}
            alert={unbilledAccounts.length > 0}
          />
        </div>

        {/* Activity feed (1/3 width) */}
        <Card padding={false} className="flex flex-col">
          <CardHeader className="px-4 pt-4">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100 overflow-y-auto">
            {auditEntries.map((entry) => {
              const Icon = AUDIT_ICONS[entry.action] ?? Activity;
              return (
                <div key={entry.id} className="flex gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0 text-gray-400">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-gray-700">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDateTime(entry.performedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Billing summary — 6-month bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Revenue — Last 6 Months</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={billingChartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Switch activity — gains vs losses per month */}
        <Card>
          <CardHeader>
            <CardTitle>Switch Activity — Last 6 Months</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={switchChartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="gained" name="Gained" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type KpiColor = 'blue' | 'green' | 'yellow' | 'red';

const KPI_ICON_COLORS: Record<KpiColor, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  href: string;
  color: KpiColor;
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-gray-300 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <div className={`rounded-md p-1.5 ${KPI_ICON_COLORS[color]}`}>
            <Icon size={14} />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{sub}</p>
      </Card>
    </Link>
  );
}

function ModuleCard({
  href,
  icon: Icon,
  label,
  status,
  alert = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  status: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card className="flex items-center gap-3 hover:border-gray-300 hover:shadow-md transition-shadow py-3">
        <div className="shrink-0 rounded-md bg-gray-100 p-2 text-gray-500">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className={`truncate text-xs ${alert ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {status}
          </p>
        </div>
        <ArrowRight size={14} className="ml-auto shrink-0 text-gray-300" />
      </Card>
    </Link>
  );
}
