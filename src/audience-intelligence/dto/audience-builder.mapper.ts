import type {
  AudienceAnalyzeMapperInput,
  AudienceAnalyzeResponseDto,
  AudienceRecommendationDto,
} from "./audience-builder.dto";

function toRecommendationDto(rec: {
  id: string;
  name: string;
  audienceSize: number;
  score: number;
  explanation: string;
}): AudienceRecommendationDto {
  return {
    id: rec.id,
    name: rec.name,
    audienceSize: rec.audienceSize,
    score: rec.score,
    explanation: rec.explanation,
  };
}

export function toAudienceAnalyzeResponse(
  input: AudienceAnalyzeMapperInput,
): AudienceAnalyzeResponseDto {
  return {
    goal: input.goal,
    goalAnalysis: input.goalAnalysis,
    recommendedAudience: toRecommendationDto(input.recommendations.recommendedAudience),
    alternatives: input.recommendations.alternatives.map(toRecommendationDto),
    recommendation: input.recommendations.recommendation,
    forecast: input.forecast,
  };
}
