import { GoogleGenAI } from "@google/genai";
import { buildCreativePrompt } from "../constants/campaign-studio-prompts";
import type { CampaignCreativeDto } from "../dto/campaign-studio.dto";

const IMAGE_MODEL = "gemini-2.5-flash-image";

export type GenerateCreativeInput = {
  campaignName: string;
  campaignObjective: string;
  audienceName: string;
  audienceDescription: string;
  recommendedOffer: string;
  recommendedChannel: string;
  variationHint?: string;
};

export type GenerateCreativeError =
  | "NOT_CONFIGURED"
  | "AI_UNAVAILABLE"
  | "RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "PAID_PLAN_REQUIRED";

export type GenerateCreativeResult =
  | { ok: true; creative: CampaignCreativeDto }
  | { ok: false; error: GenerateCreativeError };

function classifyAiError(err: unknown): GenerateCreativeError {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes('"code":429')) {
    return "RATE_LIMITED";
  }
  if (msg.includes("NOT_FOUND") || msg.includes('"code":404')) {
    return "MODEL_UNAVAILABLE";
  }
  if (/paid plan/i.test(msg)) {
    return "PAID_PLAN_REQUIRED";
  }
  return "AI_UNAVAILABLE";
}

function extractImageFromResponse(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>,
): { mimeType: string; data: string } | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if ("inlineData" in part && part.inlineData?.mimeType?.startsWith("image/")) {
      const { mimeType, data } = part.inlineData;
      if (mimeType && data) {
        return { mimeType, data };
      }
    }
  }
  return null;
}

export class CampaignCreativeService {
  async generate(input: GenerateCreativeInput): Promise<GenerateCreativeResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false, error: "NOT_CONFIGURED" };

    const imagePrompt = [
      buildCreativePrompt(input),
      input.variationHint ? `Variation: ${input.variationHint}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    const ai = new GoogleGenAI({ apiKey });

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: imagePrompt,
          config: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        });

        const image = extractImageFromResponse(response);
        if (image) {
          return {
            ok: true,
            creative: {
              imageUrl: `data:${image.mimeType};base64,${image.data}`,
              imagePrompt,
            },
          };
        }
        console.error(`gemini image model returned no image (attempt ${attempt})`);
      } catch (err) {
        console.error(
          `gemini image call failed (attempt ${attempt}):`,
          err instanceof Error ? err.message : err,
        );
        const classified = classifyAiError(err);
        if (
          classified === "RATE_LIMITED" ||
          classified === "MODEL_UNAVAILABLE" ||
          classified === "PAID_PLAN_REQUIRED"
        ) {
          return { ok: false, error: classified };
        }
      }
    }

    return { ok: false, error: "AI_UNAVAILABLE" };
  }
}
