import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ChannelIntelligenceService } from "../src/campaign-studio/intelligence/channel-intelligence.service";
import { OfferIntelligenceService } from "../src/campaign-studio/intelligence/offer-intelligence.service";
import type { SegmentAudienceAnalytics } from "../src/campaign-studio/intelligence/types/campaign-intelligence.types";

const teaLoyalistsAnalytics: SegmentAudienceAnalytics = {
  segmentId: "seg-1",
  segmentName: "Tea Loyalists",
  segmentDescription: "Frequent tea buyers",
  rules: { favoriteDrink: "Masala Chai" },
  audienceSize: 500,
  averageSpend: 4200,
  averageOrderValue: 180,
  lifetimeValue: 4200,
  favoriteProduct: "Masala Chai",
  preferredChannel: "WhatsApp",
  engagementScore: 72,
  churnRisk: "LOW",
  churnRiskDistribution: { LOW: 400, MEDIUM: 80, HIGH: 20 },
  rfmDistribution: { "Loyal Customer": 280, Champion: 120 },
  channelDistribution: { WhatsApp: 300, Email: 120, SMS: 80 },
  dominantRfmSegment: "Loyal Customer",
  discountHunterSignal: false,
  loyalCustomerSignal: true,
  coldBrewSignal: false,
  teaSignal: true,
};

describe("ChannelIntelligenceService", () => {
  it("recommends a channel with confidence and alternatives", () => {
    const service = new ChannelIntelligenceService();
    const result = service.recommend(teaLoyalistsAnalytics, "LOYALTY");

    assert.equal(result.recommendedChannel, "WhatsApp");
    assert.ok(result.confidence >= 45);
    assert.ok(result.reasoning.length > 0);
    assert.ok(result.alternatives.length >= 1);
  });
});

describe("OfferIntelligenceService", () => {
  it("recommends tea/loyalty-aligned offer for tea loyalists", () => {
    const service = new OfferIntelligenceService();
    const result = service.recommend(teaLoyalistsAnalytics, "LOYALTY");

    assert.equal(result.recommendedOffer, "Double Loyalty Points");
    assert.ok(result.reasoning.length > 0);
  });

  it("recommends discount for discount hunters", () => {
    const service = new OfferIntelligenceService();
    const result = service.recommend(
      { ...teaLoyalistsAnalytics, segmentName: "Discount Hunters", discountHunterSignal: true },
      "DISCOUNT_PROMOTION",
    );

    assert.equal(result.recommendedOffer, "Percentage Discount");
  });
});
