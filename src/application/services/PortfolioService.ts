import { MarketDataRepository } from "@/application/ports/repositories/MarketDataRepository";
import { PortfolioRepository } from "@/application/ports/repositories/PortfolioRepository";
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
    private readonly marketDataRepository?: MarketDataRepository
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
    const [cashBalances, holdings] = await Promise.all([
      this.repository.listCashBalances(portfolioId),
      this.repository.listHoldings(portfolioId)
    ]);

    const totalCash = cashBalances.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalHoldingsCost = holdings.reduce((sum, item) => sum + Number(item.quantity) * Number(item.averageCost ?? 0), 0);
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
    const totalHoldingsMarketValue = holdingValuations.reduce((sum, item) => sum + item.value, 0);
    const totalValueEstimate = totalCash + totalHoldingsMarketValue;
    const investedAmount = totalHoldingsCost;
    const unrealizedGainLoss = totalHoldingsMarketValue - investedAmount;
    const unrealizedGainLossPercent = investedAmount === 0 ? 0 : unrealizedGainLoss / investedAmount;
    const byType = new Map<string, number>();
    const byCurrency = new Map<string, number>();

    for (const valuation of holdingValuations) {
      byType.set(valuation.holding.assetType, (byType.get(valuation.holding.assetType) ?? 0) + valuation.value);
      byCurrency.set(valuation.valueCurrency, (byCurrency.get(valuation.valueCurrency) ?? 0) + valuation.value);
    }

    for (const cash of cashBalances) {
      byCurrency.set(cash.currency, (byCurrency.get(cash.currency) ?? 0) + Number(cash.amount));
    }

    if (totalCash !== 0) byType.set("cash", (byType.get("cash") ?? 0) + totalCash);

    const allocationByType = Array.from(byType.entries()).map(([label, value]) => ({
      label,
      value,
      percent: totalValueEstimate === 0 ? 0 : value / totalValueEstimate
    }));
    const currencyExposure = Array.from(byCurrency.entries()).map(([currency, value]) => ({
      currency,
      value,
      percent: totalValueEstimate === 0 ? 0 : value / totalValueEstimate
    }));
    const gainLossRows = holdingValuations
      .map((valuation) => {
        const costBasis = Number(valuation.holding.quantity) * Number(valuation.holding.averageCost ?? 0);
        const gainLoss = valuation.value - costBasis;
        return {
          valuation,
          gainLoss,
          gainLossPercent: costBasis === 0 ? 0 : gainLoss / costBasis
        };
      })
      .filter((row) => row.valuation.valuationSource === "market_price");
    const topWinners = [...gainLossRows]
      .filter((row) => row.gainLoss > 0)
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);
    const topLosers = [...gainLossRows]
      .filter((row) => row.gainLoss < 0)
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 5);

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
      totalCash,
      totalHoldingsCost,
      totalHoldingsMarketValue,
      totalValueEstimate,
      investedAmount,
      unrealizedGainLoss,
      unrealizedGainLossPercent,
      allocationByType,
      currencyExposure,
      topWinners,
      topLosers,
      cashPercent: totalValueEstimate === 0 ? 0 : totalCash / totalValueEstimate,
      investedPercent: totalValueEstimate === 0 ? 0 : totalHoldingsMarketValue / totalValueEstimate,
      latestPriceDate: Array.from(latestPrices.values())[0]?.priceDate ?? null
    };
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
