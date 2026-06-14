import type { Channel, LoyaltyTier } from "../../../generated/prisma/client";

export const NOW = new Date("2026-06-15T12:00:00Z");
export const NOW_MS = NOW.getTime();
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ProductDef = {
  name: string;
  category: "Coffee" | "Tea" | "Food";
  price: number;
  margin: number;
  popularity: number;
};

export const STORES = [
  {
    name: "Barista Connaught Place",
    city: "Delhi",
    address: "Block A, Connaught Place, New Delhi",
    popularity: 1.2,
    avgOrderValue: 320,
    peakHours: [8, 9, 12, 13, 18, 19],
  },
  {
    name: "Barista Cyber Hub",
    city: "Delhi",
    address: "Tower C, Cyber Hub, Gurugram",
    popularity: 1.0,
    avgOrderValue: 380,
    peakHours: [12, 13, 14, 18, 19, 20],
  },
  {
    name: "Barista Bandra",
    city: "Mumbai",
    address: "Hill Road, Bandra West, Mumbai",
    popularity: 1.1,
    avgOrderValue: 350,
    peakHours: [8, 9, 17, 18, 19, 20],
  },
  {
    name: "Barista Koramangala",
    city: "Bangalore",
    address: "5th Block, Koramangala, Bangalore",
    popularity: 1.15,
    avgOrderValue: 340,
    peakHours: [8, 9, 12, 13, 19, 20],
  },
  {
    name: "Barista Salt Lake",
    city: "Kolkata",
    address: "Sector V, Salt Lake, Kolkata",
    popularity: 0.95,
    avgOrderValue: 300,
    peakHours: [9, 10, 12, 13, 18, 19],
  },
] as const;

export const PRODUCTS: ProductDef[] = [
  { name: "Espresso", category: "Coffee", price: 120, margin: 0.72, popularity: 45 },
  { name: "Americano", category: "Coffee", price: 150, margin: 0.7, popularity: 70 },
  { name: "Latte", category: "Coffee", price: 190, margin: 0.65, popularity: 90 },
  { name: "Mocha", category: "Coffee", price: 210, margin: 0.62, popularity: 55 },
  { name: "Cappuccino", category: "Coffee", price: 180, margin: 0.66, popularity: 95 },
  { name: "Flat White", category: "Coffee", price: 200, margin: 0.64, popularity: 40 },
  { name: "Cold Brew", category: "Coffee", price: 240, margin: 0.68, popularity: 65 },
  { name: "Nitro Cold Brew", category: "Coffee", price: 280, margin: 0.6, popularity: 30 },
  { name: "Masala Chai", category: "Tea", price: 100, margin: 0.75, popularity: 80 },
  { name: "Green Tea", category: "Tea", price: 120, margin: 0.74, popularity: 35 },
  { name: "Black Tea", category: "Tea", price: 110, margin: 0.76, popularity: 28 },
  { name: "Herbal Tea", category: "Tea", price: 130, margin: 0.73, popularity: 22 },
  { name: "Croissant", category: "Food", price: 160, margin: 0.55, popularity: 50 },
  { name: "Brownie", category: "Food", price: 160, margin: 0.58, popularity: 48 },
  { name: "Muffin", category: "Food", price: 140, margin: 0.56, popularity: 42 },
  { name: "Sandwich", category: "Food", price: 220, margin: 0.5, popularity: 55 },
  { name: "Bagel", category: "Food", price: 180, margin: 0.52, popularity: 30 },
  { name: "Cookie", category: "Food", price: 90, margin: 0.6, popularity: 38 },
];

export const COFFEE_DRINKS = PRODUCTS.filter((p) => p.category === "Coffee").map((p) => p.name);
export const TEA_DRINKS = PRODUCTS.filter((p) => p.category === "Tea").map((p) => p.name);
export const COLD_DRINKS = ["Cold Brew", "Nitro Cold Brew"];
export const FOOD_ITEMS = PRODUCTS.filter((p) => p.category === "Food").map((p) => p.name);

export const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Rohan", "Rahul", "Karan", "Vikram", "Siddharth", "Aman",
  "Nikhil", "Pranav", "Kunal", "Varun", "Harsh", "Dev", "Ishaan", "Kabir", "Yash", "Raghav",
  "Priya", "Ananya", "Diya", "Aisha", "Sneha", "Pooja", "Neha", "Riya", "Kavya", "Meera",
  "Sanya", "Tanvi", "Ishita", "Shreya", "Nidhi", "Aditi", "Kriti", "Simran", "Anjali", "Divya",
];

export const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Nair", "Iyer", "Menon",
  "Chopra", "Malhotra", "Kapoor", "Joshi", "Desai", "Mehta", "Shah", "Agarwal", "Banerjee", "Mukherjee",
];

export const STORE_CITIES = ["Delhi", "Mumbai", "Bangalore", "Kolkata"] as const;

// seasonal multipliers by month (0=Jan)
export const MONTHLY_DEMAND: Record<number, number> = {
  0: 0.9,
  1: 0.85,
  2: 1.0,
  3: 1.15, // summer cold brew
  4: 1.2,
  5: 1.1,
  6: 0.95, // rainy tea
  7: 0.95,
  8: 1.0,
  9: 1.15, // festival
  10: 1.25, // Diwali
  11: 1.2, // holidays
};

export type PersonaId =
  | "champion"
  | "loyal"
  | "big_spender"
  | "cold_brew_lover"
  | "tea_loyalist"
  | "discount_hunter"
  | "at_risk"
  | "lost"
  | "new"
  | "occasional";

export type PersonaConfig = {
  id: PersonaId;
  label: string;
  weight: number;
  orderRange: [number, number];
  daysSinceLastOrder: [number, number];
  aovMultiplier: number;
  preferredChannel: Channel;
  openRateRange: [number, number];
  clickRateRange: [number, number];
  loyaltyWeights: readonly (readonly [LoyaltyTier, number])[];
  productBias: Record<string, number>;
  foodAffinity: number;
  discountSensitivity: number;
};

export const PERSONAS: PersonaConfig[] = [
  {
    id: "champion",
    label: "Champion",
    weight: 10,
    orderRange: [20, 40],
    daysSinceLastOrder: [1, 14],
    aovMultiplier: 1.15,
    preferredChannel: "WHATSAPP",
    openRateRange: [0.7, 0.9],
    clickRateRange: [0.08, 0.15],
    loyaltyWeights: [["GOLD", 60], ["SILVER", 30], ["BRONZE", 10]],
    productBias: { "Latte": 2, "Cappuccino": 2, "Cold Brew": 1.5, "Mocha": 1.5 },
    foodAffinity: 0.45,
    discountSensitivity: 0.1,
  },
  {
    id: "loyal",
    label: "Loyal Customer",
    weight: 15,
    orderRange: [12, 25],
    daysSinceLastOrder: [3, 21],
    aovMultiplier: 1.05,
    preferredChannel: "WHATSAPP",
    openRateRange: [0.55, 0.75],
    clickRateRange: [0.05, 0.1],
    loyaltyWeights: [["SILVER", 50], ["GOLD", 25], ["BRONZE", 25]],
    productBias: { Cappuccino: 2, Latte: 1.8, Americano: 1.5 },
    foodAffinity: 0.4,
    discountSensitivity: 0.2,
  },
  {
    id: "big_spender",
    label: "Big Spender",
    weight: 10,
    orderRange: [6, 14],
    daysSinceLastOrder: [5, 30],
    aovMultiplier: 1.65,
    preferredChannel: "EMAIL",
    openRateRange: [0.4, 0.6],
    clickRateRange: [0.06, 0.12],
    loyaltyWeights: [["GOLD", 70], ["SILVER", 25], ["BRONZE", 5]],
    productBias: { "Nitro Cold Brew": 2.5, "Flat White": 2, Mocha: 2, Sandwich: 2 },
    foodAffinity: 0.7,
    discountSensitivity: 0.05,
  },
  {
    id: "cold_brew_lover",
    label: "Cold Brew Lover",
    weight: 10,
    orderRange: [10, 22],
    daysSinceLastOrder: [2, 25],
    aovMultiplier: 1.1,
    preferredChannel: "WHATSAPP",
    openRateRange: [0.65, 0.85],
    clickRateRange: [0.07, 0.14],
    loyaltyWeights: [["SILVER", 40], ["BRONZE", 35], ["GOLD", 25]],
    productBias: { "Cold Brew": 5, "Nitro Cold Brew": 3 },
    foodAffinity: 0.35,
    discountSensitivity: 0.15,
  },
  {
    id: "tea_loyalist",
    label: "Tea Loyalist",
    weight: 10,
    orderRange: [10, 20],
    daysSinceLastOrder: [2, 20],
    aovMultiplier: 0.85,
    preferredChannel: "SMS",
    openRateRange: [0.5, 0.7],
    clickRateRange: [0.04, 0.08],
    loyaltyWeights: [["BRONZE", 45], ["SILVER", 40], ["GOLD", 15]],
    productBias: { "Masala Chai": 4, "Green Tea": 2, "Black Tea": 1.5, "Herbal Tea": 1.5 },
    foodAffinity: 0.25,
    discountSensitivity: 0.25,
  },
  {
    id: "discount_hunter",
    label: "Discount Hunter",
    weight: 15,
    orderRange: [10, 22],
    daysSinceLastOrder: [5, 28],
    aovMultiplier: 0.75,
    preferredChannel: "SMS",
    openRateRange: [0.6, 0.8],
    clickRateRange: [0.1, 0.2],
    loyaltyWeights: [["BRONZE", 60], ["SILVER", 30], ["GOLD", 10]],
    productBias: { Americano: 2, Cookie: 2, Muffin: 1.5 },
    foodAffinity: 0.3,
    discountSensitivity: 0.9,
  },
  {
    id: "at_risk",
    label: "At Risk",
    weight: 10,
    orderRange: [14, 28],
    daysSinceLastOrder: [30, 60],
    aovMultiplier: 1.0,
    preferredChannel: "WHATSAPP",
    openRateRange: [0.3, 0.5],
    clickRateRange: [0.02, 0.05],
    loyaltyWeights: [["SILVER", 40], ["BRONZE", 40], ["GOLD", 20]],
    productBias: { Latte: 1.5, Cappuccino: 1.5, "Masala Chai": 1.2 },
    foodAffinity: 0.35,
    discountSensitivity: 0.5,
  },
  {
    id: "lost",
    label: "Lost Customer",
    weight: 10,
    orderRange: [8, 20],
    daysSinceLastOrder: [60, 180],
    aovMultiplier: 0.95,
    preferredChannel: "EMAIL",
    openRateRange: [0.15, 0.35],
    clickRateRange: [0.01, 0.03],
    loyaltyWeights: [["BRONZE", 55], ["SILVER", 35], ["GOLD", 10]],
    productBias: { Americano: 1.5, "Cold Brew": 1.3, Cookie: 1.2 },
    foodAffinity: 0.25,
    discountSensitivity: 0.6,
  },
  {
    id: "new",
    label: "New Customer",
    weight: 5,
    orderRange: [1, 3],
    daysSinceLastOrder: [1, 14],
    aovMultiplier: 0.9,
    preferredChannel: "WHATSAPP",
    openRateRange: [0.55, 0.75],
    clickRateRange: [0.05, 0.1],
    loyaltyWeights: [["BRONZE", 80], ["SILVER", 15], ["GOLD", 5]],
    productBias: { Latte: 2, Cappuccino: 1.5, Cookie: 1.5 },
    foodAffinity: 0.4,
    discountSensitivity: 0.4,
  },
  {
    id: "occasional",
    label: "Occasional Visitor",
    weight: 5,
    orderRange: [3, 8],
    daysSinceLastOrder: [20, 50],
    aovMultiplier: 0.9,
    preferredChannel: "EMAIL",
    openRateRange: [0.25, 0.45],
    clickRateRange: [0.02, 0.05],
    loyaltyWeights: [["BRONZE", 70], ["SILVER", 25], ["GOLD", 5]],
    productBias: { Americano: 1.5, "Masala Chai": 1.3, Muffin: 1.2 },
    foodAffinity: 0.3,
    discountSensitivity: 0.35,
  },
];

export const BASKET_PAIRS: readonly (readonly [string, string])[] = [
  ["Cold Brew", "Brownie"],
  ["Latte", "Croissant"],
  ["Masala Chai", "Cookie"],
  ["Sandwich", "Americano"],
  ["Cappuccino", "Muffin"],
  ["Mocha", "Cookie"],
  ["Nitro Cold Brew", "Bagel"],
];
