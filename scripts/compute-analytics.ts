// builds CustomerAnalytics for every customer, everything comes from order history
// safe to re-run anytime, it wipes the table and rebuilds from scratch
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Channel, type ChurnRisk } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRINK_CATEGORIES = ["Hot Coffee", "Cold Coffee", "Tea"];
const NOW = Date.now();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// gives a 1-5 score depending on where the value sits in the sorted list
function quintileScore(value: number, sorted: number[]): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return Math.min(5, 1 + Math.floor((lo / sorted.length) * 5));
}

// hash the customer id into a 0-1 number, need this for the channel stub below
// so the same customer always gets the same channel
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function rfmSegment(hasOrders: boolean, r: number, f: number, m: number): string {
  if (!hasOrders || r <= 1) return "Lost Customer";
  if (r === 2) return "At Risk";
  // champions should feel rare, so the bar is high - recent + frequent + top spend
  if (r >= 4 && f >= 5 && m >= 4) return "Champion";
  // big spender also needs to be rare - top spend bracket, or very recent frequent near-top spenders
  if (m === 5 || (m === 4 && f >= 4 && r === 5)) return "Big Spender";
  return "Loyal Customer";
}

function churnRisk(daysSinceLastOrder: number | null): ChurnRisk {
  if (daysSinceLastOrder === null) return "HIGH";
  if (daysSinceLastOrder <= 30) return "LOW";
  if (daysSinceLastOrder <= 60) return "MEDIUM";
  return "HIGH";
}

async function main() {
  const customers = await prisma.customer.findMany({ select: { id: true } });
  console.log(`Customers: ${customers.length}`);

  // spend + recency numbers, one groupBy for everything
  const orderAgg = await prisma.order.groupBy({
    by: ["customerId"],
    _sum: { totalAmount: true },
    _count: { _all: true },
    _max: { orderedAt: true },
  });
  const aggByCustomer = new Map(orderAgg.map((a) => [a.customerId, a]));

  // favorite store = whichever store they visited the most
  const storeVisits = await prisma.order.groupBy({
    by: ["customerId", "storeId"],
    _count: { _all: true },
  });
  const favoriteStore = new Map<string, { storeId: string; visits: number }>();
  for (const v of storeVisits) {
    const current = favoriteStore.get(v.customerId);
    if (!current || v._count._all > current.visits) {
      favoriteStore.set(v.customerId, { storeId: v.storeId, visits: v._count._all });
    }
  }

  // favorite drink = drink they ordered the most, only actual drinks count, no food/desserts
  const drinkRows = await prisma.$queryRaw<
    { customerId: string; name: string; qty: bigint }[]
  >`
    SELECT o."customerId", p."name", SUM(oi."quantity") AS qty
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    JOIN "Product" p ON p."id" = oi."productId"
    WHERE p."category" = ANY(${DRINK_CATEGORIES})
    GROUP BY o."customerId", p."name"
  `;
  const favoriteDrink = new Map<string, { name: string; qty: number }>();
  for (const row of drinkRows) {
    const qty = Number(row.qty);
    const current = favoriteDrink.get(row.customerId);
    if (!current || qty > current.qty) {
      favoriteDrink.set(row.customerId, { name: row.name, qty });
    }
  }

  // percentile baselines, only from customers who actually ordered something
  const recencyDays = orderAgg
    .map((a) => Math.floor((NOW - a._max.orderedAt!.getTime()) / MS_PER_DAY))
    .sort((a, b) => a - b);
  const frequencies = orderAgg.map((a) => a._count._all).sort((a, b) => a - b);
  const monetaries = orderAgg.map((a) => Number(a._sum.totalAmount)).sort((a, b) => a - b);

  const rows = customers.map((c) => {
    const agg = aggByCustomer.get(c.id);
    const totalOrders = agg?._count._all ?? 0;
    const lifetimeSpend = agg ? Number(agg._sum.totalAmount) : 0;
    const lastOrderAt = agg?._max.orderedAt ?? null;
    const daysSinceLastOrder = lastOrderAt
      ? Math.floor((NOW - lastOrderAt.getTime()) / MS_PER_DAY)
      : null;

    // recency works opposite, less days = better, so flip the score
    const r = agg ? 6 - quintileScore(daysSinceLastOrder!, recencyDays) : 1;
    const f = agg ? quintileScore(totalOrders, frequencies) : 1;
    const m = agg ? quintileScore(lifetimeSpend, monetaries) : 1;

    // v1 stub - mostly whatsapp for now, will compute this properly once communications exist
    const roll = hash01(c.id);
    const actualPreferredChannel: Channel =
      roll < 0.75 ? "WHATSAPP" : roll < 0.9 ? "EMAIL" : "SMS";

    return {
      customerId: c.id,
      recencyScore: r,
      frequencyScore: f,
      monetaryScore: m,
      rfmSegment: rfmSegment(totalOrders > 0, r, f, m),
      churnRisk: churnRisk(daysSinceLastOrder),
      favoriteDrink: favoriteDrink.get(c.id)?.name ?? null,
      favoriteStoreId: favoriteStore.get(c.id)?.storeId ?? null,
      lifetimeSpend,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round((lifetimeSpend / totalOrders) * 100) / 100 : 0,
      lastOrderAt,
      daysSinceLastOrder,
      actualPreferredChannel,
      // no communications yet so everything stays 0
      messagesSent: 0,
      messagesOpened: 0,
      messagesClicked: 0,
      openRate: 0,
      clickRate: 0,
      lastCampaignInteractionAt: null,
      computedAt: new Date(),
    };
  });

  await prisma.customerAnalytics.deleteMany();
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.customerAnalytics.createMany({ data: rows.slice(i, i + 1000) });
  }
  console.log(`CustomerAnalytics rows written: ${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
