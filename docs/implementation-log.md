## 2026-06-26 — Horizontal Exposure Bars Design-Token Cleanup

### Source
Claude Code

### Objective
Replace remaining hardcoded slate color utilities in the chart/exposure-bar UI primitives with design tokens for light/dark theme consistency.

### Files Changed
- `src/components/ui/charts.tsx`
- `docs/implementation-log.md`

### Summary
- Replaced chart shell title, description, border, and background slate utilities with `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-muted/40`.
- Replaced remaining exposure/range helper slate text, border, and background classes with matching design tokens.
- Preserved layout, item collapsing, and semantic tone bar colors.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display-only theming cleanup. No data, scoring, methodology, feature-flag, or access-control logic changed.

## 2026-06-26 — Portfolio PerformancePanel RSC Boundary Fix

### Source
Claude Code

### Objective
Fix the portfolio page RSC serialization error by scoping `"use client"` to the interactive performance chart only.

### Files Changed
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/portfolio/analytics-panels.tsx`
- `src/components/portfolio/performance-panel.tsx`
- `docs/implementation-log.md`

### Summary
- Extracted the stateful tabbed `PerformancePanel` and its chart helpers into a new client-only module.
- Removed `"use client"` from `analytics-panels.tsx` so allocation, exposure, winners/losers, cash, and benchmark panels remain server components.
- Updated the portfolio page to import `PerformancePanel` from the new client module while keeping `AllocationDonutPanel` server-safe for `labelFormatter={formatAssetTypeLabel}`.
- Scanned for remaining server-to-client function props in the affected portfolio path; none remain from `analytics-panels.tsx`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS after rerun outside the sandbox; the sandboxed attempt failed with EPERM writing `.test-build` files.
- `npm.cmd run build` - PASS
- Local route hit: `GET /portfolio` on `next start` returned `307` to `/login?redirectTo=%2Fportfolio`, confirming the route responds without a server crash in the unauthenticated path.

### Result
Completed.

### Notes for Claude
- Display-only/RSC-boundary fix only. No data, scoring, recommendation, feature-flag, access-control, or methodology logic changed.
- Authenticated browser recheck is still recommended to confirm the full portfolio dashboard renders past the login gate.

## 2026-06-26 — Portfolio Performance Chart Layout and Benchmark Curation

### Source
Claude Code

### Objective
Rework the portfolio dashboard performance chart so the plot sits beside an aligned legend/return-summary column and only curated benchmarks are plotted.

### Files Changed
- `src/components/portfolio/analytics-panels.tsx`
- `docs/implementation-log.md`

### Summary
- Rebuilt the tabbed performance period card as a left plot plus right-side legend and return-summary column with aligned label/value rows.
- Restricted plotted benchmark lines and legend rows to the display-only curated set: 60/40 portfolio proxy, Global equities, S&P 500, and Gold.
- Removed the below-chart benchmark legend and `+N more benchmarks` expander while leaving the underlying benchmark data untouched.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display-only portfolio dashboard polish. No data, scoring, recommendation, feature-flag, access-control, or methodology logic changed.
- Browser recheck remains recommended for the portfolio dashboard period tabs and responsive chart/right-column layout.

## 2026-06-26 — Instrument Long-Horizon Cards v3 and 5Y Volatility

### Source
Claude Code

### Objective
Redesign the instrument Overview long-horizon cards to bars-only, add chart 1W period selection, and add stored display-only 5Y volatility.

### Files Changed
- `src/components/instruments/instrument-cards.tsx`
- `src/components/instruments/instrument-price-chart.tsx`
- `src/domain/universe/types.ts`
- `src/application/services/InstrumentRiskService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `supabase/migrations/134_display_only_5y_volatility.sql`
- `tests/instrument-ia.test.ts`
- `tests/recommendations.test.ts`
- `tests/scoring-golden.test.ts`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Replaced the active Overview long-horizon returns and risk tables with scaled bar groups only.
- Scaled return bars to the largest absolute annualised return in the card, using green for non-negative CAGR and red for negative CAGR.
- Rendered long-horizon risk as separate volatility and max-drawdown bar groups, including the new 5Y volatility field.
- Added `volatility5y` to the risk metric domain, TypeScript fallback risk calculation, Supabase mapping/upsert path, and detailed risk card.
- Added migration 134 to create nullable `instrument_risk_metrics.volatility_5y`, recompute it in both risk metric refresh functions, and repopulate risk metrics via `refresh_instrument_risk_metrics_only(null)`.
- Added a chart-only 1W period option while leaving the default chart period at 1Y.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display-only change except the stored 5Y volatility data field. No scoring, anchor, guardrail, recommendation, feature-flag, or access-control logic changed.
- Migration 134 must be applied manually. Existing rows remain null until `refresh_instrument_risk_metrics_only(null)` or an equivalent forced risk recompute runs; freshness-gated buttons may otherwise skip existing rows.
- `DOCUMENTATION_GAPS.md` Low 14 now records 5Y volatility as implemented and keeps 3Y volatility deferred.

## 2026-06-25 - Instrument Detail IA Real Tabs

### Source
Claude Code

### Objective
Restructure the instrument detail page into a focused Overview plus one-at-a-time tabs, surface already-loaded long-horizon metrics, and remove placeholder clutter without changing scoring or data pipelines.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Converted `InstrumentTabs` to a client-side accessible tablist that renders only the active panel, supports left/right arrow navigation, and keeps URL hash deep links in sync.
- Added a focused Overview panel with a reserved price-chart slot, header/summary, key returns, long-horizon return/volatility/drawdown table, characteristics breakdown, data-quality line, and compliance disclaimer.
- Surfaced 10Y/15Y/20Y total return, volatility, and max drawdown values with `Insufficient history` for null long-horizon fields.
- Removed the standalone Performance tab and moved its useful fields into Overview.
- Hid empty placeholder tabs for telemetry, ETF holdings/exposure, commodity profile, benchmark relative performance, and bond duration/credit-quality placeholders while preserving real/type-relevant tabs.
- Collapsed the detailed Fundamentals trend table behind a native show/hide disclosure.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- UI/IA change only. No scoring, methodology, data-pipeline, feature-flag, access-control, or recommendation logic changed.
- Browser spot-check is still recommended for representative stock, young stock, ETF, and bond ETF records against a seeded database.

## 2026-06-24 - Deep History Maintenance Docs

### Source
Claude Code

### Objective
Document quarterly manual deep-history maintenance for retroactive adjusted-close changes and the post-backfill derived-metric recompute sequence.

### Files Changed
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/implementation-log.md`

### Summary
- Added a Deep History Maintenance section explaining that adjusted close is retroactive, the daily cron only appends the latest bar, and the deep market-history backfill was unscheduled in migration 062.
- Documented the quarterly manual deep backfill plus forced recompute sequence for daily returns, return anchors, market metrics, risk metrics, and period drawdowns.
- Added an operations note to monitor daily risk-cron runtime after migration 133 because the new long-horizon display windows increase refresh workload.

### Tests Run
- Not run; documentation-only change.

### Result
Completed.

### Notes for Claude
- No application code, SQL, scoring, labels, feature flags, or access-control behavior changed.

## 2026-06-24 - Long-Horizon Risk Display Windows

### Source
Claude Code

### Objective
Add display-only 10Y, 15Y, and 20Y volatility and max-drawdown fields to instrument risk metrics without changing any risk score, bucket, confidence, scoring, guardrail, or recommendation logic.

### Files Changed
- `src/application/services/InstrumentRiskService.ts`
- `src/components/instruments/instrument-cards.tsx`
- `src/domain/universe/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `supabase/migrations/133_long_horizon_risk_windows.sql`
- `tests/instrument-ia.test.ts`
- `tests/recommendations.test.ts`
- `tests/scoring-golden.test.ts`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added migration 133 with nullable `instrument_risk_metrics` columns for 10Y/15Y/20Y volatility and max drawdown.
- Recreated both risk metric refresh functions and both period drawdown refresh functions so the new windows populate when sufficient history exists.
- Gated 10Y/15Y windows with 30-day tolerance and 20Y windows with 120-day tolerance, matching the provider 5,000-bar/deepest-available history note from migration 132.
- Surfaced the new long-horizon risk fields on the instrument detail risk card as neutral display-only diagnostics, using `Insufficient history` when null.
- Extended TypeScript fallback risk calculations and tests while preserving the existing risk-score formula and buckets.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run test -- instrument-ia.test.js` - PASS (352/352; command currently runs the full configured suite plus the extra argument)
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 133 must be applied manually to Supabase; it repopulates all risk metrics and period drawdowns at the end.
- The new 10Y/15Y/20Y volatility and drawdown fields are display-only. They do not feed `risk_score`, `risk_bucket`, `volatility_bucket`, `confidence_score`, scoring, guardrails, or recommendation logic.
- 20Y long-horizon risk windows use the same 120-day completeness tolerance as the migration-132 return-window fix because FMP historical EOD is capped near 5,000 bars.

## 2026-06-24 - Forced Deep Price Backfill Marker

### Source
Claude Code

### Objective
Enable the 20-year market-history backfill to fetch fresh-but-shallow instruments by depth, while marking attempted deep backfills so FMP-limited instruments converge instead of re-fetching forever.

### Files Changed
- `src/server/actions/dataRefreshActions.ts`
- `src/application/services/InstrumentMarketService.ts`
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/domain/universe/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `supabase/migrations/131_instrument_price_history_backfill_marker.sql`
- `tests/price-refresh.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added migration 131 with nullable `instruments.price_history_backfilled_through` to record the deepest raw price-history target attempted.
- Threaded `forceDeepBackfill` from the admin history-backfill action through the price refresh service.
- Added depth-based force selection that can fetch instruments whose latest price is current but earliest stored price is later than the 20-year target.
- Preserved the existing non-force `needsHistoryBackfill` freshness behavior unchanged.
- Updated the repository port, Supabase mapping, and repository implementation so force-deep runs mark attempted depth after provider fetches, including empty provider responses.
- Added tests proving force-deep selection, marker convergence, and unchanged non-force behavior.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run test -- price-refresh.test.js` - PASS (351/351; command currently runs the full configured suite plus the extra argument)
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (351/351)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 131 must be applied manually to Supabase before the marker can persist.
- The planned Phase-3 risk migration number is now 132.
- This is a data-refresh selection/convergence fix only; no scoring, methodology, label, compliance, feature-flag, or access-control behavior changed.

## 2026-06-24 - Long-Horizon Display Returns

### Source
Claude Code

### Objective
Extend stored price and benchmark history from 5 years to 20 years, and expose 10-year, 15-year, and 20-year total return metrics as display-only instrument market data.

### Files Changed
- `src/server/actions/dataRefreshActions.ts`
- `src/application/services/InstrumentMarketService.ts`
- `src/domain/universe/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `supabase/migrations/130_market_metrics_long_horizon_returns.sql`
- `tests/price-refresh.test.ts`
- `tests/recommendations.test.ts`
- `tests/scoring-golden.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Increased market-history and benchmark refresh lookbacks from 1,825 days to 7,300 days.
- Added nullable display-only `return_10y`, `return_15y`, and `return_20y` columns through migration 130 and updated the market-metrics refresh RPC to populate them.
- Extended the instrument market metric/view domain types and Supabase row mapping so the long-horizon returns flow through the app data model.
- Updated fallback market-view construction to load 20 years by default and calculate long-horizon returns only when sufficient history is present.
- Added tests for sufficient and insufficient 10Y/15Y/20Y history coverage.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (349/349)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 130 must be applied manually to Supabase before persisted `instrument_market_metrics` rows can store the new fields.
- The new return fields are display-only data plumbing. They do not feed scoring, guardrails, risk metrics, methodology math, or recommendation logic.
- UI presentation and any descriptive calculation-methodology note can follow in the later UI phase.

## 2026-06-23 - Security Master Mapping Cleanup

### Source
Claude Code

### Objective
Lock in the Security Master ambiguous-mapping cleanup so inactive stubs and dot/dash class-share variants cannot re-enter ETF holding candidate mappings as the universe grows.

### Files Changed
- `supabase/migrations/129_security_master_mapping_cleanup.sql`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added migration 129 to delete `security_identifiers` rows whose `security_id` points to inactive `securities_master` rows.
- Recreated `sync_etf_holding_security_ids()` from migration 094 with active-security joins added to the `security_identifiers` and `security_aliases` candidate sources for both ETF top holdings and portfolio look-through holdings.
- Added dot/dash class-share cleanup that deactivates internal-only stubs when an active real security exists for the same normalized symbol, then deletes the deactivated stubs' identifiers.
- Re-runs ETF holding security sync and issuer-link sync after cleanup.
- Updated the ticker-change handling note to include deactivating old-symbol internal stubs and re-running ETF holding mapping sync.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (347/347)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 129 must be applied manually to Supabase after migration 128.
- This is a SQL migration/documentation-only change; no app code, scoring methodology, labels, compliance wording, feature flags, or access controls changed.

## 2026-06-23 - Internal ETF Holding Security Stub Backfill

### Source
Claude Code

### Objective
Add an idempotent manual migration to create internal-only Security Master stubs for ETF top-holding symbols that are not active selectable or stub securities after migration 127.

### Files Changed
- `supabase/migrations/128_internal_etf_holding_securities.sql`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added migration 128 to scan distinct `etf_top_holdings` symbols and insert `is_internal_only=true` `securities_master` stubs only when no active security already exists for the canonical symbol.
- Reused the migration 095 stub shape: `STOCK` / `EQUITY`, non-user-selectable, `source_priority` of `["etf_top_holdings", "etfvision"]`, identifier quality 60, and a matching `SYMBOL` security identifier sourced from `etf_top_holdings`.
- Re-ran `sync_etf_holding_security_ids()` and `sync_security_issuer_links()` so newly created stubs and migration 127's real securities are reflected in ETF holding mappings and issuer links.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (347/347)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 128 must be applied manually to Supabase after migration 127.
- This is a SQL migration/documentation-only change; no app code, scoring methodology, labels, compliance wording, feature flags, or access controls changed.

## 2026-06-23 - Security Master Incremental Setup

### Source
Claude Code

### Objective
Add an idempotent manual migration to set up Security Master rows and links for newly seeded active instruments with null `security_id`.

### Files Changed
- `supabase/migrations/127_security_master_incremental_setup.sql`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added migration 127 to insert missing selectable `securities_master` rows for active instruments whose `security_id` is null, reusing migration 091's identifier extraction, security-type mapping, and duplicate guard logic.
- Linked instruments to securities in a separate statement so freshly inserted securities are visible to the matcher.
- Inserted `SYMBOL`, `EXCHANGE_SYMBOL`, `PROVIDER_SYMBOL`, `ISIN`, and `CUSIP` identifiers for newly linked instruments with `on conflict do nothing`.
- Ran `sync_security_issuer_links()` and `sync_etf_holding_security_ids()` after linking.
- Added a GAP #40 guard that deactivates active `is_internal_only` duplicate securities for newly linked stock symbols, raises a notice listing affected symbols, and re-runs ETF holding security sync.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (347/347)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 127 must be applied manually to Supabase after the expanded universe is seeded.
- This is a SQL migration/documentation-only change; no app code, scoring methodology, labels, compliance wording, feature flags, or access controls changed.

## 2026-06-23 - Adaptive Daily Returns Rebuild

### Source
Claude Code

### Objective
Upgrade daily-return refresh from a simple fixed incremental flag to a per-instrument adaptive rebuild so complete instruments use a recent window while incomplete instruments rebuild from price-history start.

### Files Changed
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/application/services/InstrumentMarketService.ts`
- `src/app/api/jobs/instrument-daily-returns-refresh/route.ts`
- `supabase/migrations/124_adaptive_daily_returns.sql`
- `tests/price-refresh.test.ts`
- `tests/universe-repository.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Replaced the app-layer `incrementalDays` daily-return option with adaptive `recentWindowDays` plus rare `forceFull` support.
- Updated the Supabase repository RPC call to pass `p_recent_window_days` and `p_force_full`.
- Kept the daily-return route backward-compatible with migration 123 cron URLs by mapping old `incrementalDays` query input to `recentWindowDays`.
- Added migration 124 to create the adaptive `refresh_instrument_daily_returns` RPC: instruments with missing/short return history rebuild from `1900-01-01`; complete instruments upsert only the recent window; `p_force_full=true` forces a full rebuild.
- Rescheduled only the daily-return cron to use `recentWindowDays=30`.
- Added tests covering adaptive RPC arguments and the service defaults/force-full path.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (347/347)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 124 must be applied manually to Supabase and assumes migration 123 is already applied.
- The risk RPC's existing one-argument internal daily-return call remains compatible with the adaptive function; incomplete instruments still full-rebuild, while complete instruments refresh the recent window needed after daily EOD updates.
- No scoring methodology, labels, compliance wording, feature flags, or access controls changed.

## 2026-06-23 - Full-Universe Refresh Auto-Sizing And Incremental Daily Returns

### Source
Claude Code

### Objective
Auto-size instrument-count-bound refresh jobs and admin buttons to the full active universe, and make the daily-returns cron incremental for runtime.

### Files Changed
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/application/services/InstrumentMarketService.ts`
- `src/application/services/fundamentals/FundamentalsRefreshService.ts`
- `src/application/services/etfLookthrough/EtfLookthroughRefreshService.ts`
- `src/application/services/recommendations/RecommendationService.ts`
- `src/application/services/news/NewsIngestionService.ts`
- `src/application/services/portfolioReview/PortfolioReviewService.ts`
- `src/server/container.ts`
- `src/server/actions/dataRefreshActions.ts`
- `src/app/api/jobs/instrument-daily-returns-refresh/route.ts`
- `src/app/api/jobs/instrument-return-anchors-refresh/route.ts`
- `src/app/api/jobs/instrument-market-metrics-refresh/route.ts`
- `src/app/api/jobs/instrument-risk-refresh/route.ts`
- `supabase/migrations/123_full_universe_coverage.sql`
- `tests/price-refresh.test.ts`
- `tests/fundamentals.test.ts`
- `tests/etf-lookthrough-refresh.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Auto-sized daily returns, return anchors, market metrics, and risk metrics when callers omit explicit caps, so refreshes cover the full active universe as it grows.
- Added `incrementalDays` plumbing for daily returns and updated the Supabase repository RPC call to pass `incremental_days` as null for full recomputes or a finite window for cron.
- Added migration 123 to replace `refresh_instrument_daily_returns` with an optional `incremental_days` argument and reschedule derived metric crons without fixed pass caps; only daily returns passes `incrementalDays=30`.
- Made production fundamentals and ETF look-through services auto-size from the eligible stock/ETF sets while preserving deliberately capped service instances for tests.
- Removed fixed active-universe limits from recommendation selection, daily news symbol selection, and Portfolio Review context loading.
- Updated admin derived-metric actions so daily returns/anchors/market metrics omit `maxBatches`, risk omits `batchSize`, and the daily-returns button remains a full recompute.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (346/346)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 123 must be applied manually to Supabase.
- Verification in migration 123: derived cron commands keep the 35/40/45/50 22 UTC slots; daily returns drops `maxBatches` and adds `incrementalDays=30`; anchors and market metrics drop `maxBatches`; risk drops fixed `batchSize=350`; full/admin daily-return paths pass null.
- No scoring methodology, labels, compliance wording, feature flags, or access controls changed.

## 2026-06-23 - Marsh McLennan Ticker Change To MRSH

### Source
Claude Code

### Objective
Update the active universe source definition and related universe documentation for Marsh McLennan's ticker change from `MMC` to `MRSH`.

### Files Changed
- `src/domain/universe/alphaUniverse.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced `MMC` with `MRSH` in the `ALPHA_STOCK_SECTORS` Financials stock list.
- Searched source, docs, tests, and migrations for hardcoded `MMC` references and updated the related documentation references.
- Added a ticker-change handling note documenting the operational sequence: rename the existing `instruments` row first to preserve `instrument_id`, refresh price history, then update `alphaUniverse.ts`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Universe/classification only; no scoring formula, methodology, label, access-control, or compliance wording changes.
- Operational follow-up: update the live `instruments` row from `MMC` to `MRSH` before running Seed Universe to avoid duplicate rows.

## 2026-06-23 - Universe Seed And Metadata Refresh Throughput Fixes

### Source
Claude Code

### Objective
Unblock seeding and metadata coverage for the expanded 391-instrument universe by batching tag writes, speeding metadata refresh writes/syncs, and removing fixed metadata batch caps.

### Files Changed
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/application/services/MetadataRefreshService.ts`
- `src/server/actions/dataRefreshActions.ts`
- `src/app/api/jobs/instrument-metadata-refresh/route.ts`
- `supabase/migrations/121_metadata_refresh_full_universe_coverage.sql`
- `tests/universe-repository.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Reworked `updateInstrumentTags` from per-instrument update/delete/insert calls to one batched `instrument_tags` delete plus chunked flattened tag inserts, while leaving `instruments.benchmark_tags` and `instruments.thematic_tags` to the existing seed `upsertInstruments` path.
- Confirmed `UniverseManagementService.ensureSeededUniverse` already passes both `benchmarkTags` and `thematicTags` into `upsertInstruments`.
- Batched `updateInstrumentMetadata` current-row reads and metadata/taxonomy writes so metadata refresh no longer performs per-symbol select/update/taxonomy round trips.
- Changed metadata batch refresh to suppress per-batch Security Master syncs and sync identifiers once after the batch loop.
- Auto-sized metadata batch count from the active instrument count when `maxBatches` is omitted, while excluding symbols already attempted in the same full refresh so missing identifiers cannot starve later instruments.
- Updated admin and cron metadata refresh entry points to omit fixed `maxBatches` caps and keep `batchSize=25`.
- Added migration 121 to reschedule `app-daily-instrument-metadata-refresh` without a `maxBatches` query parameter.
- Verified `FMP_METADATA_CONCURRENCY` is already set to 8 in `FmpAssetMetadataProvider`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (343/343)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 121 must be applied manually to Supabase.
- Verification: the metadata cron command now omits `maxBatches`; admin metadata refresh also omits `maxBatches`; tag writes are batched and skip malformed UUID-shaped IDs; Security Master sync runs once after multi-batch metadata refresh.
- No scoring methodology, labels, compliance wording, feature flags, or access controls changed.

## 2026-06-23 - ETF Benchmark Map Documentation Sync

### Source
Claude Code

### Objective
Sync ETF benchmark methodology documentation with the expanded universe and curate the new single-country ETFs for Benchmark Relative routing without changing scoring formulas.

### Files Changed
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `docs/SCORE_METHODOLOGY.md`
- `tests/recommendations.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `EWG` to the curated developed single-country ETF benchmark set, routing it to `developed_ex_us`.
- Added `EWZ`, `EWY`, and `EWT` to the curated emerging single-country ETF benchmark set, routing them to `emerging_markets`.
- Updated the methodology page and `SCORE_METHODOLOGY.md` ETF benchmark map for the new factor/style, option-income, mid-cap, ESG, aerospace/defense, multi-asset, preferred, municipal, and emerging-market bond categories.
- Bumped `METHODOLOGY_LAST_UPDATED` to 2026-06-23.
- Added regression assertions for the new country ETF benchmark mappings.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- No scoring formula, weight, label, access-control, or methodology math changed; this only curates benchmark routing for the newly added country ETFs and updates explanatory docs.

## 2026-06-23 - Universe Expansion For ETF And Stock Coverage

### Source
Claude Code

### Objective
Expand the ETFVision curated universe by 31 ETFs and 54 stocks, exposing the additions in both alpha and full mode without changing scoring formulas.

### Files Changed
- `src/domain/universe/alphaUniverse.ts`
- `src/application/services/taxonomy/TaxonomyService.ts`
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `src/infrastructure/config/env.ts`
- `tests/taxonomy.test.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added nine ETF categories: Factor Investing, Option Income, Mid Cap, ESG / Socially Responsible, Multi-Asset / Balanced, Preferred Stock, Municipal Bond, Emerging-Market Bond, and Aerospace & Defense.
- Added 31 ETF symbols across the new categories plus country ETF additions, bringing curated ETF coverage to 232 symbols.
- Added 54 stock symbols across existing sectors, bringing curated stock coverage to 159 symbols.
- Added ETF asset-category overrides for multi-asset balanced, preferred stock, municipal bond, and emerging-market bond categories.
- Extended taxonomy canonical-sector mapping for every new ETF category and added conservative category themes where obvious.
- Extended ETF benchmark routing for the new categories so benchmark-relative scoring can resolve an existing benchmark key without changing the scoring formula.
- Raised `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH` default from 150 to 200 so the enlarged stock universe remains covered by one weekly fundamentals pass.
- Closed `docs/DOCUMENTATION_GAPS.md` Low 5 as implemented.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Universe/classification only; no scoring formulas, labels, access controls, or methodology weights changed.
- Post-deploy operations should run Seed Universe, metadata refresh, market-history backfill / EOD refresh as needed, ETF look-through refresh, derived metrics, fundamentals refresh, and recommendation/report refresh so the new instruments are fully populated.

## 2026-06-23 - Collapse Monthly ETF Look-Through To Single Pass

### Source
Claude Code

### Objective
Collapse the monthly ETF look-through refresh from five Supabase cron passes to one now that set-based eligibility and bounded-concurrency refresh can cover the full eligible ETF universe in one run.

### Files Changed
- `src/infrastructure/config/env.ts`
- `src/app/api/jobs/etf-lookthrough-refresh/route.ts`
- `supabase/migrations/120_collapse_monthly_etf_lookthrough_single_pass.sql`
- `docs/scheduled-jobs.md`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Raised the default `ETF_LOOKTHROUGH_MAX_ETFS_PER_RUN` from 50 to 250 so one pass covers the roughly 169 eligible ETF universe.
- Added `maxDuration = 300` to `/api/jobs/etf-lookthrough-refresh` to make the Vercel function ceiling explicit for the longer single pass.
- Added migration 120 to unschedule the five old monthly ETF look-through passes and universe validation, then recreate one `app-monthly-etf-lookthrough-refresh` job followed by `app-monthly-universe-validation`.
- Kept monthly commands copied from migration 117 verbatim except the intentional merged ETF look-through job name.
- Updated scheduled-jobs and operations docs to show the monthly `23:30`-`23:35` UTC chain on the 1st.

### New Monthly Schedule
| UTC Cron | Job |
|---:|---|
| `30 23 1 * *` | `app-monthly-etf-lookthrough-refresh` |
| `35 23 1 * *` | `app-monthly-universe-validation` |

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (339/339)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 120 must be applied manually to Supabase.
- Verification: the unschedule list covers exactly the previous 6 monthly jobs; the reschedule list covers the same monthly chain minus the four dropped ETF look-through passes; both monthly cron expressions use `1 * *`; no endpoint or command changed except the merged ETF look-through job name.
- Daily and weekly schedules were not changed.

## 2026-06-23 - Optimize ETF Look-Through Refresh

### Source
Claude Code

### Objective
Speed up ETF look-through refresh by replacing per-ETF eligibility date queries with one set-based RPC and processing selected ETFs in bounded-concurrency waves with parallelized per-ETF upserts.

### Files Changed
- `supabase/migrations/119_get_latest_etf_exposure_dates_rpc.sql`
- `src/application/ports/repositories/EtfExposureRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `src/application/services/etfLookthrough/EtfLookthroughRefreshService.ts`
- `src/infrastructure/config/env.ts`
- `src/server/container.ts`
- `tests/etf-lookthrough-refresh.test.ts`
- `package.json`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added migration 119 with `get_latest_etf_exposure_dates(p_instrument_ids uuid[])`, returning latest sector exposure and top-holdings dates per ETF through one grouped SQL query.
- Repeated the existing `etf_sector_exposures` and `etf_top_holdings` `(etf_instrument_id, as_of_date desc)` indexes with `create index if not exists`.
- Added `getLatestEtfExposureDates` to the ETF exposure repository port and Supabase implementation, with missing-table/missing-function fallback to an empty map.
- Replaced the refresh service's per-ETF eligibility date loop with one set-based repository call while preserving the same stale/force eligibility rule and holdings-first prioritization.
- Replaced the selected-ETF sequential refresh loop with bounded-concurrency waves using `fetchConcurrency`.
- Parallelized independent per-ETF upserts for sector, country, top holdings, and theme exposures.
- Added `ETF_LOOKTHROUGH_FETCH_CONCURRENCY`, defaulting to 6, and threaded it through the server container.
- Added a regression test proving one set-based eligibility call, no per-ETF date lookups, bounded provider concurrency, correctly summed totals, and isolated `partial_success` behavior for one failing ETF.
- Cron pass count and `maxEtfsPerRun` were intentionally unchanged.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (339/339)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 119 must be applied manually to Supabase.
- This is an app-layer performance optimization plus one supporting RPC; no methodology, labels, compliance wording, access controls, cron schedule, pass count, or `maxEtfsPerRun` changed.
- The five monthly ETF look-through cron passes remain in place; collapsing them is a separate measured follow-up after production timing is observed.

## 2026-06-23 - Collapse Weekly Fundamentals To Single Pass

### Source
Claude Code

### Objective
Collapse the weekly fundamentals refresh from three Supabase cron passes to one now that bounded-concurrency refresh can cover the full active stock universe in one run.

### Files Changed
- `src/infrastructure/config/env.ts`
- `src/app/api/jobs/fundamentals-refresh/route.ts`
- `supabase/migrations/118_collapse_weekly_fundamentals_single_pass.sql`
- `docs/scheduled-jobs.md`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Raised the default `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH` from 50 to 150 so one pass covers the roughly 105 active stock universe.
- Added `maxDuration = 300` to `/api/jobs/fundamentals-refresh` to make the Vercel function ceiling explicit for the longer single pass.
- Added migration 118 to unschedule the three old fundamentals passes plus the downstream weekly chain, then recreate one `app-weekly-fundamentals-refresh` job followed by news reconciliation, Market Vision, recommendation, Portfolio Review, and telemetry jobs.
- Kept all weekly commands copied from migration 117 verbatim except the intentional merged fundamentals job name.
- Updated scheduled-jobs and operations docs to show the Saturday-UTC `23:30`-`23:55` weekly chain with no Sunday-UTC rollover.

### New Weekly Schedule
| UTC Cron | Job |
|---:|---|
| `30 23 * * 6` | `app-weekly-fundamentals-refresh` |
| `35 23 * * 6` | `app-weekly-news-reconciliation` |
| `40 23 * * 6` | `app-weekly-market-vision` |
| `45 23 * * 6` | `app-weekly-recommendation-run` |
| `50 23 * * 6` | `app-weekly-portfolio-review-run` |
| `55 23 * * 6` | `app-weekly-telemetry-evaluation` |

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (338/338)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 118 must be applied manually to Supabase.
- Verification: the unschedule list covers exactly the previous 8 weekly jobs; the reschedule list covers the same weekly chain minus the two dropped fundamentals passes; all weekly cron expressions use `* * 6` with no `* * 0` entries; no endpoint or command changed except the merged fundamentals job name.
- Daily and monthly schedules were not changed.

## 2026-06-23 - Bounded-Concurrency Fundamentals Refresh

### Source
Claude Code

### Objective
Speed up the weekly fundamentals refresh by processing due stocks in bounded-concurrency waves and parallelizing independent repository upserts inside each stock task.

### Files Changed
- `src/application/services/fundamentals/FundamentalsRefreshService.ts`
- `src/infrastructure/config/env.ts`
- `src/server/container.ts`
- `tests/fundamentals.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Extracted the per-stock refresh body into a result-returning helper so each stock reports deltas instead of mutating shared counters.
- Processed the already sorted/sliced `due` list in bounded waves using `fetchConcurrency`, preserving selection order and `maxStocksPerRefresh`.
- Added `FUNDAMENTALS_FETCH_CONCURRENCY`, defaulting to 6, and threaded it through the server container.
- Parallelized the independent first write wave: profile, financial statements, and financial ratios.
- Kept score and trend calculations unchanged and in memory after the first write wave.
- Parallelized the second write wave: score, trends, and trend summary.
- Preserved failure isolation so one throwing symbol is captured in `failedSymbols` without failing the wave.
- Added a regression test proving bounded stock-level concurrency, correctly summed totals, and `partial_success` behavior for one failed symbol.
- No scoring, trend math, methodology, labels, access controls, SQL, or user-facing compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (338/338)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Default `FUNDAMENTALS_FETCH_CONCURRENCY=6` means roughly 12 concurrent FMP fundamentals requests because each stock fetches annual and quarterly data in parallel.
- Cron/pass count was intentionally unchanged; collapsing weekly passes remains a measured follow-up.

## 2026-06-22 - Re-Cascade Refresh Schedule With Single Risk Pass

### Source
Claude Code

### Objective
Create a schedule-only Supabase pg_cron migration that re-cascades daily, weekly, and monthly refresh jobs around the US market close and collapses the two daily risk-metric passes into one.

### Files Changed
- `supabase/migrations/117_recascade_refresh_schedule_single_pass_risk.sql`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added migration 117 with the guarded unschedule loop pattern used by migration 116.
- Unschedules exactly the requested 27 job names and recreates 26 jobs; the only set difference is the intentional collapse from `app-daily-instrument-risk-refresh-1` and `app-daily-instrument-risk-refresh-2` into `app-daily-instrument-risk-refresh`.
- Reuses commands from migrations 116, 101, and 082 verbatim except for the new merged risk job command: `/api/jobs/instrument-risk-refresh?batchSize=350&minObservations=30&lockTtlSeconds=600`.
- Keeps all endpoints and query strings unchanged except for the merged risk job.
- No application code, TypeScript, scoring, methodology, labels, access controls, or user-facing compliance wording changed.

### New Schedule
| Cadence | UTC Time | Job |
|---|---:|---|
| Daily | 22:30 | `app-daily-instrument-price-refresh` |
| Daily | 22:35 | `app-daily-instrument-daily-returns-refresh` |
| Daily | 22:40 | `app-daily-instrument-return-anchors-refresh` |
| Daily | 22:45 | `app-daily-instrument-market-metrics-refresh` |
| Daily | 22:50 | `app-daily-instrument-risk-refresh` |
| Daily | 22:55 | `app-daily-instrument-metadata-refresh` |
| Daily | 23:00 | `app-daily-benchmark-refresh` |
| Daily | 23:05 | `app-daily-portfolio-valuation-refresh` |
| Daily | 23:10 | `app-daily-portfolio-summary-refresh` |
| Daily | 23:15 | `app-daily-fred-macro-ingestion` |
| Daily | 23:20 | `app-daily-fmp-news-ingestion` |
| Daily | 23:25 | `app-daily-newsdata-ingestion` |
| Weekly Sat | 23:30 | `app-weekly-fundamentals-refresh-1` |
| Weekly Sat | 23:35 | `app-weekly-fundamentals-refresh-2` |
| Weekly Sat | 23:40 | `app-weekly-fundamentals-refresh-3` |
| Weekly Sat | 23:45 | `app-weekly-news-reconciliation` |
| Weekly Sat | 23:50 | `app-weekly-market-vision` |
| Weekly Sat | 23:55 | `app-weekly-recommendation-run` |
| Weekly Sun | 00:00 | `app-weekly-portfolio-review-run` |
| Weekly Sun | 00:05 | `app-weekly-telemetry-evaluation` |
| Monthly 1st | 23:30 | `app-monthly-etf-lookthrough-refresh-1` |
| Monthly 1st | 23:35 | `app-monthly-etf-lookthrough-refresh-2` |
| Monthly 1st | 23:40 | `app-monthly-etf-lookthrough-refresh-3` |
| Monthly 1st | 23:45 | `app-monthly-etf-lookthrough-refresh-4` |
| Monthly 1st | 23:50 | `app-monthly-etf-lookthrough-refresh-5` |
| Monthly 1st | 23:55 | `app-monthly-universe-validation` |

### Tests Run
- SQL/job-name verification - PASS (27 unscheduled, 26 scheduled, only risk pair collapsed)
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (337/337)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration 117 is valid SQL by inspection and job-name parsing, and must be applied manually to Supabase.
- The schedule is anchored to the US market close/EOD window: price starts at 22:30 UTC, which is 18:30 EDT / 17:30 EST.
- Monthly jobs run on the 1st in UTC, which remains the 1st in US Eastern.

## 2026-06-22 - Chunked Set-Based Risk Metrics Refresh

### Source
Claude Code

### Objective
Speed up `refreshInstrumentRiskMetricsInBatches` by replacing sequential single-instrument risk RPC calls with chunked set-based RPC calls while preserving timeout fallback behavior.

### Files Changed
- `src/application/services/InstrumentMarketService.ts`
- `tests/price-refresh.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added optional `chunkSize` input to `refreshInstrumentRiskMetricsInBatches`, defaulting to 25.
- Replaced the per-instrument happy path with chunked calls to `refreshInstrumentRiskMetricsOnly(chunkIds)`.
- Preserved stale-aware instrument selection, `batchSize`, result shape, requested symbols, and updated-count semantics.
- Preserved timeout resilience: a chunk-level statement timeout falls back to the existing per-instrument refresh path for that chunk only.
- Added tests proving the happy path calls one set-based RPC per chunk and that a simulated chunk timeout falls back per instrument.
- No scoring, methodology, labels, access controls, cron schedule, or user-facing compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (337/337)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- With chunked set-based RPC calls, the current two scheduled risk-metric passes (`200 + 150`) can likely collapse to one later after production timing is observed.

## 2026-06-22 - Adjusted Historical EOD Daily Price Refresh

### Source
Claude Code

### Objective
Replace the abandoned FMP `eod-bulk` daily price path with an adjusted-close EOD refresh that reuses the historical price endpoint used by market-history backfill.

### Files Changed
- `src/application/ports/providers/MarketDataProvider.ts`
- `src/application/services/InstrumentMarketService.ts`
- `src/app/api/jobs/instrument-price-refresh/route.ts`
- `src/infrastructure/providers/marketData/FmpMarketDataProvider.ts`
- `src/infrastructure/providers/marketData/fmpBulkEodCsv.ts` (deleted)
- `src/server/actions/dataRefreshActions.ts`
- `supabase/migrations/116_bulk_eod_instrument_price_refresh_schedule.sql`
- `tests/price-refresh.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Removed the FMP bulk-EOD provider method and deleted the CSV helper because live `eod-bulk` behavior was unsuitable for ETFVision's daily refresh path.
- Added `refreshInstrumentPricesEod`, which fetches active instruments through bounded-concurrency historical-price calls over a trailing 7-day window by default.
- Stored adjusted-close rows using each quote's real EOD `asOfDate` and adjusted `price`, matching the market-history backfill source.
- Avoided `listInstrumentPriceStats` for the daily EOD path; it fetches all active instruments directly and reports symbols with no returned history as missing.
- Updated the instrument-price route to support `source=eod` with optional `lookbackDays` and `concurrency`, while leaving the default batch path unchanged.
- Updated the Admin `Refresh prices (EOD)` action to use the adjusted historical EOD path with derived and risk metrics skipped.
- Updated migration 116 so the daily cron calls `source=eod` and documents adjusted close via historical-price-eod.
- No scoring, methodology, labels, access controls, or investment-compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (337/337)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- This supersedes the short-lived bulk-EOD implementation: live FMP `eod-bulk` was abandoned because it returned unsuitable coverage and was heavily rate-limited.
- The trailing 7-day adjusted-close refresh self-heals recent dividend/split adjustments daily. Older adjusted-close restatements still require the existing full `Backfill market history` operation or a future monthly full-backfill cron.
- Migration 116 still needs to be applied manually to Supabase for the scheduled daily refresh to use `source=eod`.

## 2026-06-22 - Fix FMP Bulk EOD CSV Parsing

### Source
Claude Code

### Objective
Fix `getBulkEodPrices` so it parses FMP `eod-bulk` CSV responses instead of attempting JSON parsing.

### Files Changed
- `src/infrastructure/providers/marketData/FmpMarketDataProvider.ts`
- `src/infrastructure/providers/marketData/fmpBulkEodCsv.ts`
- `tests/price-refresh.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced `response.json()` parsing in `getBulkEodPrices` with `response.text()` plus header-based CSV parsing.
- Added CSV parsing that locates `symbol`, `date`, `adjClose`, `close`, and `price` by header name, uses adjusted close first, preserves the row EOD date, and skips invalid rows.
- Kept empty response handling as `[]` for non-trading or unavailable dates.
- Preserved FMP JSON error-object handling when the body starts with `{`.
- Added a focused unit test for the CSV parser using a sample `eod-bulk` row.
- No scoring, methodology, labels, access controls, cron schedule, or user-facing compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (338/338)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- FMP `eod-bulk` returns CSV, not JSON; the bulk-EOD price path should now avoid the `Unexpected non-whitespace character after JSON` failure.
- The parser is header-based so it is resilient to FMP column ordering while keeping the simple comma split suitable for symbol/date/price fields.

## 2026-06-22 - Admin Price Refresh Uses Bulk EOD

### Source
Claude Code

### Objective
Switch the Admin Data Sources "Refresh prices" button from the batch latest-price path to the new FMP bulk-EOD price refresh path.

### Files Changed
- `src/server/actions/dataRefreshActions.ts`
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Updated `refreshInstrumentPricesAction` to call `refreshInstrumentPricesFromBulkEod({ skipRiskMetrics: true, skipDerivedMetrics: true })`.
- Removed the old manual button's `lookbackDays`, `batchSize`, `maxBatches`, and `includeBackfill` arguments because the bulk-EOD path chooses the latest expected EOD date internally.
- Kept the manual button prices-only and fast; derived metrics still remain on the numbered follow-up buttons.
- Renamed the button label to `1. Refresh prices (EOD)` and pending label to `Refreshing EOD prices...`.
- No scoring, methodology, access controls, cron behavior, route behavior, or user-facing compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (337/337)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- The manual Admin Data Sources price button now exercises the same bulk-EOD service path as the new scheduled bulk route, but still skips derived and risk metric recomputation.
- Operators should continue running the numbered derived-metric buttons after price refresh when derived metrics need to be updated.

## 2026-06-22 - Bulk EOD Daily Price Refresh

### Source
Claude Code

### Objective
Replace the five-pass daily latest-price refresh with FMP Ultimate bulk-EOD pricing, preserving the actual EOD date and avoiding the daily price-stat scan.

### Files Changed
- `src/application/ports/providers/MarketDataProvider.ts`
- `src/infrastructure/providers/marketData/FmpMarketDataProvider.ts`
- `src/application/services/InstrumentMarketService.ts`
- `src/app/api/jobs/instrument-price-refresh/route.ts`
- `supabase/migrations/116_bulk_eod_instrument_price_refresh_schedule.sql`
- `tests/price-refresh.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `getBulkEodPrices(date)` to the market data provider contract and implemented FMP `eod-bulk` ingestion with adjusted-close precedence matching historical price parsing.
- Added `refreshInstrumentPricesFromBulkEod({ date })`, which pulls one bulk EOD file, filters to active instruments, upserts the real EOD `priceDate`, avoids `listInstrumentPriceStats`, and falls back to latest-price lookup only for symbols omitted from a non-empty bulk response.
- Updated `/api/jobs/instrument-price-refresh` to support `?source=bulk_eod` plus optional `date=YYYY-MM-DD`, while preserving the existing default path when `source` is absent.
- Added migration `116_bulk_eod_instrument_price_refresh_schedule.sql` to unschedule the five daily price-refresh passes and schedule one daily bulk-EOD call.
- Added tests covering EOD-date storage, omitted-symbol fallback, no price-stat scan, and no fallback on empty/non-trading bulk responses.
- No scoring, methodology, labels, user-facing compliance wording, feature flags, or access controls changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (337/337)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration `116_bulk_eod_instrument_price_refresh_schedule.sql` must be applied manually to Supabase before cron changes take effect.
- Live FMP verification is still required after deploy: compare a few bulk-EOD rows against historical backfill rows for the same symbols/date to confirm adjusted-close continuity and correct EOD dating.
- If the target bulk EOD date returns no rows, the service intentionally does not fall back to latest prices, preventing a one-off historical resync from writing mismatched current prices.

## 2026-06-22 - Raise History Backfill Batch Size

### Source
Claude Code

### Objective
Increase the Admin Data Sources "Backfill market history" batch size now that instrument price-stat aggregation no longer consumes most of the serverless execution budget.

### Files Changed
- `src/server/actions/dataRefreshActions.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Changed `backfillUniverseHistoryAction` from `batchSize: 5` to `batchSize: 50`.
- Left `lookbackDays: 1825`, `maxBatches: 1`, `includeBackfill: true`, and `skipDerivedMetrics: true` unchanged.
- Context: the prior size of 5 was chosen while `listInstrumentPriceStats` spent most of the 300-second budget; Optimization B / migration 115 moved that work into a grouped SQL RPC, and `upsertInstrumentPrices` already chunks writes.
- No scoring, labels, methodology, access controls, cron routes, derived-metric buttons, or user-facing compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (335/335)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Operational check after deploy: click "Backfill market history" once and run `select duration_ms from job_runs where job_name='backfill_market_history' order by started_at desc limit 1;`.
- If duration approaches ~250s+ or the run shows FMP throttling / partial errors, reduce `batchSize` to about 25 and consider a bounded-concurrency historical-fetch wave of about 10 as a follow-up.

## 2026-06-22 - Instrument Price Stats RPC Optimization

### Source
Claude Code

### Objective
Replace the JavaScript-paginated `listInstrumentPriceStats` scan over `instrument_prices` with a single grouped SQL aggregation RPC.

### Files Changed
- `supabase/migrations/115_get_instrument_price_stats_rpc.sql`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `tests/universe-repository.test.ts`
- `package.json`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `get_instrument_price_stats(p_instrument_ids uuid[] default null)` to aggregate earliest date, latest date, and observation count in Postgres.
- Replaced the `listInstrumentPriceStats` pagination loop with one `this.db.rpc("get_instrument_price_stats", ...)` call and preserved the existing return shape.
- Kept the missing `instrument_prices` table guard returning `[]`.
- Added a focused repository test that verifies RPC parameters, row mapping, all-instrument `null` parameter behavior, and the missing-table guard.
- No callers, pricing logic, derived-metric logic, scoring, labels, user-facing wording, feature flags, access controls, or methodology changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (335/335)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Migration `115_get_instrument_price_stats_rpc.sql` must be applied to Supabase before deployed code can use the new RPC.
- Live sample equivalence against the previous JS aggregation requires the migration to be applied in the target DB; local unit coverage verifies the repository uses and maps the RPC correctly.

## 2026-06-22 - Med 26 Scoring Golden Baseline

### Source
Claude Code

### Objective
Create deterministic golden-regression coverage that pins the current ETFVision scoring outputs and fails loudly when future scoring changes move the baseline.

### Files Changed
- `tests/scoring-golden.test.ts`
- `package.json`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a new golden scoring test covering helper anchors, fundamental sub-score fixtures, and normalized recommendation outputs across stock, ETF, bond ETF, gold ETF, and crypto services.
- Golden tests use pure helper functions and direct `evaluate()` calls only; they do not call `RecommendationService.generate()` or include run-date/free-text output in assertions.
- Stock recommendation evaluations run under the canonical stock phase-2 feature flag path.
- Wired the new golden test into `npm test` by adding `.test-build/tests/scoring-golden.test.js` to the explicit Node test list.
- No scoring source code, weights, labels, methodology, feature flags, access controls, schema, migrations, or user-facing copy changed.

### Tests Run
- Focused compile/test for `tests/scoring-golden.test.ts` - PASS (3/3)
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (333/333)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- This is the Med 26 golden baseline. Future intentional scoring changes should update this test explicitly alongside methodology/log updates.

## 2026-06-21 - Methodology Financial Terms Glossary

### Source
Claude Code

### Objective
Add a public methodology-page financial terms glossary so financial-statement metrics used in formulas are defined in plain English.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `financialTermsRows` with plain-English definitions for margin, EBITDA, valuation multiples, return metrics, cash-flow metrics, leverage/liquidity metrics, issuer, beta, Treasury, high yield, standard deviation, and covariance.
- Rendered the new Financial terms collapsible block in the Overview section after the existing Key terms / Notation content.
- Left existing Key terms, Notation, formulas, scoring logic, weights, constants, feature flags, access controls, schema, and methodology values unchanged.
- Left `METHODOLOGY_LAST_UPDATED` unchanged because it already matches today's date, 2026-06-21.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS
- Dev-server rendered `/methodology` verification - PASS; KaTeX markup remained present and the Financial terms block plus representative entries rendered.

### Result
Completed.

### Notes for Claude
- Documentation/presentation-only change on `src/app/methodology/page.tsx`; no math, scoring, or formula changes.

## 2026-06-21 - Methodology Trend Decision Tree Clarification

### Source
Claude Code

### Objective
Clarify the methodology page trend direction decision tree and correct the displayed trend-strength formula notation without changing scoring or calculation code.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced the Trend Direction inputs note with explicit deterministic label logic for Rebounding, Accelerating, Improving, Decelerating, Deteriorating, Volatile, and Stable.
- Updated the displayed Trend strength formula from `|x_latest - xbar_first|` to `|x_latest - x_first|`.
- Added that `x_first` is the earliest observation in the window while preserving the stable/volatile strength note.
- No math/scoring implementation, weights, constants, feature flags, access controls, schema, or methodology values changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS
- Dev-server rendered `/methodology` verification - PASS; KaTeX markup, explicit trend decision-tree copy, `x_first` formula source, and `x_first` note were present.

### Result
Completed.

### Notes for Claude
- Page/log-only clarification; no scoring implementation or methodology values changed.

## 2026-06-21 - Methodology Presentation Clarifications

### Source
Claude Code

### Objective
Improve the public methodology page's readability for non-technical users by adding notation definitions, explanatory formula notes, trend classification detail, and component meaning columns without changing scoring formulas, weights, constants, or code paths.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added glossary terms for dispersion, bounded values, tolerance, and magnitude.
- Added a Notation table under Key terms explaining clamp/bounded, indicator functions, logical symbols, empty values, summation/covariance notation, square roots, deltas, averages, returns, and weights.
- Added plain-English variable definitions to fundamentals, trend, Insight Alignment, Diversification, and covariance formula notes.
- Added the requested Trend strength formula row and expanded the trend direction explanation.
- Added a "What it measures" column to each instrument-type Characteristics Score component table.
- Clarified the fundamentals confidence sentence and Diversification sub-score wording.
- Marked Macro fit and Quality valuation adjustment examples as representative examples rather than exhaustive rule sets.
- Left `METHODOLOGY_LAST_UPDATED` unchanged because it already matches today's date, 2026-06-21.
- No scoring code, formulas, weights, anchors, constants, feature flags, access controls, schema, or methodology values changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS
- Dev-server rendered `/methodology` verification - PASS; KaTeX markup, Notation block, "What it measures" column, trend strength row, and new variable notes were present.

### Result
Completed.

### Notes for Claude
- Documentation/presentation-only change on the methodology page. Formula rendering remains intact after the prior JSX escaping fix.

## 2026-06-21 - Methodology KaTeX JSX Escaping Fix

### Source
Claude Code

### Objective
Fix broken KaTeX rendering on the public methodology page by passing formula strings through JSX expression strings instead of literal JSX string attributes.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Converted methodology page `FormulaDetail` `tex` props from `tex="..."` to `tex={"..."}` so JavaScript resolves LaTeX escapes before KaTeX renders them.
- Applied the conversion across component, fundamentals, trend, confidence, portfolio, risk, and macro formula rows.
- Verified `/methodology` through the local dev server; Weighted composite, scoreMargin, Bond duration fit cases, Allocation, and covariance rows contain rendered KaTeX markup.
- No scoring code, formulas, weights, constants, feature flags, access controls, schema, or user-facing methodology wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS
- Dev-server/browser verification for `/methodology` - PASS

### Result
Completed.

### Notes for Claude
- Root cause was JSX string-attribute escaping: `tex="\\mathrm{...}"` passed double backslashes to KaTeX. JSX expression strings now pass the intended single-backslash LaTeX.

## 2026-06-21 - Theme Fit Formula Display Correction

### Source
Claude Code

### Objective
Correct the public methodology Theme fit formula display and add the "How scores work" section to the methodology table of contents.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/SCORE_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Corrected the rendered Theme fit formula to show a single +5 bonus when AI / Automation, Quality, or Global Diversification is present.
- Updated the formula note so it no longer implies separate +5 bonuses for all three positive theme tags.
- Added the "How scores work" section to the methodology page table of contents.
- Mirrored the single-bonus wording in `docs/SCORE_METHODOLOGY.md`.
- No scoring code, weights, formulas, anchors, feature flags, access controls, or schema changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Docs/page-only correction; engine behavior was already correct.

## 2026-06-21 - Methodology Page Comprehension and Math Rendering

### Source
Claude Code

### Objective
Improve the public methodology page with comprehension layers, server-rendered formula math, Portfolio Balance Review naming, and Market Vision provenance disclosure without changing any scoring code or numeric methodology.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/SCORE_METHODOLOGY.md`
- `package.json`
- `package-lock.json`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a collapsible Key Terms glossary and a plain-language "How ETFVision scores work" explanation after the Overview.
- Added one-line "what this tells you" section descriptions across the methodology page.
- Added a Quality vs Business Quality clarification under the Business Quality table.
- Added KaTeX and server-rendered formula helpers, then converted collapsed calculation/formula sections to show a plain-English line plus rendered math.
- Renamed the public page's Gap Analysis section to Portfolio Balance Review and mirrored Portfolio Balance Review terminology in `SCORE_METHODOLOGY.md`.
- Added Market Vision provenance / AI-assistance disclosure to the page and score methodology document.
- No scoring code, formulas, weights, anchors, feature flags, access controls, or database schema changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- KaTeX is rendered at build time in the static methodology page with `strict: false` to avoid non-blocking display-line warnings.
- Formula text was transcribed for presentation only; numerical constants and operations were not intentionally changed.

## 2026-06-21 - Benchmark Disclosure and Methodology Map Cleanup

### Source
Claude Code

### Objective
Correct ETF Benchmark Relative disclosure wording and document the exact benchmark map used for International Dividend and curated single-country ETFs.

### Files Changed
- `src/app/methodology/page.tsx`
- `docs/SCORE_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced broad MSCI-family benchmark disclosure wording with scoped wording: US equity ETFs use the S&P 500, while international developed and emerging-market ETFs use MSCI-family proxies.
- Completed the documented ETF Benchmark Relative map to include International Dividend, curated developed single-country ETFs, curated emerging single-country ETFs, and the no-component treatment for other single-country ETFs.
- Added a fundamentals helper note that stock fundamental sub-scores use latest annual ratios/statements rather than latest quarter data.
- No scoring code, weights, constants, schemas, or feature flags changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Documentation-only follow-up to align public methodology and `SCORE_METHODOLOGY.md` with `benchmarkKeyForEtf`.

## 2026-06-21 - Methodology Documentation Business Quality Cleanup

### Source
Claude Code

### Objective
Update public and formula-level methodology documentation so Business Quality is the stock fundamentals headline, Valuation is shown separately, and the retired valuation-blended fundamentals display is no longer presented as live.

### Files Changed
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Removed the old valuation-blended fundamentals row from the public methodology page.
- Reframed the Fundamentals section around Business Quality inputs directly: Growth, Profitability, Cash Flow, Balance Sheet, and Quality.
- Added compliance-safe limitations/disclosures to the public methodology page and `SCORE_METHODOLOGY.md`.
- Marked portfolio-context guardrails as Portfolio Review only, not per-instrument Characteristics Score guardrails.
- Cleaned current methodology wording for developer-era phrasing and updated `METHODOLOGY_LAST_UPDATED` to 2026-06-21.
- Updated Recommendation Insights methodology to refer to Business Quality rather than a generic fundamentals score.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Documentation-only change. No scoring code, weights, anchors, schemas, feature flags, access controls, or user-facing labels outside methodology documentation were changed.
- `overallFundamentalScore` remains in the data model/computation for compatibility and non-display paths; this task only aligns methodology documentation with the UI display retirement.

## 2026-06-21 - Fundamentals Display Business Quality Composite

### Source
Claude Code

### Objective
Retire valuation-blended `overallFundamentalScore` from Fundamentals UI display only, replacing it with the existing Business Quality composite while keeping Valuation as a separate displayed metric.

### Files Changed
- `src/app/(dashboard)/fundamentals/page.tsx`
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/components/instruments/instrument-directory-table.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Updated the Fundamentals page coverage count and table's first score column to use `scoreBusinessQuality(latestScore)`.
- Renamed the Fundamentals table column from `Overall` to `Business Quality`.
- Updated the instrument detail Fundamental Scores card to show `Business Quality` instead of the stored overall fundamentals score.
- Updated the instrument directory Fundamentals cell to show `Business Quality` and separate `Val`, and removed the standalone Quality sub-score snippet to avoid confusing it with the Business Quality composite.
- Left the trend table's `Overall` trend-direction column unchanged because it is unrelated to the stored fundamentals score.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Presentation-only change. No migrations, schema changes, `FundamentalScore` type changes, computation changes, recommendation-engine changes, feature flags, access controls, methodology docs, or public methodology page changes.
- `overallFundamentalScore` remains in the data model/computation for dormant phase-1 recommendation paths; it is retired from these UI surfaces only.

## 2026-06-21 - Complete Backfill Timeout Fix

### Source
Claude Code

### Objective
Complete the backfill-timeout fix omitted from the prior benchmark-button task by making Admin -> Data Sources `Backfill market history` a prices-only fetch.

### Files Changed
- `src/server/actions/dataRefreshActions.ts`
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Updated `backfillUniverseHistoryAction` so it only fetches 5-year price history with `includeBackfill: true`.
- Reduced backfill batch size from `8` to `5` and set `skipDerivedMetrics: true` so derived daily returns, anchors, market metrics, and risk metrics are handled by the numbered Admin buttons instead of the serverless backfill invocation.
- Removed inline benchmark refresh from the backfill action; benchmarks now use the dedicated `Refresh benchmarks` control added in the previous task.
- Added `export const maxDuration = 300` to the Admin Data Sources page segment config.
- Did not change the benchmark button/action, scheduled cron route, `refreshAllDataAction`, schema, scoring, labels, or methodology.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- This entry completes the backfill-timeout fix that the previous Admin Benchmark Refresh Control entry omitted.
- Operational sequence after history is complete: run buttons 2 Daily returns through 5 Risk metrics, then run Refresh benchmarks, then recommendation-run if ETF Benchmark Relative scores need recomputation.

## 2026-06-21 - Admin Benchmark Refresh Control

### Source
Claude Code

### Objective
Add a manual benchmark-refresh control to Admin -> Data Sources so operators can backfill benchmark histories, including newly seeded EFA/EEM benchmarks, without using the broader all-data refresh.

### Files Changed
- `src/server/actions/dataRefreshActions.ts`
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `refreshBenchmarksAction`, guarded by `requireAdmin()`, using `jobRunService.runManual("benchmark-refresh", ...)`.
- The action runs `container.jobs.refreshBenchmarkData.run({ lookbackDays: 1825 })`, revalidates `/admin/data-sources`, `/portfolio`, and `/risk`, and redirects back with refresh status parameters.
- Added a `Refresh benchmarks` secondary button in the Admin -> Data Sources `Market Data and ETF Look-Through` action group immediately after `Backfill market history`.
- Did not change the scheduled cron route, `refreshAllDataAction`, schema, migrations, scoring, labels, or methodology.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- This is admin-only operational tooling. It reuses the existing `benchmark-refresh` job log surface and should populate EFA/EEM benchmark snapshots after the benchmark migration is deployed.
- After running Refresh benchmarks, run recommendation-run from Admin so ETF Benchmark Relative scores can use the refreshed benchmark history.

## 2026-06-21 - ETF Benchmark Relative Scale Re-Anchor

### Source
Claude Code

### Objective
Re-anchor ETF Benchmark Relative from SCALE `200` to SCALE `100` so the component no longer saturates under current ETF return dispersion while keeping the same external-benchmark structure.

### Files Changed
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `tests/recommendations.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Changed `BENCHMARK_RELATIVE_SCALE` from `200` to `100`.
- Kept the existing `+/-0.50` excess-return winsorization and all benchmark mapping logic unchanged.
- Updated unit expectations: parity scores 50, +25pp excess scores 75, +50pp excess scores 100, -50pp excess scores 0, and missing benchmark data returns null.
- Updated methodology documentation and the public methodology page to explain that +50pp annual excess is the full-mark anchor because concentrated sector/thematic ETFs can exceed broad benchmarks by 30-50pp in strong years.

### Validation Gate
- Re-ran the live universe pass using benchmark instrument proxies where benchmark snapshot 1Y history is not yet populated.
- Benchmark Relative distribution over 196 scored ETF-like instruments: min `0`, p10 `27.8`, p25 `38.3`, p50 `48.8`, p75 `54.7`, p90 `78.9`, max `100`, pegged `6.6%`.
- Compared with SCALE `200`, pegged-at-bounds fell from `17.9%` to `6.6%`, while the median stayed close to neutral.
- International/EM checks remain fair: VWO, EEM, and INDA map to `emerging_markets`; VEA, EFA, and EWJ map to `developed_ex_us`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Scale is now frozen at `100`; no structural scoring, benchmark map, label, guardrail, feature-flag, access-control, or advisory-language change was made.
- After deploy, run benchmark-refresh from Admin to backfill EFA/EEM benchmark snapshots, then run recommendation-run from Admin. Med 29 recalibration QA should follow.
- Current live benchmark snapshots lacked full 1Y history for several benchmarks, so validation used benchmark-symbol instrument market metrics as pre-backfill proxies where needed.

## 2026-06-21 - ETF Benchmark Relative External Benchmark Scoring

### Source
Claude Code

### Objective
Make ETF `benchmark_relative` scoring a true 1Y excess-return measure against stable external asset-class benchmarks, and remove trailing 1Y return from ETF Momentum so the same performance horizon is not counted twice.

### Files Changed
- `supabase/migrations/114_add_international_benchmarks.sql`
- `src/application/services/BenchmarkService.ts`
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `src/application/services/recommendations/RecommendationService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/server/container.ts`
- `tests/recommendations.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `developed_ex_us` and `emerging_markets` benchmarks using EFA and EEM so developed ex-US and emerging-market ETFs no longer fall back to US/global benchmarks.
- Added a curated ETF category-to-benchmark map and a frozen relative score: `50 + winsorizedExcessReturn * 200`, where excess return is ETF 1Y return minus benchmark 1Y return.
- Excluded Benchmark Relative from the weighted ETF denominator when the benchmark key or benchmark 1Y return is unavailable.
- Removed trailing 1Y return from ETF Momentum, leaving Momentum as an absolute short-horizon YTD/daily component while Benchmark Relative owns 1Y relative performance.
- Wired `RecommendationService` to load active benchmark snapshots and pass benchmark 1Y returns into ETF recommendation scoring.
- Updated methodology documentation and the public methodology page with the benchmark map, scale rationale, missing-benchmark behavior, and fixed-anchor principle.

### Validation Gate
- Read-only benchmark coverage pass found all checked active ETF-like categories mapped and scored against available or post-backfill benchmark proxies.
- Benchmark Relative distribution over 201 checked ETF-like instruments: min `0`, p10 `7.0`, p25 `28.0`, p50 `47.9`, p75 `60.2`, p90 `100.0`, max `100.0`, pegged `17.9%`.
- Target median near 50 was met, but p90 was higher than the low-70s target and pegging was material. SCALE `200` was implemented as requested, but this is flagged for Claude/product sign-off before treating the scale as fully frozen.
- International/EM checks: VWO, EEM, and INDA map to `emerging_markets`; VEA, EFA, and EWJ map to `developed_ex_us`; EM ETFs do not use `sp500`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (330/330)
- `npm.cmd run build` - PASS

### Result
Completed with calibration follow-up.

### Notes for Claude
- No recommendation labels, guardrails, access controls, feature flags, or advisory wording changed.
- After deploy, run benchmark-refresh from Admin so EFA/EEM benchmark snapshots are backfilled before relying on live Benchmark Relative scores, then run recommendation-run from Admin.
- The validation gate flagged the seed scale as too aggressive in the current live universe (`p90=100`, `17.9%` pegged). A Med 29 recalibration QA/sign-off should decide whether to keep SCALE `200` or adjust before freezing.

## 2026-06-21 - Business Quality-Aware Excessive Risk Cap

### Source
Claude Code

### Objective
Soften the excessive instrument risk guardrail for Strong or Exceptional Business Quality stocks so elevated volatility caps them at Neutral rather than Weak, while preserving the stricter Weak cap for lower-quality or non-stock instruments.

### Files Changed
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/recommendations/recommendationPresentation.ts`
- `src/app/(dashboard)/recommendations/page.tsx`
- `tests/recommendations.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a shared Business Quality display helper so the guardrail uses the same Strong / Exceptional thresholds as the Insights table.
- Updated the `riskScore > 75` guardrail to cap Strong or Exceptional Business Quality stocks at `Hold` / Neutral instead of `Watch` / Weak.
- Preserved the existing behavior for lower Business Quality names, non-stock instruments with no Business Quality score, and instruments already at `Reduce` or `Sell`.
- Updated methodology documentation and the public methodology page to describe the quality-aware excessive-risk cap.
- Added tests covering Exceptional, Strong, Solid, already-`Sell`, already-`Reduce`, and ETF/null-Business-Quality cases.

### Tests Run
- `npm.cmd run test` - PASS (327/327)
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Guardrail-severity change only; no scoring math, score weights, label bands, risk-score formula, feature flags, access controls, or advisory wording changed.
- Expected after recommendation rerun: ASML, ANET, AMD, QCOM, and PYPL can move from Weak to Neutral when the excessive-risk cap is the binding guardrail and Business Quality is Strong or Exceptional; UNH, INTC, and NKE are expected to remain Weak if Business Quality is below Strong.
- After deploy, run Force refresh fundamentals if needed, then recommendation-run from Admin so stored Characteristics assessments recompute.

## 2026-06-21 - ROIC Durability Consistency Signal

### Source
Claude Code

### Objective
Restore Fundamentals Quality orthogonality by redefining the `roicDurability` signal as through-time consistency of value-creating ROIC rather than average ROIC level.

### Files Changed
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `tests/fundamentals.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced the Quality `roicDurability` average-level measure with a latest-five-annual-observation consistency measure.
- Kept Quality signal weights unchanged: ROIC durability remains 25% of Quality, and Quality remains unchanged in the Fundamentals and Business Quality composites.
- Used the recommended frozen-anchor formulation: require at least three annual ROIC observations; score 10 when average ROIC is below the 8% cost-of-capital proxy; otherwise score `coefficientOfVariation(roicSeries)` with `scoreLowerBetter(0.15, 0.60)`.
- Kept balance-sheet financials excluded from cash conversion and ROIC durability.
- Updated the internal methodology document and public methodology page to describe ROIC durability as persistence/consistency of value-creating ROIC, not average ROIC level.

### Live Read-Only Checks
- Previous annual-basis Quality correlations: vs Profitability `0.573`, vs Cash Flow `0.152`, vs Balance Sheet `0.036`.
- New Quality correlations over 94 comparable active-stock rows: vs Profitability `0.380`, vs Cash Flow `0.008`, vs Balance Sheet `-0.181`.
- Active stocks checked: `105`; stocks with Quality score: `105`; stocks with available ROIC durability signal: `94`.
- Stored-to-new sample Quality scores: NVDA `68.4 -> 51.8`, MSFT `98.1 -> 98.1`, V `99.4 -> 98.9`, CVX `70.5 -> 76.3`.

### Tests Run
- `npm.cmd run test` - PASS (326/326)
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- The recommended WACC-gated consistency formulation met the `< ~0.4` orthogonality target, so the pure-CoV fallback was not used.
- Fundamentals Quality, Business Quality, and stock Characteristics composites can shift after recomputation. This is expected from the scoring-definition refinement; no score weights, labels, or advice wording changed.
- After deploy, run Force refresh fundamentals and then recommendation-run from Admin so live scores recompute with all four Quality signals live.

## 2026-06-21 - Annual-Basis Fundamental Scoring Inputs

### Source
Claude Code

### Objective
Fix the period-selection bug where Fundamentals scoring selected the latest quarterly ratio and statement rows instead of the annual basis for growth, profitability, cash-flow, balance-sheet, and valuation inputs.

### Files Changed
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `tests/fundamentals.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added annual-basis selectors for ratios and financial statements.
- Routed growth, profitability, valuation, balance-sheet, cash-flow, and cash-flow margin inputs through the latest annual row instead of the latest row across all periods.
- Kept all anchors, thresholds, category weights, labels, financial-sector exclusions, and Quality signal definitions unchanged.
- Verified stored quarterly valuation ratios are single-quarter distorted, not TTM-like, so valuation also moved to annual basis. Examples: ASML price/sales `50.23` quarterly vs `10.83` annual; V price/sales `51.50` quarterly vs `16.57` annual.
- Added a regression test proving annual rows are selected when newer quarterly rows exist, including a seasonally negative latest-quarter FCF fixture.

### Live Read-Only Checks
- Before/after selected names (old latest-quarter -> new annual): CVX overall `28.9 -> 52.9`, ASML `37.9 -> 79.3`, V `43.2 -> 69.0`, JNJ `38.0 -> 68.9`, AMZN `39.9 -> 55.9`, WMT `36.0 -> 47.0`, EOG `77.5 -> 68.8`; XOM and MA were already using annual rows; MSFT/NVDA lacked comparable live stored rows in the read-only sample.
- Negative latest-quarter FCF recovery cases found in the live sample: ASML cash-flow `3.2 -> 92.6`, AMZN `16.5 -> 31.1`, F `12.0 -> 42.2`.
- Quality orthogonality re-check after annualizing profitability/cash-flow inputs: vs Profitability `0.573` (n=83), vs Cash Flow `0.152` (n=69), vs Balance Sheet `0.036` (n=85). Profitability correlation no longer meets the `< ~0.4` target and is logged as a follow-up; no anchor or weight changes were made in this inputs-only task.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (325/325)
- `npm.cmd run build` - PASS

### Result
Completed with QA follow-up.

### Notes for Claude
- Business Quality and overall fundamental scores will shift broadly after recomputation. This is expected from the annual-basis correctness fix, not a methodology/label change.
- After deploy, run Force refresh fundamentals and then recommendation-run from Admin before rerunning stock calibration diagnosis.
- Follow-up: reassess the Quality orthogonality target now that Profitability is also on the annual basis; live Quality vs Profitability correlation was `0.573`.

## 2026-06-21 - Financial Sector Fundamentals Guard Consistency

### Source
Claude Code

### Objective
Make financial-sector fundamentals handling consistent by expanding balance-sheet financial detection to insurers, keeping fee-based financials on industrial scoring, and applying the same financial guard to the Quality sub-score.

### Files Changed
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `tests/fundamentals.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced the bank/capital-markets-only financial detector with a financial-sector-gated curated industry detector for banks, capital markets / broker-dealers, insurance, thrifts, and mortgage finance.
- Left fee-based financial industries such as credit services / payments and asset management on the standard industrial scoring path.
- Threaded the financial flag into Quality scoring so balance-sheet financials exclude cash conversion / accruals and ROIC durability from the weighted Quality denominator.
- Added tests proving banks and insurers receive the profitability, balance-sheet, cash-flow, and Quality exclusions, while credit-services financials retain the full industrial and Quality inputs.
- Updated methodology documentation and the public methodology page to describe the corrected detection and the Quality exclusion.

### Live Read-Only Checks
- Active Financials industry strings confirmed: JPM/BAC/WFC/USB/C = `Banks - Diversified`; PNC = `Banks - Regional`; GS/MS/SCHW = `Financial - Capital Markets`; CB = `Insurance - Property & Casualty`; BRK.B = `Insurance - Diversified`; V/MA/AXP/PYPL = `Financial - Credit Services`; BLK = `Asset Management`.
- Quality orthogonality re-check over live active stocks: Quality vs Profitability `0.361` (n=81), vs Cash Flow `-0.002` (n=72), vs Balance Sheet `-0.116` (n=82). All remain below the target `~0.4`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (324/324)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Data/scoring-consistency fix only; no sector-relative recalibration, scoring labels, recommendation labels, feature flags, access controls, or advisory wording changed.
- After merge/deploy, run Force refresh fundamentals and then recommendation-run from Admin so financial stocks rescore with the corrected guard.
- Financial-sector scores remain lower-resolution because ETFVision does not yet include capital adequacy, reserve quality, asset-quality, or regulatory capital measures.

## 2026-06-20 - Forced Fundamentals Refresh Batch Rotation

### Source
Claude Code

### Objective
Fix forced fundamentals refresh so repeated forced passes advance through the whole active stock universe instead of repeatedly selecting the same first symbol-ordered batch.

### Files Changed
- `src/application/services/fundamentals/FundamentalsRefreshService.ts`
- `tests/fundamentals.test.ts`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added oldest-profile-first ordering before applying `maxStocksPerRefresh`.
- Missing, null, or invalid `lastRefreshedAt` profiles are treated as oldest.
- The same stale-first ordering applies to both forced and non-forced refreshes.
- Kept `maxStocksPerRefresh` unchanged to preserve provider-call/rate-limit protections.
- Added a regression test proving two forced passes rotate from the first oldest cohort to a different second cohort after the first batch refreshes.
- No scoring, methodology, labels, provider mapping, server action, API route, feature-flag, or access-control change.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (324/324)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Operators should run Force refresh fundamentals approximately `ceil(active stocks / maxStocksPerRefresh)` times to cover the full universe; with roughly 105 active stocks and cap 50, that is about 3 passes.
- After the forced passes complete, run the ROIC coverage query; annual `financial_ratios.roic` should approach the active-stock universe count where FMP key-metrics coverage exists.

## 2026-06-20 - Admin Force Fundamentals Refresh Control

### Source
Claude Code

### Objective
Add an Admin Data Sources control that lets operators force-refresh all active stock fundamentals, bypassing the routine stale/incomplete filter.

### Files Changed
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added a second Fundamentals action form labeled `Force refresh fundamentals`.
- The new form posts to the existing `refreshFundamentalsAction` with `returnTo=/admin/data-sources` and hidden `force=true`.
- Left the existing routine `Refresh fundamentals` button unchanged.
- Added helper copy noting that the force refresh re-fetches all active stocks, uses more provider calls, and may need a few passes.
- No server action, API route, job, service, scoring, methodology, label, feature-flag, or access-control change.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (323/323)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- This is the Admin step needed after provider-mapping fixes such as FMP key-metrics ROIC ingestion, because already-fresh stocks would otherwise be skipped by the routine refresh.
- End-to-end browser click verification was not performed in this turn; validation was by code inspection, typecheck, test suite, lint, and production build.

## 2026-06-20 - FMP Key Metrics ROIC Ingestion

### Source
Claude Code

### Objective
Populate annual and quarterly `financial_ratios.roic` by sourcing ROIC from FMP `key-metrics` while preserving existing scoring anchors, weights, sub-score definitions, and user-facing labels.

### Files Changed
- `src/infrastructure/providers/fundamentals/FmpFundamentalsProvider.ts`
- `tests/fundamentals.test.ts`
- `docs/DATA_INGESTION_AND_PROVIDERS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `key-metrics` to the FMP fundamentals fetch batch using the same symbol, period, and limit as `ratios`.
- Joined key-metrics rows to ratios rows by `date`, with a `fiscalYear|period` fallback when date is missing.
- Set normalized `roic` from ratios-supplied `returnOnInvestedCapital` / `roic` first, then key-metrics `returnOnInvestedCapital` / `roic`.
- Preserved existing missing-endpoint tolerance through the shared FMP fetch helper, so missing `key-metrics` rows leave ROIC null instead of failing the refresh.
- Added provider unit tests for key-metrics ROIC population and ratios-row ROIC precedence.
- Updated data-ingestion lineage docs to state that ROIC comes from key-metrics, not the stable ratios response.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (323/323)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Data input restoration only: no scoring anchors, weights, sub-score definitions, labels, feature flags, or access controls changed.
- After merge/deploy, run Fundamentals refresh with force and then recommendation-run from Admin so live fundamentals scores and Characteristics Scores recompute with ROIC populated.
- After that refresh, perform a read-only Supabase check for annual `financial_ratios.roic` coverage across the roughly 105 active stocks, and rerun the Quality orthogonality check to confirm correlations vs Profitability / Cash Flow / Balance Sheet remain below roughly `0.4`.
- Expected live impact: overall fundamentals, Profitability, Business Quality, Quality, and stock Characteristics composites may shift slightly for names where ROIC becomes available. This is expected data coverage restoration, not a methodology change.

## 2026-06-20 - Orthogonal Fundamentals Quality Score

### Source
Claude Code

### Objective
Redefine the stock Fundamentals `qualityScore` so it measures earnings quality and consistency using frozen economic anchors instead of re-averaging profitability, cash-flow, and balance-sheet sub-scores.

### Files Changed
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `tests/fundamentals.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Replaced the prior overlapping Quality formula with weighted available signals: earnings stability, cash conversion/accruals, ROIC durability, and capital discipline.
- Kept Business Quality category weights unchanged, with Quality still at 15% inside Business Quality and 10% in the overall Fundamentals composite.
- Kept fundamentals confidence on the `/16` denominator while updating representative availability inputs to include quality signals.
- Added tests for signal direction, pinned frozen-anchor scores, and orthogonality against Profitability, Cash Flow, and Balance Sheet.
- Updated public and internal methodology text with the frozen-anchor formula and the fixed-anchor generalization principle.

### Validation
- Fixture orthogonality check:
  - Previous Quality vs Profitability / Cash Flow / Balance Sheet: `1.000`, `1.000`, `0.999`
  - New Quality vs Profitability / Cash Flow / Balance Sheet: `0.142`, `0.098`, `0.127`
- Read-only Supabase universe pass:
  - Eligible stocks: `105`
  - Rows with comparable stored category scores: `96`
  - Previous Quality correlations: Profitability `0.855`, Cash Flow `0.739`, Balance Sheet `0.504`
  - New Quality correlations: Profitability `0.153`, Cash Flow `0.327`, Balance Sheet `-0.214`
  - New Quality distribution: min `18.73`, p25 `58.36`, median `75.04`, p75 `92.10`, max `100.00`

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (321/321)
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- User-facing methodology changed, but no labels, recommendation wording, access controls, or feature flags changed.
- Business Quality and the stock overall Characteristics composite can shift after a fundamentals refresh and recommendation run because Quality now measures orthogonal quality signals.
- The live universe pass showed ROIC durability currently had no available annual ROIC observations in the comparable sample, so the signal correctly dropped from the denominator; data coverage for annual ROIC remains worth monitoring during Med 29 recalibration QA.
- Follow-up: run Fundamentals refresh and recommendation-run from Admin, then perform Med 29 recalibration QA.

## 2026-06-20 - Separate Concentration and Diversification Scoring

### Source
Claude Code

### Objective
Remove issuer concentration from the Risk Analytics diversification score so Concentration owns concentration and Diversification measures breadth plus correlation only.

### Files Changed
- `src/application/services/risk/riskMath.ts`
- `src/application/services/risk/DiversificationService.ts`
- `src/application/services/risk/RiskAnalyticsService.ts`
- `tests/risk-math.test.ts`
- `tests/portfolio-review.test.ts`
- `src/app/methodology/page.tsx`
- `docs/SCORE_METHODOLOGY.md`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Removed the diversification `concentrationPenalty` term from `diversificationScore`.
- Simplified Diversification service inputs so top-one/top-five concentration are no longer passed into diversification scoring.
- Left Risk Analytics concentration diagnostics and warnings unchanged.
- Left Portfolio Review `ConcentrationReviewService` unchanged; added an explicit regression assertion that the representative wrapper-excluded concentration review score remains 90.
- Updated risk-math tests to assert issuer concentration inputs no longer change diversification scores.
- Updated score methodology docs and the public methodology page to show `holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run test` - PASS (318/318)
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- This is a deliberate pre-alpha scoring-methodology refinement: Risk Analytics diversification and Portfolio Review Diversification can shift upward where issuer concentration had previously reduced diversification.
- No labels, advice framing, access controls, feature flags, Concentration Review scoring, or other Portfolio Review section formulas were changed.
- Stored Portfolio Review reports must be regenerated from the Admin panel, and Risk Analytics diversification summaries refreshed, before saved/displayed numbers reflect the new formula.

## 2026-06-19 - Real Estate Exposure Impact Text Fix

### Source
Claude Code

### Objective
Fix the Real Estate / REIT candidate Exposure impact text so it uses clean observational wording instead of the generic fallback that exposed the raw issue category.

### Files Changed
- `src/application/services/portfolioReview/DiversificationBenefitService.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `realEstateWeight` to the diversification benefit context and threaded the existing Portfolio Balance Review real-estate look-through weight into candidate evaluation.
- Added a dedicated `real_estate` benefit branch that renders: `{symbol} provides exposure to real estate where real-estate look-through is {pct}.`
- Added an observational secondary benefit for REIT candidates.
- Added regression coverage for the REIT primary reason and a guard test asserting active Portfolio Balance Review candidate explanations do not leak the generic `appears for` fallback.
- Updated methodology notes to state REIT candidate explanations must reference real-estate look-through directly and must not expose internal issue-category slugs.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run test` - PASS (318/318)
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- No section score, scoring formula, trigger threshold, candidate selection rule, access control, or user-facing advisory label was changed.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the corrected REIT Exposure impact text appears in saved reports.

## 2026-06-19 - Real Estate Portfolio Balance Finding

### Source
Claude Code

### Objective
Add a low-priority Real Estate / REIT Portfolio Balance Review finding and fix the executive-summary Balance findings disclaimer capitalization.

### Files Changed
- `src/domain/portfolioReview/types.ts`
- `src/application/services/portfolioReview/gapCandidateSets.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/PortfolioReviewService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_UX_FIXES_WIP.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `insufficient_real_estate_exposure` as a Portfolio Balance Review issue category.
- Added a low-priority "Real Estate - Lightly Represented Category" finding when real estate look-through exposure is below 3.0% and eligible REIT candidates exist.
- Ranked broad US REIT representatives (`VNQ`, `SCHH`, `IYR`, `USRT`, `FREL`, `XLRE`, `RWR`) ahead of mortgage, international, or global REIT variants for this sleeve.
- Kept the REIT candidate list flat and capped at four candidates.
- Exposed the executive-summary text through a pure helper and covered the capitalized "Balance findings are deterministic..." disclaimer with a regression test.
- Updated Portfolio Review methodology and WIP notes for the REIT sleeve behavior.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (317/317)

### Result
Completed.

### Notes for Claude
- No existing section score, scoring formula, trigger threshold, access control, or user-facing advisory label was changed.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the new REIT finding or updated summary text appears in saved reports.

## 2026-06-19 - Portfolio Review Backlog Clearance

### Source
Claude Code

### Objective
Clear three Portfolio Review backlog items: user-facing Portfolio Balance Review rename, behavior-preserving wrapper-exclusion DRY cleanup, and cosmetic/taxonomy guard coverage.

### Files Changed
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/application/services/portfolioReview/portfolioIssuerExposure.ts`
- `src/application/services/portfolioReview/gapCandidateSets.ts`
- `src/application/services/portfolioReview/portfolioReviewDisplay.ts`
- `tests/portfolio-review.test.ts`
- `tests/taxonomy.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_UX_FIXES_WIP.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Renamed user-facing Portfolio Review section language from Gap Analysis to Portfolio Balance Review and from Analytical Gap Summary to Portfolio Balance Summary.
- Softened generic finding suffixes from Underweighted Category to Lightly Represented Category while leaving issue-specific titles such as Ballast Underweighted and Recession Hedge Underweighted unchanged.
- Extracted shared wrapper-exclusion issuer helpers for Concentration Review, Risk Analytics, and Portfolio Review page display without changing score or issuer aggregation behavior.
- Co-located gap-engine curated sets in `gapCandidateSets.ts` without changing membership.
- Updated country-count labels to use the `â‰¥` glyph and tightened exchange-suffix cleanup so `BRK.B` is preserved while foreign suffixes such as `.TW` are stripped.
- Added regression tests for wrapper-excluded Concentration/Risk equivalence and curated taxonomy normalization.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (314/314)

### Result
Completed.

### Notes for Claude
- No `issueCategory`, `gapCandidateDisplay.ts`, scoring formula, trigger, section-score, or access-control identifier was renamed.
- Part B is behavior-preserving; the regression test confirms Concentration Review and Risk Analytics use identical wrapper-excluded issuer top-one/top-five semantics.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the renamed display strings appear for saved reports.

## 2026-06-19 - International Gap Subsection Presentation

### Source
Claude Code

### Objective
Present the Portfolio Review International Equity gap finding as per-sub-role subsections instead of a flat one-per-role candidate list.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/gapCandidateDisplay.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- International Equity candidate selection now returns up to two representatives per ex-US sub-role: Broad ex-US, Developed markets, and Emerging markets.
- Added International grouping helpers that mirror the Defensive Sectors subsection presentation.
- The Portfolio Review page now renders International candidates through the same grouped card path used by Defensive Sectors, with Broad ex-US framed as the all-in-one option.
- IXUS now routes to `international_equity` and SPDW routes to `developed_international_equity`; VT, ACWI, and IOO remain excluded as global-including-US candidates.
- No section-score, scoring formula, trigger, or disclaimer wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (312/312)

### Result
Completed.

### Notes for Claude
- This supersedes the prior flat 1-per-role International display with per-sub-role subsections while preserving the same category-remedy intent.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the UI reflects this updated grouping.

## 2026-06-19 - Portfolio Review Polish Items

### Source
Claude Code

### Objective
Apply four low-risk Portfolio Review polish fixes covering International Equity candidate variety, country-count labels, inflation hedge acknowledgement, and display consistency.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/MacroFitReviewService.ts`
- `src/application/services/portfolioReview/portfolioReviewDisplay.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_UX_FIXES_WIP.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- International Equity gap selection now returns one core representative per ex-US sub-role first: total ex-US, developed international, and emerging-market.
- Portfolio Review metric labels clarify materiality thresholds: `Countries >=1%` and `Look-through countries >=3%`.
- Macro Fit inflation finding now acknowledges existing inflation-sensitive holdings such as TIP and GLD when present.
- Gap titles now use a consistent em dash separator, and overlap display text prefers company names over exchange-suffixed tickers.
- Defensive gap selection remains unchanged.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (311/311)

### Result
Completed.

### Notes for Claude
- No scoring-methodology formula, section score, trigger threshold, or compliance disclaimer changed.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the UI reflects these polish changes.

## 2026-06-19 - Portfolio Review Gap Trigger and Breadth Ordering Fixes

### Source
Claude Code

### Objective
Fix crypto-ballast trigger semantics, grade International Equity breadth ordering, and tighten the International Equity trigger to genuine international underweight.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- `excessive_crypto_risk` now fires only when crypto/high-volatility alternative exposure is above 5% and bond-plus-gold ballast is lower than crypto exposure.
- International category representative scoring is now graded: core ex-US funds score above hedged/subset variants, which score above global-including-US funds; country and international-dividend funds remain below all representatives.
- `insufficient_international_exposure` now fires from US/international look-through underweight only, not top-holding concentration or low diversification score side effects.
- Defensive broad-sleeve ordering remains unchanged.
- Updated Portfolio Review methodology and QA documentation.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (308/308)

### Result
Completed.

### Notes for Claude
- No section score, scoring-methodology formula, disclaimer chip, or candidate wording changed.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the corrected trigger behavior and ordering appear.

## 2026-06-19 - International Gap Broad ETF Ordering

### Source
Claude Code

### Objective
Make the Portfolio Review International Equity gap finding lead with broad ex-US diversified ETFs instead of narrower country or international-dividend ETFs.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/gapCandidateDisplay.ts`
- `src/domain/portfolioReview/types.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a shared category-representative score used by both international and defensive category-remedy candidate ordering.
- International gap selection now prefers broad ex-US representatives such as VXUS, VEA, VWO, and IEMG before narrower country or international-dividend ETFs such as DXJ, SCHY, IDV, JPXN, and EWJ.
- Portfolio Review display sorting now respects the same category-representative score before issue-fit and quality tie-breakers.
- Defensive broad-sleeve preference continues to use the shared helper and remains unchanged in behavior.
- Updated methodology and QA documentation.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (307/307)

### Result
Completed.

### Notes for Claude
- No trigger, score, section-score, disclaimer, or compliance wording changed.
- Stored Portfolio Review reports must be regenerated from the Admin panel before the new candidate ordering appears in already-saved reports.

## 2026-06-19 - Curated Instrument Taxonomy Source Fix

### Source
Claude Code

### Objective
Fix ETF and stock canonical sector/theme normalization at the source so `instruments.canonical_sector` and `canonical_themes` are curated-authoritative for all consumers, not only Portfolio Review gap analysis.

### Files Changed
- `src/application/services/taxonomy/TaxonomyService.ts`
- `src/application/services/MetadataRefreshService.ts`
- `src/app/api/jobs/instrument-metadata-refresh/route.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/taxonomy.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/DATA_INGESTION_AND_PROVIDERS.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added curated `EtfCategory` to canonical sector/theme mapping in `TaxonomyService`.
- ETF sector normalization now resolves mapped ETF symbols through `ALPHA_ETF_CATEGORIES` before provider raw sector/industry fallbacks.
- Stock sector normalization now resolves mapped stock symbols through `ALPHA_STOCK_SECTORS` before provider raw sector/industry fallbacks.
- Removed blanket `ETF`, `Sector ETF`, `Broad Market`, and `US Broad Market` theme aliases that applied `Global Diversification` to US-only sector funds.
- Stopped mapped ETFs from deriving themes from raw provider sector/industry labels; themes now come from curated categories, seeded tags, and explicit non-ETF raw fields.
- Retired Portfolio Review candidate-role inference from the `Global Diversification` theme and expanded curated ETF category roles for international/global categories.
- Added a protected taxonomy-only backfill path via `/api/jobs/instrument-metadata-refresh?taxonomyBackfill=true` to re-normalize active rows without refetching provider metadata.
- Added taxonomy tests for sector ETFs, global/ex-US ETFs, US sector ETF theme absence, and stock source-of-truth sector overrides.
- Updated methodology, ingestion, documentation-gap, QA, and implementation-log documentation.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (306/306)

### Result
Completed.

### Notes for Claude
- Expected downstream data effect after taxonomy backfill: `Global Diversification` should drop sharply because US sector and US broad-market ETFs no longer receive that blanket theme.
- Corrected ETF examples include FXU/VPU as Utilities, IYH as Healthcare, VFH as Financials, and VDE as Energy.
- Stock sectors are re-checked from `ALPHA_STOCK_SECTORS`; for example MSFT remains Technology even if a provider raw sector is incorrect.
- Live taxonomy backfill was run through `/api/jobs/instrument-metadata-refresh?taxonomyBackfill=true`; diagnostic SQL moved `mis_sectored_mapped_etfs` from 67 to 0 and `us_sector_etfs_with_global_diversification` from 91 to 0.
- Portfolio Review must be re-run from the Admin panel so stored reports reflect the corrected instrument taxonomy.

---
## 2026-06-19 - Defensive Gap Title, Broad ETF Preference, and Tooltip Fix

### Source
Claude Code

### Objective
Rename the Portfolio Review defensive gap finding, exclude narrow healthcare sub-theme ETFs from that finding, prefer broad defensive sector ETFs within each sleeve, and make defensive candidate tooltips sleeve-aware.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/gapCandidateDisplay.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Renamed the defensive gap finding to `Defensive Sectors â€” Underweighted Category` and kept a page-level legacy text rewrite for stored reports still carrying the old title.
- Excluded XBI, IBB, and ARKG from `insufficient_defensive_exposure` candidate selection.
- Added a broad defensive-sector preference so XLV/VHT, XLU/VPU, and XLP/VDC rank ahead of narrower or global variants within the defensive sleeve cap.
- Added `defensiveGapTooltipCategory()` so defensive finding tooltips use the candidate's actual sleeve category, such as Utilities, Consumer Staples, or Healthcare.
- Extended regression coverage for broad ETF preference, non-defensive healthcare exclusions, ballast exclusion, and sleeve-aware tooltip categories.
- Updated Portfolio Review methodology and QA notes to match the defensive finding behavior.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (303/303)

### Result
Completed.

### Notes for Claude
- Before this change, the defensive finding could surface narrow healthcare sub-theme ETFs such as XBI/ARKG and narrower utilities variants such as FXU/JXI ahead of broad sleeve representatives.
- After this change, the defensive finding selects broad sleeve examples first, such as XLV/VHT for Healthcare and XLU/VPU for Utilities, while International and Crypto-Ballast findings remain unchanged.
- The tooltip category for a Utilities defensive candidate now resolves to Utilities rather than a generic or Healthcare-derived defensive category.
- No trigger, score, section score, feature flag, or access-control behavior changed.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Defensive Gap Equity-Sleeve Scope

### Source
Claude Code

### Objective
Restrict the Portfolio Review Healthcare & Defensive gap finding to the three equity defensive sleeves so treasury/cash ballast instruments remain in fixed-income, crypto-ballast, or macro findings instead of duplicating inside the defensive finding.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Filtered `rankedDefensiveCandidates()` to iterate only `utilities_defensive`, `consumer_staples_defensive`, and `healthcare_defensive`, preserving the existing most-underweight-first sleeve order and two-candidate-per-sleeve cap.
- Left `groupDefensiveGapCandidates()` unchanged; with ballast excluded upstream, the defensive finding no longer produces a `Defensive Ballast` subsection.
- Extended the defensive selection regression test with BND and GOVT and asserted they are excluded from defensive candidates while the Crypto-Ballast finding still surfaces BND.
- Updated Portfolio Review methodology wording so the defensive finding is documented as equity-sector-sleeve-only.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (302/302)

### Result
Completed.

### Notes for Claude
- Defensive finding now shows only Utilities, Consumer Staples, and Healthcare subsections.
- Crypto-Ballast and Fixed-Income findings continue to use `rankedCandidates()` and remain the place where treasury/cash ballast instruments can appear.
- No finding trigger, score, section score, wording, feature flag, or access-control behavior changed.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Defensive Gap Per-Sleeve Candidate Sections

### Source
Claude Code

### Objective
Restructure the Portfolio Review Healthcare & Defensive gap finding so candidates are selected and displayed by defensive sleeve instead of one flat list dominated by the most-underweight sleeve.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/gapCandidateDisplay.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added defensive-only candidate selection that groups eligible candidates by role and takes up to two per sleeve in the existing most-underweight defensive role order.
- Added a pure `groupDefensiveGapCandidates()` display helper that buckets candidates into Utilities, Consumer Staples, Healthcare, and defensive ballast groups while preserving incoming order.
- Updated the Portfolio Review page so only the `insufficient_defensive_exposure` finding renders per-sleeve subsections; International, Crypto, and other gap findings remain flat.
- Preserved finding triggers, score calculations, issue-fit scoring, non-defensive candidate ordering, and compliance disclaimer chips.
- Added regression tests for per-sleeve backend selection and display grouping.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (302/302)

### Result
Completed.

### Notes for Claude
- Before this change, a defensive finding could show five Utilities candidates after Utilities became the most-underweight sleeve.
- After this change, the defensive finding can show per-sleeve subsections such as Utilities, Consumer Staples, and Healthcare, with no more than two candidates per sleeve.
- International and Crypto gap findings remain flat lists and their selection path still uses `rankedCandidates()`.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Portfolio Review ETF Sector Classification Fallback

### Source
Claude Code

### Objective
Fix systemic ETF sector mis-classification in Portfolio Review Gap Analysis so curated US sector ETFs do not fall through to broad/global roles because of stale or generic canonical sector metadata.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a curated `ALPHA_ETF_CATEGORIES` fallback inside `candidateRole()` for dedicated ETF sector categories: Healthcare, Utilities, Consumer Staples, Energy, Financials, Industrials, and Real Estate.
- Preserved existing symbol overrides and correctly enriched canonical sector precedence before the curated ETF fallback.
- Added a defensive finding consistency guard so international/global equity roles cannot enter `insufficient_defensive_exposure`.
- Added regression coverage for an FXU-like Utilities ETF routing to `utilities_defensive` instead of `global_equity`, and for VXUS remaining an international candidate while being excluded from the defensive gap.
- Updated Portfolio Review methodology documentation to describe the curated ETF fallback and defensive-gap role guard.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (300/300)

### Result
Completed.

### Notes for Claude
- FXU-like US sector ETFs now route to sector-specific defensive roles when their curated ETF category supports one, so defensive gap examples no longer show non-US/global-equity explanations for those instruments.
- VXUS-style international ETFs remain international candidates and can still appear in the International Equity finding.
- Gap triggers, ordering mechanics, section scores, penalties, and benefit scoring were not changed.
- Part B was completed later on 2026-06-19: database enrichment/backfill now corrects stale `canonical_sector` and `canonical_themes` values for consumers outside this Portfolio Review candidate-role fallback.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Defensive Gap Sleeve-Aware Role Priority

### Source
Claude Code

### Objective
Make the Portfolio Review `insufficient_defensive_exposure` gap finding prioritize the most-underweight defensive sector sleeve in look-through exposure.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `utilitiesWeight` and `consumerStaplesWeight` to `SuggestionContext`, populated from look-through sector exposures using the same pattern as `healthcareWeight`.
- Extracted `buildPortfolioImprovementSuggestionContext()` so context construction remains shared by runtime code and tests.
- Made `rolePriority("insufficient_defensive_exposure", context)` sort healthcare, utilities, and consumer staples roles by lowest sleeve weight first, with deterministic healthcare -> utilities -> consumer staples tie order.
- Preserved the existing stock exclusion for defensive candidates, the service candidate selection mechanics, section scores, and other finding triggers.
- Updated the defensive gap rationale to state the measured sleeve weights factually.
- Added tests for sleeve ordering, tie determinism, context weights, and higher `issueFitScore` for the most-underweight sleeve.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (298/298)

### Result
Completed.

### Notes for Claude
- Example sleeve order when healthcare is 12.0%, utilities is 0.0%, and consumer staples is 4.0%: utilities_defensive -> consumer_staples_defensive -> healthcare_defensive -> short_treasury_cash_like -> core_us_bond.
- With utilities most underweight, XLU receives higher `issueFitScore` than XLP, which receives higher `issueFitScore` than XLV in the regression test.
- This is sub-category-level observational targeting only; no score, trigger, buy/sell language, or position sizing logic changed.
- Visible utilities/staples breadth remains limited until the separate #ETF-TAXONOMY task fixes sector ETF classification/routing.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Gap Analysis Defensive ETF Examples and Category-Fit Display Order

### Source
Claude Code

### Objective
Improve Portfolio Review Gap Analysis candidate examples by excluding single stocks from the Healthcare & Defensive gap and displaying selected candidates by category fit rather than standalone instrument quality.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/gapCandidateDisplay.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a stock exclusion guard for `insufficient_defensive_exposure` issue fit so Healthcare & Defensive candidate examples come from diversified ETFs/funds rather than individual healthcare stocks.
- Added a pure `compareGapCandidatesByCategoryFit()` helper that sorts already-selected candidate cards by `issueFitScore` descending and then `recommendationScore` descending.
- Updated the Portfolio Review Gap Analysis card description and "Ordered by" chip from `Instrument quality` to `Category fit` while keeping the per-card Quality badge.
- Added tests for defensive ETF-only candidates and category-fit display sorting.
- Updated Portfolio Review methodology to document defensive stock exclusion and display ordering.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (295/295)

### Result
Completed.

### Notes for Claude
- Verified XLV, VHT, XLU, and XLP are present in the seeded universe and default active.
- Defensive gap examples move from single-stock names such as ISRG, AMGN, GILD, BMY, and PFE to diversified sector ETFs such as XLV, VHT, XLU, and XLP after a fresh Portfolio Review run.
- Candidate selection still occurs in the service via `candidateRankScore`; this task changes display order for the selected cards to category-intrinsic fit.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Insight Alignment Score Cap and Coverage Display

### Source
Claude Code

### Objective
Fix Portfolio Review Insight Alignment so a watch/attention finding cannot display with a 95-100 section score, and format recommendation coverage as a percentage.

### Files Changed
- `src/application/services/portfolioReview/RecommendationAlignmentReviewService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `src/app/methodology/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Preserved the Insight Alignment raw formula terms: `60 + constructiveHeldCount * 4 - weakHeldCount * 8 + coverage * 12`.
- Added a presentation cap of 94 whenever the section has any non-info finding, covering both weak-holding and incomplete-coverage findings.
- Added `coverage` to the Portfolio Review page ratio metric detector so `recommendationCoverage: 1` renders as `100%`.
- Added tests for weak-holding cap, incomplete-coverage cap, and clean-section 100 score.
- Updated methodology documentation and the public methodology page to describe the cap.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (293/293)

### Result
Completed.

### Notes for Claude
- Reference Portfolio Review Insight Alignment moves from 100 to 94 when the existing `Some holdings need review` finding is present.
- `Recommendation Coverage` now renders as `100%` instead of `1`.
- Portfolio Review must be re-run from the Admin panel to regenerate stored reports.

---
## 2026-06-19 - Wrapper-Excluded Diversification Penalty Fix

### Source
Claude Code

### Objective
Fix the Task 2 issuer-level diversification penalty so it uses wrapper-excluded underlying-company concentration, matching the Concentration Review section basis.

### Files Changed
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/app/methodology/page.tsx`
- `tests/risk-math.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `wrapperExcludedIssuerConcentration()` to derive diversification penalty top-one/top-five from latest Portfolio Review holding exposures while excluding direct ETF, bond ETF, gold ETF, crypto ETF, and cash-proxy wrappers.
- Kept direct single-stock holdings included in the underlying-company rollup.
- Replaced the prior `exposureContext.issuerExposures` concentration input, which could include ETF wrappers such as VOO, with the wrapper-excluded rollup.
- Left `holdingScore`, direct concentration metadata, and Risk page direct-concentration warnings unchanged.
- Added a regression test where VOO is 30% direct but NVDA is 8% underlying; the helper returns 8% top-one and the diversification score is materially higher than the direct-concentration result.
- Updated score methodology, Portfolio Review methodology, and public methodology wording to specify wrapper-excluded underlying-company concentration.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (290/290)

### Result
Completed.

### Notes for Claude
- Live symptom corrected: the penalty input should no longer treat VOO around 30% as the top issuer; it should use the top underlying company, e.g. NVDA around 7.9%, when fresh look-through is available.
- Reference portfolio before the Task 2 change was approximately 79; the incorrect intermediate fix only moved to approximately 80 because VOO still dominated. After this correction and a fresh risk/report refresh, the expected movement is into the high-80s.
- Risk Analytics / risk-report refresh and Portfolio Review refresh are required before stored pages show the corrected value.

---
## 2026-06-19 - Issuer-Level Risk Diversification Concentration Penalty

### Source
Claude Code

### Objective
Make the Risk Analytics and Portfolio Review diversification score use issuer-level look-through top-one and top-five concentration for the diversification concentration penalty when issuer exposure is available, with direct concentration fallback.

### Files Changed
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/application/services/risk/RiskAnalyticsService.ts`
- `src/application/services/risk/DiversificationService.ts`
- `src/application/services/risk/CorrelationService.ts`
- `src/app/methodology/page.tsx`
- `tests/risk-math.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Refactored `RiskAnalyticsDataService.buildReport()` to compute the existing portfolio exposure context once, derive issuer-level top-one and top-five concentration from `issuerExposures`, and pass those values into `RiskAnalyticsService.calculateRiskAnalytics()`.
- Updated `RiskAnalyticsService.calculateRiskAnalytics()` to use issuer-level concentration only for `DiversificationService.score()` inputs when available; direct concentration remains the fallback.
- Left `holdingScore`, Risk page direct-concentration warnings, and the `concentration` metadata object on direct holding concentration.
- Left `riskMath.diversificationScore()` formula unchanged; only the upstream concentration inputs changed.
- Added service-level regression tests for diversified-wrapper improvement, direct fallback, genuine issuer-concentration penalty, and direct holding-count behavior.
- Updated score methodology, Portfolio Review methodology, and public methodology page text to describe issuer-level concentration penalty inputs and direct fallback.
- Converted risk-service runtime imports touched by the new tests to relative/type-only imports so the compiled Node test runner can load the service directly.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (289/289)

### Result
Completed.

### Notes for Claude
- Existing live/reference portfolio baseline from the task prompt: diversification score was approximately 79 before this change; after risk-report refresh with issuer look-through available, expected movement is toward the high-80s.
- Exact live after-value requires re-running Risk Analytics / risk-report refresh and then re-running Portfolio Review so stored reports read the updated risk diversification score.
- Risk Analytics page and Portfolio Review both read the same stored `riskReport.diversification.score`, so they should move together after refresh.
- Direct concentration warnings and the direct `concentration` metadata object intentionally remain unchanged.

---
## 2026-06-19 - Issue-Aware Gap Candidate Primary Reasons

### Source
Claude Code

### Objective
Make Portfolio Review gap-analysis candidate `primaryReason` text issue-category-aware for `excessive_crypto_risk` and `concentration_risk`.

### Files Changed
- `src/application/services/portfolioReview/DiversificationBenefitService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added issue-category-specific `primaryReason` overrides for crypto-ballast bond, treasury, fixed-income, and credit candidates.
- Added issue-category-specific `primaryReason` overrides for concentration-risk international/geographic diversifiers and ballast candidates.
- Left the existing technology-overlap override intact so it still wins for technology-dominant candidates that are not strong diversifiers.
- No score, overlap penalty, finding, secondary benefit, role-priority, or candidate-filtering logic changed.
- Added regression assertions for crypto-ballast text, concentration-risk text, and unchanged insufficient-fixed-income bond text.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (285/285)

### Result
Completed.

### Notes for Claude
- Portfolio Review must be re-run from the Admin panel to regenerate stored report text.
- Before crypto-ballast bond candidate text: `BND provides exposure to fixed income where bond allocation is 0.0%.`
- After crypto-ballast bond candidate text: `BND is a bond or treasury instrument. Ballast characteristics such as these may differ from crypto and high-volatility alternative exposure.`

---
## 2026-06-19 - Portfolio Review Issuer-Level Concentration Coherence

### Source
Claude Code

### Objective
Make Portfolio Review concentration measurement coherent by using underlying-company issuer look-through concentration on a total-value basis for the Concentration Review section and `concentration_risk` gap finding.

### Files Changed
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `src/app/methodology/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/SCORE_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Changed Concentration Review top-one measurement from wrapper/direct concentration to issuer-level underlying-company concentration when look-through exists, falling back to direct concentration only when issuer rows are unavailable.
- Included direct single-stock holdings in issuer exposure while excluding diversified ETF, bond ETF, gold ETF, crypto ETF, and cash-proxy wrappers from single-company concentration measurement.
- Recalibrated the Concentration section formula to `90 - max(0, topIssuerConcentration - 0.10) * 150 - max(0, topCombinedFive - 0.40) * 80 - max(0, sectorTop - 0.40) * 60`.
- Replaced the old largest-holding finding with issuer-level single-company findings: watch above 10%, attention above 20%.
- Lowered top-five issuer concentration finding to watch above 50%.
- Raised `concentration_risk` gap threshold from >5% to >10%, with high priority above 15%.
- Changed `concentration_risk` candidate roles to diversified products only and excluded stock instruments from that issue fit.
- Added total-value basis labels to Direct Portfolio Positions and Top Underlying Company Exposure.
- Updated methodology documentation and public methodology page to describe issuer-level, total-value concentration measurement.
- Added tests for ETF-wrapper false-positive removal, watch/attention thresholds, direct single-stock inclusion, fallback behaviour, concentration-gap thresholding, and stock-candidate exclusion.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (285/285)

### Result
Completed.

### Notes for Claude
- Expected reference portfolio Concentration section score moves from approximately 69 to approximately 90 when the largest issuer is below 10%, top five issuers are below 40%, and largest sector is below 40%.
- `largestDirectHolding` metadata still retains wrapper/product visibility such as VOO, but diversified ETF wrappers no longer trigger single-company concentration findings.
- Risk Analytics diversification scoring (`riskMath` / `RiskAnalyticsService`) was intentionally not changed; issuer-level diversification score migration remains a separate follow-on task.
- Portfolio Review must be re-run from the Admin panel to regenerate stored reports and confirm the score jump with owner approval.

---
## 2026-06-18 - Harden Portfolio Review Gap Analysis Tests

### Source
Claude Code

### Objective
Make the macro vulnerability test self-documenting and remove the dead `sector_concentration` candidate-priority branch after the duplicate gap trigger cleanup.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Updated the macro vulnerability regression test to explicitly set allocation by type to 85% equity ETF, 10% bond ETF, and 2% gold ETF so recession-hedge allocation is fixed at 12%.
- Removed the dead `sector_concentration`/`theme_concentration` branch from `rolePriority()`.
- Left a comment noting `theme_concentration` is currently a reserved issue category with no active gap-analysis trigger.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (280/280)

### Result
Completed.

### Notes for Claude
- No scoring methodology, portfolio calculation logic, or user-facing compliance wording changed.

---
## 2026-06-18 - Fix Duplicate Portfolio Review Gap Findings

### Source
Claude Code

### Objective
Remove duplicate gap findings in `PortfolioImprovementSuggestionService` and add analytically distinct triggers for crypto ballast, single-name look-through concentration, and macro growth-regime vulnerability.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Removed the legacy `sector_concentration` trigger and the duplicate `concentration_risk` trigger that repeated the international underweight message.
- Expanded the international gap condition to absorb portfolio concentration/diversification signals without creating a duplicate concentration finding.
- Broadened the defensive underweight trigger to use dominant-sector and technology exposure signals.
- Added distinct factual triggers for crypto/alternative ballast, single-name look-through concentration, and slowing-growth macro vulnerability.
- Updated concentration-risk candidate ordering to prioritize defensive, hedge, and fixed-income roles before international equity.
- Added regression tests for duplicate removal, new trigger thresholds, macro gating, and concentration candidate ordering.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (280/280)

### Result
Completed.

### Notes for Claude
- New gap rationales are observational and include "Analytical observation only - not a position sizing recommendation." where the finding could otherwise sound action-oriented.
- No scoring methodology, recommendation labels, user-facing investment advice language, or portfolio calculation logic was changed.

---
## 2026-06-18 - Drop 'symbol' from FMP holdingSymbol field fallback

### Source
Claude (direct)

### Objective
Prevent FMP cash, derivative, and money-market rows with a blank `asset` field from being stored as self-referential ETF holdings (e.g. VOO appearing as its own top holding).

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
- `docs/implementation-log.md`

### Summary
Root cause investigation confirmed that FMP's `/stable/etf/holdings` response includes rows for cash positions, securities-lending collateral, and derivative instruments that have `asset: ""`. The `textField` helper fell through to the `"symbol"` key, which FMP always sets to the parent ETF ticker. This caused every blank-asset row to be stored as `holding_symbol = "VOO"` (or VT, QQQ etc.), making the ETF appear to hold itself.

Removed `"symbol"` from the holdingSymbol field priority list:
- Before: `["asset", "ticker", "holdingSymbol", "symbol"]`
- After: `["asset", "ticker", "holdingSymbol"]`

With `holdingSymbol = null` these rows now hit the existing `if (!holdingSymbol || holdingWeight == null) return []` guard and are dropped cleanly. Cash and non-ticker instruments should not be stored in `etf_top_holdings`.

### Manual follow-up
Run in Supabase SQL editor to remove existing self-referential rows from the database:
```sql
DELETE FROM etf_top_holdings WHERE holding_symbol = etf_symbol;
```
This removes rows such as VOO holding VOO (weight 0.18%), VT holding VT (0.82%), QQQ holding QQQ (0.11%), IVV holding IVV (0.19%), and SPY holding SPY (0.20%). These originated from the blank-asset FMP data bug and carry no analytical meaning. Re-refresh is not required â€” the fix prevents new self-referential rows on next ingestion.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- FMP returns blank-asset rows for: Vanguard market-liquidity instruments ("MKTLIQ 12/31/2049"), securities-lending collateral ("SLBBH1142"), cash ("US Dollar"), futures ("CME E-Mini NASDAQ 100"), and various currency positions. VT has 505 such rows due to its broad international mandate and many local cash instruments.
- `"symbol"` must never be re-added to the holdingSymbol field list. In FMP's ETF holdings schema, `symbol` is always the parent ETF ticker, not the holding ticker.

---
## 2026-06-18 - Exclude equity ETF sub-holdings during portfolio look-through accumulation

### Source
Claude (direct)

### Objective
Prevent ETF wrappers (VOO, VT, QQQ, etc.) from appearing in "Top Underlying Company Exposure" and "Top Indirect Company Exposure" in Portfolio Review.

### Files Changed
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `docs/implementation-log.md`

### Summary
After the Security Master and issuer-link backfill, ETF wrappers appeared in company exposure with tiny indirect weights (VOO 0.05%, VT 0.06%, QQQ 0.01%). Root cause: some ETFs in the portfolio had blank-asset FMP rows that were stored as self-referential holdings (see entry above). These rows gave VOO/VT/QQQ a small holding weight inside other ETFs, which was then accumulated as indirect company exposure.

Added a Set `equityEtfSymbols` containing the uppercased symbols of all equity ETFs in the universe. Added a `continue` guard at the start of the `for (const holding of etfHoldings)` loop to skip any holding whose `holdingSymbol` is in `equityEtfSymbols`.

This serves as a belt-and-suspenders defence: even if a blank-asset FMP row slips through in future (or if a genuine fund-of-funds structure appears), equity ETF wrappers will never accumulate as indirect company exposure.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

---
## 2026-06-18 - Fix ETF holdings refresh batch ordering â€” sort by holdings date

### Source
Claude (direct)

### Objective
Fix the ETF look-through refresh job so each batch of 50 ETFs advances through the backlog rather than repeating the same first-50 alphabetically.

### Files Changed
- `src/application/ports/repositories/EtfExposureRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `src/application/services/etfLookthrough/EtfLookthroughRefreshService.ts`
- `docs/implementation-log.md`

### Summary
Root cause: `getLatestExposureDateForEtf()` queries `etf_sector_exposures`. After full sector backfill (169/169), every ETF had sector date = "2026-06-18". All 169 passed the stale cutoff check and the first 50 alphabetically were selected every pass â€” no progress on ETFs missing holdings data.

Fix: added `getLatestHoldingsDateForEtf()` to `EtfExposureRepository` interface and `SupabaseEtfExposureRepository`, querying `etf_top_holdings` for the latest `as_of_date` per ETF. Changed `EtfLookthroughRefreshService.refresh()` to collect all eligible ETFs first, then sort by `holdingsLatest` ascending (nulls first â€” ETFs with no holdings data are prioritised), then slice to `maxEtfsPerRun`. Each pass now reliably covers the 50 ETFs furthest from holdings coverage.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- `getLatestExposureDateForEtf()` remains in place and is still used for the stale cutoff check. It is not replaced â€” the holdings date is only used for priority ordering within the eligible set.

---
## 2026-06-18 - Fix FMP weightPercentage normalisation (100x weight overstatement)

### Source
Claude (direct)

### Objective
Fix ETF holdings weights being stored at 100x their correct value for holdings below 1%.

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
- `docs/implementation-log.md`

### Summary
Root cause: FMP's `weightPercentage` field is always on a 0â€“100 scale (e.g. 7.89 = 7.89%, 0.93 = 0.93%). The existing `normalizeWeight()` function uses a heuristic: `value > 1 ? value / 100 : value`. For holdings below 1%, `weightPercentage` is less than 1 (e.g. 0.93 for XOM at ~0.93%), so `normalizeWeight` treated it as an already-normalised fraction and stored 0.93 (93%) instead of 0.0093 (0.93%). This caused a 100x overstatement for all holdings below 1%.

Fix: added a `normalizePercentage()` function that always divides by 100, bypassing the `> 1` heuristic. Used `normalizePercentage` specifically for the `weightPercentage` field across holdings, sector, and country exposure ingestion. The generic `normalizeWeight` heuristic is retained for other weight fields (`weight`, `percentage`, `assetPercentage`, `value`) as a fallback.

```typescript
function normalizePercentage(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value / 100;
}
```

### Manual follow-up
After deploying this fix, all 169 ETFs were re-refreshed from the admin panel to replace incorrect weight data. `sync_etf_holding_security_ids()` was re-run to restore `holding_security_id` mappings on the fresh rows (upsert resets `holding_security_id` to null on conflict). Confirmed via cross-check: NVDA weight in VOO = 7.89% (raw from FMP), stored = 0.07899, portfolio review indirect = 30.62% Ã— 7.89% = 2.42% â€” matches report.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- `normalizeWeight` must not be used for FMP `weightPercentage`. The `> 1` heuristic is only valid for weight fields that may be expressed in either 0â€“1 or 0â€“100 scale depending on the provider. FMP `weightPercentage` is always 0â€“100.
- Sector and country exposure weights from FMP also use `weightPercentage` and are now correctly normalised.

---
## 2026-06-18 - Fix portfolio review 414 URL-too-large on issuer link fetch

### Source
Claude (direct)

### Objective
Fix HTTP 414 Request-URI Too Large error when running Portfolio Review, caused by Supabase `.in()` serialising thousands of security IDs as GET URL parameters.

### Files Changed
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `docs/implementation-log.md`

### Summary
`listIssuerLinksForSecurityIds()` fetched issuer links using a single `.in("security_id", ids)` query. After Security Master backfill created 3,724 issuer links, the query passed ~3,800 UUIDs as URL parameters, exceeding Cloudflare's URL length limit and returning HTTP 414.

Fix: chunked the security ID array into batches of 150 and executed all chunks in parallel using `Promise.all`. Same pattern applied to the issuer ID lookup immediately after. Initial sequential implementation was corrected to parallel in the same session to avoid latency regression (~1.3s per sequential chunk).

```typescript
const CHUNK = 150;
const chunks = <T>(arr: T[]) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, (i + 1) * CHUNK));
const linkResults = await Promise.all(chunks(ids).map(async (chunk) => { ... }));
```

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- Supabase `.in()` uses GET requests with URL-encoded parameters. Any `.in()` query on UUIDs should be chunked if the ID list can exceed ~150 entries. The Cloudflare URL limit is ~8KB; a UUID is 36 characters, so 150 UUIDs â‰ˆ 5.4KB including encoding.
- The chunk size of 150 was chosen conservatively. It can be increased to 200 if needed, but 150 avoids the limit with margin.

---
## 2026-06-18 - Security Master backfill and issuer sync for ETF holdings

### Source
Claude (direct â€” SQL editor operations)

### Objective
Map `etf_top_holdings` symbols to `securities_master` entries and create issuer links for company-level portfolio look-through rollup.

### Files Changed
- Supabase database (SQL editor operations â€” no migration file)
- `docs/implementation-log.md`

### Summary
After 169 ETF holdings refresh, 13,626 holding rows existed with `holding_security_id = null` (unmapped). The following operations were run in the Supabase SQL editor:

**Step 1 â€” Create stubs for new holding symbols:**
```sql
SELECT * FROM public.backfill_etf_holding_stubs();
```
Created 3,810 `is_internal_only` stubs in `securities_master` for holding symbols not in the selectable universe. Stubs use `identifier_quality_score = 40` and `source_priority = ["etf_holding_stub"]`.

**Step 2 â€” Stamp security IDs onto holding rows:**
```sql
SELECT * FROM public.sync_etf_holding_security_ids();
```
Result: 13,563 mapped, 63 unmapped, 16 ambiguous. Unmapped/ambiguous are non-material (obscure tickers, non-equity instruments).

**Step 3 â€” Create issuers and issuer links:**
```sql
SELECT * FROM public.sync_security_issuer_links();
```
Result: 3,724 issuers created, 3,811 links created, 87 securities reused existing issuers via normalized name matching (e.g. share-class variants).

### Result
Completed. ETF holdings mapped: 13,563 / 13,626 (99.5%). Company-level look-through rollup operational for Portfolio Review.

### Notes for Claude
- 63 unmapped and 16 ambiguous holdings remain. These are mostly obscure tickers or non-equity instruments with no FMP profile. Not material for portfolio review accuracy.
- `sync_security_issuer_links()` is idempotent â€” safe to re-run after any stub creation or canonical_name update.
- `backfill_etf_holding_stubs()` is also idempotent via `ON CONFLICT DO NOTHING`.

---
## 2026-06-18 - Fix portfolio lookthrough duplicate holding symbol conflict

### Source
Codex

### Objective
Fix "ON CONFLICT DO UPDATE command cannot affect row a second time" during portfolio review run. Root cause: direct positions and ETF holding stubs for the same ticker can link to separate issuer records, producing two holdingExposures entries with the same holdingSymbol. Both entries then collide in upsertPortfolioLookthroughHoldings.

### Files Changed
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `docs/implementation-log.md`

### Summary
- Added `deduplicateHoldingsBySymbol` and `deduplicateExposuresByName` helpers.
- Applied holding deduplication before `upsertPortfolioLookthroughHoldings`.
- Applied top-holding exposure deduplication before adding `top_holding` rows to the batch passed to `upsertPortfolioLookthroughExposures`.
- Merging logic sums direct, indirect and total weights, merges source ETF weights, and prefers richer non-null identity data.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- Upstream root cause (stub issuerId not shared with universe instrument issuerId) remains a Security Master data quality gap (Medium 40 / Medium 41 in `docs/DOCUMENTATION_GAPS.md`). This fix is a defensive deduplication in the service layer.

---
## 2026-06-18 - Fix Gap Analysis quality score display fallback

### Source
Codex

### Objective
Restore the legacy `candidate.score` fallback for Gap Analysis candidate quality display when historical reports do not have `recommendationScore`.

### Files Changed
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/implementation-log.md`

### Summary
- Updated the Quality badge expression from `candidate.recommendationScore ?? 0` to `candidate.recommendationScore ?? candidate.score ?? 0`.
- Preserves Task C quality ordering while preventing legacy candidates from displaying as `Quality 0` when only `candidate.score` is available.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- No scoring, methodology, labels, backend, or data model changes.

---
## 2026-06-18 - Gap Analysis UI Redesign - instrument quality ordering and impact indicators

### Source
Codex

### Objective
Compliance improvement separating universal quality ordering from portfolio-specific impact indicators in the Gap Analysis card.

### Files Changed
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/implementation-log.md`

### Summary
- Updated the Gap Analysis card description to state that ordering is by instrument quality score only and portfolio impact indicators are factual observations.
- Sorted candidate instruments by `recommendationScore` descending instead of rendering the existing candidate order.
- Added a column indicator strip separating universal instrument-quality ordering from portfolio-specific exposure and overlap indicators.
- Replaced the old flat score-chip candidate layout with a two-column card showing Exposure impact and Holdings overlap.
- Removed relevance, diversification, overlap-penalty, diversification-type, candidate-level context, and candidate-level trade-off rows from candidate cards to reduce composite-ranking impression.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- This completes the compliance improvement cycle for the Gap Analysis section (Tasks A, B, C).

---
## 2026-06-18 - Security Master internal-only and stub-collision counts in Admin QA panel

### Source
Codex

### Objective
Surface two new Security Master monitoring metrics in the Admin Data Sources QA panel: count of is_internal_only stubs (ETF holding symbols outside the selectable universe) and count of stub-collision cases where a stub symbol has been added as a universe instrument but not yet cleaned up (Medium 40, docs/DOCUMENTATION_GAPS.md).

### Files Changed
- `supabase/migrations/113_security_master_internal_only_count.sql`
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added internalOnlySecurities field to get_security_master_health_snapshot(), counting active is_internal_only stubs. This should be stable at rest, drop by 1 per instrument promoted from stub to universe, and rise after an ETF re-backfill adds new holding symbols.
- Added stubCollisionCount field, counting stubs whose canonical_symbol matches an active instrument symbol. Greater than zero means a promotion cleanup (Medium 40) was skipped and ETF holdings for that symbol are likely ambiguous.
- Surfaced both fields in the Admin Data Sources Security Master QA panel, with Stub collisions shown in amber when greater than zero.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (275/275)
- `npm.cmd run build` - PASS

### Result
Completed.
- internalOnlySecurities: 51
- stubCollisionCount: 0

### Notes for Claude
- Migration 113 was applied successfully. Stub collisions are currently zero, which is the expected clean state.

---
## 2026-06-18 - Security Master ETF Holdings Re-sync (Migration 112)

### Source
Codex

### Objective
Re-map ETF top holdings to Security Master entries after clearAllExposures() reset all mapping_status values to `unmapped`. Expand normalize_issuer_name generically to improve share-class issuer rollup beyond the four hardcoded symbols.

### Files Changed
- `supabase/migrations/112_resync_etf_holding_security_ids.sql`
- `docs/implementation-log.md`

### Summary
- Expanded normalize_issuer_name to strip capital stock, series, depositary receipt, and non-voting suffixes, improving issuer rollup for companies with these naming conventions rather than relying on hardcoded ticker lists.
- Re-ran 095 backfill logic to create is_internal_only stubs for new holding symbols that entered etf_top_holdings after the expanded 169-ETF backfill.
- Re-ran sync_etf_holding_security_ids() to restore holding_security_id and mapping_status = `mapped` across all etf_top_holdings rows.
- Re-ran sync_security_issuer_links() to create issuer links for new stubs, enabling portfolio look-through to aggregate share-class variants at the company/issuer level.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (275/275)
- `npm.cmd run build` - PASS

### Result
Completed.
- ETF holdings mapped: 169 / 169
- ETF holdings unmapped: 0
- Mapping gap rows: 5
- New is_internal_only stubs created: 0
- New issuer links created: 0

### Notes for Claude
- Migration number is 112 because migrations 110 and 111 already existed locally.
- normalize_issuer_name is now generic for class/series/ADR/capital-stock/non-voting patterns. If FMP introduces new name suffixes in future, extend this function rather than adding hardcoded ticker lists.
- sync_security_issuer_links() can be re-run at any time; it is idempotent. Run it after any bulk stub creation or canonical_name update.

---
## 2026-06-18 - ETF Look-through Operational Fixes and Coverage Completion

### Source
Claude (direct)

### Objective
Fix three operational bugs discovered during ETF look-through backfill and close the remaining coverage gap to 169/169 across all exposure types.

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts` â€” deduplicate holdings by symbol before sort/slice (ON CONFLICT fix)
- `src/application/services/etfLookthrough/EtfLookthroughRefreshService.ts` â€” collect all eligible ETFs before slicing, sort nulls-first then oldest-date-first so refreshes always progress rather than repeating the same first-50 alphabetically
- `src/app/(dashboard)/admin/data-sources/page.tsx` â€” add `force=true` hidden input to ETF refresh form; add "Clear ETF exposure data" destructive button
- `src/application/ports/repositories/EtfExposureRepository.ts` â€” add `clearAllExposures(): Promise<void>` to interface
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts` â€” implement `clearAllExposures()` (deletes all 4 ETF exposure tables); fix PostgREST 1000-row cap in all four `listLatest*` methods by replacing single `limit(5000)` queries with paginated `fetchAllExposureRows` helper using `.range()`
- `src/server/actions/portfolioReviewActions.ts` â€” add `clearEtfLookthroughExposureAction` server action
- `src/infrastructure/providers/etf/seededEtfSectorFallback.ts` â€” new file: seeded single-sector fallback for IYW, VCR, JXI, VOX, PXE
- `docs/implementation-log.md`

### Summary
- **ON CONFLICT fix:** FMP returns duplicate `holdingSymbol` entries for the same ETF in some cases. Deduplicated via Map (keep highest weight) before sort/slice to prevent upsert conflict errors.
- **Refresh ordering fix:** With `force=true`, the old early-break loop always selected the first 50 alphabetically on every pass. Changed to collect all eligible, sort by `latest` date ascending (nulls first), then slice â€” each pass now processes the 50 ETFs furthest from coverage.
- **Force=true button fix:** The ETF refresh admin button was missing the `force` hidden input, so it defaulted to false and skipped already-covered ETFs.
- **Clear ETF exposure data button:** New destructive admin button triggers `clearAllExposures()` across all 4 ETF exposure tables for a clean backfill reset without affecting the refresh button's incremental behaviour.
- **PostgREST 1000-row cap fix:** `etf_sector_exposures` grew to 1,253 rows. PostgREST's `db-max-rows` cap silently truncated `listLatestSectorExposures` to 1,000 rows, causing 33 ETFs to appear as "missing sector" in the coverage UI despite having data in the DB. Same bug class as `f447bde`. Fixed by paginating all four `listLatest*` methods using `.range()` in a loop until all rows are returned.
- **Seeded sector fallback:** Direct FMP testing confirmed IYW, VCR, JXI, VOX, and PXE return `[]` from `/etf/sector-weightings` â€” a data gap in FMP's database (all five do have country and holdings data). All five are pure-play single-sector ETFs; added a seeded 100% weight fallback matching their known sector. Coverage reached 169/169 after backfill.

### Tests Run
- `npm run typecheck` - PASS
- `npm test` - PASS (275/275)

### Result
Completed. ETF look-through coverage: 169/169 sector, 169/169 country, 169/169 top holdings.

### Notes for Claude
- The five seeded-sector ETFs (IYW=Technology, VCR=Consumer Discretionary, JXI=Utilities, VOX=Communication Services, PXE=Energy) should be re-tested against FMP periodically. If FMP adds sector data for them in future, the seeded fallback is bypassed automatically (live data takes priority when `sectorPayload.length > 0`).
- The PostgREST row-cap pattern may affect other large tables as the universe grows. Any `listLatest*` or bulk-read query using `limit(N)` should be audited once row counts approach 1,000.

---
## 2026-06-18 - ETF Holdings Integration into Portfolio Review Gap Analysis

### Source
Codex

### Objective
Use cached ETF top-holding data in Portfolio Review gap analysis so candidate overlap reflects real company-level ETF look-through holdings.

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
- `src/application/services/portfolioReview/portfolioReviewScoring.ts`
- `src/application/services/portfolioReview/PortfolioReviewService.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/DiversificationBenefitService.ts`
- `src/domain/portfolioReview/types.ts`
- `src/server/container.ts`
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Capped FMP ETF top holdings, including seeded fallback holdings, to the top 100 by weight.
- Added `etfTopHoldings` to the Portfolio Review input context and fetched latest ETF top holdings for all active instruments.
- Added candidate metadata for shared company count, shared company weight, and top shared symbols.
- Gap-analysis candidates now compute candidate ETF company overlap against the portfolio look-through holding symbols.
- Diversification benefit scoring now adds overlap penalties when candidate ETF top-company overlap is 15%+ or 35%+.
- Added a regression test for ETF top-company overlap metadata and warning text.
- No Portfolio Review UI, scoring weights, recommendation labels, telemetry, migrations, jobs, or compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.
- `npm.cmd run test` - PASS (275/275).

### Result
Completed.

### Notes for Claude
- After deployment, run `POST /api/jobs/etf-lookthrough-refresh?force=true` from Admin > Jobs until job logs show `etfsRefreshed = 0`; expect 3-5 passes for the full universe.
- Then run `POST /api/jobs/portfolio-review-run` from Admin > Jobs to regenerate the stored report with real company overlap data.
- Until ETF top-holding backfill is complete, `etfTopHoldings` is an empty array and `companyOverlapWeight` is 0, so behavior is identical to the current state.

---
## 2026-06-18 - Phase 2C: Methodology page and SCORE_METHODOLOGY.md weight update

### Source
Codex

### Objective
Update the public methodology page and score methodology document to reflect Phase 2 stock Characteristics Score weights, Business Quality composition, and stock guardrails.

### Files Changed
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/implementation-log.md`

### Summary
- Updated stock Characteristics Score weights to Business Quality 40%, Valuation 20%, Fundamental Trends 15%, Risk Analytics 10%, Market Vision alignment 7%, Theme alignment 5%, and Momentum 3%.
- Added Business Quality composition: Growth 25%, Profitability 25%, Cash Flow 20%, Balance Sheet 15%, and Quality 15%, with Valuation intentionally excluded.
- Updated stock Market Vision component wording from 10% to 7%.
- Updated stock guardrail wording to Phase 2 behavior: Business Quality below 35 caps at Weak, and Valuation below 15 caps at Neutral.
- Left ETF, Bond ETF, Gold ETF, Crypto weights, Overall Fundamental Score sub-weights, and assessment range thresholds unchanged.
- `METHODOLOGY_LAST_UPDATED` was already `2026-06-18` and was not changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.
- `npm.cmd run test` - PASS (274/274).

### Result
Completed.

### Notes for Claude
- This is documentation/UI methodology catch-up only. No scoring service code, feature flags, or database schema were changed.

---
## 2026-06-18 - Fix fundamentals statement counts RPC

### Source
Codex

### Objective
Fix Admin fundamentals coverage counts by replacing the raw `financial_statements` row scan with an aggregate RPC that is not affected by PostgREST row limits.

### Files Changed
- `supabase/migrations/111_fix_statement_counts_rpc.sql`
- `src/infrastructure/repositories/supabase/SupabaseFundamentalsRepository.ts`
- `docs/implementation-log.md`

### Summary
- Added `get_statement_counts(p_instrument_ids uuid[])` SQL function returning one count row per instrument.
- Updated `listStatementCounts()` to call the RPC instead of selecting every `financial_statements.instrument_id` row and counting in JavaScript.
- Root cause: PostgREST `db-max-rows` silently truncated the raw row scan, so later instruments could appear to have zero statements in Admin Data Sources despite complete data.
- Applied the migration to Supabase and verified the RPC returns 105 instruments with statement counts.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (274/274).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- RPC with `GROUP BY` returns at most one row per requested instrument, so it avoids the statement-table row cap that caused 20 complete / 85 incomplete in Vercel.

---
## 2026-06-18 - Force Admin Data Sources live rendering

### Source
Codex

### Objective
Prevent the Admin Data Sources page from serving stale fundamentals coverage counts on Vercel.

### Files Changed
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/implementation-log.md`

### Summary
- Verified live Supabase fundamentals coverage is complete: 105 eligible, 105 complete, 0 incomplete, 0 stale.
- Added explicit `dynamic = "force-dynamic"` and `revalidate = 0` route settings to `/admin/data-sources`.
- This ensures operational diagnostics, including fundamentals coverage, are rendered from live server data instead of any cached deployment snapshot.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Vercel was still displaying 20 complete / 85 incomplete even though source tables showed full coverage. This change targets route-level caching rather than fundamentals data.

---
## 2026-06-18 - Financial sector BQ scoring fix

### Source
Codex

### Objective
Correct financial-sector fundamentals scoring so bank and financial company Business Quality is assessed with sector-appropriate profitability, balance sheet, and cash-flow treatment.

### Problem
Financial-sector stocks were being scored using industrial-company balance sheet and cash-flow assumptions. This could penalize banks for structurally high debt/equity and could include free-cash-flow metrics that are not directly comparable to operating companies.

### Fix
- Added financial-sector detection based on profile sector and industry text.
- Excluded gross margin from financial-sector profitability scoring.
- Applied financial-sector ROA profitability thresholds.
- Excluded cash flow score for financial-sector instruments.
- Replaced industrial leverage/liquidity balance sheet inputs with ROE, ROA, and price/book capital-quality proxies.
- Left recommendation scoring, valuation adjustment logic, weights, schema, and user-facing copy unchanged.

### Files Changed
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `tests/fundamentals.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/implementation-log.md`

### Summary
- Financial-sector instruments now avoid industrial debt/equity and net debt/EBITDA penalties in balance sheet scoring.
- Financial-sector `cashFlowScore` is now `null`, allowing quality averages to exclude that non-comparable component.
- Methodology documentation now explains the financial-sector scoring treatment and why CET1 is not included.
- Added tests covering financial-sector detection, non-financial exclusion, and high-leverage bank scoring behavior.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (275/275).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Post-deploy, rerun fundamentals refresh for JPM, BAC, GS, MA, V, and any other financial-sector instruments so stored `fundamental_scores` reflect the corrected methodology.
- Correction: isFinancialSector() tightened to match on profile.industry only using "banks" and "capital markets". Previous implementation incorrectly matched Credit Services (MA, V, PYPL) and Asset Management (BLK) via sector-level keyword matching.
- No recommendation labels, scoring weights, valuation logic, database schema, or user-facing compliance copy were changed.

---
## 2026-06-18 - Characteristics label threshold calibration and valuation label wording

### Source
Codex

### Objective
Recalibrate Characteristics label thresholds from 85/70/50/35/20 to 80/65/48/35/20 to better reflect the Phase 2 score distribution. Replace valuation labels "Stretched" with "Premium" and "Expensive" with "Elevated" for institutional-grade UX wording. No scoring weights, guardrail thresholds, or database schema changes.

### Files Changed
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/app/(dashboard)/recommendations/page.tsx`
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `docs/SCORE_METHODOLOGY.md`
- `tests/recommendations.test.ts`
- `docs/implementation-log.md`

### Summary
- `labelFromScore()` updated: 85 -> 80 (Excellent), 70 -> 65 (Good), 50 -> 48 (Neutral). Weak (35), Poor (20), Significant Concerns (<20) unchanged.
- `valuationLabel()` updated: "Stretched" -> "Premium", "Expensive" -> "Elevated". "Fair" and "Attractive" unchanged.
- `assessmentRows` in the public methodology page updated to 80-100, 65-79, 48-64, 35-47, 20-34.
- `SCORE_METHODOLOGY.md` threshold table updated to match the calibrated label bands.
- Six boundary assertions added to the existing recommendation threshold test.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (272/272).
- `npm.cmd run build` - PASS.
- Manual compiled boundary check - PASS: 80 -> Strong Buy, 79 -> Buy, 65 -> Buy, 64 -> Hold, 48 -> Hold, 47 -> Watch.

### Result
Completed.

### Notes for Claude
- Historical stored `recommendationLabel` values update only on the next insights run. Run insights manually after deployment to see new labels live.
- Portfolio Review Insight Alignment scores will increase for portfolios holding AAPL, COST, MA and similar stocks that move from Watch to Hold. This is expected.
- Phase 2C (methodology page stock weight table update from Phase 1 to Phase 2 weights) is still pending and was not touched in this task.
- The test count remains 272 because the six new boundary checks were added as assertions inside the existing threshold test, not as separate test cases.

---
## 2026-06-17 - Phase 2B: Business Quality and Valuation labels on Insights page

### Source
Codex

### Objective
Surface Business Quality and Valuation assessment labels as colour-coded chips in the Insights page table for stock instruments. ETF, Bond ETF, Gold ETF, and Crypto rows show a dash. One numeric score (Characteristics Score) is shown per row. Column renames: Assessment -> Characteristics, Characteristics score -> Characteristics Score, Characteristics (drivers text) -> Signals.

### Files Changed
- `src/app/(dashboard)/recommendations/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added render-only helpers to derive Business Quality and Valuation chip labels from `scoringBreakdown`.
- Stock rows use `row.instrumentType === "Stock"` and show colour-coded Business Quality and Valuation chips when scores are available.
- Non-stock rows show `-` in the Business Quality and Valuation columns.
- Renamed the table headers to Characteristics, Characteristics Score, and Signals while preserving the existing overall assessment, numeric score, confidence, risk, signal text, and guardrail rendering logic.
- No backend, service, scoring, database, or type files were changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (272/272).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Business Quality and Valuation chips are derived from `scoringBreakdown` at render time; no new stored fields or backend changes.
- Stock detection uses `row.instrumentType === "Stock"`.
- Phase 2C (`SCORE_METHODOLOGY.md` and methodology page update) is still pending.
- Browser verification of `/recommendations` was attempted but blocked by the in-app browser automation permission error (`CreateProcessAsUserW failed: 5`). Build output confirms `/recommendations` compiles successfully.

---
## 2026-06-17 - Phase 2A stock scoring: Business Quality and Valuation separation

### Source
Codex

### Objective
Eliminate double-counting of valuation in stock Characteristics Score by introducing a separate Business Quality Score that excludes valuation. Feature-flagged behind `ENABLE_STOCK_PHASE2_SCORES`. Phase 1 behavior is unchanged when the flag is off.

### Files Changed
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/StockRecommendationService.ts`
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `tests/recommendations.test.ts`
- `.env.example`
- `docs/implementation-log.md`

### Summary
- Added `scoreBusinessQuality()` using growth 25%, profitability 25%, cash flow 20%, balance sheet 15%, and quality 15%; valuation is excluded and missing sub-scores are excluded from the denominator.
- Added the `ENABLE_STOCK_PHASE2_SCORES` flag. When absent or not `true`, the stock scorer keeps the Phase 1 component weights and valuation guardrail behavior.
- Added Phase 2 stock component weights: Business Quality 40%, Valuation 20%, Fundamental Trends 15%, Risk Analytics 10%, Market Vision Alignment 7%, Theme Alignment 5%, Momentum 3%.
- Added optional `businessQualityScore` passthrough to guardrails and scoring breakdown so telemetry can compare Phase 1 and Phase 2 behavior.
- Added Phase 2-only guardrail behavior: weak business quality can cap at Watch, valuation below 15 caps at Hold, and valuation between 15 and 25 no longer triggers the old valuation cap when business quality is intact.
- Documented the feature flag in `.env.example`.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (272/272).
- `npm.cmd run build` - PASS.
- Manual compiled stock scorer check - PASS: with `ENABLE_STOCK_PHASE2_SCORES=true`, the component breakdown uses `business_quality` and omits `fundamentals`; a high-quality expensive stock fixture produced a higher Phase 2 overall score than Phase 1 in tests.

### Result
Completed.

### Notes for Claude
- Phase 2B (UI display of Business Quality and Valuation as separate score cards) is a separate task and was not implemented here.
- SCORE_METHODOLOGY.md and methodology page Phase 2C updates are a separate task and were not changed here.
- Valuation guardrail is softened under Phase 2: below 15 caps at Hold only; between 15 and 25 no longer triggers a cap when Business Quality is intact.
- `businessQualityScore` is stored in `scoringBreakdown` for telemetry comparison regardless of flag state.
- 2026-06-17 Claude fix: `confidenceScore()` `strategicAgreementBonus` updated to recognise `"business_quality"` key alongside `"fundamentals"` so Phase 2 stocks with high Business Quality and Market Vision alignment correctly receive the +5 confidence bonus. Tests: 272/272.

---
## 2026-06-17 - Update methodology page for universal Characteristics Score model

### Source
Codex

### Objective
Remove portfolio-dependent component rows and update instrument weight tables and guardrail rows on the static methodology page to match the universal scoring model introduced in the same-day scoring update.

### Files Changed
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `docs/implementation-log.md`

### Summary
- Removed portfolio fit/allocation fit, ETF diversification benefit, and crypto portfolio concentration rows from component calculation details.
- Updated stock, ETF, bond ETF, gold ETF, and crypto Characteristics Score weight tables to the universal scoring weights.
- Removed portfolio concentration, duplicate exposure, and crypto allocation guardrail rows from the public methodology page.
- Updated `METHODOLOGY_LAST_UPDATED` to `2026-06-17`.
- Updated the Market Vision weight sentence to match the current instrument-type weights.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS (`/methodology` generated as a static route).

### Result
Completed.

---
## 2026-06-17 - Remove Portfolio-Dependent Recommendation Scoring Components

### Source
Claude Code

### Objective
Remove portfolio-dependent score components from the stored recommendation scoring pipeline so instrument Characteristics Scores are universal and based on instrument, macro, Market Vision, fundamentals, risk, market, theme, and bond-profile inputs only.

### Files Changed
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/RecommendationService.ts`
- `src/application/services/recommendations/StockRecommendationService.ts`
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `src/application/services/recommendations/BondEtfRecommendationService.ts`
- `src/application/services/recommendations/GoldRecommendationService.ts`
- `src/application/services/recommendations/CryptoRecommendationService.ts`
- `tests/recommendations.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
- `docs/implementation-log.md`

### Summary
- Removed `portfolioFit` from `RecommendationInput`, `buildEvaluation()`, stored input snapshots, data limitations, positive/negative drivers, and change triggers.
- Removed portfolio-dashboard and portfolio-review lookups from recommendation runs while preserving telemetry `portfolioId` capture.
- Reweighted stock, ETF, bond ETF, gold, and crypto scorer components to use only universal instrument and market/macro signals.
- Removed ETF allocation/diversification, stock portfolio fit, bond diversification, gold diversification/portfolio fit, and crypto portfolio concentration components.
- Left `portfolioFitService.ts` unchanged as a standalone diagnostic service and kept `RecommendationRulesService.applyGuardrails()` signature unchanged.
- Updated recommendation methodology docs to state that stored instrument Characteristics Scores no longer use portfolio fit, allocation fit, duplicate exposure, or portfolio concentration.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.
- Manual compiled scorer check - PASS: stock, ETF, bond ETF, gold, and crypto all returned non-null `overallScore` with `macroRegime: null` and `marketVisionReport: null` when other instrument data was present.

### Result
Completed.

### Notes for Claude
- `portfolioFitService.ts` remains on disk unchanged and is still covered by its direct test.
- `RecommendationRulesService.applyGuardrails()` still accepts optional concentration and duplicate-exposure inputs for backward compatibility, but `buildEvaluation()` no longer passes those portfolio-dependent fields.
- Existing stored recommendation rows will retain historical snapshots until the next recommendation run rewrites current instrument scores under the universal weighting.
- With macro and Market Vision missing, some services can still produce a numeric `overallScore` but may receive `Insufficient Data` labels because confidence is reduced by unavailable components.

---
## 2026-06-17 - Cache MacroContextSection FRED data on market-vision page

### Source
Claude Code

### Objective
Cache the `getDashboardSummary()` call that was the last uncached DB hit on the market-vision page (~700â€“760ms on every warm request).

### Files Changed
- `src/app/(dashboard)/market-vision/page.tsx`

### Summary
- Added a module-level `getCachedMacroDashboardSummary` wrapper using `unstable_cache` around `macroDashboardService.getDashboardSummary()`.
- Tagged with `macro-data` so the `fred-macro-ingestion` job invalidates it on success via its `onSuccess` callback.
- `revalidate: 86400` safety TTL matches other shared-data pages.
- `MacroContextSection` now receives the pre-fetched cached summary instead of issuing a live DB call on each render.

### Tests Run
- `npm.cmd run lint` â€” PASS.
- `npm.cmd run typecheck` â€” PASS.
- `npm.cmd run test` â€” PASS (268/268).
- `npm.cmd run build` â€” PASS.

### Result
Completed. Market-vision macro-context-data warm timing: 700â€“760ms â†’ ~12ms.

---
## 2026-06-17 - Shared-data page caching with tag-based invalidation

### Source
Claude Code

### Objective
Add `unstable_cache` wrappers for shared non-personalized data pages and invalidate those cache tags after successful scheduled data refresh jobs.

### Files Changed
- `src/server/jobs/runCronJob.ts`
- `src/app/api/jobs/instrument-price-refresh/route.ts`
- `src/app/api/jobs/instrument-daily-returns-refresh/route.ts`
- `src/app/api/jobs/instrument-return-anchors-refresh/route.ts`
- `src/app/api/jobs/instrument-market-metrics-refresh/route.ts`
- `src/app/api/jobs/instrument-risk-refresh/route.ts`
- `src/app/api/jobs/instrument-metadata-refresh/route.ts`
- `src/app/api/jobs/benchmark-refresh/route.ts`
- `src/app/api/jobs/etf-lookthrough-refresh/route.ts`
- `src/app/api/jobs/fred-macro-ingestion/route.ts`
- `src/app/api/jobs/daily-news-ingestion/route.ts`
- `src/app/api/jobs/newsdata-news-ingestion/route.ts`
- `src/app/api/jobs/weekly-news-reconciliation/route.ts`
- `src/app/api/jobs/weekly-market-vision/route.ts`
- `src/app/api/jobs/fundamentals-refresh/route.ts`
- `src/app/api/admin/revalidate/route.ts`
- `src/app/(dashboard)/macro/page.tsx`
- `src/app/(dashboard)/fundamentals/page.tsx`
- `src/app/(dashboard)/instruments/universe/page.tsx`
- `src/app/(dashboard)/news/page.tsx`
- `src/app/(dashboard)/market-vision/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added optional `onSuccess` support to `runCronJob`, invoked only after `success` or `partial_success` job logging and isolated from the HTTP response if invalidation fails.
- Wired `revalidateTag` into 14 scheduled job endpoints while preserving existing job names, query parameters, lock TTLs, and job bodies.
- Added module-level `unstable_cache` fetchers for shared default views on `/macro`, `/fundamentals`, `/instruments/universe`, `/news`, and `/market-vision`.
- Cached News theme intelligence and Market Vision macro/world-news support data with `news-data` tag invalidation.
- Added `POST /api/admin/revalidate` protected by `x-admin-secret` and `ADMIN_SECRET` for manual cache flushes across market, macro, news, Market Vision, and fundamentals tags.
- Preserved auth checks outside cache boundaries and did not cache personalized portfolio, risk, bonds, recommendations, portfolio-review, telemetry, assistant, holdings, transactions, or watchlist pages.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Universe caching applies only to the default active/no-search view. Text search, inactive status, and all-status views bypass cache to preserve existing filter behavior.
- Cache safety revalidate is 24 hours for daily shared pages and 7 days for the default Market Vision dashboard; job-driven tag invalidation is expected to refresh data earlier.
- No compliance wording, scoring, methodology, feature flags, PRODUCT_MODE logic, or personalized page data paths were changed.

---
## 2026-06-17 - Page Rendering Query Path Optimization

### Source
Claude Code

### Objective
Reduce unnecessary query work on instrument detail symbol lookup and Market Vision macro/world-news input.

### Files Changed
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/application/services/InstrumentService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/app/(dashboard)/market-vision/page.tsx`
- `supabase/migrations/110_optimize_route_queries.sql`
- `docs/implementation-log.md`

### Summary
- Added `getBySymbol(symbol)` to the universe repository contract and exposed it through `InstrumentService`.
- Implemented direct active-symbol lookup in `SupabaseUniverseRepository` using the existing instrument mapper.
- Updated `/instruments/[symbol]` to call `getBySymbol(decodedSymbol)` instead of running a text-search list query and filtering in JavaScript.
- Reduced `/market-vision` NewsData classification fetch limit from 12 to 8 while preserving the existing filtering and display behavior.
- Confirmed `listNewsWithClassifications({ includeDuplicates: false })` already applies `is_duplicate = false` in SQL.
- Added `idx_news_items_provider_published` on `news_items (source_provider, published_at desc)` to support provider-filtered latest-news reads.
- No product logic, UI copy, compliance wording, calculation methodology, feature flags, or data model tables were changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.
- `npm.cmd run test` - PASS (268/268).

### Result
Completed.

### Notes for Claude
- Expected timing improvement: `/instruments/[symbol]` removes the broad text-search/list-plus-filter lookup; `/market-vision` transfers fewer NewsData rows and gains a composite provider/date index for the latest-news access pattern.
- `docs/chatgpt-handover.md` was listed in AGENTS.md but is not present in this worktree; `docs/ARCHITECTURE_OVERVIEW.md` and task-specific files were read instead.

---
## 2026-06-17 - Page Data Map Documentation

### Source
Claude Code

### Objective
Create `docs/PAGE_DATA_MAP.md` covering all 25 product routes.

### Files Changed
- `docs/PAGE_DATA_MAP.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Added a canonical page data map covering Portfolio, Instruments, Research, Admin, Public, and Legacy route groups.
- Documented alpha visibility, UI sections, route files/actions, services, repositories, tables/views, refresh jobs, cache/summary layers, and performance notes for each primary product route.
- Closed `docs/DOCUMENTATION_GAPS.md` items 13-23 with 2026-06-17 closure notes pointing to `docs/PAGE_DATA_MAP.md`.
- No TypeScript, SQL, migration, methodology, or QA-log changes were made for this documentation-only task.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- `docs/PAGE_DATA_MAP.md` contains explicit `* - inferred from architecture docs` markers where direct page-to-service-to-repository inspection did not prove the full data chain.
- Legacy redirect routes `/universe`, `/watchlists`, and `/taxonomy` are noted but not mapped as primary entries.

---
## 2026-06-17 - Full Pre-Commercial RLS Hardening

### Source
Claude Code

### Objective
Replace broad-authenticated-read policies on assistant and telemetry tables with user-scoped SELECT policies before multi-user alpha invites.

### Files Changed
- `supabase/migrations/109_rls_hardening.sql`
- `src/server/jobs/cronAuth.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`

### Summary
- Added and applied migration `109_rls_hardening.sql`.
- Replaced broad `auth.role() = 'authenticated'` read policies for three assistant tables and four telemetry tables.
- Assistant conversations and usage logs are scoped through direct `user_id`; assistant messages are scoped through parent conversation ownership.
- Telemetry snapshots are scoped through authenticated user's portfolio ownership; telemetry outcomes are scoped through parent snapshot portfolio ownership.
- Live `pg_policies` verification returned exactly 7 targeted rows, all with `users can read own ...` policy names.
- No user-facing content, scoring, methodology, feature flags, or advisory language changed.
- Fixed `src/server/jobs/cronAuth.ts` to use an equivalent relative import for `isCronSecretValid`; this was needed because the existing compiled Node test runner cannot resolve the `@/` alias at runtime.

### Tests Run
- Applied migration with `psql` - PASS.
- `pg_policies` verification query - PASS (7/7 targeted policies updated).
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- `instrument_directory_summary` was not changed; it remains documented as a closed orphaned experimental table with no policy needed.
- Service-role application writes and scheduled jobs continue to bypass RLS; this migration hardens direct authenticated PostgREST reads only.

---
## 2026-06-17 - CRON_SECRET Header-Only Authentication

### Source
Claude Code

### Objective
Remove the `?secret=` query-parameter path from cron authentication and require `Authorization: Bearer <CRON_SECRET>` header only.

### Files Changed
- `src/server/jobs/cronAuth.ts`
- `tests/cronAuth.test.ts`
- `package.json`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Removed `request.nextUrl.searchParams.get("secret")` from `assertCronAuthorized`.
- Cron authorization now validates only the `Authorization: Bearer` header value.
- Added unit coverage for valid Bearer auth, invalid Bearer auth, missing Authorization header, query-param-only rejection, and missing configured `CRON_SECRET`.
- Added the new cron auth test to the explicit `npm run test` command.
- Documented bearer-only cron authentication and closed the CRON_SECRET query-param documentation gap.
- No database migration was required because Supabase Cron and manual fallback scripts already send the Bearer header.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- `package.json` was updated because the project test script enumerates compiled test files explicitly; without that change, the new `tests/cronAuth.test.ts` would compile but not run under `npm run test`.
- Build route list was unchanged apart from prior tasks; all existing `/api/jobs/*` routes still build, and no `/api/jobs/price-refresh` route reappeared.

---
## 2026-06-17 - Add GitHub Actions CI Workflow

### Source
Codex

### Objective
Add a GitHub Actions CI workflow for pull requests and pushes targeting `development` and `main`.

### Files Changed
- `.github/workflows/ci.yml` (new)
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Added CI workflow triggered by `pull_request` and `push` events for `development` and `main`.
- Workflow installs dependencies with `npm ci` and runs lint, typecheck, test, and build.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are sourced from GitHub secrets.
- Server-only runtime values use CI placeholder values where real credentials are not needed.
- No source files, package scripts, existing workflows, scoring, methodology, or user-facing wording changed.

### Tests Run
- Workflow YAML created and inspected for valid structure.
- PowerShell workflow structure check - PASS.
- `git diff --check` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (263/263).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Branch protection rules must be enabled in GitHub repository settings to enforce the status check as a merge gate.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be added as repository secrets before the build step will pass.

---
## 2026-06-17 - Remove Orphaned price-refresh HTTP Route

### Source
Codex

### Objective
Remove the orphaned `/api/jobs/price-refresh` HTTP route while preserving the live `instrument-price-refresh` route and user-triggered portfolio price refresh job wiring.

### Files Changed
- `src/app/api/jobs/price-refresh/route.ts` (deleted)
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Deleted the orphaned `/api/jobs/price-refresh` route.
- Preserved `RefreshPortfolioPricesJob`, `jobs.refreshPortfolioPrices` container wiring, `dataRefreshActions.ts`, `portfolioActions.ts`, and `/api/jobs/instrument-price-refresh`.
- Closed the DOCUMENTATION_GAPS.md High Priority item 3 price-refresh route reconciliation entry.
- Direct local SQL rerun was unavailable because this sandbox has no `psql`, Supabase CLI, or Postgres driver installed. Cron cleanliness is based on the existing live database confirmation in `docs/ARCHITECTURE_AUDIT_2026-06-16.md`, which records 31 active `cron.job` rows and confirms `price-refresh` is absent from `cron.job`.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS after removing stale generated `.next/types/app/api/jobs/price-refresh` route type folder.
- `npm.cmd run test` - PASS (263/263).
- `npm.cmd run build` - PASS. Build route list no longer includes `/api/jobs/price-refresh`.

### Result
Completed.

### Notes for Claude
- If a live Supabase SQL console is available, re-run: `SELECT jobname, command FROM cron.job WHERE command LIKE '%price-refresh%';` Expected result should include only `instrument-price-refresh` rows and no `/api/jobs/price-refresh` row.

---
## 2026-06-16 - Middleware Alpha Mode Asset Blocking Fix (QA Residuals)

### Source
Claude Code (QA session)

### Objective
Fix three middleware bugs discovered during Task 3 + Task 10 browser QA: alpha mode was blocking `/_next/image` requests and Vercel's internal image optimizer fetch of public source images.

### Files Changed
- `src/middleware.ts`
- `src/config/productMode.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Added `isAssetRequest` guard in `src/middleware.ts` to skip the alpha mode check for any request starting with `/_next` or matching a file extension. Vercel's image optimization service makes a server-side HTTP fetch of the source image (`/brand/etfvision-light-lockup.png`) which went through the middleware and was blocked by the alpha mode check â€” the browser-level `_next/image` exclusion is not sufficient because of this internal fetch.
- Added `"/_next"` and `"/brand"` to `alphaAllowedPrefixes` in `src/config/productMode.ts` as belt-and-suspenders coverage.
- Three commits: `9e7de98`, `bb9ea0b`, `743cf20`.

### Tests Run
- Manual browser QA confirmed logo loads correctly in alpha mode after `743cf20`.

### Result
Completed. Logo loads in both alpha and full mode.

### Notes for Claude
- Vercel's image optimizer fetches source images via HTTP from the same origin. Public asset paths (`/brand/`) must be in `alphaAllowedPrefixes` or excluded by `isAssetRequest`.
- The `config.matcher` pattern did not reliably exclude `_next/image` in Next.js 15 on Vercel. The runtime `isAssetRequest` guard in the middleware function body is the reliable exclusion path.

---
## 2026-06-16 - Runtime Product Mode

### Source
Claude Code

### Objective
Implement a server-only runtime product-mode module that gates alpha versus full product surface without using a client-exposed release variable.

### Files Changed
- `.env.example`
- `package.json`
- `src/config/productMode.ts`
- `src/middleware.ts`
- `src/components/layout/app-shell.tsx`
- `src/app/(dashboard)/market-vision/page.tsx`
- `tests/product-mode.test.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `PRODUCT_MODE=alpha|full` runtime module in `src/config/productMode.ts`, defaulting unset or unrecognized values to `alpha`.
- Added alpha-mode middleware route blocking for non-API paths, redirecting disabled routes to `/portfolio?feature=alpha-disabled`.
- Hid News & Themes, Macro, Assistant, Telemetry, and the entire Admin nav group in alpha mode.
- Suppressed `PortfolioAssistantDrawer` in alpha mode.
- Restricted Market Vision in alpha mode to published reports and hid report editorial actions and draft editing.
- Updated `.env.example` with server-only `PRODUCT_MODE=full` local-development guidance.
- Added product-mode unit tests for mode derivation and alpha/full route decisions.
- Updated security, documentation gaps, and QA documentation.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (263/263).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Manual browser QA is still needed in Vercel to confirm alpha vs full navigation, route blocking, Portfolio Assistant drawer suppression, and Market Vision published-only/editorial-hidden behavior.
- Stale security-doc sentence updated to reflect implemented product-mode gating.

---
## 2026-06-16 - Signup Restriction, Assistant Limit, and AI Cost Constants

### Source
Claude Code

### Objective
Gate new user registration behind an email allowlist, add a configurable daily Portfolio Assistant conversation cap, and document real OpenAI model IDs and cost constants for active OpenAI-backed services.

### Files Changed
- `.env.example`
- `src/application/ports/repositories/AssistantRepository.ts`
- `src/application/services/ai/costEstimate.ts`
- `src/application/services/assistant/PortfolioAssistantService.ts`
- `src/application/services/auth/adminAccess.ts`
- `src/app/api/assistant/route.ts`
- `src/app/login/page.tsx`
- `src/infrastructure/config/env.ts`
- `src/infrastructure/providers/ai/OpenAiMarketVisionProvider.ts`
- `src/infrastructure/providers/ai/OpenAiPortfolioAssistantProvider.ts`
- `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`
- `src/infrastructure/repositories/supabase/SupabaseAssistantRepository.ts`
- `src/server/container.ts`
- `tests/admin-access.test.ts`
- `tests/assistant.test.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `ALLOWED_SIGNUP_EMAILS` to `env.ts` and gated `signUpWithPassword` with a comma-separated, case-insensitive email allowlist. Empty allowlist preserves open signup for development.
- Updated the login page to hide Create account and show "Early access only. Contact us to request an invitation." when signup is invite-only.
- Added `ASSISTANT_DAILY_LIMIT` to `env.ts`, `AssistantRepository.countTodayConversations`, Supabase implementation over `assistant_conversations.user_id` and `created_at`, Portfolio Assistant service enforcement, and HTTP 429 handling in `/api/assistant`.
- Confirmed `gpt-5.4-mini` is a valid OpenAI model ID for Portfolio Assistant and Market Vision. `.env.example` now lists current pricing from OpenAI: `$0.75` input and `$4.50` output per 1M tokens.
- Added shared `estimateTokenCost` helper and focused tests for signup allowlist behavior, assistant daily-limit enforcement, and cost formula calculation.
- Updated `docs/qa-log.md` with scope, validation results, and residual manual QA items for the signup restriction, assistant limit, and AI cost constants work.
- News AI model cost tracking remains excluded because `ENABLE_AI_NEWS_CLASSIFICATION` and `ENABLE_WEEKLY_NEWS_RECONCILIATION` are disabled by default; add cost tracking when those features are enabled.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (253/253).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Set `ALLOWED_SIGNUP_EMAILS`, `ASSISTANT_DAILY_LIMIT`, `PORTFOLIO_ASSISTANT_*_COST_PER_1M`, and `MARKET_VISION_*_COST_PER_1M` in Vercel before alpha invites.

---
## 2026-06-16 - Fix Portfolio Review Test Assertion

### Source
Claude Code

### Objective
Fix the pre-existing stale test assertion at `tests/portfolio-review.test.ts:331` that referenced a phrase no longer present in the source string.

### Root Cause
`DiversificationBenefitService.ts:81` returns "Provides exposure to regulated demand that can behave differently from growth equities." The test asserted `/regulated demand exposure/` - the substring "regulated demand exposure" does not appear in this string (the word after "regulated demand" is "that"). The source text changed at some point and the test was not updated.

### Files Changed
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Changed test regex from `/regulated demand exposure/` to `/regulated demand/`.
- Changed stale XLP regex checks from `/essential-consumption exposure/` to `/essential-consumption businesses/`.
- No changes to `DiversificationBenefitService.ts` or any other source file.
- No scoring, methodology, or compliance wording changed.

### Tests Run
- `npm run test` blocked by PowerShell execution policy for `npm.ps1`.
- `npm.cmd run test` - PASS (248/248).

### Result
Completed. Test suite now fully green.

---
## 2026-06-16 - instrument_directory_summary Origin Investigation Closed

### Source
Claude Code

### Objective
Close the open origin investigation for the orphaned `instrument_directory_summary` live DB table.

### Root Cause
Table was created experimentally during page-rendering performance work (alongside `portfolio_risk_summary`, `telemetry_summary`, `data_source_health_summary`). All four implementations were reverted. Confirmed by `docs/PAGE_RENDERING_AUDIT.md:661`.

### Files Changed
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/implementation-log.md`

### Summary
- No TypeScript changes.
- No SQL changes.
- No migration added.
- Documentation updated to mark the item closed in DOCUMENTATION_GAPS.md High Priority item 1 and in the SECURITY_AND_ACCESS_ARCHITECTURE.md table inventory.

### Result
Closed. No further action required for this table.
---

## 2026-06-16 - Portfolio Summary RLS Policy Correction

### Source
Claude Code (review-phase correction)

### Objective
Fix the portfolio summary RLS policies from migration 107, which used the wrong
ownership join pattern and returned zero rows for authenticated users.

### Root Cause
`portfolios.user_id` references the internal app `users.id` UUID, which is NOT the
Supabase Auth UUID. `auth.uid()` returns the Supabase Auth UUID, stored separately
in `users.auth_provider_user_id TEXT`. Migration 107 used
`user_id = auth.uid()` which always evaluates to false.

### Files Changed
- `supabase/migrations/107_portfolio_summary_rls_policies.sql` (corrected in-place)
- `supabase/migrations/108_fix_portfolio_summary_rls_policies.sql` (correction migration for live DB)
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Migration 108 drops the two wrong policies (IF EXISTS) and re-creates them using
  the correct `exists()` pattern matching migration 004 (`portfolio_snapshots`):
  `join users on users.id = portfolios.user_id where users.auth_provider_user_id = auth.uid()::text`
- Migration 107 file corrected in-place so fresh deployments get the right SQL.
- No TypeScript changes. No write policies added.

### Tests Run
- Verified manually: after applying migration 108 in Supabase SQL Editor, authenticated
  SELECT with real user UUID returns the correct row.
- `npm run build` and `npm run typecheck` unaffected (SQL-only change).

### Result
Correction applied. Live DB verification pending re-run of Checks 1 and 2.

---

## 2026-06-16 - Portfolio Summary RLS Policies

### Source
Claude Code

### Objective
Add user-scoped SELECT policies to `portfolio_dashboard_summary` and `portfolio_performance_summary` as defense-in-depth while preserving the service-role-only write model.

### Files Changed
- `supabase/migrations/107_portfolio_summary_rls_policies.sql`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Confirmed `106_assets_rls.sql` is present, so the next migration number is `107`.
- Added `supabase/migrations/107_portfolio_summary_rls_policies.sql`.
- SQL written:
  ```sql
  -- Add user-scoped SELECT policies to portfolio summary tables.
  -- RLS is already enabled on both tables. Reads and writes in the app
  -- use the service role (which bypasses RLS), so these policies are
  -- defensive only and do not change application behaviour.

  create policy "users can read own portfolio dashboard summary"
    on portfolio_dashboard_summary for select
    using (
      portfolio_id in (
        select id from portfolios where user_id = auth.uid()
      )
    );

  create policy "users can read own portfolio performance summary"
    on portfolio_performance_summary for select
    using (
      portfolio_id in (
        select id from portfolios where user_id = auth.uid()
      )
    );
  ```
- No ALTER TABLE statements were added.
- No INSERT, UPDATE, or DELETE policies were added.
- No policy was added to `ingestion_events` or `instrument_directory_summary`.
- No TypeScript files were changed for this task.

### Tests Run
- `npm.cmd run lint` - PASS
- `npm.cmd run typecheck` - PASS
- `npm.cmd test` - PARTIAL: 247/248 passed; the known pre-existing Portfolio Review wording assertion `improvement suggestions map concentration issues to diversifying candidates` still fails because it expects `/regulated demand exposure/` while current output is `Provides exposure to regulated demand that can behave differently from growth equities.`
- `npm.cmd run build` - PASS

### Result
Completed, with unrelated pre-existing Portfolio Review test failure noted.

### Notes for Claude
- `portfolio_dashboard_summary`: user-scoped SELECT policy added.
- `portfolio_performance_summary`: user-scoped SELECT policy added.
- `ingestion_events`: source search found no `src/` references; zero-policy blocked state remains intentional.
- `instrument_directory_summary`: not present in migrations or source search; no policy added pending origin investigation.
- `SupabaseAnalyticsRepository` uses `createSupabaseAdminClient()`, so application summary reads/writes remain service-role based and bypass RLS.
## 2026-06-16 - Assets RLS Enablement

### Source
Claude Code

### Objective
Enable Row Level Security on the global `assets` instrument catalog and add a SELECT-only authenticated-user policy while keeping non-service-role writes blocked by default.

### Files Changed
- `supabase/migrations/106_assets_rls.sql`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Confirmed `105_security_master_phase7_provider_reconciliation.sql` is the highest-numbered migration, so the next migration is `106`.
- Added `supabase/migrations/106_assets_rls.sql`.
- SQL written:
  ```sql
  -- Enable RLS on the global instrument reference catalog.
  -- Writes remain service-role only (service role bypasses RLS).
  alter table assets enable row level security;

  create policy "authenticated users can read assets"
    on assets for select
    using (auth.role() = 'authenticated');
  ```
- No INSERT, UPDATE, or DELETE policies were added.
- No TypeScript files were changed for this task.

### Tests Run
- `npm.cmd run lint` - PASS
- `npm.cmd run typecheck` - PASS
- `npm.cmd test` - PARTIAL: 247/248 passed; the known pre-existing Portfolio Review wording assertion `improvement suggestions map concentration issues to diversifying candidates` still fails because it expects `/regulated demand exposure/` while current output is `Provides exposure to regulated demand that can behave differently from growth equities.`
- `npm.cmd run build` - PASS

### Result
Completed, with unrelated pre-existing Portfolio Review test failure noted.

### Notes for Claude
- Manual Supabase verification still needs to be run after applying migration `106`: authenticated SELECT should succeed, authenticated INSERT should fail with permission/RLS error, and service-role seed/metadata refresh writes should continue to work.
- Task 2B remains open: formalize the zero-write-policy model and review the four RLS-enabled zero-policy tables (`ingestion_events`, `instrument_directory_summary`, `portfolio_dashboard_summary`, `portfolio_performance_summary`).

## 2026-06-16 - Dashboard Auth Call Reduction

### Source
Claude Code

### Objective
Reduce the dashboard layout from separate `requireUser()` and `isAdmin()` calls to one Supabase user lookup that returns both the authenticated user and admin flag.

### Files Changed
- `src/application/ports/providers/AuthProvider.ts`
- `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`
- `src/app/(dashboard)/layout.tsx`
- `docs/implementation-log.md`

### Summary
- Added `requireUserWithAdminFlag()` to the auth provider interface.
- Implemented the method in `SupabaseAuthProvider` using one `getCurrentUser()` call and the existing admin allowlist helper.
- Updated the dashboard layout to pass `isAdmin` to `AppShell` from the combined auth result.
- Left `requireUser()`, `isAdmin()`, `requireAdmin()`, admin layouts, server action guards, scoring, methodology, consumer-facing output, and `/api/jobs/*` auth unchanged.

### Tests Run
- `npm.cmd run build` - PASS
- `npm.cmd run typecheck` - PASS when run sequentially after build. A parallel validation attempt hit a transient `.next/types` route-type race, so the final result was taken from the sequential run.

### Result
Completed.

### Notes for Claude
- Admin pages still run their own `requireAdmin()` in the nested admin layout for route-level defense-in-depth.
## 2026-06-16 Ã¢â‚¬â€ Admin Authorization Layer

### Source
Claude Code

### Objective
Add an environment-allowlist admin authorization layer so only designated admins can access internal admin routes and invoke admin-only server actions, without changing scoring methodology, user analytics, or cron job authentication.

### Files Changed
- `.env.example`
- `package.json`
- `tsconfig.test.json`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/admin/layout.tsx`
- `src/app/(dashboard)/setup/page.tsx`
- `src/app/(dashboard)/setup/taxonomy/layout.tsx`
- `src/application/ports/providers/AuthProvider.ts`
- `src/application/services/auth/adminAccess.ts`
- `src/components/layout/app-shell.tsx`
- `src/infrastructure/config/env.ts`
- `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`
- `src/server/actions/dataRefreshActions.ts`
- `src/server/actions/fundamentalsActions.ts`
- `src/server/actions/jobActions.ts`
- `src/server/actions/macroActions.ts`
- `src/server/actions/marketVisionActions.ts`
- `src/server/actions/newsActions.ts`
- `src/server/actions/portfolioReviewActions.ts`
- `src/server/actions/taxonomyActions.ts`
- `src/server/actions/universeActions.ts`
- `tests/admin-access.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Added optional `ADMIN_USER_IDS` and `ADMIN_EMAILS` env allowlists. Empty values deny all admin access by default.
- Added dependency-free admin allowlist parsing and matching with UUID-first matching and case-insensitive email matching.
- Extended `AuthProvider` with `isAdmin()` and `requireAdmin()`. Unauthenticated users still redirect to `/login`; authenticated non-admin users receive Next.js `notFound()` for admin-only access.
- Added route-level admin guards for `/admin/*` and `/setup/taxonomy`.
- Hid the Admin navigation group and `/setup` taxonomy-admin link unless `authProvider.isAdmin()` returns true. This is cosmetic only; server route/action guards enforce access.
- Added `requireAdmin()` checks to admin-only refresh, ingestion, taxonomy, job, universe-curation, Market Vision editorial, and ETF look-through refresh actions.
- Left user self-service actions unchanged: portfolio setup/holdings/cash/transactions, portfolio price/benchmark/metadata refreshes, watchlist add/remove, manual Portfolio Review run, and manual Insights/recommendation run.
- Left `/api/jobs/*` routes unchanged; they continue to use `CRON_SECRET`.

### Tests Run
- `npm.cmd run typecheck` Ã¢â‚¬â€ PASS
- `node --test .test-build\\tests\\admin-access.test.js` Ã¢â‚¬â€ PASS, 7 tests
- `npm.cmd run lint` Ã¢â‚¬â€ PASS
- `npm.cmd run build` Ã¢â‚¬â€ PASS
- `npm.cmd test` Ã¢â‚¬â€ PARTIAL: new admin-access tests passed, but the existing Portfolio Review test `improvement suggestions map concentration issues to diversifying candidates` failed because it expects `/regulated demand exposure/` while the current app text is `Provides exposure to regulated demand that can behave differently from growth equities.`

### Result
Completed, with one unrelated existing Portfolio Review wording-test follow-up noted.

### Notes for Claude
- To designate the first admin, set `ADMIN_USER_IDS` to the owner's Supabase Auth user UUID. `ADMIN_EMAILS` can be used as optional bootstrap support but UUIDs should be preferred.
- Admin-vs-user decisions: `recommendationActions.runRecommendationsAction` stayed user-accessible as a self-service Insights run; `portfolioReviewActions.runPortfolioReviewAction` stayed user-accessible; `portfolioReviewActions.refreshEtfLookthroughExposureAction` became admin-only; `marketVisionActions` draft/save/publish/archive/generate actions became admin-only editorial actions because they mutate global Market Vision reports.
- `universeActions` is mixed: seed, metadata/price refresh, active status, tags, and bond profile overrides became admin-only; watchlist add/remove stayed user-accessible.
- This change does not add a DB `users.is_admin` flag, does not alter RLS, and does not address the broader `assets` RLS or write-policy audit.

## 2026-06-25 — Instrument Detail Interactive Price Chart

### Source
Claude Code

### Objective
Fill the instrument detail Overview price-chart slot with a streamed, display-only SVG area chart using stored adjusted close history.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/components/instruments/instrument-cards.tsx`
- `src/components/instruments/instrument-price-chart.tsx`
- `src/domain/universe/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `tests/universe-repository.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `PriceSeriesPoint` and `UniverseRepository.getInstrumentPriceSeries()` for stored close-price history.
- Implemented Supabase price-series loading with positive-price filtering, 20-year default horizon, and server-side downsampling that keeps roughly the latest 5 years daily while thinning older history to weekly cadence.
- Added a client-only hand-rolled SVG area chart with period toggles, selected-period green/red coloring, gradient fill, gridlines, end dot, hover crosshair tooltip, and adaptive time-axis labels.
- Streamed the chart through `Suspense` into the existing `instrument-price-chart-slot` so the instrument shell and metrics are not blocked by the price-series fetch.
- Kept the change display-only; no scoring, recommendation, guardrail, methodology, or data-pipeline logic was changed.

### Tests Run
- `npm.cmd run typecheck` — PASS
- `npm.cmd run lint` — PASS
- `npm.cmd test` — PASS, 353 tests
- `npm.cmd run build` — PASS

### Result
Completed.

### Notes for Claude
- Browser smoke verification was attempted. The local dev server remained stuck at `Starting...`, but the production server served on port 3001 after a successful build; `/instruments/MSFT` redirected to `/login`, so the chart UI still needs a recheck in an authenticated browser session.
- The new repository test verifies the getter uses the expected `instrument_prices` filters and preserves the latest point after downsampling.

## 2026-06-25 - Instrument Detail Characteristics Score Trend Panel

### Source
Claude Code

### Objective
Add a display-only Characteristics score-trend panel to the instrument detail Overview, streamed independently from stored recommendation history.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/application/ports/repositories/RecommendationRepository.ts`
- `src/application/services/recommendations/RecommendationService.ts`
- `src/components/instruments/instrument-cards.tsx`
- `src/components/instruments/score-trend-panel.tsx`
- `src/domain/recommendations/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseRecommendationRepository.ts`
- `tests/recommendations.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `RecommendationScoreHistoryPoint` plus `getScoreHistory(instrumentId)` on the recommendation repository/service.
- Implemented Supabase history loading from `recommendation_history`, deduped to one row per `run_date` with the latest `created_at` winning, ordered ascending by run date.
- Added a client-only neutral SVG Characteristics score-trend card with latest score, assessment chip, previous-run delta, sparse-point markers, hover tooltip, and empty/single-point states.
- Streamed the score-trend panel through `Suspense` into the Overview without adding it to the blocking instrument-detail `Promise.all`.
- Paired the score-trend card with the existing Characteristics breakdown on large screens, stacked on smaller screens.
- Kept the panel display-only and observational; no scoring, methodology, recommendation, guardrail, or data-pipeline logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- The new getter test verifies the one-row-per-run-date dedupe behavior and ascending return order.
- The score-history series is currently expected to be short, roughly a few insight runs, and will fill in as future recommendation runs accumulate.
- Browser recheck in an authenticated session is still pending; unauthenticated local checks redirect instrument detail pages to `/login`.

## 2026-06-25 - Instrument Detail UI Polish

### Source
Claude Code

### Objective
Improve the instrument detail page UI/UX with a sticky identity header, refined Overview metrics, chart reference overlays, and clearer Characteristics visuals.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/components/instruments/instrument-cards.tsx`
- `src/components/instruments/instrument-price-chart.tsx`
- `src/components/instruments/score-trend-panel.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added a sticky page-level identity header above the tab nav with back link, ticker/name, type/freshness/active badges, latest price, daily change, and 1Y return.
- Removed duplicate instrument identity content from the Overview body and reorganized Overview into asset context, key returns, 52-week position, long-horizon diagnostics, score trend, and Characteristics breakdown.
- Added display-only 52-week high/low reference lines and HTML y-axis price labels to the price chart, with active period buttons using the primary-token filled style.
- Updated the score-trend panel to use a fixed 0-100 y-domain, HTML y-axis labels, explicit previous-run delta wording, and a footer summary row.
- Colored Characteristics component progress bars by score level and added a low-score warning icon for components below 40.
- Kept the work UI-only and display-only; no scoring, methodology, recommendation, guardrail, access-control, or data-pipeline logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Browser recheck for stock, ETF, and bond ETF pages is still pending in an authenticated session; local unauthenticated instrument detail checks redirect to `/login`.
- Sticky header uses `top-16`; verify against the deployed dashboard shell top-nav height during authenticated browser QA.

## 2026-06-25 - Instrument Detail Characteristics Methodology Alignment

### Source
Claude Code

### Objective
Align the instrument detail Characteristics breakdown and score-trend visual references with documented component inputs and `RecommendationRulesService.labelFromScore` score bands.

### Files Changed
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/recommendations/recommendationPresentation.ts`
- `src/components/instruments/instrument-cards.tsx`
- `src/components/instruments/score-trend-panel.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added one-line factual component descriptions in the Characteristics breakdown for stock, ETF, bond ETF, gold, and crypto component keys, sourced from `docs/SCORE_METHODOLOGY.md` and the current recommendation scoring services.
- Introduced a shared `CHARACTERISTICS_SCORE_BANDS` constant and wired `RecommendationRulesService.labelFromScore` to it so UI score-band visuals track the documented thresholds.
- Updated Characteristics progress bars and score chips to use 65/48 score bands, with the low-score warning icon only below 35.
- Added faint score-band reference lines at Excellent/Good/Neutral thresholds to the Characteristics score-trend panel, plus a guardrail note that displayed assessment labels may be capped below the raw score band.
- Kept the work display-only; no scoring formulas, weights, data pipelines, feature flags, access controls, or advisory wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests after rerun with elevated filesystem permission
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Initial `npm.cmd test` failed before executing tests because TypeScript could not write `.test-build` files under sandboxed filesystem permissions (`EPERM`); rerunning the same command with elevated filesystem permission passed.
- Browser recheck for stock, ETF, and bond ETF component sets is still pending in an authenticated session.

## 2026-06-25 - Instrument Price Chart Axis and Header Return Alignment

### Source
Claude Code

### Objective
Move price chart y-axis labels to the left and align named-period chart header returns with stored Overview market metrics.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/components/instruments/instrument-price-chart.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Moved the price-scale y-axis labels for the 25/50/75% gridline prices to a left-edge HTML overlay.
- Kept the 52-week high/low reference labels on the right edge next to their dashed reference lines.
- Passed stored 1Y, 5Y, and 20Y return metrics from `marketView` into the streamed price chart.
- Updated the chart header change figure and line/area/end-dot color for 1Y, 5Y, and 20Y to use the stored return value, with absolute dollar change derived from the latest price; 1M/3M/6M remain window-computed.
- Left the plotted line/area geometry, date ticks, 52-week reference lines, and hover tooltip behavior unchanged.
- Kept the work display-only; no scoring, recommendation, methodology, access-control, or data-pipeline logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Browser recheck in an authenticated session is still pending; verify a deep mover such as NVDA has chart header 1Y/5Y/20Y percentages matching the Overview stored returns exactly.

## 2026-06-25 - Instrument Long-Horizon CAGR Display

### Source
Claude Code

### Objective
Update the instrument detail Long-Horizon card to display annualised multi-year returns while preserving stored volatility and drawdown diagnostics.

### Files Changed
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Renamed the card to "Long-Horizon Returns" and changed the subtitle to clarify annualised CAGR display-only context.
- Reworked the table into horizontal 1Y, 5Y, 10Y, 15Y, and 20Y period columns.
- Displayed 1Y return unchanged and converted stored 5Y/10Y/15Y/20Y total returns to CAGR using nominal period years.
- Left volatility and max drawdown values as stored display values; 5Y volatility intentionally renders as "—" because no stored 5Y volatility field exists.
- Added CAGR bar visualization with clipped width at 100% CAGR and green/amber/red coloring by annualised return level.
- Added the requested CAGR formula disclosure and preserved the display-only scoring/guardrail disclaimer.
- Kept the work display-only; no scoring, methodology, recommendation, access-control, or data-pipeline logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests after rerun with elevated filesystem permission
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Initial `npm.cmd test` failed before executing tests because TypeScript could not write `.test-build` files under sandboxed filesystem permissions (`EPERM`); rerunning the same command with elevated filesystem permission passed.
- Browser recheck in an authenticated session is still pending; verify a deep-history name such as NVDA shows separated 15Y/20Y annualised returns rather than near-identical total returns.

## 2026-06-26 - Return Character Worst Week All-History

### Source
Claude Code

### Objective
Replace the instrument detail Overview Return Character "Worst week" tile with an all-history, date-based weekly return computed from the loaded price series.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`

### Summary
- Added an all-history weekly-return calculation over the sorted price series using the latest earlier point at least seven calendar days before each observation.
- Updated Return Character stats to expose `worstWeekAllHistory` and render the "Worst week" tile from that value instead of the trailing-1Y `riskMetric.worstWeeklyReturn`.
- Kept the change display-only; no scoring, methodology, data-pipeline, guardrail, or recommendation logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS after elevated rerun; initial sandbox run hit `.test-build` EPERM writes.
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- The all-history weekly value is exact for the daily recent segment and approximate in older downsampled history, matching the existing long-term Return Character context.

## 2026-06-26 - Instrument Detail Overview Polish

### Source
Claude Code

### Objective
Apply four display-only polish fixes to the instrument detail Overview: lucide icons, chart/facts height alignment, long-horizon risk bars, and date-based rolling 1Y return-character stats.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/components/instruments/instrument-cards.tsx`
- `src/components/instruments/instrument-price-chart.tsx`
- `src/components/instruments/score-trend-panel.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Replaced blank Tabler class-name spans with `lucide-react` icon components in Key Observations and Characteristics breakdown.
- Made the price chart card, Key Facts card, score trend card, and return-character card participate in equal-height rows; the chart SVG now flexes vertically within its card.
- Added red max-drawdown bars to the Long-horizon risk card for 1Y/5Y/10Y/15Y/20Y windows.
- Recomputed rolling one-year return-character stats by date rather than a fixed row offset, avoiding overstated older downsampled periods.
- Kept all changes display-only; no scoring, methodology, recommendation, guardrail, data-pipeline, access-control, or feature-flag logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Browser recheck in an authenticated session is still pending; verify lucide icons render, chart/facts rows align, long-horizon risk bars render, and NVDA rolling 1Y stats are no longer inflated by downsampled index offsets.

## 2026-06-26 - Instrument Detail Overview v2

### Source
Claude Code

### Objective
Evolve the instrument detail Overview tab into the approved v2 layout with streamed facts, deterministic observations, rolling return-character diagnostics, split long-horizon cards, and a balanced score-first presentation.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/application/services/recommendations/RecommendationService.ts`
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added a read-only latest-score helper filtered to active instruments so the Overview can stream a "Top X% vs universe" percentile.
- Reused the streamed price-series read for both the SVG chart and deterministic return-character rolling stats.
- Added streamed Key Facts from existing fundamentals detail fields and stored risk metrics; missing values render as "—".
- Added deterministic Key Observation cards from stored scoring components and documented score bands; no generated text or scoring changes.
- Reworked Overview into the v2 layout: verdict hero, chart plus facts, full-width two-column Characteristics breakdown, split long-horizon returns/risk cards, score trend plus return character, and bottom display-only disclaimer.
- Kept all changes display-only; no scoring, guardrail, methodology, data-pipeline, access-control, or feature-flag logic changed.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS, 354 tests after rerun with elevated filesystem permission
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Initial sandboxed `npm.cmd test` failed before executing tests because TypeScript could not write `.test-build` files (`EPERM`); rerunning the same command with elevated filesystem permission passed.
- Browser recheck in an authenticated session is still pending for a deep stock, young IPO, ETF, and bond ETF.
- Dividend yield is shown as "—" because the current fundamentals ratio/profile domain model does not expose a dividend-yield field.
## 2026-06-26 — Instrument Overview Lower-Grid Relayout

### Source
Claude Code

### Objective
Relayout the instrument Overview lower card grid so returns and score trend stack against risk, with return character spanning full width.

### Files Changed
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`

### Summary
- Split the active long-horizon wrapper into exported `LongHorizonReturnsCard` and `LongHorizonRiskCard` components without changing bar calculations, colours, footnotes, or wording.
- Placed the compact returns card above score trend in the left column and the stretching risk card in the right column.
- Moved Return Character to a full-width row below the two-column lower grid.
- Updated Return Character tiles to render as 6-up on desktop, 3-up on small screens, and 2-up on mobile.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Pure layout/markup change. No data, scoring, methodology, wording, component-logic, guardrail, recommendation, feature-flag, or access-control behavior changed.

## 2026-06-26 — Instrument Long-Horizon Risk Snapshot Strip

### Source
Claude Code

### Objective
Add a display-only risk snapshot strip to the instrument Overview Long-horizon risk card.

### Files Changed
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`

### Summary
- Added a stable three-tile risk snapshot strip above the Long-horizon risk volatility and drawdown groups.
- Surfaced existing stored fields for current drawdown, 1Y downside volatility, and volatility trend without changing data, scoring, methodology, or wording elsewhere.
- Used existing formatting helpers and risk tone conventions, with lucide trend icons for rising, falling, and stable volatility states.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Display-only card addition. No scoring, methodology, data-pipeline, guardrail, recommendation, feature-flag, or access-control behavior changed.

## 2026-06-26 — Instrument Risk Snapshot Explainer

### Source
Claude Code

### Objective
Add a one-line display-only explainer to the Long-horizon risk snapshot on the instrument Overview.

### Files Changed
- `src/components/instruments/instrument-cards.tsx`
- `docs/implementation-log.md`

### Summary
- Inserted a muted helper line explaining current drawdown, downside volatility, and volatility trend above the three risk snapshot tiles.
- Left the snapshot tiles, volatility and max-drawdown bar groups, footnote, data, scoring, and methodology unchanged.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Display-only text addition. No data, logic, scoring, methodology, data-pipeline, guardrail, recommendation, feature-flag, or access-control behavior changed.

## 2026-06-26 — Instrument Fundamentals Tab v2 Redesign

### Source
Claude Code

### Objective
Redesign the instrument detail Fundamentals tab into a premium deterministic v2 presentation without changing scoring, methodology, data fetching, or anchors.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `docs/implementation-log.md`

### Summary
- Reworked the Fundamentals tab around a Business Quality verdict hero using the shared Business Quality composite and documented score bands.
- Added band-coloured fundamental sub-score rows, side-by-side Key Ratios and Financial Snapshot cards, and null-safe metric rendering.
- Rebuilt Fundamental Trends into five category cards with deterministic aggregate direction chips and illustrative glyphs.
- Replaced the old wide trend table with a collapsed metric-level detail section grouped by stored trend category.
- Preserved deterministic, non-advisory language and did not change scoring, data, methodology, feature flags, access controls, or pipelines.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Browser recheck in an authenticated session is still pending for a stock with complete fundamentals and one with sparse trend data.

## 2026-06-26 — Fundamentals Tab Period Consistency

### Source
Claude Code

### Objective
Make the instrument Fundamentals tab period basis clearer by using annual ratios for Key Ratios, separating latest-quarter YoY momentum, and disambiguating current-level sub-scores from trend trajectory.

### Files Changed
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `docs/implementation-log.md`

### Summary
- Switched the Key Ratios card to the latest annual ratio row, matching the stored score, trend, and snapshot basis.
- Added an optional Latest quarter (YoY) line for revenue and EPS growth when a quarterly growth row is available.
- Updated sub-score and trend descriptions to distinguish current level from trajectory.
- De-emphasized trend card scores, added the level-vs-trajectory clarifier, and changed metric detail from signed deltas to prior values.
- Removed the now-unused signed-delta helper. No data, scoring, methodology, repository, feature-flag, access-control, or pipeline behavior changed.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Browser recheck in an authenticated session is still pending for annual-ratio and quarterly-growth display examples.

## 2026-06-26 — Portfolio Scheduled Job Fan-Out

### Source
Claude Code

### Objective
Make scheduled portfolio valuation, portfolio summary, and Portfolio Review jobs process every active portfolio when no `portfolioId` is supplied.

### Files Changed
- `src/application/ports/repositories/PortfolioRepository.ts`
- `src/infrastructure/repositories/supabase/SupabasePortfolioRepository.ts`
- `src/server/jobs/portfolioScheduledFanout.ts`
- `src/app/api/jobs/portfolio-valuation-refresh/route.ts`
- `src/app/api/jobs/portfolio-summary-refresh/route.ts`
- `src/app/api/jobs/portfolio-review-run/route.ts`
- `tests/portfolio-job-fanout.test.ts`
- `package.json`
- `docs/scheduled-jobs.md`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `listActivePortfolioIds()` to the portfolio repository port and Supabase implementation.
- Updated the three per-portfolio scheduled routes so explicit `portfolioId` runs remain single-portfolio, while scheduled no-param runs fan out across all active portfolios.
- Added per-portfolio error isolation with aggregate `success`, `partial_success`, and `failed` statuses plus processed/failed counts.
- Left recommendation-run unchanged because it is universe-wide with optional portfolio context.
- Added route-runner regression tests for explicit single runs, all-active fan-out, and partial success isolation for valuation, summary, and review jobs.
- Updated operations docs to document all-active portfolio fan-out and the scale follow-up for Portfolio Review if portfolio count grows.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Sequential fan-out is fine for alpha. If active portfolio count grows, revisit batching/concurrency and the 25-minute lock TTL on `portfolio-review-run`.

## 2026-06-26 — Holding Valuation Price Source

### Source
Claude Code

### Objective
Anchor holding valuation latest price and price date on `instrument_prices` so stale `instrument_market_metrics` rows cannot freeze portfolio valuation tails.

### Files Changed
- `supabase/migrations/135_holding_valuation_price_source.sql`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/implementation-log.md`

### Summary
- Added migration `135_holding_valuation_price_source.sql` to recreate `refresh_holding_portfolio_metrics`.
- Changed only the effective latest price precedence so the latest `instrument_prices` row is preferred before `instrument_market_metrics`, with average cost still as the final fallback.
- Kept previous close and 52-week range sourced from `instrument_market_metrics` as derived analytics.
- Ended the migration with `select refresh_holding_portfolio_metrics();` to recompute all portfolios after manual apply.
- Documented that holding valuation anchors on `instrument_prices` while `instrument_market_metrics` supports derived analytics.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed (initial sandboxed run hit `.test-build` EPERM; elevated rerun passed)
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Migration `135` is manual-apply. After applying it, run `portfolio-valuation-refresh` with no `portfolioId` to rewrite snapshots with fresh holding prices; this should fill the frozen Jun-10 valuation tail.

## 2026-06-26 — Portfolio Snapshot Holding Metrics Refresh

### Source
Claude Code

### Objective
Recompute per-portfolio derived holding metrics immediately before creating analytics snapshots so daily snapshots cannot read stale `holding_market_metrics`.

### Files Changed
- `src/application/services/PortfolioService.ts`
- `tests/analytics.test.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Added `analyticsRepository.refreshHoldingPortfolioMetrics(portfolioId)` at the start of `createAnalyticsSnapshot`.
- This makes the daily `portfolio-valuation-refresh` fan-out, admin refreshes, and transaction-triggered snapshots rebuild `holding_market_metrics` / `portfolio_current_metrics` before dashboard reads.
- Added a regression test asserting the refresh happens before dashboard construction starts.
- Marked documentation gap 49 fixed.
- No scoring, methodology, recommendation, guardrail, feature-flag, or access-control behavior changed.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Combined with migration 135, the snapshot path is now both fresh and source-of-truth-priced. After deploying/applying migration 135, run `portfolio-valuation-refresh` with no `portfolioId` to rewrite snapshots with fresh portfolio values.

## 2026-06-26 — Portfolio Dashboard Re-Skin Pass 1

### Source
Claude Code

### Objective
Re-skin the portfolio dashboard into the approved v2 executive overview with health sub-ratings, descriptive benchmark banner, sparkline stat cards, labeled performance charts, and a cleaner allocation/watch-area layout.

### Files Changed
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/portfolio/analytics-panels.tsx`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Switched the dashboard page to load the full Portfolio Review report via `getLatestReport` so allocation, concentration, diversification, and risk sub-ratings can be displayed.
- Loaded the stored performance summary at page level so the 60/40 benchmark banner and unrealised-value sparkline can use `benchmarkComparisons[].points[]`.
- Rebuilt the page layout with shared card styling, a portfolio health gauge, value cards, four stat cards, descriptive benchmark banner, 2x2 allocation/exposure grid, top movers, watch-area card, and preserved compliance/disclaimer links.
- Restyled the Performance command center and enhanced benchmark period charts with return-axis labels, date ticks, an emphasized 0% line, and a dashed provisional tail when snapshot dates exceed the latest price date.
- Updated the allocation donut legend styling to use app design tokens for light/dark compatibility.
- No scoring, methodology, data-pipeline, guardrail, access-control, or recommendation logic changed.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Browser recheck in an authenticated session is still pending for the final visual symmetry, chart provisional-tail rendering, and dark-mode pass.

## 2026-06-26 — Portfolio Dashboard Re-Skin Pass 1 Polish

### Source
Claude Code

### Objective
Polish the portfolio dashboard v2 layout by aligning value cards, making performance charts tabbed, and collapsing long exposure bar lists.

### Files Changed
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/portfolio/analytics-panels.tsx`
- `src/components/ui/charts.tsx`
- `docs/implementation-log.md`

### Summary
- Changed the health/value row to `Health | Total | Cash | Invested` using `lg:grid-cols-[1.5fr_1fr_1fr_1fr]`.
- Updated value cards so labels/icons stay at the top while the larger `text-3xl` value/detail block is vertically centered.
- Converted `PerformancePanel` to a client component with a 1Y / YTD / Since inception toggle so only one benchmark period chart renders at a time, while Daily / Weekly / Monthly summary cards remain visible.
- Added `maxItems` support to `HorizontalExposureBars`, collapsing long exposure lists into an `Other` row; geography uses `maxItems={8}`.
- Replaced hardcoded slate styling in `HorizontalExposureBars` with design tokens for better light/dark consistency.
- No data, scoring, methodology, wording, recommendation, guardrail, feature-flag, or access-control behavior changed.

### Tests Run
- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- `npm.cmd test` - passed after elevated rerun; first sandboxed attempt hit `.test-build` EPERM
- `npm.cmd run build` - passed

### Result
Completed

### Notes for Claude
- Browser recheck in an authenticated session remains pending for the tabbed performance panel and long-list exposure collapse.

## 2026-06-26 - Portfolio Dashboard Polish v2

### Source
Claude Code

### Objective
Restructure the portfolio dashboard top section, expand the performance chart, align stat cards without sparkline clutter, and collapse small geography exposures.

### Files Changed
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/portfolio/performance-panel.tsx`
- `src/components/ui/charts.tsx`
- `docs/implementation-log.md`

### Summary
- Moved Portfolio Health to its own full-width horizontal row with gauge, band chip, and four sub-rating pills.
- Moved Total, Cash, and Invested into a separate equal three-card value row and enlarged/top-aligned values.
- Removed the stat-card sparkline and aligned/enlarged the four stat-card values.
- Made the selected performance chart fill its plot column with a full-width non-preserved-aspect SVG.
- Added `minPercent` to `HorizontalExposureBars` and applied a 0.4% threshold to geography so small countries roll into `Other (N countries)`.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS after rerun outside sandbox; sandboxed attempt failed with EPERM writing `.test-build`
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display-only layout/theming change. No data, scoring, recommendation, feature-flag, access-control, or methodology logic changed.
- Browser recheck recommended for responsive dashboard layout and geography threshold display.

## 2026-06-26 - Portfolio Dashboard Chart Stroke and Health Card Polish

### Source
Claude Code

### Objective
Fix stretched performance-chart strokes under full-width SVG scaling and refine the Portfolio Health card hierarchy.

### Files Changed
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/portfolio/performance-panel.tsx`
- `docs/implementation-log.md`

### Summary
- Added non-scaling SVG stroke behavior to performance-chart gridlines, the 0% line, the portfolio line, and all plotted benchmark lines.
- Reworked the Portfolio Health gauge so the arc, score, and band chip are vertically stacked instead of overlapping.
- Enlarged the health gauge/score treatment, moved the explanatory description to a bottom caption with divider, and changed sub-ratings to a wider 2x2 grid.

### Tests Run
- `npm.cmd run typecheck` - PASS after rerun; first attempt hit stale generated `.next/types` entries before `next build` regenerated route types.
- `npm.cmd run lint` - PASS
- `npm.cmd test` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display-only portfolio dashboard polish. No data, scoring, recommendation, feature-flag, access-control, or methodology logic changed.
- Browser recheck recommended for chart stroke rendering and the revised health-card layout.

## 2026-06-30 - Portfolio Performance Return Summary and Chart Axis Fix

### Source
Claude Code

### Objective
Fix flattened portfolio Return Summary metrics and prevent performance chart axis labels from stretching under full-width SVG scaling.

### Files Changed
- `src/application/services/AnalyticsService.ts`
- `src/application/services/PerformanceService.ts`
- `src/components/portfolio/performance-panel.tsx`
- `tests/analytics.test.ts`
- `tests/performance.test.ts`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Removed the dashboard-level incomplete-ledger blanket override that forced every portfolio period return to the same manual-capital figure.
- Anchored portfolio trailing returns to the latest snapshot date, collapsed windows that predate inception to since-inception, and returned `Needs history` for implausibly tiny mid-life baselines.
- Kept since-inception's manual capital fallback for incomplete transaction-ledger portfolios.
- Made the chart legend's Portfolio value use the plotted portfolio endpoint.
- Moved performance chart axis labels out of SVG text into HTML overlays so labels do not distort while the plot still fills the card.
- Added regression coverage for distinct Daily/Weekly/Monthly values, latest-snapshot-date anchoring, young-portfolio long-window collapse, and tiny-baseline null handling.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd test` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display/calculation-layer portfolio performance fix only. No scoring, anchors, recommendation guardrails, feature flags, access controls, or compliance vocabulary changed.
- After deploy, run Admin -> Data Sources -> Refresh portfolio summaries, or let the daily cron run, so persisted trailing metrics recompute with the corrected period logic.
- Browser recheck recommended for native-proportion chart axis labels at desktop and mobile widths.

## 2026-06-30 - Exposure Bar Other Bucket Deduplication

### Source
Claude Code

### Objective
Fix duplicate `Other` rows and duplicate React keys in shared exposure bar lists.

### Files Changed
- `src/components/ui/charts.tsx`
- `src/components/ui/charts-utils.ts`
- `tests/charts.test.ts`
- `package.json`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Moved the exposure collapse helper into a pure utility so it can be unit-tested without React rendering.
- Folded source rows labeled `Other` into generated rollup buckets for both `minPercent` and `maxItems` collapse paths.
- Switched `HorizontalExposureBars` child keys from label-only to label plus index so duplicate source labels cannot collide.
- Added regression tests covering source `Other` folding and duplicate-label prevention.

### Tests Run
- `npm.cmd test` - PASS after fixing the new test import path; first run failed because the test imported a Next path alias directly in Node.
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS

### Result
Completed.

### Notes for Claude
- Display-only shared chart fix. No scoring, methodology, data, feature-flag, access-control, or compliance-language behavior changed.
- Browser recheck recommended on `/portfolio` to confirm the dev overlay no longer reports duplicate `Other` keys and Geography renders a single aggregated `Other (...)` row.
