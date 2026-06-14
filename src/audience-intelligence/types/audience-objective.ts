export const BUSINESS_OBJECTIVES = [
  "WIN_BACK",
  "RETENTION",
  "UPSELL",
  "CROSS_SELL",
  "PRODUCT_LAUNCH",
  "AWARENESS",
  "FOOTFALL",
  "REACTIVATION",
  "LOYALTY",
  "DISCOUNT_PROMOTION",
] as const;

export type BusinessObjective = (typeof BUSINESS_OBJECTIVES)[number];

export type GoalAnalysisResult = {
  objective: BusinessObjective;
  confidence: number;
  reasoning: string;
};

export const OBJECTIVE_CAMPAIGN_TYPES: Record<BusinessObjective, string> = {
  WIN_BACK: "Retention",
  RETENTION: "Retention",
  REACTIVATION: "Retention",
  LOYALTY: "Loyalty",
  UPSELL: "Revenue Growth",
  CROSS_SELL: "Revenue Growth",
  PRODUCT_LAUNCH: "Acquisition",
  AWARENESS: "Brand",
  FOOTFALL: "Traffic",
  DISCOUNT_PROMOTION: "Promotional",
};
