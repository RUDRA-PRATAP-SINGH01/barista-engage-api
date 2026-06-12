// dev seed - stores, products, customers and orders
// using a seeded rng so every run gives me the exact same data
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Channel, type LoyaltyTier } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------- seeded rng (mulberry32) so data doesn't change between runs ----------

let rngState = 20260612;
function rand(): number {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
function weighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// ---------- reference data ----------

const STORE_AREAS: Record<string, string[]> = {
  Bangalore: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Jayanagar", "MG Road", "Malleshwaram", "Electronic City"],
  Delhi: ["Connaught Place", "Saket", "Hauz Khas", "Karol Bagh", "Dwarka", "Rohini", "Vasant Kunj"],
  Mumbai: ["Bandra", "Powai", "Andheri", "Juhu", "Lower Parel", "Colaba", "Thane"],
  Pune: ["Koregaon Park", "Viman Nagar", "Baner", "Kothrud", "Hinjewadi"],
  Hyderabad: ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Hitech City", "Secunderabad"],
  Chennai: ["T Nagar", "Anna Nagar", "Adyar", "Velachery"],
  Kolkata: ["Park Street", "Salt Lake", "New Town", "Ballygunge"],
};

const PRODUCTS: { name: string; category: string; price: number }[] = [
  // Hot Coffee
  { name: "Espresso", category: "Hot Coffee", price: 120 },
  { name: "Americano", category: "Hot Coffee", price: 150 },
  { name: "Cappuccino", category: "Hot Coffee", price: 180 },
  { name: "Latte", category: "Hot Coffee", price: 190 },
  { name: "Hazelnut Latte", category: "Hot Coffee", price: 220 },
  { name: "Caramel Latte", category: "Hot Coffee", price: 220 },
  { name: "Mocha", category: "Hot Coffee", price: 210 },
  { name: "Flat White", category: "Hot Coffee", price: 200 },
  // Cold Coffee
  { name: "Cold Brew", category: "Cold Coffee", price: 240 },
  { name: "Iced Americano", category: "Cold Coffee", price: 180 },
  { name: "Iced Latte", category: "Cold Coffee", price: 210 },
  { name: "Classic Frappe", category: "Cold Coffee", price: 250 },
  { name: "Caramel Frappe", category: "Cold Coffee", price: 270 },
  { name: "Iced Mocha", category: "Cold Coffee", price: 240 },
  // Tea
  { name: "Masala Chai", category: "Tea", price: 100 },
  { name: "Green Tea", category: "Tea", price: 120 },
  { name: "Earl Grey", category: "Tea", price: 130 },
  { name: "Iced Lemon Tea", category: "Tea", price: 150 },
  // Food
  { name: "Veg Sandwich", category: "Food", price: 180 },
  { name: "Chicken Sandwich", category: "Food", price: 220 },
  { name: "Butter Croissant", category: "Food", price: 160 },
  { name: "Paneer Wrap", category: "Food", price: 200 },
  { name: "Pasta Alfredo", category: "Food", price: 280 },
  // Desserts
  { name: "Blueberry Muffin", category: "Desserts", price: 140 },
  { name: "Chocolate Brownie", category: "Desserts", price: 160 },
  { name: "New York Cheesecake", category: "Desserts", price: 220 },
  { name: "Chocolate Chip Cookie", category: "Desserts", price: 90 },
  { name: "Tiramisu", category: "Desserts", price: 250 },
];

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Rohan", "Rahul", "Karan", "Vikram", "Siddharth", "Aman",
  "Nikhil", "Pranav", "Kunal", "Varun", "Harsh", "Dev", "Ishaan", "Kabir", "Yash", "Raghav",
  "Priya", "Ananya", "Diya", "Aisha", "Sneha", "Pooja", "Neha", "Riya", "Kavya", "Meera",
  "Sanya", "Tanvi", "Ishita", "Shreya", "Nidhi", "Aditi", "Kriti", "Simran", "Anjali", "Divya",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Nair", "Iyer", "Menon",
  "Chopra", "Malhotra", "Kapoor", "Joshi", "Desai", "Mehta", "Shah", "Agarwal", "Banerjee", "Mukherjee",
  "Das", "Bose", "Rao", "Naidu", "Pillai", "Kulkarni", "Deshpande", "Bhat", "Hegde", "Chauhan",
];

const CITIES = Object.keys(STORE_AREAS);
const NOW = new Date("2026-06-12T00:00:00Z").getTime();
const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

async function main() {
  console.log("Clearing existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.customerAnalytics.deleteMany();
  await prisma.customerInsight.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();

  // ---------- stores ----------
  const stores = CITIES.flatMap((city) =>
    STORE_AREAS[city].map((area) => ({
      id: randomUUID(),
      name: `Barista ${area}`,
      city,
      address: `${area}, ${city}`,
    })),
  );
  await prisma.store.createMany({ data: stores });
  console.log(`Stores: ${stores.length}`);

  // ---------- products ----------
  const products = PRODUCTS.map((p) => ({ id: randomUUID(), ...p, isActive: true }));
  await prisma.product.createMany({ data: products });
  console.log(`Products: ${products.length}`);

  // ---------- customers ----------
  const customers = Array.from({ length: 5000 }, (_, i) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const joinedAt = new Date(NOW - Math.floor(rand() * THREE_YEARS_MS));
    return {
      id: randomUUID(),
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`,
      phone: `+91${randInt(70000, 99999)}${randInt(10000, 99999)}`,
      city: pick(CITIES),
      birthday: new Date(Date.UTC(randInt(1965, 2005), randInt(0, 11), randInt(1, 28))),
      joinedAt,
      loyaltyTier: weighted<LoyaltyTier>([["BRONZE", 60], ["SILVER", 30], ["GOLD", 10]]),
      loyaltyPoints: randInt(0, 5000),
      declaredPreferredChannel: weighted<Channel>([["EMAIL", 50], ["WHATSAPP", 30], ["SMS", 20]]),
      marketingOptIn: rand() < 0.9,
    };
  });
  for (let i = 0; i < customers.length; i += 1000) {
    await prisma.customer.createMany({ data: customers.slice(i, i + 1000) });
  }
  console.log(`Customers: ${customers.length}`);

  // ---------- orders ----------
  const storesByCity = new Map(CITIES.map((c) => [c, stores.filter((s) => s.city === c)]));
  const orders: {
    id: string;
    customerId: string;
    storeId: string;
    orderedAt: Date;
    totalAmount: number;
  }[] = [];
  const orderItems: {
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }[] = [];

  for (let i = 0; i < 30000; i++) {
    // skew towards lower indices so a few customers become heavy regulars
    const customer = customers[Math.floor(Math.pow(rand(), 2) * customers.length)];
    // people mostly order in their own city, sometimes when travelling
    const cityStores = rand() < 0.85 ? storesByCity.get(customer.city!)! : stores;
    const store = pick(cityStores);
    const orderedAt = new Date(
      customer.joinedAt.getTime() + Math.floor(rand() * (NOW - customer.joinedAt.getTime())),
    );

    const orderId = randomUUID();
    let total = 0;
    const itemCount = weighted([[1, 45], [2, 35], [3, 15], [4, 5]]);
    for (let j = 0; j < itemCount; j++) {
      const product = pick(products);
      const quantity = rand() < 0.85 ? 1 : 2;
      total += product.price * quantity;
      orderItems.push({ orderId, productId: product.id, quantity, unitPrice: product.price });
    }
    orders.push({ id: orderId, customerId: customer.id, storeId: store.id, orderedAt, totalAmount: total });
  }

  for (let i = 0; i < orders.length; i += 5000) {
    await prisma.order.createMany({ data: orders.slice(i, i + 5000) });
    console.log(`Orders inserted: ${Math.min(i + 5000, orders.length)}/${orders.length}`);
  }
  for (let i = 0; i < orderItems.length; i += 5000) {
    await prisma.orderItem.createMany({ data: orderItems.slice(i, i + 5000) });
  }
  console.log(`Order items: ${orderItems.length}`);

  // ---------- final counts ----------
  const [storeCount, productCount, customerCount, orderCount, itemCount] = await Promise.all([
    prisma.store.count(),
    prisma.product.count(),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
  ]);
  console.log("--- Final counts ---");
  console.log({ storeCount, productCount, customerCount, orderCount, itemCount });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
