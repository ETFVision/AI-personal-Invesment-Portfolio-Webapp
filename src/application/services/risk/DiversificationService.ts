import type { AllocationItem } from "@/domain/portfolio/types";
import { diversificationScore } from "./riskMath";

export class DiversificationService {
  score(input: {
    meaningfulHoldings: number;
    assetClasses: AllocationItem[];
    sectors: AllocationItem[];
    currencies: AllocationItem[];
    averageCorrelation: number | null;
  }) {
    const score = diversificationScore({
      meaningfulHoldings: input.meaningfulHoldings,
      assetClassCount: input.assetClasses.filter((item) => item.percent >= 0.05).length,
      sectorCount: input.sectors.filter((item) => item.percent >= 0.05).length,
      currencyCount: input.currencies.filter((item) => item.percent >= 0.05).length,
      averageCorrelation: input.averageCorrelation
    });

    const label = score >= 80 ? "Strong" : score >= 60 ? "Healthy" : score >= 40 ? "Moderate" : "Concentrated";
    return { score, label };
  }
}
