// campaign studio routes — unified campaign creation from audience builder output
import { Hono } from "hono";
import {
  generateCampaignStudioSchema,
  generateMessageSchema,
  regenerateMessageSchema,
  generateCreativeSchema,
  saveCampaignStudioSchema,
  launchCampaignStudioSchema,
  formatZodError,
} from "../validators/campaign-studio.validator";
import { apiSuccess, apiError, validationErrorMessage } from "../lib/response";
import { getCampaignStudioService } from "../campaign-studio/container";

export const campaignStudioRoutes = new Hono();

function mapAiError(c: import("hono").Context, error: string) {
  switch (error) {
    case "NOT_CONFIGURED":
      return apiError(c, "ai is not configured, set GEMINI_API_KEY", 500, "CONFIGURATION_ERROR");
    case "AI_UNAVAILABLE":
      return apiError(c, "ai service is unavailable, try again shortly", 500, "MODEL_UNAVAILABLE");
    case "RATE_LIMITED":
      return apiError(c, "ai quota exceeded, wait a minute and try again", 429, "RATE_LIMITED");
    case "MODEL_UNAVAILABLE":
      return apiError(c, "image model is unavailable, try again later", 503, "MODEL_UNAVAILABLE");
    case "PAID_PLAN_REQUIRED":
      return apiError(
        c,
        "image generation requires a paid gemini plan",
        402,
        "PAID_PLAN_REQUIRED",
      );
    default:
      return apiError(c, "unable to process request", 500, "INVALID_PAYLOAD");
  }
}

function mapInvalidAiOutput(
  c: import("hono").Context,
  details: { field: string; message: string }[],
  fallback: string,
) {
  return apiError(c, validationErrorMessage(details) || fallback, 422);
}

// full campaign studio: overview + strategy cards + forecast + gemini messages
campaignStudioRoutes.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = generateCampaignStudioSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().generate(parsed.data);
  if (!result.ok) {
    switch (result.error) {
      case "EMPTY_AUDIENCE":
        return apiError(c, "audience size must be greater than zero", 422);
      case "INVALID_AI_OUTPUT":
        return mapInvalidAiOutput(
          c,
          result.details,
          "ai produced invalid campaign output, try again",
        );
      default:
        return mapAiError(c, result.error);
    }
  }

  return apiSuccess(c, result.data);
});

// gemini message generation only (whatsapp + email + sms)
campaignStudioRoutes.post("/generate-message", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = generateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().generateMessage(parsed.data);
  if (!result.ok) {
    if (result.error === "INVALID_AI_OUTPUT") {
      return mapInvalidAiOutput(
        c,
        result.details,
        "ai produced invalid message output, try again",
      );
    }
    return mapAiError(c, result.error);
  }

  return apiSuccess(c, result.message);
});

// regenerate gemini message copy
campaignStudioRoutes.post("/regenerate-message", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = regenerateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().regenerateMessage(parsed.data);
  if (!result.ok) {
    if (result.error === "INVALID_AI_OUTPUT") {
      return mapInvalidAiOutput(
        c,
        result.details,
        "ai produced invalid message output, try again",
      );
    }
    return mapAiError(c, result.error);
  }

  return apiSuccess(c, result.message);
});

// generate campaign marketing visual (gemini image)
campaignStudioRoutes.post("/generate-creative", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = generateCreativeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().generateCreative(parsed.data);
  if (!result.ok) {
    return mapAiError(c, result.error);
  }

  return apiSuccess(c, result.creative);
});

// regenerate campaign visual with a fresh variation
campaignStudioRoutes.post("/regenerate-creative", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = generateCreativeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().regenerateCreative(parsed.data);
  if (!result.ok) {
    return mapAiError(c, result.error);
  }

  return apiSuccess(c, result.creative);
});

// save campaign — creates segment + draft campaign visible on GET /campaigns
campaignStudioRoutes.post("/save", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = saveCampaignStudioSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().save(parsed.data);
  if (!result.ok) {
    if (result.error === "CAMPAIGN_NOT_FOUND") {
      return apiError(c, "campaign was created but could not be loaded", 500);
    }
    return apiError(c, "stored segment rules are invalid, re-create the audience", 422);
  }

  return apiSuccess(c, result.data, 201);
});

// launch campaign — sends draft campaign to audience
campaignStudioRoutes.post("/launch", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = launchCampaignStudioSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await getCampaignStudioService().launch(parsed.data.campaignId);
  if (!result.ok) {
    if (result.error === "NOT_FOUND") {
      return apiError(c, "campaign not found", 404);
    }
    return apiError(
      c,
      `campaign is ${result.status}, only DRAFT campaigns can be launched`,
      400,
    );
  }

  return apiSuccess(c, result.data);
});
