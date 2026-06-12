// zod schemas for the segmentation endpoints
// everything is strict - unknown fields and operators get rejected with a clear error
import { z } from "zod";

// numeric filters accept either a plain number (exact match) or operator objects like { gt: 5000 }
const numericFilter = z.union(
  [
    z.number(),
    z
      .object({
        equals: z.number().optional(),
        gt: z.number().optional(),
        gte: z.number().optional(),
        lt: z.number().optional(),
        lte: z.number().optional(),
      })
      .strict()
      .refine((obj) => Object.keys(obj).length > 0, {
        message: "numeric filter needs at least one operator (equals, gt, gte, lt, lte)",
      }),
  ],
  { error: "must be a number or an object with operators: equals, gt, gte, lt, lte" },
);

// v1 filter set - customer fields + analytics fields
export const segmentFiltersSchema = z
  .object({
    // Customer fields
    city: z.string().min(1).optional(),
    loyaltyTier: z.enum(["BRONZE", "SILVER", "GOLD"]).optional(),
    // CustomerAnalytics fields
    churnRisk: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    favoriteDrink: z.string().min(1).optional(),
    rfmSegment: z
      .enum(["Champion", "Loyal Customer", "Big Spender", "At Risk", "Lost Customer"])
      .optional(),
    lifetimeSpend: numericFilter.optional(),
    totalOrders: numericFilter.optional(),
    daysSinceLastOrder: numericFilter.optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one filter is required",
  });

export const previewSegmentSchema = z
  .object({
    filters: segmentFiltersSchema,
  })
  .strict();

export const createSegmentSchema = z
  .object({
    name: z.string().min(1, "name is required").max(120),
    description: z.string().max(500).optional(),
    rules: segmentFiltersSchema,
  })
  .strict();

export type SegmentFilters = z.infer<typeof segmentFiltersSchema>;

// turns zod issues into a readable list like { field: "filters.lifetimeSpend", message: "..." }
export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}
