// standardized api response helpers for frontend consumption
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errorCode?: string;
};

export function apiSuccess<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true as const, data }, status);
}

export function apiError(
  c: Context,
  message: string,
  status: ContentfulStatusCode,
  errorCode?: string,
) {
  return c.json(
    {
      success: false as const,
      message,
      ...(errorCode ? { errorCode } : {}),
    },
    status,
  );
}

export function validationErrorMessage(
  details: { field: string; message: string }[],
): string {
  if (details.length === 0) return "validation failed";
  const summary = details
    .map((d) => (d.field === "(root)" ? d.message : `${d.field}: ${d.message}`))
    .join("; ");
  return `validation failed: ${summary}`;
}
