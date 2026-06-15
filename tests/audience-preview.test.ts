import { describe, it } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { AudiencePreviewService } from "../src/audience-intelligence/services/audience-preview.service";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("AudiencePreviewService", { skip: !hasDatabase }, () => {
  const previewService = new AudiencePreviewService();

  it("scopes segment distribution to the filtered audience", async () => {
    const filters = {
      rfmSegment: "Lost Customer",
      churnRisk: "HIGH" as const,
      lifetimeSpend: { gt: 5000 },
      daysSinceLastOrder: { gt: 60 },
    };

    const preview = await previewService.preview(filters, "WhatsApp");
    const distributionTotal = Object.values(preview.segmentDistribution).reduce(
      (sum, count) => sum + count,
      0,
    );

    assert.equal(preview.audienceSize, 130);
    assert.equal(distributionTotal, preview.audienceSize);
    assert.deepEqual(Object.keys(preview.segmentDistribution), ["Lost Customer"]);
    assert.equal(preview.segmentDistribution["Lost Customer"], 130);
  });
});
