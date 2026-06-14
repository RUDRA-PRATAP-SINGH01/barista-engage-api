import type { BusinessObjective } from "../types/audience-objective";
import type { RecommendedChannel } from "../types/channel-recommendation.types";
import type { AudienceForecast } from "../types/audience-forecast.types";
import type { AudienceRecommendationBundle } from "../services/audience-recommendation.service";

export type AudienceRecommendationDto = {
  id: string;
  name: string;
  audienceSize: number;
  score: number;
  explanation: string;
};

export type GoalAnalysisDto = {
  objective: BusinessObjective;
  confidence: number;
  campaignType: string;
  revenuePotential: {
    min: number;
    max: number;
  };
};

export type RecommendationDetailsDto = {
  bestChannel: RecommendedChannel;
  bestOffer: string;
  bestTiming: string;
  summary: string;
};

export type AudienceAnalyzeResponseDto = {
  goal: string;
  goalAnalysis: GoalAnalysisDto;
  recommendedAudience: AudienceRecommendationDto;
  alternatives: AudienceRecommendationDto[];
  recommendation: RecommendationDetailsDto;
  forecast: AudienceForecast;
};

export type AudienceAnalyzeMapperInput = {
  goal: string;
  goalAnalysis: GoalAnalysisDto;
  recommendations: AudienceRecommendationBundle;
  channelRec: { channel: RecommendedChannel; confidence: number; reasoning: string };
  forecast: AudienceForecast;
};
