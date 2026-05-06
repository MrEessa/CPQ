'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getCustomerById } from '@/lib/data/customers';
import {
  getDebtAccountByCustomerId,
  getPaymentPlans,
  createPaymentPlan,
  recordInstalment,
  breachPlan,
  advanceCollectionStage,
  setVulnerabilityFlags,
} from '@/lib/data/debt';
import { getBillsForCustomer } from '@/lib/data/bills';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  CollectionStage,
  InstalmentFrequency,
  VulnerabilityFlag,
} from '@/lib/types';
import { isValidStageAdvance } from '@/lib/debt-engine';

const STAGE_ORDER: CollectionStage[] = [
  'monitoring',
  'contact_attempted',
  'formal_notice',
  'field_visit',
  'legal',
];

const STAGE_LABELS: Record<CollectionStage, string> = {
  monitoring: 'Monitoring',
  contact_attempted: 'Contact Attempted',
  formal_notice: 'Formal Notice',
  field_visit: 'Field Visit',
  legal: 'Legal',
};

const ALL_VULNERABILITY_FLAGS: VulnerabilityFlag[] = [
  'financial_difficulty',
  'health_condition',
  'elderly',
  'young_children',
  'mental_health',
  'life_support',
];

function fmtFlag(f: VulnerabilityFlag): string {
  return f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtFrequency(f: InstalmentFrequency): string {
  return f.charAt(0).toUpperCase() + f.slice(1);
}

interface CreatePlanForm {
  instalmentAmount: string;
  frequency: InstalmentFrequency;
  startDate: string;
}

interface Props {
  params: { customerId: string };
}

export default function DebtDetailPage({ params }: Props) {
  const { customerId } = params;
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  // ─── data ─────────────────────────────────────────────────────────────────
  const customer = getCustomerById(customerId);
  if (!customer) notFound();

  const debtAccountOrUndef = getDebtAccountByCustomerId(customerId);
  if (!debtAccountOrUndef) notFound();
  // non-null asserted — notFound() throws, so this is always defined below
  const debtAccount = debtAccountOrUndef!;

  const allPlans = getPaymentPlans({ customerId });
  const activePlan = allPlans.find((p) => p.status === 'active');
  const currentPlan = allPlans.find((p) => p.id === debtAccount.paymentPlanId);
  const overdueBills = getBillsForCustomer(customerId).filter((b) => b.status === 'overdue');

  // ─── create plan modal ────────────────────────────────────────────────────
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [planForm, setPlanForm] = useState<CreatePlanForm>({
    instalmentAmount: '',
    frequency: 'monthly',
    startDate: today,
  });
  const [planError, setPlanError] = useState('');

  function openCreatePlan() {
    setPlanForm({ instalmentAmount: '', frequency: 'monthly', startDate: today });
    setPlanError('');
    setShowCreatePlan(true);
  }

  function handleCreatePlan() {
    setPlanError('');
    const amount = parseFloat(planForm.instalmentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPlanError('Please enter a valid instalment amount.');
      return;
    }
    if (amount > debtAccount.currentBalance) {
      setPlanError(`Instalment cannot exceed total arrears (${formatCurrency(debtAccount.currentBalance)}).`);
      return;
    }
    if (!planForm.startDate) {
      setPlanError('Please select a start date.');
      return;
    }
    createPaymentPlan({
      debtAccountId: debtAccount.id,
      customerId,
      totalDebt: debtAccount.currentBalance,
      instalmentAmount: amount,
      frequency: planForm.frequency,
      startDate: planForm.startDate,
    });
    setShowCreatePlan(false);
    refresh();
  }

  // ─── breach plan modal ────────────────────────────────────────────────────
  const [showBreachConfirm, setShowBreachConfirm] = useState(false);

  function handleBreach() {
    if (!currentPlan) return;
    breachPlan(currentPlan.id);
    setShowBreachConfirm(false);
    refresh();
  }

  // ─── stage advance modal ──────────────────────────────────────────────────
  const [showStageModal, setShowStageModal] = useState(false);
  const [targetStage, setTargetStage] = useState<CollectionStage | null>(null);

  const nextStages = STAGE_ORDER.filter((s) =>
    isValidStageAdvance(debtAccount.collectionStage, s),
  );

  function openStageModal() {
    setTargetStage(nextStages[0] ?? null);
    setShowStageModal(true);
  }

  function handleAdvanceStage() {
    if (!targetStage) return;
    advanceCollectionStage(debtAccount.id, targetStage);
    setShowStageModal(false);
    refresh();
  }

  // ─── vulnerability flags ──────────────────────────────────────────────────
  const [vulnFlags, setVulnFlags] = useState<VulnerabilityFlag[]>(
    debtAccount.vulnerabilityFlags,
  );
  const [vulnSaved, setVulnSaved] = useState(false);

  function toggleFlag(flag: VulnerabilityFlag) {
    setVulnFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
    setVulnSaved(false);
  }

  function saveVulnerabilityFlags() {
    setVulnerabilityFlags(debtAccount.id, vulnFlags);
    setVulnSaved(true);
  }

  // Live instalment count preview for create plan form
  const previewAmount = parseFloat(planForm.instalmentAmount);
  const instalmentCount =
    !isNaN(previewAmount) && previewAmount > 0
      ? Math.ceil(debtAccount.currentBalance / previewAmount)
      : null;

  void tick; // consumed by refresh()

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/debt" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
            <span className="text-sm text-gray-400">{customer.accountRef}</span>
            <Badge variant={customer.status} />
            {debtAccount.vulnerabilityFlags.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                <ShieldAlert size={11} />
                Vulnerable
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {customer.supplyAddress.line1}, {customer.supplyAddress.city}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {nextStages.length > 0 && (
            <Button size="sm" variant="danger" onClick={openStageModal}>
              Advance Stage
            </Button>
          )}
        </div>
      </div>

      {/* Vulnerability banner */}
      {debtAccount.vulnerabilityFlags.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <div>
            <strong>Vulnerability flags active:</strong>{' '}
            {debtAccount.vulnerabilityFlags.map(fmtFlag).join(', ')}.
            Ofgem protections apply — do not disconnect or escalate to field visit without completing
            a vulnerability review.
          </div>
        </div>
      )}

      {/* Debt summary + account info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Arrears Summary</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Original debt</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(debtAccount.debtAmount)}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Current balance</dt>
              <dd className="font-semibold text-red-600">
                {formatCurrency(debtAccount.currentBalance)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Collection stage</dt>
              <dd>
                <Badge variant={debtAccount.collectionStage} />
              </dd>
            </div>
            {debtAccount.lastContactDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Last contact</dt>
                <dd className="text-gray-700">{formatDate(debtAccount.lastContactDate)}</dd>
              </div>
            )}
            {debtAccount.nextActionDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Next action</dt>
                <dd className="text-gray-700">{formatDate(debtAccount.nextActionDate)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Overdue bills</dt>
              <dd className={overdueBills.length > 0 ? 'font-medium text-red-600' : 'text-gray-700'}>
                {overdueBills.length}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Customer type</dt>
              <dd className="font-medium text-gray-900 capitalize">{customer.customerType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Market</dt>
              <dd className="text-gray-700">{customer.market}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Account balance</dt>
              <dd className={`font-medium ${customer.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatCurrency(customer.balance)}
              </dd>
            </div>
            {customer.directDebitAmount && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Direct debit</dt>
                <dd className="text-gray-700">
                  {formatCurrency(customer.directDebitAmount)}/month (day {customer.directDebitDay})
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Debt account opened</dt>
              <dd className="text-gray-700">{formatDate(debtAccount.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <Link
              href={`/customers/${customer.id}`}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View full customer record →
            </Link>
          </div>
        </Card>
      </div>

      {/* Overdue Bills */}
      {overdueBills.length > 0 && (
        <Card padding={false}>
          <CardHeader className="px-5 pt-4 pb-3">
            <CardTitle>Overdue Bills ({overdueBills.length})</CardTitle>
          </CardHeader>
          <table className="w-full text-sm">
            <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Reference</th>
                <th className="px-5 py-2.5 text-left">Period</th>
                <th className="px-5 py-2.5 text-right">Amount Due</th>
                <th className="px-5 py-2.5 text-right">Amount Paid</th>
                <th className="px-5 py-2.5 text-left">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {overdueBills.map((bill, i) => (
                <tr
                  key={bill.id}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/billing/${bill.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {bill.reference}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(bill.periodFrom)} – {formatDate(bill.periodTo)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-red-600">
                    {formatCurrency(bill.amountDue)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500">
                    {formatCurrency(bill.amountPaid)}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(bill.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Notes */}
      {debtAccount.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Case Notes</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-700">{debtAccount.notes}</p>
        </Card>
      )}

      {/* Payment Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plan</CardTitle>
          {!activePlan && currentPlan?.status !== 'active' && (
            <Button size="sm" onClick={openCreatePlan}>
              Create Plan
            </Button>
          )}
        </CardHeader>

        {!currentPlan && !activePlan ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
            No payment plan in place.{' '}
            <button className="text-blue-600 hover:underline" onClick={openCreatePlan}>
              Create one now
            </button>{' '}
            to agree a repayment schedule with the customer.
          </div>
        ) : (
          <>
            {/* Plan header */}
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span className="text-gray-500">Plan ID:</span>
              <span className="font-medium text-gray-900">{currentPlan?.id}</span>
              {currentPlan && <Badge variant={currentPlan.status} />}
              {currentPlan && (
                <span className="ml-auto text-xs text-gray-400">
                  {formatCurrency(currentPlan.instalmentAmount)}/{currentPlan.frequency} ·{' '}
                  {formatDate(currentPlan.startDate)} – {formatDate(currentPlan.endDate)}
                </span>
              )}
            </div>

            {/* Instalment schedule */}
            {currentPlan && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Due Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Paid At</th>
                    {currentPlan.status === 'active' && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {currentPlan.instalments.map((inst, i) => (
                    <tr
                      key={inst.id}
                      className={`border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                    >
                      <td className="px-4 py-2 text-gray-700">{formatDate(inst.dueDate)}</td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {formatCurrency(inst.amount)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            inst.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : inst.status === 'missed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {inst.paidAt ? formatDateTime(inst.paidAt) : '—'}
                      </td>
                      {currentPlan.status === 'active' && (
                        <td className="px-4 py-2 text-right">
                          {inst.status === 'pending' && (
                            <button
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => {
                                recordInstalment(currentPlan.id, inst.id);
                                refresh();
                              }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Actions for active plan */}
            {currentPlan?.status === 'active' && (
              <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowBreachConfirm(true)}
                >
                  Mark Plan Breached
                </Button>
              </div>
            )}

            {/* Breached plan — offer new plan */}
            {currentPlan?.status === 'breached' && (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-medium">Plan breached.</p>
                <p className="mt-0.5 text-xs">
                  The customer missed scheduled payments and the plan was breached. Review the
                  account and consider agreeing a new repayment schedule.
                </p>
                <Button size="sm" className="mt-2" onClick={openCreatePlan}>
                  Create New Plan
                </Button>
              </div>
            )}

            {/* Cancelled plan */}
            {currentPlan?.status === 'cancelled' && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                This plan was cancelled.{' '}
                <button className="text-blue-600 hover:underline" onClick={openCreatePlan}>
                  Create a new plan
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Vulnerability Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Flags</CardTitle>
        </CardHeader>
        <p className="mb-3 text-xs text-gray-500">
          Toggle flags to reflect the customer&apos;s circumstances. Flagged accounts receive
          additional Ofgem protections and cannot be disconnected without a welfare check.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_VULNERABILITY_FLAGS.map((flag) => (
            <label
              key={flag}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={vulnFlags.includes(flag)}
                onChange={() => toggleFlag(flag)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={vulnFlags.includes(flag) ? 'font-medium text-orange-700' : 'text-gray-700'}>
                {fmtFlag(flag)}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
          <Button size="sm" onClick={saveVulnerabilityFlags}>
            Save Flags
          </Button>
          {vulnSaved && (
            <span className="text-xs text-green-700">✓ Vulnerability flags updated.</span>
          )}
        </div>
      </Card>

      {/* Collection Stage timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Workflow</CardTitle>
          {nextStages.length > 0 && (
            <Button size="sm" variant="danger" onClick={openStageModal}>
              Advance Stage
            </Button>
          )}
        </CardHeader>
        <ol className="flex items-center gap-0">
          {STAGE_ORDER.map((stage, idx) => {
            const currentIdx = STAGE_ORDER.indexOf(debtAccount.collectionStage);
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <li key={stage} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent
                        ? 'bg-red-600 text-white ring-2 ring-red-200'
                        : isPast
                          ? 'bg-gray-400 text-white'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`mt-1 text-center text-xs ${
                      isCurrent
                        ? 'font-semibold text-red-700'
                        : isPast
                          ? 'text-gray-500'
                          : 'text-gray-300'
                    }`}
                    style={{ maxWidth: 72 }}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 ${isPast || isCurrent ? 'bg-gray-300' : 'bg-gray-100'}`}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {nextStages.length === 0 && (
          <p className="mt-4 text-xs text-gray-400">
            Account is at the highest collection stage (Legal). No further automated advances
            available.
          </p>
        )}
      </Card>

      {/* Create Payment Plan Modal */}
      <Modal
        open={showCreatePlan}
        onClose={() => setShowCreatePlan(false)}
        title="Create Payment Plan"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Total arrears to clear: </span>
            <span className="font-semibold text-red-700">
              {formatCurrency(debtAccount.currentBalance)}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Instalment amount (£) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={planForm.instalmentAmount}
              onChange={(e) => setPlanForm({ ...planForm, instalmentAmount: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 50.00"
              min={0.01}
              step={0.01}
            />
            {instalmentCount !== null && (
              <p className="mt-0.5 text-xs text-gray-400">
                ≈ {instalmentCount} instalment{instalmentCount !== 1 ? 's' : ''} to clear debt
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Frequency</label>
            <select
              value={planForm.frequency}
              onChange={(e) =>
                setPlanForm({ ...planForm, frequency: e.target.value as InstalmentFrequency })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(['weekly', 'fortnightly', 'monthly'] as InstalmentFrequency[]).map((f) => (
                <option key={f} value={f}>
                  {fmtFrequency(f)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">First instalment date</label>
            <input
              type="date"
              value={planForm.startDate}
              onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {planError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{planError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowCreatePlan(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePlan}
              disabled={!planForm.instalmentAmount || !planForm.startDate}
            >
              Create Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Breach Confirmation Modal */}
      <Modal
        open={showBreachConfirm}
        onClose={() => setShowBreachConfirm(false)}
        title="Mark Plan as Breached"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Mark plan <strong>{currentPlan?.id}</strong> as breached? This indicates the customer
            has failed to meet the agreed repayment schedule.
          </p>
          <p className="text-xs text-gray-500">
            You can create a new plan after breach if the customer agrees revised terms.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowBreachConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleBreach}>
              Confirm Breach
            </Button>
          </div>
        </div>
      </Modal>

      {/* Advance Stage Modal */}
      <Modal
        open={showStageModal}
        onClose={() => setShowStageModal(false)}
        title="Advance Collection Stage"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <div>
              <span className="text-gray-500">Current stage: </span>
              <Badge variant={debtAccount.collectionStage} />
            </div>
            <span className="text-gray-400">→</span>
            <div>
              <span className="text-gray-500">New stage: </span>
              {targetStage && <Badge variant={targetStage} />}
            </div>
          </div>

          {nextStages.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Select stage</label>
              <select
                value={targetStage ?? ''}
                onChange={(e) => setTargetStage(e.target.value as CollectionStage)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {nextStages.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {debtAccount.vulnerabilityFlags.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
              <ShieldAlert size={13} className="mt-0.5 shrink-0" />
              <span>
                This account has active vulnerability flags. Confirm that a welfare check has been
                completed before escalating.
              </span>
            </div>
          )}

          <p className="text-xs text-gray-500">
            This action will be logged in the audit trail and cannot be reversed automatically.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowStageModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleAdvanceStage}
              disabled={!targetStage}
            >
              Advance Stage
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
