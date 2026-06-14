import { generateJson } from "../../lib/gemini";
import {
  audienceBlueprintSchema,
  formatZodError,
} from "../validators/audience-blueprint.validator";
import type { AudienceBlueprintProvider } from "./audience-blueprint.provider";
import type { BlueprintProviderResult } from "../types/audience-blueprint.types";
import { buildBlueprintSystemPrompt } from "../constants/audience-filter-prompt";

export class GeminiAudienceBlueprintProvider implements AudienceBlueprintProvider {
  async generateBlueprint(goal: string): Promise<BlueprintProviderResult> {
    const generated = await generateJson(buildBlueprintSystemPrompt(), `Business goal: ${goal}`);
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

    const parsed = audienceBlueprintSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "INVALID_AI_OUTPUT", details: formatZodError(parsed.error) };
    }

    return { ok: true, blueprint: parsed.data };
  }
}
