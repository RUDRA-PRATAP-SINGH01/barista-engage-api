import { randomUUID } from "node:crypto";
import type { CampaignStatus, Channel } from "../../../generated/prisma/client";
import { NOW } from "./reference";
import { randInt } from "./rng";

export type CampaignDef = {
  id: string;
  name: string;
  description: string;
  segmentIndex: number;
  channel: Channel;
  status: CampaignStatus;
  subject: string | null;
  body: string;
  sentAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
};

type CampaignTemplate = {
  name: string;
  description: string;
  segmentIndex: number;
  channel: Channel;
  status: CampaignStatus;
  subject: string | null;
  body: string;
  daysAgo?: number;
};

const TEMPLATES: CampaignTemplate[] = [
  // Completed — Retention (8)
  { name: "Champion Rewards Q1", description: "Retention — reward top customers", segmentIndex: 0, channel: "WHATSAPP", status: "COMPLETED", subject: "You're a Champion ☕", body: "Exclusive 20% off your next visit — thank you for being our best customer.", daysAgo: 90 },
  { name: "Loyal Customer Appreciation", description: "Retention — loyalty thank-you", segmentIndex: 1, channel: "WHATSAPP", status: "COMPLETED", subject: "A thank you from Barista", body: "Enjoy a free cookie with any coffee this week.", daysAgo: 75 },
  { name: "Gold Member Perks", description: "Retention — gold tier benefits", segmentIndex: 14, channel: "EMAIL", status: "COMPLETED", subject: "Your Gold benefits await", body: "Double loyalty points on all orders this month.", daysAgo: 60 },
  { name: "Weekend Regulars Treat", description: "Retention — weekend loyalty", segmentIndex: 9, channel: "WHATSAPP", status: "COMPLETED", subject: "Weekend special for you", body: "Buy one get one 50% off on Saturdays.", daysAgo: 45 },
  { name: "Frequent Buyer Bonus", description: "Retention — frequency reward", segmentIndex: 11, channel: "SMS", status: "COMPLETED", subject: null, body: "You've earned a free upgrade! Show this SMS at checkout.", daysAgo: 55 },
  { name: "Premium Buyer Experience", description: "Retention — premium upsell", segmentIndex: 12, channel: "EMAIL", status: "COMPLETED", subject: "An exclusive tasting invite", body: "Try our new Nitro Cold Brew before anyone else.", daysAgo: 40 },
  { name: "WhatsApp VIP Club", description: "Retention — WhatsApp engaged", segmentIndex: 16, channel: "WHATSAPP", status: "COMPLETED", subject: "VIP early access", body: "New seasonal menu — order before the crowd.", daysAgo: 30 },
  { name: "Morning Regulars Brew", description: "Retention — morning tea/coffee", segmentIndex: 8, channel: "SMS", status: "COMPLETED", subject: null, body: "Your morning Masala Chai is waiting — 10% off before 10 AM.", daysAgo: 20 },

  // Completed — Reactivation / Win-back (7)
  { name: "Win Back Lost Customers", description: "Reactivation — lost customer win-back", segmentIndex: 7, channel: "WHATSAPP", status: "COMPLETED", subject: "We miss you!", body: "15% comeback discount on your favourite drink — valid 7 days.", daysAgo: 85 },
  { name: "At Risk Rescue", description: "Reactivation — at-risk intervention", segmentIndex: 6, channel: "WHATSAPP", status: "COMPLETED", subject: "Before you go...", body: "Free drink upgrade on your next visit. We'd love to see you.", daysAgo: 70 },
  { name: "Reactivation Push", description: "Reactivation — 45+ day inactive", segmentIndex: 18, channel: "WHATSAPP", status: "COMPLETED", subject: "Come back this week", body: "₹100 off when you order via WhatsApp.", daysAgo: 65 },
  { name: "Lapsed Email Series", description: "Reactivation — email win-back", segmentIndex: 7, channel: "EMAIL", status: "COMPLETED", subject: "Your Cold Brew misses you", body: "Come back this weekend and enjoy 20% off.", daysAgo: 50 },
  { name: "Second Chance Offer", description: "Reactivation — high churn SMS", segmentIndex: 18, channel: "SMS", status: "COMPLETED", subject: null, body: "LAST CHANCE: 20% off ends Sunday. Reply YES to claim.", daysAgo: 35 },
  { name: "Cooling Off Recovery", description: "Reactivation — medium churn email", segmentIndex: 15, channel: "EMAIL", status: "COMPLETED", subject: "Still thinking about us?", body: "Your usual order is one tap away — free delivery this week.", daysAgo: 25 },
  { name: "Lost Customer Premium Win-back", description: "Reactivation — high CLV lost", segmentIndex: 10, channel: "WHATSAPP", status: "COMPLETED", subject: "A special invite back", body: "Premium customers get 25% off — just for you.", daysAgo: 15 },

  // Completed — Upsell / Cross-sell (5)
  { name: "Big Spender Premium Launch", description: "Upsell — premium product", segmentIndex: 2, channel: "EMAIL", status: "COMPLETED", subject: "Introducing Nitro Cold Brew", body: "Upgrade your coffee experience — first cup on us.", daysAgo: 80 },
  { name: "Cross-sell Food Pairing", description: "Cross-sell — food with coffee", segmentIndex: 1, channel: "WHATSAPP", status: "COMPLETED", subject: "Perfect pairing", body: "Add a Croissant to your Latte for just ₹99.", daysAgo: 42 },
  { name: "High CLV Upsell", description: "Upsell — high lifetime value", segmentIndex: 10, channel: "EMAIL", status: "COMPLETED", subject: "Elevate your coffee ritual", body: "Try our Flat White collection — exclusive to high-value members.", daysAgo: 38 },
  { name: "Premium Combo Deal", description: "Cross-sell — combo offer", segmentIndex: 12, channel: "WHATSAPP", status: "COMPLETED", subject: "Combo deal inside", body: "Sandwich + Americano at 15% off.", daysAgo: 22 },
  { name: "Loyal Upsell Nitro", description: "Upsell — nitro to loyal base", segmentIndex: 1, channel: "WHATSAPP", status: "COMPLETED", subject: "Nitro is here", body: "Upgrade any drink to Nitro Cold Brew for ₹50.", daysAgo: 12 },

  // Completed — Product Launch (3)
  { name: "Cold Brew Summer Launch", description: "Product Launch — cold brew promo", segmentIndex: 3, channel: "WHATSAPP", status: "COMPLETED", subject: "Cold Brew season is here", body: "New Cold Brew blend — 20% off launch week.", daysAgo: 100 },
  { name: "Nitro Cold Brew Intro", description: "Product Launch — nitro intro", segmentIndex: 3, channel: "WHATSAPP", status: "COMPLETED", subject: "Meet Nitro Cold Brew", body: "Silky, creamy, cold — try it first at your store.", daysAgo: 48 },
  { name: "Herbal Tea Launch", description: "Product Launch — new tea", segmentIndex: 4, channel: "SMS", status: "COMPLETED", subject: null, body: "New Herbal Tea range — free tasting this weekend.", daysAgo: 18 },

  // Completed — Discount / Acquisition (2)
  { name: "Discount Hunter Flash Sale", description: "Promotional — discount segment", segmentIndex: 5, channel: "SMS", status: "COMPLETED", subject: null, body: "FLASH SALE: 30% off all drinks — today only!", daysAgo: 28 },
  { name: "New Customer Welcome", description: "Acquisition — new customer onboarding", segmentIndex: 19, channel: "WHATSAPP", status: "COMPLETED", subject: "Welcome to Barista!", body: "Your first drink is 25% off. Welcome to the family.", daysAgo: 10 },

  // Active — SENDING (5)
  { name: "Summer Cold Brew Push", description: "Product Launch — active summer push", segmentIndex: 3, channel: "WHATSAPP", status: "SENDING", subject: "Beat the heat", body: "Cold Brew at 15% off all June.", daysAgo: 2 },
  { name: "Loyal June Rewards", description: "Retention — active loyalty", segmentIndex: 1, channel: "WHATSAPP", status: "SENDING", subject: "June rewards unlocked", body: "Double points on every order this month.", daysAgo: 1 },
  { name: "Weekend Footfall Drive", description: "Footfall — weekend traffic", segmentIndex: 9, channel: "SMS", status: "SENDING", subject: null, body: "Weekend only: free Cookie with any coffee.", daysAgo: 1 },
  { name: "At Risk Save Campaign", description: "Reactivation — active at-risk", segmentIndex: 6, channel: "WHATSAPP", status: "SENDING", subject: "We'd love to see you", body: "Free upgrade on your next visit — this week only.", daysAgo: 0 },
  { name: "Budget Conscious Value Deal", description: "Promotional — value segment", segmentIndex: 13, channel: "SMS", status: "SENDING", subject: null, body: "Coffee + Cookie for ₹199 — limited time.", daysAgo: 0 },

  // Active — SCHEDULED (5)
  { name: "July Tea Festival", description: "Product Launch — scheduled tea", segmentIndex: 4, channel: "SMS", status: "SCHEDULED", subject: null, body: "Monsoon tea festival — 20% off all teas in July.", daysAgo: -7 },
  { name: "Champion Exclusive July", description: "Retention — scheduled champion", segmentIndex: 0, channel: "WHATSAPP", status: "SCHEDULED", subject: "Champions only", body: "Exclusive early access to our July menu.", daysAgo: -5 },
  { name: "Reactivation July Push", description: "Reactivation — scheduled", segmentIndex: 18, channel: "WHATSAPP", status: "SCHEDULED", subject: "One more chance", body: "20% off if you visit before July 15.", daysAgo: -3 },
  { name: "Email Nurture Q3", description: "Retention — scheduled email", segmentIndex: 15, channel: "EMAIL", status: "SCHEDULED", subject: "Your coffee journey", body: "Discover new drinks curated for your taste.", daysAgo: -2 },
  { name: "Premium Buyer Invite", description: "Upsell — scheduled premium", segmentIndex: 12, channel: "EMAIL", status: "SCHEDULED", subject: "Premium tasting event", body: "You're invited to our exclusive tasting at Koramangala.", daysAgo: -1 },

  // Draft (5)
  { name: "Diwali Festive Campaign", description: "Promotional — draft festive", segmentIndex: 5, channel: "WHATSAPP", status: "DRAFT", subject: "Diwali specials coming", body: "Festive combos and gift cards — launching soon.", daysAgo: undefined },
  { name: "Christmas Holiday Push", description: "Acquisition — draft holiday", segmentIndex: 19, channel: "EMAIL", status: "DRAFT", subject: "Holiday warmth", body: "Seasonal drinks and gifting — draft.", daysAgo: undefined },
  { name: "Churn Reduction Pilot", description: "Reactivation — draft pilot", segmentIndex: 6, channel: "WHATSAPP", status: "DRAFT", subject: "Don't leave us", body: "Pilot win-back offer — not yet launched.", daysAgo: undefined },
  { name: "Cross-sell Bakery Launch", description: "Cross-sell — draft bakery", segmentIndex: 1, channel: "SMS", status: "DRAFT", subject: null, body: "New bakery range cross-sell — draft.", daysAgo: undefined },
  { name: "Mumbai Store Opening", description: "Acquisition — draft store launch", segmentIndex: 9, channel: "SMS", status: "DRAFT", subject: null, body: "New Bandra store celebration — draft.", daysAgo: undefined },
];

export function generateCampaigns(): CampaignDef[] {
  return TEMPLATES.map((t) => {
    const createdAt =
      t.daysAgo !== undefined && t.daysAgo >= 0
        ? new Date(NOW.getTime() - (t.daysAgo + randInt(1, 5)) * 24 * 60 * 60 * 1000)
        : new Date(NOW.getTime() - randInt(1, 10) * 24 * 60 * 60 * 1000);

    const sentAt =
      t.status === "COMPLETED" || t.status === "SENDING"
        ? new Date(createdAt.getTime() + randInt(1, 3) * 24 * 60 * 60 * 1000)
        : t.status === "SCHEDULED"
          ? null
          : null;

    const scheduledAt =
      t.status === "SCHEDULED"
        ? new Date(NOW.getTime() + randInt(3, 14) * 24 * 60 * 60 * 1000)
        : null;

    return {
      id: randomUUID(),
      name: t.name,
      description: t.description,
      segmentIndex: t.segmentIndex,
      channel: t.channel,
      status: t.status,
      subject: t.subject,
      body: t.body,
      sentAt,
      scheduledAt,
      createdAt,
    };
  });
}
