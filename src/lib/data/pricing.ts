import { Levy, PricingStructure, ProductType } from '@/lib/types';
import { getProductById, getProducts } from '@/lib/data/products';

export interface PricingRuleRow {
  productId: string;
  productName: string;
  productType: ProductType;
  rateId: string;
  rateLabel: string;
  unitRate: number;
  currency: string;
  standingCharge?: number;
  vatRate: number;
  levies: Levy[];
}

export function getAllPricingRules(marketCode?: string): PricingRuleRow[] {
  const products = getProducts(marketCode ? { market: marketCode } : undefined);

  return products.flatMap((product) =>
    product.pricingStructure.rates.map((rate) => ({
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      rateId: rate.id,
      rateLabel: rate.label,
      unitRate: rate.unitRate,
      currency: product.pricingStructure.currency,
      standingCharge: product.pricingStructure.standingCharge,
      vatRate: product.pricingStructure.vatRate,
      levies: product.pricingStructure.levies ?? [],
    })),
  );
}

export function getProductPricing(productId: string): PricingStructure | undefined {
  return getProductById(productId)?.pricingStructure;
}
