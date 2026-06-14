import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { audienceBuilderRoutes } from "../src/routes/audience-builder";
import {
  setAudienceBuilderService,
  resetAudienceBuilderService,
} from "../src/audience-intelligence/container";
import type { AudienceBuilderService } from "../src/audience-intelligence/services/audience-builder.service";
import { buildFilterOnlySystemPrompt, buildBlueprintSystemPrompt } from "../src/audience-intelligence/constants/audience-filter-prompt";
import { SEGMENT_CITIES, SEGMENT_DRINKS } from "../src/constants/segment-catalog";

const mockResponse = {
  goal: "test goal",
  goalAnalysis: {
    objective: "WIN_BACK" as const,
    confidence: 0.9,
    campaignType: "Retention",
    revenuePotential: { min: 100, max: 200 },
  },
  recommendedAudience: {
    id: "seg-1",
    name: "Lost Customers",
    audienceSize: 1000,
    score: 80,
    explanation: "test",
  },
  alternatives: [],
  recommendation: {
    bestChannel: "WhatsApp" as const,
    bestOffer: "15% off",
    bestTiming: "Tuesday 10 AM",
    summary: "test summary",
  },
  forecast: {
    expectedReach: 900,
    expectedOpenRate: 75,
    expectedCtr: 9,
    expectedRevenueImpact: { min: 100, max: 200 },
  },
};

function createApp() {
  return new Hono().route("/audience-builder", audienceBuilderRoutes);
}

describe("audience-builder routes", () => {
  before(() => {
    setAudienceBuilderService({
      analyzeGoal: async () => ({ ok: true, data: mockResponse }),
    } as unknown as AudienceBuilderService);
  });

  after(() => {
    resetAudienceBuilderService();
  });

  it("POST /recommend returns segment recommendations", async () => {
    const res = await createApp().request("/audience-builder/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "bring back lost customers" }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.recommendedAudience.name, "Lost Customers");
    assert.equal(res.headers.get("Deprecation"), null);
  });

  it("POST /analyze is a deprecated alias for /recommend", async () => {
    const res = await createApp().request("/audience-builder/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "bring back lost customers" }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.recommendedAudience.name, "Lost Customers");
    assert.equal(res.headers.get("Deprecation"), "true");
    assert.match(res.headers.get("Link") ?? "", /\/audience-builder\/recommend/);
  });
});

describe("shared audience filter prompts", () => {
  it("uses seed-aligned cities and drinks", () => {
    const filterPrompt = buildFilterOnlySystemPrompt();
    const blueprintPrompt = buildBlueprintSystemPrompt();

    for (const city of SEGMENT_CITIES) {
      assert.ok(filterPrompt.includes(city), `filter prompt missing city ${city}`);
      assert.ok(blueprintPrompt.includes(city), `blueprint prompt missing city ${city}`);
    }

    for (const drink of SEGMENT_DRINKS) {
      assert.ok(filterPrompt.includes(drink), `filter prompt missing drink ${drink}`);
      assert.ok(blueprintPrompt.includes(drink), `blueprint prompt missing drink ${drink}`);
    }

    assert.ok(!filterPrompt.includes("Pune"));
    assert.ok(!filterPrompt.includes("Hazelnut Latte"));
  });
});
