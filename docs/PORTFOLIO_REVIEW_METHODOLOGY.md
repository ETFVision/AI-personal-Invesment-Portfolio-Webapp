# Portfolio Review Methodology

Last updated: 2026-06-15 20:15:00 +08:00

## Purpose

Portfolio Review is a deterministic portfolio-level diagnostic engine. It does not execute trades. It generates observations, section scores, gap findings, and explanatory diagnostics. User-facing wording should avoid action-oriented framing and should not imply personalised investment advice.

## Main Code Paths

- Orchestration: `src/application/services/portfolioReview/PortfolioReviewService.ts`
- Run service: `src/application/services/portfolioReview/PortfolioReviewRunService.ts`
- Scoring helpers: `src/application/services/portfolioReview/portfolioReviewScoring.ts`
- Gap and diversification diagnostics: `PortfolioImprovementSuggestionService.ts`, `PortfolioActionSuggestionService.ts`, `DiversificationBenefitService.ts`
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
| Insight alignment | 10% |
| Fixed income | 10% |
| Theme exposure | 5% |
| Geography | 0% |

The overall score is a weighted average of available section scores and is clamped from 0 to 100.

Formula-level section score calculations are documented in [Score Methodology](SCORE_METHODOLOGY.md).

## Review Sections

Portfolio Review includes:

- Allocation review.
- Concentration review.
- Diversification review.
- Portfolio risk review.
- Macro fit review.
- Insight alignment review.
- Fixed income review.
- Theme exposure review.
- Geography review.
- Gap analysis findings.
- Analytical gap summary.

## Exposure Inputs

Portfolio sector/geography/theme exposure should prefer ETF look-through data where available. ETF product category is not a portfolio sector allocation source.

## Security Master And Issuer Rollup Methodology

Portfolio Review now separates direct product holdings from underlying company exposure:

- **Direct Portfolio Positions** show what the portfolio directly owns: ETF wrappers, direct stocks, bond ETFs, gold ETFs, crypto ETFs, and cash-like products.
- **Top Underlying Company Exposure** shows issuer-level company exposure after ETF look-through. ETF wrappers are excluded from this chart.
- **Top Indirect Company Exposure** shows ETF-derived underlying exposure only. Direct stock exposure is excluded from the bar value, while total-with-direct can be shown in the detail text.

Identity priority for underlying concentration:

1. `holding_issuer_id` / `exposure_issuer_id` when issuer links exist.
2. `holding_security_id` / `exposure_security_id` when issuer links are unavailable.
3. Raw symbol/name fallback for older reports or unmapped holdings.

Important display rule:

- Direct holdings win the direct-position display class. If an ETF indirect row creates an issuer/security row first as `Underlying Security`, a later direct MSFT/NVDA holding must still display as `Stock`.
- Share-class variants such as `GOOG` and `GOOGL` can roll up under one issuer, such as `Alphabet Inc`, while `inputsSnapshot.securityBreakdown` preserves security-level detail.

Related files:

- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/SECURITY_MASTER_AUDIT.md`

## Gap Analysis Findings

Gap Analysis is framed as a mechanical screener, not as a suggestion or action engine. Instruments appear only when their category is underweighted in the current portfolio look-through exposure, they are in the active approved universe, and they have passed all guardrail filters.

Candidate instruments should explain:

- What portfolio issue they address.
- Why the exposure is different.
- Diversification benefit.
- Trade-offs and overlap risk.

The candidate logic should not change internal scoring labels. It uses stored insight outputs and active universe data as inputs into portfolio-level gap findings. User-facing cards should include the disclaimer chip: `Shown because category is underweighted - not a buy recommendation`.

The Portfolio Review page should use the following public language:

- `Gap Analysis - Instruments in Underweighted Categories`
- `Analytical Gap Summary`
- `Gap findings`
- `Healthcare & Defensive - Underweighted Category`
- `International Equity - Underweighted Category`

The page should not present these outputs as recommendations to buy, sell, hold, review, or trade an instrument. Explanatory tooltips can show why an instrument appeared, using existing look-through exposure data and guardrail-pass status.

## Current Limitations

- Gap-finding explanations are deterministic templates and exposure-aware, but not a full optimizer.
- Geography currently has 0% score weight in the overall portfolio score.
- Exact issue-to-candidate scoring thresholds should be verified in the candidate services for any future recalibration.
- Historical reports generated before Security Master Phase 4C/4D may not contain issuer IDs or `securityBreakdown`; refresh Portfolio Review before using issuer-level outputs for QA.
