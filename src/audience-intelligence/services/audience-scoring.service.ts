import type { BusinessObjective } from "../types/audience-objective";
import type { ScorableSegment, ScoreCategory, SegmentScoreResult } from "../types/segment-scoring.types";
import { SCORING_WEIGHTS, OPTIMAL_AUDIENCE_SIZE } from "../constants/scoring-weights";
import {
  OBJECTIVE_SEGMENT_AFFINITIES,
  extractNumericThreshold,
  segmentTextBlob,
} from "../constants/segment-affinity";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedAverage(categories: ScoreCategory): number {
  const total =
    categories.goalMatch * SCORING_WEIGHTS.goalMatch +
    categories.revenuePotential * SCORING_WEIGHTS.revenuePotential +
    categories.engagement * SCORING_WEIGHTS.engagement +
    categories.retention * SCORING_WEIGHTS.retention +
    categories.audienceSize * SCORING_WEIGHTS.audienceSize;
  return clampScore(total);
}

function scoreGoalMatch(objective: BusinessObjective, segment: ScorableSegment): number {
  const affinity = OBJECTIVE_SEGMENT_AFFINITIES[objective];
  const rules = segment.rules;
  const text = segmentTextBlob(segment);
  let points = 0;
  let checks = 0;

  if (affinity.rfmSegments && rules.rfmSegment) {
    checks++;
    if (affinity.rfmSegments.includes(rules.rfmSegment)) points++;
  }

  if (affinity.churnRisks && rules.churnRisk) {
    checks++;
    if (affinity.churnRisks.includes(rules.churnRisk)) points++;
  }

  if (affinity.loyaltyTiers && rules.loyaltyTier) {
    checks++;
    if (affinity.loyaltyTiers.includes(rules.loyaltyTier)) points++;
  }

  if (affinity.favoriteDrinks && rules.favoriteDrink) {
    checks++;
    if (affinity.favoriteDrinks.some((d) => rules.favoriteDrink?.toLowerCase().includes(d.toLowerCase())))
      points++;
  }

  if (affinity.minLifetimeSpend !== undefined) {
    checks++;
    const threshold = extractNumericThreshold(rules.lifetimeSpend);
    if (threshold !== null && threshold >= affinity.minLifetimeSpend) points++;
  }

  if (affinity.minDaysSinceLastOrder !== undefined) {
    checks++;
    const threshold = extractNumericThreshold(rules.daysSinceLastOrder);
    if (threshold !== null && threshold >= affinity.minDaysSinceLastOrder) points++;
  }

  if (affinity.nameKeywords) {
    checks++;
    if (affinity.nameKeywords.some((kw) => text.includes(kw))) points++;
  }

  if (checks === 0) return 45;
  return clampScore((points / checks) * 100);
}

function scoreRevenuePotential(segment: ScorableSegment): number {
  const threshold = extractNumericThreshold(segment.rules.lifetimeSpend);
  if (threshold === null) {
    const text = segmentTextBlob(segment);
    if (text.includes("high value") || text.includes("spender") || text.includes("premium")) {
      return 80;
    }
    return 50;
  }
  if (threshold >= 10000) return 95;
  if (threshold >= 5000) return 85;
  if (threshold >= 2000) return 70;
  return 55;
}

function scoreEngagement(segment: ScorableSegment): number {
  if (segment.rules.churnRisk === "LOW") return 88;
  if (segment.rules.churnRisk === "MEDIUM") return 68;
  if (segment.rules.churnRisk === "HIGH") return 48;

  const rfm = segment.rules.rfmSegment;
  if (rfm === "Champion" || rfm === "Loyal Customer") return 85;
  if (rfm === "Big Spender") return 78;
  if (rfm === "At Risk") return 55;
  if (rfm === "Lost Customer") return 40;
  return 60;
}

function scoreRetention(segment: ScorableSegment): number {
  const rfm = segment.rules.rfmSegment;
  if (rfm === "Champion") return 92;
  if (rfm === "Loyal Customer") return 86;
  if (rfm === "Big Spender") return 80;
  if (rfm === "At Risk") return 55;
  if (rfm === "Lost Customer") return 35;

  if (segment.rules.loyaltyTier === "GOLD") return 88;
  if (segment.rules.loyaltyTier === "SILVER") return 75;
  if (segment.rules.loyaltyTier === "BRONZE") return 60;
  return 58;
}

function scoreAudienceSize(audienceSize: number): number {
  if (audienceSize <= 0) return 0;
  const ratio = audienceSize / OPTIMAL_AUDIENCE_SIZE;
  if (ratio >= 0.5 && ratio <= 2) return 85;
  if (ratio >= 0.2 && ratio <= 4) return 70;
  if (ratio < 0.2) return Math.max(30, clampScore(ratio * 200));
  return Math.max(40, clampScore(100 - (ratio - 4) * 10));
}

function buildExplanation(
  objective: BusinessObjective,
  segment: ScorableSegment,
  categories: ScoreCategory,
): string {
  const objectiveLabel = objective.replace(/_/g, " ").toLowerCase();
  const signals: string[] = [];

  if (segment.rules.rfmSegment) signals.push(`${segment.rules.rfmSegment} RFM segment`);
  if (segment.rules.churnRisk) signals.push(`${segment.rules.churnRisk.toLowerCase()} churn risk`);
  if (segment.rules.favoriteDrink) signals.push(`${segment.rules.favoriteDrink} preference`);
  if (segment.rules.loyaltyTier) signals.push(`${segment.rules.loyaltyTier} loyalty tier`);

  const signalText = signals.length > 0 ? signals.join(", ") : "saved filter rules";

  if (categories.goalMatch >= 75) {
    return `${segment.name} is highly aligned with ${objectiveLabel} objectives because it targets customers with ${signalText}.`;
  }
  if (categories.goalMatch >= 50) {
    return `${segment.name} is moderately aligned with ${objectiveLabel} goals based on ${signalText} and an audience of ${segment.audienceSize}.`;
  }
  return `${segment.name} offers partial alignment with ${objectiveLabel}; consider as a secondary option with ${segment.audienceSize} reachable customers.`;
}

export class AudienceScoringService {
  scoreSegments(objective: BusinessObjective, segments: ScorableSegment[]): SegmentScoreResult[] {
    return segments
      .map((segment) => {
        const categories: ScoreCategory = {
          goalMatch: scoreGoalMatch(objective, segment),
          revenuePotential: scoreRevenuePotential(segment),
          engagement: scoreEngagement(segment),
          retention: scoreRetention(segment),
          audienceSize: scoreAudienceSize(segment.audienceSize),
        };

        return {
          segmentId: segment.id,
          score: weightedAverage(categories),
          categories,
          explanation: buildExplanation(objective, segment, categories),
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
