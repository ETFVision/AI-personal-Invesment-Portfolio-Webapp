import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { Instrument } from "@/domain/universe/types";

export type PortfolioFitResult = {
  score: number | null;
  concentrationPercent: number | null;
  duplicateExposure: boolean;
  positiveDrivers: string[];
  negativeDrivers: string[];
  dataLimitations: string[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export class PortfolioFitService {
  assess(instrument: Instrument, dashboard: PortfolioDashboard | null): PortfolioFitResult {
    if (!dashboard || dashboard.totalValueEstimate <= 0) {
      return {
        score: null,
        concentrationPercent: null,
        duplicateExposure: false,
        positiveDrivers: [],
        negativeDrivers: [],
        dataLimitations: ["Portfolio fit unavailable without an active portfolio dashboard"]
      };
    }

    const symbol = normalize(instrument.symbol);
    const matchingValuations = dashboard.holdingValuations.filter((valuation) => normalize(valuation.holding.ticker) === symbol);
    const directValue = matchingValuations.reduce((sum, valuation) => sum + valuation.value, 0);
    const concentrationPercent = directValue / dashboard.totalValueEstimate;
    const sector = instrument.canonicalSector ?? instrument.sector;
    const sectorAllocation = sector ? dashboard.allocationBySector.find((item) => item.label.toLowerCase() === sector.toLowerCase())?.percent ?? 0 : 0;
    const duplicateExposure = matchingValuations.length > 0 || sectorAllocation > 0.35;

    let score = 65;
    const positiveDrivers: string[] = [];
    const negativeDrivers: string[] = [];
    if (directValue === 0) {
      score += 10;
      positiveDrivers.push("Adds a new portfolio sleeve");
    }
    if (sectorAllocation < 0.15 && sector) {
      score += 5;
      positiveDrivers.push(`Improves ${sector} diversification`);
    }
    if (sectorAllocation > 0.35) {
      score -= 25;
      negativeDrivers.push(`${sector} exposure is already elevated`);
    }
    if (concentrationPercent > 0.15) {
      score -= 20;
      negativeDrivers.push("Existing position is already meaningful in the portfolio");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      concentrationPercent,
      duplicateExposure,
      positiveDrivers,
      negativeDrivers,
      dataLimitations: []
    };
  }
}
