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

// average order value in INR used for revenue estimation formulas
export const AVG_ORDER_VALUE_INR = 420;

// conversion rate applied to clicks for revenue estimation
export const CLICK_TO_PURCHASE_RATE = 0.12;

// revenue range spread factor for min/max band
export const REVENUE_RANGE_SPREAD = 0.22;
