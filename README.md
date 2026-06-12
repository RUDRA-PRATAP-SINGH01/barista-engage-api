# barista-engage-api

Backend for Barista OS - an AI-native customer engagement platform for Barista Coffee. This repo handles the data model, seed data and customer analytics. The API layer (Hono) comes on top of this.

## Stack

- Hono (API framework)
- Prisma 7 + PostgreSQL (Neon)
- TypeScript + Zod
- tsx for running scripts

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and add your Postgres connection string.

Then generate the prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

## Seeding

```bash
npm run db:seed
```

This creates the full dev dataset:

- 40 stores across 7 Indian cities
- 28 products (hot coffee, cold coffee, tea, food, desserts)
- 5000 customers
- 30000 orders with ~54k order items

The seed uses a seeded RNG so every run produces the exact same data.

## Analytics

```bash
npm run db:analytics
```

Builds the `CustomerAnalytics` table (one row per customer) from order history:

- spending metrics - lifetime spend, avg order value, total orders
- recency - last order date, days since last order
- favorite drink + favorite store
- RFM segments - Champion / Loyal Customer / Big Spender / At Risk / Lost Customer
- churn risk - LOW (ordered within 30 days), MEDIUM (31-60), HIGH (60+)

Safe to re-run anytime, it rebuilds the whole table.

The script also closes the feedback loop - it aggregates real campaign results from communications into `messagesSent`, `messagesOpened`, `messagesClicked`, `openRate`, `clickRate`, `lastCampaignInteractionAt`, and derives `actualPreferredChannel` from observed opens. Run it after campaigns to make future targeting smarter.

```bash
npm run db:insights
```

Populates `CustomerInsight` with a persona (Coffee Enthusiast, Deal Hunter, Premium Sipper, Lapsed Customer, etc.) and a marketing summary for every customer, rule-based from analytics. The delivery simulator uses these personas to modify click probabilities.

To eyeball the numbers:

```bash
npm run db:sanity
```

## Running the API

```bash
npm run dev
```

Starts the Hono server on http://localhost:3000.

### Endpoints

**POST /segments/preview** - preview an audience before saving

```json
{
  "filters": {
    "churnRisk": "HIGH",
    "favoriteDrink": "Cold Brew",
    "lifetimeSpend": { "gt": 5000 }
  }
}
```

Returns `count` + up to 20 `sampleCustomers` (sorted by lifetime spend).

**POST /segments** - save a reusable segment

```json
{
  "name": "High Value Cold Brew Lovers",
  "rules": { "churnRisk": "HIGH", "lifetimeSpend": { "gt": 5000 } }
}
```

**GET /segments** - list all segments (id, name, createdAt)

**GET /segments/:id** - segment metadata + rules + live `audienceSize`

### Supported filters (v1)

- customer fields - `city`, `loyaltyTier`
- analytics fields - `churnRisk`, `favoriteDrink`, `rfmSegment`, `lifetimeSpend`, `totalOrders`, `daysSinceLastOrder`
- numeric fields take either a plain number or `{ equals, gt, gte, lt, lte }`

Unknown fields, bad operators and malformed payloads get rejected with a 400 and a list of what's wrong.

**POST /campaigns** - create a campaign from a saved segment

```json
{
  "name": "Win Back Cold Brew Lovers",
  "segmentId": "segment-id",
  "channel": "WHATSAPP",
  "subject": "Your Cold Brew misses you",
  "body": "Come back this weekend and enjoy 20% off"
}
```

Snapshots the audience size and creates one PENDING communication per matched customer, all inside a single transaction. Returns `campaignId`, `targetAudienceSize`, `communicationsCreated` and `status`.

**GET /campaigns** - all campaigns, newest first

**GET /campaigns/:id** - campaign metadata + content + audience snapshot

**GET /campaigns/:id/communications** - communication records with `limit` (default 50, max 200) and `offset` pagination

**POST /campaigns/:id/send** - launch a DRAFT campaign, flips it to SENDING and marks every communication SENT

**POST /campaigns/:id/simulate** - runs the delivery + engagement simulator. outcomes are driven by customer analytics (rfm segment, churn risk, preferred channel, lifetime spend, persona) and channel base rates, not plain randomness. deterministic - seeded by campaignId + customerId so reruns give identical results. flips the campaign to COMPLETED.

**GET /campaigns/:id/analytics** - aggregated performance: sent / delivered / failed / opened / clicked counts, deliveryRate, openRate, clickRate, clickToOpenRate and an rfm segment breakdown of the audience

## AI Audience Builder

The first AI-native feature. Marketers describe an audience in natural language and Gemini translates the intent into structured segment filters. Requires `GEMINI_API_KEY` in `.env` (uses `gemini-2.5-flash` via `@google/genai`).

**POST /ai/audience-builder**

```json
{
  "prompt": "Find customers who love cold brew, haven't visited in 60 days, and spent more than 5000 rupees."
}
```

Response:

```json
{
  "generatedFilters": {
    "favoriteDrink": "Cold Brew",
    "daysSinceLastOrder": { "gt": 60 },
    "lifetimeSpend": { "gt": 5000 }
  },
  "audienceSize": 3,
  "sampleCustomers": ["..."]
}
```

### Design

The AI is just a translator, never a query engine:

```
Natural Language -> Gemini -> Filter JSON -> existing Zod schema -> existing previewSegment() -> audience
```

- the model never touches the database and never writes SQL - it only emits filter JSON
- its output is validated by the **same** `segmentFiltersSchema` used by `POST /segments/preview` and `POST /segments`, so AI segments and manual segments share one implementation - no AI-specific filter logic exists
- the system prompt pins the allowed fields (`city`, `loyaltyTier`, `churnRisk`, `favoriteDrink`, `rfmSegment`, `lifetimeSpend`, `totalOrders`, `daysSinceLastOrder`), the five operators (`equals`, `gt`, `gte`, `lt`, `lte`), the exact catalog values (drink names, cities, rfm segments) and interpretation rules ("a month is 30 days", "high-value means lifetimeSpend > 5000")
- Gemini's `responseSchema` constrained decoding is deliberately NOT used - in testing it degraded translation quality (hallucinated filters, values on wrong fields); `responseMimeType: application/json` + strict Zod validation works reliably

Error handling: `400` bad request body, `422` when the model output fails validation or the request can't be expressed with supported filters (with details), `429` when the Gemini quota is exhausted, `502` when Gemini is unreachable (one automatic retry first), `503` when `GEMINI_API_KEY` is missing. Stack traces never leak.

## AI Campaign Analyst

The second AI-native feature. Analyzes a campaign's real performance data and explains what happened, why it happened, and what to do next. The AI is a reasoning layer only - every number comes from the existing campaign analytics service and the model is forbidden from inventing metrics.

**POST /ai/campaign-analyst**

```json
{
  "campaignId": "cmqaof2dp0000gg7kt1f73brf"
}
```

Response:

```json
{
  "campaign": { "id": "...", "name": "Cold Brew Second Chance", "channel": "WHATSAPP", "status": "COMPLETED" },
  "metrics": {
    "audienceSize": 167,
    "sent": 167,
    "delivered": 145,
    "failed": 22,
    "opened": 108,
    "clicked": 13,
    "deliveryRate": 86.8,
    "openRate": 74.5,
    "clickRate": 9,
    "clickToOpenRate": 12,
    "segmentBreakdown": { "At Risk": 76, "Lost Customer": 61, "Loyal Customer": 20, "Big Spender": 10 }
  },
  "analysis": {
    "summary": "2-4 sentence performance summary",
    "keyInsights": ["3 findings explaining why the campaign performed this way"],
    "recommendations": ["3 actionable next steps grounded in the data"]
  }
}
```

### Design

```
campaignId -> existing getCampaignAnalytics() -> facts JSON -> Gemini -> Zod-validated analysis -> response
```

- no second analytics engine - the fact base is built from the same `getCampaignAnalytics()` used by `GET /campaigns/:id/analytics`, plus the campaign content (subject/body)
- the model only sees the supplied facts and is instructed to never invent numbers or claim unsupplied information (no revenue, no conversions)
- the system prompt includes platform context so the reasoning is grounded: typical per-channel open/delivery rates and what each rfm segment means, so "74.5% open on WhatsApp is on par, 9% click is well above the ~5% baseline" type conclusions are possible
- the analysis shape (`summary`, `keyInsights[]`, `recommendations[]`) is enforced by a strict Zod schema - invalid model output returns `422`, never reaches the client

Error handling matches the audience builder: `400` / `404` (unknown campaign) / `422` / `429` / `502` / `503`.

Both AI features share one Gemini helper (`src/lib/gemini.ts`): `gemini-2.5-flash`, temperature 0, JSON mode, one retry on transient failures (but not on rate limits).

## Project structure

```
src/
  index.ts            # hono server entry
  routes/             # route handlers, thin layer
  services/           # business logic + query building (incl. ai-audience.service)
  validators/         # zod schemas for request validation
  lib/prisma.ts       # shared prisma client
prisma/
  schema.prisma       # the data model
  seed.ts             # dev seed script
  migrations/         # migration history
scripts/
  compute-analytics.ts  # builds CustomerAnalytics
  sanity-checks.ts      # quick queries to verify the data looks right
  verify-counts.ts      # row counts
  list-tables.ts        # lists db tables
cursor/               # project rules and architecture notes
```

## Data model rule

Source tables (Customer, Order, etc.) only store raw facts. Anything derived - favorite drink, lifetime spend, churn risk, RFM - lives in `CustomerAnalytics` / `CustomerInsight` and gets computed from order history. Derived metrics are never duplicated back into source tables.
