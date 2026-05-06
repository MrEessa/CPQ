'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { getMarketMessages, retryMessage, getSwitches, objectToSwitch, getMeterReadings, getComplianceItems, updateComplianceItem } from '@/lib/data/market';
import { getCustomerById } from '@/lib/data/customers';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { MarketMessage, MarketMessageStatus, Switch as MarketSwitch, ComplianceItem, ComplianceStatus, MeterReading } from '@/lib/types';
import { SWITCH_STAGE_TRANSITIONS } from '@/lib/market-engine';

const TABS = [
  { id: 'messages',     label: 'Industry Messages' },
  { id: 'switches',     label: 'Switch Management' },
  { id: 'meter-reads',  label: 'Meter Reads' },
  { id: 'compliance',   label: 'Compliance Queue' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// Shared KPI card (token-based)
function KpiCard({ label, value, sub, valueColor = 'var(--text-primary)' }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <Card>
      <p style={{ fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</p>
      <p style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: valueColor }}>{value}</p>
      <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</p>
    </Card>
  );
}

const MESSAGE_STATUS_OPTIONS: MarketMessageStatus[] = ['sent', 'acknowledged', 'completed', 'failed', 'rejected'];
const COMPLIANCE_STATUS_OPTIONS: ComplianceStatus[]  = ['open', 'in_progress', 'completed', 'overdue'];

function CustomerCell({ id }: { id?: string }) {
  if (!id) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
  const c = getCustomerById(id);
  return <Link href={`/customers/${id}`} className="table-link">{c ? c.name : id}</Link>;
}

// Small inline modal (reusable style)
const modalWrapStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' };
const modalBoxStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: 24, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-modal)' };

function ObjectionModal({ sw, onConfirm, onCancel }: { sw: MarketSwitch; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div style={modalWrapStyle}>
      <div style={modalBoxStyle}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>Object to Switch</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Switch <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{sw.id}</span> · gain · {formatDate(sw.gainDate)}</p>
        <label className="mt-4 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Reason for objection
          <textarea className="field-input mt-1" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer has not given consent to transfer" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="filter-chip">Cancel</button>
          <button disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}
            style={{ borderRadius: 6, background: reason.trim() ? 'var(--color-warning)' : 'var(--bg-elevated)', color: reason.trim() ? '#fff' : 'var(--text-tertiary)', padding: '5px 16px', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: reason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
            Submit objection
          </button>
        </div>
      </div>
    </div>
  );
}

const COMPLIANCE_NEXT: Record<ComplianceStatus, ComplianceStatus | null> = { open: 'in_progress', in_progress: 'completed', completed: null, overdue: 'in_progress' };

function ComplianceModal({ item, onConfirm, onCancel }: { item: ComplianceItem; onConfirm: (s: ComplianceStatus) => void; onCancel: () => void }) {
  const next = COMPLIANCE_NEXT[item.status];
  if (!next) return null;
  const label = next.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div style={modalWrapStyle}>
      <div style={modalBoxStyle}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>Update Compliance Item</h3>
        <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Advance status to <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="filter-chip">Cancel</button>
          <button onClick={() => onConfirm(next)} style={{ borderRadius: 6, background: 'var(--color-primary)', color: '#fff', padding: '5px 16px', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Mark {label}</button>
        </div>
      </div>
    </div>
  );
}

const SOURCE_PILL_STYLE: Record<MeterReading['source'], React.CSSProperties> = {
  smart:     { background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' },
  customer:  { background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' },
  estimated: { background: 'var(--color-warning-subtle)', color: 'var(--color-warning-text)' },
  industry:  { background: 'var(--color-info-subtle)',    color: 'var(--color-info-text)' },
};

function MessagesTab() {
  const [statusFilter, setStatusFilter] = useState<MarketMessageStatus[]>([]);
  const [messages, setMessages] = useState<MarketMessage[]>(() => getMarketMessages());

  const filtered = statusFilter.length ? messages.filter((m) => statusFilter.includes(m.status)) : messages;
  const failed   = messages.filter((m) => m.status === 'failed').length;
  const inFlight = messages.filter((m) => m.status === 'sent' || m.status === 'acknowledged').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Messages"   value={String(messages.length)} sub="all statuses" />
        <KpiCard label="In Flight"        value={String(inFlight)}        sub="sent or acknowledged"      valueColor="var(--color-primary-text)" />
        <KpiCard label="Completed"        value={String(messages.filter((m) => m.status === 'completed').length)} sub="successfully processed" valueColor="var(--color-success-text)" />
        <KpiCard label="Failed / Rejected" value={String(failed + messages.filter((m) => m.status === 'rejected').length)} sub={failed > 0 ? `${failed} retryable` : 'none retryable'} valueColor={failed > 0 ? 'var(--color-danger-text)' : 'var(--text-primary)'} />
      </div>
      <div className="filter-row">
        <span className="filter-label">Filter:</span>
        {MESSAGE_STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatusFilter((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])} className={`filter-chip ${statusFilter.includes(s) ? 'active' : ''}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <Card padding={false}>
        {filtered.length === 0 ? <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No messages match the selected filter.</div> : (
          <table className="data-table">
            <thead><tr><th>ID</th><th>Type</th><th>Direction</th><th>Customer</th><th>Status</th><th>Sent At</th><th className="text-right">Retries</th><th>Error</th><th className="text-center">Action</th></tr></thead>
            <tbody>
              {filtered.map((msg) => (
                <tr key={msg.id}>
                  <td className="cell-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{msg.id}</td>
                  <td><span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{msg.type}</span></td>
                  <td>{msg.direction === 'inbound' ? '← Inbound' : '→ Outbound'}</td>
                  <td><CustomerCell id={msg.customerId} /></td>
                  <td><Badge variant={msg.status} /></td>
                  <td className="cell-mono text-xs">{formatDateTime(msg.sentAt)}</td>
                  <td className="text-right tabular-nums cell-mono">{msg.retryCount}</td>
                  <td className="max-w-[180px] truncate text-xs" style={{ color: 'var(--color-danger-text)' }}>{msg.errorReason ?? '—'}</td>
                  <td className="text-center">
                    {msg.status === 'failed' ? (
                      <button onClick={() => { retryMessage(msg.id); setMessages(getMarketMessages()); }}
                        className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
                        style={{ color: 'var(--color-primary-text)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-primary-subtle)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    ) : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>}
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

function SwitchesTab() {
  const [switches, setSwitches] = useState<MarketSwitch[]>(() => getSwitches());
  const [objecting, setObjecting] = useState<MarketSwitch | null>(null);
  const gains    = switches.filter((s) => s.type === 'gain');
  const losses   = switches.filter((s) => s.type === 'loss');
  const inWindow = switches.filter((s) => s.type === 'gain' && SWITCH_STAGE_TRANSITIONS[s.stage].includes('objected'));

  return (
    <div className="space-y-4">
      {objecting && <ObjectionModal sw={objecting} onConfirm={(r) => { objectToSwitch(objecting.id, r); setSwitches(getSwitches()); setObjecting(null); }} onCancel={() => setObjecting(null)} />}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Switches" value={String(switches.length)} sub="all stages" />
        <KpiCard label="Gains"          value={String(gains.length)}    sub="customers switching in"           valueColor="var(--color-success-text)" />
        <KpiCard label="Losses"         value={String(losses.length)}   sub="customers switching out"          valueColor="var(--color-danger-text)" />
        <KpiCard label="Objectable"     value={String(inWindow.length)} sub="gain switches in objection window" valueColor={inWindow.length > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)'} />
      </div>
      <Card padding={false}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Type</th><th>Customer</th><th>Stage</th><th>MPAN / MPRN</th><th>Gain Date</th><th>Initiated</th><th>Objection Reason</th><th className="text-center">Action</th></tr></thead>
          <tbody>
            {switches.map((sw) => {
              const canObject = sw.type === 'gain' && SWITCH_STAGE_TRANSITIONS[sw.stage].includes('objected');
              return (
                <tr key={sw.id}>
                  <td className="cell-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{sw.id}</td>
                  <td>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={sw.type === 'gain' ? { background: 'var(--color-success-subtle)', color: 'var(--color-success-text)' } : { background: 'var(--color-danger-subtle)', color: 'var(--color-danger-text)' }}>
                      {sw.type === 'gain' ? '↑ Gain' : '↓ Loss'}
                    </span>
                  </td>
                  <td><CustomerCell id={sw.customerId} /></td>
                  <td><Badge variant={sw.stage} /></td>
                  <td className="cell-mono text-xs">{sw.mpan ?? sw.mprn ?? '—'}</td>
                  <td>{formatDate(sw.gainDate)}</td>
                  <td className="text-xs cell-mono">{formatDateTime(sw.initiatedAt)}</td>
                  <td className="max-w-[200px] truncate text-xs">{sw.objectionReason ?? '—'}</td>
                  <td className="text-center">
                    {canObject ? (
                      <button onClick={() => setObjecting(sw)} className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
                        style={{ color: 'var(--color-warning-text)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-warning-subtle)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <AlertCircle className="h-3 w-3" /> Object
                      </button>
                    ) : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>}
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

function MeterReadsTab() {
  const readings = getMeterReadings();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Reads"    value={String(readings.length)}                                          sub="all sources" />
        <KpiCard label="Smart Reads"    value={String(readings.filter((r) => r.source === 'smart').length)}      sub="automated AMI reads"            valueColor="var(--color-success-text)" />
        <KpiCard label="Customer Reads" value={String(readings.filter((r) => r.source === 'customer').length)}   sub="self-reported" />
        <KpiCard label="Estimated"      value={String(readings.filter((r) => r.source === 'estimated').length)}  sub="based on consumption profile"   valueColor="var(--color-warning-text)" />
      </div>
      <Card padding={false}>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>MPAN / MPRN</th><th>Read Date</th><th className="text-right">Reading (kWh)</th><th>Source</th></tr></thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td><CustomerCell id={r.customerId} /></td>
                <td className="cell-mono text-xs">{r.mpan ?? r.mprn ?? '—'}</td>
                <td>{formatDate(r.readingDate)}</td>
                <td className="text-right tabular-nums cell-mono cell-primary font-medium">{r.readingKwh.toLocaleString()}</td>
                <td><span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={SOURCE_PILL_STYLE[r.source]}>{r.source.charAt(0).toUpperCase() + r.source.slice(1)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ComplianceTab() {
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus[]>([]);
  const [items, setItems]               = useState<ComplianceItem[]>(() => getComplianceItems());
  const [advancing, setAdvancing]       = useState<ComplianceItem | null>(null);

  const filtered = statusFilter.length ? items.filter((c) => statusFilter.includes(c.status)) : items;
  const overdue  = items.filter((c) => c.status === 'overdue').length;
  const open     = items.filter((c) => c.status === 'open' || c.status === 'in_progress').length;

  function handleAdvance(newStatus: ComplianceStatus) {
    if (!advancing) return;
    updateComplianceItem(advancing.id, { status: newStatus, ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {}) });
    setItems(getComplianceItems()); setAdvancing(null);
  }

  return (
    <div className="space-y-4">
      {advancing && <ComplianceModal item={advancing} onConfirm={handleAdvance} onCancel={() => setAdvancing(null)} />}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Items"      value={String(items.length)}                                       sub="all statuses" />
        <KpiCard label="Overdue"          value={String(overdue)} sub="past due date"                        valueColor={overdue > 0 ? 'var(--color-danger-text)' : 'var(--text-primary)'} />
        <KpiCard label="Open / In Progress" value={String(open)} sub="requiring action"                      valueColor={open > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)'} />
        <KpiCard label="Completed"        value={String(items.filter((c) => c.status === 'completed').length)} sub="resolved items" valueColor="var(--color-success-text)" />
      </div>
      <div className="filter-row">
        <span className="filter-label">Filter:</span>
        {COMPLIANCE_STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatusFilter((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])} className={`filter-chip ${statusFilter.includes(s) ? 'active' : ''}`}>
            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <Card padding={false}>
        {filtered.length === 0 ? <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No compliance items match the selected filter.</div> : (
          <table className="data-table">
            <thead><tr><th>Title</th><th>Regulatory Ref</th><th>Status</th><th>Due Date</th><th>Assigned To</th><th>Completed</th><th className="text-center">Action</th></tr></thead>
            <tbody>
              {filtered.map((item) => {
                const canAdvance = COMPLIANCE_NEXT[item.status] !== null;
                const nextStatus = COMPLIANCE_NEXT[item.status];
                const nextLabel  = nextStatus ? (nextStatus === 'in_progress' ? 'In Progress' : nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)) : '';
                return (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                      <p className="mt-0.5 text-xs line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>{item.description}</p>
                    </td>
                    <td className="cell-mono text-xs">{item.regulatoryReference ?? '—'}</td>
                    <td><Badge variant={item.status} /></td>
                    <td style={{ color: item.status === 'overdue' ? 'var(--color-danger-text)' : undefined, fontWeight: item.status === 'overdue' ? 500 : undefined }}>{formatDate(item.dueDate)}</td>
                    <td>{item.assignedTo ?? '—'}</td>
                    <td className="text-xs cell-mono">{item.completedAt ? formatDate(item.completedAt) : '—'}</td>
                    <td className="text-center">
                      {canAdvance ? (
                        <button onClick={() => setAdvancing(item)} className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{ color: 'var(--color-primary-text)' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-primary-subtle)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark {nextLabel}
                        </button>
                      ) : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>}
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

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<TabId>('messages');
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Market Communications</h2>
          <p className="section-subtitle">Industry messages, switch management, meter reads, and compliance tracking</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)' }}>
          <Upload className="h-3.5 w-3.5" /> Submit Meter Read
        </div>
      </div>
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'messages'    && <MessagesTab />}
      {activeTab === 'switches'    && <SwitchesTab />}
      {activeTab === 'meter-reads' && <MeterReadsTab />}
      {activeTab === 'compliance'  && <ComplianceTab />}
    </div>
  );
}
