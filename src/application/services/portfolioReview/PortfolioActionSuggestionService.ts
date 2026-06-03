import type { PortfolioPotentialAction } from "@/domain/portfolioReview/types";
import type { PortfolioImprovementSuggestion } from "@/domain/portfolioReview/types";

export class PortfolioActionSuggestionService {
  build(suggestions: PortfolioImprovementSuggestion[]): PortfolioPotentialAction[] {
    return suggestions.slice(0, 6).map((suggestion) => ({
      actionType:
        suggestion.category === "data_quality" ? "data_check" :
        suggestion.category === "risk" ? "risk_check" :
        suggestion.category === "diversification" ? "diversify" :
        "review",
      title: suggestion.title,
      detail: suggestion.rationale,
      candidateInstruments: suggestion.candidateInstruments
    }));
  }
}
