import type { BusinessObjective } from "../types/audience-objective";
import type { ChannelRecommendation } from "../types/channel-recommendation.types";
import { OBJECTIVE_CHANNEL_MAPPINGS } from "../constants/channel-mappings";

export class ChannelRecommendationService {
  recommend(objective: BusinessObjective): ChannelRecommendation {
    const mapping = OBJECTIVE_CHANNEL_MAPPINGS[objective];
    return {
      channel: mapping.primary,
      confidence: mapping.confidence,
      reasoning: mapping.reasoning,
    };
  }
}
