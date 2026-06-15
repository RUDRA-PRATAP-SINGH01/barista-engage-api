import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { buildWhereClause } from "../../services/segment.service";
import type { SegmentFilters } from "../../validators/segment.validator";
import type { AudienceEconomics } from "../types/audience-economics.types";

function toEconomics(
  audienceSize: number,
  aggregate: {
    _avg: {
      lifetimeSpend: { toNumber?: () => number } | number | null;
      avgOrderValue: { toNumber?: () => number } | number | null;
      totalOrders: number | null;
      daysSinceLastOrder: number | null;
    };
  },
): AudienceEconomics {
  const toNumber = (value: { toNumber?: () => number } | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    return value.toNumber();
  };

  return {
    audienceSize,
    averageLifetimeSpend: toNumber(aggregate._avg.lifetimeSpend),
    averageOrderValue: toNumber(aggregate._avg.avgOrderValue),
    averageOrdersPerCustomer: aggregate._avg.totalOrders ?? 0,
    averageDaysSinceLastOrder: aggregate._avg.daysSinceLastOrder,
  };
}

export class AudienceEconomicsService {
  private populationBaseline: AudienceEconomics | null = null;

  async computeForFilters(filters: SegmentFilters): Promise<AudienceEconomics> {
    const customerWhere = buildWhereClause(filters);
    return this.aggregateForCustomerWhere(customerWhere);
  }

  async getPopulationBaseline(): Promise<AudienceEconomics> {
    if (this.populationBaseline) {
      return this.populationBaseline;
    }

    const customerWhere: Prisma.CustomerWhereInput = {
      analytics: { isNot: null },
    };
    this.populationBaseline = await this.aggregateForCustomerWhere(customerWhere);
    return this.populationBaseline;
  }

  resetPopulationCache(): void {
    this.populationBaseline = null;
  }

  private async aggregateForCustomerWhere(
    customerWhere: Prisma.CustomerWhereInput,
  ): Promise<AudienceEconomics> {
    const analyticsWhere: Prisma.CustomerAnalyticsWhereInput = {
      customer: customerWhere,
    };

    const [aggregate, audienceSize] = await Promise.all([
      prisma.customerAnalytics.aggregate({
        where: analyticsWhere,
        _avg: {
          lifetimeSpend: true,
          avgOrderValue: true,
          totalOrders: true,
          daysSinceLastOrder: true,
        },
      }),
      prisma.customer.count({ where: customerWhere }),
    ]);

    return toEconomics(audienceSize, aggregate);
  }
}
