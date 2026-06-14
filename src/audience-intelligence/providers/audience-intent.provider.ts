import type { GoalAnalysisResult } from "../types/audience-objective";

export interface AudienceIntentProvider {
  analyzeGoal(goal: string): Promise<GoalAnalysisResult>;
}
