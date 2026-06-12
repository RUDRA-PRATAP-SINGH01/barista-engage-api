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
import { apiSuccess, apiError, validationErrorMessage } from "../lib/response";
import { toSegmentDto, toSegmentListItemDto } from "../types/dto";

export const segmentRoutes = new Hono();

// preview an audience before saving anything
segmentRoutes.post("/preview", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = previewSegmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const result = await previewSegment(parsed.data.filters);
  return apiSuccess(c, result);
});

// save a reusable segment
segmentRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return apiError(c, "invalid json body", 400);
  }

  const parsed = createSegmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(c, validationErrorMessage(formatZodError(parsed.error)), 400);
  }

  const segment = await createSegment(parsed.data);
  return apiSuccess(c, toSegmentListItemDto(segment), 200);
});

// list all saved segments
segmentRoutes.get("/", async (c) => {
  const segments = await listSegments();
  return apiSuccess(c, segments.map(toSegmentListItemDto));
});

// one segment with its rules + live audience size
segmentRoutes.get("/:id", async (c) => {
  const segment = await getSegmentWithAudience(c.req.param("id"));
  if (!segment) {
    return apiError(c, "segment not found", 404);
  }
  if (segment.invalidRules) {
    return apiError(c, "stored segment rules are invalid, re-create the segment", 422);
  }
  return apiSuccess(c, toSegmentDto(segment));
});
