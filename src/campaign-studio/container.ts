import { RuleBasedAudienceIntentProvider } from "../audience-intelligence/providers/rule-based-audience-intent.provider";
import { AudienceAnalyticsService } from "./intelligence/audience-analytics.service";
import { ChannelIntelligenceService } from "./intelligence/channel-intelligence.service";
import { OfferIntelligenceService } from "./intelligence/offer-intelligence.service";
import { TimingIntelligenceService } from "./intelligence/timing-intelligence.service";
import { CampaignOverviewService } from "./services/campaign-overview.service";
import { CampaignMessageService } from "./services/campaign-message.service";
import { CampaignCreativeService } from "./services/campaign-creative.service";
import { CampaignStrategyService } from "./services/campaign-strategy.service";
import { CampaignStudioService } from "./services/campaign-studio.service";

let campaignStudioService: CampaignStudioService | null = null;

export function createCampaignStudioService(): CampaignStudioService {
  return new CampaignStudioService(
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
}

export function getCampaignStudioService(): CampaignStudioService {
  if (!campaignStudioService) {
    campaignStudioService = createCampaignStudioService();
  }
  return campaignStudioService;
}

export function setCampaignStudioService(service: CampaignStudioService): void {
  campaignStudioService = service;
}

export function resetCampaignStudioService(): void {
  campaignStudioService = null;
}
