// canonical filter catalog — keep in sync with prisma/seed/lib/reference.ts
export const SEGMENT_CITIES = ["Bangalore", "Delhi", "Mumbai", "Kolkata"] as const;

export const SEGMENT_DRINKS = [
  "Espresso",
  "Americano",
  "Latte",
  "Mocha",
  "Cappuccino",
  "Flat White",
  "Cold Brew",
  "Nitro Cold Brew",
  "Masala Chai",
  "Green Tea",
  "Black Tea",
  "Herbal Tea",
] as const;

export const SEGMENT_RFM_SEGMENTS = [
  "Champion",
  "Loyal Customer",
  "Big Spender",
  "At Risk",
  "Lost Customer",
] as const;

export function formatSegmentCatalogForPrompt(): string {
  return [
    `- city: exact city name. Known cities: ${SEGMENT_CITIES.join(", ")}`,
    "- loyaltyTier: BRONZE | SILVER | GOLD",
    "- churnRisk: LOW | MEDIUM | HIGH",
    `- favoriteDrink: exact product name. Known drinks: ${SEGMENT_DRINKS.join(", ")}`,
    `- rfmSegment: ${SEGMENT_RFM_SEGMENTS.join(" | ")}`,
    "- lifetimeSpend: rupees, numeric operators",
    "- totalOrders: numeric operators",
    "- daysSinceLastOrder: days, numeric operators",
  ].join("\n");
}
