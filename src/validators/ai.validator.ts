// zod schemas for the ai endpoints
import { z } from "zod";

export const audienceBuilderSchema = z
  .object({
    prompt: z.string().min(3, "prompt is too short").max(500, "prompt is too long"),
  })
  .strict();

export const campaignAnalystRequestSchema = z
  .object({
    campaignId: z.string().min(1, "campaignId is required"),
  })
  .strict();

// the shape gemini must return for a campaign analysis - anything else gets rejected
export const campaignAnalysisSchema = z
  .object({
    summary: z.string().min(1),
    keyInsights: z.array(z.string().min(1)).min(1).max(8),
    recommendations: z.array(z.string().min(1)).min(1).max(8),
  })
  .strict();

export type CampaignAnalysis = z.infer<typeof campaignAnalysisSchema>;

export { formatZodError } from "./segment.validator";
