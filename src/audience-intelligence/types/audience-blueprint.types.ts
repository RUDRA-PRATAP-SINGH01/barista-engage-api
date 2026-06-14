import type { BusinessObjective } from "./audience-objective";
import type { RecommendedChannel } from "./channel-recommendation.types";

export const BLUEPRINT_FILTER_FIELDS = [
  "city",
  "loyaltyTier",
  "churnRisk",
  "favoriteDrink",
  "rfmSegment",
  "lifetimeSpend",
  "totalOrders",
  "daysSinceLastOrder",
] as const;

export type BlueprintFilterField = (typeof BLUEPRINT_FILTER_FIELDS)[number];

export const NUMERIC_BLUEPRINT_FIELDS = [
  "lifetimeSpend",
  "totalOrders",
  "daysSinceLastOrder",
] as const;

export type NumericBlueprintField = (typeof NUMERIC_BLUEPRINT_FIELDS)[number];

export const BLUEPRINT_OPERATORS = ["equals", "gt", "gte", "lt", "lte"] as const;

export type BlueprintOperator = (typeof BLUEPRINT_OPERATORS)[number];

export type AudienceBlueprintFilter = {
  field: BlueprintFilterField;
  operator: BlueprintOperator;
  value: string | number;
};

export type AudienceBlueprint = {
  objective: BusinessObjective;
  audienceName: string;
  description: string;
  filters: AudienceBlueprintFilter[];
  reasoning: string[];
  recommendedChannel: RecommendedChannel;
  recommendedOffer: string;
};

export type BlueprintProviderResult =
  | { ok: true; blueprint: AudienceBlueprint }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };
