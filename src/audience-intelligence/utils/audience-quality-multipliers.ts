import type {
  AudienceEconomics,
  AudienceQualityMultipliers,
} from "../types/audience-economics.types";

const MULTIPLIER_MIN = 0.5;
const MULTIPLIER_MAX = 1.75;

function clamp(value: number, min = MULTIPLIER_MIN, max = MULTIPLIER_MAX): number {
  return Math.max(min, Math.min(max, value));
}

function safeRatio(numerator: number, denominator: number, fallback = 1): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return fallback;
  }
  return numerator / denominator;
}

function resolveRecencyDays(
  audienceDays: number | null,
  populationDays: number | null,
): number {
  if (audienceDays !== null && audienceDays >= 0) return audienceDays;
  if (populationDays !== null && populationDays >= 0) return populationDays;
  return 45;
}

export function deriveQualityMultipliers(
  audience: AudienceEconomics,
  population: AudienceEconomics,
): AudienceQualityMultipliers {
  const spendRatio = safeRatio(
    audience.averageLifetimeSpend,
    population.averageLifetimeSpend,
  );
  const orderFrequencyRatio = safeRatio(
    audience.averageOrdersPerCustomer,
    population.averageOrdersPerCustomer,
  );
  const orderValueRatio = safeRatio(
    audience.averageOrderValue,
    population.averageOrderValue,
  );

  const audienceDays = resolveRecencyDays(
    audience.averageDaysSinceLastOrder,
    population.averageDaysSinceLastOrder,
  );
  const populationDays = resolveRecencyDays(
    population.averageDaysSinceLastOrder,
    audience.averageDaysSinceLastOrder,
  );

  // Shorter recency (fewer days since last order) → stronger campaign response.
  const responseMultiplier = clamp(safeRatio(populationDays, audienceDays, 1), 0.5, 1.5);

  // Frequent, high-value buyers are more likely to convert from a click.
  const conversionMultiplier = clamp(
    orderFrequencyRatio * (0.7 + spendRatio * 0.3),
    0.55,
    1.7,
  );

  // Revenue scales with relative lifetime value and order size vs the full customer base.
  const revenueMultiplier = clamp(spendRatio * orderValueRatio, 0.6, 1.9);

  return {
    responseMultiplier,
    conversionMultiplier,
    revenueMultiplier,
  };
}

export function resolveOrderValue(
  audience: AudienceEconomics,
  population: AudienceEconomics,
  fallbackOrderValue: number,
): number {
  if (audience.averageOrderValue > 0) return audience.averageOrderValue;
  if (population.averageOrderValue > 0) return population.averageOrderValue;
  return fallbackOrderValue;
}
