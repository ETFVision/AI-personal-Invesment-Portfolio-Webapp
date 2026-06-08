import type { MarketVisionMetadata, PortfolioImplications } from "@/domain/marketVision/types";

export type AiMarketVisionInput = {
  periodStart: string;
  periodEnd: string;
  context: Record<string, unknown>;
};

export type AiMarketVisionOutput = {
  title: string;
  executiveSummary: string;
  globalMarketSummary: string;
  topEmergingThemes: string[];
  persistentThemes: string[];
  structuralThemes: string[];
  equityOutlook: string;
  bondOutlook: string;
  goldOutlook: string;
  cryptoOutlook: string;
  ratesOutlook: string;
  inflationOutlook: string;
  growthOutlook: string;
  employmentOutlook: string;
  currencyOutlook: string;
  geopoliticalOutlook: string;
  keyRisks: string[];
  keyOpportunities: string[];
  portfolioImplications: PortfolioImplications;
  marketVisionMetadata: MarketVisionMetadata;
  confidenceScore: number;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: number | null;
};

export interface AiMarketVisionProvider {
  generateWeeklyBriefing(input: AiMarketVisionInput): Promise<AiMarketVisionOutput>;
}
