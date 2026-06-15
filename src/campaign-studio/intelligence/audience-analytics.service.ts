import { prisma } from "../../lib/prisma";
import { buildWhereClause } from "../../services/segment.service";
import type { SegmentFilters } from "../../validators/segment.validator";
import type { RecommendedChannel } from "../../audience-intelligence/types/channel-recommendation.types";
import type { SegmentAudienceAnalytics } from "./types/campaign-intelligence.types";

const PRISMA_CHANNEL_TO_DISPLAY: Record<string, RecommendedChannel> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  SMS: "SMS",
};

function round0(value: number): number {
  return Math.round(value);
}

function toDistribution<T extends string>(
  groups: { key: T; count: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of groups) {
    if (group.count > 0) out[group.key] = group.count;
  }
  return out;
}

function dominantKey(distribution: Record<string, number>): string | null {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0]![0];
}

function computeEngagementScore(avgOpenRate: number, avgClickRate: number): number {
  const openComponent = Math.min(1, avgOpenRate) * 70;
  const clickComponent = Math.min(1, avgClickRate) * 30;
  return round0(Math.min(100, openComponent + clickComponent));
}

export class AudienceAnalyticsService {
  async loadForSegment(input: {
    segmentId: string;
    segmentName: string;
    segmentDescription: string | null;
    rules: SegmentFilters;
    audienceSize: number;
  }): Promise<SegmentAudienceAnalytics> {
    const where = buildWhereClause(input.rules);

    const [
      aggregates,
      favoriteDrinkGroups,
      channelGroups,
      churnGroups,
      rfmGroups,
    ] = await Promise.all([
      prisma.customerAnalytics.aggregate({
        where: { customer: where },
        _avg: {
          lifetimeSpend: true,
          avgOrderValue: true,
          openRate: true,
          clickRate: true,
        },
      }),
      prisma.customerAnalytics.groupBy({
        by: ["favoriteDrink"],
        where: { customer: where, favoriteDrink: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { favoriteDrink: "desc" } },
        take: 5,
      }),
      prisma.customerAnalytics.groupBy({
        by: ["actualPreferredChannel"],
        where: { customer: where, actualPreferredChannel: { not: null } },
        _count: { _all: true },
      }),
      prisma.customerAnalytics.groupBy({
        by: ["churnRisk"],
        where: { customer: where },
        _count: { _all: true },
      }),
      prisma.customerAnalytics.groupBy({
        by: ["rfmSegment"],
        where: { customer: where },
        _count: { _all: true },
      }),
    ]);

    const averageSpend = round0(Number(aggregates._avg.lifetimeSpend ?? 0));
    const averageOrderValue = round0(Number(aggregates._avg.avgOrderValue ?? 0));
    const engagementScore = computeEngagementScore(
      Number(aggregates._avg.openRate ?? 0),
      Number(aggregates._avg.clickRate ?? 0),
    );

    const churnRiskDistribution = toDistribution(
      churnGroups.map((g) => ({ key: g.churnRisk, count: g._count._all })),
    );
    const rfmDistribution = toDistribution(
      rfmGroups.map((g) => ({ key: g.rfmSegment, count: g._count._all })),
    );

    const channelDistribution: Record<string, number> = {};
    let topChannel: RecommendedChannel | null = null;
    let topChannelCount = 0;

    for (const group of channelGroups) {
      if (!group.actualPreferredChannel) continue;
      const label = PRISMA_CHANNEL_TO_DISPLAY[group.actualPreferredChannel];
      if (!label) continue;
      channelDistribution[label] = group._count._all;
      if (group._count._all > topChannelCount) {
        topChannelCount = group._count._all;
        topChannel = label;
      }
    }

    const favoriteProduct = favoriteDrinkGroups[0]?.favoriteDrink ?? null;
    const dominantChurnRisk =
      (dominantKey(churnRiskDistribution) as "LOW" | "MEDIUM" | "HIGH" | null) ?? "MEDIUM";

    const loyalShare =
      (rfmDistribution["Champion"] ?? 0) + (rfmDistribution["Loyal Customer"] ?? 0);
    const loyalCustomerSignal =
      loyalShare / Math.max(1, input.audienceSize) >= 0.35 ||
      input.segmentName.toLowerCase().includes("loyal");

    const discountHunterSignal =
      input.segmentName.toLowerCase().includes("discount") ||
      (input.rules.lifetimeSpend !== undefined &&
        typeof input.rules.lifetimeSpend === "object" &&
        input.rules.lifetimeSpend.lt !== undefined);

    const coldBrewSignal =
      input.rules.favoriteDrink === "Cold Brew" ||
      input.segmentName.toLowerCase().includes("cold brew") ||
      favoriteProduct === "Cold Brew";

    const teaSignal =
      input.rules.favoriteDrink === "Masala Chai" ||
      input.segmentName.toLowerCase().includes("tea") ||
      favoriteProduct === "Masala Chai" ||
      favoriteProduct === "Green Tea";

    return {
      segmentId: input.segmentId,
      segmentName: input.segmentName,
      segmentDescription: input.segmentDescription,
      rules: input.rules,
      audienceSize: input.audienceSize,
      averageSpend,
      averageOrderValue,
      lifetimeValue: averageSpend,
      favoriteProduct,
      preferredChannel: topChannel,
      engagementScore,
      churnRisk: dominantChurnRisk,
      churnRiskDistribution,
      rfmDistribution,
      channelDistribution,
      dominantRfmSegment: dominantKey(rfmDistribution),
      discountHunterSignal,
      loyalCustomerSignal,
      coldBrewSignal,
      teaSignal,
    };
  }
}
