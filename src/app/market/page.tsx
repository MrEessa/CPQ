'use client';

import { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import {
  getMarketMessages,
  retryMessage,
  getSwitches,
  objectToSwitch,
  getMeterReadings,
  getComplianceItems,
  updateComplianceItem,
} from '@/lib/data/market';
import { getCustomerById } from '@/lib/data/customers';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import type {
  MarketMessage,
  MarketMessageStatus,
  Switch as MarketSwitch,
  ComplianceItem,
  ComplianceStatus,
  MeterReading,
} from '@/lib/types';
import { SWITCH_STAGE_TRANSITIONS } from '@/lib/market-engine';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'messages', label: 'Industry Messages' },
  { id: 'switches', label: 'Switch Management' },
  { id: 'meter-reads', label: 'Meter Reads' },
  { id: 'compliance', label: 'Compliance Queue' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueClass = 'text-gray-900',
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </Card>
  );
}

// ─── Message status filter pills ──────────────────────────────────────────────

const MESSAGE_STATUS_OPTIONS: MarketMessageStatus[] = [
  'sent',
  'acknowledged',
  'completed',
  'failed',
  'rejected',
];

// ─── Compliance status filter pills ───────────────────────────────────────────

const COMPLIANCE_STATUS_OPTIONS: ComplianceStatus[] = [
  'open',
  'in_progress',
  'completed',
  'overdue',
];

// ─── Helper: customer name lookup ─────────────────────────────────────────────

function customerName(id?: string): string {
  if (!id) return '—';
  const c = getCustomerById(id);
  return c ? c.name : id;
}

// ─── Objection modal ──────────────────────────────────────────────────────────

function ObjectionModal({
  sw,
  onConfirm,
  onCancel,
}: {
  sw: MarketSwitch;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">Object to Switch</h3>
        <p className="mt-1 text-sm text-gray-500">
          Switch <span className="font-mono text-xs">{sw.id}</span> · gain · {formatDate(sw.gainDate)}
        </p>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          Reason for objection
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer has not given consent to transfer"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-40"
          >
            Submit objection
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compliance status advance modal ──────────────────────────────────────────

const COMPLIANCE_NEXT: Record<ComplianceStatus, ComplianceStatus | null> = {
  open: 'in_progress',
  in_progress: 'completed',
  completed: null,
  overdue: 'in_progress',
};

function ComplianceModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: ComplianceItem;
  onConfirm: (newStatus: ComplianceStatus) => void;
  onCancel: () => void;
}) {
  const next = COMPLIANCE_NEXT[item.status];
  if (!next) return null;

  const label = next.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">Update Compliance Item</h3>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{item.title}</span>
        </p>
        <p className="mt-3 text-sm text-gray-600">
          Advance status to <span className="font-medium text-gray-900">{label}</span>?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(next)}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Mark {label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Industry Messages ───────────────────────────────────────────────────

function MessagesTab() {
  const [statusFilter, setStatusFilter] = useState<MarketMessageStatus[]>([]);
  const [messages, setMessages] = useState<MarketMessage[]>(() => getMarketMessages());

  const filtered = statusFilter.length
    ? messages.filter((m) => statusFilter.includes(m.status))
    : messages;

  function toggleStatus(s: MarketMessageStatus) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function handleRetry(id: string) {
    retryMessage(id);
    setMessages(getMarketMessages());
  }

  const failed = messages.filter((m) => m.status === 'failed').length;
  const inFlight = messages.filter((m) => m.status === 'sent' || m.status === 'acknowledged').length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Messages" value={String(messages.length)} sub="all statuses" />
        <KpiCard
          label="In Flight"
          value={String(inFlight)}
          sub="sent or acknowledged"
          valueClass="text-blue-700"
        />
        <KpiCard
          label="Completed"
          value={String(messages.filter((m) => m.status === 'completed').length)}
          sub="successfully processed"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Failed / Rejected"
          value={String(failed + messages.filter((m) => m.status === 'rejected').length)}
          sub={failed > 0 ? `${failed} retryable` : 'none retryable'}
          valueClass={failed > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Filter:</span>
        {MESSAGE_STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              statusFilter.includes(s)
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No messages match the selected filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">ID</th>
                <th className="px-5 py-2.5 text-left">Type</th>
                <th className="px-5 py-2.5 text-left">Direction</th>
                <th className="px-5 py-2.5 text-left">Customer</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Sent At</th>
                <th className="px-5 py-2.5 text-right">Retries</th>
                <th className="px-5 py-2.5 text-left">Error</th>
                <th className="px-5 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((msg, i) => (
                <tr
                  key={msg.id}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{msg.id}</td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                      {msg.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {msg.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{customerName(msg.customerId)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={msg.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDateTime(msg.sentAt)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-400">
                    {msg.retryCount}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-3 text-xs text-red-500">
                    {msg.errorReason ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {msg.status === 'failed' ? (
                      <button
                        onClick={() => handleRetry(msg.id)}
                        className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: Switch Management ───────────────────────────────────────────────────

function SwitchesTab() {
  const [switches, setSwitches] = useState<MarketSwitch[]>(() => getSwitches());
  const [objecting, setObjecting] = useState<MarketSwitch | null>(null);

  function handleObject(reason: string) {
    if (!objecting) return;
    objectToSwitch(objecting.id, reason);
    setSwitches(getSwitches());
    setObjecting(null);
  }

  const gains = switches.filter((s) => s.type === 'gain');
  const losses = switches.filter((s) => s.type === 'loss');
  const inWindow = switches.filter(
    (s) => s.type === 'gain' && SWITCH_STAGE_TRANSITIONS[s.stage].includes('objected'),
  );

  return (
    <div className="space-y-4">
      {objecting && (
        <ObjectionModal
          sw={objecting}
          onConfirm={handleObject}
          onCancel={() => setObjecting(null)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Switches" value={String(switches.length)} sub="all stages" />
        <KpiCard
          label="Gains"
          value={String(gains.length)}
          sub="customers switching in"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Losses"
          value={String(losses.length)}
          sub="customers switching out"
          valueClass="text-red-600"
        />
        <KpiCard
          label="Objectable"
          value={String(inWindow.length)}
          sub="gain switches in objection window"
          valueClass={inWindow.length > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
      </div>

      {/* Table */}
      <Card padding={false}>
        <table className="w-full text-sm">
          <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-2.5 text-left">ID</th>
              <th className="px-5 py-2.5 text-left">Type</th>
              <th className="px-5 py-2.5 text-left">Customer</th>
              <th className="px-5 py-2.5 text-left">Stage</th>
              <th className="px-5 py-2.5 text-left">MPAN / MPRN</th>
              <th className="px-5 py-2.5 text-left">Gain Date</th>
              <th className="px-5 py-2.5 text-left">Initiated</th>
              <th className="px-5 py-2.5 text-left">Objection Reason</th>
              <th className="px-5 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {switches.map((sw, i) => {
              const canObject = sw.type === 'gain' && SWITCH_STAGE_TRANSITIONS[sw.stage].includes('objected');
              return (
                <tr
                  key={sw.id}
                  className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{sw.id}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        sw.type === 'gain'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {sw.type === 'gain' ? '↑ Gain' : '↓ Loss'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{customerName(sw.customerId)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={sw.stage} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {sw.mpan ?? sw.mprn ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(sw.gainDate)}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(sw.initiatedAt)}</td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-xs text-gray-500">
                    {sw.objectionReason ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {canObject ? (
                      <button
                        onClick={() => setObjecting(sw)}
                        className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Object
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Tab: Meter Reads ─────────────────────────────────────────────────────────

const SOURCE_PILL: Record<MeterReading['source'], string> = {
  smart: 'bg-green-100 text-green-700',
  customer: 'bg-blue-100 text-blue-700',
  estimated: 'bg-yellow-100 text-yellow-700',
  industry: 'bg-purple-100 text-purple-700',
};

function MeterReadsTab() {
  const readings = getMeterReadings();

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Reads" value={String(readings.length)} sub="all sources" />
        <KpiCard
          label="Smart Reads"
          value={String(readings.filter((r) => r.source === 'smart').length)}
          sub="automated AMI reads"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Customer Reads"
          value={String(readings.filter((r) => r.source === 'customer').length)}
          sub="self-reported"
        />
        <KpiCard
          label="Estimated"
          value={String(readings.filter((r) => r.source === 'estimated').length)}
          sub="based on consumption profile"
          valueClass="text-amber-600"
        />
      </div>

      <Card padding={false}>
        <table className="w-full text-sm">
          <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-2.5 text-left">Customer</th>
              <th className="px-5 py-2.5 text-left">MPAN / MPRN</th>
              <th className="px-5 py-2.5 text-left">Read Date</th>
              <th className="px-5 py-2.5 text-right">Reading (kWh)</th>
              <th className="px-5 py-2.5 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
              >
                <td className="px-5 py-3 text-gray-700">{customerName(r.customerId)}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-500">
                  {r.mpan ?? r.mprn ?? '—'}
                </td>
                <td className="px-5 py-3 text-gray-500">{formatDate(r.readingDate)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-900">
                  {r.readingKwh.toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_PILL[r.source]}`}
                  >
                    {r.source.charAt(0).toUpperCase() + r.source.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Tab: Compliance Queue ────────────────────────────────────────────────────

function ComplianceTab() {
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus[]>([]);
  const [items, setItems] = useState<ComplianceItem[]>(() => getComplianceItems());
  const [advancing, setAdvancing] = useState<ComplianceItem | null>(null);

  const filtered = statusFilter.length
    ? items.filter((c) => statusFilter.includes(c.status))
    : items;

  function toggleStatus(s: ComplianceStatus) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function handleAdvance(newStatus: ComplianceStatus) {
    if (!advancing) return;
    const updates: Partial<ComplianceItem> = {
      status: newStatus,
      ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {}),
    };
    updateComplianceItem(advancing.id, updates);
    setItems(getComplianceItems());
    setAdvancing(null);
  }

  const overdue = items.filter((c) => c.status === 'overdue').length;
  const open = items.filter((c) => c.status === 'open' || c.status === 'in_progress').length;

  return (
    <div className="space-y-4">
      {advancing && (
        <ComplianceModal
          item={advancing}
          onConfirm={handleAdvance}
          onCancel={() => setAdvancing(null)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Items" value={String(items.length)} sub="all statuses" />
        <KpiCard
          label="Overdue"
          value={String(overdue)}
          sub="past due date"
          valueClass={overdue > 0 ? 'text-red-600' : 'text-gray-900'}
        />
        <KpiCard
          label="Open / In Progress"
          value={String(open)}
          sub="requiring action"
          valueClass={open > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
        <KpiCard
          label="Completed"
          value={String(items.filter((c) => c.status === 'completed').length)}
          sub="resolved items"
          valueClass="text-green-700"
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Filter:</span>
        {COMPLIANCE_STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              statusFilter.includes(s)
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No compliance items match the selected filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-t border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 text-left">Title</th>
                <th className="px-5 py-2.5 text-left">Regulatory Ref</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Due Date</th>
                <th className="px-5 py-2.5 text-left">Assigned To</th>
                <th className="px-5 py-2.5 text-left">Completed</th>
                <th className="px-5 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const canAdvance = COMPLIANCE_NEXT[item.status] !== null;
                const nextStatus = COMPLIANCE_NEXT[item.status];
                const nextLabel = nextStatus
                  ? nextStatus === 'in_progress'
                    ? 'In Progress'
                    : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)
                  : '';
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                        {item.description}
                      </p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      {item.regulatoryReference ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={item.status} />
                    </td>
                    <td
                      className={`px-5 py-3 ${item.status === 'overdue' ? 'font-medium text-red-600' : 'text-gray-500'}`}
                    >
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{item.assignedTo ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {item.completedAt ? formatDate(item.completedAt) : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {canAdvance ? (
                        <button
                          onClick={() => setAdvancing(item)}
                          className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Mark {nextLabel}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<TabId>('messages');

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Market Communications</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Industry messages, switch management, meter reads, and compliance tracking
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
          <Upload className="h-3.5 w-3.5" />
          Submit Meter Read
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'messages' && <MessagesTab />}
      {activeTab === 'switches' && <SwitchesTab />}
      {activeTab === 'meter-reads' && <MeterReadsTab />}
      {activeTab === 'compliance' && <ComplianceTab />}
    </div>
  );
}
