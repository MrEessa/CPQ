'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CreditCard } from 'lucide-react';
import {
  getBillById,
  recordPayment,
  updateBillStatus,
  BILL_STATUS_TRANSITIONS,
} from '@/lib/data/bills';
import { getCustomerById } from '@/lib/data/customers';
import { getProductById } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRate,
  formatStandingCharge,
  formatUsage,
} from '@/lib/utils';
import { BillStatus, PaymentMethod } from '@/lib/types';

const TRANSITION_LABELS: Partial<Record<BillStatus, string>> = {
  overdue: 'Mark Overdue',
  disputed: 'Raise Dispute',
  issued: 'Reissue',
};

const TRANSITION_VARIANTS: Partial<
  Record<BillStatus, 'primary' | 'secondary' | 'danger' | 'ghost'>
> = {
  overdue: 'danger',
  disputed: 'secondary',
  issued: 'secondary',
};

const PAYMENT_METHODS: PaymentMethod[] = [
  'direct_debit',
  'card',
  'bank_transfer',
  'cheque',
];

function fmtMethod(m: PaymentMethod): string {
  return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  params: { id: string };
}

export default function BillDetailPage({ params }: Props) {
  const { id } = params;
  const [, forceUpdate] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('direct_debit');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payError, setPayError] = useState('');

  const billOrUndefined = getBillById(id);
  if (!billOrUndefined) notFound();
  const bill = billOrUndefined;

  const customer = getCustomerById(bill.customerId);
  const product = getProductById(bill.productId);
  const outstanding = parseFloat((bill.amountDue - bill.amountPaid).toFixed(2));
  // Non-paid transitions: 'paid' is handled exclusively via Record Payment
  const nonPaidTransitions = BILL_STATUS_TRANSITIONS[bill.status].filter((s) => s !== 'paid');

  function handleTransition(newStatus: BillStatus) {
    updateBillStatus(id, newStatus);
    forceUpdate((n) => n + 1);
  }

  function openPayModal() {
    setPayAmount(outstanding > 0 ? outstanding.toFixed(2) : '');
    setShowPayModal(true);
  }

  function closePayModal() {
    setShowPayModal(false);
    setPayAmount('');
    setPayRef('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayError('');
  }

  function handleRecordPayment() {
    setPayError('');
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }
    recordPayment(id, {
      customerId: bill.customerId,
      amount,
      method: payMethod,
      paidAt: new Date(payDate).toISOString(),
      reference: payRef.trim() || undefined,
    });
    closePayModal();
    forceUpdate((n) => n + 1);
  }

  const bd = bill.breakdown;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/billing" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">{bill.reference}</h2>
          <Badge variant={bill.status} />
          {customer && (
            <Link
              href={`/customers/${customer.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {customer.name}
            </Link>
          )}
        </div>

        <div className="flex gap-2">
          {bill.status !== 'paid' && (
            <Button size="sm" onClick={openPayModal}>
              <CreditCard size={14} /> Record Payment
            </Button>
          )}
          {nonPaidTransitions.map((next) => (
            <Button
              key={next}
              size="sm"
              variant={TRANSITION_VARIANTS[next] ?? 'secondary'}
              onClick={() => handleTransition(next)}
            >
              {TRANSITION_LABELS[next]}
            </Button>
          ))}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            {(
              [
                [
                  'Customer',
                  customer ? (
                    <Link
                      key="cust"
                      href={`/customers/${customer.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {customer.accountRef} — {customer.name}
                    </Link>
                  ) : (
                    bill.customerId
                  ),
                ],
                [
                  'Product',
                  product ? (
                    <Link
                      key="prod"
                      href={`/catalogue/${product.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    bill.productId
                  ),
                ],
                [
                  'Billing period',
                  `${formatDate(bill.periodFrom)} – ${formatDate(bill.periodTo)}`,
                ],
                ['Usage', formatUsage(bill.usageKwh)],
                ['Issued', formatDate(bill.issuedAt)],
                ['Due date', formatDate(bill.dueDate)],
              ] as [string, React.ReactNode][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-right font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amount Summary</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Amount due</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(bill.amountDue)}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Amount paid</dt>
              <dd className="font-medium text-green-700">{formatCurrency(bill.amountPaid)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-base font-semibold text-gray-900">Outstanding</dt>
              <dd
                className={`text-base font-bold ${
                  outstanding > 0.01 ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {formatCurrency(outstanding)}
              </dd>
            </div>
          </dl>
          {bill.status === 'paid' && (
            <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
              ✓ Fully paid — no balance outstanding.
            </p>
          )}
          {bill.status === 'overdue' && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              ⚠ This bill is overdue. Contact the customer or refer to debt collections.
            </p>
          )}
          {bill.status === 'disputed' && (
            <p className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              ↩ This bill is under dispute. Resolve before reissuing or taking action.
            </p>
          )}
        </Card>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          {product && <p className="text-xs text-gray-500">{product.name}</p>}
        </CardHeader>
        <table className="w-full text-sm">
          <tbody>
            {bd.standingChargeAnnual > 0 && (
              <tr className="border-b border-gray-50">
                <td className="py-1.5 text-gray-500">
                  Standing charge
                  {product?.pricingStructure.standingCharge !== undefined && (
                    <span className="ml-1 text-gray-400">
                      ({formatStandingCharge(product.pricingStructure.standingCharge)})
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-700">
                  {formatCurrency(bd.standingChargeAnnual)}
                </td>
              </tr>
            )}
            {bd.rateLines.map((line) => (
              <tr key={line.label} className="border-b border-gray-50">
                <td className="py-1.5 text-gray-500">
                  {line.label}
                  <span className="ml-1 text-gray-400">
                    ({line.kwhUsed.toLocaleString()} kWh @ {formatRate(line.unitRate)})
                  </span>
                </td>
                <td className="py-1.5 text-right text-gray-700">{formatCurrency(line.cost)}</td>
              </tr>
            ))}
            {bd.leviesTotal > 0 && (
              <tr className="border-b border-gray-50">
                <td className="py-1.5 text-gray-500">Levies</td>
                <td className="py-1.5 text-right text-gray-700">
                  {formatCurrency(bd.leviesTotal)}
                </td>
              </tr>
            )}
            <tr className="bg-gray-50">
              <td className="rounded-l px-1 py-1.5 font-medium text-gray-800">
                Subtotal (ex VAT)
              </td>
              <td className="rounded-r px-1 py-1.5 text-right font-semibold text-gray-900">
                {formatCurrency(bd.subtotal)}
              </td>
            </tr>
            <tr>
              <td className="px-1 py-1.5 text-gray-500">
                VAT ({product?.pricingStructure.vatRate ?? 5}%)
              </td>
              <td className="px-1 py-1.5 text-right text-gray-700">{formatCurrency(bd.vat)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-1 py-1.5 text-base font-semibold text-gray-900">
                Total (inc VAT)
              </td>
              <td className="px-1 py-1.5 text-right text-base font-bold text-blue-700">
                {formatCurrency(bd.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        {bill.payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 pl-5">
            {bill.payments.map((payment) => (
              <li key={payment.id} className="mb-4 last:mb-0">
                <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-green-400" />
                <div className="ml-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-green-700">
                      {formatCurrency(payment.amount)}
                    </span>
                    <span className="text-gray-400">via {fmtMethod(payment.method)}</span>
                    {payment.reference && (
                      <span className="text-xs text-gray-400">({payment.reference})</span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {formatDateTime(payment.paidAt)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal open={showPayModal} onClose={closePayModal} title="Record Payment">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Amount (£) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min={0.01}
              step={0.01}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              Outstanding: {formatCurrency(outstanding)}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Payment method
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {fmtMethod(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Payment date
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Reference (optional)
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. DD-2026-05"
              />
            </div>
          </div>

          {payError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{payError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={closePayModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRecordPayment} disabled={!payAmount}>
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
