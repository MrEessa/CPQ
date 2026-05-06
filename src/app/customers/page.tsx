'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, User } from 'lucide-react';
import { getCustomers, addCustomer } from '@/lib/data/customers';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CustomerType, CustomerStatus, MeterType, Address } from '@/lib/types';

const CUSTOMER_TYPES: CustomerType[]   = ['residential', 'sme', 'ic'];
const CUSTOMER_STATUSES: CustomerStatus[] = ['active', 'pending', 'suspended', 'closed'];
type BalanceBucket = 'credit' | 'arrears';

function fmtType(t: CustomerType): string {
  if (t === 'ic') return 'I&C';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

interface AddForm {
  name: string; customerType: CustomerType; market: string; meterType: MeterType;
  annualUsageKwh: string; line1: string; city: string; postcode: string;
}
const EMPTY_FORM: AddForm = { name: '', customerType: 'residential', market: 'GB', meterType: 'smart', annualUsageKwh: '3500', line1: '', city: '', postcode: '' };

export default function CustomersPage() {
  const [filterType, setFilterType]     = useState<CustomerType[]>([]);
  const [filterStatus, setFilterStatus] = useState<CustomerStatus[]>([]);
  const [filterBalance, setFilterBalance] = useState<BalanceBucket | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm]                 = useState<AddForm>(EMPTY_FORM);
  const [, forceUpdate]                 = useState(0);

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  let customers = getCustomers({ customerType: filterType.length ? filterType : undefined, status: filterStatus.length ? filterStatus : undefined });
  if (filterBalance === 'credit')  customers = customers.filter((c) => c.balance > 0);
  if (filterBalance === 'arrears') customers = customers.filter((c) => c.balance < 0);

  function handleAdd() {
    if (!form.name.trim() || !form.line1.trim()) return;
    const address: Address = { line1: form.line1, city: form.city, postcode: form.postcode, countryCode: form.market === 'IE' ? 'IE' : 'GB' };
    addCustomer({ name: form.name.trim(), customerType: form.customerType, market: form.market, meterType: form.meterType, annualUsageKwh: parseFloat(form.annualUsageKwh) || 3500, supplyAddress: address, billingAddress: address, currentProducts: [], supplyStartDate: new Date().toISOString().slice(0, 10), balance: 0 });
    setForm(EMPTY_FORM); setShowAddModal(false); forceUpdate((n) => n + 1);
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{customers.length} customer{customers.length !== 1 ? 's' : ''}</h2>
        <Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Customer</Button>
      </div>

      <div className="filter-row">
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Type:</span>
          {CUSTOMER_TYPES.map((t) => (
            <button key={t} onClick={() => setFilterType((p) => toggleFilter(p, t))} className={`filter-chip ${filterType.includes(t) ? 'active' : ''}`}>{fmtType(t)}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Status:</span>
          {CUSTOMER_STATUSES.map((s) => (
            <button key={s} onClick={() => setFilterStatus((p) => toggleFilter(p, s))} className={`filter-chip ${filterStatus.includes(s) ? 'active' : ''}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="filter-label">Balance:</span>
          {(['credit', 'arrears'] as BalanceBucket[]).map((b) => (
            <button key={b} onClick={() => setFilterBalance(filterBalance === b ? null : b)} className={`filter-chip ${filterBalance === b ? 'active' : ''}`}>{b.charAt(0).toUpperCase() + b.slice(1)}</button>
          ))}
        </div>
      </div>

      <Card padding={false}>
        {customers.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No customers match the selected filters.{' '}
            <button className="table-link" onClick={() => setShowAddModal(true)}>Add a customer</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th><th>Name</th><th>Type</th><th>Status</th>
                <th>Market</th><th className="text-right">Balance</th><th>Supply Start</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const balanceColor = c.balance > 0 ? 'var(--color-success-text)' : c.balance < 0 ? 'var(--color-danger-text)' : 'var(--text-secondary)';
                return (
                  <tr key={c.id}>
                    <td className="cell-primary cell-mono">
                      <Link href={`/customers/${c.id}`} className="table-link flex items-center gap-1.5">
                        <User size={13} className="shrink-0" />{c.accountRef}
                      </Link>
                    </td>
                    <td className="cell-primary">{c.name}</td>
                    <td className="text-xs">{fmtType(c.customerType)}</td>
                    <td><Badge variant={c.status} /></td>
                    <td>{c.market}</td>
                    <td className="text-right font-medium cell-mono" style={{ color: balanceColor }}>
                      {formatCurrency(Math.abs(c.balance))}
                      {c.balance < 0 && <span className="ml-1 text-xs font-normal">DR</span>}
                      {c.balance > 0 && <span className="ml-1 text-xs font-normal">CR</span>}
                    </td>
                    <td>{formatDate(c.supplyStartDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setForm(EMPTY_FORM); }} title="Add Customer" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="field-label">Full name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input type="text" className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah Mitchell" />
            </div>
            <div>
              <label className="field-label">Customer type</label>
              <select className="field-input" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}>
                <option value="residential">Residential</option><option value="sme">SME</option><option value="ic">I&amp;C</option>
              </select>
            </div>
            <div>
              <label className="field-label">Market</label>
              <select className="field-input" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
                <option value="GB">GB</option><option value="IE">IE</option>
              </select>
            </div>
            <div>
              <label className="field-label">Meter type</label>
              <select className="field-input" value={form.meterType} onChange={(e) => setForm({ ...form, meterType: e.target.value as MeterType })}>
                <option value="smart">Smart</option><option value="traditional">Traditional</option><option value="prepayment">Prepayment</option>
              </select>
            </div>
            <div>
              <label className="field-label">Annual usage (kWh)</label>
              <input type="number" className="field-input" value={form.annualUsageKwh} onChange={(e) => setForm({ ...form, annualUsageKwh: e.target.value })} placeholder="3500" min={0} />
            </div>
          </div>
          <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Supply address</p>
            <div className="space-y-2">
              <input type="text" className="field-input" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="Address line 1 *" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" className="field-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
                <input type="text" className="field-input" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} placeholder="Postcode" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button size="sm" disabled={!form.name.trim() || !form.line1.trim()} onClick={handleAdd}>Add Customer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
