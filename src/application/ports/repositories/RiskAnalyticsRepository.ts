export type StoredRiskReport = {
  portfolioId: string;
  asOfDate: string;
  report: unknown;
  updatedAt: string | null;
};

export interface RiskAnalyticsRepository {
  getLatestRiskReport(portfolioId: string): Promise<StoredRiskReport | null>;
  upsertRiskReport(input: {
    portfolioId: string;
    asOfDate: string;
    report: unknown;
    source?: string;
  }): Promise<void>;
}
