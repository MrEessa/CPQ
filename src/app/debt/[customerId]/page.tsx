'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getCustomerById } from '@/lib/data/customers';
import { getDebtAccountByCustomerId, getPaymentPlans, createPaymentPlan, recordInstalment, breachPlan, advanceCollectionStage, setVulnerabilityFlags } from '@/lib/data/debt';
import { getBillsForCustomer } from '@/lib/data/bills';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { CollectionStage, InstalmentFrequency, VulnerabilityFlag } from '@/lib/types';
import { isValidStageAdvance } from '@/lib/debt-engine';

const STAGE_ORDER: CollectionStage[] = ['monitoring', 'contact_attempted', 'formal_notice', 'field_visit', 'legal'];
const STAGE_LABELS: Record<CollectionStage, string> = { monitoring: 'Monitoring', contact_attempted: 'Contact Attempted', formal_notice: 'Formal Notice', field_visit: 'Field Visit', legal: 'Legal' };
const ALL_VULNERABILITY_FLAGS: VulnerabilityFlag[] = ['financial_difficulty', 'health_condition', 'elderly', 'young_children', 'mental_health', 'life_support'];

function fmtFlag(f: VulnerabilityFlag): string { return f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function fmtFrequency(f: InstalmentFrequency): string { return f.charAt(0).toUpperCase() + f.slice(1); }

interface CreatePlanForm { instalmentAmount: string; frequency: InstalmentFrequency; startDate: string; }

export default function DebtDetailPage({ params }: { params: { customerId: string } }) {
  const { customerId } = params;
  const [tick, setTick]     = useState(0);
  const refresh             = () => setTick((n) => n + 1);
  void tick;

  const customer = getCustomerById(customerId);
  if (!customer) notFound();
  const debtAccountOrUndef = getDebtAccountByCustomerId(customerId);
  if (!debtAccountOrUndef) notFound();
  const debtAccount = debtAccountOrUndef!;

  const allPlans   = getPaymentPlans({ customerId });
  const activePlan = allPlans.find((p) => p.status === 'active');
  const currentPlan = allPlans.find((p) => p.id === debtAccount.paymentPlanId);
  const overdueBills = getBillsForCustomer(customerId).filter((b) => b.status === 'overdue');

  // Create plan modal
  const today = new Date().toISOString().split('T')[0];
  const [showCreatePlan, setShowCreatePlan]   = useState(false);
  const [planForm, setPlanForm]               = useState<CreatePlanForm>({ instalmentAmount: '', frequency: 'monthly', startDate: today });
  const [planError, setPlanError]             = useState('');
  const [showBreachConfirm, setShowBreachConfirm] = useState(false);
  const [showStageModal, setShowStageModal]   = useState(false);
  const [targetStage, setTargetStage]         = useState<CollectionStage | null>(null);
  const [vulnFlags, setVulnFlags]             = useState<VulnerabilityFlag[]>(debtAccount.vulnerabilityFlags);
  const [vulnSaved, setVulnSaved]             = useState(false);

  const nextStages     = STAGE_ORDER.filter((s) => isValidStageAdvance(debtAccount.collectionStage, s));
  const previewAmount  = parseFloat(planForm.instalmentAmount);
  const instalmentCount = !isNaN(previewAmount) && previewAmount > 0 ? Math.ceil(debtAccount.currentBalance / previewAmount) : null;

  function openCreatePlan() { setPlanForm({ instalmentAmount: '', frequency: 'monthly', startDate: today }); setPlanError(''); setShowCreatePlan(true); }

  function handleCreatePlan() {
    setPlanError('');
    const amount = parseFloat(planForm.instalmentAmount);
    if (isNaN(amount) || amount <= 0) { setPlanError('Please enter a valid instalment amount.'); return; }
    if (amount > debtAccount.currentBalance) { setPlanError(`Instalment cannot exceed total arrears (${formatCurrency(debtAccount.currentBalance)}).`); return; }
    if (!planForm.startDate) { setPlanError('Please select a start date.'); return; }
    createPaymentPlan({ debtAccountId: debtAccount.id, customerId, totalDebt: debtAccount.currentBalance, instalmentAmount: amount, frequency: planForm.frequency, startDate: planForm.startDate });
    setShowCreatePlan(false); refresh();
  }

  function handleBreach() { if (!currentPlan) return; breachPlan(currentPlan.id); setShowBreachConfirm(false); refresh(); }
  function openStageModal() { setTargetStage(nextStages[0] ?? null); setShowStageModal(true); }
  function handleAdvanceStage() { if (!targetStage) return; advanceCollectionStage(debtAccount.id, targetStage); setShowStageModal(false); refresh(); }
  function toggleFlag(flag: VulnerabilityFlag) { setVulnFlags((prev) => prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]); setVulnSaved(false); }
  function saveVulnerabilityFlags() { setVulnerabilityFlags(debtAccount.id, vulnFlags); setVulnSaved(true); }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/debt" style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
        ><ArrowLeft size={16} /></Link>
        <div>
          <div className="flex items-center gap-2">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{customer.name}</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{customer.accountRef}</span>
            <Badge variant={customer.status} />
            {debtAccount.vulnerabilityFlags.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>
                <ShieldAlert size={11} /> Vulnerable
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{customer.supplyAddress.line1}, {customer.supplyAddress.city}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {nextStages.length > 0 && <Button size="sm" variant="danger" onClick={openStageModal}>Advance Stage</Button>}
        </div>
      </div>

      {/* Vulnerability banner */}
      {debtAccount.vulnerabilityFlags.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid var(--color-warning)', background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <div>
            <strong>Vulnerability flags active:</strong>{' '}
            {debtAccount.vulnerabilityFlags.map(fmtFlag).join(', ')}.
            Ofgem protections apply — do not disconnect or escalate to field visit without completing a vulnerability review.
          </div>
        </div>
      )}

      {/* Debt summary + account info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Arrears Summary</CardTitle></CardHeader>
          <dl className="space-y-2 text-sm">
            {[
              ['Original debt', formatCurrency(debtAccount.debtAmount)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                <dd className="font-medium cell-mono" style={{ color: 'var(--text-primary)' }}>{val}</dd>
              </div>
            ))}
            <div className="flex justify-between pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)' }}>Current balance</dt>
              <dd className="font-semibold cell-mono" style={{ color: 'var(--color-danger-text)' }}>{formatCurrency(debtAccount.currentBalance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>Collection stage</dt>
              <dd><Badge variant={debtAccount.collectionStage} /></dd>
            </div>
            {debtAccount.lastContactDate && (
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Last contact</dt>
                <dd style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(debtAccount.lastContactDate)}</dd>
              </div>
            )}
            {debtAccount.nextActionDate && (
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Next action</dt>
                <dd style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(debtAccount.nextActionDate)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>Overdue bills</dt>
              <dd className="font-medium cell-mono" style={{ color: overdueBills.length > 0 ? 'var(--color-danger-text)' : 'var(--text-primary)' }}>{overdueBills.length}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
          <dl className="space-y-2 text-sm">
            {[
              ['Customer type', customer.customerType],
              ['Market', customer.market],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                <dd className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{val}</dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>Account balance</dt>
              <dd className="font-medium cell-mono" style={{ color: customer.balance < 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>{formatCurrency(customer.balance)}</dd>
            </div>
            {customer.directDebitAmount && (
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Direct debit</dt>
                <dd style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatCurrency(customer.directDebitAmount)}/month (day {customer.directDebitDay})</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>Debt account opened</dt>
              <dd style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(debtAccount.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Link href={`/customers/${customer.id}`} className="table-link text-xs">View full customer record →</Link>
          </div>
        </Card>
      </div>

      {/* Overdue Bills */}
      {overdueBills.length > 0 && (
        <Card padding={false}>
          <CardHeader className="px-5 pt-4 pb-3"><CardTitle>Overdue Bills ({overdueBills.length})</CardTitle></CardHeader>
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Period</th><th className="text-right">Amount Due</th><th className="text-right">Amount Paid</th><th>Due Date</th></tr></thead>
            <tbody>
              {overdueBills.map((bill) => (
                <tr key={bill.id}>
                  <td className="cell-primary cell-mono"><Link href={`/billing/${bill.id}`} className="table-link">{bill.reference}</Link></td>
                  <td className="text-xs">{formatDate(bill.periodFrom)} – {formatDate(bill.periodTo)}</td>
                  <td className="text-right cell-mono font-medium" style={{ color: 'var(--color-danger-text)' }}>{formatCurrency(bill.amountDue)}</td>
                  <td className="text-right cell-mono">{formatCurrency(bill.amountPaid)}</td>
                  <td>{formatDate(bill.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Case Notes */}
      {debtAccount.notes && (
        <Card>
          <CardHeader><CardTitle>Case Notes</CardTitle></CardHeader>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{debtAccount.notes}</p>
        </Card>
      )}

      {/* Payment Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plan</CardTitle>
          {!activePlan && currentPlan?.status !== 'active' && <Button size="sm" onClick={openCreatePlan}>Create Plan</Button>}
        </CardHeader>

        {!currentPlan && !activePlan ? (
          <div className="rounded-lg py-6 text-center text-sm" style={{ border: `1px dashed var(--border-default)`, color: 'var(--text-tertiary)' }}>
            No payment plan in place.{' '}
            <button className="table-link" onClick={openCreatePlan}>Create one now</button>{' '}
            to agree a repayment schedule with the customer.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Plan ID:</span>
              <span className="font-medium cell-mono" style={{ color: 'var(--text-primary)' }}>{currentPlan?.id}</span>
              {currentPlan && <Badge variant={currentPlan.status} />}
              {currentPlan && <span className="ml-auto text-xs cell-mono" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(currentPlan.instalmentAmount)}/{currentPlan.frequency} · {formatDate(currentPlan.startDate)} – {formatDate(currentPlan.endDate)}</span>}
            </div>

            {currentPlan && (
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--bg-subtle)' }}>
                  <tr>
                    {['Due Date', 'Amount', 'Status', 'Paid At', ...(currentPlan.status === 'active' ? [''] : [])].map((h) => (
                      <th key={h} className={`px-4 py-2 text-left`} style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentPlan.instalments.map((inst) => (
                    <tr key={inst.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>{formatDate(inst.dueDate)}</td>
                      <td className="px-4 py-2 cell-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(inst.amount)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={
                          inst.status === 'paid'   ? { background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' } :
                          inst.status === 'missed' ? { background: 'var(--color-danger-subtle)',  color: 'var(--color-danger-text)' } :
                          { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                        }>{inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}</span>
                      </td>
                      <td className="px-4 py-2 text-xs cell-mono" style={{ color: 'var(--text-tertiary)' }}>{inst.paidAt ? formatDateTime(inst.paidAt) : '—'}</td>
                      {currentPlan.status === 'active' && (
                        <td className="px-4 py-2 text-right">
                          {inst.status === 'pending' && (
                            <button className="text-xs table-link" onClick={() => { recordInstalment(currentPlan.id, inst.id); refresh(); }}>Mark Paid</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {currentPlan?.status === 'active' && (
              <div className="mt-3 flex justify-end pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <Button size="sm" variant="danger" onClick={() => setShowBreachConfirm(true)}>Mark Plan Breached</Button>
              </div>
            )}

            {currentPlan?.status === 'breached' && (
              <div className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>
                <p className="font-medium">Plan breached.</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--color-danger-text)', opacity: 0.85 }}>The customer missed scheduled payments. Review the account and consider agreeing a new repayment schedule.</p>
                <Button size="sm" className="mt-2" onClick={openCreatePlan}>Create New Plan</Button>
              </div>
            )}

            {currentPlan?.status === 'cancelled' && (
              <div className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                This plan was cancelled.{' '}
                <button className="table-link" onClick={openCreatePlan}>Create a new plan</button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Vulnerability Flags */}
      <Card>
        <CardHeader><CardTitle>Vulnerability Flags</CardTitle></CardHeader>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>Toggle flags to reflect the customer&apos;s circumstances. Flagged accounts receive additional Ofgem protections and cannot be disconnected without a welfare check.</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_VULNERABILITY_FLAGS.map((flag) => (
            <label key={flag} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors" style={{ border: '1px solid var(--border-default)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <input type="checkbox" checked={vulnFlags.includes(flag)} onChange={() => toggleFlag(flag)} className="h-3.5 w-3.5 rounded" />
              <span style={{ fontWeight: vulnFlags.includes(flag) ? 500 : 400, color: vulnFlags.includes(flag) ? 'var(--color-warning-text)' : 'var(--text-primary)' }}>{fmtFlag(flag)}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Button size="sm" onClick={saveVulnerabilityFlags}>Save Flags</Button>
          {vulnSaved && <span className="text-xs" style={{ color: 'var(--color-success-text)' }}>✓ Vulnerability flags updated.</span>}
        </div>
      </Card>

      {/* Collection Stage timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Workflow</CardTitle>
          {nextStages.length > 0 && <Button size="sm" variant="danger" onClick={openStageModal}>Advance Stage</Button>}
        </CardHeader>
        <ol className="flex items-center gap-0">
          {STAGE_ORDER.map((stage, idx) => {
            const currentIdx = STAGE_ORDER.indexOf(debtAccount.collectionStage);
            const isPast     = idx < currentIdx;
            const isCurrent  = idx === currentIdx;
            return (
              <li key={stage} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: isCurrent ? 'var(--color-danger)' : isPast ? 'var(--text-tertiary)' : 'var(--bg-elevated)', color: (isCurrent || isPast) ? '#fff' : 'var(--text-tertiary)', boxShadow: isCurrent ? `0 0 0 3px var(--color-danger-subtle)` : 'none' }}>
                    {idx + 1}
                  </div>
                  <span className="mt-1 text-center text-xs" style={{ maxWidth: 72, color: isCurrent ? 'var(--color-danger-text)' : isPast ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontWeight: isCurrent ? 600 : 400 }}>
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div className="mx-1 h-0.5 flex-1" style={{ background: (isPast || isCurrent) ? 'var(--border-strong)' : 'var(--border-subtle)' }} />
                )}
              </li>
            );
          })}
        </ol>
        {nextStages.length === 0 && <p className="mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>Account is at the highest collection stage (Legal). No further automated advances available.</p>}
      </Card>

      {/* Create Payment Plan Modal */}
      <Modal open={showCreatePlan} onClose={() => setShowCreatePlan(false)} title="Create Payment Plan" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total arrears to clear: </span>
            <span className="font-semibold cell-mono" style={{ color: 'var(--color-danger-text)' }}>{formatCurrency(debtAccount.currentBalance)}</span>
          </div>
          <div>
            <label className="field-label">Instalment amount (£) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="number" className="field-input" value={planForm.instalmentAmount} onChange={(e) => setPlanForm({ ...planForm, instalmentAmount: e.target.value })} placeholder="e.g. 50.00" min={0.01} step={0.01} />
            {instalmentCount !== null && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>≈ {instalmentCount} instalment{instalmentCount !== 1 ? 's' : ''} to clear debt</p>}
          </div>
          <div>
            <label className="field-label">Frequency</label>
            <select className="field-input" value={planForm.frequency} onChange={(e) => setPlanForm({ ...planForm, frequency: e.target.value as InstalmentFrequency })}>
              {(['weekly', 'fortnightly', 'monthly'] as InstalmentFrequency[]).map((f) => <option key={f} value={f}>{fmtFrequency(f)}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">First instalment date</label>
            <input type="date" className="field-input" value={planForm.startDate} onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })} />
          </div>
          {planError && <p className="rounded-md px-3 py-2 text-xs" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>{planError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowCreatePlan(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreatePlan} disabled={!planForm.instalmentAmount || !planForm.startDate}>Create Plan</Button>
          </div>
        </div>
      </Modal>

      {/* Breach Confirmation Modal */}
      <Modal open={showBreachConfirm} onClose={() => setShowBreachConfirm(false)} title="Mark Plan as Breached" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Mark plan <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentPlan?.id}</strong> as breached? This indicates the customer has failed to meet the agreed repayment schedule.</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>You can create a new plan after breach if the customer agrees revised terms.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowBreachConfirm(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleBreach}>Confirm Breach</Button>
          </div>
        </div>
      </Modal>

      {/* Advance Stage Modal */}
      <Modal open={showStageModal} onClose={() => setShowStageModal(false)} title="Advance Collection Stage" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <div><span style={{ color: 'var(--text-secondary)' }}>Current: </span><Badge variant={debtAccount.collectionStage} /></div>
            <span style={{ color: 'var(--text-tertiary)' }}>→</span>
            <div><span style={{ color: 'var(--text-secondary)' }}>New: </span>{targetStage && <Badge variant={targetStage} />}</div>
          </div>
          {nextStages.length > 1 && (
            <div>
              <label className="field-label">Select stage</label>
              <select className="field-input" value={targetStage ?? ''} onChange={(e) => setTargetStage(e.target.value as CollectionStage)}>
                {nextStages.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
          )}
          {debtAccount.vulnerabilityFlags.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ border: '1px solid var(--color-warning)', background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>
              <ShieldAlert size={13} className="mt-0.5 shrink-0" />
              <span>This account has active vulnerability flags. Confirm that a welfare check has been completed before escalating.</span>
            </div>
          )}
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>This action will be logged in the audit trail and cannot be reversed automatically.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowStageModal(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleAdvanceStage} disabled={!targetStage}>Advance Stage</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
