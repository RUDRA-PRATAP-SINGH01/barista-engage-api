import "dotenv/config";
import { performance } from "node:perf_hooks";
import { GeminiAudienceBlueprintProvider } from "../src/audience-intelligence/providers/gemini-audience-blueprint.provider";
import { AudiencePreviewService } from "../src/audience-intelligence/services/audience-preview.service";
import { AudienceEconomicsService } from "../src/audience-intelligence/services/audience-economics.service";
import { blueprintFiltersToSegmentFilters } from "../src/audience-intelligence/utils/blueprint-to-segment-filters";
import { listSegmentsWithAudience } from "../src/services/segment.service";

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  console.log(`${label}: ${Math.round(performance.now() - start)}ms`);
  return result;
}

const winBackFilters = {
  rfmSegment: "Lost Customer",
  churnRisk: "HIGH" as const,
  lifetimeSpend: { gt: 5000 },
  daysSinceLastOrder: { gt: 60 },
};

console.log("=== /audience-builder/generate breakdown ===\n");

const blueprint = await time("1. Gemini blueprint", async () => {
  const provider = new GeminiAudienceBlueprintProvider();
  const result = await provider.generateBlueprint(
    "Bring back high-value lost customers who have not ordered in 60 days",
  );
  if (!result.ok) throw new Error(result.error);
  return result.blueprint;
});

const segmentFilters = blueprintFiltersToSegmentFilters(blueprint.filters);
const previewService = new AudiencePreviewService();
const economicsService = new AudienceEconomicsService();

await time("2. Preview (4 DB queries)", () =>
  previewService.preview(segmentFilters, blueprint.recommendedChannel),
);

await time("3. Audience economics (2 DB queries)", () =>
  economicsService.computeForFilters(segmentFilters),
);

await time("4. Population baseline (2 DB queries, cached after 1st)", () =>
  economicsService.getPopulationBaseline(),
);

console.log("\n=== /audience-builder/recommend breakdown ===\n");
await time("listSegmentsWithAudience (1 + N count queries)", listSegmentsWithAudience);

console.log("\n=== Duplicate work note ===");
console.log(
  "generate runs preview + economics in parallel, but both re-count the same filtered audience.",
);
