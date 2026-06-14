import { z } from "zod";

export const analyzeGoalSchema = z
  .object({
    goal: z.string().min(3, "goal is too short").max(500, "goal is too long"),
  })
  .strict();

export type AnalyzeGoalInput = z.infer<typeof analyzeGoalSchema>;

export { formatZodError } from "./segment.validator";
