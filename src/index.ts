// api entry point
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { segmentRoutes } from "./routes/segments";
import { campaignRoutes } from "./routes/campaigns";
import { deliveryRoutes } from "./routes/delivery";
import { aiRoutes } from "./routes/ai";
import { aiCampaignAnalystRoutes } from "./routes/ai-campaign-analyst";

const app = new Hono();

app.use(logger());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/segments", segmentRoutes);
app.route("/campaigns", campaignRoutes);
app.route("/campaigns", deliveryRoutes);
app.route("/ai", aiRoutes);
app.route("/ai", aiCampaignAnalystRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api running on http://localhost:${info.port}`);
});
