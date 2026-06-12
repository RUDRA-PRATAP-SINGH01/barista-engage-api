// ai campaign analyst route - thin handler, the analytics + gemini pipeline lives in
// ai-campaign-analyst.service. mounted under /ai
import { Hono } from "hono";
import { campaignAnalystRequestSchema, formatZodError } from "../validators/ai.validator";
import { analyzeCampaign } from "../services/ai-campaign-analyst.service";
import { apiSuccess, apiError, validationErrorMessage } from "../lib/response";

export const aiCampaignAnalystRoutes = new Hono();

// campaign analytics -> ai reasoning -> summary, insights, recommendations
aiCampaignAnalystRoutes.post("/campaign-analyst", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = campaignAnalystRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await analyzeCampaign(parsed.data.campaignId);
  if (!result.ok) {
    switch (result.error) {
      case "NOT_FOUND":
        return apiError(c, "campaign not found", 404);
      case "NOT_CONFIGURED":
        return apiError(c, "ai is not configured, set GEMINI_API_KEY", 500);
      case "AI_UNAVAILABLE":
        return apiError(c, "ai service is unavailable, try again shortly", 500);
      case "RATE_LIMITED":
        return apiError(c, "ai quota exceeded, wait a minute and try again", 429);
      case "INVALID_AI_OUTPUT":
        return apiError(
          c,
          validationErrorMessage(result.details) || "ai produced an invalid analysis, try again",
          422,
        );
    }
  }

  return apiSuccess(c, {
    campaign: result.campaign,
    metrics: result.metrics,
    analysis: result.analysis,
  });
});
