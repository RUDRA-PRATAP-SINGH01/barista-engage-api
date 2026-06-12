// zod schemas for the campaign endpoints
import { z } from "zod";

export const createCampaignSchema = z
  .object({
    name: z.string().min(1, "name is required").max(120),
    description: z.string().max(500).optional(),
    segmentId: z.string().min(1, "segmentId is required"),
    channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
    // subject is optional for sms/whatsapp, email campaigns usually want one
    subject: z.string().min(1).max(150).nullish(),
    body: z.string().min(1, "body is required").max(2000),
    imageUrl: z.url("imageUrl must be a valid url").nullish(),
  })
  .strict();

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

// query params for the communications list, coerce because they arrive as strings
export const communicationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export { formatZodError } from "./segment.validator";
