import {
  AllocationItem,
  HoldingSnapshot,
  HoldingValuation,
  PortfolioDashboard,
  PortfolioSnapshot
} from "@/domain/portfolio/types";
import { concentrationRatio } from "@/application/services/risk/riskMath";
import { CorrelationService } from "@/application/services/risk/CorrelationService";
import { DiversificationService } from "@/application/services/risk/DiversificationService";
import { DrawdownService } from "@/application/services/risk/DrawdownService";
import { VolatilityService } from "@/application/services/risk/VolatilityService";

export type RiskAnalyticsReport = ReturnType<RiskAnalyticsService["calculateRiskAnalytics"]>;

function groupExposure(
  valuations: HoldingValuation[],
  totalValue: number,
  labelFor: (valuation: HoldingValuation) => string | null | undefined
): AllocationItem[] {
  const grouped = new Map<string, number>();
  for (const valuation of valuations) {
    const label = labelFor(valuation)?.trim() || "Unclassified";
    grouped.set(label, (grouped.get(label) ?? 0) + valuation.value);
  }
  return Array.from(grouped.entries())
    .map(([label, value]) => ({
      label,
      value,
      percent: totalValue === 0 ? 0 : value / totalValue
    }))
    .sort((a, b) => b.value - a.value);
}

function themeExposure(valuations: HoldingValuation[], totalValue: number): AllocationItem[] {
  const grouped = new Map<string, number>();
  for (const valuation of valuations) {
    const metadataTags = [
      valuation.holding.sector,
      valuation.holding.assetType === "crypto" ? "crypto" : null,
      valuation.holding.assetType === "gold_etf" ? "gold" : null,
      valuation.holding.assetType === "bond_etf" ? "fixed-income" : null
    ].filter((tag): tag is string => Boolean(tag));
    for (const tag of metadataTags) {
      grouped.set(tag, (grouped.get(tag) ?? 0) + valuation.value);
    }
  }
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value, percent: totalValue === 0 ? 0 : value / totalValue }))
    .sort((a, b) => b.value - a.value);
}

export class RiskAnalyticsService {
  constructor(
    private readonly volatilityService = new VolatilityService(),
    private readonly drawdownService = new DrawdownService(),
    private readonly correlationService = new CorrelationService(),
    private readonly diversificationService = new DiversificationService()
  ) {}

  calculateRiskAnalytics(input: {
    dashboard: PortfolioDashboard;
    portfolioSnapshots: PortfolioSnapshot[];
    holdingSnapshots: HoldingSnapshot[];
  }) {
    const { dashboard } = input;
    const investedValuations = dashboard.holdingValuations.filter((valuation) => valuation.value > 0);
    const totalHoldingsValue = investedValuations.reduce((sum, valuation) => sum + valuation.value, 0);
    const holdingValues = investedValuations.map((valuation) => valuation.value);
    const topHoldingConcentration = concentrationRatio(holdingValues, 1);
    const topFiveConcentration = concentrationRatio(holdingValues, 5);
    const holdingsById = new Map(investedValuations.map((valuation) => [valuation.holding.id, valuation.holding.ticker ?? valuation.holding.assetName]));
    const assetClassByHoldingId = new Map(investedValuations.map((valuation) => [valuation.holding.id, valuation.holding.assetType]));
    const correlations = this.correlationService.calculateHoldingCorrelations({
      holdingSnapshots: input.holdingSnapshots,
      labelsByHoldingId: holdingsById
    });
    const assetClassCorrelations = this.correlationService.calculateGroupedCorrelations({
      holdingSnapshots: input.holdingSnapshots,
      groupByHoldingId: assetClassByHoldingId
    });
    const diversification = this.diversificationService.score({
      meaningfulHoldings: investedValuations.filter((valuation) => totalHoldingsValue > 0 && valuation.value / totalHoldingsValue >= 0.01).length,
      assetClasses: dashboard.allocationByType,
      sectors: dashboard.allocationBySector,
      currencies: dashboard.currencyExposure,
      averageCorrelation: correlations.averageCorrelation,
      topHoldingConcentration,
      topFiveConcentration
    });
    const volatility = this.volatilityService.calculatePortfolioVolatility(input.portfolioSnapshots);
    const drawdown = this.drawdownService.calculatePortfolioDrawdown(input.portfolioSnapshots);
    const benchmarkDrawdowns = this.drawdownService.calculateBenchmarkDrawdown(dashboard.benchmarkComparisons);

    const concentration = {
      topHoldingConcentration,
      topFiveConcentration,
      byAssetClass: dashboard.allocationByType,
      bySector: dashboard.allocationBySector,
      byGeography: dashboard.allocationByGeography,
      byCurrency: dashboard.currencyExposure,
      byTheme: themeExposure(investedValuations, totalHoldingsValue)
    };

    const riskContributors = investedValuations
      .map((valuation) => {
        const allocation = totalHoldingsValue === 0 ? 0 : valuation.value / totalHoldingsValue;
        const proxyRisk =
          valuation.holding.assetType === "crypto" ? 1.8 :
          valuation.holding.assetType === "stock" ? 1.25 :
          valuation.holding.assetType === "gold_etf" ? 1.05 :
          valuation.holding.assetType === "bond_etf" ? 0.55 :
          1;
        const riskShare = allocation * proxyRisk;
        return {
          label: valuation.holding.ticker ?? valuation.holding.assetName,
          allocation,
          riskShare,
          assetClass: valuation.holding.assetType
        };
      })
      .sort((a, b) => b.riskShare - a.riskShare);
    const riskTotal = riskContributors.reduce((sum, item) => sum + item.riskShare, 0);

    const warnings = [
      topHoldingConcentration > 0.25 ? "Top holding exceeds 25% of invested assets." : null,
      topFiveConcentration > 0.65 ? "Top five holdings exceed 65% of invested assets." : null,
      correlations.highCorrelationPairs.length > 0 ? "Some holdings are highly correlated and may not diversify each other." : null,
      input.portfolioSnapshots.length < 30 ? "Portfolio has fewer than 30 snapshots, so volatility and drawdown are preliminary." : null,
      dashboard.cashPercent > 0.5 ? "Cash is more than half of portfolio value." : null
    ].filter((warning): warning is string => Boolean(warning));

    return {
      asOfDate: input.portfolioSnapshots.at(-1)?.snapshotDate ?? new Date().toISOString().slice(0, 10),
      volatility,
      drawdown,
      benchmarkDrawdowns,
      concentration,
      correlations,
      assetClassCorrelations,
      riskContributors: riskContributors.map((item) => ({
        ...item,
        riskContribution: riskTotal === 0 ? 0 : item.riskShare / riskTotal
      })),
      riskByAssetClass: groupExposure(investedValuations, totalHoldingsValue, (valuation) => valuation.holding.assetType),
      diversification,
      warnings
    };
  }
}
