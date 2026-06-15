// zod schemas for the ai endpoints
import { z } from "zod";

export const audienceBuilderSchema = z
  .object({
    prompt: z.string().min(3, "prompt is too short").max(500, "prompt is too long"),
  })
  .strict();

export { formatZodError } from "./segment.validator";
