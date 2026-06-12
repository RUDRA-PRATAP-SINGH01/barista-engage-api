// shared gemini client for all ai features - json-mode generation with one retry.
// callers own their prompts and validate the returned json with their own zod schemas.
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

export type GeminiJsonResult =
  | { ok: true; text: string }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" };

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("RESOURCE_EXHAUSTED") || msg.includes('"code":429');
}

export async function generateJson(
  systemInstruction: string,
  contents: string,
): Promise<GeminiJsonResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "NOT_CONFIGURED" };

  const ai = new GoogleGenAI({ apiKey });

  // one retry because transient api blips happen - but not for rate limits,
  // an immediate retry against a 429 just burns more quota
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0,
        },
      });
      if (response.text) return { ok: true, text: response.text };
      console.error(`gemini returned empty response (attempt ${attempt})`);
    } catch (err) {
      console.error(
        `gemini call failed (attempt ${attempt}):`,
        err instanceof Error ? err.message : err,
      );
      if (isRateLimit(err)) return { ok: false, error: "RATE_LIMITED" };
    }
  }
  return { ok: false, error: "AI_UNAVAILABLE" };
}
