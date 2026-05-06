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

const CUSTOMER_TYPES: CustomerType[] = ['residential', 'sme', 'ic'];
const CUSTOMER_STATUSES: CustomerStatus[] = ['active', 'pending', 'suspended', 'closed'];

type BalanceBucket = 'credit' | 'arrears';

function fmtType(t: CustomerType): string {
  if (t === 'ic') return 'I&C';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

interface AddForm {
  name: string;
  customerType: CustomerType;
  market: string;
  meterType: MeterType;
  annualUsageKwh: string;
  line1: string;
  city: string;
  postcode: string;
}

const EMPTY_FORM: AddForm = {
  name: '',
  customerType: 'residential',
  market: 'GB',
  meterType: 'smart',
  annualUsageKwh: '3500',
  line1: '',
  city: '',
  postcode: '',
};

export default function CustomersPage() {
  const [filterType, setFilterType] = useState<CustomerType[]>([]);
  const [filterStatus, setFilterStatus] = useState<CustomerStatus[]>([]);
  const [filterBalance, setFilterBalance] = useState<BalanceBucket | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [, forceUpdate] = useState(0);

  function toggleFilter<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  let customers = getCustomers({
    customerType: filterType.length ? filterType : undefined,
    status: filterStatus.length ? filterStatus : undefined,
  });
  if (filterBalance === 'credit') customers = customers.filter((c) => c.balance > 0);
  if (filterBalance === 'arrears') customers = customers.filter((c) => c.balance < 0);

  function handleAdd() {
    if (!form.name.trim() || !form.line1.trim()) return;
    const address: Address = {
      line1: form.line1,
      city: form.city,
      postcode: form.postcode,
      countryCode: form.market === 'IE' ? 'IE' : 'GB',
    };
    addCustomer({
      name: form.name.trim(),
      customerType: form.customerType,
      market: form.market,
      meterType: form.meterType,
      annualUsageKwh: parseFloat(form.annualUsageKwh) || 3500,
      supplyAddress: address,
      billingAddress: address,
      currentProducts: [],
      supplyStartDate: new Date().toISOString().slice(0, 10),
      balance: 0,
    });
    setForm(EMPTY_FORM);
    setShowAddModal(false);
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {customers.length} customer{customers.length !== 1 ? 's' : ''}
        </h2>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add Customer
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Type:</span>
          {CUSTOMER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType((prev) => toggleFilter(prev, t))}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterType.includes(t)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {fmtType(t)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Status:</span>
          {CUSTOMER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus((prev) => toggleFilter(prev, s))}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterStatus.includes(s)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Balance:</span>
          {(['credit', 'arrears'] as BalanceBucket[]).map((b) => (
            <button
              key={b}
              onClick={() => setFilterBalance(filterBalance === b ? null : b)}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                filterBalance === b
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card padding={false}>
        {customers.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No customers match the selected filters.{' '}
            <button
              className="text-blue-600 hover:underline"
              onClick={() => setShowAddModal(true)}
            >
              Add a customer
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Account</th>
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-5 py-2.5 text-left">Type</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Market</th>
                <th className="px-5 py-2.5 text-right">Balance</th>
                <th className="px-5 py-2.5 text-left">Supply Start</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => {
                const balanceAbs = Math.abs(c.balance);
                const balanceColor =
                  c.balance > 0 ? 'text-green-700' : c.balance < 0 ? 'text-red-600' : 'text-gray-500';
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/customers/${c.id}`}
                        className="flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
                      >
                        <User size={13} className="shrink-0" />
                        {c.accountRef}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3 text-xs text-gray-600">{fmtType(c.customerType)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={c.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.market}</td>
                    <td className={`px-5 py-3 text-right font-medium ${balanceColor}`}>
                      {formatCurrency(balanceAbs)}
                      {c.balance < 0 && (
                        <span className="ml-1 text-xs font-normal">DR</span>
                      )}
                      {c.balance > 0 && (
                        <span className="ml-1 text-xs font-normal">CR</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(c.supplyStartDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setForm(EMPTY_FORM); }}
        title="Add Customer"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Sarah Mitchell"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Customer type</label>
              <select
                value={form.customerType}
                onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="residential">Residential</option>
                <option value="sme">SME</option>
                <option value="ic">I&amp;C</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Market</label>
              <select
                value={form.market}
                onChange={(e) => setForm({ ...form, market: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GB">GB</option>
                <option value="IE">IE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Meter type</label>
              <select
                value={form.meterType}
                onChange={(e) => setForm({ ...form, meterType: e.target.value as MeterType })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="smart">Smart</option>
                <option value="traditional">Traditional</option>
                <option value="prepayment">Prepayment</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Annual usage (kWh)</label>
              <input
                type="number"
                value={form.annualUsageKwh}
                onChange={(e) => setForm({ ...form, annualUsageKwh: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3500"
                min={0}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Supply address
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Address line 1 *"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Postcode"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.name.trim() || !form.line1.trim()}
              onClick={handleAdd}
            >
              Add Customer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
