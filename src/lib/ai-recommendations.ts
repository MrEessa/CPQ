import { Customer, Product, UsageProfile } from '@/lib/types';
import { calculateCost } from '@/lib/pricing-engine';

export interface AIRecommendation {
  productId: string;
  confidence: 'high' | 'medium';
  reason: string;
  detailLines: string[];
  estimatedSavingVsFlat?: number; // £/yr positive = cheaper than flat rate, not set for export (it's income, not a saving)
}

const FLAT_RATE_BASELINE_ID = 'prod-001'; // StandardElec-v2

export function getAIRecommendations(
  customer: Customer,
  eligibleProducts: Product[],
  allProducts: Product[],
  annualUsageKwh: number,
  usageProfile?: UsageProfile,
  annualExportKwh?: number,
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const eligibleIds = new Set(eligibleProducts.map((p) => p.id));

  function cost(product: Product): number {
    return calculateCost({ product, annualUsageKwh, usageProfile, annualExportKwh }).subtotal;
  }

  // Baseline: cost on the flat-rate tariff (if eligible) for savings comparisons
  const baseline = allProducts.find((p) => p.id === FLAT_RATE_BASELINE_ID);
  const baselineCost = baseline && eligibleIds.has(baseline.id) ? cost(baseline) : null;

  function saving(product: Product): number | undefined {
    if (baselineCost === null) return undefined;
    return baselineCost - cost(product);
  }

  // ── Rule 1: EV owner with smart meter → AgileEV-v1 ───────────────────────────
  const agileEV = eligibleProducts.find((p) => p.id === 'prod-007');
  if (customer.meterType === 'smart' && customer.hasEV && agileEV) {
    const s = saving(agileEV);
    recommendations.push({
      productId: agileEV.id,
      confidence: 'high',
      reason: 'Optimised for EV owners',
      detailLines: [
        'Super off-peak rate of 8p/kWh for overnight charging (00:00–07:00)',
        'Smart meter tracks half-hourly consumption for accurate overnight billing',
        s !== undefined && s > 0
          ? `Estimated £${s.toFixed(0)}/yr cheaper than a flat-rate tariff at this usage profile`
          : 'Potential for significant savings when EV charging shifts to overnight window',
      ],
      estimatedSavingVsFlat: s,
    });
  }

  // ── Rule 2: Solar panel owner → SolarExport-v2 ───────────────────────────────
  const solarExport = eligibleProducts.find((p) => p.id === 'prod-008');
  if (customer.hasSolar && solarExport) {
    const exportKwh = annualExportKwh ?? 1200;
    const exportIncome = calculateCost({
      product: solarExport,
      annualUsageKwh,
      annualExportKwh: exportKwh,
    }).subtotal;
    recommendations.push({
      productId: solarExport.id,
      confidence: 'high',
      reason: 'Unlock solar export income',
      detailLines: [
        `Earn 15p/kWh for every unit exported back to the grid`,
        `At ${exportKwh.toLocaleString()} kWh estimated annual export: £${exportIncome.toFixed(0)}/yr income`,
        'Smart Export Guarantee (SEG) — Ofgem-mandated, no additional contract needed',
      ],
    });
  }

  // ── Rule 3: Smart meter, no EV → EcoTOU-v1 ───────────────────────────────────
  const ecoTOU = eligibleProducts.find((p) => p.id === 'prod-002');
  if (
    customer.meterType === 'smart' &&
    !customer.hasEV &&
    ecoTOU &&
    !recommendations.some((r) => r.productId === ecoTOU.id)
  ) {
    const s = saving(ecoTOU);
    recommendations.push({
      productId: ecoTOU.id,
      confidence: s !== undefined && s > 30 ? 'high' : 'medium',
      reason: 'Smart meter unlocks time-of-use savings',
      detailLines: [
        'Day rate 28p/kWh · Night rate 14p/kWh — half the daytime cost',
        'Dishwasher, washing machine, and overnight appliances benefit immediately',
        s !== undefined && s > 0
          ? `Estimated £${s.toFixed(0)}/yr saving vs flat rate at this usage profile`
          : 'Shift 30% of load to off-peak to see material savings',
      ],
      estimatedSavingVsFlat: s,
    });
  }

  // ── Rule 4: Residential customer → GreenBundle-v1 ────────────────────────────
  const bundle = eligibleProducts.find((p) => p.id === 'prod-005');
  if (customer.customerType === 'residential' && bundle && !recommendations.some((r) => r.productId === bundle.id)) {
    const s = saving(bundle);
    recommendations.push({
      productId: bundle.id,
      confidence: 'medium',
      reason: 'Dual-fuel bundle simplifies billing',
      detailLines: [
        'Electricity and gas under one contract, one bill, one direct debit',
        'Combined standing charge lower than two separate tariffs',
        s !== undefined && s > 0
          ? `Estimated £${s.toFixed(0)}/yr vs flat rate electricity alone`
          : 'Green-certified electricity included at no additional premium',
      ],
      estimatedSavingVsFlat: s,
    });
  }

  // ── Rule 5: High usage + smart meter → AgileElec-v1 ──────────────────────────
  const agile = eligibleProducts.find((p) => p.id === 'prod-003');
  if (
    annualUsageKwh > 10000 &&
    customer.meterType === 'smart' &&
    agile &&
    !recommendations.some((r) => r.productId === agile.id)
  ) {
    const s = saving(agile);
    recommendations.push({
      productId: agile.id,
      confidence: 'medium',
      reason: 'High-usage sites benefit most from dynamic pricing',
      detailLines: [
        'Agile-style rates track the wholesale market — off-peak window at 18p/kWh',
        `At ${annualUsageKwh.toLocaleString()} kWh/yr, shifting 20% of load to off-peak saves significantly`,
        s !== undefined && s > 0
          ? `Estimated £${s.toFixed(0)}/yr saving vs flat rate`
          : 'Savings scale with load flexibility and off-peak shift percentage',
      ],
      estimatedSavingVsFlat: s,
    });
  }

  // Return top 2 recommendations
  return recommendations.slice(0, 2);
}
