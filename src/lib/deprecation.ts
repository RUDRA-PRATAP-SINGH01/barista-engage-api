import type { Context } from "hono";

export function markDeprecated(c: Context, successorPath: string) {
  c.header("Deprecation", "true");
  c.header("Link", `<${successorPath}>; rel="successor-version"`);
}
