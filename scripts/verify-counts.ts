// quick check - row counts of the main tables
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const rows = await prisma.$queryRaw<{ table: string; count: number }[]>`
  SELECT 'orders' AS "table", COUNT(*)::int AS count FROM "Order"
  UNION ALL SELECT 'order_items', COUNT(*)::int FROM "OrderItem"
  UNION ALL SELECT 'customers', COUNT(*)::int FROM "Customer"
  UNION ALL SELECT 'stores', COUNT(*)::int FROM "Store"
  UNION ALL SELECT 'products', COUNT(*)::int FROM "Product"
`;
console.table(rows);
await prisma.$disconnect();
