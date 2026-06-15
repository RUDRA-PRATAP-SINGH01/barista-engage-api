import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { buildWhereClause } from "../src/services/segment.service";
import { AudienceEconomicsService } from "../src/audience-intelligence/services/audience-economics.service";
import { AudienceRoiForecastService } from "../src/audience-intelligence/services/audience-roi-forecast.service";
import { AudiencePreviewService } from "../src/audience-intelligence/services/audience-preview.service";
import { deriveQualityMultipliers } from "../src/audience-intelligence/utils/audience-quality-multipliers";
import {
  AVG_ORDER_VALUE_INR,
  CLICK_TO_PURCHASE_RATE,
  CTR_BENCHMARKS,
  DELIVERY_RATE_BENCHMARKS,
  OBJECTIVE_ENGAGEMENT_MULTIPLIER,
  OPEN_RATE_BENCHMARKS,
  REVENUE_RANGE_SPREAD,
  CAMPAIGN_SETUP_COST_INR,
  COST_PER_MESSAGE_INR,
} from "../src/audience-intelligence/constants/roi-benchmarks";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const winBackFilters = {
  rfmSegment: "Lost Customer",
  churnRisk: "HIGH" as const,
  lifetimeSpend: { gt: 5000 },
  daysSinceLastOrder: { gt: 60 },
};

async function main() {
  const checks = await prisma.$queryRaw<
    { check: string; count: number }[]
  >`
    SELECT 'Check1_Customer' as check, COUNT(*)::int as count FROM "Customer"
    UNION ALL
    SELECT 'Check2_LostCustomer', COUNT(*)::int FROM "CustomerAnalytics" WHERE "rfmSegment" = 'Lost Customer'
    UNION ALL
    SELECT 'Check3_Lost_HIGH', COUNT(*)::int FROM "CustomerAnalytics" WHERE "rfmSegment" = 'Lost Customer' AND "churnRisk" = 'HIGH'
    UNION ALL
    SELECT 'Check4_Lost_HIGH_spend5k', COUNT(*)::int FROM "CustomerAnalytics" WHERE "rfmSegment" = 'Lost Customer' AND "churnRisk" = 'HIGH' AND "lifetimeSpend" > 5000
    UNION ALL
    SELECT 'Check5_full_filter', COUNT(*)::int FROM "CustomerAnalytics" WHERE "rfmSegment" = 'Lost Customer' AND "churnRisk" = 'HIGH' AND "lifetimeSpend" > 5000 AND "daysSinceLastOrder" > 60
  `;
  console.log("=== SQL Checks ===");
  console.table(checks);

  const stats = await prisma.$queryRaw<
    {
      audience_size: number;
      avg_lifetime_spend: string;
      avg_order_value: string;
      avg_orders_per_customer: string;
    }[]
  >`
    SELECT 
      COUNT(*)::int as audience_size,
      ROUND(AVG("lifetimeSpend")::numeric, 2) as avg_lifetime_spend,
      ROUND(AVG("avgOrderValue")::numeric, 2) as avg_order_value,
      ROUND(AVG("totalOrders")::numeric, 2) as avg_orders_per_customer
    FROM "CustomerAnalytics"
    WHERE "rfmSegment" = 'Lost Customer'
      AND "churnRisk" = 'HIGH'
      AND "lifetimeSpend" > 5000
      AND "daysSinceLastOrder" > 60
  `;
  console.log("\n=== Audience stats (Check 5 filter on CustomerAnalytics) ===");
  console.table(stats);

  const where = buildWhereClause(winBackFilters);
  const customerCount = await prisma.customer.count({ where });
  console.log("\n=== Audience size via buildWhereClause (Customer join) ===");
  console.log({ customerCount });

  const previewService = new AudiencePreviewService();
  const economicsService = new AudienceEconomicsService();
  const preview = await previewService.preview(winBackFilters, "WhatsApp");
  const [audienceEconomics, populationEconomics] = await Promise.all([
    economicsService.computeForFilters(winBackFilters),
    economicsService.getPopulationBaseline(),
  ]);
  const qualityMultipliers = deriveQualityMultipliers(audienceEconomics, populationEconomics);

  console.log("\n=== Audience economics (from DB) ===");
  console.log(audienceEconomics);
  console.log("\n=== Population baseline ===");
  console.log(populationEconomics);
  console.log("\n=== Quality multipliers ===");
  console.log(qualityMultipliers);

  console.log("\n=== Preview service output ===");
  console.log(preview);

  const roiService = new AudienceRoiForecastService();
  const forecast = roiService.forecast({
    audienceSize: preview.audienceSize,
    channel: "WhatsApp",
    objective: "WIN_BACK",
    audienceEconomics,
    populationEconomics,
  });
  console.log("\n=== ROI forecast service output ===");
  console.log(forecast);

  const channel = "WhatsApp" as const;
  const objective = "WIN_BACK" as const;
  const audienceSize = preview.audienceSize;
  const deliveryRate = DELIVERY_RATE_BENCHMARKS[channel] / 100;
  const openBenchmark = OPEN_RATE_BENCHMARKS[channel] / 100;
  const ctrBenchmark = CTR_BENCHMARKS[channel] / 100;
  const objectiveMultiplier = OBJECTIVE_ENGAGEMENT_MULTIPLIER[objective] ?? 1;
  const { responseMultiplier, conversionMultiplier, revenueMultiplier } = qualityMultipliers;
  const orderValue =
    audienceEconomics.averageOrderValue > 0
      ? audienceEconomics.averageOrderValue
      : populationEconomics.averageOrderValue;

  const expectedReach = Math.round(audienceSize * deliveryRate);
  const expectedOpenRate = Math.round(openBenchmark * 100 * objectiveMultiplier * responseMultiplier * 10) / 10;
  const expectedCtr = Math.round(ctrBenchmark * 100 * objectiveMultiplier * responseMultiplier * 10) / 10;
  const expectedOpens = expectedReach * (expectedOpenRate / 100);
  const expectedClicks = expectedOpens * (expectedCtr / 100);
  const rawConversions = expectedClicks * CLICK_TO_PURCHASE_RATE * conversionMultiplier;
  const expectedConversions = Math.round(rawConversions);
  const baseRevenue = rawConversions * orderValue * revenueMultiplier;
  const spread = baseRevenue * REVENUE_RANGE_SPREAD;
  const campaignCost =
    CAMPAIGN_SETUP_COST_INR + audienceSize * COST_PER_MESSAGE_INR[channel];

  console.log("\n=== Manual revenue trace (step by step) ===");
  console.table([
    { step: "audienceSize", value: audienceSize },
    { step: "deliveryRate (WhatsApp)", value: `${DELIVERY_RATE_BENCHMARKS[channel]}%` },
    { step: "expectedReach", value: expectedReach },
    { step: "openBenchmark", value: `${OPEN_RATE_BENCHMARKS[channel]}%` },
    { step: "objectiveMultiplier (WIN_BACK)", value: objectiveMultiplier },
    { step: "expectedOpenRate", value: `${expectedOpenRate}%` },
    { step: "expectedOpens", value: expectedOpens.toFixed(2) },
    { step: "ctrBenchmark", value: `${CTR_BENCHMARKS[channel]}%` },
    { step: "expectedCtr", value: `${expectedCtr}%` },
    { step: "expectedClicks", value: expectedClicks.toFixed(2) },
    { step: "responseMultiplier", value: responseMultiplier },
    { step: "conversionMultiplier", value: conversionMultiplier },
    { step: "revenueMultiplier", value: revenueMultiplier },
    { step: "orderValue (audience avg)", value: `₹${orderValue.toFixed(2)}` },
    { step: "baseRevenue", value: `₹${baseRevenue}` },
    { step: "REVENUE_RANGE_SPREAD", value: `${REVENUE_RANGE_SPREAD * 100}%` },
    { step: "revenue min", value: `₹${Math.round(Math.max(0, baseRevenue - spread))}` },
    { step: "revenue max", value: `₹${Math.round(baseRevenue + spread)}` },
    { step: "campaignCost", value: `₹${campaignCost}` },
    { step: "ROI", value: (baseRevenue / campaignCost).toFixed(2) },
    { step: "avg lifetime spend (DB)", value: `₹${stats[0]?.avg_lifetime_spend}` },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
