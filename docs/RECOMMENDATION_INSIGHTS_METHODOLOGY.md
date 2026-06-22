# Recommendation Insights Methodology

Last updated: 2026-06-21

## Purpose

The recommendation engine is deterministic. It uses stored data, rules, weighted scores, and guardrails. OpenAI is not used to decide recommendation labels.

Public surfaces should describe these outputs as Insights, Characteristics Scores, assessment labels, analytical classifications, or guardrail classifications. The underlying recommendation service and database names remain for compatibility, but consumer-facing pages should not present the outputs as investment recommendations.

## Main Code Paths

- `src/application/services/recommendations/RecommendationService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/RecommendationRulesService.ts`
- Type-specific services: stock, ETF, bond ETF, gold, crypto.
- Presentation mapping: `recommendationPresentation.ts`

`src/application/services/recommendations/portfolioFitService.ts` remains in the codebase as a standalone diagnostic service and for direct tests. It is not called by the stored recommendation scoring pipeline.

## Score Components

Recommendation inputs can include:

- Business Quality score.
- Trend score.
- Valuation score.
- Risk analytics score.
- Theme alignment score.
- Macro fit score.
- Market Vision alignment score.
- Bond profile where applicable.
- Market metrics and risk metrics.

Available components are weighted by instrument type. Missing components reduce confidence and may create data limitations. Current stored recommendation scores are universal instrument Characteristics Scores and do not include portfolio fit, allocation fit, duplicate exposure, concentration, or any other user-portfolio-dependent component.

Formula-level component weights by instrument type are documented in [Score Methodology](SCORE_METHODOLOGY.md).

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

User-facing language maps these internal labels to neutral assessment labels:

| Internal label | User-facing assessment label |
|---|---|
| Strong Buy | Excellent |
| Buy | Good |
| Hold | Neutral |
| Watch | Weak |
| Reduce | Poor |
| Sell | Significant Concerns |
| Insufficient Data | Insufficient Data |
| Not Applicable | Not Applicable |

User-facing pages should avoid direct investment-instruction wording. Internal labels remain in services, database rows, telemetry, and history for compatibility.

## Guardrails

Guardrails can cap labels:

- Confidence below 50 -> `Insufficient Data`.
- Weak fundamentals below 35 -> cap at `Watch`.
- Poor valuation below 25 -> cap at `Watch`, or `Hold` if fundamentals are at least 70.
- Risk score above 75 -> cap at `Watch` unless already lower.
- Bond duration/rate regime mismatch -> cap at `Hold`.

The guardrail service still accepts optional concentration and duplicate-exposure inputs for backward compatibility and direct tests. The current stored recommendation scoring pipeline no longer supplies those portfolio-dependent fields.

## Market Vision Alignment

Market Vision alignment is a deterministic text/theme overlap score using the latest Market Vision report. It starts around neutral and adjusts for sector/theme mentions, supportive or caution language, and asset-class-specific macro terms.

## Portfolio Fit

Portfolio fit is retained as a standalone diagnostic service outside the stored recommendation scoring pipeline. It checks concentration and duplicate/overlapping exposure and should use ETF look-through exposure where possible so broad-market ETFs are not treated only by product category.

Portfolio fit is no longer included in recommendation score weights, stored recommendation input snapshots, positive or negative drivers, data limitations, or guardrails for scheduled recommendation runs. Portfolio-dependent analysis belongs in Portfolio Review scores, gap analysis, and exposure diagnostics.

After Security Master Phase 4C/4D, portfolio fit should prefer issuer-level look-through exposure where available:

1. Use issuer-level `portfolio_lookthrough_holdings` / `portfolio_lookthrough_exposures` to detect duplicate company exposure across direct holdings and ETFs.
2. Fall back to security-level exposure when issuer links are unavailable.
3. Fall back to direct ticker/product exposure only when look-through identity data is unavailable.

This matters for cases like:

- Direct `MSFT` plus Microsoft exposure through `VOO`, `QQQ`, and `VT`.
- `GOOG` and `GOOGL` rolling up under `Alphabet Inc`.
- Broad ETF candidates being evaluated against existing underlying exposure rather than only ETF product category.

## Public Methodology And Disclaimers

The `/methodology` page presents Characteristics Score and Portfolio Score methodology in public-friendly language while preserving formula-level detail behind closed-by-default accordions. The page should not expose internal labels as recommendations.

The root layout includes a persistent disclaimer footer and the first-login disclaimer modal captures acknowledgement using `etfvision_disclaimer_v1`. Export/report disclaimer text is centralized in the compliance helper so generated outputs can repeat the informational-only framing.

## Recommendation History

Recommendation outputs and telemetry snapshots are stored for history/evaluation.

Primary tables:

- `instrument_recommendations`
- `recommendation_history`
- `telemetry_recommendation_snapshots`

Security Master Phase 5 adds optional `security_id` and `issuer_id` to the recommendation and telemetry recommendation snapshot layers. Historical `symbol` remains stored for audit. Stable IDs reduce future history fragmentation after ticker, share-class, or issuer mapping changes.

Important boundary:

- Phase 5 identity propagation does not change recommendation labels, component scores, guardrails, or calibration.
- Database triggers populate identity fields on future writes from `instrument_id` / `symbol`.
- Old rows can remain partially unmapped if the original historical instrument no longer has a canonical security or issuer link.

## Current Limitations

- The engine is conservative by design.
- Strong Buy can be rare because guardrails and valuation/risk caps can prevent top labels.
- Calibration should be done through diagnostics before weight changes.
- AI assistant explanations must frame outputs as ETFVision analytical classifications, not personal investment advice.
