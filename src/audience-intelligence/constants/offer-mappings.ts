import type { BusinessObjective } from "../types/audience-objective";

export type OfferRecommendation = {
  bestOffer: string;
  bestTiming: string;
};

export const OBJECTIVE_OFFER_MAPPINGS: Record<BusinessObjective, OfferRecommendation> = {
  WIN_BACK: {
    bestOffer: "15% comeback discount",
    bestTiming: "Tuesday 10 AM",
  },
  REACTIVATION: {
    bestOffer: "Free drink on next visit",
    bestTiming: "Wednesday 11 AM",
  },
  RETENTION: {
    bestOffer: "Loyalty bonus points on next order",
    bestTiming: "Thursday 9 AM",
  },
  LOYALTY: {
    bestOffer: "Exclusive member reward",
    bestTiming: "Friday 10 AM",
  },
  UPSELL: {
    bestOffer: "Premium combo upgrade at 10% off",
    bestTiming: "Saturday 11 AM",
  },
  CROSS_SELL: {
    bestOffer: "Bundle deal on complementary items",
    bestTiming: "Sunday 10 AM",
  },
  PRODUCT_LAUNCH: {
    bestOffer: "Early access tasting offer",
    bestTiming: "Tuesday 10 AM",
  },
  AWARENESS: {
    bestOffer: "Brand story spotlight with welcome perk",
    bestTiming: "Monday 9 AM",
  },
  FOOTFALL: {
    bestOffer: "Weekend in-store exclusive",
    bestTiming: "Friday 5 PM",
  },
  DISCOUNT_PROMOTION: {
    bestOffer: "Limited-time discount code",
    bestTiming: "Wednesday 12 PM",
  },
};
