# Xeno Mini CRM — Project Plan (AI-Native Edition)

> A focused plan that maps 1:1 to the assignment brief, with a deep AI-native feature set as the differentiator. The product thesis: **the CRM doesn't wait for the marketer — it thinks ahead of them.**

---

## 1. What the Assignment Asks For (the checklist)

Four functional requirements, straight from the brief:

1. **Ingest data** — APIs to take in customers and orders, stored in a database.
2. **Segment shoppers** — let the marketer (or AI) build audiences from behaviour and attributes.
3. **Send personalised communications** — dispatch tailored messages to a chosen audience through a **stubbed channel service**.
4. **Surface performance insights** — track sent / delivered / failed / opened / read / clicked at the campaign level.

Plus three structural requirements:

- **Two services**: the CRM, and a **separate stubbed channel service** that simulates delivery and calls back into a CRM receipt API asynchronously.
- **AI woven in** — not bolted on. Pick one point of view and commit.
- **Deployed + repo + 5–6 min video**.

And one boundary: this is a **marketing CRM** (reach shoppers), not a sales/support CRM (no leads, deals, tickets).

---

## 2. The Product

**"BrewBuddy CRM"** — an AI-native marketing CRM for a fictional coffee chain. The point of view: AI is not an assistant you summon, it's a strategist that proactively surfaces who to target, what to say, and what to do next.

### Pages
| Page | What's on it |
|---|---|
| **Home Dashboard** | Brand stats + **AI Opportunity Discovery cards** (who to target this week) + recent campaigns |
| **Audiences** | Rule builder + **NL→audience** + churn-risk filters + **revenue recovery estimate** per audience |
| **Customers** | Customer list with **AI personas** + churn-risk badges; customer detail with profile insights |
| **Campaigns** | Campaign list; creation wizard with **strategy generator, message generation (tones), creative generator** |
| **Campaign Detail** | Live delivery funnel + **AI performance analyst** + **next-campaign suggestions** |
| **Copilot** | Chat interface that orchestrates everything above |

---

## 3. The 11 AI-Native Features (the differentiator)

All features follow one shared pattern — **compute facts with SQL → pass compact JSON to the LLM → get structured JSON back (Zod-validated) → render in UI** — so they share one small AI service layer instead of 11 bespoke integrations.

### ⭐ Tier 1 — The 5 demo-highlight features (build first, polish most)

**1. Natural Language → Audience Builder**
User types: *"Find customers who spent over ₹5000, love Cold Brew, and haven't visited in 45 days."*
AI converts to structured filters (`totalSpend > 5000`, `favoriteItem = Cold Brew`, `daysSinceLastOrder > 45`), rendered into the visual rule builder (editable), with live **Audience Size: 2,341**.
*Implementation:* LLM with the rule-AST JSON schema → Zod-validate → count query.

**2. AI Customer Opportunity Discovery** *(the feature most candidates won't build)*
The home dashboard proactively shows opportunity cards:
- ⚠️ **High-Value Customers At Risk** — 2,341 customers, recoverable revenue ₹12.4L → [Create Campaign]
- ☕ **Cold Brew Enthusiasts gone quiet** — 1,122 haven't ordered in 30 days → [Create Campaign]
- 🎯 **Weekend Customers** — engagement down 18% this month → [Create Campaign]

Each card carries a pre-built segment, so one click drops the marketer into campaign creation with the audience already selected.
*Implementation:* a daily (or on-demand) job runs a fixed set of SQL analyses (at-risk high-spenders, category-affinity inactives, visit-pattern dips) → stats JSON → LLM writes the headline/narrative → stored in an `AiInsight` table → rendered as cards.

**3. AI Campaign Strategy Generator**
User enters a goal: *"I want to increase repeat visits."*
AI responds with a complete strategy: **Recommended audience** (High-Value Inactive, 2,341 customers), **channel** (WhatsApp), **offer** (20% off Cold Brew), **expected reach** — with one-line reasoning for each. [Accept strategy] pre-fills the entire campaign wizard.
*Implementation:* LLM receives goal + aggregate base stats (segment sizes, channel engagement rates, top products) → returns structured `{audienceRules, channel, offer, reasoning}`.

**4. AI Message Generation (with tones + deep personalisation)**
Tone picker: **Professional / Friendly / Gen-Z / Premium**. AI generates campaign copy using `{{first_name}}`, `{{favorite_item}}`, `{{loyalty_tier}}`, recency.
Example (Gen-Z): *"Your Cold Brew misses you. And honestly? We're tired of being the third wheel ☕"*
*Implementation:* LLM with tone + offer + segment description + available placeholders → 2–3 variants; marketer picks/edits.

**5. AI Campaign Performance Analyst**
After a campaign: stats (Sent 2,341 / Opened 1,542 / Clicked 328) broken down by segment attributes, then AI writes:
*"Cold Brew enthusiasts responded significantly better than average. Open rate was 18% higher among Gold members. Consider a follow-up targeting customers who opened but didn't click."*
*Implementation:* `GROUP BY` stats (overall + by loyalty tier + by favorite item) → JSON → LLM narrative with one recommendation.

### Tier 2 — Supporting AI features (build after Tier 1 works end-to-end)

**6. AI Customer Persona Generation**
Every customer gets a generated profile shown on the Customers page: *"Coffee Enthusiast — visits weekends, prefers Cold Brew, responds well to discounts, currently showing churn signals."*
*Implementation:* batch-generated at seed time (one LLM call per ~50 customers, persona from their stats), stored on the customer row. Regenerated on demand from the customer detail page.

**7. AI Churn Prediction**
Every customer scored **High / Medium / Low risk** from visit frequency, spend decline, and recency. Shown as badges on the customer list and usable as a segment filter ("churn risk = High"), feeding directly into campaign creation.
*Implementation:* transparent heuristic score (recency × frequency-drop × spend-trend weights) computed by a scoring job — *not* fake ML. Say in the video: "scoring is heuristic; at scale this becomes a trained model, but the product surface is identical."

**8. AI Revenue Recovery Predictor**
When selecting an audience: **Audience Size: 2,341 · Potential Recoverable Revenue: ₹12.4L**.
*Implementation:* `Σ (customer's avg monthly spend) × expected win-back rate` (a stated assumption, e.g. 20%). Shown next to the audience count everywhere — very CRM-like.

**9. AI Creative Generator** *(huge differentiator — most candidates won't have creatives)*
For a campaign like "20% Off Cold Brew Weekend", AI generates a **promotional banner**, shown inside a WhatsApp / Email / SMS message preview mock.
*Implementation:* image generation API (e.g., Gemini image gen) with a brand-styled prompt, cached per campaign. **Fallback** (if cost/latency bites): an AI-composed HTML/CSS banner template (headline, sub-line, colors chosen by the LLM) rendered as the creative — looks polished, costs nothing.

**10. AI Next Campaign Suggestions** *(makes the product feel proactive)*
After a campaign completes, AI recommends the **Next Best Campaign**: *"Target users who clicked the offer but didn't place an order — 387 customers."* One click creates that follow-up campaign with the audience pre-built from the communication log.
*Implementation:* derive follow-up segments from log statuses (clicked-but-no-order, opened-but-not-clicked, not-delivered) → LLM picks the best one and writes the pitch.

**11. AI Copilot (chat interface)**
The orchestrator. The marketer can ask: *"Who should I target this week?"*, *"Create a campaign for inactive high-spending customers"*, *"Why did this campaign underperform?"*, *"Show me customers likely to churn."*
*Implementation:* LLM function-calling over the **same service functions the UI uses** — `previewAudience`, `getOpportunities`, `generateStrategy`, `draftMessages`, `createCampaign` (requires user confirmation in chat), `getCampaignStats`. Zero duplicated business logic.

### Demo priority
If time is limited, the five to perfect and highlight: **1 (NL→Audience), 2 (Opportunity Discovery), 3 (Strategy Generator), 4 (Message Generation), 5 (Performance Analyst).** These alone make the recruiter feel the product thinks for the marketer.

---

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js + TypeScript** (UI + API routes in one deploy) | Fastest path to a hosted, polished product |
| UI | **Tailwind + shadcn/ui + Recharts** | Clean dashboard + funnel/timeline charts quickly |
| Database | **PostgreSQL (Neon free tier) + Prisma** | Customers/orders/campaigns are naturally relational |
| Channel service | **Small Express/Hono app**, deployed separately (Render free tier) | The brief requires a separate service — separate deploy proves it |
| AI (text) | **GPT-4o-mini or Gemini Flash** with JSON/structured output | One model powers all 11 features through a shared AI service layer |
| AI (creatives) | **Gemini image generation**, cached; HTML-banner fallback | Feature 9 without burning budget |
| Validation | **Zod** on API inputs and every AI output | Never trust input or LLM JSON blindly |
| Hosting | **Vercel** (CRM) + **Render** (channel) + **Neon** (DB) | All free tiers |

---

## 5. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   CRM (Next.js on Vercel)                    │
│                                                              │
│  UI: Home (opportunities) / Audiences / Customers /          │
│      Campaigns / Campaign Detail / Copilot                   │
│                                                              │
│  Core APIs                                                   │
│   POST /api/customers, /api/orders     ← ingestion           │
│   POST /api/segments/preview           ← rules → count + ₹   │
│   POST /api/campaigns                  ← create + launch     │
│   POST /api/receipts                   ← delivery callbacks  │
│                                                              │
│  AI Service Layer (lib/ai) — one shared pattern:             │
│  SQL facts → compact JSON → LLM → Zod-validated JSON → UI    │
│   /api/ai/nl-to-rules        (1)                             │
│   /api/ai/opportunities      (2)  ← insight job, cached      │
│   /api/ai/strategy           (3)                             │
│   /api/ai/messages           (4)                             │
│   /api/ai/performance        (5)                             │
│   /api/ai/personas           (6)  ← batch at seed time       │
│   /api/ai/creative           (9)  ← image gen, cached        │
│   /api/ai/next-campaign      (10)                            │
│   /api/ai/copilot            (11) ← function-calls the rest  │
│                                                              │
│  Jobs: churn scoring (7) + insight refresh (2) — run at      │
│  seed time + on-demand refresh button (cron at scale)        │
└───────────┬────────────────────────────▲─────────────────────┘
            │ POST /send (batches of 50) │ async lifecycle
            │ {id, recipient, message,   │ callbacks, delayed
            │  channel, callbackUrl}     │ 1–30s, batched
            ▼                            │
┌──────────────────────────────────────────────────────────────┐
│         Channel Service (Express on Render)                  │
│   Simulates: ~90% delivered, ~5% failed;                     │
│   of delivered: ~60% opened, ~25% clicked                    │
└──────────────────────────────────────────────────────────────┘

   Postgres (Neon): customers, orders, segments, campaigns,
                    communication_log, ai_insights
   LLM API: one text model + one image model
```

**Two design notes worth saying in the video:**
- The AI layer is **thin and uniform** — every feature is "facts in, structured JSON out, validated." No feature lets the LLM touch the DB directly.
- The copilot has **no logic of its own** — it's function-calling over the same services the buttons use.

### How a campaign flows (the two-service loop)
1. Marketer launches → CRM creates a `Campaign` + one `CommunicationLog` row per audience member (status `PENDING`), each with the rendered personalised message and creative reference.
2. CRM posts to the channel service's `/send` in batches of ~50. Failed calls retry ×3 with backoff, then mark `FAILED`.
3. Channel service responds "accepted", then asynchronously fires lifecycle callbacks to `/api/receipts` — `DELIVERED`, then maybe `OPENED`, then maybe `CLICKED` — with random 1–30s delays.
4. Receipt API rules (answers the brief's "volume, ordering, retries, failures" line without over-building):
   - **Idempotent** — keyed by message ID; duplicate callbacks are no-ops.
   - **No downgrades** — `SENT < DELIVERED < OPENED < CLICKED`; late lower statuses ignored; `FAILED` terminal.
   - **Batched** — receipts arrive/are written in batches, one query per batch. ("At higher volume I'd put a queue in front; for this scope batching keeps DB writes low.")
5. Campaign page polls every few seconds — the funnel visibly fills during the demo, then the AI analyst summary and next-campaign suggestion appear.

---

## 6. Data Model

```prisma
model Customer {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  phone         String?
  city          String?
  totalSpend    Decimal   @default(0)
  orderCount    Int       @default(0)
  lastOrderAt   DateTime?
  favoriteItem  String?   // "Cold Brew" — drives NL filters & personalisation
  loyaltyTier   String    @default("Bronze") // Bronze|Silver|Gold
  visitPattern  String?   // "weekend" | "weekday" | "mixed" — for opportunity discovery
  churnRisk     String    @default("LOW")    // LOW|MEDIUM|HIGH (feature 7)
  churnScore    Float     @default(0)
  persona       String?   // AI-generated profile text (feature 6)
  orders        Order[]
}

model Order {
  id         String   @id @default(cuid())
  customerId String
  amount     Decimal
  items      Json     // [{name, qty, price}] — feeds favoriteItem & affinity insights
  orderedAt  DateTime
  customer   Customer @relation(fields: [customerId], references: [id])
}

model Segment {
  id    String @id @default(cuid())
  name  String
  rules Json   // {op:"AND", conditions:[{field,cmp,value},...]}
}

model AiInsight {              // feature 2 & 10: opportunity / suggestion cards
  id           String   @id @default(cuid())
  type         String   // OPPORTUNITY | NEXT_CAMPAIGN
  title        String   // "High-Value Customers At Risk"
  narrative    String   // LLM-written description
  rules        Json     // pre-built segment for one-click campaign
  audienceSize Int
  estRevenue   Decimal? // feature 8 output
  sourceCampaignId String? // set for NEXT_CAMPAIGN suggestions
  createdAt    DateTime @default(now())
}

model Campaign {
  id           String   @id @default(cuid())
  name         String
  segmentId    String
  channel      String   // WHATSAPP | SMS | EMAIL
  messageBody  String   // with {{placeholders}}
  tone         String?  // Professional|Friendly|GenZ|Premium
  offer        String?  // "20% Off Cold Brew" (from strategy generator)
  creativeUrl  String?  // feature 9: generated banner
  audienceSize Int
  createdAt    DateTime @default(now())
  logs         CommunicationLog[]
}

model CommunicationLog {
  id         String   @id @default(cuid())
  campaignId String
  customerId String
  message    String   // personalised, rendered
  status     String   // PENDING|SENT|DELIVERED|FAILED|OPENED|CLICKED
  updatedAt  DateTime @updatedAt
  campaign   Campaign @relation(fields: [campaignId], references: [id])
}
```

Campaign stats = `GROUP BY status` (plus joins to customer attributes for the performance analyst's breakdowns). Churn scoring + insight generation run at seed time and via a "Refresh insights" button (cron at scale).

**Seed data must support the AI features:** ~1,000 customers / ~5,000 orders with favorite items, loyalty tiers, weekend/weekday patterns, deliberate churn cohorts (a cluster of high-spenders gone quiet), so Opportunity Discovery genuinely finds the ₹12.4L-style story in the data.

---

## 7. Build Plan (3 days, due June 15, 12 PM)

### Day 1 — Backend + the loop + AI foundation
- Scaffold Next.js + Prisma + Neon; schema + migrations (full model above — including AI fields, so no Day-2 migrations).
- Seed script with AI-ready data (favorite items, tiers, churn cohorts, visit patterns).
- Ingestion APIs with Zod validation.
- Churn scoring job (heuristic) — run as part of seed.
- Channel service: `/send` + simulated outcomes + delayed callbacks. Receipt API with idempotency + no-downgrade + batching.
- Campaign launch flow (batch sends + retries).
- **The shared AI service layer** (`lib/ai`): one helper that takes (prompt template, facts JSON, output schema) → validated JSON. Implement feature 1 (NL→rules) on it as the proof.
- **Deploy everything** (Vercel + Render + Neon); verify the loop end-to-end in production.

### Day 2 — UI + Tier 1 AI
- App shell: sidebar (Home / Audiences / Customers / Campaigns / Copilot).
- Audiences: rule builder + live count + revenue-recovery estimate (8) + NL→rules (1).
- Campaign wizard: strategy generator (3) → message generation with tones (4) → channel previews → launch.
- Campaign detail: live funnel, failure count, performance analyst (5).
- Home: stat cards + **Opportunity Discovery cards (2)** with one-click campaign creation.
- Customers page: list with churn badges (7) + personas (6, batch-generated in seed).

### Day 3 — Tier 2 AI + polish + deliverables
- Next-campaign suggestions (10) on completed campaigns.
- Copilot chat (11) — function-calling over existing services; confirmation step before launching.
- Creative generator (9) — image gen with caching, or HTML-banner fallback; channel preview mocks.
- **Pre-run 2–3 campaigns** so the dashboard/insights look alive on first open.
- Polish: empty/loading/error states; the first screen must look great.
- README (setup, architecture diagram, scale notes) + record video + incognito final check.

**If time runs short, cut in this order:** 9 (creative gen) → 11 (copilot) → 6 (personas) → 10 (next-campaign). **Never cut** the channel loop or Tier 1 features 1–5.

---

## 8. Video Script (5–6 min)

| Section | Time | What to say/show |
|---|---|---|
| Product intro | 0:30 | "I built an AI-native CRM for a coffee brand where the AI doesn't wait to be asked — it tells the marketer who to target, recommends the strategy, writes the message, and analyses the results." |
| Functional demo | 1:45 | Home: opportunity cards ("₹12.4L recoverable") → click one → strategy pre-filled → tone-picked AI message + creative preview → launch → funnel filling live → AI performance summary → next-campaign suggestion. Then 15s: NL→audience + copilot one-liner. |
| Architecture | 1:00 | Diagram. The two-service callback loop (idempotent receipts, no downgrades, batching, retries) + the thin uniform AI layer ("facts in, validated JSON out — the LLM never touches the DB"). |
| Code walkthrough | 1:00 | Repo structure, the receipt handler, the shared AI helper + one feature built on it, copilot tools reusing the service layer. |
| AI-native workflow | 0:45 | How you used Cursor — this plan doc as the spec, schema-first generation, an example of AI output you corrected. |

---

## 9. Final Deliverables Checklist

- [ ] Live URL (CRM on Vercel) — works in incognito, no localhost anywhere
- [ ] Channel service deployed separately (different URL)
- [ ] All Tier 1 AI features (1–5) flawless; Tier 2 as built
- [ ] Seeded data that makes Opportunity Discovery genuinely interesting
- [ ] 2–3 pre-run campaigns so insights pages look alive
- [ ] GitHub repo with clear README + architecture diagram
- [ ] 5–6 min walkthrough video
- [ ] Submitted via the form before **June 15, 12 PM**
