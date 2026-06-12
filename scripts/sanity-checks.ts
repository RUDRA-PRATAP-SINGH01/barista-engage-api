// quick sanity checks on CustomerAnalytics, just to see if the numbers look believable
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

console.log("\n=== Top 10 customers by lifetime spend ===");
const topSpenders = await prisma.customerAnalytics.findMany({
  orderBy: { lifetimeSpend: "desc" },
  take: 10,
  include: { customer: { select: { firstName: true, lastName: true } } },
});
console.table(
  topSpenders.map((a) => ({
    name: `${a.customer.firstName} ${a.customer.lastName}`,
    lifetimeSpend: Number(a.lifetimeSpend),
    totalOrders: a.totalOrders,
    avgOrderValue: Number(a.avgOrderValue),
    rfmSegment: a.rfmSegment,
    favoriteDrink: a.favoriteDrink,
  })),
);

console.log("\n=== Churn risk distribution ===");
const churn = await prisma.customerAnalytics.groupBy({
  by: ["churnRisk"],
  _count: { _all: true },
});
console.table(churn.map((c) => ({ churnRisk: c.churnRisk, customers: c._count._all })));

console.log("\n=== Sample: 5 HIGH churn risk customers ===");
const highChurn = await prisma.customerAnalytics.findMany({
  where: { churnRisk: "HIGH" },
  orderBy: { lifetimeSpend: "desc" },
  take: 5,
  include: { customer: { select: { firstName: true, lastName: true } } },
});
console.table(
  highChurn.map((a) => ({
    name: `${a.customer.firstName} ${a.customer.lastName}`,
    daysSinceLastOrder: a.daysSinceLastOrder,
    totalOrders: a.totalOrders,
    lifetimeSpend: Number(a.lifetimeSpend),
    rfmSegment: a.rfmSegment,
  })),
);

console.log("\n=== Most popular drinks (by quantity sold) ===");
const drinks = await prisma.$queryRaw<{ name: string; qty: bigint; orders: bigint }[]>`
  SELECT p."name", SUM(oi."quantity") AS qty, COUNT(DISTINCT oi."orderId") AS orders
  FROM "OrderItem" oi
  JOIN "Product" p ON p."id" = oi."productId"
  WHERE p."category" IN ('Hot Coffee', 'Cold Coffee', 'Tea')
  GROUP BY p."name"
  ORDER BY qty DESC
  LIMIT 10
`;
console.table(drinks.map((d) => ({ drink: d.name, quantitySold: Number(d.qty), orders: Number(d.orders) })));

console.log("\n=== Favorite drink distribution (top 10) ===");
const favDrinks = await prisma.customerAnalytics.groupBy({
  by: ["favoriteDrink"],
  _count: { _all: true },
  orderBy: { _count: { customerId: "desc" } },
  take: 10,
});
console.table(favDrinks.map((d) => ({ favoriteDrink: d.favoriteDrink, customers: d._count._all })));

console.log("\n=== RFM segment distribution ===");
const segments = await prisma.customerAnalytics.groupBy({
  by: ["rfmSegment"],
  _count: { _all: true },
});
const total = segments.reduce((s, x) => s + x._count._all, 0);
console.table(
  segments
    .sort((a, b) => b._count._all - a._count._all)
    .map((s) => ({
      segment: s.rfmSegment,
      customers: s._count._all,
      share: `${((s._count._all / total) * 100).toFixed(1)}%`,
    })),
);

console.log("\n=== Average order value distribution (customers with orders) ===");
const aovBuckets = await prisma.$queryRaw<{ bucket: string; customers: bigint }[]>`
  SELECT bucket, COUNT(*) AS customers FROM (
    SELECT CASE
      WHEN "avgOrderValue" < 200 THEN 'a. under ₹200'
      WHEN "avgOrderValue" < 300 THEN 'b. ₹200-299'
      WHEN "avgOrderValue" < 400 THEN 'c. ₹300-399'
      WHEN "avgOrderValue" < 500 THEN 'd. ₹400-499'
      WHEN "avgOrderValue" < 700 THEN 'e. ₹500-699'
      ELSE 'f. ₹700+'
    END AS bucket
    FROM "CustomerAnalytics"
    WHERE "totalOrders" > 0
  ) b
  GROUP BY bucket
  ORDER BY bucket
`;
console.table(aovBuckets.map((b) => ({ avgOrderValue: b.bucket.slice(3), customers: Number(b.customers) })));

const aovStats = await prisma.$queryRaw<{ min: number; avg: number; median: number; max: number }[]>`
  SELECT
    MIN("avgOrderValue")::float AS min,
    AVG("avgOrderValue")::float AS avg,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "avgOrderValue")::float AS median,
    MAX("avgOrderValue")::float AS max
  FROM "CustomerAnalytics"
  WHERE "totalOrders" > 0
`;
console.table(aovStats);

console.log("\n=== Actual preferred channel distribution ===");
const channels = await prisma.customerAnalytics.groupBy({
  by: ["actualPreferredChannel"],
  _count: { _all: true },
});
console.table(channels.map((c) => ({ channel: c.actualPreferredChannel, customers: c._count._all })));

await prisma.$disconnect();
