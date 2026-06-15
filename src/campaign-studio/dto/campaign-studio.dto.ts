import type { AudienceBlueprintFilter } from "../../audience-intelligence/types/audience-blueprint.types";
import type { RecommendedChannel } from "../../audience-intelligence/types/channel-recommendation.types";
import type { CampaignDto } from "../../types/dto";

export type StrategyCardId = "audience" | "offer" | "channel" | "timing";

export type StrategyCardDto = {
  id: StrategyCardId;
  title: string;
  headline: string;
  highlight?: string;
  points: string[];
};

export type CampaignOverviewDto = {
  campaignName: string;
  campaignObjective: string;
  campaignSummary: string;
};

export type CampaignStrategyDto = {
  cards: StrategyCardDto[];
};

export type CampaignRecommendationsDto = {
  recommendedChannel: RecommendedChannel;
  recommendedOffer: string;
  recommendedTiming: string;
  channelReasoning: string[];
  offerReasoning: string[];
  timingReasoning: string[];
};

export type CampaignForecastDto = {
  audienceSize: number;
  expectedReach: number;
  expectedOpenRate: number;
  expectedCtr: number;
  expectedRevenue: number;
  expectedRoi: number;
};

export type CampaignMessageDto = {
  whatsAppMessage: string;
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
};

export type CampaignCreativeDto = {
  imageUrl: string;
  imagePrompt: string;
};

export type CampaignAudienceDto = {
  name: string;
  description: string;
  filters: AudienceBlueprintFilter[];
  audienceSize: number;
};

export type CampaignStudioResponseDto = {
  goal: string;
  audience: CampaignAudienceDto;
  overview: CampaignOverviewDto;
  strategy: CampaignStrategyDto;
  recommendations: CampaignRecommendationsDto;
  forecast: CampaignForecastDto;
  message: CampaignMessageDto;
  creative: CampaignCreativeDto | null;
};

export type SaveCampaignStudioResultDto = {
  segmentId: string;
  campaign: CampaignDto;
  communicationsCreated: number;
};

export type LaunchCampaignStudioResultDto = {
  segmentId: string;
  campaignId: string;
  communicationsSent: number;
};
