import { CustomerType, Quote, QuoteStatus } from '@/lib/types';
import { SEED_QUOTES } from '@/lib/data/seed';

interface QuoteFilters {
  status?: QuoteStatus[];
  customerType?: CustomerType[];
}

let store: Quote[] = structuredClone(SEED_QUOTES);

export function getQuotes(filters?: QuoteFilters): Quote[] {
  let result = store;

  if (filters?.status?.length) {
    result = result.filter((q) => filters.status!.includes(q.status));
  }
  if (filters?.customerType?.length) {
    result = result.filter((q) => filters.customerType!.includes(q.customerType));
  }

  return result;
}

export function getQuoteById(id: string): Quote | undefined {
  return store.find((q) => q.id === id);
}

export function saveQuote(quote: Quote): Quote {
  const index = store.findIndex((q) => q.id === quote.id);
  if (index === -1) {
    store = [...store, quote];
  } else {
    store = [...store.slice(0, index), quote, ...store.slice(index + 1)];
  }
  return quote;
}

export function getRecentQuotes(limit: number): Quote[] {
  return [...store]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
