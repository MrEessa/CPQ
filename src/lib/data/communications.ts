import { Communication, CommunicationChannel } from '@/lib/types';
import { SEED_COMMUNICATIONS } from '@/lib/data/seed';

interface CommunicationFilters {
  customerId?: string;
  channel?: CommunicationChannel;
  direction?: 'inbound' | 'outbound';
}

let store: Communication[] = structuredClone(SEED_COMMUNICATIONS);

export function getCommunications(filters?: CommunicationFilters): Communication[] {
  let result = store;

  if (filters?.customerId) {
    result = result.filter((c) => c.customerId === filters.customerId);
  }
  if (filters?.channel) {
    result = result.filter((c) => c.channel === filters.channel);
  }
  if (filters?.direction) {
    result = result.filter((c) => c.direction === filters.direction);
  }

  return result;
}

export function getCommunicationsForCustomer(customerId: string): Communication[] {
  return store.filter((c) => c.customerId === customerId);
}

export function addCommunication(draft: Omit<Communication, 'id'>): Communication {
  const communication: Communication = {
    ...structuredClone(draft),
    id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  store = [...store, communication];
  return communication;
}
