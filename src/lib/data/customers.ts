import { Customer, CustomerStatus, CustomerType } from '@/lib/types';
import { SEED_CUSTOMERS } from '@/lib/data/seed';
import { appendAuditEntry } from '@/lib/data/finance';

interface CustomerFilters {
  status?: CustomerStatus[];
  customerType?: CustomerType[];
  market?: string;
}

let store: Customer[] = structuredClone(SEED_CUSTOMERS);

export function getCustomers(filters?: CustomerFilters): Customer[] {
  let result = store;

  if (filters?.status?.length) {
    result = result.filter((c) => filters.status!.includes(c.status));
  }
  if (filters?.customerType?.length) {
    result = result.filter((c) => filters.customerType!.includes(c.customerType));
  }
  if (filters?.market) {
    result = result.filter((c) => c.market === filters.market);
  }

  return result;
}

export function getCustomerById(id: string): Customer | undefined {
  return store.find((c) => c.id === id);
}

export function addCustomer(
  draft: Omit<Customer, 'id' | 'accountRef' | 'status' | 'createdAt' | 'updatedAt'>,
): Customer {
  const now = new Date().toISOString();
  const seq = store.length + 1;
  const customer: Customer = {
    ...structuredClone(draft),
    id: `cust-${Date.now()}`,
    accountRef: `ACC-${String(seq).padStart(5, '0')}`,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  store = [...store, customer];
  appendAuditEntry({
    action: 'customer_updated',
    entityType: 'customer',
    entityId: customer.id,
    description: `Customer ${customer.name} (${customer.accountRef}) created`,
  });
  return customer;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer | undefined {
  const index = store.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const updated: Customer = {
    ...store[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  store = [...store.slice(0, index), updated, ...store.slice(index + 1)];
  appendAuditEntry({
    action: 'customer_updated',
    entityType: 'customer',
    entityId: id,
    description: `Customer ${updated.name} (${updated.accountRef}) updated`,
  });
  return updated;
}
