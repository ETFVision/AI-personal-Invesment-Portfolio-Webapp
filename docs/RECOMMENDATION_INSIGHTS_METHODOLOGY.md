# Recommendation Insights Methodology

Last updated: 2026-06-11 20:11:07 +08:00

## Purpose

The recommendation engine is deterministic. It uses stored data, rules, weighted scores, and guardrails. OpenAI is not used to decide recommendation labels.

## Main Code Paths

- `src/application/services/recommendations/RecommendationService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/recommendations/portfolioFitService.ts`
- Type-specific services: stock, ETF, bond ETF, gold, crypto.
- Presentation mapping: `recommendationPresentation.ts`

## Score Components

Recommendation inputs can include:

- Fundamentals score.
- Trend score.
- Valuation score.
- Risk analytics score.
- Portfolio fit score.
- Theme alignment score.
- Macro fit score.
- Market Vision alignment score.
- Bond profile where applicable.
- Market metrics and risk metrics.

Available components are weighted by instrument type. Missing components reduce confidence and may create data limitations.

## Generic Scoring Helpers

From `RecommendationRulesService.ts`:

- Weighted score = weighted average of available finite component scores.
- Score is clamped between 0 and 100.
- Confidence is based on component availability, score dispersion, signal agreement/conflict, and strategic agreement.

## Internal Labels

Internal label thresholds:

| Score | Internal label |
|---:|---|
| 85+ | Strong Buy |
| 70-84.99 | Buy |
| 50-69.99 | Hold |
| 35-49.99 | Watch |
| 20-34.99 | Reduce |
| Below 20 | Sell |
| No score | Insufficient Data |

User-facing language has been softened in presentation layers to avoid direct investment-instruction wording.

## Guardrails

Guardrails can cap labels:

- Confidence below 50 -> `Insufficient Data`.
- Weak fundamentals below 35 -> cap at `Watch`.
- Poor valuation below 25 -> cap at `Watch`, or `Hold` if fundamentals are at least 70.
- Risk score above 75 -> cap at `Watch` unless already lower.
- Portfolio concentration above 25% -> cap at `Hold`.
- Duplicate exposure -> cap at `Hold`.
- Crypto concentration above 5% -> cap at `Watch`.
- Bond duration/rate regime mismatch -> cap at `Hold`.

## Market Vision Alignment

Market Vision alignment is a deterministic text/theme overlap score using the latest Market Vision report. It starts around neutral and adjusts for sector/theme mentions, supportive or caution language, and asset-class-specific macro terms.

## Portfolio Fit

Portfolio fit checks concentration and duplicate/overlapping exposure. It should use ETF look-through exposure where possible so broad-market ETFs are not treated only by product category.

## Recommendation History

Recommendation outputs and telemetry snapshots are stored for history/evaluation. Exact table names should be checked in recommendation repository/migrations if schema-level detail is needed.

## Current Limitations

- The engine is conservative by design.
- Strong Buy can be rare because guardrails and valuation/risk caps can prevent top labels.
- Calibration should be done through diagnostics before weight changes.
- AI assistant explanations must frame outputs as ETFVision analytical classifications, not personal investment advice.
