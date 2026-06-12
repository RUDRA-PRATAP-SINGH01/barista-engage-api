// strongly typed response DTOs for frontend integration
import type { SegmentFilters } from "../validators/segment.validator";
import type { CampaignAnalysis } from "../validators/ai.validator";

export type CampaignDto = {
  id: string;
  name: string;
  status: string;
  audienceSize: number;
  channel: string;
  createdAt: Date;
};

export type CampaignDetailDto = CampaignDto & {
  description: string | null;
  subject: string | null;
  body: string;
  imageUrl: string | null;
  segment: { id: string; name: string };
  scheduledAt: Date | null;
  sentAt: Date | null;
};

export type SegmentDto = {
  id: string;
  name: string;
  audienceSize: number;
  description: string | null;
  rules: SegmentFilters;
};

export type SegmentListItemDto = {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentFilters;
};

export type AnalyticsDto = {
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  segmentBreakdown: Record<string, number>;
};

export type SegmentPreviewDto = {
  count: number;
  sampleCustomers: {
    id: string;
    name: string;
    city: string;
    lifetimeSpend: number;
    favoriteDrink: string | null;
    churnRisk: string | null;
    rfmSegment: string | null;
  }[];
};

export type AiAudienceDto = {
  generatedFilters: SegmentFilters;
  audienceSize: number;
  sampleCustomers: SegmentPreviewDto["sampleCustomers"];
};

export type AiCampaignAnalystDto = {
  campaign: { id: string; name: string; channel: string; status: string };
  metrics: AnalyticsDto & { audienceSize: number };
  analysis: CampaignAnalysis;
};

export function toCampaignDto(campaign: {
  id: string;
  name: string;
  status: string;
  targetAudienceSize: number | null;
  channel: string;
  createdAt: Date;
}): CampaignDto {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    audienceSize: campaign.targetAudienceSize ?? 0,
    channel: campaign.channel,
    createdAt: campaign.createdAt,
  };
}

export function toCampaignDetailDto(campaign: {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  status: string;
  targetAudienceSize: number | null;
  subject: string | null;
  body: string;
  imageUrl: string | null;
  segment: { id: string; name: string };
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}): CampaignDetailDto {
  return {
    ...toCampaignDto(campaign),
    description: campaign.description,
    subject: campaign.subject,
    body: campaign.body,
    imageUrl: campaign.imageUrl,
    segment: campaign.segment,
    scheduledAt: campaign.scheduledAt,
    sentAt: campaign.sentAt,
  };
}

export function toSegmentDto(segment: {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentFilters;
  audienceSize: number;
}): SegmentDto {
  return {
    id: segment.id,
    name: segment.name,
    audienceSize: segment.audienceSize,
    description: segment.description,
    rules: segment.rules,
  };
}

export function toSegmentListItemDto(segment: {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentFilters;
}): SegmentListItemDto {
  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    rules: segment.rules,
  };
}

export function toAnalyticsDto(analytics: {
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  segmentBreakdown: Record<string, number>;
}): AnalyticsDto {
  return {
    sent: analytics.sent,
    delivered: analytics.delivered,
    failed: analytics.failed,
    opened: analytics.opened,
    clicked: analytics.clicked,
    deliveryRate: analytics.deliveryRate,
    openRate: analytics.openRate,
    clickRate: analytics.clickRate,
    clickToOpenRate: analytics.clickToOpenRate,
    segmentBreakdown: analytics.segmentBreakdown,
  };
}
