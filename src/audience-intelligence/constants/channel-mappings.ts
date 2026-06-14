import type { BusinessObjective } from "../types/audience-objective";
import type { RecommendedChannel } from "../types/channel-recommendation.types";

export type ObjectiveChannelMapping = {
  primary: RecommendedChannel;
  secondary: RecommendedChannel | null;
  confidence: number;
  reasoning: string;
};

export const OBJECTIVE_CHANNEL_MAPPINGS: Record<BusinessObjective, ObjectiveChannelMapping> = {
  WIN_BACK: {
    primary: "WhatsApp",
    secondary: "SMS",
    confidence: 0.91,
    reasoning: "Win-back campaigns perform best on WhatsApp due to high open rates and personal tone.",
  },
  REACTIVATION: {
    primary: "WhatsApp",
    secondary: "SMS",
    confidence: 0.89,
    reasoning: "Reactivation messages need high visibility; WhatsApp delivers strong re-engagement rates.",
  },
  RETENTION: {
    primary: "WhatsApp",
    secondary: "Email",
    confidence: 0.87,
    reasoning: "Retention campaigns benefit from WhatsApp immediacy with email as a supporting channel.",
  },
  LOYALTY: {
    primary: "WhatsApp",
    secondary: "Email",
    confidence: 0.9,
    reasoning: "Loyalty programs work well on WhatsApp for timely rewards, with email for detailed offers.",
  },
  UPSELL: {
    primary: "Email",
    secondary: "WhatsApp",
    confidence: 0.84,
    reasoning: "Upsell campaigns need room for product detail; email supports richer content.",
  },
  CROSS_SELL: {
    primary: "Email",
    secondary: "WhatsApp",
    confidence: 0.83,
    reasoning: "Cross-sell messages benefit from email's ability to showcase multiple products.",
  },
  PRODUCT_LAUNCH: {
    primary: "WhatsApp",
    secondary: "SMS",
    confidence: 0.88,
    reasoning: "Product launches need fast reach; WhatsApp drives immediate awareness and clicks.",
  },
  AWARENESS: {
    primary: "SMS",
    secondary: "Email",
    confidence: 0.82,
    reasoning: "Awareness campaigns prioritize broad reach; SMS and email maximize coverage.",
  },
  FOOTFALL: {
    primary: "SMS",
    secondary: "WhatsApp",
    confidence: 0.86,
    reasoning: "Footfall campaigns need location-timed nudges; SMS delivers time-sensitive store prompts.",
  },
  DISCOUNT_PROMOTION: {
    primary: "WhatsApp",
    secondary: "SMS",
    confidence: 0.9,
    reasoning: "Discount promotions convert best on WhatsApp where offers are seen quickly.",
  },
};
