// ai audience builder - turns a natural language prompt into segment filters via gemini.
// the model is just a translator: its output goes through the exact same zod schema and
// preview service as human-created filters. it never touches the db and never writes sql.
import { generateJson } from "../lib/gemini";
import {
  segmentFiltersSchema,
  formatZodError,
  type SegmentFilters,
} from "../validators/segment.validator";
import { previewSegment } from "./segment.service";
import { buildFilterOnlySystemPrompt } from "../audience-intelligence/constants/audience-filter-prompt";
import { pruneFilters } from "../audience-intelligence/utils/prune-filters";

// deliberately NO responseSchema here - constrained decoding measurably degraded the
// translations (it hallucinated extra filters and put values on the wrong fields).
// responseMimeType guarantees syntactically valid json, and the strict zod schema below
// is the real enforcement layer - exactly the same one human-created filters go through.

export type AiAudienceResult =
  | {
      ok: true;
      generatedFilters: SegmentFilters;
      audienceSize: number;
      sampleCustomers: Awaited<ReturnType<typeof previewSegment>>["sampleCustomers"];
    }
  | { ok: false; error: "NOT_CONFIGURED" }
  | { ok: false; error: "AI_UNAVAILABLE" }
  | { ok: false; error: "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

export async function buildAudienceFromPrompt(prompt: string): Promise<AiAudienceResult> {
  const generated = await generateJson(buildFilterOnlySystemPrompt(), prompt);
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

  const parsed = segmentFiltersSchema.safeParse(pruneFilters(raw));
  if (!parsed.success) {
    return { ok: false, error: "INVALID_AI_OUTPUT", details: formatZodError(parsed.error) };
  }

  const preview = await previewSegment(parsed.data);

  return {
    ok: true,
    generatedFilters: parsed.data,
    audienceSize: preview.count,
    sampleCustomers: preview.sampleCustomers,
  };
}
