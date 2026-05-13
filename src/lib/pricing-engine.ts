import { CostBreakdown, PricingInput, PricingStructure } from '@/lib/types';

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
  const { product, annualUsageKwh, annualExportKwh, usageProfile } = input;

  // Export tariffs are priced on export volume, not consumption
  const effectiveUsageKwh =
    product.productType === 'export' && annualExportKwh !== undefined
      ? annualExportKwh
      : annualUsageKwh;

  const peakPercent = usageProfile?.peakPercent ?? DEFAULT_PEAK_PERCENT;
  const offPeakPercent = usageProfile?.offPeakPercent ?? DEFAULT_OFF_PEAK_PERCENT;
  const nightPercent = usageProfile?.nightPercent;

  // Bundled products use their own pricingStructure (which aggregates all component rates).
  // bundleComponents is used for display/decomposition in the UI only.
  if (product.productType === 'bundled') {
    return buildBreakdown(
      product.pricingStructure,
      effectiveUsageKwh,
      peakPercent,
      offPeakPercent,
      nightPercent,
    );
  }

  return buildBreakdown(
    product.pricingStructure,
    effectiveUsageKwh,
    peakPercent,
    offPeakPercent,
    nightPercent,
  );
}
