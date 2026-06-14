import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RuleBasedAudienceIntentProvider } from "../src/audience-intelligence/providers/rule-based-audience-intent.provider";
import { AudienceScoringService } from "../src/audience-intelligence/services/audience-scoring.service";
import { AudienceRecommendationService } from "../src/audience-intelligence/services/audience-recommendation.service";
import { ChannelRecommendationService } from "../src/audience-intelligence/services/channel-recommendation.service";
import { AudienceForecastService } from "../src/audience-intelligence/services/audience-forecast.service";
import type { ScorableSegment } from "../src/audience-intelligence/types/segment-scoring.types";

const sampleSegments: ScorableSegment[] = [
  {
    id: "seg-1",
    name: "Cold Brew Win Back",
    description: null,
    audienceSize: 167,
    rules: { churnRisk: "HIGH", favoriteDrink: "Cold Brew" },
  },
  {
    id: "seg-2",
    name: "High Value Cold Brew Lovers",
    description: null,
    audienceSize: 42,
    rules: { churnRisk: "HIGH", favoriteDrink: "Cold Brew", lifetimeSpend: { gt: 5000 } },
  },
];

describe("RuleBasedAudienceIntentProvider", () => {
  const provider = new RuleBasedAudienceIntentProvider();

  it("detects WIN_BACK objective from natural language", async () => {
    const result = await provider.analyzeGoal(
      "I want to increase revenue by bringing back lost customers",
    );
    assert.equal(result.objective, "WIN_BACK");
    assert.ok(result.confidence >= 0.6);
    assert.ok(result.reasoning.length > 0);
  });

  it("detects PRODUCT_LAUNCH objective", async () => {
    const result = await provider.analyzeGoal("Promote cold brew to customers who might buy it");
    assert.equal(result.objective, "PRODUCT_LAUNCH");
  });

  it("detects LOYALTY objective", async () => {
    const result = await provider.analyzeGoal("Increase repeat purchases from loyal customers");
    assert.equal(result.objective, "LOYALTY");
  });
});

describe("AudienceScoringService", () => {
  const scoring = new AudienceScoringService();

  it("ranks segments by weighted score for WIN_BACK", () => {
    const results = scoring.scoreSegments("WIN_BACK", sampleSegments);
    assert.equal(results.length, 2);
    assert.ok(results[0]!.score >= results[1]!.score);
    assert.ok(results[0]!.explanation.includes(sampleSegments[0]!.name) || results[0]!.explanation.length > 0);
  });

  it("returns zero audience size score for empty audiences", () => {
    const results = scoring.scoreSegments("WIN_BACK", [
      { ...sampleSegments[0]!, audienceSize: 0 },
    ]);
    assert.equal(results[0]!.categories.audienceSize, 0);
  });
});

describe("AudienceRecommendationService", () => {
  const recommendations = new AudienceRecommendationService();
  const scoring = new AudienceScoringService();

  it("selects top segment and up to 3 alternatives", () => {
    const scored = scoring.scoreSegments("WIN_BACK", sampleSegments);
    const bundle = recommendations.buildRecommendations(
      "WIN_BACK",
      sampleSegments,
      scored,
      "WhatsApp",
    );

    assert.ok(bundle.recommendedAudience.score > 0);
    assert.ok(bundle.recommendedAudience.explanation.length > 0);
    assert.ok(bundle.alternatives.length <= 3);
    assert.equal(bundle.recommendation.bestChannel, "WhatsApp");
    assert.ok(bundle.recommendation.summary.length > 0);
  });
});

describe("ChannelRecommendationService", () => {
  const channels = new ChannelRecommendationService();

  it("recommends WhatsApp for WIN_BACK", () => {
    const rec = channels.recommend("WIN_BACK");
    assert.equal(rec.channel, "WhatsApp");
    assert.ok(rec.confidence > 0.8);
  });

  it("recommends SMS + Email pattern for AWARENESS via primary SMS", () => {
    const rec = channels.recommend("AWARENESS");
    assert.equal(rec.channel, "SMS");
  });
});

describe("AudienceForecastService", () => {
  const forecast = new AudienceForecastService();

  it("produces formula-based revenue range", () => {
    const result = forecast.forecast({
      audienceSize: 400,
      channel: "WhatsApp",
      objectiveScore: 90,
      avgLifetimeSpendHint: 6000,
    });

    assert.ok(result.expectedReach > 0);
    assert.ok(result.expectedOpenRate > 0);
    assert.ok(result.expectedCtr > 0);
    assert.ok(result.expectedRevenueImpact.min <= result.expectedRevenueImpact.max);
    assert.ok(result.expectedRevenueImpact.max > 0);
  });
});
