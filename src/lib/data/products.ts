import { Product, ProductStatus, ProductType } from '@/lib/types';
import { SEED_PRODUCTS } from '@/lib/data/seed';

interface ProductFilters {
  status?: ProductStatus[];
  productType?: ProductType[];
  market?: string;
}

let store: Product[] = structuredClone(SEED_PRODUCTS);

export function getProducts(filters?: ProductFilters): Product[] {
  let result = store;

  if (filters?.status?.length) {
    result = result.filter((p) => filters.status!.includes(p.status));
  }
  if (filters?.productType?.length) {
    result = result.filter((p) => filters.productType!.includes(p.productType));
  }
  if (filters?.market) {
    const code = filters.market;
    result = result.filter((p) => p.market.some((m) => m.code === code));
  }

  return result;
}

export function getProductById(id: string): Product | undefined {
  return store.find((p) => p.id === id);
}

export function addProduct(
  draft: Omit<Product, 'id' | 'status' | 'version' | 'createdAt' | 'updatedAt'>,
): Product {
  const now = new Date().toISOString();
  const product: Product = {
    ...structuredClone(draft),
    id: `prod-${Date.now()}`,
    status: 'draft',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  store = [...store, product];
  return product;
}

export function updateProductStatus(
  id: string,
  status: ProductStatus,
): Product | undefined {
  const index = store.findIndex((p) => p.id === id);
  if (index === -1) return undefined;

  const updated: Product = {
    ...store[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  store = [...store.slice(0, index), updated, ...store.slice(index + 1)];
  return updated;
}
