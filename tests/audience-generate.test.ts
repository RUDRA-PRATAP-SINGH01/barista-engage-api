import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { audienceBlueprintSchema } from "../src/audience-intelligence/validators/audience-blueprint.validator";
import {
  blueprintFiltersToSegmentFilters,
  segmentFiltersToBlueprintFilters,
} from "../src/audience-intelligence/utils/blueprint-to-segment-filters";
import { AudienceRoiForecastService } from "../src/audience-intelligence/services/audience-roi-forecast.service";
import { AudienceStrategyService } from "../src/audience-intelligence/services/audience-strategy.service";
import { AudienceGenerateService } from "../src/audience-intelligence/services/audience-generate.service";
import type { AudienceBlueprintProvider } from "../src/audience-intelligence/providers/audience-blueprint.provider";
import type { AudienceBlueprint } from "../src/audience-intelligence/types/audience-blueprint.types";
import { AudiencePreviewService } from "../src/audience-intelligence/services/audience-preview.service";
import { AudienceRoiForecastService as RoiService } from "../src/audience-intelligence/services/audience-roi-forecast.service";
import { AudienceStrategyService as StrategyService } from "../src/audience-intelligence/services/audience-strategy.service";

const winBackBlueprint: AudienceBlueprint = {
  objective: "WIN_BACK",
  audienceName: "High Value Churned Customers",
  description: "Customers who previously generated significant revenue but have not purchased recently.",
  filters: [
    { field: "daysSinceLastOrder", operator: "gt", value: 60 },
    { field: "lifetimeSpend", operator: "gt", value: 3000 },
    { field: "rfmSegment", operator: "equals", value: "Lost Customer" },
  ],
  reasoning: ["High historical spend", "High recovery potential", "Strong revenue impact"],
  recommendedChannel: "WhatsApp",
  recommendedOffer: "15% comeback discount",
};

class MockBlueprintProvider implements AudienceBlueprintProvider {
  constructor(private readonly blueprint: AudienceBlueprint) {}

  async generateBlueprint() {
    return { ok: true as const, blueprint: this.blueprint };
  }
}

describe("audienceBlueprintSchema", () => {
  it("accepts a valid blueprint", () => {
    const parsed = audienceBlueprintSchema.safeParse(winBackBlueprint);
    assert.equal(parsed.success, true);
  });

  it("rejects unsupported filter fields", () => {
    const parsed = audienceBlueprintSchema.safeParse({
      ...winBackBlueprint,
      filters: [{ field: "email", operator: "equals", value: "test@test.com" }],
    });
    assert.equal(parsed.success, false);
  });

  it("rejects numeric operator on string fields", () => {
    const parsed = audienceBlueprintSchema.safeParse({
      ...winBackBlueprint,
      filters: [{ field: "city", operator: "gt", value: "Bangalore" }],
    });
    assert.equal(parsed.success, false);
  });
});

describe("blueprintFiltersToSegmentFilters", () => {
  it("converts blueprint filters to segment filters", () => {
    const segmentFilters = blueprintFiltersToSegmentFilters(winBackBlueprint.filters);
    assert.deepEqual(segmentFilters, {
      daysSinceLastOrder: { gt: 60 },
      lifetimeSpend: { gt: 3000 },
      rfmSegment: "Lost Customer",
    });
  });

  it("round-trips through segmentFiltersToBlueprintFilters", () => {
    const segmentFilters = blueprintFiltersToSegmentFilters(winBackBlueprint.filters);
    const roundTrip = segmentFiltersToBlueprintFilters(segmentFilters);
    assert.equal(roundTrip.length, 3);
    assert.deepEqual(roundTrip[0], { field: "daysSinceLastOrder", operator: "gt", value: 60 });
  });
});

describe("AudienceRoiForecastService", () => {
  const forecast = new AudienceRoiForecastService();

  it("produces formula-based ROI and conversions", () => {
    const result = forecast.forecast({
      audienceSize: 400,
      channel: "WhatsApp",
      objective: "WIN_BACK",
    });

    assert.ok(result.expectedReach > 0);
    assert.ok(result.expectedOpenRate > 0);
    assert.ok(result.expectedCtr > 0);
    assert.ok(result.expectedConversions >= 0);
    assert.ok(result.expectedRevenueImpact.min <= result.expectedRevenueImpact.max);
    assert.ok(result.roi > 0);
  });

  it("returns higher ROI for larger audiences with same channel", () => {
    const small = forecast.forecast({ audienceSize: 50, channel: "WhatsApp", objective: "WIN_BACK" });
    const large = forecast.forecast({ audienceSize: 500, channel: "WhatsApp", objective: "WIN_BACK" });
    assert.ok(large.expectedRevenueImpact.max > small.expectedRevenueImpact.max);
  });
});

describe("AudienceStrategyService", () => {
  const strategy = new AudienceStrategyService();
  const roi = new AudienceRoiForecastService();

  it("builds why/what/how from blueprint and metrics", () => {
    const forecast = roi.forecast({
      audienceSize: 412,
      channel: "WhatsApp",
      objective: "WIN_BACK",
    });

    const result = strategy.buildStrategy(
      winBackBlueprint,
      {
        audienceSize: 412,
        estimatedReach: 378,
        audiencePercentage: 8.2,
        segmentDistribution: { "Lost Customer": 300, "At Risk": 112 },
      },
      forecast,
    );

    assert.ok(result.why.includes("significant revenue"));
    assert.ok(result.what.includes("412"));
    assert.ok(result.how.includes("WhatsApp"));
    assert.ok(result.how.includes("15% comeback discount"));
  });
});

describe("AudienceGenerateService", () => {
  it("orchestrates blueprint → preview path with mock provider", async () => {
    class FailingPreviewService extends AudiencePreviewService {
      override async preview() {
        return {
          audienceSize: 120,
          estimatedReach: 117,
          audiencePercentage: 2.4,
          segmentDistribution: { "Lost Customer": 120 },
        };
      }
    }

    const service = new AudienceGenerateService(
      new MockBlueprintProvider(winBackBlueprint),
      new FailingPreviewService(),
      new RoiService(),
      new StrategyService(),
    );

    const result = await service.generate({
      goal: "I want to increase revenue by bringing back lost customers",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.data.generatedAudience.name, "High Value Churned Customers");
    assert.equal(result.data.generatedAudience.filters.length, 3);
    assert.equal(result.data.audiencePreview.audienceSize, 120);
    assert.equal(result.data.recommendedChannel, "WhatsApp");
    assert.ok(result.data.strategy.why.length > 0);
    assert.ok(result.data.confidence >= 0.45);
  });
});
