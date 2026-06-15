import "dotenv/config";
import { CampaignCreativeService } from "../src/campaign-studio/services/campaign-creative.service";

const service = new CampaignCreativeService();

console.log("GEMINI_API_KEY set:", Boolean(process.env.GEMINI_API_KEY));

const result = await service.generate({
  campaignName: "Tea Loyalty Boost 2026",
  campaignObjective: "Increase premium tea purchases among loyal tea drinkers.",
  audienceName: "Tea Loyalists",
  audienceDescription: "Customers who frequently purchase tea products.",
  recommendedOffer: "Double Loyalty Points",
  recommendedChannel: "WhatsApp",
});

console.log(JSON.stringify(result, null, 2));

if (result.ok) {
  console.log("imageUrl prefix:", result.creative.imageUrl.slice(0, 40));
  console.log("imageUrl length:", result.creative.imageUrl.length);
}
