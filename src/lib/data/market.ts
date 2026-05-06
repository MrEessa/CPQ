import {
  ComplianceItem,
  ComplianceStatus,
  MarketMessage,
  MarketMessageStatus,
  MeterReading,
  Switch,
  SwitchStage,
} from '@/lib/types';
import {
  SEED_COMPLIANCE_ITEMS,
  SEED_MARKET_MESSAGES,
  SEED_METER_READINGS,
  SEED_SWITCHES,
} from '@/lib/data/seed';
import { appendAuditEntry } from '@/lib/data/finance';
import { objectSwitch, retryMarketMessage } from '@/lib/market-engine';

let messageStore: MarketMessage[] = structuredClone(SEED_MARKET_MESSAGES);
let switchStore: Switch[] = structuredClone(SEED_SWITCHES);
let meterReadStore: MeterReading[] = structuredClone(SEED_METER_READINGS);
let complianceStore: ComplianceItem[] = structuredClone(SEED_COMPLIANCE_ITEMS);

// ─── Market messages ──────────────────────────────────────────────────────────

export function getMarketMessages(filters?: {
  customerId?: string;
  status?: MarketMessageStatus;
}): MarketMessage[] {
  let result = messageStore;
  if (filters?.customerId) {
    result = result.filter((m) => m.customerId === filters.customerId);
  }
  if (filters?.status) {
    result = result.filter((m) => m.status === filters.status);
  }
  return result;
}

export function retryMessage(messageId: string): MarketMessage | undefined {
  const index = messageStore.findIndex((m) => m.id === messageId);
  if (index === -1) return undefined;

  const updated = retryMarketMessage(messageStore[index]);
  messageStore = [...messageStore.slice(0, index), updated, ...messageStore.slice(index + 1)];

  appendAuditEntry({
    action: 'message_retried',
    entityType: 'market_message',
    entityId: messageId,
    description: `Market message ${messageId} retried (attempt ${updated.retryCount})`,
  });

  return updated;
}

// ─── Switches ─────────────────────────────────────────────────────────────────

export function getSwitches(filters?: {
  customerId?: string;
  stage?: SwitchStage;
}): Switch[] {
  let result = switchStore;
  if (filters?.customerId) {
    result = result.filter((s) => s.customerId === filters.customerId);
  }
  if (filters?.stage) {
    result = result.filter((s) => s.stage === filters.stage);
  }
  return result;
}

export function objectToSwitch(switchId: string, reason: string): Switch | undefined {
  const index = switchStore.findIndex((s) => s.id === switchId);
  if (index === -1) return undefined;

  const updated = objectSwitch(switchStore[index], reason);
  switchStore = [...switchStore.slice(0, index), updated, ...switchStore.slice(index + 1)];

  appendAuditEntry({
    action: 'switch_objected',
    entityType: 'switch',
    entityId: switchId,
    description: `Switch ${switchId} objected: ${reason}`,
    meta: { reason },
  });

  return updated;
}

// ─── Meter readings ───────────────────────────────────────────────────────────

export function getMeterReadings(filters?: { customerId?: string }): MeterReading[] {
  if (filters?.customerId) {
    return meterReadStore.filter((r) => r.customerId === filters.customerId);
  }
  return meterReadStore;
}

export function submitMeterRead(draft: Omit<MeterReading, 'id'>): MeterReading {
  const reading: MeterReading = {
    ...structuredClone(draft),
    id: `read-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  meterReadStore = [...meterReadStore, reading];

  appendAuditEntry({
    action: 'meter_read_submitted',
    entityType: 'meter_reading',
    entityId: reading.id,
    description: `Meter read submitted for customer ${reading.customerId}: ${reading.readingKwh} kWh`,
    meta: { customerId: reading.customerId, readingKwh: reading.readingKwh },
  });

  return reading;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export function getComplianceItems(filters?: { status?: ComplianceStatus }): ComplianceItem[] {
  if (filters?.status) {
    return complianceStore.filter((c) => c.status === filters.status);
  }
  return complianceStore;
}

export function updateComplianceItem(
  id: string,
  updates: Partial<Pick<ComplianceItem, 'status' | 'assignedTo' | 'completedAt' | 'dueDate'>>,
): ComplianceItem | undefined {
  const index = complianceStore.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const updated: ComplianceItem = { ...complianceStore[index], ...updates };
  complianceStore = [...complianceStore.slice(0, index), updated, ...complianceStore.slice(index + 1)];

  appendAuditEntry({
    action: 'compliance_item_updated',
    entityType: 'compliance_item',
    entityId: id,
    description: `Compliance item ${id} updated${updates.status ? ` — status: ${updates.status}` : ''}`,
  });

  return updated;
}
