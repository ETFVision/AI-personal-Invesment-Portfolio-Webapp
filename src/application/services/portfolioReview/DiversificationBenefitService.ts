import type { PortfolioImprovementIssueCategory } from "@/domain/portfolioReview/types";

export type DiversificationBenefitContext = {
  roleLabel: string;
  issueCategory: PortfolioImprovementIssueCategory;
  issueFitScore: number;
  dominantSector: string | null;
  dominantSectorWeight: number;
  candidateSector: string | null;
  technologyWeight: number;
  healthcareWeight: number;
  usExposure: number;
  internationalExposure: number;
  bondAllocation: number;
  goldAllocation: number;
  heldSymbols: Set<string>;
  symbol: string;
};

export type DiversificationBenefitResult = {
  score: number;
  overlapPenalty: number;
  primaryReason: string;
  secondaryBenefit: string;
  overlapWarning: string | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hasAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export class DiversificationBenefitService {
  evaluate(input: DiversificationBenefitContext): DiversificationBenefitResult {
    const role = input.roleLabel.toLowerCase();
    const sector = input.candidateSector?.toLowerCase() ?? "";
    const issueFit = clamp(input.issueFitScore);
    let score = 18 + issueFit * 0.35;
    let gapScore = 0;
    let concentrationScore = 0;
    let correlationScore = 0;
    let overlapPenalty = 0;
    let primaryReason = `${input.symbol} addresses ${input.issueCategory.replaceAll("_", " ")} with ${input.roleLabel.toLowerCase()}.`;
    let secondaryBenefit = "Adds a differentiated exposure driver if portfolio overlap is acceptable.";

    if (hasAny(role, ["international equity", "developed international", "emerging-market", "global equity"])) {
      gapScore += clampRange((input.usExposure - 0.55) * 120, 0, 24);
      if (input.internationalExposure < 0.4) gapScore += 10;
      correlationScore += 7;
      primaryReason = `${input.symbol} adds non-US equity exposure where US look-through exposure is ${pct(input.usExposure)}.`;
      secondaryBenefit = "Reduces reliance on US market leadership and adds regional/currency diversification.";
      if (hasAny(role, ["global equity"])) overlapPenalty += 8;
    }

    if (hasAny(role, ["healthcare defensive"])) {
      gapScore += clampRange((0.12 - input.healthcareWeight) * 260, 0, 28);
      if (input.technologyWeight > 0.25) concentrationScore += 16;
      correlationScore += 8;
      primaryReason = `${input.symbol} adds Healthcare exposure where Healthcare is ${pct(input.healthcareWeight)} versus Technology at ${pct(input.technologyWeight)}.`;
      secondaryBenefit = "Adds defensive earnings drivers from pharma, services, devices and care delivery.";
    }

    if (hasAny(role, ["defensive utilities", "defensive consumer staples"])) {
      gapScore += input.technologyWeight > 0.25 ? 15 : 8;
      concentrationScore += input.dominantSectorWeight > 0.25 ? 12 : 5;
      correlationScore += 8;
      primaryReason = `${input.symbol} adds defensive sector exposure while ${input.dominantSector ?? "the largest sector"} is ${pct(input.dominantSectorWeight)}.`;
      secondaryBenefit = hasAny(role, ["utilities"])
        ? "Adds regulated demand exposure that can behave differently from growth equities."
        : "Adds essential-consumption exposure that can be more resilient in slower growth.";
    }

    if (hasAny(role, ["bond", "treasury", "fixed income", "credit"])) {
      gapScore += clampRange((0.2 - input.bondAllocation) * 180, 0, 30);
      correlationScore += hasAny(role, ["high-yield"]) ? 2 : 12;
      primaryReason = `${input.symbol} adds fixed-income exposure where bond allocation is ${pct(input.bondAllocation)}.`;
      secondaryBenefit = hasAny(role, ["international fixed income"])
        ? "Diversifies rate, currency and issuer exposure beyond US-only bond ballast."
        : "Adds ballast that may reduce equity-driven portfolio volatility.";
      if (hasAny(role, ["high-yield"])) overlapPenalty += 14;
    }

    if (hasAny(role, ["gold", "inflation hedge"])) {
      gapScore += clampRange((0.06 - input.goldAllocation) * 320, 0, 28);
      correlationScore += 10;
      primaryReason = `${input.symbol} adds hedge exposure where gold allocation is ${pct(input.goldAllocation)}.`;
      secondaryBenefit = "Can improve resilience to inflation, real-rate and geopolitical shocks.";
    }

    if (input.issueCategory === "sector_concentration" || input.issueCategory === "theme_concentration" || input.issueCategory === "concentration_risk") {
      if (input.candidateSector && input.dominantSector && input.candidateSector.toLowerCase() !== input.dominantSector.toLowerCase()) {
        concentrationScore += clampRange(input.dominantSectorWeight * 45, 0, 18);
      }
      if (input.dominantSector?.toLowerCase() === "technology" && sector === "technology") {
        overlapPenalty += 65;
        primaryReason = `${input.symbol} is not a strong diversifier for this issue because Technology is already the dominant exposure.`;
        secondaryBenefit = "It may still have standalone merits, but it does not solve the current diversification gap.";
      }
    }

    if (input.heldSymbols.has(input.symbol.toUpperCase())) overlapPenalty += 12;
    if (input.candidateSector && input.dominantSector && input.candidateSector.toLowerCase() === input.dominantSector.toLowerCase()) overlapPenalty += 25;
    if (hasAny(role, ["broad-market equity", "global equity"])) overlapPenalty += 6;

    const overlapWarning =
      overlapPenalty >= 45 ? "Material overlap with the current dominant exposure; review before treating as a diversifier." :
      overlapPenalty >= 15 ? "Some overlap with existing holdings or broad-market ETF exposure." :
      null;

    score += gapScore + concentrationScore + correlationScore - overlapPenalty;
    return {
      score: clamp(score),
      overlapPenalty: clamp(overlapPenalty),
      primaryReason,
      secondaryBenefit,
      overlapWarning
    };
  }
}
