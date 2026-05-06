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
import { getDebtAccounts, getPaymentPlans } from '@/lib/data/debt';
import { getComplianceItems, getSwitches, getMarketMessages } from '@/lib/data/market';
import { getAuditEntries, getUnbilledAccounts } from '@/lib/data/finance';
import { getProducts } from '@/lib/data/products';
import { getQuotes } from '@/lib/data/quotes';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { AuditEntry, AuditEntryAction } from '@/lib/types';
import { useTheme } from '@/hooks/useTheme';

// ─── Chart colour palettes ────────────────────────────────────────────────────
const CHART_COLORS = {
  dark: { primary: '#6366f1', success: '#10b981', danger: '#ef4444', accent: '#f59e0b', grid: '#1e1e28', axis: '#5a5a70' },
  light: { primary: '#4f46e5', success: '#059669', danger: '#dc2626', accent: '#d97706', grid: '#ebebf5', axis: '#9090a8' },
};

// ─── Audit action → icon mapping ─────────────────────────────────────────────
const AUDIT_ICONS: Record<AuditEntryAction, React.ElementType> = {
  bill_generated:           Receipt,
  payment_recorded:         CheckSquare,
  quote_created:            FilePlus,
  quote_status_changed:     FilePlus,
  plan_created:             FileText,
  plan_breached:            AlertTriangle,
  stage_advanced:           ArrowRight,
  customer_updated:         Users,
  message_retried:          Radio,
  switch_objected:          Activity,
  meter_read_submitted:     BarChart2,
  compliance_item_updated:  ShieldAlert,
};

export default function DashboardPage() {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];

  // ── Core data ──────────────────────────────────────────────────────────────
  const customers     = getCustomers();
  const bills         = getBills();
  const tasks         = getTasks();
  const debtAccounts  = getDebtAccounts();
  const complianceItems = getComplianceItems();
  const switches      = getSwitches();
  const messages      = getMarketMessages();
  const products      = getProducts();
  const quotes        = getQuotes();
  const auditEntries  = getAuditEntries().slice(0, 10);
  const unbilledAccounts = getUnbilledAccounts();

  const planCustomerMap = Object.fromEntries(getPaymentPlans().map((p) => [p.id, p.customerId]));
  const debtCustomerMap = Object.fromEntries(getDebtAccounts().map((d) => [d.id, d.customerId]));

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const activeCustomers = customers.filter((c) => c.status === 'active').length;

  const now = new Date();
  const mtdStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const mtdRevenue = bills.filter((b) => b.issuedAt.slice(0, 10) >= mtdStartStr).reduce((s, b) => s + b.amountDue, 0);

  const openTaskCount = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const arrearsCount = debtAccounts.length;
  const totalArrears = debtAccounts.reduce((s, d) => s + d.currentBalance, 0);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const complianceDueThisWeek = complianceItems.filter((c) => c.status !== 'completed' && c.dueDate <= weekEndStr).length;

  // ── Module status lines ────────────────────────────────────────────────────
  const activeProducts  = products.filter((p) => p.status === 'active').length;
  const draftProducts   = products.filter((p) => p.status === 'draft').length;
  const issuedQuotes    = quotes.filter((q) => q.status === 'issued');
  const pipelineValue   = issuedQuotes.reduce((s, q) => s + q.totalWithVat, 0);
  const pendingCustomers = customers.filter((c) => c.status === 'pending').length;
  const overdueBills    = bills.filter((b) => b.status === 'overdue').length;
  const disputedBills   = bills.filter((b) => b.status === 'disputed').length;
  const failedMessages  = messages.filter((m) => m.status === 'failed').length;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return d.toISOString().slice(0, 7);
  });

  const billingChartData = last6Months.map((month) => {
    const revenue = bills.filter((b) => b.periodFrom.startsWith(month)).reduce((s, b) => s + b.amountDue, 0);
    const [yr, mo] = month.split('-').map(Number);
    return { month: new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), revenue: parseFloat(revenue.toFixed(2)) };
  });

  const switchChartData = last6Months.map((month) => {
    const monthSwitches = switches.filter((s) => s.initiatedAt.startsWith(month));
    const [yr, mo] = month.split('-').map(Number);
    return { month: new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), gained: monthSwitches.filter((s) => s.type === 'gain').length, lost: monthSwitches.filter((s) => s.type === 'loss').length };
  });

  function auditEntryHref(entry: AuditEntry): string | null {
    switch (entry.entityType) {
      case 'bill':          return `/billing/${entry.entityId}`;
      case 'quote':         return `/quotes/${entry.entityId}`;
      case 'customer':      return `/customers/${entry.entityId}`;
      case 'payment_plan':  return planCustomerMap[entry.entityId] ? `/debt/${planCustomerMap[entry.entityId]}` : '/debt';
      case 'debt_account':  return debtCustomerMap[entry.entityId] ? `/debt/${debtCustomerMap[entry.entityId]}` : '/debt';
      case 'market_message': case 'switch': case 'meter_reading': case 'compliance_item': return '/market';
      default: return null;
    }
  }

  const axisTickStyle = { fontSize: 11, fill: c.axis };

  return (
    <div className="w-full space-y-6">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.125rem' }}>
          Operations Dashboard
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
          Energy retail operations — live platform overview
        </p>
      </div>

      {/* ── 5 KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="Active Customers"    value={activeCustomers}           sub={`${pendingCustomers} pending`}             icon={Users}       href="/customers" />
        <KpiCard label="MTD Revenue"         value={formatCurrency(mtdRevenue)} sub="billed this month"                        icon={Receipt}     href="/billing" />
        <KpiCard label="Open Tasks"          value={openTaskCount}             sub="open or in progress"                       icon={CheckSquare} href="/customers" />
        <KpiCard label="Accounts in Arrears" value={arrearsCount}              sub={`${formatCurrency(totalArrears)} outstanding`} icon={AlertTriangle} href="/debt" alert />
        <KpiCard label="Compliance Due"      value={complianceDueThisWeek}     sub="items due this week"                       icon={ShieldAlert} href="/market" alert={complianceDueThisWeek > 0} />
      </div>

      {/* ── Module quick-links + Activity feed ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        <div className="col-span-2 grid grid-cols-2 gap-3">
          <ModuleCard href="/catalogue"  icon={Package}      label="Product Catalogue"      status={`${activeProducts} active · ${draftProducts} draft`} />
          <ModuleCard href="/quotes"     icon={FilePlus}     label="Quotes"                 status={`${issuedQuotes.length} issued · ${formatCurrency(pipelineValue)} pipeline`} />
          <ModuleCard href="/customers"  icon={Users}        label="Customers"              status={`${activeCustomers} active · ${pendingCustomers} pending`} />
          <ModuleCard href="/billing"    icon={Receipt}      label="Billing"                status={`${overdueBills} overdue · ${disputedBills} disputed`} alert={overdueBills > 0} />
          <ModuleCard href="/debt"       icon={AlertTriangle} label="Debt & Collections"   status={`${arrearsCount} accounts · ${formatCurrency(totalArrears)}`} alert={arrearsCount > 0} />
          <ModuleCard href="/market"     icon={Radio}        label="Market Communications"  status={`${failedMessages} failed messages`} alert={failedMessages > 0} />
          <ModuleCard href="/analytics"  icon={BarChart2}    label="Analytics"              status={`${products.length} products · ${formatCurrency(mtdRevenue)} MTD`} />
          <ModuleCard href="/finance"    icon={Landmark}     label="Financial Control"      status={`${unbilledAccounts.length} unbilled accounts`} alert={unbilledAccounts.length > 0} />
        </div>

        {/* Activity feed */}
        <Card padding={false} className="flex flex-col overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-0 mb-0">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <div className="mt-3 flex-1 overflow-y-auto">
            {auditEntries.map((entry) => {
              const Icon = AUDIT_ICONS[entry.action] ?? Activity;
              const href = auditEntryHref(entry);
              const inner = (
                <>
                  <div className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.description}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {formatDateTime(entry.performedAt)}
                    </p>
                  </div>
                </>
              );
              return href ? (
                <Link
                  key={entry.id}
                  href={href}
                  className="flex gap-3 px-4 py-2.5 transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  {inner}
                </Link>
              ) : (
                <div key={entry.id} className="flex gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {inner}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>Billing Revenue — Last 6 Months</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={billingChartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => formatCurrency(v as number)}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)', boxShadow: 'var(--shadow-tooltip)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Bar dataKey="revenue" name="Revenue" fill={c.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Switch Activity — Last 6 Months</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={switchChartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)', boxShadow: 'var(--shadow-tooltip)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              <Bar dataKey="gained" name="Gained" fill={c.success} radius={[3, 3, 0, 0]} />
              <Bar dataKey="lost"   name="Lost"   fill={c.danger}  radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, href, alert = false }: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="block group">
      <Card
        className="transition-all"
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)')}
      >
        <div className="flex items-start justify-between">
          <p style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
            {label}
          </p>
          <div style={{ background: 'var(--color-primary-subtle)', borderRadius: 6, padding: '5px', color: 'var(--color-primary-text)' }}>
            <Icon size={13} />
          </div>
        </div>
        <p style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', color: alert ? 'var(--color-danger-text)' : 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub}</p>
      </Card>
    </Link>
  );
}

// ─── ModuleCard ───────────────────────────────────────────────────────────────
function ModuleCard({ href, icon: Icon, label, status, alert = false }: {
  href: string;
  icon: React.ElementType;
  label: string;
  status: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className="flex items-center gap-3 transition-all py-3"
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--bg-elevated)';
          el.style.borderColor = 'var(--border-strong)';
          const arrow = el.querySelector<HTMLElement>('.module-arrow');
          if (arrow) arrow.style.color = 'var(--color-primary)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--bg-surface)';
          el.style.borderColor = 'var(--border-default)';
          const arrow = el.querySelector<HTMLElement>('.module-arrow');
          if (arrow) arrow.style.color = 'var(--text-tertiary)';
        }}
      >
        <div style={{ flexShrink: 0, background: 'var(--bg-elevated)', borderRadius: 6, padding: 7, color: 'var(--text-tertiary)' }}>
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</p>
          <p className="truncate" style={{ fontSize: '0.75rem', color: alert ? 'var(--color-danger-text)' : 'var(--text-secondary)' }}>{status}</p>
        </div>
        <ArrowRight size={13} className="module-arrow ml-auto shrink-0" style={{ color: 'var(--text-tertiary)', transition: 'color 150ms ease' }} />
      </Card>
    </Link>
  );
}
