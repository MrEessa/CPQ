import { FuelType, Product, ProductType } from '@/lib/types';

export interface CatalogueGap {
  id: string;
  market: string;
  priority: 'high' | 'medium';
  title: string;
  description: string;
  rationale: string;
  suggestedProductType: ProductType;
  suggestedFuelType: FuelType;
}

// ─── Rules ────────────────────────────────────────────────────────────────────
// Each rule checks one specific coverage gap for a market.

type GapRule = (marketCode: string, active: Product[]) => CatalogueGap | null;

const rules: GapRule[] = [

  // IE market: no active export tariff
  (market, active) => {
    if (market !== 'IE') return null;
    const hasExport = active.some((p) => p.productType === 'export');
    if (hasExport) return null;
    return {
      id: `${market}-no-export`,
      market,
      priority: 'high',
      title: 'No export tariff',
      description: 'IE market has no active solar export product.',
      rationale: 'Solar panel adoption is growing under the SEAI grant scheme. Customers with installations have no export route — this is a retention and acquisition risk.',
      suggestedProductType: 'export',
      suggestedFuelType: 'electricity',
    };
  },

  // IE market: no active dynamic/agile tariff
  (market, active) => {
    if (market !== 'IE') return null;
    const hasDynamic = active.some((p) => p.productType === 'dynamic');
    if (hasDynamic) return null;
    return {
      id: `${market}-no-dynamic`,
      market,
      priority: 'medium',
      title: 'No dynamic pricing tariff',
      description: 'IE market has no agile or half-hourly electricity product.',
      rationale: 'Smart meter rollout is accelerating under CRU mandate. Without a dynamic tariff, the portfolio cannot serve price-responsive customers or capture demand flexibility value.',
      suggestedProductType: 'dynamic',
      suggestedFuelType: 'electricity',
    };
  },

  // IE market: no bundled/dual-fuel offer
  (market, active) => {
    if (market !== 'IE') return null;
    const hasBundle = active.some((p) => p.productType === 'bundled');
    if (hasBundle) return null;
    return {
      id: `${market}-no-bundle`,
      market,
      priority: 'medium',
      title: 'No dual-fuel bundle',
      description: 'IE market has no bundled electricity and gas proposition.',
      rationale: 'Bundled tariffs reduce churn and simplify billing for residential customers. Gas is still the primary heating fuel in Ireland — a bundle closes the retention gap against competitors.',
      suggestedProductType: 'bundled',
      suggestedFuelType: 'dual_fuel',
    };
  },

  // GB market: no dedicated heat pump tariff
  (market, active) => {
    if (market !== 'GB') return null;
    const hasHeatPump = active.some((p) =>
      p.eligibilityRules.some((r) => r.field === 'hasHeatPump'),
    );
    if (hasHeatPump) return null;
    return {
      id: `${market}-no-heat-pump`,
      market,
      priority: 'high',
      title: 'No heat pump tariff',
      description: 'GB market has no dedicated heat pump electricity product.',
      rationale: 'Heat pump installations are growing rapidly under the Boiler Upgrade Scheme. A dedicated off-peak TOU tariff (e.g. cheap overnight rate for thermal storage) is a key acquisition lever for this segment.',
      suggestedProductType: 'time_of_use',
      suggestedFuelType: 'electricity',
    };
  },

  // GB market: no battery/V2G tariff
  (market, active) => {
    if (market !== 'GB') return null;
    const hasBattery = active.some((p) =>
      p.eligibilityRules.some((r) => r.field === 'hasBattery'),
    );
    if (hasBattery) return null;
    return {
      id: `${market}-no-battery`,
      market,
      priority: 'medium',
      title: 'No battery storage tariff',
      description: 'GB market has no product designed for home battery or V2G customers.',
      rationale: 'Battery prices are falling and V2G pilots are expanding. A dynamic tariff that rewards discharge during peak hours would differentiate the portfolio and capture demand flexibility revenue.',
      suggestedProductType: 'dynamic',
      suggestedFuelType: 'electricity',
    };
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCatalogueGaps(
  allProducts: Product[],
  marketFilter?: string,
): CatalogueGap[] {
  const markets = marketFilter ? [marketFilter] : ['GB', 'IE'];
  const gaps: CatalogueGap[] = [];

  for (const market of markets) {
    const activeForMarket = allProducts.filter(
      (p) => p.status === 'active' && p.market.some((m) => m.code === market),
    );
    for (const rule of rules) {
      const gap = rule(market, activeForMarket);
      if (gap) gaps.push(gap);
    }
  }

  // High priority first, then medium; max 4 to avoid overwhelming the UI
  return gaps
    .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1))
    .slice(0, 4);
}
