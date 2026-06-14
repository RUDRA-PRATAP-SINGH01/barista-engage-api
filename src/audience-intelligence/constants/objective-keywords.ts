import type { BusinessObjective } from "../types/audience-objective";

export type ObjectiveKeywordRule = {
  objective: BusinessObjective;
  keywords: string[];
  weight: number;
};

export const OBJECTIVE_KEYWORD_RULES: ObjectiveKeywordRule[] = [
  {
    objective: "WIN_BACK",
    keywords: [
      "win back",
      "bring back",
      "lost customer",
      "lapsed",
      "inactive",
      "churn",
      "comeback",
      "returning",
      "re-engage",
      "reengage",
    ],
    weight: 1,
  },
  {
    objective: "RETENTION",
    keywords: ["retention", "retain", "keep customer", "stay loyal", "reduce churn", "stickiness"],
    weight: 1,
  },
  {
    objective: "REACTIVATION",
    keywords: ["reactivat", "dormant", "sleeping", "haven't visited", "not visited", "inactive"],
    weight: 0.9,
  },
  {
    objective: "LOYALTY",
    keywords: ["loyal", "loyalty", "repeat purchase", "repeat customer", "gold member", "vip"],
    weight: 1,
  },
  {
    objective: "UPSELL",
    keywords: ["upsell", "upgrade", "higher spend", "premium", "increase spend", "high value"],
    weight: 1,
  },
  {
    objective: "CROSS_SELL",
    keywords: ["cross sell", "cross-sell", "try new", "different product", "expand basket"],
    weight: 1,
  },
  {
    objective: "PRODUCT_LAUNCH",
    keywords: ["launch", "new product", "introduce", "promote", "cold brew", "new drink", "new menu"],
    weight: 1,
  },
  {
    objective: "AWARENESS",
    keywords: ["awareness", "brand", "visibility", "reach", "tell customers", "announce"],
    weight: 1,
  },
  {
    objective: "FOOTFALL",
    keywords: ["footfall", "foot traffic", "store visit", "weekend", "walk in", "visit store", "traffic"],
    weight: 1,
  },
  {
    objective: "DISCOUNT_PROMOTION",
    keywords: ["discount", "offer", "deal", "coupon", "promo", "sale", "respond to discount"],
    weight: 1,
  },
];

export const DEFAULT_OBJECTIVE: BusinessObjective = "RETENTION";
