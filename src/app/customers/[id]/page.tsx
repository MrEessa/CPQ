'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  ClipboardList,
  MessageSquare,
  FileText,
  StickyNote,
  AlertCircle,
} from 'lucide-react';
import { getCustomerById, updateCustomer } from '@/lib/data/customers';
import { getBillsForCustomer } from '@/lib/data/bills';
import { getCommunicationsForCustomer, addCommunication } from '@/lib/data/communications';
import { getTasksForCustomer, addTask } from '@/lib/data/tasks';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatDateTime, formatUsage } from '@/lib/utils';
import { CustomerStatus, CommunicationChannel, TaskPriority, CustomerType, BillStatus } from '@/lib/types';

type Tab = 'overview' | 'billing' | 'communications' | 'tasks' | 'documents' | 'notes';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

const CUSTOMER_STATUSES: CustomerStatus[] = ['active', 'pending', 'suspended', 'closed'];

const BILL_STATUS_COLORS: Record<BillStatus, string> = {
  issued: 'text-blue-700 bg-blue-50',
  paid: 'text-green-700 bg-green-50',
  overdue: 'text-red-700 bg-red-50',
  disputed: 'text-yellow-700 bg-yellow-50',
};

function fmtType(t: CustomerType): string {
  if (t === 'ic') return 'I&C';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

interface CommForm {
  channel: CommunicationChannel;
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
}

interface TaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedTo: string;
  dueDate: string;
}

const EMPTY_COMM: CommForm = { channel: 'email', direction: 'outbound', subject: '', body: '' };
const EMPTY_TASK: TaskForm = { title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' };

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [, forceUpdate] = useState(0);
  const [showCommModal, setShowCommModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [commForm, setCommForm] = useState<CommForm>(EMPTY_COMM);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK);

  const customerOrUndefined = getCustomerById(params.id);
  if (!customerOrUndefined) notFound();
  const customer = customerOrUndefined;

  const bills = getBillsForCustomer(customer.id);
  const comms = getCommunicationsForCustomer(customer.id);
  const tasks = getTasksForCustomer(customer.id);

  function handleStatusChange(newStatus: CustomerStatus) {
    updateCustomer(customer.id, { status: newStatus });
    forceUpdate((n) => n + 1);
  }

  function handleSendComm() {
    if (!commForm.subject.trim()) return;
    addCommunication({
      customerId: customer.id,
      channel: commForm.channel,
      direction: commForm.direction,
      subject: commForm.subject.trim(),
      body: commForm.body,
      sentAt: new Date().toISOString(),
      status: 'sent',
    });
    setCommForm(EMPTY_COMM);
    setShowCommModal(false);
    forceUpdate((n) => n + 1);
  }

  function handleCreateTask() {
    if (!taskForm.title.trim()) return;
    addTask({
      customerId: customer.id,
      title: taskForm.title.trim(),
      description: taskForm.description || undefined,
      priority: taskForm.priority,
      assignedTo: taskForm.assignedTo || undefined,
      dueDate: taskForm.dueDate || undefined,
    });
    setTaskForm(EMPTY_TASK);
    setShowTaskModal(false);
    forceUpdate((n) => n + 1);
  }

  const openTasks = tasks.filter((t) => t.status !== 'closed').length;
  const unpaidBillTotal = bills
    .filter((b) => b.status !== 'paid')
    .reduce((sum, b) => sum + (b.amountDue - b.amountPaid), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
              <span className="text-sm text-gray-400">{customer.accountRef}</span>
              <Badge variant={customer.status} />
            </div>
            <p className="text-sm text-gray-500">
              {fmtType(customer.customerType)} · {customer.market} · {customer.meterType} meter
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Status:</span>
          <select
            value={customer.status}
            onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Body: tabs + quick stats */}
      <div className="flex items-start gap-5">
        {/* Left: tabs */}
        <div className="min-w-0 flex-1 space-y-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                {label}
                {id === 'tasks' && openTasks > 0 && (
                  <span className="ml-0.5 rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-700">
                    {openTasks}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pt-4">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Supply Address</CardTitle>
                  </CardHeader>
                  <div className="space-y-0.5 text-sm text-gray-700">
                    <p>{customer.supplyAddress.line1}</p>
                    {customer.supplyAddress.line2 && <p>{customer.supplyAddress.line2}</p>}
                    <p>{customer.supplyAddress.city}</p>
                    <p>{customer.supplyAddress.postcode}</p>
                    <p className="text-gray-400">{customer.supplyAddress.countryCode}</p>
                  </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                  </CardHeader>
                  <div className="space-y-0.5 text-sm text-gray-700">
                    <p>{customer.billingAddress.line1}</p>
                    {customer.billingAddress.line2 && <p>{customer.billingAddress.line2}</p>}
                    <p>{customer.billingAddress.city}</p>
                    <p>{customer.billingAddress.postcode}</p>
                    <p className="text-gray-400">{customer.billingAddress.countryCode}</p>
                  </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Meter Details</CardTitle>
                  </CardHeader>
                  <dl className="space-y-2 text-sm">
                    {[
                      ['Meter type', customer.meterType],
                      ...(customer.mpan ? [['MPAN', customer.mpan]] : []),
                      ...(customer.mprn ? [['MPRN', customer.mprn]] : []),
                      ['Annual usage', formatUsage(customer.annualUsageKwh)],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="font-medium text-gray-900">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contract</CardTitle>
                  </CardHeader>
                  <dl className="space-y-2 text-sm">
                    {[
                      ['Supply start', formatDate(customer.supplyStartDate)],
                      ...(customer.contractEndDate
                        ? [['Contract end', formatDate(customer.contractEndDate)]]
                        : []),
                      ['Products on supply', String(customer.currentProducts.length)],
                      ...(customer.directDebitAmount !== undefined
                        ? [['Direct debit', `${formatCurrency(customer.directDebitAmount)}/mo (day ${customer.directDebitDay ?? '—'})`]]
                        : []),
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="font-medium text-gray-900">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </div>
            )}

            {activeTab === 'billing' && (
              <Card padding={false}>
                {bills.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    No bills found for this customer.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-5 py-2.5 text-left">Reference</th>
                        <th className="px-5 py-2.5 text-left">Period</th>
                        <th className="px-5 py-2.5 text-right">Usage</th>
                        <th className="px-5 py-2.5 text-right">Amount Due</th>
                        <th className="px-5 py-2.5 text-left">Status</th>
                        <th className="px-5 py-2.5 text-left">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((b, i) => (
                        <tr
                          key={b.id}
                          className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <Link
                              href={`/billing/${b.id}`}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              {b.reference}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {formatDate(b.periodFrom)} – {formatDate(b.periodTo)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600">
                            {b.usageKwh.toLocaleString()} kWh
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(b.amountDue)}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${BILL_STATUS_COLORS[b.status]}`}
                            >
                              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{formatDate(b.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            )}

            {activeTab === 'communications' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setShowCommModal(true)}>
                    <MessageSquare size={13} /> Send Communication
                  </Button>
                </div>
                <Card padding={false}>
                  {comms.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                      No communications recorded.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-2.5 text-left">Subject</th>
                          <th className="px-5 py-2.5 text-left">Channel</th>
                          <th className="px-5 py-2.5 text-left">Direction</th>
                          <th className="px-5 py-2.5 text-left">Status</th>
                          <th className="px-5 py-2.5 text-left">Sent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comms.map((c, i) => (
                          <tr
                            key={c.id}
                            className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                          >
                            <td className="px-5 py-3 font-medium text-gray-900">{c.subject}</td>
                            <td className="px-5 py-3 capitalize text-gray-600">{c.channel}</td>
                            <td className="px-5 py-3 capitalize text-gray-600">{c.direction}</td>
                            <td className="px-5 py-3 capitalize text-gray-500">{c.status}</td>
                            <td className="px-5 py-3 text-gray-500">{formatDateTime(c.sentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setShowTaskModal(true)}>
                    <ClipboardList size={13} /> Create Task
                  </Button>
                </div>
                <Card padding={false}>
                  {tasks.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                      No tasks for this customer.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-2.5 text-left">Title</th>
                          <th className="px-5 py-2.5 text-left">Priority</th>
                          <th className="px-5 py-2.5 text-left">Status</th>
                          <th className="px-5 py-2.5 text-left">Assigned</th>
                          <th className="px-5 py-2.5 text-left">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t, i) => (
                          <tr
                            key={t.id}
                            className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                          >
                            <td className="px-5 py-3 font-medium text-gray-900">{t.title}</td>
                            <td className="px-5 py-3">
                              <Badge variant={t.priority} />
                            </td>
                            <td className="px-5 py-3 capitalize text-gray-600">
                              {t.status.replace(/_/g, ' ')}
                            </td>
                            <td className="px-5 py-3 text-gray-500">{t.assignedTo ?? '—'}</td>
                            <td className="px-5 py-3 text-gray-500">
                              {t.dueDate ? formatDate(t.dueDate) : '—'}
                            </td>
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
                  <FileText size={32} className="text-gray-300" />
                  <p className="text-sm text-gray-400">Document storage not yet configured.</p>
                </div>
              </Card>
            )}

            {activeTab === 'notes' && (
              <Card>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <StickyNote size={32} className="text-gray-300" />
                  <p className="text-sm text-gray-400">No notes recorded for this customer.</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right: quick stats */}
        <div className="sticky top-5 w-64 shrink-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Balance</CardTitle>
            </CardHeader>
            <p
              className={`text-2xl font-bold ${
                customer.balance > 0
                  ? 'text-green-700'
                  : customer.balance < 0
                  ? 'text-red-600'
                  : 'text-gray-700'
              }`}
            >
              {formatCurrency(Math.abs(customer.balance))}
              <span className="ml-1 text-sm font-normal">
                {customer.balance > 0 ? 'CR' : customer.balance < 0 ? 'DR' : ''}
              </span>
            </p>
            {unpaidBillTotal > 0 && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-700">
                <AlertCircle size={13} />
                {formatCurrency(unpaidBillTotal)} outstanding on bills
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3">Quick Facts</CardTitle>
            <dl className="space-y-2 text-sm">
              {[
                ['Account ref', customer.accountRef],
                ['Customer type', fmtType(customer.customerType)],
                ['Market', customer.market],
                ['Meter type', customer.meterType],
                ['Annual usage', formatUsage(customer.annualUsageKwh)],
                ['Supply start', formatDate(customer.supplyStartDate)],
                ...(customer.contractEndDate
                  ? [['Contract end', formatDate(customer.contractEndDate)]]
                  : []),
                ['Products', String(customer.currentProducts.length)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-right font-medium text-gray-900">{val}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {customer.directDebitAmount !== undefined && (
            <Card>
              <CardTitle className="mb-3">Direct Debit</CardTitle>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Amount</dt>
                  <dd className="font-medium text-gray-900">
                    {formatCurrency(customer.directDebitAmount)}/mo
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Collection day</dt>
                  <dd className="font-medium text-gray-900">Day {customer.directDebitDay}</dd>
                </div>
              </dl>
            </Card>
          )}

          <Card>
            <CardTitle className="mb-3">Activity</CardTitle>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Bills</dt>
                <dd className="font-medium text-gray-900">{bills.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Communications</dt>
                <dd className="font-medium text-gray-900">{comms.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Open tasks</dt>
                <dd className={`font-medium ${openTasks > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {openTasks}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Send Communication Modal */}
      <Modal
        open={showCommModal}
        onClose={() => { setShowCommModal(false); setCommForm(EMPTY_COMM); }}
        title="Send Communication"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Channel</label>
              <select
                value={commForm.channel}
                onChange={(e) => setCommForm({ ...commForm, channel: e.target.value as CommunicationChannel })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="letter">Letter</option>
                <option value="sms">SMS</option>
                <option value="portal">Portal</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Direction</label>
              <select
                value={commForm.direction}
                onChange={(e) => setCommForm({ ...commForm, direction: e.target.value as 'inbound' | 'outbound' })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={commForm.subject}
              onChange={(e) => setCommForm({ ...commForm, subject: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Annual billing statement"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Body</label>
            <textarea
              value={commForm.body}
              onChange={(e) => setCommForm({ ...commForm, body: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Message body..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowCommModal(false); setCommForm(EMPTY_COMM); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!commForm.subject.trim()}
              onClick={handleSendComm}
            >
              Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setTaskForm(EMPTY_TASK); }}
        title="Create Task"
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Follow up on disputed bill"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Due date</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Assigned to</label>
            <input
              type="text"
              value={taskForm.assignedTo}
              onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Agent name (optional)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowTaskModal(false); setTaskForm(EMPTY_TASK); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!taskForm.title.trim()}
              onClick={handleCreateTask}
            >
              Create Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
