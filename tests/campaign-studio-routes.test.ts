import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { campaignStudioRoutes } from "../src/routes/campaign-studio";
import {
  setCampaignStudioService,
  resetCampaignStudioService,
} from "../src/campaign-studio/container";
import type { CampaignStudioService } from "../src/campaign-studio/services/campaign-studio.service";

const mockStudioResponse = {
  goal: "Increase tea product revenue",
  audience: {
    name: "Tea Loyalists",
    description: "Customers who frequently purchase tea products",
    filters: [{ field: "favoriteDrink" as const, operator: "equals" as const, value: "Masala Chai" }],
    audienceSize: 500,
  },
  overview: {
    campaignName: "Tea Loyalty Boost 2026",
    campaignObjective: "Increase premium tea purchases among loyal tea drinkers.",
    campaignSummary: "Target engaged tea customers with double loyalty points.",
  },
  strategy: {
    cards: [
      {
        id: "audience" as const,
        title: "Why This Audience",
        headline: "Tea Loyalists",
        highlight: "500 customers",
        points: ["This audience aligns with tea revenue goals."],
      },
      {
        id: "offer" as const,
        title: "Why This Offer",
        headline: "Double Loyalty Points",
        highlight: "88% fit",
        points: ["Loyal segment responds to rewards."],
      },
      {
        id: "channel" as const,
        title: "Why This Channel",
        headline: "WhatsApp",
        highlight: "60% channel preference",
        points: ["High WhatsApp preference"],
      },
      {
        id: "timing" as const,
        title: "Why This Timing",
        headline: "Tuesday 10 AM",
        highlight: "Tuesday",
        points: ["Peak engagement on Tuesday mornings"],
      },
    ],
  },
  recommendations: {
    recommendedChannel: "WhatsApp" as const,
    recommendedOffer: "Double Loyalty Points",
    recommendedTiming: "Tuesday 10 AM",
    channelReasoning: ["High WhatsApp preference"],
    offerReasoning: ["Loyal segment responds to rewards"],
    timingReasoning: ["Peak engagement on Tuesday mornings"],
  },
  forecast: {
    audienceSize: 500,
    expectedReach: 490,
    expectedOpenRate: 78,
    expectedCtr: 9,
    expectedRevenue: 1680,
    expectedRoi: 1.6,
  },
  message: {
    whatsAppMessage: "Hi! Enjoy double loyalty points on your next tea order at Barista.",
    emailSubject: "Double Points on Premium Tea",
    emailBody: "Dear tea lover, earn 2x loyalty points on your next visit.",
    smsMessage: "Barista: 2x points on tea! Order now.",
  },
  creative: null,
};

const audienceBuilderPayload = {
  goal: "Increase tea product revenue",
  generatedAudience: {
    name: "Tea Loyalists",
    description: "Customers who frequently purchase tea products",
    filters: [{ field: "favoriteDrink", operator: "equals", value: "Masala Chai" }],
  },
  audienceSize: 500,
  forecast: {
    expectedReach: 490,
    expectedOpenRate: 78,
    expectedCtr: 9,
    expectedRevenueImpact: { min: 1400, max: 1960 },
    roi: 1.6,
  },
  strategy: {
    why: "This audience aligns with tea revenue goals.",
    what: "Reaching 490 of 500 customers could drive conversions.",
    how: "Target via WhatsApp with Double Loyalty Points.",
  },
  recommendedChannel: "WhatsApp",
  recommendedOffer: "Double Loyalty Points",
};

const mockCampaignListItem = {
  id: "camp-1",
  name: "Tea Loyalty Boost 2026",
  status: "DRAFT",
  audienceSize: 500,
  channel: "WHATSAPP",
  createdAt: new Date("2026-06-15T10:00:00.000Z"),
};

function createApp() {
  return new Hono().route("/campaign-studio", campaignStudioRoutes);
}

describe("campaign-studio routes", () => {
  before(() => {
    setCampaignStudioService({
      generate: async () => ({ ok: true, data: mockStudioResponse }),
      generateMessage: async () => ({ ok: true, message: mockStudioResponse.message }),
      regenerateMessage: async () => ({ ok: true, message: mockStudioResponse.message }),
      generateCreative: async () => ({
        ok: true,
        creative: {
          imageUrl: "data:image/png;base64,abc123",
          imagePrompt: "Barista tea campaign banner",
        },
      }),
      regenerateCreative: async () => ({
        ok: true,
        creative: {
          imageUrl: "data:image/png;base64,xyz789",
          imagePrompt: "Barista tea campaign banner variation",
        },
      }),
      save: async () => ({
        ok: true,
        data: {
          segmentId: "seg-1",
          campaign: mockCampaignListItem,
          communicationsCreated: 500,
        },
      }),
      launch: async () => ({
        ok: true,
        data: { segmentId: "seg-1", campaignId: "camp-1", communicationsSent: 500 },
      }),
    } as unknown as CampaignStudioService);
  });

  after(() => {
    resetCampaignStudioService();
  });

  it("POST /generate returns overview, strategy cards, forecast, and messages", async () => {
    const res = await createApp().request("/campaign-studio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(audienceBuilderPayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.overview.campaignName, "Tea Loyalty Boost 2026");
    assert.equal(json.data.strategy.cards.length, 4);
    assert.equal(json.data.strategy.cards[0].id, "audience");
    assert.equal(json.data.recommendations.recommendedChannel, "WhatsApp");
    assert.equal(json.data.forecast.expectedRoi, 1.6);
    assert.equal(json.data.creative, null);
    assert.ok(json.data.message.whatsAppMessage.length > 0);
  });

  it("POST /generate-message returns channel copy bundle", async () => {
    const res = await createApp().request("/campaign-studio/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: audienceBuilderPayload.goal,
        overview: mockStudioResponse.overview,
        generatedAudience: audienceBuilderPayload.generatedAudience,
        recommendedChannel: "WhatsApp",
        recommendedOffer: "Double Loyalty Points",
        recommendedTiming: "Tuesday 10 AM",
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.emailBody.length > 0);
  });

  it("POST /regenerate-creative returns a fresh image preview", async () => {
    const res = await createApp().request("/campaign-studio/regenerate-creative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: audienceBuilderPayload.goal,
        overview: mockStudioResponse.overview,
        audience: {
          ...audienceBuilderPayload.generatedAudience,
          audienceSize: 500,
        },
        recommendedChannel: "WhatsApp",
        recommendedOffer: "Double Loyalty Points",
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.imageUrl.startsWith("data:image/"));
  });

  it("POST /save returns a campaigns-page-ready campaign record", async () => {
    const res = await createApp().request("/campaign-studio/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: audienceBuilderPayload.goal,
        audience: {
          ...audienceBuilderPayload.generatedAudience,
          audienceSize: 500,
        },
        overview: mockStudioResponse.overview,
        recommendations: {
          recommendedChannel: "WhatsApp",
          recommendedOffer: "Double Loyalty Points",
          recommendedTiming: "Tuesday 10 AM",
        },
        message: mockStudioResponse.message,
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.campaign.id, "camp-1");
    assert.equal(json.data.campaign.status, "DRAFT");
    assert.equal(json.data.communicationsCreated, 500);
  });
});
