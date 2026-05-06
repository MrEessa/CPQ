'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { getBillById, recordPayment, updateBillStatus, BILL_STATUS_TRANSITIONS } from '@/lib/data/bills';
import { getCustomerById } from '@/lib/data/customers';
import { getProductById } from '@/lib/data/products';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatDateTime, formatRate, formatStandingCharge, formatUsage } from '@/lib/utils';
import { BillStatus, PaymentMethod } from '@/lib/types';

const TRANSITION_LABELS: Partial<Record<BillStatus, string>> = { overdue: 'Mark Overdue', disputed: 'Raise Dispute', issued: 'Reissue' };
const TRANSITION_VARIANTS: Partial<Record<BillStatus, 'primary' | 'secondary' | 'danger' | 'ghost'>> = { overdue: 'danger', disputed: 'secondary', issued: 'secondary' };
const PAYMENT_METHODS: PaymentMethod[] = ['direct_debit', 'card', 'bank_transfer', 'cheque'];

function fmtMethod(m: PaymentMethod): string {
  return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BillDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [, forceUpdate]               = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount]     = useState('');
  const [payMethod, setPayMethod]     = useState<PaymentMethod>('direct_debit');
  const [payRef, setPayRef]           = useState('');
  const [payDate, setPayDate]         = useState(new Date().toISOString().split('T')[0]);
  const [payError, setPayError]       = useState('');

  const billOrUndefined = getBillById(id);
  if (!billOrUndefined) notFound();
  const bill = billOrUndefined;

  const customer    = getCustomerById(bill.customerId);
  const product     = getProductById(bill.productId);
  const outstanding = parseFloat((bill.amountDue - bill.amountPaid).toFixed(2));
  const nonPaidTransitions = BILL_STATUS_TRANSITIONS[bill.status].filter((s) => s !== 'paid');

  function handleTransition(newStatus: BillStatus) { updateBillStatus(id, newStatus); forceUpdate((n) => n + 1); }

  function openPayModal() { setPayAmount(outstanding > 0 ? outstanding.toFixed(2) : ''); setShowPayModal(true); }
  function closePayModal() { setShowPayModal(false); setPayAmount(''); setPayRef(''); setPayDate(new Date().toISOString().split('T')[0]); setPayError(''); }

  function handleRecordPayment() {
    setPayError('');
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setPayError('Please enter a valid payment amount.'); return; }
    recordPayment(id, { customerId: bill.customerId, amount, method: payMethod, paidAt: new Date(payDate).toISOString(), reference: payRef.trim() || undefined });
    closePayModal(); forceUpdate((n) => n + 1);
  }

  const bd = bill.breakdown;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/billing" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
          ><ArrowLeft size={16} /></Link>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{bill.reference}</h2>
          <Badge variant={bill.status} />
          {customer && <Link href={`/customers/${customer.id}`} className="table-link text-sm">{customer.name}</Link>}
        </div>
        <div className="flex gap-2">
          {bill.status !== 'paid' && <Button size="sm" onClick={openPayModal}><CreditCard size={14} /> Record Payment</Button>}
          {nonPaidTransitions.map((next) => (
            <Button key={next} size="sm" variant={TRANSITION_VARIANTS[next] ?? 'secondary'} onClick={() => handleTransition(next)}>{TRANSITION_LABELS[next]}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
          <dl className="space-y-2 text-sm">
            {([
              ['Customer', customer ? <Link key="c" href={`/customers/${customer.id}`} className="table-link">{customer.accountRef} — {customer.name}</Link> : bill.customerId],
              ['Product', product ? <Link key="p" href={`/catalogue/${product.id}`} className="table-link">{product.name}</Link> : bill.productId],
              ['Billing period', `${formatDate(bill.periodFrom)} – ${formatDate(bill.periodTo)}`],
              ['Usage', formatUsage(bill.usageKwh)],
              ['Issued', formatDate(bill.issuedAt)],
              ['Due date', formatDate(bill.dueDate)],
            ] as [string, React.ReactNode][]).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                <dd className="text-right font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader><CardTitle>Amount Summary</CardTitle></CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>Amount due</dt>
              <dd className="font-medium cell-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(bill.amountDue)}</dd>
            </div>
            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)' }}>Amount paid</dt>
              <dd className="font-medium cell-mono" style={{ color: 'var(--color-success-text)' }}>{formatCurrency(bill.amountPaid)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>Outstanding</dt>
              <dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: outstanding > 0.01 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>{formatCurrency(outstanding)}</dd>
            </div>
          </dl>
          {bill.status === 'paid' && <p className="mt-3 rounded-md px-3 py-2 text-xs" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' }}>✓ Fully paid — no balance outstanding.</p>}
          {bill.status === 'overdue' && <p className="mt-3 rounded-md px-3 py-2 text-xs" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>⚠ This bill is overdue. Contact the customer or refer to debt collections.</p>}
          {bill.status === 'disputed' && <p className="mt-3 rounded-md px-3 py-2 text-xs" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>↩ This bill is under dispute. Resolve before reissuing or taking action.</p>}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          {product && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{product.name}</p>}
        </CardHeader>
        <table className="w-full text-sm">
          <tbody>
            {bd.standingChargeAnnual > 0 && (
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Standing charge{product?.pricingStructure.standingCharge !== undefined && <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>({formatStandingCharge(product.pricingStructure.standingCharge)})</span>}
                </td>
                <td className="py-1.5 text-right cell-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(bd.standingChargeAnnual)}</td>
              </tr>
            )}
            {bd.rateLines.map((line) => (
              <tr key={line.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {line.label} <span style={{ color: 'var(--text-tertiary)' }}>({line.kwhUsed.toLocaleString()} kWh @ {formatRate(line.unitRate)})</span>
                </td>
                <td className="py-1.5 text-right cell-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(line.cost)}</td>
              </tr>
            ))}
            {bd.leviesTotal > 0 && (
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>Levies</td>
                <td className="py-1.5 text-right cell-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(bd.leviesTotal)}</td>
              </tr>
            )}
            <tr style={{ background: 'var(--bg-elevated)' }}>
              <td className="rounded-l px-1 py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>Subtotal (ex VAT)</td>
              <td className="rounded-r px-1 py-1.5 text-right font-semibold cell-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(bd.subtotal)}</td>
            </tr>
            <tr>
              <td className="px-1 py-1.5" style={{ color: 'var(--text-secondary)' }}>VAT ({product?.pricingStructure.vatRate ?? 5}%)</td>
              <td className="px-1 py-1.5 text-right cell-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(bd.vat)}</td>
            </tr>
            <tr style={{ borderTop: '1px solid var(--border-default)' }}>
              <td className="px-1 py-1.5 font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Total (inc VAT)</td>
              <td className="px-1 py-1.5 text-right font-bold cell-mono" style={{ color: 'var(--color-primary-text)', fontSize: '1rem' }}>{formatCurrency(bd.total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        {bill.payments.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No payments recorded yet.</p>
        ) : (
          <ol className="relative pl-5" style={{ borderLeft: '1px solid var(--border-default)' }}>
            {bill.payments.map((payment) => (
              <li key={payment.id} className="mb-4 last:mb-0">
                <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full" style={{ border: '2px solid var(--bg-surface)', background: 'var(--color-success)' }} />
                <div className="ml-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium cell-mono" style={{ color: 'var(--color-success-text)' }}>{formatCurrency(payment.amount)}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>via {fmtMethod(payment.method)}</span>
                    {payment.reference && <span className="text-xs cell-mono" style={{ color: 'var(--text-tertiary)' }}>({payment.reference})</span>}
                    <span className="ml-auto text-xs cell-mono" style={{ color: 'var(--text-tertiary)' }}>{formatDateTime(payment.paidAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Modal open={showPayModal} onClose={closePayModal} title="Record Payment">
        <div className="space-y-4">
          <div>
            <label className="field-label">Amount (£) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="number" className="field-input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" min={0.01} step={0.01} />
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>Outstanding: {formatCurrency(outstanding)}</p>
          </div>
          <div>
            <label className="field-label">Payment method</label>
            <select className="field-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{fmtMethod(m)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Payment date</label>
              <input type="date" className="field-input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Reference (optional)</label>
              <input type="text" className="field-input" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. DD-2026-05" />
            </div>
          </div>
          {payError && <p className="rounded-md px-3 py-2 text-xs" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>{payError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={closePayModal}>Cancel</Button>
            <Button size="sm" onClick={handleRecordPayment} disabled={!payAmount}>Record Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
