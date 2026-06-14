import { RuleBasedAudienceIntentProvider } from "./providers/rule-based-audience-intent.provider";
import { AudienceGoalAnalyzerService } from "./services/audience-goal-analyzer.service";
import { AudienceScoringService } from "./services/audience-scoring.service";
import { AudienceRecommendationService } from "./services/audience-recommendation.service";
import { ChannelRecommendationService } from "./services/channel-recommendation.service";
import { AudienceForecastService } from "./services/audience-forecast.service";
import { AudienceBuilderService } from "./services/audience-builder.service";
import { listSegmentsWithAudience } from "../services/segment.service";

let audienceBuilderService: AudienceBuilderService | null = null;

export function createAudienceBuilderService(): AudienceBuilderService {
  const intentProvider = new RuleBasedAudienceIntentProvider();

  return new AudienceBuilderService(
    new AudienceGoalAnalyzerService(intentProvider),
    new AudienceScoringService(),
    new AudienceRecommendationService(),
    new ChannelRecommendationService(),
    new AudienceForecastService(),
    listSegmentsWithAudience,
  );
}

export function getAudienceBuilderService(): AudienceBuilderService {
  if (!audienceBuilderService) {
    audienceBuilderService = createAudienceBuilderService();
  }
  return audienceBuilderService;
}

// allows tests to inject a custom provider graph without touching route handlers
export function setAudienceBuilderService(service: AudienceBuilderService): void {
  audienceBuilderService = service;
}

export function resetAudienceBuilderService(): void {
  audienceBuilderService = null;
}
