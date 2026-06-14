import { formatSegmentCatalogForPrompt } from "../../constants/segment-catalog";

export const FILTER_INTERPRETATION_RULES = `- "high-value" / "high spenders" means lifetimeSpend { "gt": 5000 } unless a number is given
- "at risk of churn" / "churning" means churnRisk "HIGH"
- any mention of a time period since the last visit/order ("haven't visited in N days/weeks/months",
  "inactive for N days") MUST become daysSinceLastOrder { "gt": N-in-days }; a week is 7 days,
  a month is 30 days, two months is 60 days. Never express a time period through rfmSegment or churnRisk.
- "loyal" customers means rfmSegment "Loyal Customer"; "champions" means "Champion"
- "lapsed" / "lost" customers (with no time period given) means rfmSegment "Lost Customer"
- map drink mentions to the closest known drink name (e.g. "cold brew" -> "Cold Brew")`;

export const BLUEPRINT_EXTRA_RULES = `- "lost customers" / "win back" / "bring back" → objective WIN_BACK, rfmSegment "Lost Customer" or daysSinceLastOrder gt 60, churnRisk HIGH
- "loyal customers" → rfmSegment "Loyal Customer" or loyaltyTier GOLD
- "cold brew" mentions → favoriteDrink "Cold Brew"
- "weekend footfall" → objective FOOTFALL
- "discount" / "offer" → objective DISCOUNT_PROMOTION
- time periods: a week = 7 days, a month = 30 days, two months = 60 days

Channel rules:
- WIN_BACK, REACTIVATION, LOYALTY, PRODUCT_LAUNCH, DISCOUNT_PROMOTION → WhatsApp
- UPSELL, CROSS_SELL → Email
- AWARENESS, FOOTFALL → SMS`;

export function buildFilterOnlySystemPrompt(): string {
  const catalog = formatSegmentCatalogForPrompt();

  return `You are an audience filter generator for a coffee chain CRM.
Convert the marketer's natural language request into a JSON object of segment filters.

Only use these fields (omit any field the request does not mention):
${catalog}

Numeric fields must be an object using only these operators: equals, gt, gte, lt, lte.

Interpretation rules:
${FILTER_INTERPRETATION_RULES}

Return valid JSON only. No explanations, no markdown, no SQL, no comments.
Only include fields the request actually implies - never add extra filters.
If the request cannot be fully expressed with these fields, return the closest valid filter set
using only the fields above. Never invent fields or operators.

Examples:

Request: "Find cold brew lovers who haven't visited in two months"
Output: {"favoriteDrink":"Cold Brew","daysSinceLastOrder":{"gt":60}}

Request: "Show me high-value customers at risk of churn"
Output: {"churnRisk":"HIGH","lifetimeSpend":{"gt":5000}}

Request: "Find loyal cappuccino drinkers in Bangalore"
Output: {"city":"Bangalore","favoriteDrink":"Cappuccino","rfmSegment":"Loyal Customer"}

Request: "Gold members in Mumbai with more than 20 orders"
Output: {"city":"Mumbai","loyaltyTier":"GOLD","totalOrders":{"gt":20}}`;
}

export function buildBlueprintSystemPrompt(): string {
  const catalog = formatSegmentCatalogForPrompt();

  return `You are an audience architect for a coffee chain CRM.
Convert the marketer's business goal into a NEW audience definition with database filters.

Return JSON only. No markdown. No explanations outside JSON.

Use ONLY these objectives:
WIN_BACK, RETENTION, UPSELL, CROSS_SELL, PRODUCT_LAUNCH, AWARENESS, FOOTFALL, REACTIVATION, LOYALTY, DISCOUNT_PROMOTION

Use ONLY these filter fields (string fields use operator "equals"):
${catalog}
Numeric fields must use operator objects via the operator field.

Interpretation rules:
${FILTER_INTERPRETATION_RULES}
${BLUEPRINT_EXTRA_RULES}

Return exactly this JSON shape:
{
  "objective": "WIN_BACK",
  "audienceName": "descriptive audience name",
  "description": "one sentence describing who this audience is",
  "filters": [
    { "field": "daysSinceLastOrder", "operator": "gt", "value": 60 },
    { "field": "lifetimeSpend", "operator": "gt", "value": 3000 }
  ],
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "recommendedChannel": "WhatsApp",
  "recommendedOffer": "specific offer matching the goal"
}

Create a NEW audience tailored to the goal. Include 2-4 precise filters.
Never invent fields. Never return SQL.`;
}
