import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { BondAnalyticsService } from "./BondAnalyticsService";

export class BondService {
  constructor(
    private readonly universeRepository: UniverseRepository,
    private readonly bondAnalyticsService = new BondAnalyticsService()
  ) {}

  async getPortfolioBondAnalytics(dashboard: PortfolioDashboard) {
    const [instruments, bondProfiles] = await Promise.all([
      this.universeRepository.listInstruments({ isActive: true }),
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
