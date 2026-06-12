// ai audience builder - turns a natural language prompt into segment filters via gemini.
// the model is just a translator: its output goes through the exact same zod schema and
// preview service as human-created filters. it never touches the db and never writes sql.
import { GoogleGenAI } from "@google/genai";
import {
  segmentFiltersSchema,
  formatZodError,
  type SegmentFilters,
} from "../validators/segment.validator";
import { previewSegment } from "./segment.service";

const MODEL = "gemini-2.5-flash";

// deliberately NO responseSchema here - constrained decoding measurably degraded the
// translations (it hallucinated extra filters and put values on the wrong fields).
// responseMimeType guarantees syntactically valid json, and the strict zod schema below
// is the real enforcement layer - exactly the same one human-created filters go through.

// the catalog values gemini needs to map fuzzy language ("cold brew", "blr") onto exact db values
const SYSTEM_PROMPT = `You are an audience filter generator for a coffee chain CRM.
Convert the marketer's natural language request into a JSON object of segment filters.

Only use these fields (omit any field the request does not mention):
- city: exact city name. Known cities: Bangalore, Delhi, Mumbai, Pune, Hyderabad, Chennai, Kolkata
- loyaltyTier: BRONZE | SILVER | GOLD
- churnRisk: LOW | MEDIUM | HIGH
- favoriteDrink: exact product name. Known drinks: Espresso, Americano, Cappuccino, Latte, Hazelnut Latte, Caramel Latte, Mocha, Flat White, Cold Brew, Iced Americano, Iced Latte, Classic Frappe, Caramel Frappe, Iced Mocha, Masala Chai, Green Tea, Earl Grey, Iced Lemon Tea
- rfmSegment: Champion | Loyal Customer | Big Spender | At Risk | Lost Customer
- lifetimeSpend: rupees, numeric operators
- totalOrders: numeric operators
- daysSinceLastOrder: days, numeric operators

Numeric fields must be an object using only these operators: equals, gt, gte, lt, lte.

Interpretation rules:
- "high-value" / "high spenders" means lifetimeSpend { "gt": 5000 } unless a number is given
- "at risk of churn" / "churning" means churnRisk "HIGH"
- any mention of a time period since the last visit/order ("haven't visited in N days/weeks/months",
  "inactive for N days") MUST become daysSinceLastOrder { "gt": N-in-days }; a week is 7 days,
  a month is 30 days. Never express a time period through rfmSegment or churnRisk.
- "loyal" customers means rfmSegment "Loyal Customer"; "champions" means "Champion"
- "lapsed" / "lost" customers (with no time period given) means rfmSegment "Lost Customer"
- map drink mentions to the closest known drink name (e.g. "cold brew" -> "Cold Brew")

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

// strips nulls and empty operator objects so a sloppy model response still has a fair
// shot at passing the strict zod schema - this is normalization, not validation
function pruneFilters(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      const inner = Object.fromEntries(
        Object.entries(value).filter(([, v]) => v !== null && v !== undefined),
      );
      if (Object.keys(inner).length === 0) continue;
      out[key] = inner;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export type AiAudienceResult =
  | {
      ok: true;
      generatedFilters: SegmentFilters;
      audienceSize: number;
      sampleCustomers: Awaited<ReturnType<typeof previewSegment>>["sampleCustomers"];
    }
  | { ok: false; error: "NOT_CONFIGURED" }
  | { ok: false; error: "AI_UNAVAILABLE" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

export async function buildAudienceFromPrompt(prompt: string): Promise<AiAudienceResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "NOT_CONFIGURED" };

  // 1. natural language -> structured json, one retry because transient api blips happen
  const ai = new GoogleGenAI({ apiKey });
  let text: string | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0,
        },
      });
      text = response.text;
      break;
    } catch (err) {
      console.error(`gemini call failed (attempt ${attempt}):`, err instanceof Error ? err.message : err);
      if (attempt === 2) return { ok: false, error: "AI_UNAVAILABLE" };
    }
  }

  if (!text) {
    return {
      ok: false,
      error: "INVALID_AI_OUTPUT",
      details: [{ field: "(root)", message: "model returned an empty response" }],
    };
  }

  // 2. parse - structured output should guarantee json, but never trust it blindly
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "INVALID_AI_OUTPUT",
      details: [{ field: "(root)", message: "model returned malformed json" }],
    };
  }

  // 3. same validation path as human-created filters
  const parsed = segmentFiltersSchema.safeParse(pruneFilters(raw));
  if (!parsed.success) {
    return { ok: false, error: "INVALID_AI_OUTPUT", details: formatZodError(parsed.error) };
  }

  // 4. same preview engine as POST /segments/preview - no ai-specific query logic
  const preview = await previewSegment(parsed.data);

  return {
    ok: true,
    generatedFilters: parsed.data,
    audienceSize: preview.count,
    sampleCustomers: preview.sampleCustomers,
  };
}
