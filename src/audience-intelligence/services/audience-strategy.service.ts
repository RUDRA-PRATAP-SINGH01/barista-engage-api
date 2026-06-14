import type { BusinessObjective } from "../types/audience-objective";
import type { AudienceBlueprint } from "../types/audience-blueprint.types";
import type { AudiencePreviewResult } from "./audience-preview.service";
import type { RoiForecastResult } from "./audience-roi-forecast.service";

export type AudienceStrategyResult = {
  why: string;
  what: string;
  how: string;
};

function formatObjective(objective: BusinessObjective): string {
  return objective.replace(/_/g, " ").toLowerCase();
}

function topSegmentLabel(distribution: Record<string, number>): string {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "mixed segments";
}

export class AudienceStrategyService {
  buildStrategy(
    blueprint: AudienceBlueprint,
    preview: AudiencePreviewResult,
    forecast: RoiForecastResult,
  ): AudienceStrategyResult {
    const objectiveLabel = formatObjective(blueprint.objective);
    const dominantSegment = topSegmentLabel(preview.segmentDistribution);
    const recoveryPct = Math.min(
      25,
      Math.max(5, Math.round((forecast.expectedConversions / Math.max(preview.audienceSize, 1)) * 100)),
    );

    const why = [
      blueprint.description,
      `This audience aligns with a ${objectiveLabel} goal and is primarily composed of ${dominantSegment} customers.`,
      blueprint.reasoning.slice(0, 2).join(" "),
    ].join(" ");

    const what = [
      `Reaching ${preview.estimatedReach.toLocaleString("en-IN")} of ${preview.audienceSize.toLocaleString("en-IN")} customers`,
      `(${preview.audiencePercentage}% of your base) could drive`,
      `${forecast.expectedConversions.toLocaleString("en-IN")} estimated conversions`,
      `and ₹${forecast.expectedRevenueImpact.min.toLocaleString("en-IN")}–₹${forecast.expectedRevenueImpact.max.toLocaleString("en-IN")} in revenue impact.`,
      `Recovering even ${recoveryPct}% of this audience represents a meaningful ${objectiveLabel} opportunity.`,
    ].join(" ");

    const how = [
      `Target via ${blueprint.recommendedChannel} with "${blueprint.recommendedOffer}".`,
      `Expected open rate ${forecast.expectedOpenRate}% and CTR ${forecast.expectedCtr}%`,
      `based on channel benchmarks and ${objectiveLabel} engagement patterns.`,
      `Projected ROI: ${forecast.roi}x against estimated campaign cost.`,
    ].join(" ");

    return { why, what, how };
  }
}
