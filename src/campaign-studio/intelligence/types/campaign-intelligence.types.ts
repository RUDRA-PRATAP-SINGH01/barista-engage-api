import type { RecommendedChannel } from "../../../audience-intelligence/types/channel-recommendation.types";
import type { SegmentFilters } from "../../../validators/segment.validator";

export const CAMPAIGN_OFFERS = [
  "Percentage Discount",
  "Buy One Get One",
  "Free Upgrade",
  "Double Loyalty Points",
  "Free Delivery",
] as const;

export type CampaignOffer = (typeof CAMPAIGN_OFFERS)[number];

export type SegmentAudienceAnalytics = {
  segmentId: string;
  segmentName: string;
  segmentDescription: string | null;
  rules: SegmentFilters;
  audienceSize: number;
  averageSpend: number;
  averageOrderValue: number;
  lifetimeValue: number;
  favoriteProduct: string | null;
  preferredChannel: RecommendedChannel | null;
  engagementScore: number;
  churnRisk: "LOW" | "MEDIUM" | "HIGH";
  churnRiskDistribution: Record<string, number>;
  rfmDistribution: Record<string, number>;
  channelDistribution: Record<string, number>;
  dominantRfmSegment: string | null;
  discountHunterSignal: boolean;
  loyalCustomerSignal: boolean;
  coldBrewSignal: boolean;
  teaSignal: boolean;
};

export type ChannelIntelligenceResult = {
  recommendedChannel: RecommendedChannel;
  confidence: number;
  reasoning: string[];
  alternatives: {
    channel: RecommendedChannel;
    confidence: number;
    reasoning: string;
  }[];
};

export type OfferIntelligenceResult = {
  recommendedOffer: CampaignOffer;
  offerDescription: string;
  confidence: number;
  reasoning: string[];
  alternatives: {
    offer: CampaignOffer;
    description: string;
    reasoning: string;
  }[];
};

export type DayScores = {
  Mon: number;
  Tue: number;
  Wed: number;
  Thu: number;
  Fri: number;
  Sat: number;
  Sun: number;
};

export type TimingIntelligenceResult = {
  bestDay: string;
  bestHour: string;
  reasoning: string;
  dayScores: DayScores;
  dataPoints: number;
};
