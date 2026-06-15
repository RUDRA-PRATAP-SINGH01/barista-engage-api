import { GeminiAudienceBlueprintProvider } from "./providers/gemini-audience-blueprint.provider";
import { AudienceEconomicsService } from "./services/audience-economics.service";
import { AudiencePreviewService } from "./services/audience-preview.service";
import { AudienceRoiForecastService } from "./services/audience-roi-forecast.service";
import { AudienceStrategyService } from "./services/audience-strategy.service";
import { AudienceGenerateService } from "./services/audience-generate.service";

let audienceGenerateService: AudienceGenerateService | null = null;

export function createAudienceGenerateService(): AudienceGenerateService {
  return new AudienceGenerateService(
    new GeminiAudienceBlueprintProvider(),
    new AudiencePreviewService(),
    new AudienceEconomicsService(),
    new AudienceRoiForecastService(),
    new AudienceStrategyService(),
  );
}

export function getAudienceGenerateService(): AudienceGenerateService {
  if (!audienceGenerateService) {
    audienceGenerateService = createAudienceGenerateService();
  }
  return audienceGenerateService;
}

export function setAudienceGenerateService(service: AudienceGenerateService): void {
  audienceGenerateService = service;
}

export function resetAudienceGenerateService(): void {
  audienceGenerateService = null;
}
