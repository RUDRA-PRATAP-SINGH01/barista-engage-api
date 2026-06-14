import type { RecommendedChannel } from "./channel-recommendation.types";

export type AudienceForecast = {
  expectedReach: number;
  expectedOpenRate: number;
  expectedCtr: number;
  expectedRevenueImpact: {
    min: number;
    max: number;
  };
};

export type ForecastInput = {
  audienceSize: number;
  channel: RecommendedChannel;
  objectiveScore: number;
  avgLifetimeSpendHint: number;
};
