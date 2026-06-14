import type { SegmentFilters } from "../../validators/segment.validator";

export type ScorableSegment = {
  id: string;
  name: string;
  description: string | null;
  audienceSize: number;
  rules: SegmentFilters;
};

export type ScoreCategory = {
  goalMatch: number;
  revenuePotential: number;
  engagement: number;
  retention: number;
  audienceSize: number;
};

export type SegmentScoreResult = {
  segmentId: string;
  score: number;
  categories: ScoreCategory;
  explanation: string;
};
