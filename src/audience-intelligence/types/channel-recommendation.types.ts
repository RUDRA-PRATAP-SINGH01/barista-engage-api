import type { BusinessObjective } from "./audience-objective";

export type RecommendedChannel = "WhatsApp" | "Email" | "SMS";

export type ChannelRecommendation = {
  channel: RecommendedChannel;
  confidence: number;
  reasoning: string;
};

export type ChannelRecommendationInput = {
  objective: BusinessObjective;
  audienceSize: number;
  segmentRules: Record<string, unknown>;
};
