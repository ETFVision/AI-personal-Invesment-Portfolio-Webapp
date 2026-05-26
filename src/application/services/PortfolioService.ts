import { PortfolioRepository } from "@/application/ports/repositories/PortfolioRepository";
import { PortfolioDashboard } from "@/domain/portfolio/types";
import {
  CashBalanceInput,
  HoldingInput,
  SetupPortfolioInput,
  TransactionInput
} from "@/domain/portfolio/validation";

export class PortfolioService {
  constructor(private readonly repository: PortfolioRepository) {}

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
    const totalValueEstimate = totalCash + totalHoldingsCost;
    const byType = new Map<string, number>();

    for (const holding of holdings) {
      const value = Number(holding.quantity) * Number(holding.averageCost ?? 0);
      byType.set(holding.assetType, (byType.get(holding.assetType) ?? 0) + value);
    }

    if (totalCash !== 0) byType.set("cash", (byType.get("cash") ?? 0) + totalCash);

    const allocationByType = Array.from(byType.entries()).map(([label, value]) => ({
      label,
      value,
      percent: totalValueEstimate === 0 ? 0 : value / totalValueEstimate
    }));

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
      totalCash,
      totalHoldingsCost,
      totalValueEstimate,
      allocationByType
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
