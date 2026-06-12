import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { Instrument } from "@/domain/universe/types";
import type { PortfolioExposureContext } from "../portfolio/PortfolioExposureContextService";

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
  assess(instrument: Instrument, dashboard: PortfolioDashboard | null, exposureContext?: PortfolioExposureContext | null): PortfolioFitResult {
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
    const directConcentrationPercent = directValue / dashboard.totalValueEstimate;
    const issuerExposure = exposureContext?.issuerExposures.find((item) => item.symbols.some((candidate) => normalize(candidate) === symbol)) ?? null;
    const concentrationPercent = Math.max(directConcentrationPercent, issuerExposure?.totalWeight ?? 0);
    const sector = instrument.canonicalSector ?? instrument.sector;
    const sectorAllocations = exposureContext?.sectorAllocation ?? dashboard.allocationBySector;
    const sectorAllocation = sector ? sectorAllocations.find((item) => item.label.toLowerCase() === sector.toLowerCase())?.percent ?? 0 : 0;
    const duplicateExposure = matchingValuations.length > 0 || (issuerExposure?.totalWeight ?? 0) > 0.05 || sectorAllocation > 0.35;

    let score = 65;
    const positiveDrivers: string[] = [];
    const negativeDrivers: string[] = [];
    if (directValue === 0 && !issuerExposure) {
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
    if ((issuerExposure?.totalWeight ?? 0) > 0 && directValue === 0) {
      negativeDrivers.push(`Existing ETF look-through exposure to ${issuerExposure?.issuerName ?? instrument.symbol} is already present`);
    }
    if (concentrationPercent > 0.15) {
      score -= 20;
      negativeDrivers.push(issuerExposure ? "Existing issuer-level exposure is already meaningful in the portfolio" : "Existing position is already meaningful in the portfolio");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      concentrationPercent,
      duplicateExposure,
      positiveDrivers,
      negativeDrivers,
      dataLimitations: exposureContext?.sectorSource === "direct_metadata"
        ? ["Portfolio fit uses direct sector metadata because ETF look-through sector exposure is unavailable."]
        : []
    };
  }
}
