import type { BusinessObjective } from "../types/audience-objective";
import type { RecommendedChannel } from "../types/channel-recommendation.types";
import {
  AVG_ORDER_VALUE_INR,
  CAMPAIGN_SETUP_COST_INR,
  CLICK_TO_PURCHASE_RATE,
  COST_PER_MESSAGE_INR,
  CTR_BENCHMARKS,
  DELIVERY_RATE_BENCHMARKS,
  OBJECTIVE_ENGAGEMENT_MULTIPLIER,
  OPEN_RATE_BENCHMARKS,
  REVENUE_RANGE_SPREAD,
} from "../constants/roi-benchmarks";

export type RoiForecastInput = {
  audienceSize: number;
  channel: RecommendedChannel;
  objective: BusinessObjective;
};

export type RoiForecastResult = {
  expectedReach: number;
  expectedOpenRate: number;
  expectedCtr: number;
  expectedConversions: number;
  expectedRevenueImpact: {
    min: number;
    max: number;
  };
  roi: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round0(value: number): number {
  return Math.round(value);
}

export class AudienceRoiForecastService {
  forecast(input: RoiForecastInput): RoiForecastResult {
    const deliveryRate = DELIVERY_RATE_BENCHMARKS[input.channel] / 100;
    const openBenchmark = OPEN_RATE_BENCHMARKS[input.channel] / 100;
    const ctrBenchmark = CTR_BENCHMARKS[input.channel] / 100;
    const objectiveMultiplier = OBJECTIVE_ENGAGEMENT_MULTIPLIER[input.objective] ?? 1;

    const expectedReach = round0(input.audienceSize * deliveryRate);
    const expectedOpenRate = round1(openBenchmark * 100 * objectiveMultiplier);
    const expectedCtr = round1(ctrBenchmark * 100 * objectiveMultiplier);

    const expectedOpens = expectedReach * (expectedOpenRate / 100);
    const expectedClicks = expectedOpens * (expectedCtr / 100);
    const expectedConversions = round0(expectedClicks * CLICK_TO_PURCHASE_RATE);

    const baseRevenue = expectedConversions * AVG_ORDER_VALUE_INR;
    const spread = baseRevenue * REVENUE_RANGE_SPREAD;

    const campaignCost =
      CAMPAIGN_SETUP_COST_INR + input.audienceSize * COST_PER_MESSAGE_INR[input.channel];
    const midRevenue = baseRevenue;
    const roi = campaignCost > 0 ? round1(midRevenue / campaignCost) : 0;

    return {
      expectedReach,
      expectedOpenRate,
      expectedCtr,
      expectedConversions,
      expectedRevenueImpact: {
        min: round0(Math.max(0, baseRevenue - spread)),
        max: round0(baseRevenue + spread),
      },
      roi,
    };
  }
}
