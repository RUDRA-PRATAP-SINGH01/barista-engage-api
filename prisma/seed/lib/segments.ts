import type { Prisma } from "../../../generated/prisma/client";

export type SegmentDef = {
  name: string;
  description: string;
  rules: Prisma.InputJsonValue;
};

export const SEGMENTS: SegmentDef[] = [
  {
    name: "Champions",
    description: "Top recency, frequency, and spend — highest engagement customers.",
    rules: { rfmSegment: "Champion" },
  },
  {
    name: "Loyal Customers",
    description: "Consistent repeat purchasers with strong brand affinity.",
    rules: { rfmSegment: "Loyal Customer" },
  },
  {
    name: "Big Spenders",
    description: "High average order value, premium product preference.",
    rules: { rfmSegment: "Big Spender" },
  },
  {
    name: "Cold Brew Lovers",
    description: "Customers whose favorite drink is Cold Brew.",
    rules: { favoriteDrink: "Cold Brew" },
  },
  {
    name: "Tea Loyalists",
    description: "Regular tea drinkers — morning and rainy-season purchasers.",
    rules: { favoriteDrink: "Masala Chai" },
  },
  {
    name: "Discount Hunters",
    description: "Frequent buyers with lower average spend — promotion-sensitive.",
    rules: { totalOrders: { gte: 10 }, lifetimeSpend: { lt: 5000 } },
  },
  {
    name: "At Risk",
    description: "Historically active customers with declining visit frequency.",
    rules: { rfmSegment: "At Risk" },
  },
  {
    name: "Lost Customers",
    description: "Inactive 60+ days — prime win-back targets.",
    rules: { rfmSegment: "Lost Customer" },
  },
  {
    name: "Morning Regulars",
    description: "Tea and coffee buyers in Delhi and Bangalore morning corridors.",
    rules: { city: "Delhi", favoriteDrink: "Masala Chai" },
  },
  {
    name: "Weekend Visitors",
    description: "Active customers with moderate frequency — weekend footfall drivers.",
    rules: { churnRisk: "LOW", totalOrders: { gte: 5 } },
  },
  {
    name: "High CLV",
    description: "Lifetime spend above ₹8,000 — high revenue potential.",
    rules: { lifetimeSpend: { gt: 8000 } },
  },
  {
    name: "Frequent Buyers",
    description: "More than 20 lifetime orders.",
    rules: { totalOrders: { gt: 20 } },
  },
  {
    name: "Premium Buyers",
    description: "Lifetime spend above ₹5,000 with low churn risk.",
    rules: { lifetimeSpend: { gt: 5000 }, churnRisk: "LOW" },
  },
  {
    name: "Budget Conscious",
    description: "Lower spend profile — value-driven offers work best.",
    rules: { lifetimeSpend: { lt: 2000 } },
  },
  {
    name: "Digital First",
    description: "Gold loyalty members — digitally engaged high-value base.",
    rules: { loyaltyTier: "GOLD" },
  },
  {
    name: "Email Engaged",
    description: "Medium churn risk customers reachable via email nurture.",
    rules: { churnRisk: "MEDIUM" },
  },
  {
    name: "WhatsApp Engaged",
    description: "Low churn, recent purchasers — ideal for WhatsApp campaigns.",
    rules: { churnRisk: "LOW", daysSinceLastOrder: { lte: 21 } },
  },
  {
    name: "SMS Engaged",
    description: "Promotion-sensitive segment for time-bound SMS offers.",
    rules: { churnRisk: "MEDIUM", totalOrders: { gte: 8 } },
  },
  {
    name: "Reactivation Candidates",
    description: "High churn risk with 45+ days since last order.",
    rules: { churnRisk: "HIGH", daysSinceLastOrder: { gt: 45 } },
  },
  {
    name: "New Customers",
    description: "Fewer than 4 orders — onboarding and nurture targets.",
    rules: { totalOrders: { lt: 4 } },
  },
];
