import type {
  AudienceGenerateMapperInput,
  AudienceGenerateResponseDto,
} from "./audience-generate.dto";

export function toAudienceGenerateResponse(
  input: AudienceGenerateMapperInput,
): AudienceGenerateResponseDto {
  return {
    goal: input.goal,
    generatedAudience: input.generatedAudience,
    audiencePreview: {
      audienceSize: input.audiencePreview.audienceSize,
      estimatedReach: input.audiencePreview.estimatedReach,
    },
    forecast: {
      expectedOpenRate: input.forecast.expectedOpenRate,
      expectedCtr: input.forecast.expectedCtr,
      expectedRevenueImpact: input.forecast.expectedRevenueImpact,
      roi: input.forecast.roi,
    },
    strategy: input.strategy,
    recommendedChannel: input.recommendedChannel,
    recommendedOffer: input.recommendedOffer,
    confidence: input.confidence,
  };
}
