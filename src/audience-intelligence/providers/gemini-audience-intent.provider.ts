import { generateJson } from "../../lib/gemini";
import type { AudienceIntentProvider } from "./audience-intent.provider";
import type { GoalAnalysisResult } from "../types/audience-objective";
import { BUSINESS_OBJECTIVES } from "../types/audience-objective";
import { formatZodError } from "../validators/audience-blueprint.validator";
import { z } from "zod";

const intentSchema = z
  .object({
    objective: z.enum(BUSINESS_OBJECTIVES),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().min(1),
  })
  .strict();

const SYSTEM_PROMPT = `You are a CRM goal classifier for a coffee chain.
Classify the marketer's business goal into exactly one objective.

Objectives: WIN_BACK, RETENTION, UPSELL, CROSS_SELL, PRODUCT_LAUNCH, AWARENESS, FOOTFALL, REACTIVATION, LOYALTY, DISCOUNT_PROMOTION

Return JSON only:
{
  "objective": "WIN_BACK",
  "confidence": 0.92,
  "reasoning": "one sentence explaining the classification"
}`;

export class GeminiAudienceIntentProvider implements AudienceIntentProvider {
  async analyzeGoal(goal: string): Promise<GoalAnalysisResult> {
    const generated = await generateJson(SYSTEM_PROMPT, `Business goal: ${goal}`);
    if (!generated.ok) {
      throw new Error(`gemini intent analysis failed: ${generated.error}`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(generated.text);
    } catch {
      throw new Error("gemini returned malformed json for intent analysis");
    }

    const parsed = intentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `invalid gemini intent output: ${formatZodError(parsed.error)
          .map((d) => d.message)
          .join("; ")}`,
      );
    }

    return parsed.data;
  }
}
