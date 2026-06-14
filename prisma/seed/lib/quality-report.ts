import type { PrismaClient } from "../../../generated/prisma/client";
import { buildWhereClause } from "../../../src/services/segment.service";
import { segmentFiltersSchema } from "../../../src/validators/segment.validator";

export async function printQualityReport(prisma: PrismaClient): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("BARISTA ENGAGE — DATA QUALITY REPORT");
  console.log("=".repeat(60));

  const [
    customerCount,
    orderCount,
    orderItemCount,
    campaignCount,
    segmentCount,
    communicationCount,
    analyticsCount,
    insightCount,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.campaign.count(),
    prisma.segment.count(),
    prisma.communication.count(),
    prisma.customerAnalytics.count(),
    prisma.customerInsight.count(),
  ]);

  console.log("\n--- Entity Counts ---");
  console.log(`Customers:       ${customerCount.toLocaleString()}`);
  console.log(`Orders:          ${orderCount.toLocaleString()}`);
  console.log(`Order Items:     ${orderItemCount.toLocaleString()}`);
  console.log(`Campaigns:       ${campaignCount}`);
  console.log(`Segments:        ${segmentCount}`);
  console.log(`Communications:  ${communicationCount.toLocaleString()}`);
  console.log(`Analytics:       ${analyticsCount.toLocaleString()}`);
  console.log(`Insights:        ${insightCount.toLocaleString()}`);

  const revenue = await prisma.order.aggregate({ _sum: { totalAmount: true }, _avg: { totalAmount: true } });
  console.log("\n--- Revenue ---");
  console.log(`Total Revenue:   ₹${Math.round(Number(revenue._sum.totalAmount ?? 0)).toLocaleString("en-IN")}`);
  console.log(`Average Order:   ₹${Math.round(Number(revenue._avg.totalAmount ?? 0))}`);

  const topProducts = await prisma.$queryRaw<
    { name: string; orders: bigint; revenue: number }[]
  >`
    SELECT p."name", COUNT(DISTINCT o."id") AS orders, SUM(oi."quantity" * oi."unitPrice")::float AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    JOIN "Product" p ON p."id" = oi."productId"
    GROUP BY p."name"
    ORDER BY orders DESC
    LIMIT 8
  `;
  console.log("\n--- Top Products ---");
  console.table(
    topProducts.map((p) => ({
      product: p.name,
      orders: Number(p.orders),
      revenue: `₹${Math.round(p.revenue).toLocaleString("en-IN")}`,
    })),
  );

  const personaDist = await prisma.customerInsight.groupBy({
    by: ["persona"],
    _count: { _all: true },
    orderBy: { _count: { persona: "desc" } },
  });
  console.log("\n--- Persona Distribution ---");
  console.table(
    personaDist.map((p) => ({ persona: p.persona, customers: p._count._all })),
  );

  const rfmDist = await prisma.customerAnalytics.groupBy({
    by: ["rfmSegment"],
    _count: { _all: true },
    orderBy: { _count: { rfmSegment: "desc" } },
  });
  console.log("\n--- RFM Distribution ---");
  console.table(
    rfmDist.map((r) => ({ segment: r.rfmSegment, customers: r._count._all })),
  );

  const churnDist = await prisma.customerAnalytics.groupBy({
    by: ["churnRisk"],
    _count: { _all: true },
  });
  console.log("\n--- Churn Distribution ---");
  console.table(
    churnDist.map((c) => ({ churnRisk: c.churnRisk, customers: c._count._all })),
  );

  const channelDist = await prisma.customerAnalytics.groupBy({
    by: ["actualPreferredChannel"],
    _count: { _all: true },
  });
  console.log("\n--- Preferred Channel Distribution ---");
  console.table(
    channelDist.map((c) => ({
      channel: c.actualPreferredChannel ?? "Unknown",
      customers: c._count._all,
    })),
  );

  const campaignStats = await prisma.$queryRaw<
    {
      status: string;
      channel: string;
      count: bigint;
      avgAudience: number;
    }[]
  >`
    SELECT c."status", c."channel",
      COUNT(*)::int AS count,
      ROUND(AVG(c."targetAudienceSize"))::int AS "avgAudience"
    FROM "Campaign" c
    GROUP BY c."status", c."channel"
    ORDER BY count DESC
  `;
  console.log("\n--- Campaign Breakdown ---");
  console.table(
    campaignStats.map((c) => ({
      status: c.status,
      channel: c.channel,
      campaigns: Number(c.count),
      avgAudience: c.avgAudience,
    })),
  );

  const commStats = await prisma.communication.groupBy({
    by: ["status"],
    _count: { _all: true },
    orderBy: { _count: { status: "desc" } },
  });
  console.log("\n--- Communication Status ---");
  console.table(
    commStats.map((c) => ({ status: c.status, count: c._count._all })),
  );

  const segmentSizes: { name: string; audience: number }[] = [];
  for (const segment of await prisma.segment.findMany({ select: { name: true, rules: true } })) {
    const parsed = segmentFiltersSchema.safeParse(segment.rules);
    if (!parsed.success) continue;
    const where = buildWhereClause(parsed.data);
    const count = await prisma.customer.count({ where });
    segmentSizes.push({ name: segment.name, audience: count });
  }
  segmentSizes.sort((a, b) => b.audience - a.audience);

  if (segmentSizes.length > 0) {
    console.log("\n--- Top Segment Audiences ---");
    console.table(segmentSizes.slice(0, 10));
  }

  console.log("\n" + "=".repeat(60));
  console.log("Seed complete — data ready for dashboard, AI, and campaigns.");
  console.log("=".repeat(60) + "\n");
}
