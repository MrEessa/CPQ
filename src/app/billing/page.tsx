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
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
    to:   new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
  };
}

interface GenBillForm { customerId: string; productId: string; periodFrom: string; periodTo: string; usageKwh: string; }
const lastMonth = getLastMonthRange();
const EMPTY_GEN_FORM: GenBillForm = { customerId: '', productId: '', periodFrom: lastMonth.from, periodTo: lastMonth.to, usageKwh: '' };

export default function BillingPage() {
  const [filterStatus, setFilterStatus] = useState<BillStatus[]>([]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm]           = useState<GenBillForm>(EMPTY_GEN_FORM);
  const [genError, setGenError]         = useState('');
  const [, forceUpdate]                 = useState(0);

  const allBills      = getBills();
  const filteredBills = getBills(filterStatus.length ? { status: filterStatus } : undefined);

  const totalOutstanding = allBills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + (b.amountDue - b.amountPaid), 0);
  const overdueCount     = allBills.filter((b) => b.status === 'overdue').length;
  const thisMonth        = new Date().toISOString().slice(0, 7);
  const collectedMTD     = allBills.flatMap((b) => b.payments).filter((p) => p.paidAt.startsWith(thisMonth)).reduce((sum, p) => sum + p.amount, 0);

  const allCustomers  = getCustomers();
  const activeProducts = getProducts({ status: ['active'] });

  function toggleStatus(s: BillStatus) {
    setFilterStatus((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function handleGenerate() {
    setGenError('');
    const customer = allCustomers.find((c) => c.id === genForm.customerId);
    const product  = activeProducts.find((p) => p.id === genForm.productId);
    const usage    = parseFloat(genForm.usageKwh);
    if (!customer || !product) { setGenError('Please select a customer and product.'); return; }
    if (!genForm.periodFrom || !genForm.periodTo || genForm.periodFrom >= genForm.periodTo) { setGenError('Please enter a valid billing period.'); return; }
    if (isNaN(usage) || usage <= 0) { setGenError('Please enter a positive usage amount.'); return; }
    addBill(generateBill(customer, product, genForm.periodFrom, genForm.periodTo, usage));
    setGenForm(EMPTY_GEN_FORM); setShowGenModal(false); forceUpdate((n) => n + 1);
  }

  function closeGenModal() { setShowGenModal(false); setGenForm(EMPTY_GEN_FORM); setGenError(''); }

  const kpis = [
    { label: 'Total Bills',         value: String(allBills.length),           sub: 'all time',            color: 'var(--text-primary)' },
    { label: 'Total Outstanding',   value: formatCurrency(totalOutstanding),   sub: 'unpaid balance',      color: totalOutstanding > 0.01 ? 'var(--color-danger-text)' : 'var(--color-success-text)' },
    { label: 'Overdue',             value: String(overdueCount),               sub: 'bills overdue',       color: overdueCount > 0 ? 'var(--color-danger-text)' : 'var(--text-primary)' },
    { label: 'Collected MTD',       value: formatCurrency(collectedMTD),       sub: 'payments this month', color: 'var(--color-success-text)' },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Billing</h2>
        <Button size="sm" onClick={() => setShowGenModal(true)}><Plus size={14} /> Generate Bill</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, color }) => (
          <Card key={label}>
            <p style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</p>
            <p style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color }}>{value}</p>
            <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</p>
          </Card>
        ))}
      </div>

      <div className="filter-row">
        <span className="filter-label">Status:</span>
        {BILL_STATUSES.map((s) => (
          <button key={s} onClick={() => toggleStatus(s)} className={`filter-chip ${filterStatus.includes(s) ? 'active' : ''}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <Card padding={false}>
        {filteredBills.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No bills match the selected filters.{' '}
            <button className="table-link" onClick={() => setShowGenModal(true)}>Generate a bill</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th><th>Customer</th><th>Period</th>
                <th className="text-right">Usage</th><th className="text-right">Amount Due</th>
                <th className="text-right">Paid</th><th>Status</th><th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => {
                const customer    = getCustomerById(bill.customerId);
                const outstanding = bill.amountDue - bill.amountPaid;
                return (
                  <tr key={bill.id}>
                    <td className="cell-primary cell-mono">
                      <Link href={`/billing/${bill.id}`} className="table-link flex items-center gap-1.5">
                        <Receipt size={13} className="shrink-0" />{bill.reference}
                      </Link>
                    </td>
                    <td>
                      {customer ? (
                        <Link href={`/customers/${customer.id}`} className="table-link">{customer.name}</Link>
                      ) : (
                        <span className="text-xs cell-mono" style={{ color: 'var(--text-tertiary)' }}>{bill.customerId}</span>
                      )}
                    </td>
                    <td className="text-xs">{formatDate(bill.periodFrom)} – {formatDate(bill.periodTo)}</td>
                    <td className="text-right cell-mono">{formatUsage(bill.usageKwh)}</td>
                    <td className="text-right cell-mono cell-primary font-medium">{formatCurrency(bill.amountDue)}</td>
                    <td className="text-right cell-mono font-medium" style={{ color: outstanding > 0.01 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>{formatCurrency(bill.amountPaid)}</td>
                    <td><Badge variant={bill.status} /></td>
                    <td>{formatDate(bill.dueDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showGenModal} onClose={closeGenModal} title="Generate Bill" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="field-label">Customer <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select className="field-input" value={genForm.customerId} onChange={(e) => setGenForm({ ...genForm, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {allCustomers.map((c) => <option key={c.id} value={c.id}>{c.accountRef} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Product <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select className="field-input" value={genForm.productId} onChange={(e) => setGenForm({ ...genForm, productId: e.target.value })}>
              <option value="">Select product…</option>
              {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Period from</label>
              <input type="date" className="field-input" value={genForm.periodFrom} onChange={(e) => setGenForm({ ...genForm, periodFrom: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Period to</label>
              <input type="date" className="field-input" value={genForm.periodTo} onChange={(e) => setGenForm({ ...genForm, periodTo: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Usage (kWh) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="number" className="field-input" value={genForm.usageKwh} onChange={(e) => setGenForm({ ...genForm, usageKwh: e.target.value })} placeholder="e.g. 300" min={0} />
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>Typical monthly residential: ~290 kWh</p>
          </div>
          {genError && <p className="rounded-md px-3 py-2 text-xs" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>{genError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={closeGenModal}>Cancel</Button>
            <Button size="sm" onClick={handleGenerate} disabled={!genForm.customerId || !genForm.productId || !genForm.usageKwh}>Generate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
