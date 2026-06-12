// populates CustomerInsight with a persona + marketing summary for every customer.
// rule-based for now, fully derived from analytics - when the ai layer lands it can
// overwrite these with richer generated text. deterministic, safe to re-run.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TEA_DRINKS = ["Masala Chai", "Green Tea", "Earl Grey", "Iced Lemon Tea"];

interface AnalyticsRow {
  customerId: string;
  rfmSegment: string;
  churnRisk: string;
  favoriteDrink: string | null;
  favoriteStoreId: string | null;
  lifetimeSpend: unknown;
  totalOrders: number;
  avgOrderValue: unknown;
  daysSinceLastOrder: number | null;
  clickRate: number;
}

// priority order matters - first match wins
function pickPersona(a: AnalyticsRow): string {
  if (a.totalOrders === 0) return "Window Shopper";
  if (a.rfmSegment === "Lost Customer") return "Lapsed Customer";
  if (a.rfmSegment === "At Risk" && a.totalOrders >= 10) return "Cooling-Off Regular";
  // frequent buyer with a small basket = responds to offers
  if (Number(a.avgOrderValue) < 300 && a.totalOrders >= 10) return "Deal Hunter";
  // frequent coffee drinker (tea lovers get their own persona)
  if (a.totalOrders >= 15 && a.favoriteDrink && !TEA_DRINKS.includes(a.favoriteDrink))
    return "Coffee Enthusiast";
  if (a.totalOrders >= 15 && a.favoriteDrink && TEA_DRINKS.includes(a.favoriteDrink))
    return "Tea Loyalist";
  if (Number(a.avgOrderValue) >= 450) return "Premium Sipper";
  if (a.totalOrders >= 5) return "Steady Regular";
  return "Occasional Visitor";
}

function buildSummary(
  name: string,
  persona: string,
  a: AnalyticsRow,
  storeName: string | null,
): string {
  const parts: string[] = [];

  parts.push(`${name} is a ${persona.toLowerCase()}`);
  if (a.favoriteDrink) parts.push(`whose go-to order is ${a.favoriteDrink}`);
  if (storeName) parts.push(`usually at ${storeName}`);

  const spend = Math.round(Number(a.lifetimeSpend));
  let line = `${parts.join(", ")}. Lifetime spend Rs.${spend} across ${a.totalOrders} order${a.totalOrders === 1 ? "" : "s"}.`;

  if (a.daysSinceLastOrder !== null) {
    line += ` Last visit ${a.daysSinceLastOrder} day${a.daysSinceLastOrder === 1 ? "" : "s"} ago, churn risk ${a.churnRisk}.`;
  } else {
    line += " Has never ordered, churn risk HIGH.";
  }

  if (persona === "Deal Hunter") line += " Best targeted with discounts and combo offers.";
  else if (persona === "Coffee Enthusiast") line += " Responds well to new coffee launches and seasonal specials.";
  else if (persona === "Lapsed Customer") line += " Needs a strong win-back offer to return.";
  else if (persona === "Cooling-Off Regular") line += " Re-engage soon before the habit fades.";
  else if (persona === "Premium Sipper") line += " Premium launches and store experiences work better than discounts.";

  return line;
}

async function main() {
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
      clickRate: true,
      customer: { select: { firstName: true } },
    },
  });
  const stores = await prisma.store.findMany({ select: { id: true, name: true } });
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  const rows = analytics.map((a) => {
    const persona = pickPersona(a);
    return {
      customerId: a.customerId,
      persona,
      marketingSummary: buildSummary(
        a.customer.firstName,
        persona,
        a,
        a.favoriteStoreId ? (storeName.get(a.favoriteStoreId) ?? null) : null,
      ),
      generatedAt: new Date(),
    };
  });

  await prisma.customerInsight.deleteMany();
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.customerInsight.createMany({ data: rows.slice(i, i + 1000) });
  }
  console.log(`CustomerInsight rows written: ${rows.length}`);

  const distribution = new Map<string, number>();
  for (const r of rows) distribution.set(r.persona, (distribution.get(r.persona) ?? 0) + 1);
  console.table(
    [...distribution.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([persona, customers]) => ({ persona, customers })),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
