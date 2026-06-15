import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CampaignStrategyService } from "../src/campaign-studio/services/campaign-strategy.service";
import type { SegmentAudienceAnalytics } from "../src/campaign-studio/intelligence/types/campaign-intelligence.types";

const analytics: SegmentAudienceAnalytics = {
  segmentId: "studio-preview",
  segmentName: "Tea Loyalists",
  segmentDescription: "Customers who frequently purchase tea products",
  rules: { favoriteDrink: "Masala Chai" },
  audienceSize: 500,
  averageSpend: 4200,
  averageOrderValue: 180,
  lifetimeValue: 4200,
  favoriteProduct: "Masala Chai",
  preferredChannel: "WhatsApp",
  engagementScore: 72,
  churnRisk: "LOW",
  churnRiskDistribution: { LOW: 400 },
  rfmDistribution: { "Loyal Customer": 280 },
  channelDistribution: { WhatsApp: 300, Email: 120, SMS: 80 },
  dominantRfmSegment: "Loyal Customer",
  discountHunterSignal: false,
  loyalCustomerSignal: true,
  coldBrewSignal: false,
  teaSignal: true,
};

describe("CampaignStrategyService", () => {
  it("builds four strategy cards for frontend card layout", () => {
    const service = new CampaignStrategyService();
    const result = service.build({
      goal: "Increase tea product revenue",
      audienceName: "Tea Loyalists",
      audienceDescription: "Customers who frequently purchase tea products",
      audienceSize: 500,
      audienceStrategy: {
        why: "This audience aligns with tea revenue goals.",
        what: "Reaching 490 customers could drive conversions.",
        how: "Target via WhatsApp with Double Loyalty Points.",
      },
      channel: "WhatsApp",
      offer: "Double Loyalty Points",
      timing: "Tuesday 10 AM",
      channelRec: {
        recommendedChannel: "WhatsApp",
        confidence: 91,
        reasoning: ["High WhatsApp preference in this segment."],
        alternatives: [],
      },
      offerRec: {
        recommendedOffer: "Double Loyalty Points",
        offerDescription: "Earn 2x loyalty points",
        confidence: 88,
        reasoning: ["Loyal segment responds to rewards."],
        alternatives: [],
      },
      timingRec: {
        bestDay: "Tuesday",
        bestHour: "10:00",
        reasoning: "Tuesday morning shows peak engagement for tea buyers.",
        dayScores: { Mon: 62, Tue: 91, Wed: 73, Thu: 68, Fri: 70, Sat: 55, Sun: 48 },
        dataPoints: 120,
      },
      analytics,
    });

    assert.equal(result.cards.length, 4);
    assert.deepEqual(
      result.cards.map((card) => card.id),
      ["audience", "offer", "channel", "timing"],
    );
    assert.equal(result.cards[0]?.title, "Why This Audience");
    assert.ok(result.cards[0]?.points.length >= 2);
    assert.equal(result.cards[1]?.headline, "Double Loyalty Points");
    assert.equal(result.cards[2]?.headline, "WhatsApp");
    assert.equal(result.cards[3]?.headline, "Tuesday 10 AM");
  });
});
