import type { BusinessObjective } from "../../audience-intelligence/types/audience-objective";
import { OBJECTIVE_CHANNEL_MAPPINGS } from "../../audience-intelligence/constants/channel-mappings";
import type { RecommendedChannel } from "../../audience-intelligence/types/channel-recommendation.types";
import type {
  ChannelIntelligenceResult,
  SegmentAudienceAnalytics,
} from "./types/campaign-intelligence.types";

const ALL_CHANNELS: RecommendedChannel[] = ["WhatsApp", "Email", "SMS"];

function clampConfidence(value: number): number {
  return Math.max(45, Math.min(98, Math.round(value)));
}

function channelShare(analytics: SegmentAudienceAnalytics, channel: RecommendedChannel): number {
  const total = Object.values(analytics.channelDistribution).reduce((sum, n) => sum + n, 0);
  if (total === 0) return 0;
  return (analytics.channelDistribution[channel] ?? 0) / total;
}

export class ChannelIntelligenceService {
  recommend(
    analytics: SegmentAudienceAnalytics,
    objective: BusinessObjective,
  ): ChannelIntelligenceResult {
    const objectiveMapping = OBJECTIVE_CHANNEL_MAPPINGS[objective];
    const scores = new Map<RecommendedChannel, number>();

    for (const channel of ALL_CHANNELS) {
      let score = 50;
      score += channelShare(analytics, channel) * 35;
      if (channel === objectiveMapping.primary) score += 20;
      if (channel === objectiveMapping.secondary) score += 8;
      if (analytics.preferredChannel === channel) score += 12;
      if (analytics.engagementScore >= 70 && channel === "WhatsApp") score += 5;
      if (analytics.churnRisk === "HIGH" && channel === "WhatsApp") score += 6;
      if (analytics.averageSpend >= 5000 && channel === "Email") score += 4;
      scores.set(channel, score);
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0]!;
    const recommendedChannel = top[0];

    const observedShare = channelShare(analytics, recommendedChannel);
    const reasoning: string[] = [
      `${Math.round(observedShare * 100)}% of this audience prefers ${recommendedChannel} based on observed campaign engagement.`,
      `Campaign goal maps to ${objective.replace(/_/g, " ").toLowerCase()} — ${objectiveMapping.reasoning}`,
    ];

    if (analytics.churnRisk === "HIGH") {
      reasoning.push("High churn risk segment benefits from high-visibility, personal channels.");
    } else if (analytics.loyalCustomerSignal) {
      reasoning.push("Loyal customer concentration supports relationship-driven messaging.");
    } else {
      reasoning.push(
        `Segment engagement score is ${analytics.engagementScore}/100 across historical communications.`,
      );
    }

    const alternatives = ranked.slice(1).map(([channel, score]) => ({
      channel,
      confidence: clampConfidence(score),
      reasoning:
        channel === objectiveMapping.secondary
          ? `Strong secondary channel for ${objective.replace(/_/g, " ").toLowerCase()} campaigns.`
          : `${Math.round(channelShare(analytics, channel) * 100)}% observed preference in this audience.`,
    }));

    return {
      recommendedChannel,
      confidence: clampConfidence(top[1]),
      reasoning,
      alternatives,
    };
  }
}
