import { z } from "zod";
import { generateJson } from "../../lib/gemini";
import { formatZodError } from "../../validators/segment.validator";
import {
  MESSAGE_SYSTEM_PROMPT,
  buildMessageUserPrompt,
} from "../constants/campaign-studio-prompts";
import type { CampaignMessageDto, CampaignOverviewDto } from "../dto/campaign-studio.dto";

const messageSchema = z
  .object({
    whatsAppMessage: z.string().min(1).max(1000),
    emailSubject: z.string().min(1).max(150),
    emailBody: z.string().min(1).max(2000),
    smsMessage: z.string().min(1).max(320),
  })
  .strict();

export type GenerateMessageInput = {
  goal: string;
  overview: CampaignOverviewDto;
  audienceName: string;
  audienceDescription: string;
  recommendedChannel: string;
  recommendedOffer: string;
  recommendedTiming: string;
  existingMessage?: Partial<CampaignMessageDto>;
};

export type GenerateMessageResult =
  | { ok: true; message: CampaignMessageDto }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

function fallbackMessage(input: GenerateMessageInput): CampaignMessageDto {
  const { overview, recommendedOffer, recommendedChannel, audienceName } = input;
  return {
    whatsAppMessage: `Hi! As one of our ${audienceName}, enjoy ${recommendedOffer} on your next Barista visit. ${overview.campaignSummary} Tap to order now!`,
    emailSubject: `${overview.campaignName} — ${recommendedOffer} for you`,
    emailBody: `Dear valued customer,\n\n${overview.campaignSummary}\n\nWe're offering ${recommendedOffer} exclusively for ${audienceName}. Visit your nearest Barista outlet or order online to redeem.\n\nWarm regards,\nTeam Barista`,
    smsMessage: `Barista: ${recommendedOffer} for ${audienceName}! Order now. T&C apply.`,
  };
}

export class CampaignMessageService {
  async generate(input: GenerateMessageInput): Promise<GenerateMessageResult> {
    const generated = await generateJson(
      MESSAGE_SYSTEM_PROMPT,
      buildMessageUserPrompt(input),
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

    const parsed = messageSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "INVALID_AI_OUTPUT",
        details: formatZodError(parsed.error),
      };
    }

    return { ok: true, message: parsed.data };
  }

  fallback(input: GenerateMessageInput): CampaignMessageDto {
    return fallbackMessage(input);
  }
}
