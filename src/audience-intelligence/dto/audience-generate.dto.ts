import type { AudienceBlueprintFilter } from "../types/audience-blueprint.types";
import type { RecommendedChannel } from "../types/channel-recommendation.types";
import type { RoiForecastResult } from "../services/audience-roi-forecast.service";

export type GeneratedAudienceDto = {
  name: string;
  description: string;
  filters: AudienceBlueprintFilter[];
};

export type AudiencePreviewDto = {
  audienceSize: number;
  estimatedReach: number;
  audiencePercentage: number;
  segmentDistribution: Record<string, number>;
};

export type AudienceForecastDto = {
  expectedReach: number;
  expectedOpenRate: number;
  expectedCtr: number;
  expectedConversions: number;
  expectedRevenueImpact: {
    min: number;
    max: number;
  };
  roi: number;
};

export type AudienceStrategyDto = {
  why: string;
  what: string;
  how: string;
};

export type AudienceGenerateResponseDto = {
  goal: string;
  generatedAudience: GeneratedAudienceDto;
  audiencePreview: Pick<AudiencePreviewDto, "audienceSize" | "estimatedReach">;
  forecast: Pick<
    AudienceForecastDto,
    "expectedOpenRate" | "expectedCtr" | "expectedRevenueImpact" | "roi"
  >;
  strategy: AudienceStrategyDto;
  recommendedChannel: RecommendedChannel;
  recommendedOffer: string;
  confidence: number;
};

export type AudienceGenerateMapperInput = {
  goal: string;
  generatedAudience: GeneratedAudienceDto;
  audiencePreview: AudiencePreviewDto;
  forecast: RoiForecastResult;
  strategy: AudienceStrategyDto;
  recommendedChannel: RecommendedChannel;
  recommendedOffer: string;
  confidence: number;
};
