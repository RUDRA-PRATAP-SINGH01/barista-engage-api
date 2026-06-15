import { generateCampaignStudioSchema } from "../src/validators/campaign-studio.validator";

const audienceBuilderResponse = {
  goal: "Increase tea revenue",
  generatedAudience: {
    name: "Tea",
    description: "Tea lovers",
    filters: [{ field: "favoriteDrink", operator: "equals", value: "Masala Chai" }],
  },
  audiencePreview: { audienceSize: 500, estimatedReach: 490 },
  forecast: {
    expectedOpenRate: 78,
    expectedCtr: 9,
    expectedRevenueImpact: { min: 1400, max: 1960 },
    roi: 1.6,
  },
  strategy: { why: "x", what: "y", how: "z" },
  recommendedChannel: "WhatsApp",
  recommendedOffer: "Double Points",
  confidence: 0.9,
};

const parsed = generateCampaignStudioSchema.safeParse(audienceBuilderResponse);
console.log("Audience builder → campaign studio direct pass:", parsed.success ? "OK" : "FAIL");
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.log(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
}

const mapped = {
  goal: audienceBuilderResponse.goal,
  generatedAudience: audienceBuilderResponse.generatedAudience,
  audienceSize: audienceBuilderResponse.audiencePreview.audienceSize,
  forecast: {
    expectedReach: audienceBuilderResponse.audiencePreview.estimatedReach,
    ...audienceBuilderResponse.forecast,
  },
  strategy: audienceBuilderResponse.strategy,
  recommendedChannel: audienceBuilderResponse.recommendedChannel,
  recommendedOffer: audienceBuilderResponse.recommendedOffer,
};

const mappedParsed = generateCampaignStudioSchema.safeParse(mapped);
console.log("\nCorrectly mapped payload:", mappedParsed.success ? "OK" : "FAIL");
