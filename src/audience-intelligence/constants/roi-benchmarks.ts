import type { RecommendedChannel } from "../types/channel-recommendation.types";

export const OPEN_RATE_BENCHMARKS: Record<RecommendedChannel, number> = {
  WhatsApp: 74,
  Email: 44,
  SMS: 58,
};

export const CTR_BENCHMARKS: Record<RecommendedChannel, number> = {
  WhatsApp: 8.5,
  Email: 3.2,
  SMS: 5.1,
};

export const DELIVERY_RATE_BENCHMARKS: Record<RecommendedChannel, number> = {
  WhatsApp: 98,
  Email: 95,
  SMS: 97,
};

export const AVG_ORDER_VALUE_INR = 420;

export const CLICK_TO_PURCHASE_RATE = 0.12;

export const REVENUE_RANGE_SPREAD = 0.22;

// estimated cost per message in INR for ROI calculation
export const COST_PER_MESSAGE_INR: Record<RecommendedChannel, number> = {
  WhatsApp: 0.85,
  Email: 0.15,
  SMS: 0.35,
};

// baseline campaign setup cost in INR
export const CAMPAIGN_SETUP_COST_INR = 500;

// objective-specific engagement multiplier applied to open/ctr benchmarks
export const OBJECTIVE_ENGAGEMENT_MULTIPLIER: Record<string, number> = {
  WIN_BACK: 1.05,
  REACTIVATION: 1.04,
  RETENTION: 1.02,
  LOYALTY: 1.08,
  UPSELL: 0.98,
  CROSS_SELL: 0.97,
  PRODUCT_LAUNCH: 1.06,
  AWARENESS: 0.95,
  FOOTFALL: 1.0,
  DISCOUNT_PROMOTION: 1.1,
};

export const RFM_SEGMENTS = [
  "Champion",
  "Loyal Customer",
  "Big Spender",
  "At Risk",
  "Lost Customer",
] as const;
