# Market Vision Regression Fix

Last updated: 2026-06-14 00:00:00 +08:00

## Regression Reviewed

Two generated Market Vision reports showed inconsistent behavior:

- Week ending 2026-06-07: portfolio macro impact rows had plausible relevance labels.
- Week ending 2026-06-14: portfolio macro impact rows all showed Low relevance with "No portfolio context available."

The second output was not a true portfolio readout. It was generated without portfolio context.

## Root Cause

Manual generation already resolved the user's default portfolio and passed `portfolioId` into `MarketVisionGenerationService.generateWeeklyReport`.

The scheduled weekly job called:

```ts
generateWeeklyReport({ status: "draft" })
```

without a portfolio id. That made the generation path behave as a global Market Vision report, so portfolio-specific context was absent.

The previous fallback then converted missing context into Low relevance rows, which looked like a valid portfolio assessment even though no portfolio inputs were used.

## Fix Implemented

### Scheduled Portfolio Context

`GenerateMarketVisionReportJob` now accepts a default portfolio resolver.

`src/server/container.ts` wires this resolver to `portfolioRepository.getFirstDefaultPortfolio()`.

Scheduled weekly Market Vision generation now calls the service with the resolved portfolio id when available.

### Missing Context Is Not A Low Score

New metadata fields:

- `portfolioContextStatus`: `available`, `partial`, or `missing`.
- `portfolioContextInputs`: exposure inputs used by the deterministic impact matrix.
- `portfolioImpactMatrix`: deterministic macro relevance rows.

When context is missing:

- `portfolioContextStatus = "missing"`
- portfolio relevance fields use `Not assessed`
- portfolio impact matrix rows use `Not assessed`
- source snapshot includes a `portfolioContextWarning`

### Deterministic Portfolio Macro Impact Matrix

The matrix is now calculated in application code from actual portfolio exposure inputs.

Thresholds:

| Dimension | High | Medium | Driver |
| --- | ---: | ---: | --- |
| Growth | >=60% | 30-59% | Equity-sensitive exposure |
| Inflation | >=30% | 10-29% | Bond + commodity/gold exposure |
| Rates | >=30% | 10-29% | Bond + cash exposure |
| Liquidity | >=60% | 30-59% | Equity + crypto/risk-asset exposure |
| USD | >=30% | 10-29% | Non-US geography exposure |
| Commodities | >=15% | 5-14% | Commodity/gold + energy exposure |
| Geopolitics | >=30% | 10-29% | Non-US + commodity + energy + defense/security exposure |

### Confidence Calibration

Confidence score rows now use:

```text
50
+ min(supporting indicators * 10, 35)
+ min(direct indicators * 5, 15)
- min(conflicting indicators * 8, 30)
- min(evidence gaps * 6, 24)
- min(stale indicators * 8, 20)
```

Labels:

- High: 75-100
- Medium: 45-74
- Low: 0-44

Macro regime confidence rows are separated from market/evidence panel rows.

### Regime Transition Normalization

Transitions now compare canonical labels rather than raw generated text.

Examples:

- `falling rate support` to `falling_rate_support` => `No Change`
- `reaccelerating` to `high_and_sticky` => `Minor Classification Change`
- `Weakening` to `Strengthening` => `Regime Shift Detected`

Transition rows store raw labels, canonical labels, status, and explanation.

## Files Updated

- `src/application/jobs/GenerateMarketVisionReportJob.ts`
- `src/application/ports/repositories/PortfolioRepository.ts`
- `src/application/services/marketVision/MarketVisionGenerationService.ts`
- `src/domain/marketVision/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseMarketVisionRepository.ts`
- `src/infrastructure/repositories/supabase/SupabasePortfolioRepository.ts`
- `src/server/ai/prompts/market-vision.ts`
- `src/server/container.ts`
- `tests/market-vision.test.ts`
- `docs/MARKET_VISION_METHODOLOGY.md`

## Regression Tests Added

- Scheduled job resolves the default portfolio before generation.
- Portfolio context with equity-heavy, non-US exposure produces High Growth, High Liquidity, High USD, and Medium Commodities relevance.
- Missing portfolio context produces `Not assessed`, not Low.
- Canonical regime transition comparison prevents false shifts from wording changes.
- Growth weakening to strengthening remains a true regime shift.
- Confidence calibration keeps supported-but-imperfect evidence out of blanket Low confidence.

## Validation

Executed on 2026-06-14:

- `npm.cmd run typecheck`
- `npm.cmd test -- market-vision`

Both passed after the fix.

## Remaining Watch Items

- Re-run the next scheduled weekly Market Vision generation and confirm the new report shows `portfolioContextStatus = available`.
- Review the next generated report text for portfolio implication specificity.
- Continue future Market Vision Phase B/C refinement separately from this regression fix.
