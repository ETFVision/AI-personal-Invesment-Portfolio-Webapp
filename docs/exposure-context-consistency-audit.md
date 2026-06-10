# Exposure Context Consistency Audit

Date: 2026-06-10

## Scope

This audit covers the ETF look-through exposure consistency pass after the Alpha universe taxonomy update.

The goal was to keep ETF product taxonomy separate from portfolio exposure analytics:

- `etf_category` remains a product classification for Universe and Watchlist grouping.
- Portfolio sector and geography analysis should prefer ETF look-through exposure when available.
- Direct sector/geography metadata remains a fallback when look-through data is unavailable.

## Confirmed Universe State

Current approved active universe:

- ETFs: 201
- Stocks: 105
- Active total: 306

Raw crypto references such as `BTC`, `ETH`, and `SOL` remain inactive for now.

Live Supabase audit confirmed:

- Active ETFs: 201
- Active stocks: 105
- Duplicate active symbols: 0
- Missing expected active symbols: 0
- Extra active non-raw symbols: 0
- Uncategorized active ETFs/stocks: 0

## Implemented Changes

Added a shared portfolio exposure context helper:

- `src/application/services/portfolio/PortfolioExposureContextService.ts`

The helper provides:

- Asset allocation from the portfolio dashboard.
- Sector allocation from latest Portfolio Review ETF look-through snapshot, if available.
- Geography allocation from latest Portfolio Review ETF look-through snapshot, if available.
- Fallback to direct dashboard metadata when look-through rows are unavailable.
- Source labels:
  - `lookthrough`
  - `direct_metadata`
- Coverage and diagnostic metadata.

Updated consumers:

- Risk Analytics
- Recommendation portfolio fit
- Market Vision portfolio context

## Manual QA Completed

Risk page:

- Verified after implementation.
- The Risk page initially reused an older cached report.
- Fixed by bumping `RISK_TAXONOMY_VERSION` to force rebuild:
  - `canonical-taxonomy-v4-lookthrough-exposure`
- After refresh, Risk sector breakdown used the look-through-aware rebuilt report.

## Automated Validation

Validation completed before commit:

- `npm test`: 224 passed
- `npm run lint`: passed
- `npm run typecheck`: passed

Added tests:

- Portfolio exposure context prefers ETF look-through sector exposure over direct broad ETF taxonomy.
- Portfolio exposure context keeps direct metadata fallback when look-through exposure is unavailable.

## Deferred QA Items

These are intentionally deferred until the next data/weekly refresh cycle.

Market Vision:

- Generate/check the next Market Vision report after the weekly refresh.
- Confirm the source snapshot uses look-through-aware sector/geography allocation.
- Confirm output does not describe broad ETF holdings as generic `Multi-Asset / Broad Market` sector exposure when look-through data exists.

Recommendations:

- Rerun recommendations after the next data refresh.
- Confirm portfolio-fit scoring reflects hidden ETF exposure.
- Confirm technology-heavy or otherwise concentrated candidate instruments receive appropriate duplicate-exposure pressure where the portfolio already has look-through exposure.

## Optional Future Hardening

These are not blockers for this phase.

- Add Admin/Data Sources coverage warning for portfolio-held ETFs missing look-through rows.
- Add a visible UI label on Risk and other relevant pages:
  - `Exposure source: ETF look-through`
  - `Exposure source: Direct metadata fallback`
- Expand ETF look-through coverage beyond currently refreshed/portfolio-relevant ETFs if full-universe look-through readiness becomes a goal.
- Consider passing exposure-context diagnostics into Market Vision logs for easier QA of future AI drafts.
- Add a recommendation diagnostics field showing whether portfolio fit used look-through or direct metadata fallback.

## Production Readiness

Ready for merge.

The implemented change is deterministic and fallback-safe. It does not change the ETF taxonomy, universe list, price refresh, market metric calculations, risk metric calculations, recommendation labels, or Market Vision prompt structure beyond passing improved portfolio exposure context.
