import type { AudienceIntentProvider } from "../providers/audience-intent.provider";
import type { GoalAnalysisResult } from "../types/audience-objective";

export class AudienceGoalAnalyzerService {
  constructor(private readonly intentProvider: AudienceIntentProvider) {}

  analyzeGoal(goal: string): Promise<GoalAnalysisResult> {
    return this.intentProvider.analyzeGoal(goal);
  }
}
