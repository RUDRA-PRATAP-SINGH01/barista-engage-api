import type { ScoreCategory } from "../types/segment-scoring.types";

export const SCORING_WEIGHTS: Record<keyof ScoreCategory, number> = {
  goalMatch: 0.35,
  revenuePotential: 0.25,
  engagement: 0.15,
  retention: 0.15,
  audienceSize: 0.1,
};

// audience size normalization — scores peak around this size
export const OPTIMAL_AUDIENCE_SIZE = 500;
export const MIN_AUDIENCE_SIZE_FOR_SCORING = 1;
