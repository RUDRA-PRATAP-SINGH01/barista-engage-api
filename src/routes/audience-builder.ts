// audience intelligence routes - thin controller, orchestration in audience-builder.service
import { Hono } from "hono";
import type { Context } from "hono";
import { analyzeGoalSchema, formatZodError } from "../validators/audience-builder.validator";
import { apiSuccess, apiError, validationErrorMessage } from "../lib/response";
import { markDeprecated } from "../lib/deprecation";
import { getAudienceBuilderService } from "../audience-intelligence/container";
import { getAudienceGenerateService } from "../audience-intelligence/container-generate";

export const audienceBuilderRoutes = new Hono();

async function handleRecommend(c: Context) {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = analyzeGoalSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getAudienceBuilderService().analyzeGoal({ goal: parsed.data.goal });
  if (!result.ok) {
    if (result.error === "NO_SEGMENTS") {
      return apiError(c, "no segments available, create at least one segment first", 404);
    }
    return apiError(c, "unable to analyze goal", 500);
  }

  return apiSuccess(c, result.data);
}

async function handleGenerate(c: Context) {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = analyzeGoalSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getAudienceGenerateService().generate({ goal: parsed.data.goal });
  if (!result.ok) {
    switch (result.error) {
      case "NOT_CONFIGURED":
        return apiError(c, "ai is not configured, set GEMINI_API_KEY", 500);
      case "AI_UNAVAILABLE":
        return apiError(c, "ai service is unavailable, try again shortly", 500);
      case "RATE_LIMITED":
        return apiError(c, "ai quota exceeded, wait a minute and try again", 429);
      case "INVALID_AI_OUTPUT":
        return apiError(
          c,
          validationErrorMessage(result.details) ||
            "ai produced an invalid audience blueprint, try rephrasing your goal",
          422,
        );
    }
  }

  return apiSuccess(c, result.data);
}

// primary: recommend from saved segment library (no gemini)
audienceBuilderRoutes.post("/recommend", handleRecommend);

// backward compat alias — same handler, deprecation headers only
audienceBuilderRoutes.post("/analyze", async (c) => {
  markDeprecated(c, "/audience-builder/recommend");
  return handleRecommend(c);
});

// primary: ai-generated new audience from business goal (gemini + db preview)
audienceBuilderRoutes.post("/generate", handleGenerate);
