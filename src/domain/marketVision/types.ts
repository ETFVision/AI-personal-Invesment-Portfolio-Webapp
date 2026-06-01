export type MarketVisionSourceType = "manual" | "generated" | "imported";
export type MarketVisionStatus = "draft" | "published" | "archived";
export type MarketThemeClassification = "short_term_noise" | "medium_term_theme" | "structural_long_term_shift";

export type PortfolioImplications = {
  equityAllocationImplication: string;
  bondAllocationImplication: string;
  goldImplication: string;
  cryptoImplication: string;
  cashImplication: string;
  riskImplication: string;
  watchlistImplication: string;
};

export type ClassificationSummary = {
  shortTermNoise: number;
  mediumTermThemes: number;
  structuralLongTermShifts: number;
};

export type MarketVisionReport = {
  id: string;
  reportDate: string;
  reportPeriodStart: string | null;
  reportPeriodEnd: string | null;
  title: string;
  executiveSummary: string;
  globalMarketSummary: string;
  equityView: string;
  bondView: string;
  goldView: string;
  cryptoView: string;
  ratesView: string;
  inflationView: string;
  currencyView: string;
  geopoliticalRiskView: string;
  opportunities: string[];
  risks: string[];
  portfolioImplications: PortfolioImplications;
  classificationSummary: ClassificationSummary;
  sourceType: MarketVisionSourceType;
  status: MarketVisionStatus;
  createdAt: string;
  updatedAt: string;
};

export type MacroIndicatorCategory =
  | "interest_rates"
  | "inflation"
  | "yields"
  | "employment"
  | "growth"
  | "currency"
  | "commodities"
  | "liquidity";

export type MacroIndicator = {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  sourceProvider: string;
  latestValue: number | null;
  previousValue: number | null;
  changeValue: number | null;
  changePercent: number | null;
  observationDate: string | null;
  category: MacroIndicatorCategory;
  unit: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MarketThemeEvent = {
  id: string;
  reportId: string;
  title: string;
  description: string;
  themeCategory: string;
  affectedAssetClasses: string[];
  affectedSectors: string[];
  affectedThemes: string[];
  severityScore: number;
  persistenceScore: number;
  confidenceScore: number;
  classification: MarketThemeClassification;
  createdAt: string;
  updatedAt: string;
};

export type MarketVisionDashboard = {
  latestPublishedReport: MarketVisionReport | null;
  selectedReport: MarketVisionReport | null;
  reports: MarketVisionReport[];
  macroIndicators: MacroIndicator[];
  themeEvents: MarketThemeEvent[];
};
