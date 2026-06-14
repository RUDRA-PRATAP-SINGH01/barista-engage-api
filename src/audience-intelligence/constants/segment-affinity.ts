import type { BusinessObjective } from "../types/audience-objective";
import type { SegmentFilters } from "../../validators/segment.validator";

type SegmentSignalAffinity = {
  rfmSegments?: string[];
  churnRisks?: string[];
  loyaltyTiers?: string[];
  favoriteDrinks?: string[];
  minLifetimeSpend?: number;
  minDaysSinceLastOrder?: number;
  nameKeywords?: string[];
};

export const OBJECTIVE_SEGMENT_AFFINITIES: Record<BusinessObjective, SegmentSignalAffinity> = {
  WIN_BACK: {
    rfmSegments: ["Lost Customer", "At Risk"],
    churnRisks: ["HIGH", "MEDIUM"],
    minDaysSinceLastOrder: 30,
    nameKeywords: ["win back", "lost", "lapsed", "churn", "inactive"],
  },
  REACTIVATION: {
    rfmSegments: ["At Risk", "Lost Customer"],
    churnRisks: ["HIGH", "MEDIUM"],
    minDaysSinceLastOrder: 21,
    nameKeywords: ["reactivat", "dormant", "inactive"],
  },
  RETENTION: {
    rfmSegments: ["Loyal Customer", "Champion"],
    churnRisks: ["LOW", "MEDIUM"],
    nameKeywords: ["retention", "loyal", "repeat"],
  },
  LOYALTY: {
    rfmSegments: ["Champion", "Loyal Customer", "Big Spender"],
    loyaltyTiers: ["GOLD", "SILVER"],
    churnRisks: ["LOW"],
    nameKeywords: ["loyal", "gold", "vip", "champion"],
  },
  UPSELL: {
    rfmSegments: ["Big Spender", "Champion"],
    loyaltyTiers: ["GOLD", "SILVER"],
    minLifetimeSpend: 5000,
    nameKeywords: ["high value", "upsell", "premium", "spender"],
  },
  CROSS_SELL: {
    rfmSegments: ["Loyal Customer", "Champion"],
    churnRisks: ["LOW", "MEDIUM"],
    nameKeywords: ["cross", "variety", "explore"],
  },
  PRODUCT_LAUNCH: {
    rfmSegments: ["Champion", "Loyal Customer", "Big Spender"],
    churnRisks: ["LOW", "MEDIUM"],
    nameKeywords: ["launch", "new", "cold brew", "product"],
  },
  AWARENESS: {
    rfmSegments: ["Loyal Customer", "Champion", "Big Spender", "At Risk"],
    nameKeywords: ["awareness", "broad", "all"],
  },
  FOOTFALL: {
    rfmSegments: ["Loyal Customer", "At Risk", "Lost Customer"],
    nameKeywords: ["weekend", "footfall", "store", "visit"],
  },
  DISCOUNT_PROMOTION: {
    rfmSegments: ["At Risk", "Lost Customer", "Loyal Customer"],
    churnRisks: ["HIGH", "MEDIUM"],
    nameKeywords: ["discount", "deal", "offer", "promo"],
  },
};

export function extractNumericThreshold(
  value: number | Record<string, number> | undefined,
): number | null {
  if (value === undefined) return null;
  if (typeof value === "number") return value;
  if (value.gt !== undefined) return value.gt;
  if (value.gte !== undefined) return value.gte;
  if (value.equals !== undefined) return value.equals;
  return null;
}

export function segmentTextBlob(segment: {
  name: string;
  description: string | null;
  rules: SegmentFilters;
}): string {
  const parts = [
    segment.name,
    segment.description ?? "",
    segment.rules.rfmSegment ?? "",
    segment.rules.churnRisk ?? "",
    segment.rules.loyaltyTier ?? "",
    segment.rules.favoriteDrink ?? "",
    segment.rules.city ?? "",
  ];
  return parts.join(" ").toLowerCase();
}
