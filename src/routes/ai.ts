// ai routes - thin handlers, the gemini + validation pipeline lives in ai-audience.service
import { Hono } from "hono";
import { audienceBuilderSchema, formatZodError } from "../validators/ai.validator";
import { buildAudienceFromPrompt } from "../services/ai-audience.service";

export const aiRoutes = new Hono();

// natural language -> validated segment filters -> live audience preview
aiRoutes.post("/audience-builder", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: "invalid json body" }, 400);
  }

  const parsed = audienceBuilderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation failed", details: formatZodError(parsed.error) }, 400);
  }

  const result = await buildAudienceFromPrompt(parsed.data.prompt);
  if (!result.ok) {
    switch (result.error) {
      case "NOT_CONFIGURED":
        return c.json({ error: "ai is not configured, set GEMINI_API_KEY" }, 503);
      case "AI_UNAVAILABLE":
        return c.json({ error: "ai service is unavailable, try again shortly" }, 502);
      case "RATE_LIMITED":
        return c.json({ error: "ai quota exceeded, wait a minute and try again" }, 429);
      case "INVALID_AI_OUTPUT":
        return c.json(
          {
            error:
              "could not translate the prompt into supported filters, try rephrasing with city, loyalty tier, churn risk, favorite drink, spend, order count or recency",
            details: result.details,
          },
          422,
        );
    }
  }

  return c.json({
    generatedFilters: result.generatedFilters,
    audienceSize: result.audienceSize,
    sampleCustomers: result.sampleCustomers,
  });
});
