import type { BusinessObjective } from "../../audience-intelligence/types/audience-objective";
import { OBJECTIVE_OFFER_MAPPINGS } from "../../audience-intelligence/constants/offer-mappings";
import { OFFER_CATALOG } from "./constants/offer-catalog";
import type {
  CampaignOffer,
  OfferIntelligenceResult,
  SegmentAudienceAnalytics,
} from "./types/campaign-intelligence.types";

type OfferScore = {
  offer: CampaignOffer;
  score: number;
  reason: string;
};

function scoreOffers(
  analytics: SegmentAudienceAnalytics,
  objective: BusinessObjective,
): OfferScore[] {
  const scores: OfferScore[] = [
    { offer: "Percentage Discount", score: 40, reason: "General promotional appeal" },
    { offer: "Buy One Get One", score: 35, reason: "Drives trial and basket size" },
    { offer: "Free Upgrade", score: 35, reason: "Premium upsell without heavy discounting" },
    { offer: "Double Loyalty Points", score: 35, reason: "Rewards repeat behaviour" },
    { offer: "Free Delivery", score: 30, reason: "Convenience-led conversion" },
  ];

  const bump = (offer: CampaignOffer, points: number, reason: string) => {
    const entry = scores.find((s) => s.offer === offer);
    if (entry) {
      entry.score += points;
      entry.reason = reason;
    }
  };

  if (analytics.discountHunterSignal) {
    bump("Percentage Discount", 35, "Audience shows discount-sensitive purchase patterns");
    bump("Buy One Get One", 15, "Value-driven customers respond to bundled savings");
  }

  if (analytics.loyalCustomerSignal) {
    bump("Double Loyalty Points", 35, "Loyal customers are motivated by rewards accumulation");
    bump("Free Upgrade", 12, "Loyalty segments accept premium perks over steep discounts");
  }

  if (analytics.coldBrewSignal) {
    bump("Free Upgrade", 30, "Cold brew lovers respond to premium drink upgrades");
    bump("Buy One Get One", 10, "Product trial can expand cold brew adoption");
  }

  if (analytics.teaSignal) {
    bump("Percentage Discount", 18, "Tea revenue goals benefit from accessible entry offers");
    bump("Free Upgrade", 14, "Tea upsell works well with complimentary size upgrades");
  }

  if (analytics.averageSpend >= 5000) {
    bump("Free Upgrade", 15, "High spenders prefer premium perks over deep discounts");
  }

  if (analytics.averageSpend < 2500) {
    bump("Percentage Discount", 12, "Lower spend segments are more price-sensitive");
    bump("Free Delivery", 10, "Delivery incentive lowers friction for budget-conscious buyers");
  }

  if (analytics.churnRisk === "HIGH") {
    bump("Percentage Discount", 15, "Win-back segments need a tangible comeback incentive");
    bump("Buy One Get One", 8, "BOGO creates urgency for lapsed customers");
  }

  switch (objective) {
    case "WIN_BACK":
    case "REACTIVATION":
    case "DISCOUNT_PROMOTION":
      bump("Percentage Discount", 20, `Aligned with ${objective.replace(/_/g, " ").toLowerCase()} objective`);
      break;
    case "LOYALTY":
    case "RETENTION":
      bump("Double Loyalty Points", 20, `Aligned with ${objective.replace(/_/g, " ").toLowerCase()} objective`);
      break;
    case "UPSELL":
    case "CROSS_SELL":
    case "PRODUCT_LAUNCH":
      bump("Free Upgrade", 18, `Aligned with ${objective.replace(/_/g, " ").toLowerCase()} objective`);
      break;
    case "FOOTFALL":
      bump("Free Delivery", 15, "Footfall campaigns benefit from visit-driving convenience perks");
      break;
    default:
      break;
  }

  const objectiveOffer = OBJECTIVE_OFFER_MAPPINGS[objective].bestOffer.toLowerCase();
  if (objectiveOffer.includes("discount") || objectiveOffer.includes("%")) {
    bump("Percentage Discount", 8, "Objective language signals discount-led positioning");
  }
  if (objectiveOffer.includes("loyalty") || objectiveOffer.includes("reward")) {
    bump("Double Loyalty Points", 8, "Objective language signals loyalty-led positioning");
  }

  return scores.sort((a, b) => b.score - a.score);
}

export class OfferIntelligenceService {
  recommend(
    analytics: SegmentAudienceAnalytics,
    objective: BusinessObjective,
  ): OfferIntelligenceResult {
    const ranked = scoreOffers(analytics, objective);
    const primary = ranked[0]!;
    const catalog = OFFER_CATALOG[primary.offer];

    return {
      recommendedOffer: primary.offer,
      offerDescription: catalog.description,
      confidence: Math.min(96, Math.max(55, primary.score)),
      reasoning: [
        primary.reason,
        `Favourite product in segment: ${analytics.favoriteProduct ?? "mixed catalogue"}.`,
        `Average lifetime spend ₹${analytics.averageSpend.toLocaleString("en-IN")} informs offer depth.`,
      ],
      alternatives: ranked.slice(1, 4).map((entry) => ({
        offer: entry.offer,
        description: OFFER_CATALOG[entry.offer].description,
        reasoning: entry.reason,
      })),
    };
  }
}
