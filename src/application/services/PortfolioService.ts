import { AnalyticsRepository } from "@/application/ports/repositories/AnalyticsRepository";
import { MarketDataRepository } from "@/application/ports/repositories/MarketDataRepository";
import { PortfolioRepository } from "@/application/ports/repositories/PortfolioRepository";
import { AnalyticsService } from "@/application/services/AnalyticsService";
import { PortfolioDashboard } from "@/domain/portfolio/types";
import {
  CashBalanceInput,
  HoldingInput,
  SetupPortfolioInput,
  TransactionInput
} from "@/domain/portfolio/validation";

export class PortfolioService {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly marketDataRepository?: MarketDataRepository,
    private readonly analyticsRepository?: AnalyticsRepository,
    private readonly analyticsService?: AnalyticsService
  ) {}

  async ensureApplicationUser(authUser: { id: string; email: string | null }) {
    return this.repository.ensureUser({
      authProvider: "supabase",
      authProviderUserId: authUser.id,
      email: authUser.email
    });
  }

  async getOrCreateDefaultPortfolio(authUser: { id: string; email: string | null }) {
    const user = await this.ensureApplicationUser(authUser);
    const existing = await this.repository.getDefaultPortfolio(user.id);
    return { user, portfolio: existing };
  }

  async setupPortfolio(authUser: { id: string; email: string | null }, input: SetupPortfolioInput) {
    const user = await this.ensureApplicationUser(authUser);
    await this.repository.updateUserProfile(user.id, {
      baseCurrency: input.baseCurrency,
      riskProfile: input.riskProfile
    });
    return this.repository.createPortfolio(user.id, input);
  }

  async updatePortfolioSetup(authUser: { id: string; email: string | null }, portfolioId: string, input: SetupPortfolioInput) {
    const user = await this.ensureApplicationUser(authUser);
    await this.repository.updateUserProfile(user.id, {
      baseCurrency: input.baseCurrency,
      riskProfile: input.riskProfile
    });
    return this.repository.updatePortfolio(portfolioId, input);
  }

  async getDashboard(portfolioId: string): Promise<PortfolioDashboard> {
    const [cashBalances, holdings, transactions, snapshots] = await Promise.all([
      this.repository.listCashBalances(portfolioId),
      this.repository.listHoldings(portfolioId),
      this.repository.listTransactions(portfolioId),
      this.analyticsRepository?.listPortfolioSnapshots(portfolioId) ?? []
    ]);

    const latestPrices = this.marketDataRepository
      ? await this.marketDataRepository.getLatestPricesForAssets(holdings.map((holding) => holding.assetId))
      : new Map();
    const holdingValuations = holdings.map((holding) => {
      const price = latestPrices.get(holding.assetId);
      const unitPrice = price?.closePrice ?? holding.averageCost ?? null;
      const value = Number(holding.quantity) * Number(unitPrice ?? 0);
      return {
        holding,
        unitPrice,
        value,
        valueCurrency: price?.currency ?? holding.costCurrency,
        priceDate: price?.priceDate ?? null,
        priceProvider: price?.provider ?? null,
        valuationSource: price ? "market_price" as const : "cost_basis" as const
      };
    });
    const analytics = this.analyticsService?.calculateDashboardAnalytics({
      cashBalances,
      holdings,
      holdingValuations,
      transactions,
      snapshots
    });
    if (!analytics) throw new Error("Analytics service is not configured.");

    const portfolio = await this.repository.getPortfolioById(portfolioId);

    return {
      portfolio: portfolio ?? {
        id: portfolioId,
        userId: "",
        name: "Portfolio",
        baseCurrency: cashBalances[0]?.currency ?? "USD",
        isDefault: true
      },
      cashBalances,
      holdings,
      holdingValuations,
      ...analytics,
      latestPriceDate: Array.from(latestPrices.values())[0]?.priceDate ?? null
    };
  }

  async createAnalyticsSnapshot(portfolioId: string) {
    if (!this.analyticsRepository) throw new Error("Analytics repository is not configured.");
    const dashboard = await this.getDashboard(portfolioId);
    const snapshotDate = new Date().toISOString().slice(0, 10);
    await this.analyticsRepository.upsertPortfolioSnapshot({
      portfolioId,
      snapshotDate,
      totalValue: dashboard.totalValueEstimate,
      cashValue: dashboard.totalCash,
      investedValue: dashboard.totalHoldingsMarketValue,
      unrealizedGainLoss: dashboard.unrealizedGainLoss,
      realizedGainLoss: dashboard.realizedGainLoss,
      currency: dashboard.portfolio.baseCurrency,
      assetClassAllocations: dashboard.allocationByType,
      sectorAllocations: dashboard.allocationBySector,
      geographyAllocations: dashboard.allocationByGeography,
      currencyAllocations: dashboard.currencyExposure
    });
    await this.analyticsRepository.upsertAssetSnapshots({
      portfolioId,
      snapshotDate,
      valuations: dashboard.holdingValuations
    });
  }

  upsertCashBalance(input: CashBalanceInput) {
    return this.repository.upsertCashBalance(input);
  }

  deleteCashBalance(id: string, portfolioId: string) {
    return this.repository.deleteCashBalance(id, portfolioId);
  }

  upsertHolding(input: HoldingInput) {
    return this.repository.upsertHolding(input);
  }

  deleteHolding(id: string, portfolioId: string) {
    return this.repository.deleteHolding(id, portfolioId);
  }

  upsertTransaction(input: TransactionInput) {
    return this.repository.upsertTransaction(input);
  }

  deleteTransaction(id: string, portfolioId: string) {
    return this.repository.deleteTransaction(id, portfolioId);
  }
}
