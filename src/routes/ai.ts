// ai routes - thin handlers, the gemini + validation pipeline lives in ai-audience.service
import { Hono } from "hono";
import { audienceBuilderSchema, formatZodError } from "../validators/ai.validator";
import { buildAudienceFromPrompt } from "../services/ai-audience.service";
import { apiSuccess, apiError, validationErrorMessage } from "../lib/response";

export const aiRoutes = new Hono();

// natural language -> validated segment filters -> live audience preview
aiRoutes.post("/audience-builder", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = audienceBuilderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await buildAudienceFromPrompt(parsed.data.prompt);
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
            "could not translate the prompt into supported filters, try rephrasing with city, loyalty tier, churn risk, favorite drink, spend, order count or recency",
          422,
        );
    }
  }

  return apiSuccess(c, {
    generatedFilters: result.generatedFilters,
    audienceSize: result.audienceSize,
    sampleCustomers: result.sampleCustomers,
  });
});
