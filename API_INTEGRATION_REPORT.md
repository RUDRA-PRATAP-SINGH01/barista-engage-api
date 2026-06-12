# Barista Engage API — Frontend Integration Report

**Base URL:** `http://localhost:3000`  
**CORS Origin:** `http://localhost:5173`  
**Content-Type:** `application/json` (all POST bodies)

---

## Response Envelope

Every API endpoint (except `/health`) uses a consistent envelope.

### Success

```json
{
  "success": true,
  "data": { }
}
```

**HTTP Status:** `200`

### Error

```json
{
  "success": false,
  "message": "human-readable error description"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation error or business rule violation |
| `404` | Resource not found |
| `422` | AI output parsing failure or invalid stored segment rules |
| `429` | AI quota exceeded |
| `500` | Server error (uncaught exception, AI not configured, AI unavailable) |

Raw exceptions are never returned to the client.

---

## Health Check

### `GET /health`

No envelope. Used for load balancer / uptime checks.

**Response `200`:**

```json
{
  "status": "ok"
}
```

---

## Campaigns

### `GET /campaigns`

List all campaigns, newest first.

**Request:** None

**Response `data`:** `CampaignDto[]`

```typescript
{
  id: string;
  name: string;
  status: "DRAFT" | "SENDING" | "COMPLETED";
  audienceSize: number;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  createdAt: string; // ISO 8601
}[]
```

**Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "cmqan0otw0001jo7kz4cx9h1q",
      "name": "Win Back Cold Brew Lovers",
      "status": "COMPLETED",
      "audienceSize": 167,
      "channel": "WHATSAPP",
      "createdAt": "2026-06-12T08:01:15.956Z"
    }
  ]
}
```

---

### `GET /campaigns/:id`

Single campaign with full content and segment reference.

**Params:** `id` — campaign UUID

**Response `data`:** `CampaignDetailDto`

```typescript
{
  id: string;
  name: string;
  status: string;
  audienceSize: number;
  channel: string;
  createdAt: string;
  description: string | null;
  subject: string | null;
  body: string;
  imageUrl: string | null;
  segment: { id: string; name: string };
  scheduledAt: string | null;
  sentAt: string | null;
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `404` | `campaign not found` |

---

### `GET /campaigns/:id/analytics`

Aggregated delivery and engagement metrics.

**Params:** `id` — campaign UUID

**Response `data`:** `AnalyticsDto`

```typescript
{
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  deliveryRate: number;      // percentage, 1 decimal
  openRate: number;        // opens / delivered
  clickRate: number;       // clicks / delivered
  clickToOpenRate: number; // clicks / opens
  segmentBreakdown: Record<string, number>; // RFM segment → count
}
```

**Example:**

```json
{
  "success": true,
  "data": {
    "sent": 167,
    "delivered": 150,
    "failed": 17,
    "opened": 103,
    "clicked": 13,
    "deliveryRate": 89.8,
    "openRate": 68.7,
    "clickRate": 8.7,
    "clickToOpenRate": 12.6,
    "segmentBreakdown": {
      "Lost Customer": 61,
      "At Risk": 76,
      "Big Spender": 10,
      "Loyal Customer": 20
    }
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `404` | `campaign not found` |

---

### `POST /campaigns` *(additional — campaign creation)*

**Request body:**

```typescript
{
  name: string;           // 1–120 chars, required
  description?: string;   // max 500 chars
  segmentId: string;      // required, must exist
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  subject?: string | null; // 1–150 chars, optional for SMS/WhatsApp
  body: string;           // 1–2000 chars, required
  imageUrl?: string | null; // valid URL
}
```

**Response `data`:**

```typescript
{
  campaignId: string;
  name: string;
  targetAudienceSize: number;
  communicationsCreated: number;
  status: string;
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `400` | `validation failed: ...` |
| `404` | `segment not found` |
| `422` | `stored segment rules are invalid, re-create the segment` |

---

### `GET /campaigns/:id/communications` *(additional — paginated)*

**Query params:**

| Param | Type | Default | Range |
|-------|------|---------|-------|
| `limit` | number | `50` | 1–200 |
| `offset` | number | `0` | ≥ 0 |

**Response `data`:**

```typescript
{
  total: number;
  limit: number;
  offset: number;
  communications: {
    id: string;
    customerId: string;
    customerName: string;
    status: string;
    createdAt: string;
  }[];
}
```

---

### `POST /campaigns/:id/send` *(additional — launch)*

**Request:** None

**Response `data`:**

```typescript
{ campaignId: string; communicationsSent: number }
```

**Errors:**

| Status | Message |
|--------|---------|
| `404` | `campaign not found` |
| `400` | `campaign is {status}, only DRAFT campaigns can be sent` |

---

### `POST /campaigns/:id/simulate` *(additional — engagement simulation)*

**Request:** None

**Response `data`:**

```typescript
{
  campaignId: string;
  simulated: number;
  outcomes: { delivered: number; opened: number; clicked: number; failed: number };
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `404` | `campaign not found` |
| `400` | `campaign has not been sent yet, call /send first` |
| `400` | `campaign is {status}, simulation already ran` |

---

## Segments

### `GET /segments`

List all saved segments with rules. Segments with corrupt stored rules are omitted.

**Request:** None

**Response `data`:** `SegmentListItemDto[]`

```typescript
{
  id: string;
  name: string;
  description: string | null;
  rules: SegmentFilters;
}[]
```

> **Note:** `audienceSize` is not included in the list response (computed live on detail only).

---

### `GET /segments/:id`

Single segment with live audience count.

**Params:** `id` — segment UUID

**Response `data`:** `SegmentDto`

```typescript
{
  id: string;
  name: string;
  audienceSize: number;
  description: string | null;
  rules: SegmentFilters;
}
```

**Example:**

```json
{
  "success": true,
  "data": {
    "id": "cmqan0mk50000jo7kkar1qy6o",
    "name": "Cold Brew Win Back",
    "audienceSize": 167,
    "description": null,
    "rules": {
      "churnRisk": "HIGH",
      "favoriteDrink": "Cold Brew"
    }
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `404` | `segment not found` |
| `422` | `stored segment rules are invalid, re-create the segment` |

---

### `POST /segments`

Save a reusable audience segment.

**Request body:**

```typescript
{
  name: string;           // 1–120 chars, required
  description?: string;   // max 500 chars
  rules: SegmentFilters;  // at least one filter required
}
```

**Response `data`:** `SegmentListItemDto` (without `audienceSize`)

**Errors:**

| Status | Message |
|--------|---------|
| `400` | `validation failed: ...` |

---

### `POST /segments/preview`

Preview audience size and sample customers without saving.

**Request body:**

```typescript
{
  filters: SegmentFilters;
}
```

**Response `data`:**

```typescript
{
  count: number;
  sampleCustomers: {
    id: string;
    name: string;
    city: string;
    lifetimeSpend: number;
    favoriteDrink: string | null;
    churnRisk: string | null;
    rfmSegment: string | null;
  }[];
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `400` | `validation failed: ...` |

---

### `SegmentFilters` — Validation Rules

At least one filter is required. Unknown fields are rejected (`.strict()`).

| Field | Type | Values |
|-------|------|--------|
| `city` | `string` | min 1 char |
| `loyaltyTier` | `enum` | `BRONZE`, `SILVER`, `GOLD` |
| `churnRisk` | `enum` | `LOW`, `MEDIUM`, `HIGH` |
| `favoriteDrink` | `string` | min 1 char |
| `rfmSegment` | `enum` | `Champion`, `Loyal Customer`, `Big Spender`, `At Risk`, `Lost Customer` |
| `lifetimeSpend` | `number \| NumericOperator` | rupees |
| `totalOrders` | `number \| NumericOperator` | order count |
| `daysSinceLastOrder` | `number \| NumericOperator` | days |

**NumericOperator:**

```typescript
{
  equals?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}
// At least one operator required when using object form
```

**Examples:**

```json
{ "churnRisk": "HIGH", "favoriteDrink": "Cold Brew" }
```

```json
{ "city": "Bangalore", "lifetimeSpend": { "gt": 5000 } }
```

---

## AI Endpoints

Requires `GEMINI_API_KEY` in server `.env`.

### `POST /ai/audience-builder`

Convert natural language to segment filters and preview the audience.

**Request body:**

```typescript
{
  prompt: string; // 3–500 chars, required
}
```

**Response `data`:**

```typescript
{
  generatedFilters: SegmentFilters;
  audienceSize: number;
  sampleCustomers: SegmentPreviewDto["sampleCustomers"];
}
```

**Example:**

```json
{
  "success": true,
  "data": {
    "generatedFilters": {
      "city": "Bangalore",
      "favoriteDrink": "Cold Brew",
      "lifetimeSpend": { "gt": 5000 }
    },
    "audienceSize": 9,
    "sampleCustomers": [ /* up to 20 customers */ ]
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `400` | `validation failed: prompt: ...` |
| `422` | `validation failed: ...` (AI output could not be parsed into valid filters) |
| `429` | `ai quota exceeded, wait a minute and try again` |
| `500` | `ai is not configured, set GEMINI_API_KEY` |
| `500` | `ai service is unavailable, try again shortly` |

---

### `POST /ai/campaign-analyst`

Analyze campaign performance with AI-generated insights.

**Request body:**

```typescript
{
  campaignId: string; // required, must exist
}
```

**Response `data`:**

```typescript
{
  campaign: {
    id: string;
    name: string;
    channel: string;
    status: string;
  };
  metrics: AnalyticsDto & { audienceSize: number };
  analysis: {
    summary: string;
    keyInsights: string[];    // 1–8 items
    recommendations: string[]; // 1–8 items
  };
}
```

**Errors:**

| Status | Message |
|--------|---------|
| `400` | `validation failed: campaignId: ...` |
| `404` | `campaign not found` |
| `422` | `ai produced an invalid analysis, try again` |
| `429` | `ai quota exceeded, wait a minute and try again` |
| `500` | `ai is not configured, set GEMINI_API_KEY` |
| `500` | `ai service is unavailable, try again shortly` |

---

## Frontend Integration Checklist

### Fetch wrapper example (TypeScript)

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`http://localhost:3000${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

// Usage
const campaigns = await api<CampaignDto[]>("/campaigns");
const analytics = await api<AnalyticsDto>(`/campaigns/${id}/analytics`);
```

### Error handling

```typescript
try {
  const data = await api<SegmentDto>(`/segments/${id}`);
} catch (err) {
  // err.message contains the server message string
  // check response.status separately if using raw fetch
}
```

### CORS

The server allows `http://localhost:5173` globally. No credentials/cookies required.

### Request logging (server-side)

Every request logs: `METHOD /route DURATIONms` to stdout.

---

## Type Definitions (Frontend)

Copy or import from `src/types/dto.ts`:

| Type | Used by |
|------|---------|
| `CampaignDto` | `GET /campaigns` |
| `CampaignDetailDto` | `GET /campaigns/:id` |
| `SegmentDto` | `GET /segments/:id` |
| `SegmentListItemDto` | `GET /segments`, `POST /segments` |
| `AnalyticsDto` | `GET /campaigns/:id/analytics` |
| `SegmentFilters` | segment rules, AI filters |
| `AiAudienceDto` | `POST /ai/audience-builder` |
| `AiCampaignAnalystDto` | `POST /ai/campaign-analyst` |

---

## Verified Endpoint Status

| Endpoint | Status | Envelope | Shape |
|----------|--------|----------|-------|
| `GET /health` | ✅ 200 | N/A | `{ status: "ok" }` |
| `GET /campaigns` | ✅ 200 | ✅ | `CampaignDto[]` |
| `GET /campaigns/:id` | ✅ 200 | ✅ | `CampaignDetailDto` |
| `GET /campaigns/:id/analytics` | ✅ 200 | ✅ | `AnalyticsDto` |
| `GET /segments` | ✅ 200 | ✅ | `SegmentListItemDto[]` |
| `GET /segments/:id` | ✅ 200 | ✅ | `SegmentDto` |
| `POST /segments` | ✅ 200 | ✅ | `SegmentListItemDto` |
| `POST /segments/preview` | ✅ 200 | ✅ | preview shape |
| `POST /ai/audience-builder` | ✅ 200 | ✅ | `AiAudienceDto` |
| `POST /ai/campaign-analyst` | ✅ 429* | ✅ | error envelope |
| CORS preflight | ✅ | — | `access-control-allow-origin: http://localhost:5173` |

\* Tested during audit; returned `429` due to Gemini quota — envelope and status code correct.

---

## Files Changed for Frontend Prep

| File | Purpose |
|------|---------|
| `src/lib/response.ts` | `apiSuccess` / `apiError` helpers |
| `src/middleware/request-logger.ts` | Method + route + duration logging |
| `src/types/dto.ts` | Strongly typed DTOs and mappers |
| `src/index.ts` | CORS, logging, global error handler |
| `src/routes/*.ts` | Consistent envelope on all handlers |
| `src/services/segment.service.ts` | Typed list/create responses |
