'use client';

import Link from 'next/link';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { getDebtAccounts, getPaymentPlans } from '@/lib/data/debt';
import { getCustomerById } from '@/lib/data/customers';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DebtPage() {
  const accounts = getDebtAccounts();
  const plans    = getPaymentPlans();

  const totalArrears   = accounts.reduce((sum, d) => sum + d.currentBalance, 0);
  const activePlanCount = plans.filter((p) => p.status === 'active').length;
  const vulnerableCount = accounts.filter((d) => d.vulnerabilityFlags.length > 0).length;

  const kpis = [
    { label: 'Accounts in Arrears', value: String(accounts.length),        sub: 'active debt accounts',     color: accounts.length > 0 ? 'var(--color-danger-text)'   : 'var(--text-primary)' },
    { label: 'Total Arrears',       value: formatCurrency(totalArrears),   sub: 'outstanding balance',      color: totalArrears > 0    ? 'var(--color-danger-text)'   : 'var(--text-primary)' },
    { label: 'Active Plans',        value: String(activePlanCount),        sub: 'payment plans in force',   color: 'var(--color-primary-text)' },
    { label: 'Vulnerable Accounts', value: String(vulnerableCount),        sub: 'flags raised',             color: vulnerableCount > 0 ? 'var(--color-warning-text)'  : 'var(--text-primary)' },
  ];

  return (
    <div className="max-w-5xl space-y-5">
      <h2 className="section-title">Debt &amp; Collections</h2>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, color }) => (
          <Card key={label}>
            <p style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</p>
            <p style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color }}>{value}</p>
            <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</p>
          </Card>
        ))}
      </div>

      <Card padding={false}>
        {accounts.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No debt accounts found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th><th className="text-right">Arrears</th><th>Stage</th>
                <th>Vulnerability</th><th>Plan Status</th><th>Next Action</th><th />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const customer = getCustomerById(account.customerId);
                const plan     = account.paymentPlanId ? plans.find((p) => p.id === account.paymentPlanId) : undefined;
                return (
                  <tr key={account.id}>
                    <td>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{customer?.name ?? account.customerId}</div>
                      {customer && <div className="text-xs cell-mono" style={{ color: 'var(--text-tertiary)' }}>{customer.accountRef}</div>}
                    </td>
                    <td className="text-right font-semibold cell-mono" style={{ color: 'var(--color-danger-text)' }}>{formatCurrency(account.currentBalance)}</td>
                    <td><Badge variant={account.collectionStage} /></td>
                    <td>
                      {account.vulnerabilityFlags.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>
                          <ShieldAlert size={11} />{account.vulnerabilityFlags.length} flag{account.vulnerabilityFlags.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td>{plan ? <Badge variant={plan.status} /> : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No plan</span>}</td>
                    <td className="text-xs">{account.nextActionDate ? formatDate(account.nextActionDate) : '—'}</td>
                    <td className="text-right">
                      <Link href={`/debt/${account.customerId}`} className="table-link text-xs">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {vulnerableCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid var(--color-warning)', background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{vulnerableCount}</strong> account{vulnerableCount !== 1 ? 's have' : ' has'} active vulnerability flags. Review before escalating collection stages — Ofgem protections apply.
          </span>
        </div>
      )}
    </div>
  );
}
