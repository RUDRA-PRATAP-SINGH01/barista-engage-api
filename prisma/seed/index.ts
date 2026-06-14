// production-quality seed orchestrator for Barista Engage
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { buildWhereClause } from "../../src/services/segment.service";
import { segmentFiltersSchema } from "../../src/validators/segment.validator";
import { PRODUCTS, STORES, PERSONAS } from "./lib/reference";
import { generateCustomers } from "./lib/customers";
import { generateOrdersForCustomers } from "./lib/orders";
import { SEGMENTS } from "./lib/segments";
import { generateCampaigns } from "./lib/campaigns";
import { generateCommunications } from "./lib/communications";
import { computeCustomerAnalytics, computeCustomerInsights } from "./lib/analytics";
import { printQualityReport } from "./lib/quality-report";
import type { SeededCustomer } from "./lib/customers";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BATCH = 5000;

async function insertBatches<T>(label: string, rows: T[], inserter: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await inserter(rows.slice(i, i + BATCH));
    if (rows.length > BATCH) {
      console.log(`  ${label}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
  }
}

async function main() {
  console.log("Barista Engage — Production Seed");
  console.log("=".repeat(50));

  // ---------- clear (truncate avoids FK ordering issues on re-seed) ----------
  console.log("\n[1/9] Clearing existing data...");
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "Communication",
      "Campaign",
      "OrderItem",
      "Order",
      "Segment",
      "CustomerAnalytics",
      "CustomerInsight",
      "Customer",
      "Product",
      "Store"
    RESTART IDENTITY CASCADE
  `;

  // ---------- foundation ----------
  console.log("[2/9] Creating stores and products...");
  const stores = STORES.map((s) => ({
    id: randomUUID(),
    name: s.name,
    city: s.city,
    address: s.address,
    popularity: s.popularity,
  }));
  await prisma.store.createMany({
    data: stores.map(({ popularity: _p, ...s }) => s),
  });

  const products = PRODUCTS.map((p) => ({
    id: randomUUID(),
    name: p.name,
    category: p.category,
    price: p.price,
    isActive: true,
  }));
  await prisma.product.createMany({ data: products });
  console.log(`  Stores: ${stores.length}, Products: ${products.length}`);

  const productCatalog = products.map((p, i) => ({
    ...p,
    ...PRODUCTS[i]!,
    id: p.id,
  }));

  // ---------- customers ----------
  console.log("[3/9] Generating 5,000 persona-driven customers...");
  const seededCustomers = generateCustomers(5000, PERSONAS);
  const customerById = new Map(seededCustomers.map((c) => [c.id, c]));
  const personaByCustomer = new Map(
    seededCustomers.map((c) => [c.id, c.persona.label]),
  );

  await insertBatches("Customers", seededCustomers, (chunk) =>
    prisma.customer.createMany({
      data: chunk.map(({ persona: _p, personaId: _pid, homeStoreCity: _h, ...c }) => c),
    }),
  );

  // ---------- orders ----------
  console.log("[4/9] Generating behavior-driven orders...");
  const { orders, orderItems } = generateOrdersForCustomers(
    seededCustomers,
    stores,
    productCatalog,
  );
  console.log(`  Orders: ${orders.length.toLocaleString()}, Items: ${orderItems.length.toLocaleString()}`);

  await insertBatches("Orders", orders, (chunk) => prisma.order.createMany({ data: chunk }));
  await insertBatches("OrderItems", orderItems, (chunk) => prisma.orderItem.createMany({ data: chunk }));

  // ---------- analytics (pre-campaign, for segment resolution) ----------
  console.log("[5/9] Computing customer analytics from order history...");
  const analyticsCount = await computeCustomerAnalytics(prisma);
  console.log(`  Analytics rows: ${analyticsCount}`);

  // ---------- segments ----------
  console.log("[6/9] Creating 20 segments...");
  const segmentRecords = SEGMENTS.map((s) => ({
    id: randomUUID(),
    name: s.name,
    description: s.description,
    rules: s.rules,
    createdAt: new Date(),
  }));
  await prisma.segment.createMany({ data: segmentRecords });
  console.log(`  Segments: ${segmentRecords.length}`);

  // ---------- campaigns + communications ----------
  console.log("[7/9] Generating 40 campaigns and communications...");
  const campaignDefs = generateCampaigns();
  let totalComms = 0;

  for (const def of campaignDefs) {
    const segment = segmentRecords[def.segmentIndex]!;
    const parsedRules = segmentFiltersSchema.safeParse(segment.rules);
    if (!parsedRules.success) continue;

    const where = buildWhereClause(parsedRules.data);
    const audienceIds = await prisma.customer.findMany({
      where: { ...where, marketingOptIn: true },
      select: { id: true },
    });

    const audience: SeededCustomer[] = audienceIds
      .map((a) => customerById.get(a.id))
      .filter((c): c is SeededCustomer => c !== undefined);

    const sentAt = def.sentAt ?? new Date();

    const comms = generateCommunications(
      def.id,
      def.channel,
      def.subject,
      def.body,
      audience,
      sentAt,
      def.status,
    );

    await prisma.campaign.create({
      data: {
        id: def.id,
        name: def.name,
        description: def.description,
        segmentId: segment.id,
        channel: def.channel,
        status: def.status,
        subject: def.subject,
        body: def.body,
        targetAudienceSize: audience.length,
        scheduledAt: def.scheduledAt,
        sentAt: def.status === "COMPLETED" || def.status === "SENDING" ? sentAt : null,
        createdAt: def.createdAt,
      },
    });

    for (let i = 0; i < comms.length; i += BATCH) {
      await prisma.communication.createMany({ data: comms.slice(i, i + BATCH) });
    }
    totalComms += comms.length;
  }
  console.log(`  Campaigns: ${campaignDefs.length}, Communications: ${totalComms.toLocaleString()}`);

  // ---------- recompute analytics with engagement ----------
  console.log("[8/9] Recomputing analytics with campaign engagement...");
  await computeCustomerAnalytics(prisma);

  // ---------- insights ----------
  console.log("[9/9] Generating customer insights...");
  const insightCount = await computeCustomerInsights(prisma, personaByCustomer);
  console.log(`  Insights: ${insightCount}`);

  await printQualityReport(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
