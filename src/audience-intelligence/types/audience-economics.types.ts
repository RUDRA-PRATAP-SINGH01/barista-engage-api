export type AudienceEconomics = {
  averageLifetimeSpend: number;
  averageOrderValue: number;
  averageOrdersPerCustomer: number;
  averageDaysSinceLastOrder: number | null;
  audienceSize: number;
};

export type AudienceQualityMultipliers = {
  responseMultiplier: number;
  conversionMultiplier: number;
  revenueMultiplier: number;
};
