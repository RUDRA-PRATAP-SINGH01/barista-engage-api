import { z } from "zod";
import { generateJson } from "../../lib/gemini";
import { formatZodError } from "../../validators/segment.validator";
import {
  OVERVIEW_SYSTEM_PROMPT,
  buildOverviewUserPrompt,
} from "../constants/campaign-studio-prompts";
import type { CampaignOverviewDto } from "../dto/campaign-studio.dto";

const overviewSchema = z
  .object({
    campaignName: z.string().min(1).max(120),
    campaignObjective: z.string().min(1).max(200),
    campaignSummary: z.string().min(1).max(500),
  })
  .strict();

export type GenerateOverviewInput = {
  goal: string;
  audienceName: string;
  audienceDescription: string;
  audienceSize: number;
  recommendedChannel: string;
  recommendedOffer: string;
  recommendedTiming: string;
};

export type GenerateOverviewResult =
  | { ok: true; overview: CampaignOverviewDto }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

function fallbackOverview(input: GenerateOverviewInput): CampaignOverviewDto {
  const year = new Date().getFullYear();
  const shortGoal = input.goal.length > 80 ? `${input.goal.slice(0, 77)}...` : input.goal;
  return {
    campaignName: `${input.audienceName} Boost ${year}`,
    campaignObjective: shortGoal,
    campaignSummary: `Target ${input.audienceName.toLowerCase()} with ${input.recommendedOffer} via ${input.recommendedChannel}. Scheduled for ${input.recommendedTiming}.`,
  };
}

export class CampaignOverviewService {
  async generate(input: GenerateOverviewInput): Promise<GenerateOverviewResult> {
    const generated = await generateJson(
      OVERVIEW_SYSTEM_PROMPT,
      buildOverviewUserPrompt(input),
    );
    if (!generated.ok) return { ok: false, error: generated.error };

    let raw: unknown;
    try {
      raw = JSON.parse(generated.text);
    } catch {
      return {
        ok: false,
        error: "INVALID_AI_OUTPUT",
        details: [{ field: "(root)", message: "model returned malformed json" }],
      };
    }

    const parsed = overviewSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "INVALID_AI_OUTPUT",
        details: formatZodError(parsed.error),
      };
    }

    return { ok: true, overview: parsed.data };
  }

  fallback(input: GenerateOverviewInput): CampaignOverviewDto {
    return fallbackOverview(input);
  }
}
