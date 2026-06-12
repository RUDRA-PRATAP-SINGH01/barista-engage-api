// delivery routes - launch, simulate, analytics. mounted under /campaigns
import { Hono } from "hono";
import {
  sendCampaign,
  simulateCampaign,
  getCampaignAnalytics,
} from "../services/delivery.service";
import { apiSuccess, apiError } from "../lib/response";
import { toAnalyticsDto } from "../types/dto";

export const deliveryRoutes = new Hono();

// launch: DRAFT -> SENDING, all communications PENDING -> SENT
deliveryRoutes.post("/:id/send", async (c) => {
  const result = await sendCampaign(c.req.param("id"));
  if (!result.ok) {
    if (result.error === "NOT_FOUND") return apiError(c, "campaign not found", 404);
    return apiError(
      c,
      `campaign is ${result.status}, only DRAFT campaigns can be sent`,
      400,
    );
  }
  return apiSuccess(c, {
    campaignId: result.campaignId,
    communicationsSent: result.communicationsSent,
  });
});

// simulate delivery + engagement for every sent communication
deliveryRoutes.post("/:id/simulate", async (c) => {
  const result = await simulateCampaign(c.req.param("id"));
  if (!result.ok) {
    if (result.error === "NOT_FOUND") return apiError(c, "campaign not found", 404);
    return apiError(
      c,
      result.status === "DRAFT"
        ? "campaign has not been sent yet, call /send first"
        : `campaign is ${result.status}, simulation already ran`,
      400,
    );
  }
  return apiSuccess(c, result);
});

// aggregated campaign performance
deliveryRoutes.get("/:id/analytics", async (c) => {
  const analytics = await getCampaignAnalytics(c.req.param("id"));
  if (!analytics) return apiError(c, "campaign not found", 404);
  return apiSuccess(c, toAnalyticsDto(analytics));
});
