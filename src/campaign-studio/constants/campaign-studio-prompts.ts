const OVERVIEW_SYSTEM_PROMPT = `You are a marketing campaign strategist for Barista Coffee, an Indian coffee chain.
Given a business goal, audience profile, channel, offer, and timing, generate a campaign overview.

Rules:
- campaignName: catchy, specific, title case, include the current year (e.g. "Tea Loyalty Boost 2026")
- campaignObjective: one clear sentence describing the business outcome
- campaignSummary: 2 short sentences — sentence 1 = who you target, sentence 2 = what offer/action drives conversion
- Stay grounded in the provided audience and offer — do not invent metrics or numbers
- Use Indian English tone, professional but approachable

Example output:
{
  "campaignName": "Tea Loyalty Boost 2026",
  "campaignObjective": "Increase premium tea purchases among loyal tea drinkers.",
  "campaignSummary": "Target engaged tea customers with double loyalty points on their next visit."
}

Return JSON only, exactly this shape, no markdown, no extra fields:
{
  "campaignName": "string",
  "campaignObjective": "string",
  "campaignSummary": "string"
}`;

const MESSAGE_SYSTEM_PROMPT = `You are a copywriter for Barista Coffee, an Indian coffee chain.
Write personalized campaign copy for the given audience, channel, offer, and campaign overview.

Rules:
- whatsAppMessage: conversational, under 300 chars, include offer and a clear CTA, no markdown
- emailSubject: compelling, under 80 chars
- emailBody: warm professional tone, 2-3 short paragraphs, include offer details and CTA
- smsMessage: concise, under 160 chars, include offer and CTA
- Reference the audience segment naturally (e.g. "tea lovers", "loyal customers")
- Use ₹ for prices when mentioning amounts
- Do not invent discount percentages not implied by the offer
- Match tone to the channel: WhatsApp = friendly, Email = polished, SMS = direct

Return JSON only, exactly this shape, no markdown, no extra fields:
{
  "whatsAppMessage": "string",
  "emailSubject": "string",
  "emailBody": "string",
  "smsMessage": "string"
}`;

export function buildOverviewUserPrompt(input: {
  goal: string;
  audienceName: string;
  audienceDescription: string;
  audienceSize: number;
  recommendedChannel: string;
  recommendedOffer: string;
  recommendedTiming: string;
}): string {
  return JSON.stringify({
    goal: input.goal,
    audience: {
      name: input.audienceName,
      description: input.audienceDescription,
      size: input.audienceSize,
    },
    recommendedChannel: input.recommendedChannel,
    recommendedOffer: input.recommendedOffer,
    recommendedTiming: input.recommendedTiming,
  });
}

export function buildMessageUserPrompt(input: {
  goal: string;
  overview: { campaignName: string; campaignObjective: string; campaignSummary: string };
  audienceName: string;
  audienceDescription: string;
  recommendedChannel: string;
  recommendedOffer: string;
  recommendedTiming: string;
  existingMessage?: Partial<{
    whatsAppMessage: string;
    emailSubject: string;
    emailBody: string;
    smsMessage: string;
  }>;
}): string {
  return JSON.stringify({
    goal: input.goal,
    campaign: input.overview,
    audience: { name: input.audienceName, description: input.audienceDescription },
    recommendedChannel: input.recommendedChannel,
    recommendedOffer: input.recommendedOffer,
    recommendedTiming: input.recommendedTiming,
    regenerateHint: input.existingMessage
      ? "Generate fresh copy different from the previous version"
      : undefined,
  });
}

export function buildCreativePrompt(input: {
  campaignName: string;
  campaignObjective: string;
  audienceName: string;
  audienceDescription: string;
  recommendedOffer: string;
  recommendedChannel: string;
}): string {
  return [
    "Premium marketing creative for Barista Coffee, an Indian coffee chain.",
    `Campaign: ${input.campaignName}.`,
    `Objective: ${input.campaignObjective}.`,
    `Target audience: ${input.audienceName} — ${input.audienceDescription}.`,
    `Offer: ${input.recommendedOffer}.`,
    `Channel: ${input.recommendedChannel}.`,
    "Style: warm premium coffee and tea brand, appetizing beverage hero shot,",
    "clean modern layout, rich browns and cream tones, subtle Indian café aesthetic,",
    "no text overlays, no logos, photorealistic product photography, square 1:1 aspect ratio.",
  ].join(" ");
}

export { OVERVIEW_SYSTEM_PROMPT, MESSAGE_SYSTEM_PROMPT };
