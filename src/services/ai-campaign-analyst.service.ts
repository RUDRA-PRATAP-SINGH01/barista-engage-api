// ai campaign analyst - explains what happened in a campaign, why, and what to do next.
// the model is a reasoning layer only: every number it sees comes from the existing
// campaign analytics service, and it is forbidden from inventing metrics. its output
// is zod-validated before it ever reaches a client.
import { generateJson } from "../lib/gemini";
import { getCampaignAnalytics } from "./delivery.service";
import { getCampaign } from "./campaign.service";
import {
  campaignAnalysisSchema,
  formatZodError,
  type CampaignAnalysis,
} from "../validators/ai.validator";

const SYSTEM_PROMPT = `You are a CRM campaign analyst for a coffee chain.
You analyze campaign performance using ONLY the metrics provided in the user message.

Hard rules:
- Never invent numbers. Only cite figures that appear in the supplied data.
- Never claim information that is not present (e.g. revenue, conversions, store visits).
- Base every conclusion on the supplied analytics.
- Avoid generic marketing advice - recommendations must be actionable and specific to
  this campaign's audience composition, channel and engagement numbers.
- Reference the rfm segment breakdown and engagement metrics when explaining outcomes.

Context that may help you interpret the numbers:
- Platform-typical open rates by channel: WHATSAPP ~75%, SMS ~55%, EMAIL ~35%.
  Typical delivery rates are 95-98%. Typical click rate is ~5% before audience effects.
- RFM segments: Champion (recent + frequent + top spend), Loyal Customer, Big Spender,
  At Risk (cooling off), Lost Customer (long inactive). At Risk and Lost Customer
  audiences engage well below average; Champions and Big Spenders engage above average.
- rates are percentages. openRate is opens/delivered, clickRate is clicks/delivered,
  clickToOpenRate is clicks/opens.
- A campaign with status DRAFT or SENDING has not finished its delivery lifecycle yet -
  say so instead of over-interpreting zeros.

Return JSON only, exactly this shape, no markdown, no extra fields:
{
  "summary": "2-4 sentence performance summary of what happened",
  "keyInsights": ["3 specific findings explaining why the campaign performed this way"],
  "recommendations": ["3 actionable next steps grounded in the data"]
}`;

export type CampaignAnalystResult =
  | {
      ok: true;
      campaign: { id: string; name: string; channel: string; status: string };
      metrics: {
        audienceSize: number;
        sent: number;
        delivered: number;
        failed: number;
        opened: number;
        clicked: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        clickToOpenRate: number;
        segmentBreakdown: Record<string, number>;
      };
      analysis: CampaignAnalysis;
    }
  | { ok: false; error: "NOT_FOUND" }
  | { ok: false; error: "NOT_CONFIGURED" }
  | { ok: false; error: "AI_UNAVAILABLE" }
  | { ok: false; error: "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

export async function analyzeCampaign(campaignId: string): Promise<CampaignAnalystResult> {
  // all numbers come from the same analytics service the rest of the app uses
  const [analytics, campaign] = await Promise.all([
    getCampaignAnalytics(campaignId),
    getCampaign(campaignId),
  ]);
  if (!analytics || !campaign) return { ok: false, error: "NOT_FOUND" };

  // the complete fact base for the model - if it is not in here, the model may not say it
  const facts = {
    campaign: {
      name: analytics.name,
      channel: analytics.channel,
      status: analytics.status,
      segment: analytics.segment.name,
      sentAt: analytics.sentAt,
    },
    content: {
      subject: campaign.subject,
      body: campaign.body,
    },
    metrics: {
      audienceSize: analytics.audienceSize,
      sent: analytics.sent,
      delivered: analytics.delivered,
      failed: analytics.failed,
      opened: analytics.opened,
      clicked: analytics.clicked,
      deliveryRate: analytics.deliveryRate,
      openRate: analytics.openRate,
      clickRate: analytics.clickRate,
      clickToOpenRate: analytics.clickToOpenRate,
    },
    audienceCompositionByRfmSegment: analytics.segmentBreakdown,
  };

  const generated = await generateJson(
    SYSTEM_PROMPT,
    `Analyze this campaign:\n${JSON.stringify(facts, null, 2)}`,
  );
  if (!generated.ok) return { ok: false, error: generated.error };

  let raw: unknown;
  try {
    raw = JSON.parse(generated.text);
  } catch {
    return {
      ok: false,
      error: "INVALID_AI_OUTPUT",
      details: [{ field: "(root)", message: "model returned malformed json" }],
    };
  }

  const parsed = campaignAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_AI_OUTPUT", details: formatZodError(parsed.error) };
  }

  return {
    ok: true,
    campaign: {
      id: analytics.campaignId,
      name: analytics.name,
      channel: analytics.channel,
      status: analytics.status,
    },
    metrics: {
      audienceSize: analytics.audienceSize,
      sent: analytics.sent,
      delivered: analytics.delivered,
      failed: analytics.failed,
      opened: analytics.opened,
      clicked: analytics.clicked,
      deliveryRate: analytics.deliveryRate,
      openRate: analytics.openRate,
      clickRate: analytics.clickRate,
      clickToOpenRate: analytics.clickToOpenRate,
      segmentBreakdown: analytics.segmentBreakdown,
    },
    analysis: parsed.data,
  };
}
