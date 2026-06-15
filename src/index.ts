// api entry point
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestLogger } from "./middleware/request-logger";
import { apiError } from "./lib/response";
import { segmentRoutes } from "./routes/segments";
import { campaignRoutes } from "./routes/campaigns";
import { deliveryRoutes } from "./routes/delivery";
import { aiRoutes } from "./routes/ai";
import { audienceBuilderRoutes } from "./routes/audience-builder";
import { campaignStudioRoutes } from "./routes/campaign-studio";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("*", requestLogger);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/segments", segmentRoutes);
app.route("/campaigns", campaignRoutes);
app.route("/campaigns", deliveryRoutes);
app.route("/ai", aiRoutes);
app.route("/audience-builder", audienceBuilderRoutes);
app.route("/campaign-studio", campaignStudioRoutes);

app.onError((err, c) => {
  console.error(err);
  return apiError(c, "internal server error", 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api running on http://localhost:${info.port}`);
});
