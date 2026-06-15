import "dotenv/config";
import { AudienceEconomicsService } from "../src/audience-intelligence/services/audience-economics.service";
import { AudienceRoiForecastService } from "../src/audience-intelligence/services/audience-roi-forecast.service";
import type { SegmentFilters } from "../src/validators/segment.validator";

const economics = new AudienceEconomicsService();
const forecast = new AudienceRoiForecastService();
const population = await economics.getPopulationBaseline();

const scenarios: { name: string; filters: SegmentFilters }[] = [
  { name: "Champions", filters: { rfmSegment: "Champion" } },
  {
    name: "Tea Loyalists",
    filters: { favoriteDrink: "Masala Chai", rfmSegment: "Loyal Customer" },
  },
  {
    name: "Lost Customers (win-back)",
    filters: {
      rfmSegment: "Lost Customer",
      churnRisk: "HIGH",
      lifetimeSpend: { gt: 5000 },
      daysSinceLastOrder: { gt: 60 },
    },
  },
  {
    name: "Discount Hunters",
    filters: { totalOrders: { gte: 10 }, lifetimeSpend: { lt: 5000 } },
  },
];

for (const scenario of scenarios) {
  const audienceEconomics = await economics.computeForFilters(scenario.filters);
  const result = forecast.forecast({
    audienceSize: audienceEconomics.audienceSize,
    channel: "WhatsApp",
    objective: "WIN_BACK",
    audienceEconomics,
    populationEconomics: population,
  });

  console.log(scenario.name, {
    size: audienceEconomics.audienceSize,
    ltv: Math.round(audienceEconomics.averageLifetimeSpend),
    aov: Math.round(audienceEconomics.averageOrderValue),
    days: Math.round(audienceEconomics.averageDaysSinceLastOrder ?? 0),
    revenue: result.expectedRevenueImpact,
    conversions: result.expectedConversions,
    openRate: result.expectedOpenRate,
    roi: result.roi,
  });
}
