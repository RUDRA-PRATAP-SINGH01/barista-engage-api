import { z } from "zod";
import { blueprintFilterSchema } from "../audience-intelligence/validators/audience-blueprint.validator";

const generatedAudienceSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(500),
    filters: z.array(blueprintFilterSchema).min(1).max(8),
  })
  .strict();

const audienceStrategySchema = z
  .object({
    why: z.string().min(1).max(2000),
    what: z.string().min(1).max(2000),
    how: z.string().min(1).max(2000),
  })
  .strict();

const audienceForecastSchema = z
  .object({
    expectedReach: z.number().min(0).optional(),
    expectedOpenRate: z.number().min(0),
    expectedCtr: z.number().min(0),
    expectedRevenueImpact: z
      .object({
        min: z.number().min(0),
        max: z.number().min(0),
      })
      .strict(),
    roi: z.number().min(0),
  })
  .strict();

export const generateCampaignStudioSchema = z
  .object({
    goal: z.string().min(3, "goal is too short").max(500, "goal is too long"),
    generatedAudience: generatedAudienceSchema,
    audienceSize: z.number().int().min(0),
    forecast: audienceForecastSchema,
    strategy: audienceStrategySchema,
    recommendedChannel: z.enum(["WhatsApp", "Email", "SMS"]),
    recommendedOffer: z.string().min(1).max(150),
  })
  .strict();

export type GenerateCampaignStudioInput = z.infer<typeof generateCampaignStudioSchema>;

const campaignOverviewSchema = z
  .object({
    campaignName: z.string().min(1).max(120),
    campaignObjective: z.string().min(1).max(200),
    campaignSummary: z.string().min(1).max(500),
  })
  .strict();

const campaignMessageSchema = z
  .object({
    whatsAppMessage: z.string().min(1).max(1000),
    emailSubject: z.string().min(1).max(150),
    emailBody: z.string().min(1).max(2000),
    smsMessage: z.string().min(1).max(320),
  })
  .strict();

export const regenerateMessageSchema = generateCampaignStudioSchema
  .extend({
    overview: campaignOverviewSchema,
    recommendedTiming: z.string().min(1).max(100).optional(),
    message: campaignMessageSchema.partial().optional(),
  })
  .strict();

export type RegenerateMessageInput = z.infer<typeof regenerateMessageSchema>;

export const generateMessageSchema = z
  .object({
    goal: z.string().min(3).max(500),
    overview: campaignOverviewSchema,
    generatedAudience: generatedAudienceSchema,
    recommendedChannel: z.enum(["WhatsApp", "Email", "SMS"]),
    recommendedOffer: z.string().min(1).max(150),
    recommendedTiming: z.string().min(1).max(100),
  })
  .strict();

export type GenerateMessageInput = z.infer<typeof generateMessageSchema>;

export const generateCreativeSchema = z
  .object({
    goal: z.string().min(3).max(500),
    overview: campaignOverviewSchema,
    audience: generatedAudienceSchema.extend({
      audienceSize: z.number().int().min(0),
    }),
    recommendedChannel: z.enum(["WhatsApp", "Email", "SMS"]),
    recommendedOffer: z.string().min(1).max(150),
  })
  .strict();

export type GenerateCreativeInput = z.infer<typeof generateCreativeSchema>;

export const saveCampaignStudioSchema = z
  .object({
    goal: z.string().min(3).max(500),
    audience: generatedAudienceSchema.extend({
      audienceSize: z.number().int().min(1),
    }),
    overview: campaignOverviewSchema,
    recommendations: z
      .object({
        recommendedChannel: z.enum(["WhatsApp", "Email", "SMS"]),
        recommendedOffer: z.string().min(1).max(150),
        recommendedTiming: z.string().min(1).max(100),
      })
      .strict(),
    message: campaignMessageSchema,
    creative: z
      .object({
        imageUrl: z
          .string()
          .min(1)
          .refine(
            (url) => url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/"),
            "imageUrl must be an http(s) url or data:image base64",
          ),
      })
      .strict()
      .optional(),
  })
  .strict();

export type SaveCampaignStudioInput = z.infer<typeof saveCampaignStudioSchema>;

export const launchCampaignStudioSchema = z
  .object({
    campaignId: z.string().min(1, "campaignId is required"),
  })
  .strict();

export type LaunchCampaignStudioInput = z.infer<typeof launchCampaignStudioSchema>;

export { formatZodError } from "./segment.validator";
