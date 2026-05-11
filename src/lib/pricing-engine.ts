import { CostBreakdown, PricingInput, Product, PricingStructure } from '@/lib/types';
import { getProductById } from '@/lib/data/products';

const DAYS_PER_YEAR = 365;
const PENCE_PER_POUND = 100;

// Default TOU usage split when no profile is supplied
const DEFAULT_PEAK_PERCENT = 60;
const DEFAULT_OFF_PEAK_PERCENT = 40;

function buildBreakdown(
  pricingStructure: PricingStructure,
  annualUsageKwh: number,
  peakPercent: number,
  offPeakPercent: number,
  nightPercent?: number,
): CostBreakdown {
  const { standingCharge = 0, rates, vatRate, levies = [] } = pricingStructure;

  const standingChargeAnnual =
    (standingCharge * DAYS_PER_YEAR) / PENCE_PER_POUND;

  const rateLines = rates.map((rate, index) => {
    let kwhUsed: number;

    if (rates.length === 1) {
      kwhUsed = annualUsageKwh;
    } else if (index === 0) {
      // First rate band → peak (or only-band for multi-rate dynamic)
      kwhUsed = (annualUsageKwh * peakPercent) / 100;
    } else if (index === rates.length - 1 && nightPercent !== undefined) {
      kwhUsed = (annualUsageKwh * nightPercent) / 100;
    } else if (index === rates.length - 1) {
      kwhUsed = (annualUsageKwh * offPeakPercent) / 100;
    } else {
      // Middle bands split the remaining proportion evenly
      const remaining = 100 - peakPercent - (nightPercent ?? offPeakPercent);
      const middleBands = rates.length - 2;
      kwhUsed = (annualUsageKwh * (remaining / middleBands)) / 100;
    }

    const cost = (kwhUsed * rate.unitRate) / PENCE_PER_POUND;
    return { label: rate.label, kwhUsed, unitRate: rate.unitRate, cost };
  });

  const leviesTotal =
    levies.reduce((sum, levy) => sum + levy.ratePerKwh * annualUsageKwh, 0) /
    PENCE_PER_POUND;

  const ratesCost = rateLines.reduce((sum, line) => sum + line.cost, 0);
  const subtotal = standingChargeAnnual + ratesCost + leviesTotal;
  const vat = (subtotal * vatRate) / 100;
  const total = subtotal + vat;

  return {
    standingChargeAnnual,
    rateLines,
    leviesTotal,
    subtotal,
    vat,
    total,
  };
}

function resolveProduct(productId: string): Product | undefined {
  return getProductById(productId);
}

// Calculate cost directly from a pricing snapshot — used by quote detail to avoid live-product drift
export function calculateCostFromSnapshot(
  pricingStructure: PricingStructure,
  annualUsageKwh: number,
  usageProfile?: { peakPercent: number; offPeakPercent: number; nightPercent?: number },
): CostBreakdown {
  return buildBreakdown(
    pricingStructure,
    annualUsageKwh,
    usageProfile?.peakPercent ?? DEFAULT_PEAK_PERCENT,
    usageProfile?.offPeakPercent ?? DEFAULT_OFF_PEAK_PERCENT,
    usageProfile?.nightPercent,
  );
}

export function calculateCost(input: PricingInput): CostBreakdown {
  const { product, annualUsageKwh, usageProfile } = input;

  const peakPercent = usageProfile?.peakPercent ?? DEFAULT_PEAK_PERCENT;
  const offPeakPercent = usageProfile?.offPeakPercent ?? DEFAULT_OFF_PEAK_PERCENT;
  const nightPercent = usageProfile?.nightPercent;

  // Bundled products: sum the cost of each component
  if (product.productType === 'bundled' && product.bundleComponents) {
    const components = product.bundleComponents
      .map(resolveProduct)
      .filter((p): p is Product => p !== undefined);

    const componentBreakdowns = components.map((component) =>
      buildBreakdown(
        component.pricingStructure,
        annualUsageKwh,
        peakPercent,
        offPeakPercent,
        nightPercent,
      ),
    );

    if (componentBreakdowns.length === 0) {
      // Fall back to the bundle's own pricing structure
      return buildBreakdown(
        product.pricingStructure,
        annualUsageKwh,
        peakPercent,
        offPeakPercent,
        nightPercent,
      );
    }

    const standingChargeAnnual = componentBreakdowns.reduce(
      (sum, b) => sum + b.standingChargeAnnual,
      0,
    );
    const rateLines = componentBreakdowns.flatMap((b) => b.rateLines);
    const leviesTotal = componentBreakdowns.reduce(
      (sum, b) => sum + b.leviesTotal,
      0,
    );
    const ratesCost = rateLines.reduce((sum, l) => sum + l.cost, 0);
    const subtotal = standingChargeAnnual + ratesCost + leviesTotal;
    // Use the bundle's own VAT rate for the aggregate
    const vatRate = product.pricingStructure.vatRate;
    const vat = (subtotal * vatRate) / 100;
    const total = subtotal + vat;

    return { standingChargeAnnual, rateLines, leviesTotal, subtotal, vat, total };
  }

  return buildBreakdown(
    product.pricingStructure,
    annualUsageKwh,
    peakPercent,
    offPeakPercent,
    nightPercent,
  );
}
