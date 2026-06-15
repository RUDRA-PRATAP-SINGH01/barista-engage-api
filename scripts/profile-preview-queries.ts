import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "../src/lib/prisma";
import { buildWhereClause } from "../src/services/segment.service";

const where = buildWhereClause({
  rfmSegment: "Lost Customer",
  churnRisk: "HIGH",
  lifetimeSpend: { gt: 5000 },
  daysSinceLastOrder: { gt: 60 },
});

async function time(label: string, fn: () => Promise<unknown>) {
  const start = performance.now();
  await fn();
  console.log(`${label}: ${Math.round(performance.now() - start)}ms`);
}

await time("count filtered", () => prisma.customer.count({ where }));
await time("count total", () => prisma.customer.count());
await time("groupBy distribution", () =>
  prisma.customerAnalytics.groupBy({
    by: ["rfmSegment"],
    where: { customer: where },
    _count: { _all: true },
  }),
);
await time("count no analytics", () =>
  prisma.customer.count({ where: { analytics: { is: null } } }),
);

await prisma.$disconnect();
