import { z } from "zod";
import { BUSINESS_OBJECTIVES } from "../types/audience-objective";
import {
  BLUEPRINT_FILTER_FIELDS,
  BLUEPRINT_OPERATORS,
  NUMERIC_BLUEPRINT_FIELDS,
} from "../types/audience-blueprint.types";

const numericBlueprintFields = new Set<string>(NUMERIC_BLUEPRINT_FIELDS);
const stringOnlyOperators = new Set<"equals">(["equals"]);

const loyaltyTierValues = ["BRONZE", "SILVER", "GOLD"] as const;
const churnRiskValues = ["LOW", "MEDIUM", "HIGH"] as const;
const rfmSegmentValues = [
  "Champion",
  "Loyal Customer",
  "Big Spender",
  "At Risk",
  "Lost Customer",
] as const;

const blueprintFilterSchema = z
  .object({
    field: z.enum(BLUEPRINT_FILTER_FIELDS),
    operator: z.enum(BLUEPRINT_OPERATORS),
    value: z.union([z.string().min(1), z.number()]),
  })
  .strict()
  .superRefine((filter, ctx) => {
    if (numericBlueprintFields.has(filter.field)) {
      if (typeof filter.value !== "number") {
        ctx.addIssue({
          code: "custom",
          message: `${filter.field} requires a numeric value`,
          path: ["value"],
        });
      }
      return;
    }

    if (typeof filter.value !== "string") {
      ctx.addIssue({
        code: "custom",
        message: `${filter.field} requires a string value`,
        path: ["value"],
      });
      return;
    }

    if (!stringOnlyOperators.has(filter.operator as "equals")) {
      ctx.addIssue({
        code: "custom",
        message: `${filter.field} only supports the equals operator`,
        path: ["operator"],
      });
    }

    if (filter.field === "loyaltyTier" && !loyaltyTierValues.includes(filter.value as typeof loyaltyTierValues[number])) {
      ctx.addIssue({ code: "custom", message: "invalid loyaltyTier value", path: ["value"] });
    }
    if (filter.field === "churnRisk" && !churnRiskValues.includes(filter.value as typeof churnRiskValues[number])) {
      ctx.addIssue({ code: "custom", message: "invalid churnRisk value", path: ["value"] });
    }
    if (filter.field === "rfmSegment" && !rfmSegmentValues.includes(filter.value as typeof rfmSegmentValues[number])) {
      ctx.addIssue({ code: "custom", message: "invalid rfmSegment value", path: ["value"] });
    }
  });

export const audienceBlueprintSchema = z
  .object({
    objective: z.enum(BUSINESS_OBJECTIVES),
    audienceName: z.string().min(1).max(120),
    description: z.string().min(1).max(500),
    filters: z.array(blueprintFilterSchema).min(1).max(8),
    reasoning: z.array(z.string().min(1)).min(1).max(6),
    recommendedChannel: z.enum(["WhatsApp", "Email", "SMS"]),
    recommendedOffer: z.string().min(1).max(150),
  })
  .strict();

export type ValidatedAudienceBlueprint = z.infer<typeof audienceBlueprintSchema>;

export { formatZodError } from "../../validators/segment.validator";
