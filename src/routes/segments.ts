// segment routes - validation happens here, all query logic lives in the service
import { Hono } from "hono";
import {
  previewSegmentSchema,
  createSegmentSchema,
  formatZodError,
} from "../validators/segment.validator";
import {
  previewSegment,
  createSegment,
  listSegments,
  getSegmentWithAudience,
} from "../services/segment.service";

export const segmentRoutes = new Hono();

// preview an audience before saving anything
segmentRoutes.post("/preview", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: "invalid json body" }, 400);
  }

  const parsed = previewSegmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation failed", details: formatZodError(parsed.error) }, 400);
  }

  const result = await previewSegment(parsed.data.filters);
  return c.json(result);
});

// save a reusable segment
segmentRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: "invalid json body" }, 400);
  }

  const parsed = createSegmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation failed", details: formatZodError(parsed.error) }, 400);
  }

  const segment = await createSegment(parsed.data);
  return c.json(segment, 201);
});

// list all saved segments, no audience counts here
segmentRoutes.get("/", async (c) => {
  const segments = await listSegments();
  return c.json(segments);
});

// one segment with its rules + live audience size
segmentRoutes.get("/:id", async (c) => {
  const segment = await getSegmentWithAudience(c.req.param("id"));
  if (!segment) {
    return c.json({ error: "segment not found" }, 404);
  }
  return c.json(segment);
});
