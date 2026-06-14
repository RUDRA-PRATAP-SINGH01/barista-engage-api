import { OBJECTIVE_CAMPAIGN_TYPES } from "../types/audience-objective";
import type { ScorableSegment } from "../types/segment-scoring.types";
import { extractNumericThreshold } from "../constants/segment-affinity";
import { AudienceGoalAnalyzerService } from "./audience-goal-analyzer.service";
import { AudienceScoringService } from "./audience-scoring.service";
import { AudienceRecommendationService } from "./audience-recommendation.service";
import { ChannelRecommendationService } from "./channel-recommendation.service";
import { AudienceForecastService } from "./audience-forecast.service";
import { toAudienceAnalyzeResponse } from "../dto/audience-builder.mapper";
import type { AudienceAnalyzeResponseDto } from "../dto/audience-builder.dto";

export type SegmentRetriever = () => Promise<ScorableSegment[]>;

export type AnalyzeGoalInput = {
  goal: string;
};

export type AnalyzeGoalResult =
  | { ok: true; data: AudienceAnalyzeResponseDto }
  | { ok: false; error: "NO_SEGMENTS" };

function inferAvgLifetimeSpend(segment: ScorableSegment): number {
  const threshold = extractNumericThreshold(segment.rules.lifetimeSpend);
  if (threshold !== null) return threshold;
  if (segment.rules.rfmSegment === "Big Spender" || segment.rules.rfmSegment === "Champion") {
    return 8000;
  }
  if (segment.rules.rfmSegment === "Loyal Customer") return 4500;
  if (segment.rules.rfmSegment === "At Risk") return 3000;
  if (segment.rules.rfmSegment === "Lost Customer") return 2500;
  return 3500;
}

export class AudienceBuilderService {
  constructor(
    private readonly goalAnalyzer: AudienceGoalAnalyzerService,
    private readonly scoringService: AudienceScoringService,
    private readonly recommendationService: AudienceRecommendationService,
    private readonly channelService: ChannelRecommendationService,
    private readonly forecastService: AudienceForecastService,
    private readonly segmentRetriever: SegmentRetriever,
  ) {}

  async analyzeGoal(input: AnalyzeGoalInput): Promise<AnalyzeGoalResult> {
    const goalAnalysis = await this.goalAnalyzer.analyzeGoal(input.goal);
    const segments = await this.segmentRetriever();

    if (segments.length === 0) {
      return { ok: false, error: "NO_SEGMENTS" };
    }

    const scored = this.scoringService.scoreSegments(goalAnalysis.objective, segments);
    const channelRec = this.channelService.recommend(goalAnalysis.objective);
    const recommendations = this.recommendationService.buildRecommendations(
      goalAnalysis.objective,
      segments,
      scored,
      channelRec.channel,
    );

    const topSegment = segments.find((s) => s.id === recommendations.recommendedAudience.id);
    const topScore = scored.find((s) => s.segmentId === recommendations.recommendedAudience.id);

    const forecast = this.forecastService.forecast({
      audienceSize: recommendations.recommendedAudience.audienceSize,
      channel: channelRec.channel,
      objectiveScore: topScore?.score ?? 70,
      avgLifetimeSpendHint: topSegment ? inferAvgLifetimeSpend(topSegment) : 3500,
    });

    return {
      ok: true,
      data: toAudienceAnalyzeResponse({
        goal: input.goal,
        goalAnalysis: {
          objective: goalAnalysis.objective,
          confidence: goalAnalysis.confidence,
          campaignType: OBJECTIVE_CAMPAIGN_TYPES[goalAnalysis.objective],
          revenuePotential: forecast.expectedRevenueImpact,
        },
        recommendations,
        channelRec,
        forecast,
      }),
    };
  }
}
