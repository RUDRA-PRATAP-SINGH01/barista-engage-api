import type { PrismaClient, Channel, ChurnRisk } from "../../../generated/prisma/client";
import { NOW_MS, MS_PER_DAY } from "./reference";

const DRINK_CATEGORIES = ["Coffee", "Tea"];

function quintileScore(value: number, sorted: number[]): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! < value) lo = mid + 1;
    else hi = mid;
  }
  return sorted.length === 0 ? 1 : Math.min(5, 1 + Math.floor((lo / sorted.length) * 5));
}

function rfmSegment(hasOrders: boolean, r: number, f: number, m: number): string {
  if (!hasOrders || r <= 1) return "Lost Customer";
  if (r === 2) return "At Risk";
  if (r >= 4 && f >= 5 && m >= 4) return "Champion";
  if (m === 5 || (m === 4 && f >= 4 && r === 5)) return "Big Spender";
  return "Loyal Customer";
}

function churnRisk(daysSinceLastOrder: number | null): ChurnRisk {
  if (daysSinceLastOrder === null) return "HIGH";
  if (daysSinceLastOrder <= 30) return "LOW";
  if (daysSinceLastOrder < 60) return "MEDIUM";
  return "HIGH";
}

export async function computeCustomerAnalytics(prisma: PrismaClient): Promise<number> {
  const customers = await prisma.customer.findMany({ select: { id: true } });

  const orderAgg = await prisma.order.groupBy({
    by: ["customerId"],
    _sum: { totalAmount: true },
    _count: { _all: true },
    _max: { orderedAt: true },
  });
  const aggByCustomer = new Map(orderAgg.map((a) => [a.customerId, a]));

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

  const engagementRows = await prisma.$queryRaw<
    {
      customerId: string;
      sent: number;
      opened: number;
      clicked: number;
      lastOpened: Date | null;
      lastClicked: Date | null;
    }[]
  >`
    SELECT "customerId",
      COUNT(*) FILTER (WHERE "status" <> 'PENDING')::int AS sent,
      COUNT(*) FILTER (WHERE "status" IN ('OPENED', 'CLICKED'))::int AS opened,
      COUNT(*) FILTER (WHERE "status" = 'CLICKED')::int AS clicked,
      MAX("openedAt") AS "lastOpened",
      MAX("clickedAt") AS "lastClicked"
    FROM "Communication"
    GROUP BY "customerId"
  `;
  const engagement = new Map(engagementRows.map((e) => [e.customerId, e]));

  const channelOpens = await prisma.$queryRaw<
    { customerId: string; channel: Channel; opens: number }[]
  >`
    SELECT "customerId", "channel", COUNT(*)::int AS opens
    FROM "Communication"
    WHERE "status" IN ('OPENED', 'CLICKED')
    GROUP BY "customerId", "channel"
  `;
  const observedChannel = new Map<string, { channel: Channel; opens: number }>();
  for (const row of channelOpens) {
    const current = observedChannel.get(row.customerId);
    if (!current || row.opens > current.opens) {
      observedChannel.set(row.customerId, { channel: row.channel, opens: row.opens });
    }
  }

  const recencyDays = orderAgg
    .map((a) => Math.floor((NOW_MS - a._max.orderedAt!.getTime()) / MS_PER_DAY))
    .sort((a, b) => a - b);
  const frequencies = orderAgg.map((a) => a._count._all).sort((a, b) => a - b);
  const monetaries = orderAgg.map((a) => Number(a._sum.totalAmount)).sort((a, b) => a - b);

  const rows = customers.map((c) => {
    const agg = aggByCustomer.get(c.id);
    const totalOrders = agg?._count._all ?? 0;
    const lifetimeSpend = agg ? Number(agg._sum.totalAmount) : 0;
    const lastOrderAt = agg?._max.orderedAt ?? null;
    const daysSinceLastOrder = lastOrderAt
      ? Math.floor((NOW_MS - lastOrderAt.getTime()) / MS_PER_DAY)
      : null;

    const r = agg ? 6 - quintileScore(daysSinceLastOrder!, recencyDays) : 1;
    const f = agg ? quintileScore(totalOrders, frequencies) : 1;
    const m = agg ? quintileScore(lifetimeSpend, monetaries) : 1;

    const eng = engagement.get(c.id);
    const messagesSent = eng?.sent ?? 0;
    const messagesOpened = eng?.opened ?? 0;
    const messagesClicked = eng?.clicked ?? 0;
    const lastInteractions = [eng?.lastOpened, eng?.lastClicked].filter(
      (d): d is Date => d != null,
    );

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
      actualPreferredChannel: observedChannel.get(c.id)?.channel ?? null,
      messagesSent,
      messagesOpened,
      messagesClicked,
      openRate: messagesSent > 0 ? Math.round((messagesOpened / messagesSent) * 1000) / 10 : 0,
      clickRate: messagesSent > 0 ? Math.round((messagesClicked / messagesSent) * 1000) / 10 : 0,
      lastCampaignInteractionAt:
        lastInteractions.length > 0
          ? new Date(Math.max(...lastInteractions.map((d) => d.getTime())))
          : null,
      computedAt: new Date(),
    };
  });

  await prisma.customerAnalytics.deleteMany();
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.customerAnalytics.createMany({ data: rows.slice(i, i + 1000) });
  }

  return rows.length;
}

export async function computeCustomerInsights(
  prisma: PrismaClient,
  personaByCustomer: Map<string, string>,
): Promise<number> {
  const analytics = await prisma.customerAnalytics.findMany({
    select: {
      customerId: true,
      rfmSegment: true,
      churnRisk: true,
      favoriteDrink: true,
      favoriteStoreId: true,
      lifetimeSpend: true,
      totalOrders: true,
      avgOrderValue: true,
      daysSinceLastOrder: true,
      openRate: true,
      clickRate: true,
      customer: { select: { firstName: true } },
    },
  });

  const stores = await prisma.store.findMany({ select: { id: true, name: true } });
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  const rows = analytics.map((a) => {
    const persona = personaByCustomer.get(a.customerId) ?? "Occasional Visitor";
    const store = a.favoriteStoreId ? storeName.get(a.favoriteStoreId) : null;
    const spend = Math.round(Number(a.lifetimeSpend));

    const parts = [
      `${a.customer.firstName} is a ${persona.toLowerCase()}`,
      a.favoriteDrink ? `whose go-to order is ${a.favoriteDrink}` : null,
      store ? `usually at ${store}` : null,
    ].filter(Boolean);

    let summary = `${parts.join(", ")}. Lifetime spend ₹${spend} across ${a.totalOrders} orders.`;
    if (a.daysSinceLastOrder !== null) {
      summary += ` Last visit ${a.daysSinceLastOrder} days ago, churn risk ${a.churnRisk}.`;
    }
    if (a.openRate > 0) {
      summary += ` Campaign open rate ${a.openRate}%, click rate ${a.clickRate}%.`;
    }

    if (persona === "Discount Hunter") summary += " Responds best to discounts and flash sales.";
    else if (persona === "Cold Brew Lover") summary += " Target with seasonal cold brew launches.";
    else if (persona === "Lost Customer") summary += " Needs a strong win-back incentive.";
    else if (persona === "Champion") summary += " Reward with exclusives — avoid over-discounting.";

    return {
      customerId: a.customerId,
      persona,
      marketingSummary: summary,
      generatedAt: new Date(),
    };
  });

  await prisma.customerInsight.deleteMany();
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.customerInsight.createMany({ data: rows.slice(i, i + 1000) });
  }

  return rows.length;
}
