import type { RecommendedChannel } from "../../audience-intelligence/types/channel-recommendation.types";
import type {
  ChannelIntelligenceResult,
  OfferIntelligenceResult,
  SegmentAudienceAnalytics,
  TimingIntelligenceResult,
} from "../intelligence/types/campaign-intelligence.types";
import type { CampaignStrategyDto, StrategyCardDto } from "../dto/campaign-studio.dto";

export type BuildStrategyInput = {
  goal: string;
  audienceName: string;
  audienceDescription: string;
  audienceSize: number;
  audienceStrategy: {
    why: string;
    what: string;
    how: string;
  };
  channel: RecommendedChannel;
  offer: string;
  timing: string;
  channelRec: ChannelIntelligenceResult;
  offerRec: OfferIntelligenceResult;
  timingRec: TimingIntelligenceResult;
  analytics: SegmentAudienceAnalytics;
};

function channelShare(analytics: SegmentAudienceAnalytics, channel: RecommendedChannel): number {
  const total = Object.values(analytics.channelDistribution).reduce((sum, n) => sum + n, 0);
  if (total === 0) return 0;
  return Math.round(((analytics.channelDistribution[channel] ?? 0) / total) * 100);
}

function splitSentences(text: string, max = 3): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, max);
}

export class CampaignStrategyService {
  build(input: BuildStrategyInput): CampaignStrategyDto {
    const share = channelShare(input.analytics, input.channel);

    const cards: StrategyCardDto[] = [
      {
        id: "audience",
        title: "Why This Audience",
        headline: input.audienceName,
        highlight: `${input.audienceSize.toLocaleString("en-IN")} customers`,
        points: [
          input.audienceStrategy.why,
          input.audienceStrategy.what,
          input.audienceDescription,
        ],
      },
      {
        id: "offer",
        title: "Why This Offer",
        headline: input.offer,
        highlight: `${input.offerRec.confidence}% fit`,
        points: input.offerRec.reasoning,
      },
      {
        id: "channel",
        title: "Why This Channel",
        headline: input.channel,
        highlight: `${share}% channel preference`,
        points: input.channelRec.reasoning,
      },
      {
        id: "timing",
        title: "Why This Timing",
        headline: input.timing,
        highlight: input.timingRec.bestDay,
        points: splitSentences(input.timingRec.reasoning, 3),
      },
    ];

    return { cards };
  }
}
