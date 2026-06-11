# Portfolio Review Methodology

Last updated: 2026-06-11 20:11:07 +08:00

## Purpose

Portfolio Review is a deterministic portfolio-level diagnostic engine. It does not execute trades. It generates observations, section scores, improvement suggestions, and non-execution potential actions.

## Main Code Paths

- Orchestration: `src/application/services/portfolioReview/PortfolioReviewService.ts`
- Run service: `src/application/services/portfolioReview/PortfolioReviewRunService.ts`
- Scoring helpers: `src/application/services/portfolioReview/portfolioReviewScoring.ts`
- Suggestions: `PortfolioImprovementSuggestionService.ts`, `PortfolioActionSuggestionService.ts`, `DiversificationBenefitService.ts`
- Reports: `portfolio_review_runs`, `portfolio_review_reports`

## Section Weights

Current weights from `portfolioReviewScoring.ts`:

| Component | Weight |
|---|---:|
| Allocation | 15% |
| Concentration | 15% |
| Diversification | 15% |
| Risk | 15% |
| Macro fit | 15% |
| Recommendation alignment | 10% |
| Fixed income | 10% |
| Theme exposure | 5% |
| Geography | 0% |

The overall score is a weighted average of available section scores and is clamped from 0 to 100.

## Review Sections

Portfolio Review includes:

- Allocation review.
- Concentration review.
- Diversification review.
- Portfolio risk review.
- Macro fit review.
- Recommendation alignment review.
- Fixed income review.
- Theme exposure review.
- Geography review.
- Improvement suggestions.
- Potential portfolio actions.

## Exposure Inputs

Portfolio sector/geography/theme exposure should prefer ETF look-through data where available. ETF product category is not a portfolio sector allocation source.

## Candidate Suggestions

Candidates are filtered from recommendation outputs and active instruments. Suggested candidates should explain:

- What portfolio issue they address.
- Why the exposure is different.
- Diversification benefit.
- Trade-offs and overlap risk.

The candidate logic should not change recommendation labels. It uses recommendation outputs as one input into portfolio-level suggestions.

## Current Limitations

- Candidate explanations are deterministic templates and exposure-aware, but not a full optimizer.
- Geography currently has 0% score weight in the overall portfolio score.
- Exact issue-to-candidate scoring thresholds should be verified in the candidate services for any future recalibration.
