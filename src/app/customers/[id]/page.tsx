'use client';

import { useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, CreditCard, ClipboardList, MessageSquare, FileText, StickyNote, AlertCircle, ShieldCheck, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import { getCustomerById, updateCustomer } from '@/lib/data/customers';
import { getQuotesForCustomer } from '@/lib/data/quotes';
import { getBillsForCustomer } from '@/lib/data/bills';
import { getCommunicationsForCustomer, addCommunication } from '@/lib/data/communications';
import { getTasksForCustomer, addTask } from '@/lib/data/tasks';
import { getProducts } from '@/lib/data/products';
import { checkEligibility } from '@/lib/quote-engine';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatDateTime, formatUsage, describeRule } from '@/lib/utils';
import { CustomerStatus, CommunicationChannel, TaskPriority, CustomerType, QuoteStatus } from '@/lib/types';

const MARKET_CURRENCY: Record<string, string> = { GB: 'GBP', IE: 'EUR' };

type Tab = 'overview' | 'billing' | 'communications' | 'tasks' | 'quotes' | 'documents' | 'notes';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',        label: 'Overview',        icon: MapPin },
  { id: 'billing',         label: 'Billing',          icon: CreditCard },
  { id: 'communications',  label: 'Communications',   icon: MessageSquare },
  { id: 'tasks',           label: 'Tasks',            icon: ClipboardList },
  { id: 'quotes',          label: 'Quotes',           icon: Receipt },
  { id: 'documents',       label: 'Documents',        icon: FileText },
  { id: 'notes',           label: 'Notes',            icon: StickyNote },
];

const CUSTOMER_STATUSES: CustomerStatus[] = ['active', 'pending', 'suspended', 'closed'];
const VALID_TABS: Tab[] = ['overview', 'billing', 'communications', 'tasks', 'quotes', 'documents', 'notes'];

function fmtType(t: CustomerType): string {
  if (t === 'ic') return 'I&C';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

interface CommForm { channel: CommunicationChannel; direction: 'inbound' | 'outbound'; subject: string; body: string; }
interface TaskForm { title: string; description: string; priority: TaskPriority; assignedTo: string; dueDate: string; }

const EMPTY_COMM: CommForm = { channel: 'email', direction: 'outbound', subject: '', body: '' };
const EMPTY_TASK: TaskForm = { title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' };

// DL row helper
function DLRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
      <dd className="font-medium text-right" style={{ color: 'var(--text-primary)', fontFamily: typeof value === 'string' ? 'var(--font-mono)' : undefined, fontSize: '0.8rem' }}>{value}</dd>
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const searchParams   = useSearchParams();
  const initialTab     = (searchParams.get('tab') ?? 'overview') as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(VALID_TABS.includes(initialTab) ? initialTab : 'overview');
  const [, forceUpdate]           = useState(0);
  const [showCommModal, setShowCommModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [commForm, setCommForm]   = useState<CommForm>(EMPTY_COMM);
  const [taskForm, setTaskForm]   = useState<TaskForm>(EMPTY_TASK);

  const customerOrUndefined = getCustomerById(params.id);
  if (!customerOrUndefined) notFound();
  const customer = customerOrUndefined;

  const bills = getBillsForCustomer(customer.id);
  const comms = getCommunicationsForCustomer(customer.id);
  const tasks = getTasksForCustomer(customer.id);
  const quotes = getQuotesForCustomer(customer.id);

  function handleStatusChange(newStatus: CustomerStatus) { updateCustomer(customer.id, { status: newStatus }); forceUpdate((n) => n + 1); }

  function handleSendComm() {
    if (!commForm.subject.trim()) return;
    addCommunication({ customerId: customer.id, channel: commForm.channel, direction: commForm.direction, subject: commForm.subject.trim(), body: commForm.body, sentAt: new Date().toISOString(), status: 'sent' });
    setCommForm(EMPTY_COMM); setShowCommModal(false); forceUpdate((n) => n + 1);
  }

  function handleCreateTask() {
    if (!taskForm.title.trim()) return;
    addTask({ customerId: customer.id, title: taskForm.title.trim(), description: taskForm.description || undefined, priority: taskForm.priority, assignedTo: taskForm.assignedTo || undefined, dueDate: taskForm.dueDate || undefined });
    setTaskForm(EMPTY_TASK); setShowTaskModal(false); forceUpdate((n) => n + 1);
  }

  const openTasks       = tasks.filter((t) => t.status !== 'closed').length;
  const unpaidBillTotal = bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + (b.amountDue - b.amountPaid), 0);
  const currency = MARKET_CURRENCY[customer.market] ?? 'GBP';
  const activeProducts = getProducts({ status: ['active'], market: customer.market });
  const eligibilityChecks = activeProducts.map((p) => ({ product: p, result: checkEligibility(p, customer) }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
          ><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{customer.name}</h2>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{customer.accountRef}</span>
              <Badge variant={customer.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtType(customer.customerType)} · {customer.market} · {customer.meterType} meter</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Status:</span>
          <select value={customer.status} onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)} className="field-input" style={{ width: 'auto', padding: '3px 8px' }}>
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-5">
        {/* Left: tabs */}
        <div className="min-w-0 flex-1">
          <div className="tab-bar">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} className={`tab-btn flex items-center gap-1.5 ${activeTab === id ? 'active' : ''}`}>
                <Icon size={13} />{label}
                {id === 'tasks' && openTasks > 0 && (
                  <span className="ml-0.5 rounded-full px-1.5 text-xs font-semibold" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' }}>{openTasks}</span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-4">
            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => setShowEligibilityModal(true)}>
                  <ShieldCheck size={13} /> Check product eligibility
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Supply Address', addr: customer.supplyAddress },
                  { title: 'Billing Address', addr: customer.billingAddress },
                ].map(({ title, addr }) => (
                  <Card key={title}>
                    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                    <div className="space-y-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <p>{addr.line1}</p>{addr.line2 && <p>{addr.line2}</p>}
                      <p>{addr.city}</p><p style={{ fontFamily: 'var(--font-mono)' }}>{addr.postcode}</p>
                      <p style={{ color: 'var(--text-tertiary)' }}>{addr.countryCode}</p>
                    </div>
                  </Card>
                ))}
                <Card>
                  <CardHeader><CardTitle>Meter Details</CardTitle></CardHeader>
                  <dl className="space-y-2 text-sm">
                    <DLRow label="Meter type" value={customer.meterType} />
                    {customer.mpan && <DLRow label="MPAN" value={customer.mpan} />}
                    {customer.mprn && <DLRow label="MPRN" value={customer.mprn} />}
                    <DLRow label="Annual usage" value={formatUsage(customer.annualUsageKwh)} />
                  </dl>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Contract</CardTitle></CardHeader>
                  <dl className="space-y-2 text-sm">
                    <DLRow label="Supply start" value={formatDate(customer.supplyStartDate)} />
                    {customer.contractEndDate && <DLRow label="Contract end" value={formatDate(customer.contractEndDate)} />}
                    <DLRow label="Products on supply" value={String(customer.currentProducts.length)} />
                    {customer.directDebitAmount !== undefined && (
                      <DLRow label="Direct debit" value={`${formatCurrency(customer.directDebitAmount)}/mo (day ${customer.directDebitDay ?? '—'})`} />
                    )}
                  </dl>
                </Card>
              </div>
              </div>
            )}

            {/* Billing tab */}
            {activeTab === 'billing' && (
              <Card padding={false}>
                {bills.length === 0 ? (
                  <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No bills found for this customer.</div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Reference</th><th>Period</th><th className="text-right">Usage</th><th className="text-right">Amount Due</th><th>Status</th><th>Due Date</th></tr></thead>
                    <tbody>
                      {bills.map((b) => (
                        <tr key={b.id}>
                          <td className="cell-primary cell-mono"><Link href={`/billing/${b.id}`} className="table-link">{b.reference}</Link></td>
                          <td className="text-xs">{formatDate(b.periodFrom)} – {formatDate(b.periodTo)}</td>
                          <td className="text-right cell-mono">{b.usageKwh.toLocaleString()} kWh</td>
                          <td className="text-right cell-mono cell-primary font-medium">{formatCurrency(b.amountDue, currency)}</td>
                          <td><Badge variant={b.status} /></td>
                          <td>{formatDate(b.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            )}

            {/* Communications tab */}
            {activeTab === 'communications' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setShowCommModal(true)}><MessageSquare size={13} /> Send Communication</Button>
                </div>
                <Card padding={false}>
                  {comms.length === 0 ? (
                    <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No communications recorded.</div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Subject</th><th>Channel</th><th>Direction</th><th>Status</th><th>Sent</th></tr></thead>
                      <tbody>
                        {comms.map((c) => (
                          <tr key={c.id}>
                            <td className="cell-primary">{c.subject}</td>
                            <td className="capitalize">{c.channel}</td>
                            <td className="capitalize">{c.direction}</td>
                            <td className="capitalize">{c.status}</td>
                            <td className="text-xs cell-mono">{formatDateTime(c.sentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            )}

            {/* Tasks tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setShowTaskModal(true)}><ClipboardList size={13} /> Create Task</Button>
                </div>
                <Card padding={false}>
                  {tasks.length === 0 ? (
                    <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No tasks for this customer.</div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Title</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Due</th></tr></thead>
                      <tbody>
                        {tasks.map((t) => (
                          <tr key={t.id}>
                            <td className="cell-primary">{t.title}</td>
                            <td><Badge variant={t.priority} /></td>
                            <td className="capitalize">{t.status.replace(/_/g, ' ')}</td>
                            <td>{t.assignedTo ?? '—'}</td>
                            <td>{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Link href={`/quotes/new?customerId=${customer.id}`}>
                    <Button size="sm"><Receipt size={13} /> New Quote</Button>
                  </Link>
                </div>
                <Card padding={false}>
                  {quotes.length === 0 ? (
                    <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No quotes for this customer.</div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Reference</th><th>Products</th><th className="text-right">Annual Cost (inc VAT)</th><th>Status</th><th>Valid Until</th></tr></thead>
                      <tbody>
                        {quotes.map((q) => (
                          <tr key={q.id}>
                            <td className="cell-primary cell-mono"><Link href={`/quotes/${q.id}`} className="table-link">{q.reference}</Link></td>
                            <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{q.products.map((p) => p.productName).join(', ')}</td>
                            <td className="text-right cell-mono cell-primary font-medium">{formatCurrency(q.totalWithVat, currency)}</td>
                            <td><Badge variant={q.status as QuoteStatus} /></td>
                            <td className="text-xs">{formatDate(q.validUntil)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'documents' && (
              <Card>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <FileText size={32} style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Document storage not yet configured.</p>
                </div>
              </Card>
            )}

            {activeTab === 'notes' && (
              <Card>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <StickyNote size={32} style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No notes recorded for this customer.</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right: quick stats */}
        <div className="sticky top-5 w-64 shrink-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>Account Balance</CardTitle></CardHeader>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: customer.balance > 0 ? 'var(--color-success-text)' : customer.balance < 0 ? 'var(--color-danger-text)' : 'var(--text-primary)' }}>
              {formatCurrency(Math.abs(customer.balance), currency)}
              <span className="ml-1 text-sm font-normal" style={{ fontFamily: 'var(--font-body)' }}>
                {customer.balance > 0 ? 'CR' : customer.balance < 0 ? 'DR' : ''}
              </span>
            </p>
            {unpaidBillTotal > 0 && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>
                <AlertCircle size={13} />{formatCurrency(unpaidBillTotal, currency)} outstanding on bills
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3">Quick Facts</CardTitle>
            <dl className="space-y-2 text-sm">
              {[['Account ref', customer.accountRef], ['Type', fmtType(customer.customerType)], ['Market', customer.market], ['Meter', customer.meterType], ['Annual usage', formatUsage(customer.annualUsageKwh)], ['Supply start', formatDate(customer.supplyStartDate)], ...(customer.contractEndDate ? [['Contract end', formatDate(customer.contractEndDate)]] : []), ['Products', String(customer.currentProducts.length)]].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
                  <dd className="text-right font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{val}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {customer.directDebitAmount !== undefined && (
            <Card>
              <CardTitle className="mb-3">Direct Debit</CardTitle>
              <dl className="space-y-2 text-sm">
                <DLRow label="Amount" value={`${formatCurrency(customer.directDebitAmount)}/mo`} />
                <DLRow label="Collection day" value={`Day ${customer.directDebitDay}`} />
              </dl>
            </Card>
          )}

          <Card>
            <CardTitle className="mb-3">Activity</CardTitle>
            <dl className="space-y-2 text-sm">
              <DLRow label="Bills" value={String(bills.length)} />
              <DLRow label="Quotes" value={String(quotes.length)} />
              <DLRow label="Communications" value={String(comms.length)} />
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-secondary)' }}>Open tasks</dt>
                <dd className="font-medium" style={{ color: openTasks > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{openTasks}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Product Eligibility Modal */}
      <Modal open={showEligibilityModal} onClose={() => setShowEligibilityModal(false)} title={`Product Eligibility — ${customer.name}`}>
        <div className="space-y-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {eligibilityChecks.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active products in the {customer.market} market.</p>
          )}

          {/* Eligible products */}
          {eligibilityChecks.filter((e) => e.result.eligible).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-success-text)' }}>
                Eligible ({eligibilityChecks.filter((e) => e.result.eligible).length})
              </p>
              <div className="space-y-1.5">
                {eligibilityChecks.filter((e) => e.result.eligible).map(({ product }) => (
                  <div key={product.id} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)' }}>
                    <CheckCircle2 size={13} className="shrink-0" style={{ color: 'var(--color-success)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({product.productType.replace(/_/g, ' ')})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ineligible products */}
          {eligibilityChecks.filter((e) => !e.result.eligible).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-danger-text)' }}>
                Ineligible ({eligibilityChecks.filter((e) => !e.result.eligible).length})
              </p>
              <div className="space-y-2">
                {eligibilityChecks.filter((e) => !e.result.eligible).map(({ product, result }) => (
                  <div key={product.id} className="rounded-md px-3 py-2" style={{ background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle size={13} style={{ color: 'var(--color-danger)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({product.productType.replace(/_/g, ' ')})</span>
                    </div>
                    <ul className="ml-5 space-y-0.5">
                      {result.failedRules.map((rule) => (
                        <li key={rule.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {describeRule(rule)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Send Communication Modal */}
      <Modal open={showCommModal} onClose={() => { setShowCommModal(false); setCommForm(EMPTY_COMM); }} title="Send Communication">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Channel</label>
              <select className="field-input" value={commForm.channel} onChange={(e) => setCommForm({ ...commForm, channel: e.target.value as CommunicationChannel })}>
                <option value="email">Email</option><option value="letter">Letter</option><option value="sms">SMS</option><option value="portal">Portal</option><option value="phone">Phone</option>
              </select>
            </div>
            <div>
              <label className="field-label">Direction</label>
              <select className="field-input" value={commForm.direction} onChange={(e) => setCommForm({ ...commForm, direction: e.target.value as 'inbound' | 'outbound' })}>
                <option value="outbound">Outbound</option><option value="inbound">Inbound</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Subject <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="field-input" value={commForm.subject} onChange={(e) => setCommForm({ ...commForm, subject: e.target.value })} placeholder="e.g. Annual billing statement" />
          </div>
          <div>
            <label className="field-label">Body</label>
            <textarea className="field-input" rows={4} value={commForm.body} onChange={(e) => setCommForm({ ...commForm, body: e.target.value })} placeholder="Message body..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowCommModal(false); setCommForm(EMPTY_COMM); }}>Cancel</Button>
            <Button size="sm" disabled={!commForm.subject.trim()} onClick={handleSendComm}>Send</Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal open={showTaskModal} onClose={() => { setShowTaskModal(false); setTaskForm(EMPTY_TASK); }} title="Create Task">
        <div className="space-y-3">
          <div>
            <label className="field-label">Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="field-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Follow up on disputed bill" />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={3} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Optional details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Priority</label>
              <select className="field-input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="field-label">Due date</label>
              <input type="date" className="field-input" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Assigned to</label>
            <input type="text" className="field-input" value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })} placeholder="Agent name (optional)" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowTaskModal(false); setTaskForm(EMPTY_TASK); }}>Cancel</Button>
            <Button size="sm" disabled={!taskForm.title.trim()} onClick={handleCreateTask}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
