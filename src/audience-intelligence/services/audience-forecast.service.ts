import type { AudienceForecast, ForecastInput } from "../types/audience-forecast.types";
import {
  AVG_ORDER_VALUE_INR,
  CLICK_TO_PURCHASE_RATE,
  CTR_BENCHMARKS,
  DELIVERY_RATE_BENCHMARKS,
  OPEN_RATE_BENCHMARKS,
  REVENUE_RANGE_SPREAD,
} from "../constants/open-rate-benchmarks";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round0(value: number): number {
  return Math.round(value);
}

export class AudienceForecastService {
  forecast(input: ForecastInput): AudienceForecast {
    const deliveryRate = DELIVERY_RATE_BENCHMARKS[input.channel] / 100;
    const openRate = OPEN_RATE_BENCHMARKS[input.channel] / 100;
    const ctr = CTR_BENCHMARKS[input.channel] / 100;

    const objectiveMultiplier = 0.85 + (input.objectiveScore / 100) * 0.3;
    const spendMultiplier = Math.max(0.8, Math.min(1.5, input.avgLifetimeSpendHint / 5000));

    const expectedReach = round0(input.audienceSize * deliveryRate);
    const expectedOpenRate = round1(openRate * 100 * objectiveMultiplier);
    const expectedCtr = round1(ctr * 100 * objectiveMultiplier);

    const expectedClicks = expectedReach * (expectedOpenRate / 100) * (expectedCtr / 100);
    const expectedOrders = expectedClicks * CLICK_TO_PURCHASE_RATE * spendMultiplier;
    const baseRevenue = expectedOrders * AVG_ORDER_VALUE_INR * spendMultiplier;

    const spread = baseRevenue * REVENUE_RANGE_SPREAD;

    return {
      expectedReach,
      expectedOpenRate,
      expectedCtr,
      expectedRevenueImpact: {
        min: round0(Math.max(0, baseRevenue - spread)),
        max: round0(baseRevenue + spread),
      },
    };
  }
}
