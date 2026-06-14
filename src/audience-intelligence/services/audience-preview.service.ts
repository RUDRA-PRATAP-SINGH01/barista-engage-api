import { prisma } from "../../lib/prisma";
import { buildWhereClause } from "../../services/segment.service";
import type { SegmentFilters } from "../../validators/segment.validator";
import type { RecommendedChannel } from "../types/channel-recommendation.types";
import { DELIVERY_RATE_BENCHMARKS, RFM_SEGMENTS } from "../constants/roi-benchmarks";

export type AudiencePreviewResult = {
  audienceSize: number;
  estimatedReach: number;
  audiencePercentage: number;
  segmentDistribution: Record<string, number>;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export class AudiencePreviewService {
  async preview(
    filters: SegmentFilters,
    channel: RecommendedChannel,
  ): Promise<AudiencePreviewResult> {
    const where = buildWhereClause(filters);
    const deliveryRate = DELIVERY_RATE_BENCHMARKS[channel] / 100;

    const [audienceSize, totalCustomers, segmentDistribution] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.count(),
      this.computeSegmentDistribution(where),
    ]);

    const estimatedReach = Math.round(audienceSize * deliveryRate);
    const audiencePercentage =
      totalCustomers > 0 ? round1((audienceSize / totalCustomers) * 100) : 0;

    return {
      audienceSize,
      estimatedReach,
      audiencePercentage,
      segmentDistribution,
    };
  }

  private async computeSegmentDistribution(
    where: ReturnType<typeof buildWhereClause>,
  ): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};

    await Promise.all(
      RFM_SEGMENTS.map(async (rfmSegment) => {
        const count = await prisma.customer.count({
          where: {
            ...where,
            analytics: { is: { rfmSegment } },
          },
        });
        if (count > 0) {
          distribution[rfmSegment] = count;
        }
      }),
    );

    const withoutAnalytics = await prisma.customer.count({
      where: {
        ...where,
        analytics: { is: null },
      },
    });
    if (withoutAnalytics > 0) {
      distribution.Unknown = withoutAnalytics;
    }

    return distribution;
  }
}
