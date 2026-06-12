// delivery routes - launch, simulate, analytics. mounted under /campaigns
import { Hono } from "hono";
import {
  sendCampaign,
  simulateCampaign,
  getCampaignAnalytics,
} from "../services/delivery.service";

export const deliveryRoutes = new Hono();

// launch: DRAFT -> SENDING, all communications PENDING -> SENT
deliveryRoutes.post("/:id/send", async (c) => {
  const result = await sendCampaign(c.req.param("id"));
  if (!result.ok) {
    if (result.error === "NOT_FOUND") return c.json({ error: "campaign not found" }, 404);
    return c.json(
      { error: `campaign is ${result.status}, only DRAFT campaigns can be sent` },
      409,
    );
  }
  return c.json({ campaignId: result.campaignId, communicationsSent: result.communicationsSent });
});

// simulate delivery + engagement for every sent communication
deliveryRoutes.post("/:id/simulate", async (c) => {
  const result = await simulateCampaign(c.req.param("id"));
  if (!result.ok) {
    if (result.error === "NOT_FOUND") return c.json({ error: "campaign not found" }, 404);
    return c.json(
      {
        error:
          result.status === "DRAFT"
            ? "campaign has not been sent yet, call /send first"
            : `campaign is ${result.status}, simulation already ran`,
      },
      409,
    );
  }
  return c.json(result);
});

// aggregated campaign performance
deliveryRoutes.get("/:id/analytics", async (c) => {
  const analytics = await getCampaignAnalytics(c.req.param("id"));
  if (!analytics) return c.json({ error: "campaign not found" }, 404);
  return c.json(analytics);
});
