import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { BondAnalyticsService } from "./BondAnalyticsService";

export class BondService {
  constructor(
    private readonly universeRepository: UniverseRepository,
    private readonly bondAnalyticsService = new BondAnalyticsService()
  ) {}

  async getPortfolioBondAnalytics(dashboard: PortfolioDashboard) {
    const bondSymbols = Array.from(
      new Set(
        dashboard.holdingValuations
          .filter((valuation) => valuation.holding.assetType === "bond_etf" && valuation.holding.ticker)
          .map((valuation) => valuation.holding.ticker!.trim().toUpperCase())
      )
    );
    const [instruments, bondProfiles] = await Promise.all([
      bondSymbols.length === 0
        ? Promise.resolve([])
        : Promise.all(
            bondSymbols.map((symbol) =>
              this.universeRepository.listDirectoryInstruments({
                isActive: true,
                query: symbol,
                limit: 5
              })
            )
          ).then((groups) => groups.flat()),
      this.universeRepository.listBondProfiles()
    ]);

    return this.bondAnalyticsService.calculateBondAnalytics({
      holdingValuations: dashboard.holdingValuations,
      instruments,
      bondProfiles,
      totalPortfolioValue: dashboard.totalValueEstimate
    });
  }
}
