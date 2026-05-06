import { MarketMessage, MarketMessageStatus, Switch, SwitchStage } from '@/lib/types';

// ─── Market message status transitions ────────────────────────────────────────

export const MESSAGE_STATUS_TRANSITIONS: Record<MarketMessageStatus, MarketMessageStatus[]> = {
  sent: ['acknowledged', 'failed', 'rejected'],
  acknowledged: ['completed', 'failed'],
  completed: [],
  failed: ['sent'], // retry re-queues as sent
  rejected: [],
};

// ─── Switch stage transitions ─────────────────────────────────────────────────

export const SWITCH_STAGE_TRANSITIONS: Record<SwitchStage, SwitchStage[]> = {
  initiated: ['confirmed', 'objected', 'rejected'],
  confirmed: ['completed', 'objected'],
  completed: [],
  objected: [],
  rejected: [],
};

// ─── Message helpers ──────────────────────────────────────────────────────────

export function retryMarketMessage(message: MarketMessage): MarketMessage {
  const allowed = MESSAGE_STATUS_TRANSITIONS[message.status];
  if (!allowed.includes('sent')) {
    throw new Error(
      `Cannot retry message in status: ${message.status}. Only failed messages can be retried.`,
    );
  }
  return {
    ...message,
    status: 'sent',
    retryCount: message.retryCount + 1,
    sentAt: new Date().toISOString(),
    errorReason: undefined,
  };
}

// ─── Switch helpers ───────────────────────────────────────────────────────────

export function objectSwitch(sw: Switch, reason: string): Switch {
  const allowed = SWITCH_STAGE_TRANSITIONS[sw.stage];
  if (!allowed.includes('objected')) {
    throw new Error(
      `Cannot object to switch in stage: ${sw.stage}. Objection is only valid from initiated or confirmed.`,
    );
  }
  return {
    ...sw,
    stage: 'objected',
    objectedAt: new Date().toISOString(),
    objectionReason: reason,
  };
}
