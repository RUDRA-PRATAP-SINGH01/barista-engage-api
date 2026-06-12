// ai campaign analyst route - thin handler, the analytics + gemini pipeline lives in
// ai-campaign-analyst.service. mounted under /ai
import { Hono } from "hono";
import { campaignAnalystRequestSchema, formatZodError } from "../validators/ai.validator";
import { analyzeCampaign } from "../services/ai-campaign-analyst.service";

export const aiCampaignAnalystRoutes = new Hono();

// campaign analytics -> ai reasoning -> summary, insights, recommendations
aiCampaignAnalystRoutes.post("/campaign-analyst", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: "invalid json body" }, 400);
  }

  const parsed = campaignAnalystRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation failed", details: formatZodError(parsed.error) }, 400);
  }

  const result = await analyzeCampaign(parsed.data.campaignId);
  if (!result.ok) {
    switch (result.error) {
      case "NOT_FOUND":
        return c.json({ error: "campaign not found" }, 404);
      case "NOT_CONFIGURED":
        return c.json({ error: "ai is not configured, set GEMINI_API_KEY" }, 503);
      case "AI_UNAVAILABLE":
        return c.json({ error: "ai service is unavailable, try again shortly" }, 502);
      case "RATE_LIMITED":
        return c.json({ error: "ai quota exceeded, wait a minute and try again" }, 429);
      case "INVALID_AI_OUTPUT":
        return c.json(
          { error: "ai produced an invalid analysis, try again", details: result.details },
          422,
        );
    }
  }

  return c.json({
    campaign: result.campaign,
    metrics: result.metrics,
    analysis: result.analysis,
  });
});
