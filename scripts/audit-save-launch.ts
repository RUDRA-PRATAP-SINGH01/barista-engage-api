import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { CampaignStudioService } from "../src/campaign-studio/services/campaign-studio.service";
import { CampaignOverviewService } from "../src/campaign-studio/services/campaign-overview.service";
import { CampaignMessageService } from "../src/campaign-studio/services/campaign-message.service";
import { CampaignCreativeService } from "../src/campaign-studio/services/campaign-creative.service";
import { CampaignStrategyService } from "../src/campaign-studio/services/campaign-strategy.service";
import { AudienceAnalyticsService } from "../src/campaign-studio/intelligence/audience-analytics.service";
import { ChannelIntelligenceService } from "../src/campaign-studio/intelligence/channel-intelligence.service";
import { OfferIntelligenceService } from "../src/campaign-studio/intelligence/offer-intelligence.service";
import { TimingIntelligenceService } from "../src/campaign-studio/intelligence/timing-intelligence.service";
import { RuleBasedAudienceIntentProvider } from "../src/audience-intelligence/providers/rule-based-audience-intent.provider";
import { listCampaigns } from "../src/services/campaign.service";
import { toCampaignDto } from "../src/types/dto";
import type { SaveCampaignStudioInput } from "../src/validators/campaign-studio.validator";

const studio = new CampaignStudioService(
  new CampaignOverviewService(),
  new CampaignMessageService(),
  new CampaignCreativeService(),
  new CampaignStrategyService(),
  new AudienceAnalyticsService(),
  new ChannelIntelligenceService(),
  new OfferIntelligenceService(),
  new TimingIntelligenceService(),
  new RuleBasedAudienceIntentProvider(),
);

const savePayload: SaveCampaignStudioInput = {
  goal: "Audit validation campaign",
  audience: {
    name: `Audit Segment ${Date.now()}`,
    description: "Temporary audit segment for save/launch validation",
    audienceSize: 10,
    filters: [{ field: "rfmSegment", operator: "equals", value: "Champion" }],
  },
  overview: {
    campaignName: `Audit Campaign ${Date.now()}`,
    campaignObjective: "Validate save and launch workflow",
    campaignSummary: "Audit-only campaign created by validation script.",
  },
  recommendations: {
    recommendedChannel: "WhatsApp",
    recommendedOffer: "Double Loyalty Points",
    recommendedTiming: "Tuesday 10 AM",
  },
  message: {
    whatsAppMessage: "Audit test message",
    emailSubject: "Audit",
    emailBody: "Audit body",
    smsMessage: "Audit sms",
  },
};

async function main() {
  console.log("=== SAVE WORKFLOW ===");
  const saveResult = await studio.save(savePayload);
  if (!saveResult.ok) {
    console.error("SAVE FAILED", saveResult);
    process.exit(1);
  }

  const { segmentId, campaign, communicationsCreated } = saveResult.data;
  console.log({ segmentId, campaignId: campaign.id, status: campaign.status, communicationsCreated });

  const commCount = await prisma.communication.count({ where: { campaignId: campaign.id } });
  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  const listed = (await listCampaigns()).map(toCampaignDto).find((c) => c.id === campaign.id);

  console.log("Communications in DB:", commCount);
  console.log("Segment exists:", Boolean(segment));
  console.log("Appears in GET /campaigns:", Boolean(listed));
  console.log("Orphan check: comms match campaign:", commCount === communicationsCreated);

  console.log("\n=== LAUNCH WORKFLOW ===");
  const launchResult = await studio.launch(campaign.id);
  if (!launchResult.ok) {
    console.error("LAUNCH FAILED", launchResult);
    process.exit(1);
  }

  const afterLaunch = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    select: { status: true, sentAt: true },
  });
  const sentComms = await prisma.communication.count({
    where: { campaignId: campaign.id, status: "SENT" },
  });
  const pendingComms = await prisma.communication.count({
    where: { campaignId: campaign.id, status: "PENDING" },
  });

  console.log({
    launchResponse: launchResult.data,
    campaignStatus: afterLaunch?.status,
    sentAt: afterLaunch?.sentAt,
    sentComms,
    pendingComms,
    communicationsSentMatches: launchResult.data.communicationsSent === sentComms,
  });

  // cleanup audit records
  await prisma.communication.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.segment.delete({ where: { id: segmentId } });
  console.log("\nAudit records cleaned up.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
