# Market Vision Methodology

Last updated: 2026-06-11 20:11:07 +08:00

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

Documentation gap: verify the current publish/draft transition rule in `MarketVisionGenerationService.ts` before changing automation behavior.

## AI Role

OpenAI generates narrative and synthesis. It should not be treated as source-of-truth market data. Inputs should be structured and bounded to reduce hallucination.

## Current Known Refinement Backlog

- Continue Market Vision Phase B/C refinement later.
- Improve regime-to-portfolio implication specificity.
- Avoid overconfident conclusions when news source quality or macro signal coverage is weak.
- Confirm weekly output after the next scheduled Sunday run.

## Cost Tracking

Market Vision generation logs include model and cost metadata when configured. Required cost environment variables must match the selected model.
