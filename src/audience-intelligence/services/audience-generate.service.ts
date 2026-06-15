import type { AudienceBlueprintProvider } from "../providers/audience-blueprint.provider";
import { blueprintFiltersToSegmentFilters } from "../utils/blueprint-to-segment-filters";
import { AudienceEconomicsService } from "./audience-economics.service";
import { AudiencePreviewService } from "./audience-preview.service";
import { AudienceRoiForecastService } from "./audience-roi-forecast.service";
import { AudienceStrategyService } from "./audience-strategy.service";
import { toAudienceGenerateResponse } from "../dto/audience-generate.mapper";
import type { AudienceGenerateResponseDto } from "../dto/audience-generate.dto";

export type GenerateAudienceInput = {
  goal: string;
};

export type GenerateAudienceResult =
  | { ok: true; data: AudienceGenerateResponseDto }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

function computeConfidence(
  filterCount: number,
  audienceSize: number,
  reasoningCount: number,
): number {
  let confidence = 0.72;
  confidence += Math.min(filterCount * 0.04, 0.12);
  confidence += Math.min(reasoningCount * 0.02, 0.06);
  if (audienceSize >= 50) confidence += 0.04;
  if (audienceSize >= 200) confidence += 0.04;
  if (audienceSize === 0) confidence -= 0.2;
  return Math.round(Math.min(0.98, Math.max(0.45, confidence)) * 100) / 100;
}

export class AudienceGenerateService {
  constructor(
    private readonly blueprintProvider: AudienceBlueprintProvider,
    private readonly previewService: AudiencePreviewService,
    private readonly economicsService: AudienceEconomicsService,
    private readonly roiForecastService: AudienceRoiForecastService,
    private readonly strategyService: AudienceStrategyService,
  ) {}

  async generate(input: GenerateAudienceInput): Promise<GenerateAudienceResult> {
    const blueprintResult = await this.blueprintProvider.generateBlueprint(input.goal);
    if (!blueprintResult.ok) return blueprintResult;

    const blueprint = blueprintResult.blueprint;
    const segmentFilters = blueprintFiltersToSegmentFilters(blueprint.filters);

    const [preview, audienceEconomics, populationEconomics] = await Promise.all([
      this.previewService.preview(segmentFilters, blueprint.recommendedChannel),
      this.economicsService.computeForFilters(segmentFilters),
      this.economicsService.getPopulationBaseline(),
    ]);

    const forecast = this.roiForecastService.forecast({
      audienceSize: preview.audienceSize,
      channel: blueprint.recommendedChannel,
      objective: blueprint.objective,
      audienceEconomics,
      populationEconomics,
    });

    const strategy = this.strategyService.buildStrategy(blueprint, preview, forecast);

    const confidence = computeConfidence(
      blueprint.filters.length,
      preview.audienceSize,
      blueprint.reasoning.length,
    );

    return {
      ok: true,
      data: toAudienceGenerateResponse({
        goal: input.goal,
        generatedAudience: {
          name: blueprint.audienceName,
          description: blueprint.description,
          filters: blueprint.filters,
        },
        audiencePreview: preview,
        forecast,
        strategy,
        recommendedChannel: blueprint.recommendedChannel,
        recommendedOffer: blueprint.recommendedOffer,
        confidence,
      }),
    };
  }
}
