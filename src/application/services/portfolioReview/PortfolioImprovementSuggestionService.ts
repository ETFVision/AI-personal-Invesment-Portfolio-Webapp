import type { PortfolioImprovementSuggestion } from "@/domain/portfolioReview/types";
import { topCandidates, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class PortfolioImprovementSuggestionService {
  build(context: PortfolioReviewInputContext): PortfolioImprovementSuggestion[] {
    const suggestions: PortfolioImprovementSuggestion[] = [];
    const bondAllocation = context.bondReport.totalBondAllocation;
    const topHolding = context.riskReport.concentration.topHoldingConcentration;
    const diversificationScore = context.riskReport.diversification.score;
    const goldAllocation = context.dashboard.allocationByType
      .filter((item) => item.label.toLowerCase().includes("gold"))
      .reduce((sum, item) => sum + item.percent, 0);

    if (bondAllocation < 0.05) {
      suggestions.push({
        category: "fixed_income",
        priority: "medium",
        title: "Review fixed-income ballast",
        rationale: "Bond ETF allocation is low relative to a portfolio that may need volatility dampening.",
        candidateInstruments: topCandidates({
          recommendations: context.recommendations,
          instruments: context.instruments,
          assetClasses: ["bond_etf", "cash_proxy"],
          reason: "Approved fixed-income or cash-like universe instrument with non-negative recommendation.",
          limit: 5
        })
      });
    }

    if (topHolding > 0.25 || diversificationScore < 55) {
      suggestions.push({
        category: "diversification",
        priority: topHolding > 0.3 ? "high" : "medium",
        title: "Review diversification candidates",
        rationale: "Concentration and diversification metrics suggest the portfolio could benefit from broader exposure review.",
        candidateInstruments: topCandidates({
          recommendations: context.recommendations,
          instruments: context.instruments,
          assetClasses: ["etf"],
          themes: ["Global Diversification", "Quality", "Dividend / Income"],
          reason: "Approved broad or quality ETF candidate with non-negative recommendation.",
          limit: 5
        })
      });
    }

    if (goldAllocation < 0.03 && context.macroRegime?.inflationRegime.toLowerCase().includes("elevated")) {
      suggestions.push({
        category: "macro_fit",
        priority: "low",
        title: "Review inflation-hedge sleeve",
        rationale: "Inflation regime is elevated and gold/commodity exposure is low.",
        candidateInstruments: topCandidates({
          recommendations: context.recommendations,
          instruments: context.instruments,
          assetClasses: ["gold_etf"],
          reason: "Approved gold ETF candidate with non-negative recommendation.",
          limit: 3
        })
      });
    }

    if (context.recommendations.length === 0) {
      suggestions.push({
        category: "data_quality",
        priority: "medium",
        title: "Run recommendations before final review",
        rationale: "Portfolio Review can run without recommendation outputs, but alignment and candidate screening are limited.",
        candidateInstruments: []
      });
    }

    return suggestions;
  }
}
