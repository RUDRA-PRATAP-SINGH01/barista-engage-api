// segmentation engine - turns filter json into prisma where clauses and runs them
import { prisma } from "../lib/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { segmentFiltersSchema, type SegmentFilters } from "../validators/segment.validator";

const SAMPLE_SIZE = 20;

// numeric filters come in as either a plain number or { gt, gte, lt, lte, equals }
// prisma accepts the operator object as-is, so just normalize the plain number case
function numericWhere(value: number | Record<string, number>) {
  return typeof value === "number" ? { equals: value } : value;
}

// builds one customer-level where clause, analytics filters go through the 1:1 relation
export function buildWhereClause(filters: SegmentFilters): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  const analytics: Prisma.CustomerAnalyticsWhereInput = {};

  if (filters.city !== undefined) where.city = filters.city;
  if (filters.loyaltyTier !== undefined) where.loyaltyTier = filters.loyaltyTier;

  if (filters.churnRisk !== undefined) analytics.churnRisk = filters.churnRisk;
  if (filters.favoriteDrink !== undefined) analytics.favoriteDrink = filters.favoriteDrink;
  if (filters.rfmSegment !== undefined) analytics.rfmSegment = filters.rfmSegment;
  if (filters.lifetimeSpend !== undefined)
    analytics.lifetimeSpend = numericWhere(filters.lifetimeSpend);
  if (filters.totalOrders !== undefined)
    analytics.totalOrders = numericWhere(filters.totalOrders);
  if (filters.daysSinceLastOrder !== undefined)
    analytics.daysSinceLastOrder = numericWhere(filters.daysSinceLastOrder);

  if (Object.keys(analytics).length > 0) {
    where.analytics = { is: analytics };
  }
  return where;
}

export async function previewSegment(filters: SegmentFilters) {
  const where = buildWhereClause(filters);

  const [count, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      take: SAMPLE_SIZE,
      orderBy: { analytics: { lifetimeSpend: "desc" } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        analytics: {
          select: { lifetimeSpend: true, favoriteDrink: true, churnRisk: true, rfmSegment: true },
        },
      },
    }),
  ]);

  return {
    count,
    sampleCustomers: customers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      city: c.city,
      lifetimeSpend: c.analytics ? Number(c.analytics.lifetimeSpend) : 0,
      favoriteDrink: c.analytics?.favoriteDrink ?? null,
      churnRisk: c.analytics?.churnRisk ?? null,
      rfmSegment: c.analytics?.rfmSegment ?? null,
    })),
  };
}

export async function createSegment(input: {
  name: string;
  description?: string;
  rules: SegmentFilters;
}) {
  const segment = await prisma.segment.create({
    data: {
      name: input.name,
      description: input.description,
      rules: input.rules as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, description: true, rules: true },
  });

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    rules: input.rules,
  };
}

export async function listSegments() {
  const segments = await prisma.segment.findMany({
    select: { id: true, name: true, description: true, rules: true },
    orderBy: { createdAt: "desc" },
  });

  return segments.flatMap((segment) => {
    const parsed = segmentFiltersSchema.safeParse(segment.rules);
    if (!parsed.success) return [];
    return [
      {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        rules: parsed.data,
      },
    ];
  });
}

export async function getSegmentWithAudience(id: string) {
  const segment = await prisma.segment.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, rules: true, createdAt: true },
  });
  if (!segment) return null;

  // same philosophy as campaign launch - never trust stored json blindly,
  // a corrupted row should surface as a clean error, not a crash
  const parsed = segmentFiltersSchema.safeParse(segment.rules);
  if (!parsed.success) {
    return { ...segment, audienceSize: null, invalidRules: true as const };
  }

  const audienceSize = await prisma.customer.count({
    where: buildWhereClause(parsed.data as SegmentFilters),
  });

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    rules: parsed.data,
    audienceSize,
    invalidRules: false as const,
  };
}
