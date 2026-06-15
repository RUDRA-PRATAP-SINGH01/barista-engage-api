import { RuleBasedAudienceIntentProvider } from "../../audience-intelligence/providers/rule-based-audience-intent.provider";
import { DELIVERY_RATE_BENCHMARKS } from "../../audience-intelligence/constants/roi-benchmarks";
import { blueprintFiltersToSegmentFilters } from "../../audience-intelligence/utils/blueprint-to-segment-filters";
import { AudienceAnalyticsService } from "../intelligence/audience-analytics.service";
import { ChannelIntelligenceService } from "../intelligence/channel-intelligence.service";
import { OfferIntelligenceService } from "../intelligence/offer-intelligence.service";
import { TimingIntelligenceService } from "../intelligence/timing-intelligence.service";
import { createCampaign, getCampaign } from "../../services/campaign.service";
import { createSegment } from "../../services/segment.service";
import { sendCampaign } from "../../services/delivery.service";
import { toCampaignDto } from "../../types/dto";
import type { RecommendedChannel } from "../../audience-intelligence/types/channel-recommendation.types";
import type {
  GenerateCampaignStudioInput,
  GenerateCreativeInput,
  GenerateMessageInput,
  RegenerateMessageInput,
  SaveCampaignStudioInput,
} from "../../validators/campaign-studio.validator";
import type {
  CampaignCreativeDto,
  CampaignMessageDto,
  CampaignOverviewDto,
  CampaignStudioResponseDto,
  LaunchCampaignStudioResultDto,
  SaveCampaignStudioResultDto,
} from "../dto/campaign-studio.dto";
import { CampaignOverviewService } from "./campaign-overview.service";
import { CampaignMessageService } from "./campaign-message.service";
import { CampaignCreativeService } from "./campaign-creative.service";
import { CampaignStrategyService } from "./campaign-strategy.service";

export type GenerateCampaignStudioResult =
  | { ok: true; data: CampaignStudioResponseDto }
  | { ok: false; error: "EMPTY_AUDIENCE" }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

export type GenerateMessageResult =
  | { ok: true; message: CampaignMessageDto }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] };

export type RegenerateMessageResult = GenerateMessageResult;

export type GenerateCreativeResult =
  | { ok: true; creative: CampaignCreativeDto }
  | {
      ok: false;
      error:
        | "NOT_CONFIGURED"
        | "AI_UNAVAILABLE"
        | "RATE_LIMITED"
        | "MODEL_UNAVAILABLE"
        | "PAID_PLAN_REQUIRED";
    };

export type SaveCampaignStudioResult =
  | { ok: true; data: SaveCampaignStudioResultDto }
  | { ok: false; error: "INVALID_SEGMENT_RULES" }
  | { ok: false; error: "CAMPAIGN_NOT_FOUND" };

export type LaunchCampaignStudioResult =
  | { ok: true; data: LaunchCampaignStudioResultDto }
  | { ok: false; error: "NOT_FOUND" }
  | { ok: false; error: "INVALID_STATUS"; status: string };

const CHANNEL_TO_ENUM: Record<RecommendedChannel, "WHATSAPP" | "EMAIL" | "SMS"> = {
  WhatsApp: "WHATSAPP",
  Email: "EMAIL",
  SMS: "SMS",
};

function formatTiming(bestDay: string, bestHour: string): string {
  const hour = Number.parseInt(bestHour.split(":")[0] ?? "10", 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${bestDay} ${hour12} ${period}`;
}

async function resolveOverview(
  overviewService: CampaignOverviewService,
  overviewInput: Parameters<CampaignOverviewService["generate"]>[0],
): Promise<
  | { ok: true; overview: CampaignOverviewDto }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] }
> {
  const result = await overviewService.generate(overviewInput);
  if (result.ok) return result;
  if (result.error === "INVALID_AI_OUTPUT") return result;
  return { ok: true, overview: overviewService.fallback(overviewInput) };
}

async function resolveMessage(
  messageService: CampaignMessageService,
  messageInput: Parameters<CampaignMessageService["generate"]>[0],
): Promise<
  | { ok: true; message: CampaignMessageDto }
  | { ok: false; error: "NOT_CONFIGURED" | "AI_UNAVAILABLE" | "RATE_LIMITED" }
  | { ok: false; error: "INVALID_AI_OUTPUT"; details: { field: string; message: string }[] }
> {
  const result = await messageService.generate(messageInput);
  if (result.ok) return result;
  if (result.error === "INVALID_AI_OUTPUT") return result;
  return { ok: true, message: messageService.fallback(messageInput) };
}

function computeExpectedReach(
  audienceSize: number,
  channel: RecommendedChannel,
  passedReach?: number,
): number {
  if (passedReach !== undefined && passedReach > 0) return Math.round(passedReach);
  const deliveryRate = DELIVERY_RATE_BENCHMARKS[channel] / 100;
  return Math.round(audienceSize * deliveryRate);
}

function computeExpectedRevenue(revenueImpact: { min: number; max: number }): number {
  return Math.round((revenueImpact.min + revenueImpact.max) / 2);
}

export class CampaignStudioService {
  constructor(
    private readonly overviewService: CampaignOverviewService,
    private readonly messageService: CampaignMessageService,
    private readonly creativeService: CampaignCreativeService,
    private readonly strategyService: CampaignStrategyService,
    private readonly audienceAnalytics: AudienceAnalyticsService,
    private readonly channelIntelligence: ChannelIntelligenceService,
    private readonly offerIntelligence: OfferIntelligenceService,
    private readonly timingIntelligence: TimingIntelligenceService,
    private readonly goalParser: RuleBasedAudienceIntentProvider,
  ) {}

  private async loadContext(input: GenerateCampaignStudioInput) {
    const segmentFilters = blueprintFiltersToSegmentFilters(input.generatedAudience.filters);
    const goalAnalysis = await this.goalParser.analyzeGoal(input.goal);

    const analytics = await this.audienceAnalytics.loadForSegment({
      segmentId: "studio-preview",
      segmentName: input.generatedAudience.name,
      segmentDescription: input.generatedAudience.description,
      rules: segmentFilters,
      audienceSize: input.audienceSize,
    });

    const channelRec = this.channelIntelligence.recommend(analytics, goalAnalysis.objective);
    const offerRec = this.offerIntelligence.recommend(analytics, goalAnalysis.objective);
    const timingRec = await this.timingIntelligence.recommend(segmentFilters);

    const channel = input.recommendedChannel;
    const offer = input.recommendedOffer;
    const recommendedTiming = formatTiming(timingRec.bestDay, timingRec.bestHour);

    return {
      segmentFilters,
      analytics,
      channelRec,
      offerRec,
      timingRec,
      channel,
      offer,
      recommendedTiming,
    };
  }

  async generate(input: GenerateCampaignStudioInput): Promise<GenerateCampaignStudioResult> {
    if (input.audienceSize <= 0) {
      return { ok: false, error: "EMPTY_AUDIENCE" };
    }

    const ctx = await this.loadContext(input);

    const overviewInput = {
      goal: input.goal,
      audienceName: input.generatedAudience.name,
      audienceDescription: input.generatedAudience.description,
      audienceSize: input.audienceSize,
      recommendedChannel: ctx.channel,
      recommendedOffer: ctx.offer,
      recommendedTiming: ctx.recommendedTiming,
    };

    const overviewResult = await resolveOverview(this.overviewService, overviewInput);
    if (!overviewResult.ok) return overviewResult;
    const overview = overviewResult.overview;

    const messageInput = {
      goal: input.goal,
      overview,
      audienceName: input.generatedAudience.name,
      audienceDescription: input.generatedAudience.description,
      recommendedChannel: ctx.channel,
      recommendedOffer: ctx.offer,
      recommendedTiming: ctx.recommendedTiming,
    };

    const messageResult = await resolveMessage(this.messageService, messageInput);
    if (!messageResult.ok) return messageResult;

    const strategy = this.strategyService.build({
      goal: input.goal,
      audienceName: input.generatedAudience.name,
      audienceDescription: input.generatedAudience.description,
      audienceSize: input.audienceSize,
      audienceStrategy: input.strategy,
      channel: ctx.channel,
      offer: ctx.offer,
      timing: ctx.recommendedTiming,
      channelRec: ctx.channelRec,
      offerRec: ctx.offerRec,
      timingRec: ctx.timingRec,
      analytics: ctx.analytics,
    });

    const expectedReach = computeExpectedReach(
      input.audienceSize,
      ctx.channel,
      input.forecast.expectedReach,
    );

    return {
      ok: true,
      data: {
        goal: input.goal,
        audience: {
          name: input.generatedAudience.name,
          description: input.generatedAudience.description,
          filters: input.generatedAudience.filters,
          audienceSize: input.audienceSize,
        },
        overview,
        strategy,
        recommendations: {
          recommendedChannel: ctx.channel,
          recommendedOffer: ctx.offer,
          recommendedTiming: ctx.recommendedTiming,
          channelReasoning: ctx.channelRec.reasoning,
          offerReasoning: ctx.offerRec.reasoning,
          timingReasoning: ctx.timingRec.reasoning.split(/(?<=[.!?])\s+/).filter(Boolean),
        },
        forecast: {
          audienceSize: input.audienceSize,
          expectedReach,
          expectedOpenRate: input.forecast.expectedOpenRate,
          expectedCtr: input.forecast.expectedCtr,
          expectedRevenue: computeExpectedRevenue(input.forecast.expectedRevenueImpact),
          expectedRoi: input.forecast.roi,
        },
        message: messageResult.message,
        creative: null,
      },
    };
  }

  async generateMessage(input: GenerateMessageInput): Promise<GenerateMessageResult> {
    const messageInput = {
      goal: input.goal,
      overview: input.overview,
      audienceName: input.generatedAudience.name,
      audienceDescription: input.generatedAudience.description,
      recommendedChannel: input.recommendedChannel,
      recommendedOffer: input.recommendedOffer,
      recommendedTiming: input.recommendedTiming,
    };

    return resolveMessage(this.messageService, messageInput);
  }

  async regenerateMessage(input: RegenerateMessageInput): Promise<RegenerateMessageResult> {
    const segmentFilters = blueprintFiltersToSegmentFilters(input.generatedAudience.filters);
    const timingRec = input.recommendedTiming
      ? null
      : await this.timingIntelligence.recommend(segmentFilters);
    const recommendedTiming =
      input.recommendedTiming ??
      (timingRec ? formatTiming(timingRec.bestDay, timingRec.bestHour) : "Tuesday 10 AM");

    const messageInput = {
      goal: input.goal,
      overview: input.overview,
      audienceName: input.generatedAudience.name,
      audienceDescription: input.generatedAudience.description,
      recommendedChannel: input.recommendedChannel,
      recommendedOffer: input.recommendedOffer,
      recommendedTiming,
      existingMessage: input.message,
    };

    const result = await this.messageService.generate(messageInput);
    if (result.ok) return { ok: true, message: result.message };
    if (result.error === "INVALID_AI_OUTPUT") return result;
    return { ok: true, message: this.messageService.fallback(messageInput) };
  }

  async generateCreative(input: GenerateCreativeInput): Promise<GenerateCreativeResult> {
    return this.creativeService.generate({
      campaignName: input.overview.campaignName,
      campaignObjective: input.overview.campaignObjective,
      audienceName: input.audience.name,
      audienceDescription: input.audience.description,
      recommendedOffer: input.recommendedOffer,
      recommendedChannel: input.recommendedChannel,
    });
  }

  async regenerateCreative(input: GenerateCreativeInput): Promise<GenerateCreativeResult> {
    return this.creativeService.generate({
      campaignName: input.overview.campaignName,
      campaignObjective: input.overview.campaignObjective,
      audienceName: input.audience.name,
      audienceDescription: input.audience.description,
      recommendedOffer: input.recommendedOffer,
      recommendedChannel: input.recommendedChannel,
      variationHint: "fresh visual angle, different composition and lighting",
    });
  }

  async save(input: SaveCampaignStudioInput): Promise<SaveCampaignStudioResult> {
    const segmentFilters = blueprintFiltersToSegmentFilters(input.audience.filters);
    const segment = await createSegment({
      name: input.audience.name,
      description: input.audience.description,
      rules: segmentFilters,
    });

    const channel = CHANNEL_TO_ENUM[input.recommendations.recommendedChannel];
    const primaryMessage =
      input.recommendations.recommendedChannel === "Email"
        ? input.message.emailBody
        : input.recommendations.recommendedChannel === "SMS"
          ? input.message.smsMessage
          : input.message.whatsAppMessage;

    const campaignResult = await createCampaign({
      name: input.overview.campaignName,
      description: input.overview.campaignSummary,
      segmentId: segment.id,
      channel,
      subject:
        input.recommendations.recommendedChannel === "Email"
          ? input.message.emailSubject
          : undefined,
      body: primaryMessage,
      imageUrl: input.creative?.imageUrl ?? undefined,
    });

    if (!campaignResult.ok) {
      return { ok: false, error: "INVALID_SEGMENT_RULES" };
    }

    const saved = await getCampaign(campaignResult.campaign.campaignId);
    if (!saved) {
      return { ok: false, error: "CAMPAIGN_NOT_FOUND" };
    }

    return {
      ok: true,
      data: {
        segmentId: segment.id,
        campaign: toCampaignDto(saved),
        communicationsCreated: campaignResult.campaign.communicationsCreated,
      },
    };
  }

  async launch(campaignId: string): Promise<LaunchCampaignStudioResult> {
    const result = await sendCampaign(campaignId);
    if (!result.ok) {
      if (result.error === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
      return { ok: false, error: "INVALID_STATUS", status: result.status };
    }

    const campaign = await getCampaign(campaignId);

    return {
      ok: true,
      data: {
        segmentId: campaign?.segment?.id ?? "",
        campaignId: result.campaignId,
        communicationsSent: result.communicationsSent,
      },
    };
  }
}
