import {
  AllocationItem,
  BenchmarkSnapshot,
  DailyPrice,
  HoldingSnapshot,
  HoldingValuation,
  PortfolioDashboard,
  PortfolioSnapshot
} from "@/domain/portfolio/types";
import { calculateReturns, concentrationRatio, covarianceRiskContributions, syntheticPortfolioDrawdown } from "@/application/services/risk/riskMath";
import { CorrelationService } from "@/application/services/risk/CorrelationService";
import { DiversificationService } from "@/application/services/risk/DiversificationService";
import { DrawdownService } from "@/application/services/risk/DrawdownService";
import { VolatilityService } from "@/application/services/risk/VolatilityService";

export type RiskAnalyticsReport = ReturnType<RiskAnalyticsService["calculateRiskAnalytics"]>;

function themeExposure(valuations: HoldingValuation[], totalValue: number): AllocationItem[] {
  const grouped = new Map<string, number>();
  const themeLabel = (value: string) => {
    const normalized = value.trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
    const labels: Record<string, string> = {
      "fixed-income": "Fixed income",
      crypto: "Crypto",
      gold: "Gold"
    };
    return labels[normalized] ?? value.trim();
  };

  for (const valuation of valuations) {
    const metadataTags = [
      valuation.holding.sector,
      valuation.holding.assetType === "crypto" ? "crypto" : null,
      valuation.holding.assetType === "gold_etf" ? "gold" : null,
      valuation.holding.assetType === "bond_etf" ? "fixed-income" : null
    ].filter((tag): tag is string => Boolean(tag));
    for (const tag of metadataTags) {
      const label = themeLabel(tag);
      grouped.set(label, (grouped.get(label) ?? 0) + valuation.value);
    }
  }
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value, percent: totalValue === 0 ? 0 : value / totalValue }))
    .sort((a, b) => b.value - a.value);
}

function returnsByAssetId(dailyPrices: DailyPrice[]) {
  const pricesByAsset = new Map<string, Map<string, number>>();
  for (const price of dailyPrices) {
    if (!Number.isFinite(price.closePrice) || price.closePrice <= 0) continue;
    const pricesByDate = pricesByAsset.get(price.assetId) ?? new Map<string, number>();
    pricesByDate.set(price.priceDate, price.closePrice);
    pricesByAsset.set(price.assetId, pricesByDate);
  }

  const returns = new Map<string, Map<string, number>>();
  for (const [assetId, pricesByDate] of pricesByAsset.entries()) {
    const series = Array.from(pricesByDate.entries()).map(([date, value]) => ({ date, value }));
    returns.set(assetId, new Map(calculateReturns(series).map((point) => [point.date, point.value])));
  }
  return returns;
}

function proxyRiskContributors(valuations: HoldingValuation[], totalHoldingsValue: number) {
  const contributors = valuations
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
        id: valuation.holding.id,
        label: valuation.holding.ticker ?? valuation.holding.assetName,
        allocation,
        riskShare,
        riskContribution: 0,
        marginalContribution: null,
        absoluteContribution: null,
        annualizedVolatility: null,
        assetClass: valuation.holding.assetType,
        isCovarianceEligible: false
      };
    })
    .sort((a, b) => b.riskShare - a.riskShare);
  const riskTotal = contributors.reduce((sum, item) => sum + item.riskShare, 0);
  return contributors.map((item) => ({
    ...item,
    riskContribution: riskTotal === 0 ? 0 : item.riskShare / riskTotal
  }));
}

function groupRiskContributionByAssetClass(
  contributors: Array<{ assetClass: string; riskContribution: number }>
): AllocationItem[] {
  const grouped = new Map<string, number>();
  for (const contributor of contributors) {
    grouped.set(contributor.assetClass, (grouped.get(contributor.assetClass) ?? 0) + contributor.riskContribution);
  }
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value, percent: value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
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
    dailyPrices: DailyPrice[];
    benchmarkSnapshots?: BenchmarkSnapshot[];
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
    const benchmarkDrawdowns = this.drawdownService.calculateBenchmarkDrawdown(
      dashboard.benchmarkComparisons,
      input.benchmarkSnapshots,
      drawdown.maxDrawdown
    );

    const concentration = {
      topHoldingConcentration,
      topFiveConcentration,
      byAssetClass: dashboard.allocationByType,
      bySector: dashboard.allocationBySector,
      byGeography: dashboard.allocationByGeography,
      byCurrency: dashboard.currencyExposure,
      byTheme: themeExposure(investedValuations, totalHoldingsValue)
    };

    const assetReturns = returnsByAssetId(input.dailyPrices);
    const covarianceInput = investedValuations.map((valuation) => ({
      id: valuation.holding.id,
      label: valuation.holding.ticker ?? valuation.holding.assetName,
      assetClass: valuation.holding.assetType,
      weight: totalHoldingsValue === 0 ? 0 : valuation.value / totalHoldingsValue,
      returnsByDate: assetReturns.get(valuation.holding.assetId) ?? new Map<string, number>()
    }));
    const covarianceRisk = covarianceRiskContributions({ assets: covarianceInput, minimumObservations: 30 });
    const estimatedDrawdown = syntheticPortfolioDrawdown({
      assets: covarianceInput,
      minimumObservations: 30
    });
    const covarianceCoverage = covarianceRisk?.coverage ?? 0;
    const useCovariance = Boolean(covarianceRisk && covarianceCoverage >= 0.7);
    const proxyContributors = proxyRiskContributors(investedValuations, totalHoldingsValue);
    const covarianceById = new Map(covarianceRisk?.contributions.map((contribution) => [contribution.id, contribution]) ?? []);
    const riskContributors = useCovariance
      ? proxyContributors
          .map((proxy) => {
            const covarianceContribution = covarianceById.get(proxy.id);
            if (!covarianceContribution) return proxy;
            return {
              ...proxy,
              allocation: covarianceContribution.allocation,
              riskShare: covarianceContribution.absoluteContribution,
              riskContribution: covarianceContribution.riskContribution,
              marginalContribution: covarianceContribution.marginalContribution,
              absoluteContribution: covarianceContribution.absoluteContribution,
              annualizedVolatility: covarianceContribution.annualizedVolatility,
              isCovarianceEligible: true
            };
          })
          .sort((a, b) => b.riskContribution - a.riskContribution)
      : proxyContributors;

    const warnings = [
      topHoldingConcentration > 0.25 ? "Top holding exceeds 25% of invested assets." : null,
      topFiveConcentration > 0.65 ? "Top five holdings exceed 65% of invested assets." : null,
      correlations.highCorrelationPairs.length > 0 ? "Some holdings are highly correlated and may not diversify each other." : null,
      input.portfolioSnapshots.length < 30 ? "Portfolio has fewer than 30 snapshots, so volatility and drawdown are preliminary." : null,
      dashboard.cashPercent > 0.5 ? "Cash is more than half of portfolio value." : null,
      !useCovariance ? "Volatility contribution is using proxy estimates until enough overlapping daily price history exists." : null
    ].filter((warning): warning is string => Boolean(warning));

    return {
      asOfDate: input.portfolioSnapshots.at(-1)?.snapshotDate ?? new Date().toISOString().slice(0, 10),
      volatility,
      drawdown,
      benchmarkDrawdowns,
      concentration,
      correlations,
      assetClassCorrelations,
      riskContributionMethod: useCovariance ? "covariance" as const : "proxy" as const,
      riskContributionObservationCount: covarianceRisk?.observationCount ?? 0,
      riskContributionCoverage: covarianceCoverage,
      riskContributionVolatility: covarianceRisk?.portfolioVolatility ?? null,
      riskContributionDateRange: covarianceRisk ? { startDate: covarianceRisk.startDate, endDate: covarianceRisk.endDate } : null,
      estimatedDrawdown,
      riskContributors,
      riskByAssetClass: groupRiskContributionByAssetClass(riskContributors),
      diversification,
      warnings
    };
  }
}
