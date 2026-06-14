import type { AudienceIntentProvider } from "./audience-intent.provider";
import type { BusinessObjective, GoalAnalysisResult } from "../types/audience-objective";
import {
  DEFAULT_OBJECTIVE,
  OBJECTIVE_KEYWORD_RULES,
} from "../constants/objective-keywords";

function normalizeGoal(goal: string): string {
  return goal.trim().toLowerCase();
}

export class RuleBasedAudienceIntentProvider implements AudienceIntentProvider {
  async analyzeGoal(goal: string): Promise<GoalAnalysisResult> {
    const normalized = normalizeGoal(goal);
    const scores = new Map<BusinessObjective, number>();

    for (const rule of OBJECTIVE_KEYWORD_RULES) {
      let ruleScore = 0;
      for (const keyword of rule.keywords) {
        if (normalized.includes(keyword)) {
          ruleScore += rule.weight;
        }
      }
      if (ruleScore > 0) {
        const current = scores.get(rule.objective) ?? 0;
        scores.set(rule.objective, current + ruleScore);
      }
    }

    if (scores.size === 0) {
      return {
        objective: DEFAULT_OBJECTIVE,
        confidence: 0.55,
        reasoning:
          "No strong keyword signals detected; defaulting to retention as the closest general engagement objective.",
      };
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    if (!top) {
      return {
        objective: DEFAULT_OBJECTIVE,
        confidence: 0.55,
        reasoning: "Unable to classify goal; defaulting to retention.",
      };
    }

    const [objective, rawScore] = top;
    const secondScore = ranked[1]?.[1] ?? 0;
    const margin = rawScore - secondScore;
    const confidence = Math.min(0.98, 0.6 + margin * 0.12 + rawScore * 0.05);

    const matchedKeywords = OBJECTIVE_KEYWORD_RULES.filter(
      (r) => r.objective === objective,
    ).flatMap((r) => r.keywords.filter((k) => normalized.includes(k)));

    return {
      objective,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Detected ${objective.replace(/_/g, " ").toLowerCase()} intent from signals: ${matchedKeywords.slice(0, 4).join(", ") || "contextual phrasing"}.`,
    };
  }
}
