# Market Vision Methodology

Last updated: 2026-06-14 00:00:00 +08:00

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

## Confidence Calibration

Market Vision confidence rows are finalized mechanically after the model response:

`50 + min(supporting * 10, 35) + min(direct * 5, 15) - min(conflict * 8, 30) - min(gap * 6, 24) - min(stale * 8, 20)`

Labels:

- High: 75-100
- Medium: 45-74
- Low: 0-44

Confidence score rows are separated by macro regime and market/evidence panel. Macro regime rows are labelled as `Macro - Growth`, `Macro - Inflation`, `Macro - Rates`, etc., so they are not collapsed into a generic macro bucket.

## Regime Transition Tracker

Transitions are compared using canonical regime labels rather than raw text:

- `falling rate support` and `falling_rate_support` normalize to the same canonical value and produce `No Change`.
- Inflation subtype movement such as `reaccelerating` to `high_and_sticky` is a `Minor Classification Change`.
- Opposite growth polarity such as `Weakening` to `Strengthening` is a `Regime Shift Detected`.
- New dimensions produce `New Signal`.

Stored transition rows include raw previous/current labels, canonical previous/current labels, status, and explanation.

## AI Role

OpenAI generates narrative and synthesis. It should not be treated as source-of-truth market data. Inputs should be structured and bounded to reduce hallucination.

## Current Known Refinement Backlog

- Continue Market Vision Phase B/C refinement later.
- Improve regime-to-portfolio implication specificity.
- Confirm weekly output after the next scheduled Sunday run.

## Cost Tracking

Market Vision generation logs include model and cost metadata when configured. Required cost environment variables must match the selected model.
