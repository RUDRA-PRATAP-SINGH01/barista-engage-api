import type { BusinessObjective } from "../types/audience-objective";
import type { ScorableSegment, SegmentScoreResult } from "../types/segment-scoring.types";
import { OBJECTIVE_OFFER_MAPPINGS } from "../constants/offer-mappings";
import type { RecommendedChannel } from "../types/channel-recommendation.types";

export type RankedAudienceRecommendation = {
  id: string;
  name: string;
  audienceSize: number;
  score: number;
  explanation: string;
};

export type AudienceRecommendationBundle = {
  recommendedAudience: RankedAudienceRecommendation;
  alternatives: RankedAudienceRecommendation[];
  recommendation: {
    bestChannel: RecommendedChannel;
    bestOffer: string;
    bestTiming: string;
    summary: string;
  };
};

function toRankedRecommendation(
  segment: ScorableSegment,
  scoreResult: SegmentScoreResult,
): RankedAudienceRecommendation {
  return {
    id: segment.id,
    name: segment.name,
    audienceSize: segment.audienceSize,
    score: scoreResult.score,
    explanation: scoreResult.explanation,
  };
}

function buildSummary(
  objective: BusinessObjective,
  top: RankedAudienceRecommendation,
  channel: RecommendedChannel,
): string {
  const objectiveLabel = objective.replace(/_/g, " ").toLowerCase();
  return `${top.name} is the top recommendation for your ${objectiveLabel} goal with a fit score of ${top.score}. Reach ${top.audienceSize} customers via ${channel} using ${OBJECTIVE_OFFER_MAPPINGS[objective].bestOffer}.`;
}

export class AudienceRecommendationService {
  buildRecommendations(
    objective: BusinessObjective,
    segments: ScorableSegment[],
    scored: SegmentScoreResult[],
    channel: RecommendedChannel,
  ): AudienceRecommendationBundle {
    if (segments.length === 0 || scored.length === 0) {
      throw new Error("No segments available to recommend");
    }

    const segmentMap = new Map(segments.map((s) => [s.id, s]));
    const ranked = scored
      .map((score) => {
        const segment = segmentMap.get(score.segmentId);
        if (!segment) return null;
        return toRankedRecommendation(segment, score);
      })
      .filter((r): r is RankedAudienceRecommendation => r !== null);

    const top = ranked[0];
    if (!top) {
      throw new Error("No segments available to recommend");
    }

    const alternatives = ranked.slice(1, 4);
    const offerMapping = OBJECTIVE_OFFER_MAPPINGS[objective];

    return {
      recommendedAudience: top,
      alternatives,
      recommendation: {
        bestChannel: channel,
        bestOffer: offerMapping.bestOffer,
        bestTiming: offerMapping.bestTiming,
        summary: buildSummary(objective, top, channel),
      },
    };
  }
}
