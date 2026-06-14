# Market Vision Methodology

Last updated: 2026-06-14 23:00:00 +08:00

## Purpose

Market Vision is a weekly CIO-style narrative report using structured inputs from macro, news/theme intelligence, asset views, and portfolio context.

## Main Code Paths

- `src/application/services/marketVision/MarketVisionGenerationService.ts`
- `src/application/services/marketVision/MarketVisionService.ts`
- `src/application/services/marketVision/marketVisionPromptTemplate.ts`
- `src/server/ai/prompts/market-vision.ts`
- Provider: `OpenAiMarketVisionProvider.ts`
- Job: `/api/jobs/weekly-market-vision`

## Inputs

Market Vision may use:

- Latest FRED macro indicators and regime snapshots.
- Weekly news reconciliation.
- Theme intelligence summary.
- Market theme signals.
- Portfolio context and implications.
- Portfolio look-through exposure context where available.
- Fixed income analytics and portfolio risk analytics where available.
- Existing prior report context where applicable.

## Outputs

Stored in `market_vision_reports` and generation logs:

- Executive summary.
- Global market summary.
- Equity, bond, gold, crypto, rates, inflation, growth, currency, geopolitical views.
- Opportunities and risks.
- Portfolio implications.
- Structured metadata.
- Confidence and cost/generation metadata.

## Report Status

Reports can be generated as drafts or published depending on job/service behavior. Recent scheduled weekly generation produced drafts unless explicitly promoted/published.

Current scheduled behavior: `/api/jobs/weekly-market-vision` creates a generated draft. Manual publish remains a separate user action.

Scheduled generation now resolves the first active default portfolio before calling `MarketVisionGenerationService.generateWeeklyReport`. If no portfolio can be resolved, the report is still generated, but portfolio-specific metadata is explicitly marked as missing instead of being defaulted to Low relevance.

## Portfolio Context Metadata

Generated reports store portfolio context diagnostics in `market_vision_reports.market_vision_metadata` and mirror them into telemetry metadata:

- `portfolioContextStatus`: `available`, `partial`, or `missing`.
- `portfolioContextInputs`: numeric exposure inputs used by the deterministic macro relevance matrix.
- `portfolioImpactMatrix`: deterministic macro relevance rows for Growth, Inflation, Rates, Liquidity, USD, Commodities, and Geopolitics.

When portfolio context is missing:

- Portfolio macro impact rows use `Not assessed`.
- Portfolio relevance fields use `Not assessed`.
- The source snapshot stores `portfolioContextWarning`.
- The report should not display "Low relevance" merely because portfolio context was unavailable.

## Portfolio Macro Impact Matrix

The impact matrix is calculated in application code, not by the LLM. Thresholds are:

| Dimension | High | Medium | Driver |
| --- | ---: | ---: | --- |
| Growth | >=60% | 30-59% | Equity-sensitive exposure |
| Inflation | >=30% | 10-29% | Bond + commodity/gold exposure |
| Rates | >=30% | 10-29% | Bond + cash exposure |
| Liquidity | >=60% | 30-59% | Equity + crypto/risk-asset exposure |
| USD | >=30% | 10-29% | Non-US geography exposure |
| Commodities | >=15% | 5-14% | Commodity/gold + energy exposure |
| Geopolitics | >=30% | 10-29% | Non-US + commodity + energy + defense/security exposure |

Composite drivers can mathematically exceed 100% because they add several independent exposure sensitivities. User-facing display values are capped at 100 while metadata keeps:

- `rawDriverScore`: the uncapped composite diagnostic score.
- `displayDriverScoreCapped`: the UI-safe capped score.
- `driverBreakdown`: component exposures used to explain the composite.

Example: Geopolitics may combine non-US, commodity/gold, energy, and defense/security exposure. The report should explain the component mix rather than print a single `108.3%` composite percentage.

## Confidence Calibration

Market Vision confidence rows are finalized mechanically after the model response:

`50 + min(supporting * 10, 35) + min(direct * 5, 15) - min(conflict * 8, 30) - min(gap * 6, 24) - min(stale * 8, 20)`

Labels:

- High: 75-100
- Medium: 45-74
- Low: 0-44

Confidence score rows are separated by macro regime and market/evidence panel. Macro regime rows are labelled as `Macro - Growth`, `Macro - Inflation`, `Macro - Rates`, etc., so they are not collapsed into a generic macro bucket.

Macro regime confidence has additional caps after the raw formula is calculated:

- Default macro regime cap: 90.
- 91-95 is allowed only when all of the following are true: at least 5 supporting observations, at least 4 direct indicator observations, no evidence gaps, no stale indicators, and the regime is not mixed.
- 96-100 is reserved for exceptional evidence: at least 7 supporting observations, at least 5 direct indicator observations, no evidence gaps, no stale indicators, and the regime is not mixed.

Overall Market confidence has an additional cap because it is a synthesis dimension. If supportive and adverse forces coexist, or if the overall canonical state is mixed, the confidence score is capped at Medium or Medium-high even when the model wording is constructive.

Overall Market cap rules:

- Mixed overall regime: maximum 80.
- Supportive and adverse signals both present: maximum 80.
- Two or more mixed/neutral cross-currents: maximum 74, so the displayed label remains Medium.
- Overall Market should almost never exceed 90 because it synthesizes several dimensions rather than representing one direct data series.

## Regime Transition Tracker

Transitions are compared using canonical regime labels rather than raw text:

- `falling rate support` and `falling_rate_support` normalize to `RATES_FALLING` and produce `No Change`.
- Inflation wording such as `reaccelerating` and `high and sticky / reaccelerating` normalize to `INFLATION_ELEVATED`; if raw wording differs, this is a `Minor Classification Change`, not a full regime shift.
- Yield-curve wording such as `Mixed / normal with conflicting slope signals` and `mixed` normalize to `CURVE_MIXED` and produce `No Change`.
- Opposite polarity moves such as `Growth: Weakening` to `Growth: Strengthening`, or `USD: Weakening` to `USD: Strengthening`, are `Regime Shift Detected`.
- Liquidity transitions between tightening, neutral, and easing are directional regime shifts. `Tightening` and `Restrictive` are treated as the same tightening family and produce `No Change`.
- Overall Market subtypes are treated more gently: `Mixed / selective risk support` to `Mixed but constructive` is a `Minor Classification Change`; identical mixed subtypes are `No Change`; mixed to clear risk-on or risk-off is a `Regime Shift Detected`.
- New dimensions produce `New Signal`.

Stored transition rows include raw previous/current labels, canonical previous/current labels, status, and explanation.

## Tactical Theme Display

Tactical themes are normalized and filtered after model generation:

- User-facing report themes show only `active` or useful `watch_only` themes.
- `inactive`, `contradicted`, and `internal_only` themes are retained in `themeDiagnostics` for telemetry/debugging but hidden from the report.
- `TACTICAL_WEAKENING_USD` is suppressed if the USD regime is strengthening.
- `TACTICAL_USD_STRENGTH` is added when the USD regime is strengthening and the model did not provide that tactical theme.
- `TACTICAL_TIGHTENING_LIQUIDITY` is suppressed if the liquidity regime is neutral.

## Language Guardrails

Market Vision is a CIO-style context report, not a recommendation engine. Generated text is sanitized to avoid advice-adjacent wording such as `tradeable`, `buying opportunity`, and `entry point`. Preferred terms are `monitor`, `watch item`, `area to monitor`, and `portfolio implication`.

## AI Role

OpenAI generates narrative and synthesis. It should not be treated as source-of-truth market data. Inputs should be structured and bounded to reduce hallucination.

## Current Known Refinement Backlog

- Continue Market Vision Phase B/C refinement later.
- Improve regime-to-portfolio implication specificity.
- Confirm weekly output after the next scheduled Sunday run.

## Cost Tracking

Market Vision generation logs include model and cost metadata when configured. Required cost environment variables must match the selected model.
