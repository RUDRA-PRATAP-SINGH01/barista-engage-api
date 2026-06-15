import type { BusinessObjective } from "../types/audience-objective";
import type { RecommendedChannel } from "../types/channel-recommendation.types";
import type { AudienceEconomics } from "../types/audience-economics.types";
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
import {
  deriveQualityMultipliers,
  resolveOrderValue,
} from "../utils/audience-quality-multipliers";

export type RoiForecastInput = {
  audienceSize: number;
  channel: RecommendedChannel;
  objective: BusinessObjective;
  audienceEconomics: AudienceEconomics;
  populationEconomics: AudienceEconomics;
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

const MAX_EXPECTED_OPEN_RATE = 95;
const MAX_EXPECTED_CTR = 22;

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

    const { responseMultiplier, conversionMultiplier, revenueMultiplier } =
      deriveQualityMultipliers(input.audienceEconomics, input.populationEconomics);

    const orderValue = resolveOrderValue(
      input.audienceEconomics,
      input.populationEconomics,
      AVG_ORDER_VALUE_INR,
    );

    const expectedReach = round0(input.audienceSize * deliveryRate);
    const expectedOpenRate = round1(
      Math.min(
        MAX_EXPECTED_OPEN_RATE,
        openBenchmark * 100 * objectiveMultiplier * responseMultiplier,
      ),
    );
    const expectedCtr = round1(
      Math.min(
        MAX_EXPECTED_CTR,
        ctrBenchmark * 100 * objectiveMultiplier * responseMultiplier,
      ),
    );

    const expectedOpens = expectedReach * (expectedOpenRate / 100);
    const expectedClicks = expectedOpens * (expectedCtr / 100);
    const rawConversions =
      expectedClicks * CLICK_TO_PURCHASE_RATE * conversionMultiplier;
    const expectedConversions = round0(rawConversions);

    const baseRevenue = rawConversions * orderValue * revenueMultiplier;
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
