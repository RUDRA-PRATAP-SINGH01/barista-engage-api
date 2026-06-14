// strips nulls and empty operator objects from raw gemini filter json
export function pruneFilters(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      const inner = Object.fromEntries(
        Object.entries(value).filter(([, v]) => v !== null && v !== undefined),
      );
      if (Object.keys(inner).length === 0) continue;
      out[key] = inner;
    } else {
      out[key] = value;
    }
  }
  return out;
}
