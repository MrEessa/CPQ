import { Bill, BillStatus, Payment } from '@/lib/types';
import { SEED_BILLS } from '@/lib/data/seed';
import { appendAuditEntry, appendLedgerEntry } from '@/lib/data/finance';

// Bill status transition graph — mirrors the quote-engine ALLOWED_TRANSITIONS pattern
const BILL_STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  issued: ['paid', 'overdue', 'disputed'],
  overdue: ['paid', 'disputed'],
  disputed: ['issued', 'paid'],
  paid: [],
};

interface BillFilters {
  customerId?: string;
  status?: BillStatus[];
}

let store: Bill[] = structuredClone(SEED_BILLS);

export function getBills(filters?: BillFilters): Bill[] {
  let result = store;

  if (filters?.customerId) {
    result = result.filter((b) => b.customerId === filters.customerId);
  }
  if (filters?.status?.length) {
    result = result.filter((b) => filters.status!.includes(b.status));
  }

  return result;
}

export function getBillById(id: string): Bill | undefined {
  return store.find((b) => b.id === id);
}

export function getBillsForCustomer(customerId: string): Bill[] {
  return store.filter((b) => b.customerId === customerId);
}

export function addBill(bill: Bill): Bill {
  store = [...store, structuredClone(bill)];
  appendAuditEntry({
    action: 'bill_generated',
    entityType: 'bill',
    entityId: bill.id,
    description: `Bill ${bill.reference} generated for customer ${bill.customerId} — £${bill.amountDue.toFixed(2)}`,
    meta: { customerId: bill.customerId, productId: bill.productId, amountDue: bill.amountDue },
  });
  appendLedgerEntry({
    customerId: bill.customerId,
    billId: bill.id,
    type: 'charge',
    amount: bill.amountDue,
    description: `Bill ${bill.reference} — ${bill.periodFrom} to ${bill.periodTo}`,
    effectiveDate: bill.issuedAt.split('T')[0],
  });
  return bill;
}

export function recordPayment(
  billId: string,
  payment: Omit<Payment, 'id' | 'billId'>,
): Bill | undefined {
  const index = store.findIndex((b) => b.id === billId);
  if (index === -1) return undefined;

  const bill = store[index];
  const newPayment: Payment = {
    ...payment,
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    billId,
  };
  const newAmountPaid = parseFloat((bill.amountPaid + payment.amount).toFixed(2));
  const newStatus: BillStatus = newAmountPaid >= bill.amountDue ? 'paid' : bill.status;

  const updated: Bill = {
    ...bill,
    payments: [...bill.payments, newPayment],
    amountPaid: newAmountPaid,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  store = [...store.slice(0, index), updated, ...store.slice(index + 1)];

  appendAuditEntry({
    action: 'payment_recorded',
    entityType: 'bill',
    entityId: billId,
    description: `Payment of £${payment.amount.toFixed(2)} recorded on bill ${bill.reference}`,
    meta: { customerId: bill.customerId, method: payment.method, amount: payment.amount },
  });
  appendLedgerEntry({
    customerId: bill.customerId,
    billId,
    paymentId: newPayment.id,
    type: 'payment',
    amount: payment.amount,
    description: `Payment received for ${bill.reference} via ${payment.method}`,
    effectiveDate: payment.paidAt.split('T')[0],
  });

  return updated;
}

export function updateBillStatus(billId: string, newStatus: BillStatus): Bill | undefined {
  const index = store.findIndex((b) => b.id === billId);
  if (index === -1) return undefined;

  const bill = store[index];
  const allowed = BILL_STATUS_TRANSITIONS[bill.status];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid bill status transition: ${bill.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
    );
  }

  const updated: Bill = {
    ...bill,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  store = [...store.slice(0, index), updated, ...store.slice(index + 1)];
  return updated;
}

export { BILL_STATUS_TRANSITIONS };
