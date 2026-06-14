import type { AudienceBlueprint, BlueprintProviderResult } from "../types/audience-blueprint.types";

export interface AudienceBlueprintProvider {
  generateBlueprint(goal: string): Promise<BlueprintProviderResult>;
}
