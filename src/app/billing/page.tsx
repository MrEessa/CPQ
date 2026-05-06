'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Receipt } from 'lucide-react';
import { getBills, addBill } from '@/lib/data/bills';
import { getCustomers, getCustomerById } from '@/lib/data/customers';
import { getProducts } from '@/lib/data/products';
import { generateBill } from '@/lib/billing-engine';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatUsage } from '@/lib/utils';
import { BillStatus } from '@/lib/types';

const BILL_STATUSES: BillStatus[] = ['issued', 'overdue', 'disputed', 'paid'];

function getLastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

interface GenBillForm {
  customerId: string;
  productId: string;
  periodFrom: string;
  periodTo: string;
  usageKwh: string;
}

const lastMonth = getLastMonthRange();
const EMPTY_GEN_FORM: GenBillForm = {
  customerId: '',
  productId: '',
  periodFrom: lastMonth.from,
  periodTo: lastMonth.to,
  usageKwh: '',
};

export default function BillingPage() {
  const [filterStatus, setFilterStatus] = useState<BillStatus[]>([]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState<GenBillForm>(EMPTY_GEN_FORM);
  const [genError, setGenError] = useState('');
  const [, forceUpdate] = useState(0);

  const allBills = getBills();
  const filteredBills = getBills(filterStatus.length ? { status: filterStatus } : undefined);

  // KPIs — always computed over the full bill set
  const totalOutstanding = allBills
    .filter((b) => b.status !== 'paid')
    .reduce((sum, b) => sum + (b.amountDue - b.amountPaid), 0);
  const overdueCount = allBills.filter((b) => b.status === 'overdue').length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const collectedMTD = allBills
    .flatMap((b) => b.payments)
    .filter((p) => p.paidAt.startsWith(thisMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  const allCustomers = getCustomers();
  const activeProducts = getProducts({ status: ['active'] });

  function toggleStatus(s: BillStatus) {
    setFilterStatus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function handleGenerate() {
    setGenError('');
    const customer = allCustomers.find((c) => c.id === genForm.customerId);
    const product = activeProducts.find((p) => p.id === genForm.productId);
    const usage = parseFloat(genForm.usageKwh);

    if (!customer || !product) {
      setGenError('Please select a customer and product.');
      return;
    }
    if (!genForm.periodFrom || !genForm.periodTo || genForm.periodFrom >= genForm.periodTo) {
      setGenError('Please enter a valid billing period (from must be before to).');
      return;
    }
    if (isNaN(usage) || usage <= 0) {
      setGenError('Please enter a positive usage amount.');
      return;
    }

    const bill = generateBill(customer, product, genForm.periodFrom, genForm.periodTo, usage);
    addBill(bill);
    setGenForm(EMPTY_GEN_FORM);
    setShowGenModal(false);
    forceUpdate((n) => n + 1);
  }

  function closeGenModal() {
    setShowGenModal(false);
    setGenForm(EMPTY_GEN_FORM);
    setGenError('');
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        <Button size="sm" onClick={() => setShowGenModal(true)}>
          <Plus size={14} /> Generate Bill
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {(
          [
            {
              label: 'Total Bills',
              value: String(allBills.length),
              sub: 'all time',
              valueClass: 'text-gray-900',
            },
            {
              label: 'Total Outstanding',
              value: formatCurrency(totalOutstanding),
              sub: 'unpaid balance',
              valueClass: totalOutstanding > 0.01 ? 'text-red-600' : 'text-green-700',
            },
            {
              label: 'Overdue',
              value: String(overdueCount),
              sub: 'bills overdue',
              valueClass: overdueCount > 0 ? 'text-red-600' : 'text-gray-900',
            },
            {
              label: 'Collected MTD',
              value: formatCurrency(collectedMTD),
              sub: 'payments this month',
              valueClass: 'text-green-700',
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

      {/* Filter bar */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        {BILL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
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

      {/* Bills table */}
      <Card padding={false}>
        {filteredBills.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No bills match the selected filters.{' '}
            <button className="text-blue-600 hover:underline" onClick={() => setShowGenModal(true)}>
              Generate a bill
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Reference</th>
                <th className="px-5 py-2.5 text-left">Customer</th>
                <th className="px-5 py-2.5 text-left">Period</th>
                <th className="px-5 py-2.5 text-right">Usage</th>
                <th className="px-5 py-2.5 text-right">Amount Due</th>
                <th className="px-5 py-2.5 text-right">Paid</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill, i) => {
                const customer = getCustomerById(bill.customerId);
                const outstanding = bill.amountDue - bill.amountPaid;
                return (
                  <tr
                    key={bill.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/billing/${bill.id}`}
                        className="flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
                      >
                        <Receipt size={13} className="shrink-0" />
                        {bill.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {customer ? (
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-gray-900 hover:underline"
                        >
                          {customer.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">{bill.customerId}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(bill.periodFrom)} – {formatDate(bill.periodTo)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {formatUsage(bill.usageKwh)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(bill.amountDue)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-medium ${
                        outstanding > 0.01 ? 'text-red-600' : 'text-green-700'
                      }`}
                    >
                      {formatCurrency(bill.amountPaid)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={bill.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(bill.dueDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Generate Bill Modal */}
      <Modal open={showGenModal} onClose={closeGenModal} title="Generate Bill" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={genForm.customerId}
              onChange={(e) => setGenForm({ ...genForm, customerId: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer…</option>
              {allCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.accountRef} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={genForm.productId}
              onChange={(e) => setGenForm({ ...genForm, productId: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select product…</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Period from</label>
              <input
                type="date"
                value={genForm.periodFrom}
                onChange={(e) => setGenForm({ ...genForm, periodFrom: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Period to</label>
              <input
                type="date"
                value={genForm.periodTo}
                onChange={(e) => setGenForm({ ...genForm, periodTo: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Usage (kWh) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={genForm.usageKwh}
              onChange={(e) => setGenForm({ ...genForm, usageKwh: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 300"
              min={0}
            />
            <p className="mt-0.5 text-xs text-gray-400">Typical monthly residential: ~290 kWh</p>
          </div>

          {genError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{genError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={closeGenModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={!genForm.customerId || !genForm.productId || !genForm.usageKwh}
            >
              Generate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
