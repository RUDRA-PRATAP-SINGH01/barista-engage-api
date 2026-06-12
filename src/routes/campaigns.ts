// campaign routes - thin handlers, all the real work is in campaign.service
import { Hono } from "hono";
import {
  createCampaignSchema,
  communicationsQuerySchema,
  formatZodError,
} from "../validators/campaign.validator";
import {
  createCampaign,
  listCampaigns,
  getCampaign,
  getCampaignCommunications,
} from "../services/campaign.service";

export const campaignRoutes = new Hono();

// create campaign + materialize communications for the whole audience
campaignRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: "invalid json body" }, 400);
  }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation failed", details: formatZodError(parsed.error) }, 400);
  }

  const result = await createCampaign(parsed.data);
  if (!result.ok) {
    if (result.error === "SEGMENT_NOT_FOUND") {
      return c.json({ error: "segment not found" }, 404);
    }
    return c.json({ error: "stored segment rules are invalid, re-create the segment" }, 422);
  }

  return c.json(result.campaign, 201);
});

// all campaigns, newest first
campaignRoutes.get("/", async (c) => {
  return c.json(await listCampaigns());
});

// single campaign with content + audience snapshot
campaignRoutes.get("/:id", async (c) => {
  const campaign = await getCampaign(c.req.param("id"));
  if (!campaign) {
    return c.json({ error: "campaign not found" }, 404);
  }
  return c.json(campaign);
});

// paginated communication records for a campaign
campaignRoutes.get("/:id/communications", async (c) => {
  const parsed = communicationsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "validation failed", details: formatZodError(parsed.error) }, 400);
  }

  const result = await getCampaignCommunications(c.req.param("id"), parsed.data);
  if (!result) {
    return c.json({ error: "campaign not found" }, 404);
  }
  return c.json(result);
});
