import { Market } from '@/lib/types';
import { SEED_MARKETS } from './seed';

const store: Market[] = [...SEED_MARKETS];

export function getMarkets(): Market[] {
  return [...store];
}

export function getMarket(code: string): Market | undefined {
  return store.find((m) => m.code === code);
}

export function addMarket(market: Market): Market {
  if (store.some((m) => m.code === market.code)) {
    throw new Error(`Market with code "${market.code}" already exists`);
  }
  store.push({ ...market });
  return market;
}

export function updateMarket(code: string, updates: Partial<Omit<Market, 'code'>>): Market {
  const idx = store.findIndex((m) => m.code === code);
  if (idx === -1) throw new Error(`Market "${code}" not found`);
  store[idx] = { ...store[idx], ...updates };
  return { ...store[idx] };
}
