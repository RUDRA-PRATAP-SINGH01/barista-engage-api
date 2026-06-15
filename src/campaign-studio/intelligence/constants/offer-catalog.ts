import type { CampaignOffer } from "../types/campaign-intelligence.types";

export type OfferDefinition = {
  label: CampaignOffer;
  description: string;
  engagementMultiplier: number;
};

export const OFFER_CATALOG: Record<CampaignOffer, OfferDefinition> = {
  "Percentage Discount": {
    label: "Percentage Discount",
    description: "15% off on the next order",
    engagementMultiplier: 1.12,
  },
  "Buy One Get One": {
    label: "Buy One Get One",
    description: "Buy one drink, get one free on select items",
    engagementMultiplier: 1.1,
  },
  "Free Upgrade": {
    label: "Free Upgrade",
    description: "Free size upgrade on your favourite drink",
    engagementMultiplier: 1.06,
  },
  "Double Loyalty Points": {
    label: "Double Loyalty Points",
    description: "Earn 2x loyalty points on your next visit",
    engagementMultiplier: 1.08,
  },
  "Free Delivery": {
    label: "Free Delivery",
    description: "Free delivery on orders above ₹299",
    engagementMultiplier: 1.04,
  },
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
