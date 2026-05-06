'use client';

import Link from 'next/link';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { getDebtAccounts } from '@/lib/data/debt';
import { getPaymentPlans } from '@/lib/data/debt';
import { getCustomerById } from '@/lib/data/customers';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DebtPage() {
  const accounts = getDebtAccounts();
  const plans = getPaymentPlans();

  const totalArrears = accounts.reduce((sum, d) => sum + d.currentBalance, 0);
  const activePlanCount = plans.filter((p) => p.status === 'active').length;
  const vulnerableCount = accounts.filter((d) => d.vulnerabilityFlags.length > 0).length;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Debt &amp; Collections</h2>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {(
          [
            {
              label: 'Accounts in Arrears',
              value: String(accounts.length),
              sub: 'active debt accounts',
              valueClass: accounts.length > 0 ? 'text-red-600' : 'text-gray-900',
            },
            {
              label: 'Total Arrears',
              value: formatCurrency(totalArrears),
              sub: 'outstanding balance',
              valueClass: totalArrears > 0 ? 'text-red-600' : 'text-gray-900',
            },
            {
              label: 'Active Plans',
              value: String(activePlanCount),
              sub: 'payment plans in force',
              valueClass: 'text-blue-700',
            },
            {
              label: 'Vulnerable Accounts',
              value: String(vulnerableCount),
              sub: 'flags raised',
              valueClass: vulnerableCount > 0 ? 'text-orange-600' : 'text-gray-900',
            },
          ] as const
        ).map(({ label, value, sub, valueClass }) => (
          <Card key={label}>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
          </Card>
        ))}
      </div>

      {/* Arrears table */}
      <Card padding={false}>
        {accounts.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No debt accounts found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Customer</th>
                <th className="px-5 py-2.5 text-right">Arrears</th>
                <th className="px-5 py-2.5 text-left">Stage</th>
                <th className="px-5 py-2.5 text-left">Vulnerability</th>
                <th className="px-5 py-2.5 text-left">Plan Status</th>
                <th className="px-5 py-2.5 text-left">Next Action</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, i) => {
                const customer = getCustomerById(account.customerId);
                const plan = account.paymentPlanId
                  ? plans.find((p) => p.id === account.paymentPlanId)
                  : undefined;

                return (
                  <tr
                    key={account.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-900">
                          {customer?.name ?? account.customerId}
                        </span>
                        {customer && (
                          <span className="text-xs text-gray-400">{customer.accountRef}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-red-600">
                      {formatCurrency(account.currentBalance)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={account.collectionStage} />
                    </td>
                    <td className="px-5 py-3">
                      {account.vulnerabilityFlags.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                          <ShieldAlert size={11} />
                          {account.vulnerabilityFlags.length} flag
                          {account.vulnerabilityFlags.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {plan ? (
                        <Badge variant={plan.status} />
                      ) : (
                        <span className="text-xs text-gray-400">No plan</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {account.nextActionDate ? formatDate(account.nextActionDate) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/debt/${account.customerId}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {vulnerableCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{vulnerableCount}</strong> account
            {vulnerableCount !== 1 ? 's have' : ' has'} active vulnerability flags. Review before
            escalating collection stages — Ofgem protections apply.
          </span>
        </div>
      )}
    </div>
  );
}
