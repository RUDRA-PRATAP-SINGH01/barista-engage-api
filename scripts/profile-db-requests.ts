import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "../src/lib/prisma";
import { AudiencePreviewService } from "../src/audience-intelligence/services/audience-preview.service";
import { AudienceEconomicsService } from "../src/audience-intelligence/services/audience-economics.service";
import { listSegmentsWithAudience } from "../src/services/segment.service";

async function time(label: string, fn: () => Promise<void>) {
  const start = performance.now();
  await fn();
  console.log(`${label}: ${Math.round(performance.now() - start)}ms`);
}

const filters = {
  rfmSegment: "Lost Customer",
  churnRisk: "HIGH" as const,
  lifetimeSpend: { gt: 5000 },
  daysSinceLastOrder: { gt: 60 },
};

const preview = new AudiencePreviewService();
const economics = new AudienceEconomicsService();

console.log("DB host:", process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "unknown");
console.log("");

const generateDbStart = performance.now();

await time("  preview (4 queries)", async () => {
  await preview.preview(filters, "WhatsApp");
});

await time("  economics filtered (2 queries)", async () => {
  await economics.computeForFilters(filters);
});

await time("  population baseline (2 queries, cached in-process)", async () => {
  await economics.getPopulationBaseline();
});

console.log(`\n/generate DB phase (sequential): ${Math.round(performance.now() - generateDbStart)}ms`);
console.log("/generate DB phase (parallel, as in code): ~max of the three above\n");

await time("/recommend listSegmentsWithAudience (~21 queries)", async () => {
  await listSegmentsWithAudience();
});

await prisma.$disconnect();
