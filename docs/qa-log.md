# QA Log

## 2026-06-30 SGT - Portfolio Performance Return Summary QA

Scope:
- Verify portfolio dashboard Return Summary metrics no longer flatten under incomplete manual capital history and performance chart axis labels render outside stretched SVG text.

QA findings addressed:

| Finding | Result |
|---|---|
| Daily / Weekly / Monthly / 1Y / YTD could all display the same manual-capital return | Fixed; the blanket dashboard override was removed and short periods now use per-period snapshot TWR |
| Trailing periods used wall-clock dates instead of the freshest snapshot date | Fixed; portfolio trailing windows anchor to the latest snapshot date |
| Young portfolios could show misleading missing long-window returns | Fixed; windows predating inception collapse to since-inception |
| Tiny mid-life baselines could create extreme returns | Fixed; implausibly tiny baselines now render as `Needs history` |
| SVG axis labels stretched horizontally in the full-width chart | Fixed; axis labels now render as HTML overlays while lines/grid remain SVG |

Checks performed and results:

| Check | Result |
|---|---|
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- Run the portfolio performance-summary refresh after deploy so persisted dashboard metrics recompute.
- Browser recheck remains pending for chart axis label proportions and responsive alignment.

This file records completed QA reviews, fixes, test coverage, residual risks, and follow-up items for future phases.

## 2026-06-26 SGT - Long-Horizon Cards v3 and 5Y Volatility QA

Scope:
- Verify the instrument detail Overview long-horizon cards are bars-only, the price chart includes a 1W period, and 5Y volatility is available as a display-only risk metric.

QA findings addressed:

| Finding | Result |
|---|---|
| Long-horizon cards were table-heavy and visually unbalanced | Fixed; active Overview cards now use scaled bar groups only |
| 5Y volatility rendered as missing even though 5Y return and drawdown existed | Fixed; migration 134 adds nullable `volatility_5y` and the app maps it to `volatility5y` |
| Risk card lacked a 5Y volatility metric while displaying 10Y/15Y/20Y windows | Fixed; the detailed risk card now includes 5Y volatility |
| Price chart had no chart-only one-week view | Fixed; `1W` was added to the chart period selector and falls back to local window change |

Checks performed and results:

| Check | Result |
|---|---|
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd test` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/134_display_only_5y_volatility.sql` manually.
- Recompute risk metrics with `refresh_instrument_risk_metrics_only(null)` or an equivalent forced risk recompute so existing rows populate `volatility_5y`.
- Browser recheck remains pending for representative deep-history and young instruments.

## 2026-06-25 SGT - Instrument Detail IA Real Tabs QA

Scope:
- Verify the instrument detail page IA now uses a focused Overview plus one-at-a-time tabs, with long-horizon metrics surfaced as display-only context.

QA findings addressed:

| Finding | Result |
|---|---|
| Instrument tabs rendered every panel stacked on the page | Fixed; the tab shell now renders only the active panel and supports keyboard navigation |
| Long-horizon return, volatility, and drawdown fields were loaded but not presented together | Fixed; Overview includes a compact 10Y/15Y/20Y display-only table |
| Performance tab duplicated fields already better suited for Overview | Fixed; returns, 52-week range, liquidity, freshness, history start, and observations moved to Overview |
| Placeholder-only tabs made the detail page feel unfinished | Fixed; empty telemetry, ETF exposure/holdings, bond duration/credit-quality, commodity profile, and benchmark relative placeholders are hidden |
| Fundamentals trend table made the fundamentals tab heavy by default | Fixed; detailed trend rows are collapsed behind a show/hide disclosure |

Checks performed and results:

| Check | Result |
|---|---|
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- Browser spot-check representative stock, young stock, ETF, and bond ETF records against a seeded database to confirm populated versus `Insufficient history` long-horizon states and active-panel-only DOM behavior.

## 2026-06-24 SGT - Long-Horizon Risk Display Windows QA

Scope:
- Verify display-only 10Y/15Y/20Y volatility and max-drawdown fields can populate without changing instrument risk scoring or recommendation behavior.

QA findings addressed:

| Finding | Result |
|---|---|
| Instrument risk metrics only exposed 1Y/3Y/5Y drawdown windows and short volatility windows | Fixed; migration 133 adds nullable 10Y/15Y/20Y volatility and max-drawdown fields |
| Long-horizon risk windows should stay display-only | Preserved; risk score, risk bucket, volatility bucket, confidence score, scoring, guardrails, and recommendations are unchanged |
| 20Y windows can be null universe-wide if the provider's 5,000-bar cap is treated as exact 20-year coverage | Fixed; migration 133 uses the migration-132 120-day tolerance and docs now state that 20Y reflects deepest-available history when the provider cap binds |
| UI needs a neutral null state for instruments without enough long history | Fixed; the instrument detail risk card shows `Insufficient history` for null long-window values |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 133 adds nullable long-horizon risk columns | PASS |
| Both risk metric refresh functions populate gated 10Y/15Y/20Y volatility fields | PASS |
| Both period drawdown refresh functions populate gated 10Y/15Y/20Y max-drawdown fields | PASS |
| Fallback risk calculation returns long-window values for deep history and nulls for young history | PASS |
| Fallback risk score equals the pre-existing formula and ignores the new long-window fields | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test -- instrument-ia.test.js` | PASS (352/352; command currently runs the full configured suite plus the extra argument) |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/133_long_horizon_risk_windows.sql` manually to Supabase. The migration includes full repopulation calls for risk metrics and period drawdowns.
- Confirm one sample instrument after manual migration application by comparing its `risk_score` and `risk_bucket` before/after; expected result is identical score/bucket with only display fields added.

## 2026-06-24 SGT - Forced Deep Price Backfill Marker QA

Scope:
- Verify the 20-year raw price-history backfill can select fresh-but-shallow instruments and then converge with a per-instrument attempted-depth marker.

QA findings addressed:

| Finding | Result |
|---|---|
| `needsHistoryBackfill` skipped instruments with current latest prices even when their stored history was shallower than the 20-year target | Fixed; admin history backfill now passes `forceDeepBackfill` and uses depth-based selection |
| FMP-limited instruments could otherwise re-qualify forever during deep backfill attempts | Fixed; force-deep runs mark `price_history_backfilled_through` after provider fetch attempts |
| Normal non-force history backfill behavior should remain unchanged | Preserved; the existing freshness-based `needsHistoryBackfill` path is used when `forceDeepBackfill` is false |
| Deep-backfill migration numbering affects the planned Phase-3 risk migration | Noted; migration 131 is used here, so the planned Phase-3 risk migration shifts to 132 |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 131 adds nullable `instruments.price_history_backfilled_through` | PASS |
| Force-deep backfill selects a fresh instrument with shallow earliest history | PASS |
| Force-deep backfill records attempted depth and skips the same instrument on the next pass | PASS |
| Non-force backfill skips the same fresh shallow instrument, matching prior behavior | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test -- price-refresh.test.js` | PASS (351/351; command currently runs the full configured suite plus the extra argument) |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (351/351) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/131_instrument_price_history_backfill_marker.sql` manually to Supabase before using the forced deep-backfill marker in production.
- After migration 131 is applied, use the existing Backfill market history button in batches of 50; the 391-instrument universe should take roughly 8 clicks, with FMP-limited instruments attempted once for the configured depth.

## 2026-06-24 SGT - Long-Horizon Display Returns QA

Scope:
- Verify 20-year market-history storage and display-only 10Y/15Y/20Y instrument return data plumbing.

QA findings addressed:

| Finding | Result |
|---|---|
| Market-history and benchmark backfill windows were still limited to 5 years | Fixed; admin history and benchmark refresh calls now request 7,300 days |
| Instrument market metrics only exposed 1Y/3Y/5Y returns | Fixed; migration 130 adds nullable 10Y/15Y/20Y fields and refresh logic |
| Long-horizon return values should not appear when an instrument lacks enough history | Fixed; TypeScript fallback and SQL refresh gate long returns on sufficient history |
| Long-horizon return plumbing must remain display-only | Preserved; no scoring, guardrail, risk-score, methodology math, or recommendation path was changed |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 130 adds nullable `return_10y`, `return_15y`, and `return_20y` columns | PASS |
| Market-metrics refresh RPC populates long-horizon returns without changing existing 1Y/3Y/5Y behavior | PASS |
| App domain and Supabase mapping expose the new nullable return fields | PASS |
| Fallback market views compute 10Y/15Y/20Y returns with sufficient history | PASS |
| Fallback market views return null for 10Y/15Y/20Y returns with insufficient history | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (349/349) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/130_market_metrics_long_horizon_returns.sql` manually to Supabase.
- Run the 20-year market-history backfill and benchmark refresh after the migration so persisted long-horizon fields can populate.
- UI wiring for displaying the new metrics remains a later phase.

## 2026-06-23 SGT - Security Master Mapping Cleanup QA

Scope:
- Verify a manual migration hardens ETF holding Security Master mapping against inactive stubs and dot/dash class-share duplicates.

QA findings addressed:

| Finding | Result |
|---|---|
| Identifiers attached to inactive stub securities can remain mapping candidates | Fixed; migration 129 deletes identifiers whose security points to an inactive `securities_master` row |
| `sync_etf_holding_security_ids()` could reach inactive securities through identifier or alias candidate sources | Fixed; migration 129 adds active-security joins to both sources in both holding candidate blocks |
| Dot/dash class-share stubs such as `BRK-B` can duplicate active real securities such as `BRK.B` | Fixed; migration 129 deactivates internal-only stubs matching active real securities after dot/dash normalization |
| Ticker-change runbook omitted old-symbol internal stub cleanup | Fixed; `DOCUMENTATION_GAPS.md` now instructs deactivating the old-symbol stub, deleting inactive identifiers, and re-running ETF holding sync |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 129 removes identifiers for inactive securities before and after stub deactivation | PASS |
| Mapping function hardens identifier and alias candidate sources for ETF top holdings | PASS |
| Mapping function hardens identifier and alias candidate sources for portfolio look-through holdings | PASS |
| Dot/dash duplicate cleanup only deactivates internal-only stubs with an active real counterpart | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (347/347) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/129_security_master_mapping_cleanup.sql` manually to Supabase after migration 128.
- After applying, re-check ambiguous ETF holding mappings and verify inactive-stub identifiers are absent.

## 2026-06-23 SGT - Internal ETF Holding Security Stub Backfill QA

Scope:
- Verify a manual migration can incrementally create internal-only Security Master stubs for ETF top-holding symbols that remain outside the selectable universe after migration 127.

QA findings addressed:

| Finding | Result |
|---|---|
| Newly added ETFs can hold non-universe companies that do not yet have active `securities_master` rows | Fixed; migration 128 inserts internal-only stubs for distinct ETF holding symbols with no active security |
| Newly seeded universe stocks should resolve to real securities rather than duplicate stubs | Preserved; migration 128 assumes migration 127 has run and skips any symbol already present as an active security |
| ETF top holdings need to be re-mapped after stub creation | Fixed; migration 128 runs `sync_etf_holding_security_ids()` |
| New stubs need issuer links for issuer-level analysis | Fixed; migration 128 runs `sync_security_issuer_links()` |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 128 inserts only missing active canonical symbols | PASS |
| Migration 128 inserts `SYMBOL` identifiers for new stubs with conflict protection | PASS |
| Migration 128 calls ETF holding and issuer sync functions | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (347/347) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/128_internal_etf_holding_securities.sql` manually to Supabase after migration 127.
- After applying, verify non-universe ETF holding symbols have internal-only securities and ETF top holdings have updated `holding_security_id` mappings.

## 2026-06-23 SGT - Security Master Incremental Setup QA

Scope:
- Verify a manual migration can incrementally create and link Security Master rows for newly seeded active instruments without app-code changes.

QA findings addressed:

| Finding | Result |
|---|---|
| Newly seeded instruments can remain with `security_id = null` after the original Security Master setup has already run | Fixed; migration 127 inserts and links missing active instruments idempotently |
| Freshly inserted securities must be visible before instruments are linked | Fixed; insert and update/link run as separate statements |
| Newly linked instruments need Security Master identifiers for downstream matching | Fixed; migration inserts symbol, exchange symbol, provider symbol, ISIN, and CUSIP identifiers with conflict protection |
| ETF holding mappings and issuer links need to pick up the new securities | Fixed; migration runs `sync_security_issuer_links()` and `sync_etf_holding_security_ids()` |
| Internal-only ETF holding stubs can collide with newly linked selectable stocks | Fixed; migration deactivates internal-only duplicates for newly linked stock symbols and logs the affected symbols via `raise notice` |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 127 uses separate insert and link statements | PASS |
| Migration 127 calls the existing issuer and ETF holding sync functions | PASS |
| Migration 127 includes the GAP #40 internal-only duplicate guard | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (347/347) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/127_security_master_incremental_setup.sql` manually to Supabase after seeding the expanded universe.
- After applying, verify the 54 new stocks and new ETFs have non-null `security_id` values and check migration notices for any deactivated internal-only duplicate symbols.

## 2026-06-23 SGT - Adaptive Daily Returns Rebuild QA

Scope:
- Verify daily-return refresh uses per-instrument adaptive rebuild semantics and keeps manual/admin refresh fast without losing full-history repair for new or incomplete instruments.

QA findings addressed:

| Finding | Result |
|---|---|
| Migration 123's simple incremental window made cron fast but left the admin full path expensive | Fixed; both cron and admin paths now call the adaptive recent-window default |
| New instruments need full daily-return history after price backfill | Fixed in migration 124; instruments without daily returns rebuild from the beginning of price history |
| Existing incomplete daily-return history should be repaired automatically | Fixed in migration 124; returns starting more than 7 days after first price trigger full rebuild |
| Rare full rebuilds still need an explicit escape hatch | Fixed; app layer exposes `forceFull` and repository passes `p_force_full` |

Checks performed and results:

| Check | Result |
|---|---|
| Repository passes `p_recent_window_days` and `p_force_full` to the RPC | PASS |
| Service default daily-return refresh uses recent window 30 and `forceFull=false` | PASS |
| Explicit force-full service call passes `forceFull=true` | PASS |
| Migration 124 encodes missing-history, short-history, recent-window, and force-full cutoff rules | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (347/347) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/124_adaptive_daily_returns.sql` manually to Supabase after migration 123.
- After deployment, run Refresh daily returns and verify new instruments receive full daily-return history while complete instruments update quickly.

## 2026-06-23 SGT - Full-Universe Refresh Auto-Sizing QA

Scope:
- Verify instrument-count-bound refresh jobs and admin actions no longer silently under-cover the expanded 391-instrument universe, and verify the daily-returns cron path can use an incremental window.

QA findings addressed:

| Finding | Result |
|---|---|
| Derived metric batch defaults used fixed pass counts that could miss instruments as the universe grows | Fixed; omitted `maxBatches` now derives from active instrument count |
| Risk metrics defaulted to a fixed batch size when no cap was supplied | Fixed; omitted `batchSize` defaults to the active instrument count |
| Daily returns cron recomputed the full universe every day | Fixed; migration 123 schedules daily returns with `incrementalDays=30` while full/admin paths pass null |
| Fundamentals and ETF look-through production services could under-cover if eligible sets outgrew their env defaults | Fixed; container-created services auto-size to eligible stock/ETF counts |
| Recommendation, news ingestion, and Portfolio Review context loading used fixed `limit: 500` active-instrument reads | Fixed; active instrument reads now fetch the full active universe |

Checks performed and results:

| Check | Result |
|---|---|
| Daily returns full path passes `incremental_days = null`; incremental path passes finite days | PASS |
| Derived metric service tests cover all active instruments when caps are omitted | PASS |
| Fundamentals one-pass auto-sizing covers all eligible stocks | PASS |
| ETF look-through auto-sizing covers all eligible ETFs when enabled in the container | PASS |
| Migration 123 keeps derived cron time slots and only changes cap/incremental query parameters | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (346/346) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/123_full_universe_coverage.sql` manually to Supabase.
- After deployment, confirm the first derived cron chain covers the active universe and that daily returns runtime improves with the 30-day incremental window.

## 2026-06-23 SGT - Marsh McLennan Ticker Change QA

Scope:
- Verify the curated universe and supporting universe documentation use `MRSH` instead of the old `MMC` ticker.

QA findings addressed:

| Finding | Result |
|---|---|
| Marsh McLennan ticker changed from `MMC` to `MRSH` | Fixed in `ALPHA_STOCK_SECTORS` Financials |
| Hardcoded old ticker references could reintroduce the old symbol | Searched source, docs, tests, and migrations; related documentation references now use `MRSH` |
| Ticker-change operational process was undocumented | Added a universe-section note: rename the existing `instruments` row before seeding, then refresh prices and update `alphaUniverse.ts` |

Checks performed and results:

| Check | Result |
|---|---|
| Hardcoded ticker search across `src`, `docs`, `tests`, and `supabase` | PASS; runtime/source references now use `MRSH`; remaining `MMC` mentions are this change-log context only |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- In production, update the existing `instruments` row from `MMC` to `MRSH` before running Seed Universe, preserving the existing `instrument_id`.
- Re-fetch/gap-fill prices for the new ticker after the live row is renamed.

## 2026-06-23 SGT - Universe Seed And Metadata Refresh Throughput QA

Scope:
- Verify seed-time tag writes, metadata refresh writes, Security Master sync behavior, and metadata coverage caps are suitable for the expanded 391-instrument universe.

QA findings addressed:

| Finding | Result |
|---|---|
| Seed Universe tag synchronization used per-instrument update/delete/insert calls | Fixed; `instrument_tags` is now deleted and inserted in batched set-based operations |
| Removing the per-row tag column update required seed upsert coverage | Verified; `ensureSeededUniverse` passes both `benchmarkTags` and `thematicTags` into `upsertInstruments` |
| Metadata refresh synced Security Master identifiers once per batch | Fixed; batch mode suppresses per-batch sync and performs one sync after all batches when updates occurred |
| Metadata refresh used fixed `maxBatches` caps that no longer covered the expanded universe | Fixed; omitted `maxBatches` now auto-sizes from active instrument count, and admin/cron paths omit the cap |
| Symbols with still-missing identifiers could be selected again inside the same full run | Fixed; multi-batch metadata refresh excludes symbols already attempted in the current run |
| Metadata repository writes used per-symbol select/update/taxonomy round trips | Fixed; current rows are fetched in one `.in("symbol", ...)` call and metadata/taxonomy writes are batched |

Checks performed and results:

| Check | Result |
|---|---|
| `updateInstrumentTags` uses batched delete and insert operations | PASS |
| `updateInstrumentMetadata` batches current-row fetch, instrument upsert, and taxonomy writes | PASS |
| Metadata batch refresh auto-covers all active instruments with no explicit `maxBatches` | PASS |
| Metadata batch refresh syncs Security Master once after the batch loop | PASS |
| Migration 121 removes the `maxBatches` cap from the daily metadata cron command | PASS |
| `FMP_METADATA_CONCURRENCY` verified at 8 | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (343/343) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/121_metadata_refresh_full_universe_coverage.sql` manually to Supabase.
- After deployment, run Seed Universe and Refresh instrument metadata, then confirm the daily metadata job covers the full active universe without a fixed pass cap.

## 2026-06-23 SGT - ETF Benchmark Map Documentation Sync QA

Scope:
- Verify the expanded ETF universe benchmark-map documentation and curated single-country ETF benchmark routing stay aligned.

QA findings addressed:

| Finding | Result |
|---|---|
| New country ETFs needed explicit Benchmark Relative routing | Fixed; `EWG` maps to `developed_ex_us`, and `EWZ`/`EWY`/`EWT` map to `emerging_markets` |
| Public methodology page did not yet describe the new ETF category benchmark routes | Fixed; ETF benchmark-relative note now covers factor/style, option-income, mid-cap, ESG, aerospace/defense, multi-asset, preferred, municipal, and emerging-market bond categories |
| `SCORE_METHODOLOGY.md` ETF benchmark map did not yet include the new categories and country ETFs | Fixed; benchmark table now mirrors the expanded routing |

Checks performed and results:

| Check | Result |
|---|---|
| New country ETF benchmark routing regression assertions | PASS |
| `METHODOLOGY_LAST_UPDATED` bumped to 2026-06-23 | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- None. No scoring formula, weights, labels, or access controls changed.

## 2026-06-23 SGT - Universe Expansion Coverage QA

Scope:
- Verify the curated alpha/full universe expansion adds the requested ETF and stock symbols without changing scoring formulas or access controls.

QA findings addressed:

| Finding | Result |
|---|---|
| DOCUMENTATION_GAPS Low 5 tracked future ETF universe additions and sector-depth additions | Fixed; 31 ETFs and 54 stocks were added to the curated universe |
| New ETF product categories needed exhaustive classification coverage | Fixed; all nine new ETF categories have labels, canonical sectors, and tests |
| Expanded stock universe would exceed the previous one-pass fundamentals cap | Fixed; `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH` default is now 200 |
| New ETF categories needed asset-category and benchmark routing checks | Fixed; tests cover sample new category symbols, asset category, canonical sector, and benchmark key |

Checks performed and results:

| Check | Result |
|---|---|
| Curated ETF symbol count is 232 with no duplicates | PASS |
| Curated stock symbol count is 159 with no duplicates | PASS |
| Sample new ETF category mappings (`MTUM`, `PFF`, `MUB`, `MDY`) | PASS |
| New ETF category canonical-sector and asset-category mappings | PASS |
| New ETF category benchmark routing resolves existing benchmark keys | PASS |
| DOCUMENTATION_GAPS Low 5 marked closed | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- After deployment, run the universe seed and downstream refresh sequence so the added instruments receive metadata, prices, ETF look-through where applicable, fundamentals where applicable, derived metrics, and recommendation/report outputs.

## 2026-06-23 SGT - Monthly ETF Look-Through Single-Pass Schedule QA

Scope:
- Verify the monthly Supabase cron chain collapses ETF look-through from five passes to one after the set-based eligibility and bounded-concurrency app-layer changes.

QA findings addressed:

| Finding | Result |
|---|---|
| Monthly ETF look-through still had five scheduled passes after one pass became sufficient | Fixed; migration 120 schedules one `app-monthly-etf-lookthrough-refresh` |
| One pass needed to cover the full eligible ETF universe | Fixed; `ETF_LOOKTHROUGH_MAX_ETFS_PER_RUN` default is now 250 |
| Vercel function ceiling should be explicit for the longer ETF look-through pass | Fixed; `/api/jobs/etf-lookthrough-refresh` exports `maxDuration = 300` |
| Monthly chain could be shorter after pass collapse | Fixed; monthly chain now runs at `23:30` and `23:35` UTC on the 1st |

New monthly schedule:

| UTC Cron | Job |
|---:|---|
| `30 23 1 * *` | `app-monthly-etf-lookthrough-refresh` |
| `35 23 1 * *` | `app-monthly-universe-validation` |

Checks performed and results:

| Check | Result |
|---|---|
| Migration unschedules exactly the prior 6 monthly jobs | PASS |
| Migration reschedules the same monthly chain minus the four dropped ETF look-through passes | PASS |
| Both monthly cron expressions use the 1st-of-month schedule (`1 * *`) | PASS |
| Commands copied from migration 117 except the merged ETF look-through job name | PASS |
| Daily and weekly schedules untouched | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (339/339) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/120_collapse_monthly_etf_lookthrough_single_pass.sql` manually to Supabase.
- Observe the first production single-pass ETF look-through run duration before making further schedule changes.

## 2026-06-23 SGT - ETF Look-Through Refresh Optimization QA

Scope:
- Verify ETF look-through refresh removes the per-ETF eligibility query loop and processes selected ETFs in bounded-concurrency waves.

QA findings addressed:

| Finding | Result |
|---|---|
| ETF eligibility checked sector and holdings dates with per-ETF queries | Fixed; refresh uses one `getLatestEtfExposureDates` set-based repository call |
| Selected ETFs refreshed sequentially | Fixed; selected ETFs run in bounded waves using `ETF_LOOKTHROUGH_FETCH_CONCURRENCY` |
| Per-ETF exposure upserts were sequential | Fixed; sector, country, top holdings, and theme upserts run in one `Promise.all` wave |
| Shared counters could be unsafe under concurrency | Fixed; each ETF task returns deltas that are folded after each wave |
| One provider failure should not fail the whole refresh | Preserved; one failing ETF is isolated and logged with `partial_success` when others complete |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 119 defines `get_latest_etf_exposure_dates` and required indexes | PASS |
| Missing-table / missing-function RPC fallback preserves all-eligible behavior | PASS |
| Set-based eligibility called once; per-ETF date lookups not called | PASS |
| Bounded provider concurrency with `fetchConcurrency=2` | PASS |
| Successful ETF totals summed correctly with one failing ETF isolated | PASS |
| Cron pass count and `maxEtfsPerRun` unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (339/339) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/119_get_latest_etf_exposure_dates_rpc.sql` manually to Supabase.
- Keep the existing five monthly ETF look-through passes until production timing supports a measured collapse.

## 2026-06-23 SGT - Weekly Fundamentals Single-Pass Schedule QA

Scope:
- Verify the weekly Supabase cron chain collapses fundamentals from three passes to one after the bounded-concurrency app-layer change.

QA findings addressed:

| Finding | Result |
|---|---|
| Weekly fundamentals still had three scheduled passes after bounded concurrency made one pass sufficient | Fixed; migration 118 schedules one `app-weekly-fundamentals-refresh` |
| One pass needed to cover the full active stock universe | Fixed; `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH` default is now 150 |
| Weekly chain previously crossed into Sunday UTC | Fixed; all weekly jobs now run Saturday UTC from `23:30` through `23:55` |
| Vercel function ceiling should be explicit for the longer fundamentals pass | Fixed; `/api/jobs/fundamentals-refresh` exports `maxDuration = 300` |

New weekly schedule:

| UTC Cron | Job |
|---:|---|
| `30 23 * * 6` | `app-weekly-fundamentals-refresh` |
| `35 23 * * 6` | `app-weekly-news-reconciliation` |
| `40 23 * * 6` | `app-weekly-market-vision` |
| `45 23 * * 6` | `app-weekly-recommendation-run` |
| `50 23 * * 6` | `app-weekly-portfolio-review-run` |
| `55 23 * * 6` | `app-weekly-telemetry-evaluation` |

Checks performed and results:

| Check | Result |
|---|---|
| Migration unschedules exactly the prior 8 weekly jobs | PASS |
| Migration reschedules the same weekly job chain minus the two dropped fundamentals passes | PASS |
| All weekly cron expressions use Saturday UTC (`* * 6`) and no Sunday UTC (`* * 0`) entries | PASS |
| Commands copied from migration 117 except the merged fundamentals job name | PASS |
| Daily and monthly schedules untouched | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (338/338) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/118_collapse_weekly_fundamentals_single_pass.sql` manually to Supabase.
- Observe the first production single-pass run duration before making any further weekly schedule changes.

## 2026-06-23 SGT - Bounded-Concurrency Fundamentals Refresh QA

Scope:
- Verify weekly fundamentals refresh processes due stocks in bounded-concurrency waves and preserves existing scoring/trend behavior.

QA findings addressed:

| Finding | Result |
|---|---|
| Fundamentals refresh processed due stocks sequentially | Fixed; due stocks now run in bounded waves using `fetchConcurrency` |
| Independent repository upserts inside each stock were sequential | Fixed; profile/statements/ratios and score/trends/summary writes now run in two independent `Promise.all` waves |
| Shared counters could not be safely mutated inside concurrent tasks | Fixed; each stock returns deltas that are folded after each wave |
| One provider failure should not fail the whole wave | Preserved; failed symbols are isolated and the result remains `partial_success` when other stocks complete |

Checks performed and results:

| Check | Result |
|---|---|
| Bounded stock-level concurrency with `fetchConcurrency=2` | PASS |
| All due stocks attempted and successful-stock totals summed correctly | PASS |
| One throwing symbol isolated in `failedSymbols` | PASS |
| `partial_success` status/log behavior preserved | PASS |
| `FUNDAMENTALS_FETCH_CONCURRENCY` defaulted and wired through container | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (338/338) |
| `npm.cmd run build` | PASS |

Residual items:
- Weekly fundamentals cron/pass count is unchanged; collapse the three passes only after measuring production runtime with the bounded-concurrency refresh.

## 2026-06-22 SGT - Re-Cascaded Refresh Schedule QA

Scope:
- Verify migration 117 re-cascades scheduled Supabase pg_cron jobs and collapses the two daily risk-metric passes into one schedule-only change.

QA findings addressed:

| Finding | Result |
|---|---|
| Daily refresh chain needed to align around the US market close / EOD publish window | Fixed; daily chain now starts with price refresh at 22:30 UTC |
| Risk metrics were still scheduled as two passes after set-based chunking shipped | Fixed; migration schedules one `app-daily-instrument-risk-refresh` at 22:50 UTC |
| Schedule changes must avoid app-code changes | Preserved; only migration 117 and documentation were changed |
| Existing job commands should stay unchanged except the merged risk job | Verified; commands copied from migrations 116, 101, and 082 except risk batchSize 350 |

New schedule:

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
| Weekly Sat | 23:30-23:55 | Fundamentals, news reconciliation, Market Vision, recommendation run |
| Weekly Sun | 00:00-00:05 | Portfolio review and telemetry evaluation |
| Monthly 1st | 23:30-23:55 | ETF look-through passes and universe validation |

Checks performed and results:

| Check | Result |
|---|---|
| Migration file is syntactically valid SQL by inspection | PASS |
| Unschedule list contains exactly the requested 27 job names | PASS |
| Reschedule list contains 26 jobs with the two old risk jobs collapsed into one new risk job | PASS |
| No endpoints or query strings changed except the merged risk job | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (337/337) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/117_recascade_refresh_schedule_single_pass_risk.sql` manually to Supabase.

## 2026-06-22 SGT - Chunked Set-Based Risk Metrics Refresh QA

Scope:
- Verify instrument risk-metric refresh batches use set-based RPC chunks instead of sequential single-instrument RPC calls.

QA findings addressed:

| Finding | Result |
|---|---|
| Risk-metric refresh called the risk RPC one instrument at a time | Fixed; selected instruments are refreshed by chunk through `refreshInstrumentRiskMetricsOnly(chunkIds)` |
| Statement timeouts still need resilient fallback | Preserved; timeout chunks fall back to the existing per-instrument JS calculation path |
| Stale-aware selection and result shape should not change | Preserved; batch selection, requested symbols, updated count, errors, and message format remain aligned with existing behavior |

Checks performed and results:

| Check | Result |
|---|---|
| Chunked happy path calls one set-based RPC for the selected chunk | PASS |
| Simulated chunk statement timeout falls back to per-instrument refresh | PASS |
| Per-instrument fallback uses stored prices and upserts calculated risk metrics | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (337/337) |
| `npm.cmd run build` | PASS |

Residual items:
- After observing production timings, the two scheduled risk-metric passes (`200 + 150`) can likely be collapsed into one later.

## 2026-06-22 SGT - Adjusted Historical EOD Daily Price Refresh QA

Scope:
- Verify the daily and manual EOD price refresh use adjusted-close historical prices instead of the abandoned FMP `eod-bulk` path.

QA findings addressed:

| Finding | Result |
|---|---|
| FMP `eod-bulk` was unsuitable for the daily ETFVision universe refresh | Superseded; bulk-EOD provider method and CSV helper removed |
| Daily refresh needed true EOD dates and adjusted close values consistent with backfill | Fixed; historical-price quotes store `quote.asOfDate` and adjusted `quote.price` |
| Daily EOD refresh should not spend time scanning full price history coverage | Fixed; the EOD path does not call `listInstrumentPriceStats` |
| Manual Admin `Refresh prices (EOD)` button needed to use the surviving EOD path | Fixed; action now calls `refreshInstrumentPricesEod` with derived/risk metrics skipped |
| Scheduled refresh needed to call the new source | Fixed in migration 116; cron route now uses `source=eod` |

Checks performed and results:

| Check | Result |
|---|---|
| Historical price provider mocked for adjusted EOD rows | PASS |
| Stored rows use the returned real EOD date rather than today's date | PASS |
| Stored rows use adjusted close from the historical quote price | PASS |
| Fetches run in bounded concurrency waves | PASS |
| EOD path avoids `listInstrumentPriceStats` | PASS |
| Missing symbols are reported without falling back to latest-price quotes | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (337/337) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply migration 116 manually in Supabase so the scheduled daily cron uses `source=eod`.
- Adjusted close is retroactive. The trailing 7-day refresh self-heals recent dividends/splits, but older adjusted-history changes still require the existing full `Backfill market history` operation or a future monthly full-backfill cron.

## 2026-06-22 SGT - FMP Bulk EOD CSV Parsing QA

Scope:
- Verify FMP `eod-bulk` responses are parsed as CSV and no longer fail through JSON parsing.

QA findings addressed:

| Finding | Result |
|---|---|
| `getBulkEodPrices` called `response.json()` against FMP `eod-bulk` | Fixed; provider now reads `response.text()` and parses CSV |
| Bulk EOD calls failed with JSON parse errors | Fixed; CSV body is parsed by header names |
| Adjusted close and true EOD date needed to be preserved | Covered; parser uses `adjClose` before `close` / `price` and uses the row date or requested date fallback |

Checks performed and results:

| Check | Result |
|---|---|
| CSV parser handles `symbol,date,open,high,low,close,adjClose,volume` sample | PASS |
| Parser returns adjusted close as price | PASS |
| Parser returns the EOD row date as `asOfDate` | PASS |
| Empty/non-data bodies still return `[]` | PASS by implementation guard |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (338/338) |
| `npm.cmd run build` | PASS |

Residual items:
- After deploy, run the Admin `Refresh prices (EOD)` button or the bulk route and confirm live FMP rows are stored with the expected EOD date.

## 2026-06-22 SGT - Admin Price Refresh Bulk EOD QA

Scope:
- Verify the Admin Data Sources manual "Refresh prices" control now uses the bulk-EOD price path while remaining prices-only.

QA findings addressed:

| Finding | Result |
|---|---|
| Manual `Refresh prices` still used the old batch latest-price path after bulk-EOD support was added | Fixed; action now calls `refreshInstrumentPricesFromBulkEod` |
| Manual price refresh needed to stay prices-only | Preserved; `skipDerivedMetrics: true` and `skipRiskMetrics: true` remain set |
| Operator label needed to distinguish the EOD path | Updated; button now reads `1. Refresh prices (EOD)` with pending text `Refreshing EOD prices...` |

Checks performed and results:

| Check | Result |
|---|---|
| `refreshInstrumentPricesAction` uses bulk-EOD service path | PASS |
| Old batch arguments removed from the manual price action | PASS |
| Derived/risk metric skipping preserved | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (337/337) |
| `npm.cmd run build` | PASS |

Residual items:
- After running the manual EOD price refresh in Admin, run the numbered derived-metric buttons when derived daily returns, anchors, market metrics, or risk metrics need recomputation.

## 2026-06-22 SGT - Bulk EOD Daily Price Refresh QA

Scope:
- Verify the daily instrument price refresh can use FMP Ultimate bulk-EOD pricing instead of the five batch quote passes.

QA findings addressed:

| Finding | Result |
|---|---|
| Daily price refresh required five scheduled passes | Fixed; migration 116 replaces the five cron entries with one `source=bulk_eod` route call |
| Latest-price path wrote `asOfDate` as today's date rather than the real EOD date | Fixed for the bulk path; stored `priceDate` comes from the requested bulk EOD date |
| Daily bulk refresh should not spend time scanning price history coverage | Fixed; bulk path does not call `listInstrumentPriceStats` |
| Omitted symbols still need coverage | Preserved; a non-empty bulk response falls back to the existing latest-price path for omitted active symbols |
| Non-trading or unavailable bulk dates should not write mismatched current prices | Guarded; empty bulk responses return no updates and do not fall back |

Checks performed and results:

| Check | Result |
|---|---|
| FMP bulk parser uses adjusted-close precedence to match historical parsing | PASS |
| Route default behavior unchanged when `source` is absent | PASS |
| `source=bulk_eod` supports optional `date=YYYY-MM-DD` | PASS |
| Bulk service stores the requested EOD date | PASS |
| Bulk service avoids `listInstrumentPriceStats` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (337/337) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/116_bulk_eod_instrument_price_refresh_schedule.sql` manually to Supabase.
- After deploy, spot-check several symbols where the bulk-EOD daily close and adjusted historical backfill overlap to confirm price/date continuity on live FMP data.

## 2026-06-22 SGT - History Backfill Batch Size QA

Scope:
- Verify the Admin Data Sources history backfill action uses the larger post-Optimization-B batch size without changing the rest of the backfill behavior.

QA findings addressed:

| Finding | Result |
|---|---|
| `Backfill market history` still used `batchSize: 5` after price-stat aggregation moved to SQL RPC | Fixed; changed the action to `batchSize: 50` |
| Backfill behavior needed to remain prices-only | Preserved; `skipDerivedMetrics: true` remains unchanged |
| Runtime risk needs an operational check after deploy | Logged; check latest `backfill_market_history` `duration_ms` and lower to about 25 if it approaches ~250s+ or throttles |

Checks performed and results:

| Check | Result |
|---|---|
| `lookbackDays: 1825` unchanged | PASS |
| `maxBatches: 1` unchanged | PASS |
| `includeBackfill: true` unchanged | PASS |
| `skipDerivedMetrics: true` unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (335/335) |
| `npm.cmd run build` | PASS |

Residual items:
- After deploy, run the backfill once and inspect `job_runs.duration_ms` for the latest `backfill_market_history` row.

## 2026-06-22 SGT - Instrument Price Stats RPC Optimization QA

Scope:
- Verify `listInstrumentPriceStats` no longer performs a full paginated JavaScript scan over `instrument_prices`.

QA findings addressed:

| Finding | Result |
|---|---|
| `listInstrumentPriceStats` paginated `instrument_prices` in 1000-row pages and aggregated in JavaScript | Fixed; repository now calls one grouped `get_instrument_price_stats` RPC |
| Price/derived-metric/backfill passes could spend ~150s in repeated price-stat scans | Mitigated; aggregation is pushed into Postgres using the existing instrument/date index |
| New RPC path needed parameter and mapping coverage | Fixed; added `tests/universe-repository.test.ts` |

Checks performed and results:

| Check | Result |
|---|---|
| RPC parameter for scoped instrument IDs is passed as `p_instrument_ids` | PASS |
| All-instrument stats call passes `p_instrument_ids: null` | PASS |
| RPC row maps to `InstrumentPriceStats` shape | PASS |
| Missing `instrument_prices` table guard returns `[]` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (335/335) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply `supabase/migrations/115_get_instrument_price_stats_rpc.sql` to the live Supabase project before relying on the deployed repository method.
- Direct live equivalence sampling against the previous JavaScript aggregation should be performed after the migration is applied.

## 2026-06-22 SGT - Med 29 Recalibration QA (sign-off)

Scope: distribution-level QA of the recalibrated recommendation engine across the full live universe (306 instruments) after the scoring programme (#2/#3/#5, period-fix, financial-sector, risk-cap, roicDurability). Review-only; no code change.

Result: **PASS / signed off.** Combined with Med 26 (drift lock), the scoring programme is QA-complete.

Checks and results:

| Check | Result |
|---|---|
| No score saturation | PASS � max 77.9 stock / 67.1 ETF / 63.7 bond; p90 67.5 stock / 60.1 ETF. No pegging. |
| Stock label spread | PASS � 27 Good / 70 Neutral / 8 Weak across 105 stocks. |
| Component coverage | PASS � essentially complete; **ETF benchmark_relative 172/172** (EFA/EEM backfill confirmed universe-wide). Only 1 stock missing fundamental_trends (104/105, limited history, excluded from denominator). |
| Orthogonality � Q vs CashFlow / BalanceSheet | PASS � 0.008 / -0.178. |
| Economic spot-checks | PASS � NVDA/AAPL/MSFT/JPM Good; SPY � benchmark-neutral; EEM 54.3 > VWO 50.7 (Korea/index-family effect intact); XOM recovered; COST not over-penalized; crypto appropriately low. Ordering intuitive. |

Residual / watch items (monitor; do NOT re-tune � frozen-anchor discipline):

| Item | Detail |
|---|---|
| Q?Profitability corr = 0.409 | Marginally above the ~0.40 target (was 0.380 mid-programme; both share ROIC level vs durability). ~17% shared variance � within tolerance, but crept up. If it exceeds ~0.45 in a future run, revisit roicDurability. |
| ETF / Bond compression | ETFs 92% Neutral (158/172), Bond ETFs 100% Neutral. Benchmark/risk components do discriminate (2 Good, 12 Weak exist) but near-constant default components damp spread. Inherent characteristic of diversified-instrument scoring, not a defect. Only a deliberate future model decision should touch ETF/bond weights. |
| Zero Excellent (=80) across the universe | Expected and already disclosed (composite effective ceiling ~mid-80s; Excellent reserved/uncommon). Not a defect. |

## 2026-06-22 SGT - Med 26 Scoring Golden Baseline QA

Scope:
- Add deterministic golden-regression coverage for the current scoring outputs without changing scoring logic or user-facing methodology.

QA findings addressed:

| Finding | Result |
|---|---|
| Future scoring changes needed a loud deterministic regression baseline | Fixed; added `tests/scoring-golden.test.ts` |
| Golden assertions needed to avoid volatile metadata and generated text | Fixed; normalized assertions include only scores, labels, guardrails, and component keys/scores |
| Stock scoring baseline needed to exercise the canonical phase-2 path | Fixed; stock evaluations are wrapped in `withStockPhase2Flag(true, ...)` |
| Fundamental scoring needed fixture-level coverage for strong, weak, and financial-sector paths | Fixed; added pinned sub-score snapshots and financial-path exclusions for cash conversion / ROIC durability |

Checks performed and results:

| Check | Result |
|---|---|
| Helper anchor scores are pinned | PASS |
| Fundamental sub-score snapshots are pinned | PASS |
| Stock / ETF / bond / gold / crypto normalized recommendation outputs are pinned | PASS |
| Focused `tests/scoring-golden.test.ts` run | PASS (3/3) |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (333/333) |
| `npm.cmd run build` | PASS |

Residual items:
- Future intentional scoring changes should update the golden baseline with an explicit methodology and QA note.

## 2026-06-21 SGT - Methodology Financial Terms Glossary QA

Scope:
- Verify the public methodology page includes the new financial terms glossary and still renders formulas correctly.

QA findings addressed:

| Finding | Result |
|---|---|
| Financial-statement metrics used in formulas needed plain-English definitions | Fixed; added a Financial terms collapsible table |
| Overview glossary needed coverage for valuation, margin, leverage, liquidity, return, issuer, beta, bond, and risk-statistic terms | Fixed; added the requested financial terms entries |

Checks performed and results:

| Check | Result |
|---|---|
| Financial terms accordion renders on `/methodology` | PASS |
| Representative entries for margins, high yield, and covariance render | PASS |
| Dev-server `/methodology` render still contains KaTeX markup | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Methodology Trend Decision Tree Clarification QA

Scope:
- Verify the public methodology page trend-direction wording and displayed trend-strength formula are clearer while preserving formula rendering.

QA findings addressed:

| Finding | Result |
|---|---|
| Trend Direction inputs note was too high-level for users to understand the label decision tree | Fixed; note now states the deterministic label logic for each trend label |
| Trend strength display used first-half average notation where the intended displayed comparison is latest vs earliest observation | Fixed; formula now displays `x_latest - x_first` |

Checks performed and results:

| Check | Result |
|---|---|
| Public methodology page includes the explicit trend label decision tree | PASS |
| Trend strength formula renders with `x_first` notation | PASS |
| Dev-server `/methodology` render contains KaTeX markup after the copy update | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Methodology Presentation Clarifications QA

Scope:
- Verify the public methodology page readability updates are present and formula rendering remains intact.

QA findings addressed:

| Finding | Result |
|---|---|
| Key mathematical notation needed plain-English definitions for non-technical readers | Fixed; added a Notation table under Key terms |
| Several formula notes used unexplained symbols and abbreviations | Fixed; added variable definitions for fundamentals, trends, Insight Alignment, Diversification, and covariance |
| Instrument component weight tables explained weights but not what each component measures | Fixed; added a "What it measures" column for each instrument type |
| Trend classification rules needed clearer direction and strength explanation | Fixed; expanded direction input notes and added a Trend strength formula row |
| Macro fit and Quality valuation adjustment examples could be read as exhaustive | Fixed; marked both as representative examples |

Checks performed and results:

| Check | Result |
|---|---|
| Public methodology page includes Notation definitions | PASS |
| Instrument component tables include "What it measures" | PASS |
| New formula notes appear for Profitability, Valuation, Balance Sheet, Cash Flow, Quality, Trend, Insight Alignment, Diversification, and covariance | PASS |
| Dev-server `/methodology` render contains KaTeX markup after the copy updates | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Methodology KaTeX Rendering QA

Scope:
- Verify public methodology formulas render as KaTeX math instead of raw or garbled LaTeX source.

QA findings addressed:

| Finding | Result |
|---|---|
| Formula props used JSX string attributes, causing `\\` to reach KaTeX literally | Fixed; `tex` props now use JSX expression strings |
| Cases-style formulas could show raw source instead of formatted math | Fixed and spot-checked on Bond duration fit |

Checks performed and results:

| Check | Result |
|---|---|
| Weighted composite renders with KaTeX fraction markup | PASS |
| scoreMargin renders with KaTeX clamp/fraction markup | PASS |
| Bond duration fit renders as KaTeX cases markup | PASS |
| Allocation formula renders through KaTeX on the dev-server methodology page | PASS |
| Covariance formula renders with KaTeX `w^T Sigma w` markup | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Theme Fit Formula Display Correction QA

Scope:
- Verify the public methodology Theme fit formula matches engine behavior and the new "How scores work" section is reachable from the TOC.

QA findings addressed:

| Finding | Result |
|---|---|
| Theme fit formula display implied separate +5 bonuses for AI / Automation, Quality, and Global Diversification | Fixed; rendered formula now uses one indicator bonus for `A or Q or G` |
| Theme fit note did not clarify the +5 applies once | Fixed |
| "How ETFVision scores work" section existed but was missing from the TOC | Fixed |

Checks performed and results:

| Check | Result |
|---|---|
| Page formula uses single `5 * 1(A or Q or G)` style bonus | PASS |
| `SCORE_METHODOLOGY.md` mirrors single-bonus wording | PASS |
| Methodology TOC includes `#how-scores-fit` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Methodology Page Comprehension and Math Rendering QA

Scope:
- Verify the public methodology page is easier to understand, renders formulas with KaTeX, and uses Portfolio Balance Review / Market Vision provenance wording without changing scoring logic.

QA findings addressed:

| Finding | Result |
|---|---|
| Methodology page lacked a plain-English glossary for technical scoring terms | Fixed; added collapsible Key Terms block after Overview |
| Users needed a clearer explanation of how instrument and portfolio scores relate | Fixed; added "How ETFVision scores work" two-report-card explanation |
| Formula sections were dense text only | Fixed; collapsed formula sections now show plain-English context plus server-rendered KaTeX math |
| Quality sub-score could be confused with Business Quality component | Fixed; added explicit clarification under Business Quality |
| Page still used Gap Analysis naming | Fixed; renamed public section and TOC entry to Portfolio Balance Review |
| Market Vision provenance and AI-assistance boundary needed clearer disclosure | Fixed; added page and score-methodology wording |

Checks performed and results:

| Check | Result |
|---|---|
| KaTeX package installed and formula helper renders at build time | PASS |
| Portfolio Balance Review wording present on page and score methodology doc | PASS |
| Market Vision provenance wording present on page and score methodology doc | PASS |
| No scoring code, weights, anchors, feature flags, access controls, or schema changed | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Benchmark Disclosure and Methodology Map Cleanup QA

Scope:
- Verify ETF Benchmark Relative methodology wording accurately describes the benchmark families and the exact ETF category/symbol map used by code.

QA findings addressed:

| Finding | Result |
|---|---|
| Disclosure overgeneralized Benchmark Relative as pairing each fund to an MSCI-family benchmark | Fixed; wording now distinguishes S&P 500 for US equity ETFs from MSCI-family proxies for developed/emerging international ETFs |
| Benchmark map omitted International Dividend and curated single-country behavior | Fixed; docs now list International Dividend, EWJ/DXJ/JPXN/EWU/EWC, MCHI/FXI/KWEB/INDA/INDY, and no component for other single-country ETFs |
| Methodology page did not explicitly state annual basis for stock fundamentals | Fixed; fundamentals helper row now states latest annual ratios/statements are used |

Checks performed and results:

| Check | Result |
|---|---|
| Public methodology benchmark disclosure updated | PASS |
| `SCORE_METHODOLOGY.md` benchmark disclosure updated | PASS |
| Benchmark map matches `benchmarkKeyForEtf` documented categories/symbols | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Methodology Documentation Business Quality Cleanup QA

Scope:
- Verify methodology documentation presents Business Quality as the stock fundamentals headline, keeps Valuation separate, and does not describe the retired valuation-blended fundamentals display as live.

QA findings addressed:

| Finding | Result |
|---|---|
| Public methodology page still described a six-category Fundamentals Score including Valuation | Fixed; section now presents Business Quality as the fundamentals headline and Valuation as a separate Characteristics component |
| Score methodology still opened with six-category fundamentals weights | Fixed; Business Quality headline composite is documented with Growth/Profitability/Cash Flow/Balance Sheet/Quality weights |
| Portfolio-context guardrails needed clearer scope | Fixed; concentration, duplicate exposure, and crypto allocation caps are marked Portfolio Review only |
| Required limitations/disclosures were missing from the public and formula-level methodology docs | Added |
| Recommendation Insights methodology still listed a generic Fundamentals score input | Updated to Business Quality |

Checks performed and results:

| Check | Result |
|---|---|
| Public methodology page no longer includes the old fundamentals calculation row | PASS |
| `METHODOLOGY_LAST_UPDATED` bumped to 2026-06-21 | PASS |
| Straggler sweep across active methodology docs for retired wording | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Fundamentals Business Quality Display QA

Scope:
- Verify Fundamentals UI surfaces display the Business Quality composite instead of the valuation-blended stored overall fundamentals score, while keeping Valuation visible separately.

QA findings addressed:

| Finding | Result |
|---|---|
| Fundamentals UI showed valuation-blended `overallFundamentalScore` as `Overall` | Fixed; display now uses `scoreBusinessQuality(latestScore)` |
| Valuation needed to remain visible as its own metric | Preserved |
| Directory cell showed both `Overall` and standalone `Quality`, which could confuse the Quality sub-score with the Business Quality composite | Fixed; cell shows `Business Quality` and `Val` only |
| Stored `overallFundamentalScore` should remain available for non-display paths | Preserved |

Checks performed and results:

| Check | Result |
|---|---|
| Fundamentals page coverage count uses Business Quality availability | PASS |
| Fundamentals page first score column is `Business Quality` | PASS |
| Instrument detail Fundamental Scores card shows `Business Quality` | PASS |
| Instrument detail trend table `Overall` column remains unchanged | PASS |
| Instrument directory Fundamentals cell shows `Business Quality` and `Val` | PASS |
| No schema/model/computation changes | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- None.

## 2026-06-21 SGT - Backfill Timeout Fix QA

Scope:
- Verify Admin -> Data Sources `Backfill market history` no longer combines 5-year price fetch, derived/risk metric rebuilds, and benchmark refresh in one Vercel serverless invocation.

QA findings addressed:

| Finding | Result |
|---|---|
| Backfill market history could time out at Vercel's 300s ceiling because it fetched 5-year prices, rebuilt derived/risk metrics, and refreshed benchmarks in one action | Fixed; backfill now fetches prices only |
| Inline benchmark refresh remained in backfill after a dedicated benchmark button was added | Removed; benchmarks now use `Refresh benchmarks` |
| Backfill batch size was still 8 symbols per click | Reduced to 5 symbols per click |
| Data Sources page did not explicitly declare the Vercel function ceiling | Added `maxDuration = 300` |

Checks performed and results:

| Check | Result |
|---|---|
| Backfill action uses `batchSize: 5` | PASS |
| Backfill action uses `skipDerivedMetrics: true` | PASS |
| Backfill action no longer calls `refreshBenchmarkData.run` | PASS |
| Admin Data Sources page exports `maxDuration = 300` | PASS |
| Benchmark button/action unchanged | PASS |
| `refreshAllDataAction` unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- Operationally, after history backfill is complete, run buttons 2 Daily returns through 5 Risk metrics, then Refresh benchmarks.

## 2026-06-21 SGT - Admin Benchmark Refresh Control QA

Scope:
- Verify Admin -> Data Sources has a direct manual control for the existing `benchmark-refresh` job so newly seeded benchmarks can be backfilled before recommendation runs.

QA findings addressed:

| Finding | Result |
|---|---|
| Operators needed a direct way to run benchmark-refresh after adding EFA/EEM benchmark seeds | Fixed; Admin -> Data Sources now includes `Refresh benchmarks` |
| Benchmark refresh should reuse existing job logging rather than creating a new job surface | Preserved; action uses `runManual("benchmark-refresh", ...)` |
| Full-history benchmark refresh should match cron/backfill horizon | Preserved; action uses `lookbackDays: 1825` |
| Scheduled cron route and all-data refresh should remain unchanged | Preserved |

Checks performed and results:

| Check | Result |
|---|---|
| Server action requires admin access | PASS |
| Server action uses job name `benchmark-refresh` | PASS |
| Server action uses `lookbackDays: 1825` | PASS |
| Data Sources button posts `returnTo=/admin/data-sources` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- After deploy, click Admin -> Data Sources -> Refresh benchmarks to populate EFA/EEM benchmark snapshots, then run recommendation-run.

## 2026-06-21 SGT - ETF Benchmark Relative Scale Re-Anchor QA

Scope:
- Verify ETF Benchmark Relative SCALE `100` reduces saturation while preserving the external-benchmark design and neutral benchmark-parity behavior.

QA findings addressed:

| Finding | Result |
|---|---|
| SCALE `200` pegged about 18% of ETFs and pushed p90 to 100 | Fixed; SCALE `100` lowers saturation materially |
| Scale needed an economic anchor rather than distribution fitting | Fixed; +50pp annual excess return is the full-mark anchor, +25pp scores 75, benchmark parity scores 50 |
| Benchmark mapping and international/EM fairness must remain unchanged | Preserved |

Live validation gate:

| Check | SCALE 200 | SCALE 100 |
|---|---:|---:|
| Scored ETF-like instruments | `201` | `196` |
| Min | `0` | `0` |
| p10 | `7.0` | `27.8` |
| p25 | `28.0` | `38.3` |
| p50 | `47.9` | `48.8` |
| p75 | `60.2` | `54.7` |
| p90 | `100.0` | `78.9` |
| Max | `100.0` | `100.0` |
| Pegged at bounds | `17.9%` | `6.6%` |

Benchmark 1Y returns used in the SCALE `100` validation pass:

| Benchmark | 1Y Return |
|---|---:|
| `sp500` | `25.65%` |
| `nasdaq100` | `40.58%` |
| `global_equities` | `27.41%` |
| `us_aggregate_bonds` | `0.69%` |
| `gold` | `24.83%` |
| `developed_ex_us` | `20.94%` |
| `emerging_markets` | `52.80%` |

International / EM checks:

| Symbol | Category | Benchmark | Score |
|---|---|---|---:|
| VWO | `EMERGING_MARKETS` | `emerging_markets` | `25.0` |
| EEM | `EMERGING_MARKETS` | `emerging_markets` | `50.0` |
| INDA | `COUNTRY` | `emerging_markets` | `0.0` |
| VEA | `DEVELOPED_MARKETS` | `developed_ex_us` | `60.5` |
| EFA | `DEVELOPED_MARKETS` | `developed_ex_us` | `50.0` |
| EWJ | `COUNTRY` | `developed_ex_us` | `63.2` |

Checks performed and results:

| Check | Result |
|---|---|
| Parity scores 50 | PASS |
| +25pp excess scores 75 | PASS |
| +50pp excess scores 100 | PASS |
| -50pp excess scores 0 | PASS |
| Missing benchmark return remains null | PASS |
| Benchmark mapping and EM fairness tests unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply benchmark migration and run benchmark-refresh from Admin to populate EFA/EEM benchmark snapshots.
- Run recommendation-run from Admin after benchmark-refresh.
- Run Med 29 recalibration QA after live recommendation scores recompute.

## 2026-06-21 SGT - ETF Benchmark Relative External Benchmark QA

Scope:
- Verify ETF Benchmark Relative now measures 1Y excess return against external asset-class benchmarks.
- Verify ETF Momentum no longer reuses trailing 1Y return.
- Check benchmark coverage and score distribution before freezing the seeded scale.

QA findings addressed:

| Finding | Result |
|---|---|
| Benchmark Relative used absolute 1Y return, so it was not actually benchmark-relative | Fixed; score now uses ETF 1Y return minus mapped benchmark 1Y return |
| Trailing 1Y return was counted in both Momentum and Benchmark Relative | Fixed; Momentum now uses YTD and daily return only |
| Developed ex-US and emerging-market ETFs lacked fair external benchmarks | Fixed structurally; `developed_ex_us` and `emerging_markets` benchmarks are seeded via EFA/EEM and must be backfilled by benchmark-refresh |
| EM ETFs could otherwise be compared against SPY/global proxies | Guarded by tests; EM categories and EM country ETFs map to `emerging_markets` |

Benchmark map validation:

| Category / Instrument Type | Benchmark |
|---|---|
| US broad market, growth, value, dividend, small cap, US sector/thematic ETFs | `sp500` |
| Global Equity | `global_equities` |
| Developed Markets, International Dividend, developed-market country funds | `developed_ex_us` |
| Emerging Markets and emerging-market country funds | `emerging_markets` |
| Bond / Cash Equivalent | `us_aggregate_bonds` |
| Commodity / Gold | `gold` |
| Crypto ETF | `bitcoin` |

Live validation gate:

| Check | Result |
|---|---|
| Checked ETF-like instruments | `201` |
| Score distribution min / p10 / p25 / p50 / p75 / p90 / max | `0 / 7.0 / 28.0 / 47.9 / 60.2 / 100.0 / 100.0` |
| Pegged at bounds | `17.9%` |
| Median near 50 target | PASS (`47.9`) |
| p90 low-70s / not pegged target | FOLLOW-UP (`p90=100.0`, pegged `17.9%`) |
| VWO / EEM / INDA benchmark | `emerging_markets` |
| VEA / EFA / EWJ benchmark | `developed_ex_us` |
| EM ETF benchmark is not SP500 | PASS |

Benchmark 1Y returns used in the validation pass:

| Benchmark | 1Y Return |
|---|---:|
| `sp500` | `24.99%` |
| `nasdaq100` | `40.01%` |
| `global_equities` | `26.25%` |
| `us_aggregate_bonds` | `0.78%` |
| `gold` | `24.75%` |
| `bitcoin` | `-40.65%` |
| `developed_ex_us` | `20.94%` |
| `emerging_markets` | `52.80%` |

Checks performed and results:

| Check | Result |
|---|---|
| ETF beating benchmark scores above 50 | PASS |
| ETF lagging benchmark scores below 50 | PASS |
| ETF matching benchmark scores 50 | PASS |
| Missing benchmark return excludes Benchmark Relative component | PASS |
| EM ETF maps to EM benchmark, not SP500 | PASS |
| ETF Momentum ignores trailing 1Y return | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (330/330) |
| `npm.cmd run build` | PASS |

Residual items:
- Apply migration `114_add_international_benchmarks.sql`, then run benchmark-refresh from Admin to populate EFA/EEM benchmark snapshots before relying on live Benchmark Relative scores.
- Run recommendation-run from Admin after benchmark-refresh.
- The seeded SCALE `200` was implemented as requested, but validation showed p90 pegging above the target. Claude/product should sign off on keeping the scale or request a calibration follow-up before freezing it.

## 2026-06-21 SGT - Business Quality-Aware Excessive Risk Cap QA

Scope:
- Verify the excessive instrument risk guardrail remains conservative while no longer equating high-volatility, Strong / Exceptional Business Quality stocks with Weak characteristics.

QA findings addressed:

| Finding | Result |
|---|---|
| `riskScore > 75` capped all instruments to Weak regardless of Business Quality | Fixed for Strong / Exceptional Business Quality stocks; cap is now Neutral |
| Lower-quality high-risk instruments still need the stricter Weak cap | Preserved |
| Non-stock instruments have no Business Quality score and should remain unchanged | Preserved; null Business Quality still caps at Weak |
| Instruments already at Poor / Significant Concerns should not be upgraded by the cap | Preserved for internal `Reduce` and `Sell` labels |

Checks performed and results:

| Check | Result |
|---|---|
| Exceptional Business Quality + risk score above 75 caps to Neutral | PASS |
| Strong Business Quality + risk score above 75 caps to Neutral | PASS |
| Solid / Moderate Business Quality + risk score above 75 caps to Weak | PASS |
| Existing `Sell` label remains `Sell` | PASS |
| Existing `Reduce` label remains `Reduce` | PASS |
| ETF/null Business Quality + risk score above 75 caps to Weak | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (327/327) |
| `npm.cmd run build` | PASS |

Expected live impact:
- ASML, ANET, AMD, QCOM, and PYPL are expected to move from Weak to Neutral when the excessive-risk cap is the binding guardrail and their Business Quality is Strong or Exceptional.
- UNH, INTC, and NKE are expected to remain Weak if their Business Quality is below Strong.

Residual items:
- Run the Admin recommendation job after deploy so stored Characteristics assessments update.
- This is a guardrail-severity change only; no scoring math, risk formula, score weights, label bands, or advice wording changed.

## 2026-06-21 SGT - ROIC Durability Consistency Signal QA

Scope:
- Verify the Fundamentals Quality `roicDurability` signal measures consistency of value-creating ROIC over time rather than average ROIC level.
- Confirm the annual-basis Quality vs Profitability correlation returns below the `< ~0.4` orthogonality target.

QA findings addressed:

| Finding | Result |
|---|---|
| Annual-basis Quality and Profitability re-coupled because both used ROIC level | Fixed; Quality now uses ROIC consistency after a cost-of-capital gate, while Profitability keeps ROIC level |
| ROIC durability needed frozen economic anchors rather than per-refresh refitting | Fixed; at least three annual ROIC observations are required, average ROIC below 8% scores 10, otherwise ROIC coefficient of variation uses `scoreLowerBetter(0.15, 0.60)` |
| Balance-sheet financial exclusions needed to remain in place | Preserved; balance-sheet financials still drop cash conversion and ROIC durability from the Quality denominator |

Live validation:

| Check | Result |
|---|---|
| Formulation used | Recommended WACC-gated ROIC consistency; pure-CoV fallback not needed |
| Previous annual-basis Quality correlation vs Profitability | `0.573` |
| New Quality correlation vs Profitability | `0.380` over 94 comparable active-stock rows |
| New Quality correlation vs Cash Flow | `0.008` over 94 comparable active-stock rows |
| New Quality correlation vs Balance Sheet | `-0.181` over 94 comparable active-stock rows |
| Active stocks checked | `105` |
| Stocks with Quality score | `105` |
| Stocks with available ROIC durability signal | `94` |

Selected stored-to-new Quality samples:

| Symbol | Stored Quality | New Quality | ROIC durability score | ROIC CoV |
|---|---:|---:|---:|---:|
| NVDA | `68.4` | `51.8` | `33.5` | `0.524` |
| MSFT | `98.1` | `98.1` | `100.0` | `0.070` |
| V | `99.4` | `98.9` | `97.9` | `0.162` |
| CVX | `70.5` | `76.3` | `54.6` | `0.406` |

Checks performed and results:

| Check | Result |
|---|---|
| Steady high-ROIC fixture scores ROIC durability high | PASS |
| Volatile ROIC fixture scores below steady high-ROIC fixture | PASS |
| Sub-WACC ROIC fixture receives low durability score | PASS |
| Sparse ROIC fixture drops the signal from the denominator | PASS |
| Financial fixture drops ROIC durability | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (326/326) |
| `npm.cmd run build` | PASS |

User-facing impact:
- Fundamentals Quality, Business Quality, and stock Characteristics composites can shift after recomputation. This is expected from a scoring-definition refinement and does not change labels or advice framing.

Residual items:
- After deploy, run Force refresh fundamentals and recommendation-run from Admin so live scores recompute.
- Rerun stock calibration diagnosis after recomputation.

## 2026-06-21 SGT - Annual-Basis Fundamental Scoring Inputs QA

Scope:
- Verify Fundamentals scoring uses annual-basis rows instead of latest-quarter rows for period-sensitive inputs.

QA findings addressed:

| Finding | Result |
|---|---|
| Latest quarterly ratios were selected for growth, profitability, valuation, and balance-sheet inputs | Fixed; scoring now selects the latest annual ratio row |
| Latest quarterly statements were selected for cash-flow and revenue-denominator inputs | Fixed; scoring now selects latest annual income, cash-flow, and balance-sheet statements |
| Seasonally negative latest-quarter FCF could floor cash-flow scores despite positive annual FCF | Fixed for rows with annual FCF coverage; regression test added |
| Quarterly valuation ratios were single-quarter distorted | Fixed by moving valuation to annual basis; stored quarterly examples were materially inflated versus annual values |

Valuation-basis decision:
- Stored quarterly valuation fields are not reliable TTM valuation inputs. Read-only examples: ASML price/sales `50.23` quarterly vs `10.83` annual; V price/sales `51.50` quarterly vs `16.57` annual; CVX price/sales `8.61` quarterly vs `1.53` annual. Valuation therefore uses the latest annual ratio row.

Selected live before/after scores:

| Symbol | Growth | Profitability | Cash Flow | Valuation | Overall |
|---|---:|---:|---:|---:|---:|
| CVX | `19.7 -> 30.2` | `19.2 -> 33.7` | `10.0 -> 66.6` | `34.4 -> 86.2` | `28.9 -> 52.9` |
| EOG | `91.8 -> 17.9` | `64.2 -> 85.2` | `91.2 -> 64.8` | `60.8 -> 91.8` | `77.5 -> 68.8` |
| ASML | `32.4 -> 81.5` | `69.0 -> 95.3` | `3.2 -> 92.6` | `1.3 -> 51.9` | `37.9 -> 79.3` |
| V | `38.7 -> 57.5` | `75.5 -> 100.0` | `10.0 -> 78.2` | `5.4 -> 40.1` | `43.2 -> 69.0` |
| JNJ | `36.8 -> 74.1` | `56.2 -> 86.6` | `10.0 -> 45.7` | `15.7 -> 74.9` | `38.0 -> 68.9` |
| AMZN | `55.0 -> 68.1` | `44.7 -> 57.9` | `16.5 -> 31.1` | `28.6 -> 64.4` | `39.9 -> 55.9` |
| WMT | `60.3 -> null` | `26.3 -> 35.3` | `10.0 -> null` | `26.7 -> 74.0` | `36.0 -> 47.0` |

Additional notes:
- XOM and MA already selected annual rows in the live sample, so their scores were unchanged.
- MSFT and NVDA did not have comparable live stored rows in the read-only sample used for this check.
- Negative latest-quarter FCF recovery cases found in the live sample: ASML cash-flow `3.2 -> 92.6`, AMZN `16.5 -> 31.1`, F `12.0 -> 42.2`.

Checks performed and results:

| Check | Result |
|---|---|
| Annual ratio selected when newer quarterly ratio exists | PASS |
| Annual income/cash-flow/balance-sheet statements selected when newer quarterly statements exist | PASS |
| Seasonally negative quarterly FCF does not floor cash-flow score when annual FCF is positive | PASS |
| Bank and insurer financial-sector exclusions preserved on annual basis | PASS |
| Quality correlation vs Cash Flow | `0.152` over 69 comparable rows |
| Quality correlation vs Balance Sheet | `0.036` over 85 comparable rows |
| Quality correlation vs Profitability | `0.573` over 83 comparable rows; follow-up needed because this no longer meets `< ~0.4` after annualizing Profitability |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (325/325) |
| `npm.cmd run build` | PASS |

User-facing impact:
- Business Quality, valuation, cash-flow, profitability, and overall stock fundamental scores can shift broadly after recomputation. This is expected from a correctness fix to the input period basis.

Residual items:
- After deploy, run Force refresh fundamentals and recommendation-run from Admin.
- Rerun stock calibration diagnosis only after scores are recomputed.
- Follow-up required: annual-basis Profitability now correlates with Quality at `0.573`; any remedy would require a separate methodology/anchor review, not this inputs-only fix.

## 2026-06-21 SGT - Financial Sector Fundamentals Guard Consistency QA

Scope:
- Verify balance-sheet financials receive consistent adjusted fundamentals handling, including the new Quality sub-score, while fee-based financials retain standard industrial scoring.

Live Financials industry check:

| Symbol(s) | Industry | Classification Result |
|---|---|---|
| JPM, BAC, WFC, USB, C | Banks - Diversified | Balance-sheet financial |
| PNC | Banks - Regional | Balance-sheet financial |
| GS, MS, SCHW | Financial - Capital Markets | Balance-sheet financial |
| CB | Insurance - Property & Casualty | Balance-sheet financial |
| BRK.B | Insurance - Diversified | Balance-sheet financial |
| V, MA, AXP, PYPL | Financial - Credit Services | Standard industrial scoring |
| BLK | Asset Management | Standard industrial scoring |

QA findings addressed:

| Finding | Result |
|---|---|
| Insurers such as CB and BRK.B were missed by the bank/capital-markets-only detector | Fixed; insurance industries now receive the balance-sheet financial exclusions |
| Quality scoring reintroduced cash conversion and ROIC durability for banks and other balance-sheet financials | Fixed; balance-sheet financials drop both signals from the Quality denominator |
| Fee-based financials could be over-broadened into bank-style methodology if sector alone was used | Guarded; credit-services/payments and asset-management industries keep standard industrial scoring |

Checks performed and results:

| Check | Result |
|---|---|
| JPM-style bank receives profitability, balance-sheet, cash-flow, and Quality exclusions | PASS |
| CB-style insurer receives profitability, balance-sheet, cash-flow, and Quality exclusions | PASS |
| V/MA-style credit-services financial keeps cash-flow and full Quality inputs | PASS |
| Live Quality correlation vs Profitability | `0.361` over 81 comparable rows |
| Live Quality correlation vs Cash Flow | `-0.002` over 72 comparable rows |
| Live Quality correlation vs Balance Sheet | `-0.116` over 82 comparable rows |
| Orthogonality target `< ~0.4` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (324/324) |
| `npm.cmd run build` | PASS |

User-facing impact:
- Financial stock Fundamentals, Business Quality, Quality, and Characteristics composites may shift after recomputation. This is expected scoring-consistency behavior, not a label or advice-language change.

Residual items:
- After merge/deploy, run Force refresh fundamentals and the recommendation-run from Admin so stored scores reflect the corrected financial-sector guard.
- Future methodology enhancement: add financial-specific capital adequacy, asset-quality, reserve-quality, or ROE/ROA durability inputs if provider coverage supports them.

## 2026-06-20 SGT - Forced Fundamentals Refresh Rotation QA

Scope:
- Verify forced fundamentals refresh advances through the active stock universe instead of repeatedly refreshing the same first symbol-ordered batch.

QA findings addressed:

| Finding | Result |
|---|---|
| Forced fundamentals refresh bypassed the freshness filter but still sliced the symbol-ordered list, causing each forced pass to process the same first batch | Fixed; due candidates are sorted by oldest `lastRefreshedAt` before applying `maxStocksPerRefresh` |
| Stocks beyond the first forced batch could remain untouched during repeated forced runs | Fixed; refreshed symbols move to the newest cohort, allowing the next forced run to select the next-oldest stocks |

Checks performed and results:

| Check | Result |
|---|---|
| Null or missing `lastRefreshedAt` is treated as oldest | PASS |
| First forced pass selects the oldest/null cohort under the batch cap | PASS |
| Second forced pass selects a different next-oldest cohort after first-batch timestamps advance | PASS |
| `maxStocksPerRefresh` cap remains unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (324/324) |
| `npm.cmd run build` | PASS |

User-facing impact:
- Admin/operator behavior only. No user-facing labels, scoring, methodology, or recommendation wording changed.

Residual items:
- For ROIC repopulation after the key-metrics provider fix, run Force refresh fundamentals about 3 times for roughly 105 active stocks at cap 50, then run the ROIC coverage query and recommendation-run.

## 2026-06-20 SGT - FMP Key Metrics ROIC Ingestion QA

Scope:
- Verify FMP fundamentals ingestion restores ROIC as a provider data input by joining `key-metrics` to `ratios` rows.

QA findings addressed:

| Finding | Result |
|---|---|
| FMP stable `ratios` response did not provide `returnOnInvestedCapital` / `roic`, leaving `financial_ratios.roic` null | Fixed at provider layer by fetching `key-metrics` and joining by date with a fiscal-year fallback |
| ROIC durability in the Quality score was uniformly dropped because ROIC had no provider source | Provider data source restored; live recomputation still requires post-merge Fundamentals refresh |
| Data-ingestion docs incorrectly implied ROIC came from the ratios endpoint | Fixed; docs now identify `key-metrics.returnOnInvestedCapital` as the ROIC source |

Checks performed and results:

| Check | Result |
|---|---|
| Ratios row without ROIC receives ROIC from matching key-metrics row | PASS |
| Ratios-supplied ROIC still takes precedence if present | PASS |
| Existing ROE/ROA sourcing unchanged | PASS |
| Scoring anchors, weights, sub-score definitions, and labels unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (323/323) |
| `npm.cmd run build` | PASS |

User-facing impact:
- No label or methodology wording changed. After live refresh, overall fundamentals, Profitability, Business Quality, Quality, and stock Characteristics composites may shift slightly where ROIC becomes available. This is expected data coverage restoration.

Residual items:
- After merge/deploy, run Fundamentals refresh with force and then recommendation-run from Admin.
- After the live refresh, run a read-only Supabase coverage check for annual `financial_ratios.roic` across the active stock universe and record the populated count.
- Re-check Quality orthogonality after refresh to confirm correlations vs Profitability / Cash Flow / Balance Sheet remain below roughly `0.4`, and confirm `roicDurability` is no longer uniformly dropped.

## 2026-06-20 SGT - Orthogonal Fundamentals Quality Score QA

Scope:
- Verify the stock Fundamentals Quality sub-score measures earnings quality and consistency instead of re-averaging Profitability, Cash Flow, and Balance Sheet signals.

QA findings addressed:

| Finding | Result |
|---|---|
| Previous Quality formula reused category-level signals and was highly correlated with Profitability, Cash Flow, and Balance Sheet | Fixed; Quality now uses earnings stability, cash conversion/accruals, ROIC durability, and capital discipline with frozen economic anchors |
| Quality anchors needed to be fixed and documented rather than refit per refresh | Fixed; methodology docs and public methodology page now state the fixed-anchor formula and generalization principle |
| Business Quality and overall stock composite impact needed explicit test coverage | Covered; tests assert directionality, pinned anchor scores, and orthogonality while leaving Business Quality weights unchanged |

Checks performed and results:

| Check | Result |
|---|---|
| Signal direction: stable margins and strong cash conversion raise Quality, volatile margins and weak conversion lower it | PASS |
| Pinned frozen-anchor scores: STABLE 96, DISCIPLINED 82, DILUTIVE 63, VOLATILE 3 | PASS |
| Fixture previous Quality correlations vs Profitability / Cash Flow / Balance Sheet | `1.000`, `1.000`, `0.999` |
| Fixture new Quality correlations vs Profitability / Cash Flow / Balance Sheet | `0.142`, `0.098`, `0.127` |
| Read-only Supabase pass: eligible stocks / comparable scored rows | `105` / `96` |
| Read-only Supabase previous Quality correlations vs Profitability / Cash Flow / Balance Sheet | `0.855`, `0.739`, `0.504` |
| Read-only Supabase new Quality correlations vs Profitability / Cash Flow / Balance Sheet | `0.153`, `0.327`, `-0.214` |
| Read-only Supabase new Quality distribution | min `18.73`, p25 `58.36`, median `75.04`, p75 `92.10`, max `100.00` |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test` | PASS (321/321) |
| `npm.cmd run build` | PASS |

User-facing impact:
- Fundamentals Quality, Business Quality, and the stock overall Characteristics composite can shift after refreshed fundamentals and recommendation scores. No user-facing labels or advice wording changed.

Residual items:
- Re-run Fundamentals refresh and recommendation-run from the Admin panel.
- Perform Med 29 recalibration QA after refreshed scores are stored.
- Monitor annual ROIC coverage: the live comparable sample had no available ROIC durability observations, so that signal currently drops from the Quality denominator until coverage improves.

## 2026-06-20 SGT - Concentration and Diversification Scoring Separation QA

Scope:
- Verify Risk Analytics diversification no longer double-counts issuer concentration already owned by the Concentration section.

QA findings addressed:

| Finding | Result |
|---|---|
| Diversification subtracted an issuer concentration penalty while Concentration also scored issuer concentration | Fixed; Diversification now measures breadth and correlation only |
| Issuer concentration inputs could change the Risk Analytics diversification score | Fixed; regression tests assert diversification is unchanged across different issuer concentration inputs |
| Methodology docs and public methodology page could describe the old double-counting formula | Fixed; formula text now removes `concentrationPenalty` and explains the separation |

Checks performed and results:

| Check | Result |
|---|---|
| `diversificationScore` formula is `holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty` | PASS |
| Issuer concentration inputs no longer change Risk Analytics diversification score | PASS |
| Concentration Review wrapper-excluded representative score remains 90 | PASS |
| Risk Analytics concentration diagnostics and top-holding warnings remain unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` | PASS (318/318) |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |

User-facing impact:
- Risk Analytics diversification and Portfolio Review Diversification can shift upward where issuer concentration had previously reduced diversification. Concentration section numbers remain unchanged.

Residual items:
- Re-run Risk Analytics refresh and Portfolio Review from the Admin panel so stored reports reflect the new diversification formula.

## 2026-06-19 SGT - Real Estate Exposure Impact Text QA

Scope:
- Verify Real Estate / REIT candidate Exposure impact text no longer leaks the generic fallback issue-category wording.

QA findings addressed:

| Finding | Result |
|---|---|
| REIT candidate cards showed broken text such as `{symbol} appears for insufficient real estate exposure with real estate.` | Fixed; REIT candidates now show clean observational text based on real-estate look-through exposure |
| Raw internal issue-category wording could surface in user-facing candidate explanations | Fixed for the REIT branch and covered by a fallback-leak guard test across active Portfolio Balance Review candidate explanations |

Checks performed and results:

| Check | Result |
|---|---|
| REIT candidate `primaryReason` matches `provides exposure to real estate where real-estate look-through is 1.0%` | PASS |
| REIT candidate `primaryReason` does not contain `appears for` | PASS |
| REIT candidate `primaryReason` does not contain `insufficient real estate exposure` | PASS |
| Active Portfolio Balance Review candidate explanations do not contain the fallback phrase `appears for` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` | PASS (318/318) |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports pick up the corrected REIT Exposure impact text.

## 2026-06-19 SGT - Real Estate Portfolio Balance Finding QA

Scope:
- Verify the new Real Estate / REIT Portfolio Balance Review finding and executive-summary Balance findings capitalization.

QA findings addressed:

| Finding | Result |
|---|---|
| Portfolio Balance Review had no dedicated real estate / REIT sleeve when real estate look-through exposure was lightly represented | Fixed; a low-priority "Real Estate - Lightly Represented Category" finding now appears when real estate look-through exposure is below 3.0% and eligible REIT candidates exist |
| Mortgage, international, or global REIT variants could lead the sleeve if they had higher instrument scores | Fixed; broad US REIT representatives lead the Real Estate candidate ranking, with `REM`, `VNQI`, and `REET` ranked below |
| Executive-summary balance-finding disclaimer needed title-case sentence capitalization | Fixed; the summary now contains "Balance findings are deterministic analytical outputs..." |

Checks performed and results:

| Check | Result |
|---|---|
| Real Estate finding fires at 1.0% look-through exposure with non-advisory rationale | PASS |
| Real Estate finding does not fire at 4.0% look-through exposure | PASS |
| Candidate list is flat, capped at four, and leads with `VNQ`, `SCHH`, `IYR`, `USRT` | PASS |
| `REM`, `VNQI`, and `REET` do not lead the Real Estate candidate list | PASS |
| Existing section score inputs remain unchanged in the Real Estate finding test context | PASS |
| Executive summary uses capitalized "Balance findings are deterministic analytical outputs" | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (317/317) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports can include the new Real Estate finding and updated summary text.

## 2026-06-19 SGT - Portfolio Review Backlog Clearance QA

Scope:
- Verify Portfolio Balance Review user-facing rename, behavior-preserving wrapper-exclusion DRY cleanup, and cosmetic/taxonomy guard coverage.

QA findings addressed:

| Finding | Result |
|---|---|
| "Gap Analysis" framing could imply a user action to close a gap | Fixed; user-facing section now reads "Portfolio Balance Review" |
| Generic "Underweighted Category" suffix was stronger than needed for compliance-safe balance framing | Fixed; generic suffix now reads "Lightly Represented Category" |
| Wrapper-exclusion issuer logic was duplicated across Concentration, Risk, and page display paths | Fixed; shared helper now owns wrapper exclusion, issuer exposure detection, and issuer key generation |
| Country-count labels used ASCII comparison text and symbol cleanup stripped US share-class suffixes | Fixed; labels use `≥`, foreign exchange suffixes are stripped, and `BRK.B` is preserved |
| Curated taxonomy maps lacked a single regression guard across every approved ETF and stock symbol | Fixed; taxonomy test now covers all curated ETF categories and stock sectors |

Checks performed and results:

| Check | Result |
|---|---|
| Portfolio Balance Review and Portfolio Balance Summary strings are present | PASS |
| `issueCategory` and internal gap identifiers remain unchanged | PASS |
| Concentration and Risk wrapper-excluded issuer top-one/top-five outputs match on representative inputs | PASS |
| `cleanHoldingSymbol("BRK.B")` preserves share class and `cleanHoldingSymbol("2330.TW")` strips exchange suffix | PASS |
| Curated alpha ETF/stock symbols normalize to expected canonical sectors | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (314/314) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports reflect the renamed Portfolio Balance Review display strings.

## 2026-06-19 SGT - International Gap Subsection Presentation QA

Scope:
- Verify the International Equity gap renders as Broad ex-US, Developed markets, and Emerging markets subsections with up to two candidates per group.

QA findings addressed:

| Finding | Result |
|---|---|
| International Equity previously showed a flat one-per-role list, hiding useful second representatives within each ex-US sub-role | Fixed; candidates are grouped into per-sub-role subsections with up to two representatives each |
| Total ex-US funds could read as additive peers beside developed and emerging regional funds | Fixed; the Broad ex-US subsection includes an all-in-one note |
| IXUS and SPDW required explicit ex-US role routing for the grouped presentation | Fixed; IXUS routes to total ex-US and SPDW routes to developed ex-US |

Checks performed and results:

| Check | Result |
|---|---|
| International candidates group as Broad ex-US, Developed markets, Emerging markets | PASS |
| Each International group contains no more than two candidates | PASS |
| Broad ex-US includes VXUS and IXUS; Developed includes VEA and SPDW | PASS |
| Global-including-US and country/dividend candidates remain excluded | PASS |
| Defensive grouping remains unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (312/312) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports reflect the grouped International presentation.

## 2026-06-19 SGT - Portfolio Review Polish Items QA

Scope:
- Verify International Equity candidate variety, materiality-aware country labels, inflation hedge acknowledgement, and display polish.

QA findings addressed:

| Finding | Result |
|---|---|
| International Equity could show near-duplicate developed or emerging funds before a missing sub-role representative | Fixed; selection returns one core total/developed/emerging representative first |
| Country Count label looked like a distinct-country total rather than a materiality-threshold count | Fixed; labels now read `Countries >=1%` and `Look-through countries >=3%` |
| Macro inflation finding did not acknowledge held inflation-sensitive instruments such as TIP and GLD | Fixed; the finding lists existing detected hedge symbols before providing context |
| Gap titles mixed hyphen and em-dash separators, and overlap text could show raw exchange tickers | Fixed; titles use em dash and overlap labels prefer issuer/company names with ticker cleanup fallback |

Checks performed and results:

| Check | Result |
|---|---|
| International candidates lead with VXUS, VEA, and one emerging-market fund rather than VEA/SCHF or EEM/IEMG pairs | PASS |
| Defensive broad-sleeve output remains unchanged | PASS |
| Country-count labels show materiality thresholds | PASS |
| Inflation finding acknowledges TIP/GLD when held and keeps original wording when not held | PASS |
| Gap titles use em dash and overlap labels prefer names | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (311/311) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports reflect the polished candidate selection and display text.

## 2026-06-19 SGT - Portfolio Review Gap Trigger and Breadth Ordering QA

Scope:
- Verify crypto-ballast findings are ballast-aware, International Equity candidates use graded breadth ordering, and International Equity no longer fires from non-international concentration/diversification side effects.

QA findings addressed:

| Finding | Result |
|---|---|
| Crypto / Alternative - Ballast Underweighted could appear when bond-plus-gold ballast already exceeded crypto exposure | Fixed; the finding is suppressed unless ballast is lower than crypto exposure |
| International Equity broad-representative ordering could let hedged/subset or global-including-US funds outrank plain ex-US core funds | Fixed; core ex-US funds receive the highest representative score, variants receive a middle score, and global-including-US funds receive a lower score |
| International Equity finding could fire from top-holding concentration or low diversification even when international exposure was not underweight | Fixed; the trigger is now based on US/international look-through underweight only |

Checks performed and results:

| Check | Result |
|---|---|
| 22% ballast versus 6% crypto suppresses `excessive_crypto_risk` | PASS |
| 8% crypto versus 2% ballast emits the crypto-ballast finding with the existing accurate title | PASS |
| VXUS/VEA/VWO/IEMG lead international candidates ahead of HEFA/EMXC and IOO/VT/ACWI | PASS |
| Concentration/diversification side effects alone do not emit International Equity | PASS |
| Defensive broad-sleeve output remains unchanged | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (308/308) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports reflect the corrected trigger behavior and candidate ordering.

## 2026-06-19 SGT - International Gap Broad ETF Ordering QA

Scope:
- Verify the Portfolio Review International Equity gap leads with broad ex-US diversified ETFs before narrower country or international-dividend funds.

QA findings addressed:

| Finding | Result |
|---|---|
| International Equity gap could show narrower funds such as DXJ, SCHY, IDV, JPXN, and EWJ before broad ex-US diversifiers | Fixed; broad representatives such as VXUS, VEA, VWO, and IEMG receive category-representative priority |
| Display ordering could re-sort selected candidates by issue fit and quality without preserving broad representative priority | Fixed; display sorting now applies category-representative score before issue fit and recommendation score |

Checks performed and results:

| Check | Result |
|---|---|
| Broad ex-US representatives lead the international candidate list even when narrow funds have higher standalone scores | PASS |
| Defensive broad-sleeve candidate ordering remains covered by the shared category-remedy helper | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (307/307) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports reflect the corrected International Equity candidate ordering.

## 2026-06-19 SGT - Curated Instrument Taxonomy Source QA

Scope:
- Verify ETF and stock canonical taxonomy is sourced from curated alpha-universe maps and generic ETF labels no longer blanket-apply `Global Diversification`.

QA findings addressed:

| Finding | Result |
|---|---|
| Non-flagship sector ETFs could normalize to `Multi-Asset / Broad Market` when provider metadata was generic | Fixed; mapped ETFs now resolve `canonical_sector` from `ALPHA_ETF_CATEGORIES` first |
| Generic ETF labels such as `ETF`, `Sector ETF`, `Broad Market`, and `US Broad Market` could apply `Global Diversification` to US-only funds | Fixed; those blanket theme aliases were removed |
| Provider raw sector/industry could still add misleading themes to mapped ETFs | Fixed; mapped ETFs use curated category themes instead of raw provider sector/industry for themes |
| Portfolio Review could infer global-equity role from the `Global Diversification` theme | Fixed; global/international roles now come from symbol/geography or curated international ETF categories |
| Existing fresh instrument rows need re-normalization after taxonomy rule changes | Fixed; metadata refresh job supports `taxonomyBackfill=true` and live backfill was run |

Checks performed and results:

| Check | Result |
|---|---|
| Sector ETF normalization covers FXU/VPU/IYH/VFH/VDE as Utilities/Healthcare/Financials/Energy rather than broad market | PASS |
| US sector ETF normalization keeps `Global Diversification` absent for XLU/FXU-style funds | PASS |
| Global/ex-US ETF normalization keeps `Global Diversification` for VT/VXUS-style funds | PASS |
| Stock sector normalization uses `ALPHA_STOCK_SECTORS` when provider raw sector is incorrect | PASS |
| Portfolio Review candidate-role regression remains green for sector ETFs and international ETFs without theme-based sector inference | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (306/306) |

Residual items:
- Re-run Portfolio Review from the Admin panel so stored reports reflect the corrected instrument taxonomy.
- Live diagnostic SQL after backfill returned zero mis-sectored mapped US sector ETFs and zero mapped US sector ETFs with `Global Diversification`.

## 2026-06-19 SGT - Defensive Gap Title, Candidate Preference, and Tooltip QA

Scope:
- Verify the Portfolio Review defensive gap finding uses compliant Defensive Sectors language, broad defensive sector ETF examples, and sleeve-specific tooltip categories.

QA findings addressed:

| Finding | Result |
|---|---|
| Finding title still referenced Healthcare & Defensive even though the displayed candidates span Utilities, Consumer Staples, and Healthcare | Fixed; service output and page legacy rewrite now use `Defensive Sectors — Underweighted Category` |
| Narrow healthcare sub-theme ETFs such as XBI, IBB, and ARKG could appear in a defensive-sector finding | Fixed; those symbols are excluded from `insufficient_defensive_exposure` |
| Narrow or global utilities variants such as FXU/JXI could rank ahead of broad sector sleeve examples | Fixed; broad sleeve examples such as XLU/VPU, XLP/VDC, and XLV/VHT are preferred within the per-sleeve cap |
| Defensive tooltip category could be too generic for Utilities or Consumer Staples candidates | Fixed; tooltip category is now derived from the candidate's defensive sleeve |

Checks performed and results:

| Check | Result |
|---|---|
| Defensive candidate test confirms Utilities group selects XLU/VPU and excludes FXU/JXI | PASS |
| Defensive candidate test confirms Healthcare group selects XLV/VHT and excludes XBI/IBB/ARKG | PASS |
| Defensive grouping still produces only Utilities, Consumer Staples, and Healthcare groups with no Defensive Ballast group | PASS |
| Defensive tooltip helper returns Utilities, Consumer Staples, or Healthcare from the candidate sleeve | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (303/303) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports.

## 2026-06-19 SGT - Defensive Gap Equity-Sleeve Scope QA

Scope:
- Verify the Portfolio Review Healthcare & Defensive gap finding is scoped to defensive equity sector sleeves and does not duplicate treasury/cash ballast candidates from other findings.

QA findings addressed:

| Finding | Result |
|---|---|
| Defensive per-sleeve grouping could create a `Defensive Ballast` subsection from short-treasury/core-bond roles | Fixed; defensive selection now filters to Utilities, Consumer Staples, and Healthcare roles only |
| Treasury/cash ETFs could duplicate between Healthcare & Defensive and Crypto-Ballast / Fixed-Income findings | Fixed for Healthcare & Defensive; ballast remains available to the other findings |

Checks performed and results:

| Check | Result |
|---|---|
| Defensive candidate test includes BND/GOVT and confirms neither appears in the defensive finding | PASS |
| Defensive grouping produces only Utilities, Consumer Staples, and Healthcare groups, with no `Defensive Ballast` group | PASS |
| Crypto-Ballast regression still confirms BND appears with crypto/ballast explanation text | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (302/302) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports.

## 2026-06-19 SGT - Defensive Gap Per-Sleeve Candidate Sections QA

Scope:
- Verify the Portfolio Review Healthcare & Defensive gap finding no longer allows one defensive sleeve to dominate all displayed candidates.

QA findings addressed:

| Finding | Result |
|---|---|
| Defensive gap could show a flat list dominated by Utilities after Utilities became the most-underweight sleeve | Fixed; defensive selection now takes up to two candidates per sleeve |
| Healthcare and Consumer Staples examples could be crowded out from a finding titled Healthcare & Defensive | Fixed; defensive candidates are displayed in per-sleeve subsections ordered by sleeve underweight |
| Non-defensive findings should not inherit subsection display | Preserved; International, Crypto, and other gap findings remain flat lists |

Checks performed and results:

| Check | Result |
|---|---|
| Utilities-most-underweight scenario returns Utilities, Consumer Staples, and Healthcare groups with no more than two candidates per sleeve | PASS |
| Display grouping helper labels Utilities, Consumer Staples, and Healthcare and preserves incoming order | PASS |
| Existing international, crypto, concentration, macro, and fixed-income gap tests still pass | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (302/302) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports.

## 2026-06-19 SGT - Portfolio Review ETF Sector Classification Fallback QA

Scope:
- Verify Portfolio Review Gap Analysis uses curated alpha ETF categories to classify dedicated US sector ETFs when canonical sector metadata is stale or generic.

QA findings addressed:

| Finding | Result |
|---|---|
| FXU-like US sector ETFs with stale `Multi-Asset / Broad Market` metadata could fall through to `global_equity` because of broad diversification themes | Fixed; curated `ALPHA_ETF_CATEGORIES` now routes mapped sector ETFs such as Utilities to sector-specific roles |
| Defensive gap candidate explanations could incorrectly reference non-US equity for a US sector ETF | Fixed; the FXU-like regression now routes to `utilities_defensive` and uses defensive-sector context |
| International/global ETFs with defensive themes could enter the defensive gap through fallback scoring | Fixed; international/global candidate roles are blocked from `insufficient_defensive_exposure` |

Checks performed and results:

| Check | Result |
|---|---|
| FXU-like Utilities ETF routes to `utilities_defensive`, appears in the defensive gap, and does not use non-US equity explanation text | PASS |
| VXUS remains `international_equity`, is excluded from the defensive gap, and remains eligible for the International Equity gap | PASS |
| Existing defensive sleeve priority, gap candidate ordering, and Portfolio Review regressions still pass | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (300/300) |

Residual items:
- Part B remains outstanding: run the separate enrichment/backfill task to correct stale ETF `canonical_sector` values in the database for other consumers.
- Re-run Portfolio Review from the Admin panel to regenerate stored reports.

## 2026-06-19 SGT - Defensive Gap Sleeve-Aware Role Priority QA

Scope:
- Verify the Portfolio Review `insufficient_defensive_exposure` gap finding prioritizes the most-underweight defensive sector sleeve rather than using a static healthcare-first role order.

QA findings addressed:

| Finding | Result |
|---|---|
| Defensive gap ordering always led with healthcare even when healthcare already had look-through exposure and utilities had none | Fixed; healthcare, utilities, and consumer staples roles are ordered by lowest sleeve weight first |
| `SuggestionContext` only carried healthcare defensive sleeve weight | Fixed; it now also carries `utilitiesWeight` and `consumerStaplesWeight` |
| Equal or missing defensive sleeve weights needed deterministic behavior | Preserved; tie order remains healthcare -> utilities -> consumer staples |

Checks performed and results:

| Check | Result |
|---|---|
| Healthcare 12.0%, utilities 0.0%, consumer staples 4.0% orders roles utilities -> consumer staples -> healthcare -> short treasury -> core bond | PASS |
| Utilities-most-underweight scenario gives XLU higher `issueFitScore` than XLP and XLV | PASS |
| Equal/absent sleeve weights preserve default healthcare -> utilities -> consumer staples order | PASS |
| `SuggestionContext` exposes `utilitiesWeight` and `consumerStaplesWeight` from look-through sector exposures | PASS |
| Existing international, crypto, concentration, macro, and fixed-income gap tests still pass | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (298/298) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports.
- Visible utilities/staples candidate breadth remains limited until the separate #ETF-TAXONOMY classification/routing task lands.

## 2026-06-19 SGT - Gap Analysis Defensive ETF Examples and Category-Fit Ordering QA

Scope:
- Verify Portfolio Review Gap Analysis avoids single-stock examples in the Healthcare & Defensive underweighted category and displays candidate cards by category fit.

QA findings addressed:

| Finding | Result |
|---|---|
| Healthcare & Defensive gap could surface individual healthcare stocks such as ISRG, AMGN, GILD, BMY, and PFE under an underweighted-category framing | Fixed; `insufficient_defensive_exposure` now blocks stock instruments and surfaces diversified defensive/sector ETFs such as XLV, VHT, XLU, and XLP |
| Gap candidate cards were ordered by standalone instrument quality, making narrower high-quality instruments appear ahead of broader category-fit instruments | Fixed; display order now uses `issueFitScore` first and `recommendationScore` only as tie-breaker |
| The UI chip said `Ordered by: Instrument quality`, which could read like a ranked pick list | Fixed; chip now reads `Ordered by: Category fit` and supporting copy describes category-intrinsic ordering |

Checks performed and results:

| Check | Result |
|---|---|
| Defensive gap test with XLV/VHT/XLU/XLP and ISRG/AMGN/GILD/BMY/PFE returns only ETFs | PASS |
| Display comparator orders higher category-fit/lower-quality candidates above lower-fit/higher-quality candidates | PASS |
| International and crypto gap tests still emit existing candidates | PASS |
| XLV, VHT, XLU, and XLP are present in the seeded universe and default active | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (295/295) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports and verify the live Healthcare & Defensive finding shows diversified ETF examples and category-fit display order.

## 2026-06-19 SGT - Insight Alignment Score Cap and Coverage Display QA

Scope:
- Verify Portfolio Review Insight Alignment cannot show a perfect or near-perfect score while displaying a watch/attention finding, and verify recommendation coverage displays as a percentage.

QA findings addressed:

| Finding | Result |
|---|---|
| Insight Alignment could display 100/100 while also showing `Some holdings need review` | Fixed; any non-info finding caps the section score at 94 |
| The same contradiction could occur for `Insights coverage is incomplete` | Fixed; the cap keys off any non-info finding, not only weak holdings |
| `Recommendation Coverage` displayed the raw fraction `1` | Fixed; coverage is now treated as a ratio metric and formats as `100%` |

Checks performed and results:

| Check | Result |
|---|---|
| Weak-held scenario with raw score above 100 caps at 94 and keeps `Some holdings need review` | PASS |
| Incomplete-coverage-only scenario with raw score above 94 caps at 94 and keeps `Insights coverage is incomplete` | PASS |
| Clean full-coverage scenario can still reach 100 with no findings | PASS |
| `coverage` key is routed through the existing percent formatter | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (293/293) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports; the live reference Insight Alignment section should move from 100 to 94 when `Some holdings need review` is present.

## 2026-06-19 SGT - Wrapper-Excluded Diversification Penalty QA

Scope:
- Verify Risk Analytics diversification scoring excludes ETF/fund wrappers from issuer concentration penalty inputs and matches the Concentration Review underlying-company basis.

QA findings addressed:

| Finding | Result |
|---|---|
| The first Task 2 implementation used `buildPortfolioExposureContext(...).issuerExposures`, which can include ETF wrappers such as VOO, QQQ, VT, and BND | Fixed; diversification penalty inputs now come from a wrapper-excluded underlying-company rollup |
| Live diversification only moved from approximately 79 to 80 because VOO around 30% still dominated the penalty | Fixed in code; after fresh Risk Analytics and Portfolio Review refreshes, the expected movement is into the high-80s when the top underlying company is around 7.9% |

Checks performed and results:

| Check | Result |
|---|---|
| Snapshot with VOO at 30% direct and NVDA at 8% underlying returns top-one issuer concentration of 8%, not 30% | PASS |
| Direct bond ETF wrapper in the same snapshot is excluded from issuer concentration penalty inputs | PASS |
| Direct single-stock holding remains included in the wrapper-excluded issuer rollup | PASS |
| Diversification score with wrapper-excluded issuer concentration is materially higher than direct-concentration result | PASS |
| Existing direct fallback, genuine issuer-concentration penalty, and direct holding-count tests still pass | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (290/290) |

Residual items:
- Re-run Risk Analytics / risk-report refresh and then Portfolio Review from the Admin panel to regenerate stored values and confirm the top-1 penalty input is the underlying company, not the ETF wrapper.

## 2026-06-19 SGT - Issuer-Level Risk Diversification Concentration Penalty QA

Scope:
- Verify Risk Analytics diversification scoring uses issuer-level look-through concentration for its concentration penalty when available, while preserving direct holding-count behavior and direct concentration diagnostics.

QA findings addressed:

| Finding | Result |
|---|---|
| Diversified ETF wrappers could depress the Risk Analytics / Portfolio Review diversification score because the concentration penalty used direct top-holding concentration | Fixed; the concentration penalty now uses issuer-level top-one and top-five look-through exposure when available |
| First-run or missing-look-through cases need stable behavior | Preserved; the score falls back to direct concentration when issuer concentration is unavailable |
| Single-product residual risk should remain visible | Preserved; `holdingScore` still uses direct meaningful holding count, and Risk page warnings/metadata still use direct concentration |

Checks performed and results:

| Check | Result |
|---|---|
| Diversified wrapper with high direct top-one but low issuer top-one scores higher when issuer concentration is supplied | PASS |
| Null issuer concentration equals direct-concentration fallback score | PASS |
| Genuine high issuer top-one/top-five concentration still lowers diversification score | PASS |
| Few direct holdings still score lower than broader direct holding count with the same issuer concentration | PASS |
| Direct concentration metadata remains direct top-one/top-five | PASS |
| Direct top-holding warning remains present for high direct top-one concentration | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (289/289) |

Residual items:
- Re-run Risk Analytics / risk-report refresh and then Portfolio Review from the Admin panel to regenerate stored values and confirm the reference portfolio diversification score moves from approximately 79 toward the high-80s.

## 2026-06-19 SGT - Portfolio Review Gap Candidate Primary Reason QA

Scope:
- Verify Portfolio Review gap-analysis candidate `primaryReason` text is issue-category-aware for crypto-ballast and concentration-risk findings.

QA findings addressed:

| Finding | Result |
|---|---|
| Crypto / Alternative ballast bond and treasury candidates showed generic fixed-income text such as "provides exposure to fixed income where bond allocation is ..." | Fixed; `excessive_crypto_risk` bond, treasury, fixed-income, and credit candidates now reference ballast characteristics relative to crypto and high-volatility alternative exposure |
| Concentration-risk diversifier candidates lacked single-name concentration or correlation context | Fixed; geographic diversifiers now reference concentrated single-name look-through exposure, and ballast candidates reference lower-correlation context |

Checks performed and results:

| Check | Result |
|---|---|
| `excessive_crypto_risk` bond candidate `primaryReason` includes ballast and crypto context | PASS |
| `concentration_risk` bond candidate no longer uses generic fixed-income allocation text | PASS |
| `concentration_risk` bond candidate references lower-correlation or concentration context | PASS |
| `concentration_risk` international diversifier references concentrated single-name look-through exposure | PASS |
| `insufficient_fixed_income` bond candidate keeps existing generic fixed-income allocation text | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (285/285) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate stored reports with the updated candidate explanation text.

## 2026-06-19 SGT - Portfolio Review Concentration Coherence

Scope:
- Align Portfolio Review concentration measurement and the `concentration_risk` gap finding around issuer-level underlying-company exposure on a total-value basis.

QA findings addressed:

| Finding | Result |
|---|---|
| Top-one concentration used wrapper/direct ex-cash basis while top-five used issuer look-through total basis, allowing top-one to exceed top-five | Fixed by measuring both top-one and top-five from issuer-level underlying-company exposure when look-through exists |
| Diversified ETF wrapper such as VOO could trigger "largest holding exceeds 25%" single-name finding | Fixed; wrappers remain in `largestDirectHolding` metadata but do not trigger single-company concentration findings |
| `concentration_risk` gap finding fired at >5%, flagging normal large-cap ETF holdings such as NVDA around 7-8% | Fixed; gap trigger now requires issuer look-through weight >10%, high priority above 15% |
| `concentration_risk` candidates could include individual stocks to address single-name concentration | Fixed; stock instruments are excluded from `concentration_risk` issue fit and candidate roles are diversified products only |
| Direct single-stock concentration could be missed if the issuer rollup only accepted indirect rows | Fixed; direct single-stock rows are included in issuer exposure |

Checks performed and results:

| Check | Result |
|---|---|
| ETF wrapper at 30% with largest issuer at 7% does not emit single-company concentration finding | PASS |
| Single issuer at 12% emits watch finding | PASS |
| Single issuer at 22% emits attention finding | PASS |
| Direct single-stock at 30% is included in issuer top-one and emits attention | PASS |
| Empty issuer look-through falls back to direct concentration | PASS |
| `concentration_risk` does not fire at 10% or below | PASS |
| `concentration_risk` candidates exclude stocks | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test` | PASS (285/285) |

Residual items:
- Re-run Portfolio Review from the Admin panel to regenerate the stored reference report and confirm the expected Concentration section score movement from approximately 69 to approximately 90.
- Owner should confirm the 10% / 20% issuer concentration thresholds and 15% high-priority gap threshold after reviewing live output.
- Risk Analytics diversification score still uses direct-level concentration; moving that to issuer-level remains a separate Task 2 follow-on.

## 2026-06-17 SGT - Task 14: Full Pre-Commercial RLS Hardening

Scope:
- Replace broad authenticated-read policies on assistant and telemetry tables with user-scoped SELECT policies before multi-user alpha invites.

Risk groups:
- Critical: Assistant conversations, messages, and usage logs.
- High: Portfolio telemetry snapshots.
- Low: Telemetry outcome rows scoped through parent snapshots.

Migration applied:
- `supabase/migrations/109_rls_hardening.sql`

`pg_policies` verification:

| Table | Policy | Result |
|---|---|---|
| `assistant_conversations` | `users can read own assistant conversations` | PASS |
| `assistant_messages` | `users can read own assistant messages` | PASS |
| `assistant_usage_logs` | `users can read own assistant usage logs` | PASS |
| `telemetry_recommendation_snapshots` | `users can read own telemetry recommendation snapshots` | PASS |
| `telemetry_portfolio_review_snapshots` | `users can read own telemetry portfolio review snapshots` | PASS |
| `telemetry_recommendation_outcomes` | `users can read own telemetry recommendation outcomes` | PASS |
| `telemetry_portfolio_review_outcomes` | `users can read own telemetry portfolio review outcomes` | PASS |

Checks performed and results:

| Check | Result |
|---|---|
| Migration 109 applied in Supabase | PASS |
| `pg_policies` verification returned exactly 7 rows for the targeted tables | PASS |
| All 7 policy names contain `own` | PASS |
| Assistant tables scoped through direct `user_id` or parent conversation ownership | PASS |
| Telemetry snapshot tables scoped through authenticated user's portfolio ownership | PASS |
| Telemetry outcome tables scoped through parent snapshot portfolio ownership | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` | PASS (268/268) |
| `npm.cmd run build` | PASS |

Residual items:
- None for the seven targeted assistant and telemetry RLS policies.
- `instrument_directory_summary` remains closed as an orphaned experimental table per prior documentation; no policy is needed for that table.

## 2026-06-17 SGT - Task 7: CRON_SECRET Header-Only Authentication

Scope:
- Verify protected cron job endpoints no longer accept `?secret=` query-parameter authentication and require `Authorization: Bearer <CRON_SECRET>`.

Checks performed and results:

| Check | Result |
|---|---|
| `cronAuth.ts` no longer reads `request.nextUrl.searchParams.get("secret")` | PASS |
| Valid `Authorization: Bearer <CRON_SECRET>` returns authorized `null` | PASS |
| Invalid Bearer header returns `401` | PASS |
| Missing Authorization header returns `401` | PASS |
| Query-param-only `?secret=<validToken>` returns `401` | PASS |
| Missing configured `CRON_SECRET` returns `503` | PASS |
| `scripts/call-job-endpoint.sh` already uses Bearer header | PASS |
| Supabase migration `057` already sends Bearer header | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` (268/268) | PASS |
| `npm.cmd run build` | PASS |

Residual items:
- None. No database migration required because production Supabase Cron already sends the Bearer header.

## 2026-06-17 SGT - Task 5: CI Pipeline Browser QA

Scope:
- Verify the GitHub Actions CI workflow runs end-to-end after secrets and branch protection rules are configured.

Checks performed and results:

| Check | Result |
|---|---|
| `.github/workflows/ci.yml` triggers on push to `development` | PASS |
| Lint step passes | PASS |
| Typecheck step passes | PASS |
| Test step passes (263/263) | PASS |
| Build step passes | PASS |
| `NEXT_PUBLIC_SUPABASE_URL` secret configured in GitHub | PASS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` secret configured in GitHub | PASS |
| Branch protection rules enabled on `development` and `main` | PASS |
| GitHub Team account upgraded to support branch protection on private repo | PASS |

Residual items:
- None. CI pipeline is fully operational and enforced.

## 2026-06-17 SGT - Task 6: Price-Refresh Route Reconciliation

Scope:
- Claude review of Codex implementation deleting the orphaned `/api/jobs/price-refresh` HTTP route.

Checks performed and results:

| Check | Result |
|---|---|
| `src/app/api/jobs/price-refresh/route.ts` deleted | PASS |
| `src/application/jobs/RefreshPortfolioPricesJob.ts` unchanged | PASS |
| `src/server/actions/dataRefreshActions.ts` unchanged | PASS |
| `src/server/actions/portfolioActions.ts` unchanged | PASS |
| `src/server/container.ts` unchanged | PASS |
| `src/app/api/jobs/instrument-price-refresh/route.ts` unchanged | PASS |
| No unrelated files modified | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` (263/263) | PASS |
| `npm.cmd run build` (route no longer in build output) | PASS |
| `docs/implementation-log.md` updated with correct entry | PASS |
| `docs/DOCUMENTATION_GAPS.md` High Priority item 3 closed | PASS |
| Stale `chatgpt-handover.md` reference removed from gap item | PASS |

Residual items:
- None. Cron cleanliness is based on the 2026-06-16 architecture audit (`price-refresh` confirmed absent from `cron.job`). If a live Supabase SQL console is available, re-run: `SELECT jobname, command FROM cron.job WHERE command LIKE '%price-refresh%';` — expected: only `instrument-price-refresh` rows.

## 2026-06-17 SGT - Task 8: Market Vision v3 Regeneration QA

Scope:
- Verify the 2026-06-08 to 2026-06-14 Market Vision report was regenerated using the v3 prompt and is published correctly.
- Close the Market Vision v3 calibration item opened after the prior report was deleted for regeneration.

Checks performed and results:

| Check | Result |
|---|---|
| Report generated using `market-vision-v3` prompt | PASS |
| Model: `gpt-5.4-mini` | PASS |
| Status: `published` | PASS |
| Cost logged: $0.053669 | PASS |
| Duration logged: 51970ms | PASS |
| Overall confidence: 78% | PASS |
| All regime scorecard sections populated (Growth, Inflation, Rates, Yield curve, Liquidity, USD, Commodities, Overall) | PASS |
| Regime transition tracker populated (prior → current comparison) | PASS |
| Cross-currents section populated | PASS |
| Evidence confidence scores populated for all sections | PASS |
| Portfolio macro impact matrix populated | PASS |
| FRED macro context populated | PASS |
| All narrative sections present (Executive Summary through Geopolitical Risks) | PASS |
| Structural and tactical themes populated with evidence tags | PASS |
| Portfolio context section populated | PASS |
| Evidence gaps section populated | PASS |
| No allocation recommendation language present | PASS |

Key regime findings (2026-06-08 to 2026-06-14):
- Growth: Expanding (High confidence).
- Inflation: High and sticky (High confidence).
- Rates: Falling rate support (High confidence).
- Yield curve: Mixed / normal with conflicting slope signals (High confidence).
- USD: Strengthening (Medium confidence) — regime shift from prior report (Weakening → Strengthening).
- Liquidity: Neutral (Medium confidence) — regime shift from prior report (Tightening → Neutral).
- Overall market: Mixed constructive with caution (Medium confidence).

Residual items:
- None. Market Vision v3 calibration is closed.

## 2026-06-16 SGT - Task 3 + Task 10 Browser QA (Product Mode + Admin Authorization)

Scope:
- Browser QA for Task 3 (runtime product-mode module) and Task 10 (admin authorization layer) conducted in Vercel preview deployment before alpha invites.

Checks performed and results:

| Check | Result |
|---|---|
| Alpha mode: News & Themes, Macro, Assistant, Telemetry, Admin nav hidden | PASS |
| Alpha mode: blocked routes redirect to `/portfolio?feature=alpha-disabled` | PASS |
| Full mode: full nav visible including News, Macro, Assistant, Telemetry | PASS |
| Admin nav visible for admin user (`ADMIN_USER_IDS` set) | PASS |
| Admin nav hidden for non-admin user (`ADMIN_USER_IDS` cleared) | PASS |
| Direct `/admin/*` request returns 404 for non-admin | PASS |
| Market Vision: published reports only visible in alpha mode | PASS |
| Market Vision: ReportActions (Archive) visible in full mode for published report | PASS |
| Market Vision: ReportEditor hidden in alpha mode | PASS |
| Portfolio Assistant drawer suppressed in alpha mode | PASS |
| Portfolio Assistant drawer visible in full mode | PASS |
| Signup restriction: "Early access only" message shown when `ALLOWED_SIGNUP_EMAILS` is set | PASS |
| Logo loads in alpha mode | PASS (after middleware fix — see below) |
| Logo loads in full mode | PASS |

Issues found and resolved during QA:

1. `PRODUCT_MODE` and `ALLOWED_SIGNUP_EMAILS` not taking effect after Vercel env var change.
   - Root cause: Vercel "Redeploy" reuses the same build artifact. Module-level `process.env` reads are baked in at Next.js build time. Setting env vars and redeploying without rebuilding has no effect.
   - Fix: push a new commit to trigger a full rebuild with the env vars set before the build runs.

2. Logo not loading in alpha mode.
   - Root cause: Vercel's image optimization service fetches the source image (`/brand/etfvision-light-lockup.png`) via HTTP from the same origin. This internal request went through the middleware and was blocked by the alpha mode check because `/brand/` is not in `alphaAllowedPrefixes`. The `config.matcher` pattern did not reliably exclude `/_next/image` in Next.js 15 on Vercel.
   - Fix: added `isAssetRequest` guard in `src/middleware.ts` (skips mode check for `/_next*` and paths with file extensions); added `"/_next"` and `"/brand"` to `alphaAllowedPrefixes` in `src/config/productMode.ts`. Three commits: `9e7de98`, `bb9ea0b`, `743cf20`.

3. Market Vision `ReportActions` buttons not visible in full mode (apparent).
   - Root cause: the `ReportActions` component only shows a Publish button for draft reports and an Archive button for non-archived reports. With two published reports and no drafts, only the Archive button renders. User expected a Publish/Generate button which is correct behaviour — Publish is draft-only.
   - No code change required.

Residual manual QA:
- None. All planned checks passed. Platform is cleared for alpha invites.

---
## 2026-06-16 SGT - Runtime Product Mode

Scope:
- Added server-only `PRODUCT_MODE=alpha|full` runtime product-mode module.
- Added middleware route blocking for alpha mode with redirect to `/portfolio?feature=alpha-disabled`.
- Hid News & Themes, Macro, Assistant, Telemetry, and Admin navigation in alpha mode.
- Suppressed Portfolio Assistant drawer in alpha mode.
- Restricted Market Vision in alpha mode to published reports and hid editorial actions.

Validation:
- PASS: product-mode unit tests cover mode derivation and alpha/full route decisions.
- PASS: `/methodology` remains enabled in alpha mode.
- PASS: `/admin/jobs` and `/news` are blocked in alpha mode.
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run test` ran 263 tests; 263 passed.
- PASS: `npm.cmd run build`

Residual risks:
- Manual browser QA needed in a deployed Vercel environment to confirm alpha vs full mode nav visibility, route redirect behavior, Portfolio Assistant drawer suppression, and Market Vision published-only/editorial-hidden behavior before alpha invites.

## 2026-06-16 SGT - Signup Restriction, Assistant Limit, and AI Cost Constants

Scope:
- Added invite-only signup support through `ALLOWED_SIGNUP_EMAILS`.
- Added per-user daily Portfolio Assistant conversation cap through `ASSISTANT_DAILY_LIMIT`.
- Updated `.env.example` with confirmed `gpt-5.4-mini` model IDs and real OpenAI pricing for Portfolio Assistant and Market Vision.
- Excluded news AI cost tracking because `ENABLE_AI_NEWS_CLASSIFICATION` and `ENABLE_WEEKLY_NEWS_RECONCILIATION` remain disabled by default.

Validation:
- PASS: `gpt-5.4-mini` confirmed as a valid OpenAI model ID in official OpenAI model docs.
- PASS: OpenAI pricing confirmed at `$0.75 / 1M input tokens` and `$4.50 / 1M output tokens` for `gpt-5.4-mini`.
- PASS: signup allowlist helper permits any email when empty.
- PASS: signup allowlist helper permits listed emails and rejects unlisted emails when configured.
- PASS: signup allowlist matching is case-insensitive.
- PASS: assistant daily-limit service test blocks new conversations before provider invocation when limit is reached.
- PASS: shared token cost formula returns `0.00045` for 1,000 input tokens at `$0.15 / 1M` and 500 output tokens at `$0.60 / 1M`, and returns `null` when both costs are zero.
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run test` ran 253 tests; 253 passed.
- PASS: `npm.cmd run build`

Residual risks:
- Vercel production/alpha environment variables still need to be set before alpha invites: `ALLOWED_SIGNUP_EMAILS`, `ASSISTANT_DAILY_LIMIT`, `PORTFOLIO_ASSISTANT_*_COST_PER_1M`, and `MARKET_VISION_*_COST_PER_1M`.
- Manual browser QA still needed for both signup states: empty `ALLOWED_SIGNUP_EMAILS` shows Create account; non-empty `ALLOWED_SIGNUP_EMAILS` hides Create account and shows the early-access message while existing sign-in still works.
- Manual API/browser QA still needed for `ASSISTANT_DAILY_LIMIT` in a deployed environment to confirm `/api/assistant` returns HTTP 429 after the configured daily cap.

## 2026-06-16 SGT - Portfolio Summary RLS Policies

Scope:
- Added migration `107_portfolio_summary_rls_policies.sql`.
- Added user-scoped SELECT policies to `portfolio_dashboard_summary` and `portfolio_performance_summary`.
- Added no write policies.
- Added no policy to `ingestion_events` or `instrument_directory_summary`.

Validation:
- PASS: migrations `107_portfolio_summary_rls_policies.sql` and `108_fix_portfolio_summary_rls_policies.sql` applied in Supabase (2026-06-16). Note: migration 107 initially used `user_id = auth.uid()` which always returned zero rows. Migration 108 corrected the join to `users.auth_provider_user_id = auth.uid()::text` matching the established pattern from migration 004. Migration 107 file corrected in-place for fresh deployments.
- PASS: authenticated SELECT on `portfolio_dashboard_summary` returns only the current user's row.
- PASS: authenticated SELECT on `portfolio_performance_summary` returns only the current user's row.
- PASS: portfolio dashboard page loads after migration; service-role reads unaffected.
- `ingestion_events`: documented as unused/internal-blocked; no policy added.
- `instrument_directory_summary`: documented as orphaned/untracked; no policy added.
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run typecheck`
- PARTIAL: `npm.cmd test` ran 248 tests; 247 passed and the known pre-existing Portfolio Review wording assertion failed.
- PASS: `npm.cmd run build`

Residual risks:
- `instrument_directory_summary` remains the only open item from the previously-zero-policy table set and needs origin investigation before any policy decision.

## 2026-06-16 SGT - Assets RLS Enablement

Scope:
- Added migration `106_assets_rls.sql` to enable Row Level Security on the global `assets` reference catalog.
- Added exactly one SELECT policy for authenticated users: `auth.role() = 'authenticated'`.
- Preserved the service-role-only write model by adding no INSERT, UPDATE, or DELETE policies.

Validation:
- PASS: migration `106_assets_rls.sql` applied in Supabase (2026-06-16).
- PASS: authenticated SELECT on `assets` succeeds via user JWT.
- PASS: authenticated INSERT into `assets` through PostgREST fails with RLS permission error.
- PASS: service-role Seed Universe or metadata refresh continues writing to `assets`.
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run typecheck`
- PARTIAL: `npm.cmd test` ran 248 tests; 247 passed and the known pre-existing Portfolio Review wording assertion failed.
- PASS: `npm.cmd run build`

Residual risks:
- This closes the specific `assets` RLS-disabled gap only.
- Task 2B remains open for the four RLS-enabled zero-policy tables and broader formalization of the service-role-only write model.

## 2026-06-16 SGT - Admin Authorization Layer

Scope:
- Added app-level admin authorization using `ADMIN_USER_IDS` and optional `ADMIN_EMAILS` environment allowlists.
- Added `requireAdmin()` route/action enforcement for `/admin/*`, `/setup/taxonomy`, and admin-only server actions.
- Preserved user self-service actions and left `/api/jobs/*` cron authentication unchanged.

Access-control test matrix:
- PASS: Admin allowlist helper grants access when the Supabase Auth UUID is in `ADMIN_USER_IDS`.
- PASS: Admin allowlist helper grants access when email is in `ADMIN_EMAILS`, case-insensitively.
- PASS: Non-members are denied.
- PASS: Empty allowlists deny all users.
- PASS: Whitespace and comma-separated allowlists are parsed deterministically.
- PASS: `/api/jobs/*` source remains unchanged and continues to authorize through `CRON_SECRET`.
- SOURCE REVIEW PASS: `/admin/*` has an admin layout guard; `/setup/taxonomy` has an admin layout guard.
- SOURCE REVIEW PASS: Admin-only server actions use `requireAdmin()` for refresh, ingestion, taxonomy, job trigger, universe-curation, Market Vision editorial, and ETF look-through refresh operations.
- SOURCE REVIEW PASS: User self-service portfolio, watchlist, Portfolio Review run, and Insights/recommendation run actions still use `requireUser()`.
- SOURCE REVIEW PASS: The `/setup` taxonomy-admin link is hidden from non-admin users while the normal portfolio setup flow remains available.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `node --test .test-build\\tests\\admin-access.test.js` (7/7)
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run build`
- PARTIAL: `npm.cmd test` ran the full suite and the new admin tests passed, but one pre-existing Portfolio Review wording assertion failed: `improvement suggestions map concentration issues to diversifying candidates` expects `/regulated demand exposure/` while current output is `Provides exposure to regulated demand that can behave differently from growth equities.`

Residual risks:
- This implementation uses environment allowlists only. A future DB-backed `users.is_admin` or role model may still be preferable before commercial launch.
- This does not complete the broader RLS write-policy audit or the `assets` RLS fix documented in `DOCUMENTATION_GAPS.md`.
- Live browser QA should confirm admin users see Admin navigation, non-admin users do not, non-admin direct `/admin/*` requests return 404, and empty allowlists lock down admin access.

## 2026-06-14 23:00 SGT - Market Vision v3 Small Calibration Pass

Scope:
- Applied the narrow Market Vision calibration pass after reviewing the refreshed 2026-06-14 draft against the 2026-06-07 report.
- Focused on transition semantics and confidence caps only.
- Did not change news ingestion, FRED ingestion, portfolio analytics, recommendation scoring, telemetry scoring, or report publishing behavior.

Files updated:
- `src/application/services/marketVision/MarketVisionGenerationService.ts`
- `tests/market-vision.test.ts`
- `docs/MARKET_VISION_METHODOLOGY.md`
- `docs/MARKET_VISION_CALIBRATION_NOTES.md`
- `docs/qa-log.md`

Implementation checks:
- PASS: Liquidity tightening/neutral/easing transitions are now treated as true regime shifts.
- PASS: Liquidity `Tightening` and `Restrictive` normalize to the same tightening family.
- PASS: Overall Market `Mixed / selective risk support` to `Mixed but constructive` is treated as a minor classification change.
- PASS: Overall Market mixed to explicit risk-on/risk-off is treated as a regime shift.
- PASS: Macro confidence rows default to a 90 cap unless strong direct evidence is present.
- PASS: 91-95 confidence requires at least 5 supporting observations, at least 4 direct indicator observations, no gaps, no stale data, and a non-mixed regime.
- PASS: Overall Market confidence is capped more conservatively when mixed or competing cross-currents are present.
- PASS: Existing tactical filtering remains intact for USD strength, weakening USD suppression, and neutral-liquidity tightening suppression.

Validation:
- `npm.cmd test -- market-vision` passed: 240 tests, 240 passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- Deleted one generated draft report for `2026-06-08` to `2026-06-14` so the calibrated report can be regenerated manually.

Follow-up:
- Regenerate the 2026-06-08 to 2026-06-14 report manually from Admin/Data Sources.
- Compare the regenerated 2026-06-14 report against the 2026-06-07 report before marking Market Vision v3 calibration complete.

## 2026-06-13 16:20 SGT - Security Master Full QA/QC Closeout

Scope:
- Completed a full Security Master audit closeout across Phase A, Phase 1, Phase 2, Phase 3, Phase 4A/4B/4C/4D, Phase 5, Phase 8, Phase 6 and Phase 7.
- Reconciled implementation state against the Security Master audit plan.
- Reviewed the live Admin/Data Sources Security Master QA snapshot provided from Supabase.
- Updated the Security Master audit, commercialization audit plan, documentation index and documentation gap tracker so they no longer describe Phase 5 as pending.

Files updated:
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/README.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`

Implementation coverage reviewed:
- PASS: canonical security tables, identifiers and aliases exist.
- PASS: active/user-selectable instruments are linked to canonical securities.
- PASS: ETF top holdings are mapped to canonical/internal securities.
- PASS: dual-run QA exists for raw-symbol versus canonical grouping.
- PASS: issuer master, issuer aliases and issuer duplicate review queue exist.
- PASS: issuer-level look-through rollups are used for Portfolio Review concentration, hidden overlap, assistant context and recommendation portfolio-fit.
- PASS: security-level drill-down is preserved under issuer-level rows.
- PASS: recommendation, recommendation-history and telemetry recommendation snapshots carry stable `security_id` / `issuer_id` where available.
- PASS: Portfolio Review reports carry Phase 5 identity metadata.
- PASS: Admin/Data Sources Security Master QA card reads `get_security_master_health_snapshot()`.
- PASS: corporate-action readiness tables exist.
- PASS: provider observation/conflict readiness tables exist.

Live QA snapshot reviewed:
- PASS: 306 / 306 selectable instruments have `security_id`.
- PASS: 357 active securities exist.
- PASS: 357 / 357 active securities are linked to issuers.
- PASS: 301 / 306 selectable instruments have ISIN.
- PASS: 301 / 306 selectable instruments have CUSIP.
- PASS: 240 / 240 ETF top holdings are mapped.
- PASS: 0 ETF top holdings are unmapped.
- PASS: 0 ETF top holdings are ambiguous.
- PASS: 0 issuer duplicate candidates are open.
- PASS: 0 stale identifier refreshes.
- PASS: 1053 / 1053 current recommendation rows have stable identity.
- PASS: 1053 / 1053 recommendation history rows have stable identity.
- PASS: 389 / 389 telemetry recommendation snapshots have stable identity.
- PASS: 24 / 24 Portfolio Review reports carry Phase 5 identity.
- ACCEPTED: 5 mapping gap rows remain because 5 selectable instruments do not have ISIN/CUSIP coverage; this is not a security mapping failure because all selectable instruments have `security_id`.
- ACCEPTED: 0 FIGI coverage because no FIGI provider has been connected.
- ACCEPTED: 0 corporate-action, lifecycle-link, provider-observation and provider-conflict rows because those tables are readiness layers until real ingestion/provider reconciliation is added.

Validation:
- Documentation and SQL/code surface audit completed.
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed: 234 tests, 234 passed.

Conclusion:
- Security Master Audit is completed for the current commercialization checkpoint.
- Future work is operational expansion, not audit-blocking remediation: corporate-action ingestion, second-provider observation writes, provider-priority rules, and Admin review workflows for real conflicts.

## 2026-06-13 - Security Master Phase 8, 6, And 7 Readiness

Scope:
- Implemented Phase 8 first so Security Master coverage can be monitored before lifecycle/reconciliation automation is introduced.
- Added `security_master_mapping_gap_report` for exportable mapping gaps.
- Added `get_security_master_health_snapshot()` for Admin/Data Sources Security Master QA coverage.
- Added Admin/Data Sources Security Master QA card with selectable mapping, identifier coverage, ETF holding mapping, issuer duplicate, recommendation identity, telemetry identity, corporate-action and provider-conflict status.
- Added Phase 6 corporate-action readiness tables:
  - `security_corporate_actions`
  - `security_lifecycle_links`
- Added Phase 7 provider reconciliation readiness tables:
  - `security_provider_identifier_observations`
  - `security_identifier_conflicts`
- Updated architecture, schema, Security Master audit, documentation gaps and QA log.

Files updated:
- `supabase/migrations/103_security_master_phase8_monitoring.sql`
- `supabase/migrations/104_security_master_phase6_corporate_actions.sql`
- `supabase/migrations/105_security_master_phase7_provider_reconciliation.sql`
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed.
- These phases are additive and do not change portfolio look-through calculations, recommendation scoring, telemetry outcome evaluation, or Market Vision generation.

Post-deployment QA:
- Apply migrations `103`, `104`, and `105`.
- Confirm the Admin/Data Sources Security Master QA card renders.
- Run:
  ```sql
  select public.get_security_master_health_snapshot();

  select gap_type, severity, count(*) as rows
  from security_master_mapping_gap_report
  group by gap_type, severity
  order by severity desc, gap_type;

  select status, action_type, count(*)
  from security_corporate_actions
  group by status, action_type
  order by status, action_type;

  select review_status, severity, conflict_type, count(*)
  from security_identifier_conflicts
  group by review_status, severity, conflict_type
  order by review_status, severity, conflict_type;
  ```

Residual risks:
- Phase 6/7 tables are readiness layers only. Metadata refresh does not yet write provider observations or conflicts.
- Provider priority rules should be approved before any automated conflict resolution.
- Corporate-action records should remain manual/reviewed until lifecycle ingestion and application rules are explicitly designed.

## 2026-06-13 - Security Master Phase 5 Snapshot Identity Propagation

Scope:
- Added stable `security_id` and `issuer_id` identity fields to recommendation and telemetry recommendation snapshot/history tables.
- Added trigger-based identity population so future recommendation and telemetry writes inherit canonical security/issuer identity from `instrument_id` / `symbol`.
- Backfilled existing recommendation and telemetry recommendation rows where current instrument security and issuer links are available.
- Added portfolio-level `security_identity_snapshot` metadata to Portfolio Review report and telemetry snapshots.
- Updated Security Master, database schema, recommendation methodology, telemetry architecture, documentation gap, and architecture overview docs.

Files updated:
- `supabase/migrations/102_security_master_phase5_snapshot_identity.sql`
- `src/domain/recommendations/types.ts`
- `src/domain/telemetry/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseRecommendationRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseTelemetryRepository.ts`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
- `docs/TELEMETRY_ARCHITECTURE.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/qa-log.md`

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed.
- The migration is additive and does not alter recommendation scoring, labels, guardrails, telemetry outcomes, or Portfolio Review scoring.

Post-deployment QA:
- Apply migration `102`.
- Run the Phase 5 SQL checks documented in `docs/SECURITY_MASTER_AUDIT.md`.
- Confirm most current recommendation and telemetry recommendation rows have both `security_id` and `issuer_id`.
- Confirm older rows with null identity correspond to genuinely unmapped or deleted historical instruments.
- Confirm Portfolio Review rows have `security_identity_snapshot.securityMasterPhase = phase5`.

Residual risks:
- Market Vision theme/proxy snapshots do not yet carry per-proxy security identity because Market Vision is still theme/report based.
- Phase 6 corporate-action tables are still needed for ticker changes, mergers, spin-offs, share-class changes, ETF name changes, ETF closures, and predecessor/successor securities.

## 2026-06-13 14:58 SGT - Return Anchor Refresh Timeout Fix

Scope:
- Investigated the failed `instrument-return-anchors-refresh` Supabase cron run from 2026-06-13 5:50 AM SGT.
- Found that `refresh_instrument_return_anchors()` still called `refresh_instrument_daily_returns()` internally even though daily returns are already refreshed in the previous scheduled job.
- Added migration `101` to make return anchors read the precomputed `instrument_daily_returns` table only.
- Rescheduled dependent daily jobs with wider spacing and longer lock TTLs so anchors, market metrics, risk metrics, metadata, portfolio valuation, portfolio summary, macro, and news jobs are less likely to overlap.
- Updated scheduled job and data ingestion documentation.

Files updated:
- `supabase/migrations/101_optimize_return_anchor_refresh_schedule.sql`
- `docs/scheduled-jobs.md`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/DATA_INGESTION_AND_PROVIDERS.md`
- `docs/qa-log.md`

Validation:
- Code review confirmed the old anchor function performed duplicate daily-return work.
- Schedule documentation now matches the new migration.

Post-deployment QA:
- Apply migration `101` in Supabase.
- Confirm `cron.job` shows `app-daily-instrument-return-anchors-refresh` at 5:55 AM SGT and `app-daily-instrument-market-metrics-refresh` at 6:05 AM SGT.
- After the next run, check `job_runs` for successful `instrument-daily-returns-refresh`, `instrument-return-anchors-refresh`, and `instrument-market-metrics-refresh`.
- Check Admin/Data Sources derived metric layer freshness.

Residual risks:
- If anchor refresh still times out after migration `101`, the next hardening step is a stale-only anchor endpoint that selects only instruments whose anchors lag daily returns instead of iterating the full active universe.

## 2026-06-13 03:45 SGT - Security Master Phase 4B Issuer Master Foundation

Scope:
- Added the database foundation for issuer-level exposure grouping.
- Created `issuers` and `security_issuer_links`.
- Added `normalize_issuer_name(input_name text)` for deterministic share-class/name cleanup.
- Added `sync_security_issuer_links()` to backfill active securities into issuer links.
- Kept application calculations unchanged until issuer-link QA is reviewed.

Files updated:
- `supabase/migrations/097_issuer_master_foundation.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Design notes:
- `securities_master` remains the canonical security/tradable identity.
- Issuers sit above securities and answer company/issuer exposure questions.
- `GOOG` and `GOOGL` can remain separate securities while linking to a common Alphabet issuer.
- The current Portfolio Review display rollup remains a temporary presentation layer until issuer IDs are carried into look-through rows.

Post-migration QA:
- Run `select * from public.sync_security_issuer_links();`.
- Confirm active securities without issuer links equals zero.
- Review issuers with multiple securities and confirm they are legitimate share-class/listing cases.
- Do not switch issuer-level calculations until the mapping results are reviewed.

Residual risks:
- Normalized-name linking is deterministic but still simpler than a full corporate-action/security-reference provider.
- Parent/subsidiary and ADR/local-listing edge cases should be reviewed before commercialization.

## 2026-06-13 03:20 SGT - Portfolio Review Underlying Exposure UI Refinement

Scope:
- Split Portfolio Review look-through display into direct portfolio positions, top underlying company exposure, and top indirect company exposure.
- Kept ETF wrappers in Direct Portfolio Positions instead of mixing them into the underlying company concentration chart.
- Added issuer-level display grouping for concentration views so share-class variants such as `GOOGL` and `GOOG` are shown together as Alphabet issuer exposure.
- Preserved security-level detail through raw symbols in `inputsSnapshot.rawSymbols`.
- Updated Concentration Review to use issuer-grouped underlying exposures instead of ETF wrapper rows for combined top exposure metrics.

Files updated:
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/qa-log.md`

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed with 232 tests.

Post-deployment QA:
- Rerun Portfolio Review so new `inputsSnapshot.instrumentAssetClass` and `inputsSnapshot.exposureRole` flags are stored.
- Confirm ETFs such as `VOO`, `QQQ`, and `VT` appear under Direct Portfolio Positions, not Top Underlying Company Exposure.
- Confirm Alphabet issuer exposure rolls up `GOOGL` and `GOOG` in the top underlying and indirect company views.
- Confirm security-master dual-run QA still passes after the refresh.

Residual risks:
- Issuer-level rollup is a display/concentration grouping layer, not a security-master merge. `GOOG` and `GOOGL` remain distinct securities by design.
- Existing saved reports need a Portfolio Review refresh before the new direct/underlying flags are present.

## 2026-06-13 02:55 SGT - Security Master Phase 4A Initial Calculation Switch

Scope:
- Switched portfolio look-through top-holding aggregation to prefer canonical `security_id` where available.
- Preserved raw symbols as fallback and stored raw provider symbols in `inputsSnapshot.rawSymbols`.
- Added security mapping fields to TypeScript ETF look-through types and Supabase repository mapping.
- Kept UI display shape stable via existing `holdingSymbol` / `exposureName` fields.

Files updated:
- `src/domain/universe/types.ts`
- `src/domain/etfLookthrough/types.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `tests/portfolio-review.test.ts`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed with 232 tests.
- Portfolio review test now verifies direct `MSFT` and ETF-provider `MSFT US` aggregate when they share `security-msft`.

Post-deployment QA:
- Refresh Portfolio Review.
- Run `select * from public.run_security_master_dual_run_qa();`.
- Confirm the latest dual-run report remains `pass`.
- Spot-check top holdings and indirect holdings for expected direct-plus-ETF aggregation.

Residual risks:
- Existing portfolio look-through rows will not carry the new security-id aggregation until Portfolio Review is refreshed.
- Sector/country/theme allocations are not security entities and remain label based.
- Recommendation, assistant, and telemetry layers consume the existing exposure shape and should be manually spot-checked after refresh.

## 2026-06-13 02:25 SGT - Security Master Phase 3 Dual-Run QA

Scope:
- Added a database-side dual-run report for portfolio look-through holdings.
- Compared current raw-symbol grouping against canonical `holding_security_id` grouping for the latest portfolio look-through snapshot.
- Kept production portfolio, concentration, recommendation, assistant, telemetry, and Market Vision calculations unchanged.

Files updated:
- `supabase/migrations/096_security_master_dual_run_qa.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Design notes:
- `security_master_dual_run_reports` stores historical QA results so changes in ETF provider symbols or security mappings can be audited over time.
- `run_security_master_dual_run_qa()` first calls `sync_etf_holding_security_ids()` and then stores a comparison report for each latest portfolio look-through snapshot.
- `pass` means row mappings are clean and raw-symbol total weight equals security-ID total weight.
- `warning` means canonical grouping changes the number of groups, usually because aliases or duplicate raw symbols merge. Review before switching calculations.
- `failed` means unmapped/ambiguous rows or total weight deltas still exist.

Post-migration QA:
- Run `select * from public.run_security_master_dual_run_qa();`.
- Confirm the latest report has `unmapped_row_count = 0`, `ambiguous_row_count = 0`, and `total_weight_delta = 0`.
- Review any `merged_group_count > 0` against expected alias/security consolidation.
- Do not switch production concentration or top-indirect-holding calculations until the report is reviewed.

## 2026-06-13 01:45 SGT - Security Master Phase 2B Internal ETF Underlyings

Scope:
- Added an additive migration to backfill internal-only securities from unmapped `etf_top_holdings` rows.
- Kept these underlying securities out of the user-selectable `instruments` universe.
- Reran the ETF holding security mapper after creating internal securities.

Files updated:
- `supabase/migrations/095_backfill_internal_etf_underlying_securities.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Design notes:
- Existing active instrument-linked securities are marked `is_user_selectable = true`, `is_internal_only = false`.
- ETF-only underlying securities are marked `is_user_selectable = false`, `is_internal_only = true`.
- This safely supports GOOG, NOVO.B, Samsung, Nestle, Roche, Tencent, Reliance, and similar look-through holdings without adding them to Universe/Watchlist.
- No portfolio, concentration, recommendation, or assistant calculation has been switched to canonical security IDs yet.

Post-migration QA:
- ETF top-holding `mapping_status = 'unmapped'` should materially decline.
- Portfolio look-through holding `mapping_status = 'unmapped'` should decline, likely to zero for the current portfolio unless provider symbols remain unresolvable.
- Confirm internal-only securities are not inserted into `instruments`.

## 2026-06-13 01:25 SGT - Security Master Phase 2 ETF Holding Mapping

Scope:
- Confirmed ETF holding infrastructure already exists in the repo via `etf_top_holdings` and `portfolio_lookthrough_holdings`.
- Added canonical security mapping columns and a sync helper for ETF top holdings, portfolio look-through holdings, and top-holding exposure rows.
- Kept all calculations symbol/instrument based for now; this phase enables dual-run QA rather than switching production calculations.

Files updated:
- `supabase/migrations/094_security_master_etf_holding_mapping.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Current ETF holding state:
- `etf_top_holdings` exists and stores raw provider/seeded ETF holdings by `holding_symbol`.
- `portfolio_lookthrough_holdings` exists and stores direct plus indirect holding exposure by `holding_symbol`.
- Phase 2 adds `holding_security_id`, mapping status/confidence/source timestamps, and `portfolio_lookthrough_exposures.exposure_security_id`.

Post-migration QA:
- Run migration 094.
- Check mapped/unmapped/ambiguous counts for `etf_top_holdings`.
- Check mapped/unmapped/ambiguous counts for `portfolio_lookthrough_holdings`.
- Review unmapped top holdings before any future calculation switch.

## 2026-06-13 01:05 SGT - Security Master Metadata Identifier Sync

Scope:
- Updated instrument metadata refresh so FMP `isin`, `cusip`, and `figi` values are extracted and promoted into normalized instrument/security-master fields.
- Added a database helper to sync normalized instrument identifiers into `securities_master` and `security_identifiers`.
- Updated metadata refresh selection so missing ISIN/CUSIP coverage is refreshed even when normal metadata is still within the 30-day freshness window.
- Updated the manual Admin/Data Sources Instrument Metadata button to force an identifier catch-up for non-crypto instruments missing ISIN/CUSIP, while leaving scheduled metadata refresh conservative unless `forceIdentifierRefresh=true` is explicitly passed.

Files updated:
- `src/application/ports/providers/AssetMetadataProvider.ts`
- `src/infrastructure/providers/metadata/FmpAssetMetadataProvider.ts`
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/application/services/MetadataRefreshService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `supabase/migrations/093_sync_security_master_identifiers.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Expected result after migration 093 and Instrument Metadata Refresh:
- Stock ISIN/CUSIP coverage should remain complete.
- ETF ISIN/CUSIP coverage should improve where FMP returns identifiers.
- Crypto ETF ISIN/CUSIP may remain unavailable depending on FMP profile coverage.
- `security_identifiers` should gain additional `ISIN`, `CUSIP`, and possible `FIGI` rows as metadata refresh completes.

## 2026-06-13 00:40 SGT - Security Master Link Repair Migration

Scope:
- Added an idempotent repair migration after live Supabase checks showed `securities_master` had 306 rows, while all active instruments still had null `security_id`, null `coverage_status`, and `security_identifiers` had no rows.

Root cause:
- Migration 091 inserted canonical securities and then attempted to match instruments to those inserted rows in the same CTE chain.
- The safer pattern is to insert canonical rows first, then run a separate statement that reads `securities_master` and updates instruments/identifiers.

Files updated:
- `supabase/migrations/092_repair_security_master_links.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Expected post-migration result:
- `active_instruments_without_security_id` should fall from 306 to near 0.
- `coverage_status` should mostly be `mapped`.
- `security_identifiers` should contain `SYMBOL`, `EXCHANGE_SYMBOL`, `PROVIDER_SYMBOL`, `ISIN`, and `CUSIP` rows where available.

## 2026-06-13 00:22 SGT - Security Master Phase 1 Foundation

Scope:
- Implemented the additive Security Master Phase 1 foundation after completing Phase A audit/design.
- Added canonical security identity tables, instrument linkage fields, initial backfill logic, deterministic resolver service, and resolver tests.
- Did not switch portfolio, ETF look-through, recommendation, telemetry, Market Vision, dashboard, or assistant calculations to security-master logic.

Files updated:
- `supabase/migrations/091_security_master_foundation.sql`
- `src/application/services/securityMaster/SecurityMasterService.ts`
- `tests/security-master.test.ts`
- `package.json`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/qa-log.md`

Implementation details:
- Migration 091 creates `securities_master`, `security_identifiers`, and `security_aliases`.
- Migration 091 adds nullable `security_id`, `isin`, `cusip`, `figi`, `provider_symbol`, `identifier_quality_score`, `identifier_last_refreshed_at`, `coverage_status`, `is_user_selectable`, `is_internal_only`, and `is_alpha_enabled` columns to `instruments`.
- Initial backfill reads stored FMP metadata where available and falls back to exchange + symbol matching.
- Resolver matching order is FIGI, ISIN, CUSIP, SEDOL, exchange + symbol, provider symbol, alias, then low-confidence name fallback.
- Configured symbol aliases include `BRK-B` and `BRK/B` to `BRK.B`, plus historical `FB` to `META`.
- GOOG and GOOGL are intentionally not merged without an explicit identifier/alias rule.

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd test -- --test-name-pattern security` passed. The current npm test script enumerates all compiled test files before forwarding the pattern, so this effectively ran the full test suite: 232 passed, 0 failed.

Post-deployment QA still required:
- Apply migration 091 in Supabase.
- Check active instruments without `security_id`.
- Check identifier counts by type.
- Review `coverage_status = 'needs_identifier_review'` instruments.
- Confirm no portfolio output changes, because no calculations are switched yet.

## 2026-06-12 23:58 SGT - Security Master Phase A Audit And Design

Scope:
- Reviewed the user-provided Security Master Audit prompt.
- Re-scoped it into a Phase A audit/design task only.
- Created a current-state security master audit and target architecture document.
- Did not add migrations, write application code, change calculations, or alter Supabase data.

Files updated:
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/README.md`
- `docs/qa-log.md`

Primary code/schema references checked:
- `supabase/migrations/001_core_mvp_schema.sql`
- `supabase/migrations/008_instrument_universe.sql`
- `supabase/migrations/051_etf_lookthrough_exposure.sql`
- `supabase/migrations/052_portfolio_lookthrough_holdings.sql`
- `supabase/migrations/046_recommendation_engine_v1.sql`
- `supabase/migrations/054_telemetry_learning_layer.sql`
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/application/services/portfolioReview/PortfolioReviewService.ts`
- `src/infrastructure/providers/metadata/FmpAssetMetadataProvider.ts`

Live evidence:
- Active instruments checked: 306.
- Active split: 105 `stock`, 196 `etf`, 5 `crypto_etf`.
- FMP `/stable/profile` supports `isin` and `cusip`.
- Full active-universe FMP probe returned profile + ISIN for 301/306 symbols; the remaining 5 were FMP 429 limit responses, not missing-ISIN responses.
- Single retry for `XLV` returned ISIN/CUSIP successfully.
- 201 active instruments currently have nested stored `provider_metadata.financial_modeling_prep.isin` and `cusip`.
- ETF exposure row counts observed: 220 sector rows, 396 country rows, 240 top-holding rows.
- Portfolio look-through holding rows observed: 52.

Findings:
- PASS: ETFVision has a strong user-selectable `instruments` universe and normalized product taxonomy.
- PASS: Raw FMP metadata can preserve ISIN/CUSIP today.
- GAP: ISIN/CUSIP are nested raw metadata, not normalized first-class columns.
- GAP: No repo-owned security-master migration/service currently defines canonical `security_id` governance.
- GAP: ETF top holdings and portfolio look-through holdings are currently keyed by raw `holding_symbol`, so direct-plus-indirect overlap can be fragmented by symbol variants.
- GAP: Recommendation and telemetry history use `instrument_id` plus symbol, which is acceptable now but not corporate-action ready.

Recommended next implementation:
- Phase 1 additive foundation only: add `securities_master`, `security_identifiers`, `security_aliases`; add nullable `security_id`, normalized identifiers and provider symbol columns to `instruments`; backfill active instruments from FMP profile metadata; add resolver tests.
- Do not switch concentration, overlap, or portfolio review calculations until a dual-run QA compares raw-symbol output with `security_id` output.

Validation:
- Documentation/source/schema audit only.
- No runtime tests were required because no executable code changed.

## 2026-06-12 22:36 SGT - Security Master Phase 4C/4D Final Display QA And Documentation Refresh

Scope:
- Verified the post-refresh Portfolio Review output after issuer-level look-through rollups.
- Confirmed `Alphabet Inc (GOOG + GOOGL)` appears as one issuer-level exposure while preserving security/source ETF drill-down.
- Fixed direct-position display precedence where ETF indirect exposure could create an issuer row first as `Underlying Security` before the direct stock holding was added.
- Direct holdings now win `inputsSnapshot.instrumentAssetClass` and security-breakdown display symbols when the same issuer/security also appears through ETF look-through.
- Updated Security Master and Commercialization Audit documents to reflect Phase 4C/4D completion before moving to Phase 5.

Files updated:
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `tests/portfolio-review.test.ts`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/qa-log.md`

Validation:
- Manual QA confirmed MSFT and NVDA direct positions now show as `Stock`.
- Manual QA confirmed indirect exposure remains indirect-only, with total-with-direct shown separately.
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed with 234 tests.

Residual risks:
- Recommendation history and telemetry snapshots still need Phase 5 stable `security_id` / `issuer_id` hardening.
- Future provider/issuer variants should continue to be reviewed through issuer alias and duplicate-candidate workflows.

## 2026-06-12 22:05 SGT - Security Master Phase 4C/4D Issuer Rollups And Drill-Down

Scope:
- Added issuer IDs/names to portfolio look-through holdings and top-holding exposures.
- Changed Portfolio Look-through calculation to group direct stock plus ETF underlying exposure by issuer when issuer links exist.
- Kept fund wrappers as direct security-level positions, not issuer-level company exposure.
- Added security-level drill-down in `inputsSnapshot.securityBreakdown`.
- Updated Portfolio Review concentration logic to use issuer IDs first and legacy name normalization only as fallback.
- Updated Portfolio Review UI details to show issuer-level rows with security/source ETF audit detail.
- Updated Portfolio Assistant context with issuer-level hidden overlap and security breakdown.
- Updated recommendation portfolio-fit logic to use issuer-level look-through exposure for duplicate/concentration detection.

Files updated:
- `supabase/migrations/100_issuer_level_lookthrough_rollups.sql`
- `src/domain/etfLookthrough/types.ts`
- `src/application/ports/repositories/EtfExposureRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/application/services/portfolio/PortfolioExposureContextService.ts`
- `src/application/services/recommendations/portfolioFitService.ts`
- `src/application/services/assistant/AssistantContextBuilder.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `tests/recommendations.test.ts`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Validation:
- Portfolio look-through test now verifies issuer-level rollup while preserving raw symbols/security breakdown.
- Recommendation test now verifies issuer-level look-through exposure affects portfolio-fit duplicate exposure.

Post-migration QA:
- Apply migration `100`.
- Refresh Portfolio Review.
- Confirm top underlying and top indirect exposure show issuer-level names such as `Alphabet Inc`.
- Confirm security drill-down still shows underlying securities/source ETFs such as `GOOG`, `GOOGL`, `VOO`, `QQQ`, and `VT` where present.
- Re-run recommendation refresh only after Portfolio Review has refreshed so portfolio-fit can consume issuer-level look-through context.
  - **Superseded 2026-06-17:** portfolio-fit is no longer called in the recommendation scoring pipeline. Recommendation runs are now portfolio-independent and can be triggered in any order relative to Portfolio Review.

Residual risks:
- Existing saved Portfolio Review reports need a refresh before issuer IDs and security breakdown appear.
- Recommendation history and telemetry snapshots still need Phase 5 stable `security_id` / `issuer_id` hardening.

## 2026-06-12 21:35 SGT - Security Master Issuer Display Name Cleanup

Scope:
- Added `clean_issuer_display_name(input_name text)` to remove share-class/security suffixes from issuer display names.
- Added an `issuers` trigger so future issuer inserts and issuer-name updates are cleaned automatically.
- Cleaned existing issuer rows such as `Alphabet Inc Class C` to display as `Alphabet Inc`.

Files updated:
- `supabase/migrations/099_clean_issuer_display_names.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Design notes:
- Issuer display names should represent the company/fund issuer.
- Share-class detail remains on `security_issuer_links.share_class` and the underlying security record.
- This is display/master-data cleanup only. It does not merge securities or change portfolio calculations.

Post-migration QA:
- Run the `GOOG` / `GOOGL` issuer QA query from `docs/SECURITY_MASTER_AUDIT.md`.
- Expected: both symbols appear under one clean issuer name, for example `Alphabet Inc`.

## 2026-06-12 21:15 SGT - Security Master Phase 4B Issuer Alias Hardening

Scope:
- Added approved issuer aliases so provider name variants can map to the same issuer without manual SQL.
- Added `issuer_duplicate_candidates` as a review queue for possible issuer duplicates.
- Replaced `sync_security_issuer_links()` with an alias-aware version.
- Seeded aliases for known high-value variants such as `Alphabet` -> `Alphabet Inc`, Berkshire share-class names, `TSMC`, `Meta Platforms`, `JPMorgan Chase`, `Novo Nordisk`, and `Samsung Electronics`.

Files updated:
- `supabase/migrations/098_issuer_alias_normalization.sql`
- `docs/SECURITY_MASTER_AUDIT.md`
- `docs/qa-log.md`

Design notes:
- `issuer_aliases` is the approved mapping layer. Only aliases with `review_status = 'approved'` and no `valid_to` are used by the sync.
- `issuer_duplicate_candidates` is review-only. It surfaces likely duplicates from suffix-stripped base names but does not merge or relink anything automatically.
- `issuer_base_name()` is intentionally used only for duplicate-candidate detection, not production linking.
- Existing security IDs and ETF holding mappings remain unchanged.

Post-migration QA:
- Run `select * from public.sync_security_issuer_links();`.
- Run `select * from public.refresh_issuer_duplicate_candidates();`.
- Confirm `GOOG` and `GOOGL` return under the same issuer row in the issuer QA query documented in `docs/SECURITY_MASTER_AUDIT.md`.
- Review `issuer_duplicate_candidates where review_status = 'needs_review'` and convert confirmed variants into `issuer_aliases` only after checking.

Residual risks:
- Alias seed coverage is intentionally conservative. Some international issuer variants may still need review.
- This improves issuer grouping, but it is not a full corporate-action or multi-provider identifier reconciliation engine yet.

Backfilled entries are reconstructed from commit history and prior implementation/QA work before this log existed.

## 2026-06-01 - Phase 2 Core MVP QA Backfill

Scope:
- Next.js + TypeScript app scaffold.
- Tailwind/shadcn setup.
- Supabase Auth.
- Portfolio setup.
- Cash balances.
- Holdings.
- Transactions.
- Dashboard basics.
- Cloud-portable service/repository pattern.

Fixes made:
- Fixed Vercel build type errors around Supabase auth cookie handling.
- Tightened middleware cookie typings.
- Fixed duplicate default portfolio handling.
- Added setup/profile visibility and edit support.
- Added holding total and estimated holding values on dashboard.
- Clarified unconverted currency totals for multi-currency portfolios.
- Added explicit holding/cash currency display.
- Standardized displayed asset type labels, including ETF capitalization.

Validation / QA performed:
- Manual local and Vercel smoke testing of login, setup, cash, holdings, transactions, dashboard, and holdings table.
- Vercel production build failures were resolved until deployment passed.
- Phase 2 QA checklist created in `docs/phase-2-qa-checklist.md`.

Related commits:
- `ee310fc` - Build Phase 2 core MVP scaffold
- `548784e` - Fix Vercel build type errors
- `31a96a0` - Type Supabase auth cookie updates
- `9153019` - Type middleware cookie updates
- `a9e6d3c` - Handle duplicate default portfolios
- `40259c4` - Show estimated holding values
- `87db6fa` - Show holdings total on dashboard
- `baab69b` - Clarify unconverted dashboard currency totals
- `7988eab` - Show holding currencies explicitly
- `f3b2e50` - Show setup profile details
- `b0c2ea0` - Allow editing portfolio setup
- `8592f2f` - Add Phase 2 QA checklist
- `7b6bf93` - Format asset type labels

Residual risks / follow-ups:
- FX conversion is not implemented, so mixed-currency totals remain native-currency estimates.
- Transaction reconciliation is still manual-first; CSV/IBKR import remains future scope.
- Auth and RLS should receive another review before any multi-user production rollout.

## 2026-06-01 - FMP Market Data Integration QA Backfill

Scope:
- Provider-agnostic market data service.
- Financial Modeling Prep adapter.
- Latest price refresh.
- Historical price refresh.
- Daily price storage.
- Manual refresh flow.
- API key handling and rate-limit protection.

Fixes made:
- Added market data price refresh foundation.
- Fixed FMP price refresh endpoint handling.
- Added retry handling.
- Handled partial FMP responses safely.
- Fixed FMP historical fallback and payload variants.
- Hardened benchmark refresh error handling.

Validation / QA performed:
- Manual local and Vercel testing of refresh flows.
- Confirmed API key stays server-side through service/action paths.
- Confirmed UI does not call FMP directly.
- Confirmed price refresh works with stored environment variables.

Related commits:
- `a0abe38` - Add market data price refresh foundation
- `5cbba5d` - Fix FMP price refresh endpoint
- `011c0b4` - Add FMP retry handling
- `c017d03` - Handle partial FMP price responses
- `1f79222` - Fix FMP historical price fallback
- `148587b` - Accept FMP historical payload variants
- `980abed` - Harden benchmark refresh error handling

Residual risks / follow-ups:
- FMP plan/API limits require conservative batching and stale-data checks.
- Crypto reference instruments may need provider-specific handling beyond FMP.
- Add explicit provider health/status logs for failed symbols.

## 2026-06-01 - Portfolio Analytics Layer QA Backfill

Scope:
- Total value.
- Cash/invested amount.
- Unrealised and realised gain/loss.
- Portfolio, holding, and cash performance.
- Asset allocation, currency exposure, sector/geography.
- Dashboard UX simplification.

Fixes made:
- Built portfolio dashboard analytics.
- Added portfolio analytics layer.
- Added flow-adjusted product and cash performance.
- Fixed inception return and integrated product performance into holdings table.
- Excluded cash capital from inception return.
- Added one-year performance metric.
- Refined and split dashboard performance charts.
- Simplified dashboard sections to avoid duplicating holdings/cash details.
- Added asset metadata enrichment and ETF metadata classification correction.
- Hardened analytics cash-flow calculations and holding snapshot handling.

Validation / QA performed:
- Manual dashboard testing for cash, holdings, transactions, performance, and allocation.
- QA review of portfolio analytics and FMP metadata extraction.
- Build/test checks were run during implementation passes.

Related commits:
- `f98e2c4` - Add portfolio dashboard analytics
- `f0b2437` - Build portfolio analytics layer
- `de8181c` - Add flow-adjusted product and cash performance
- `c3d2824` - Fix inception return and holdings performance UX
- `938e348` - Exclude cash capital from inception return
- `c787981` - Add one-year performance metric
- `f6cb165` - Add dashboard performance bar chart
- `518b5ef` - Refine dashboard performance chart
- `87e1fdc` - Split performance chart by period
- `4dde036` - Simplify portfolio dashboard detail sections
- `0e6f045` - Add asset metadata enrichment
- `b6d0312` - Classify ETF metadata correctly
- `24f4290` - Harden analytics cash flow calculations
- `3c9498c` - Tighten holding performance snapshots

Residual risks / follow-ups:
- Portfolio volatility still needs TWR/synthetic-return treatment.
- FX-aware performance and cash returns remain future work.
- Add explicit methodology tooltips for each performance metric.

## 2026-06-01 - Benchmark Layer QA Backfill

Scope:
- Benchmark universe.
- Benchmark price refresh.
- Benchmark historical snapshots.
- Portfolio vs benchmark return comparison.
- Cumulative and rolling comparison.
- Drawdown comparison.
- Dashboard benchmark UX.

Fixes made:
- Built benchmark layer.
- Moved benchmark comparison into the performance section.
- Folded benchmark series into long-term performance charts.
- Tightened auth gating while working around dashboard access.
- Folded short-term benchmark spreads into daily/weekly/monthly performance cards.
- Later return QA fixed benchmark alignment, TWR comparison, and chart artifacts.

Validation / QA performed:
- Comprehensive benchmark QA review completed before later return-calculation QA.
- Manual UI review of benchmark placement and chart readability.
- Build/test checks were run during benchmark implementation and later return QA.

Related commits:
- `dd1cc78` - Build benchmark layer
- `f654b28` - Move benchmark comparison into performance
- `b76c660` - Fold benchmark series into performance charts
- `54c23c3` - Tighten auth gating and login route
- `6bb51e8` - Fold short-term benchmark spreads into performance cards
- `f8d01ca` - Show all benchmarks in performance charts

Residual risks / follow-ups:
- Benchmark total-return versus price-return distinction should be made explicit.
- Add benchmark methodology tooltip and data-freshness indicators.
- Consider adjusted-close support if provider plan/data allows it.

## 2026-06-01 - Instrument Universe And Watchlist QA Backfill

Scope:
- Seeded ETF universe.
- Bond/gold/cash ETF universe.
- Benchmark instruments.
- Crypto instruments and crypto ETF handling.
- Watchlist stock universe.
- Instrument metadata.
- Price/history refresh UX.
- Derived instrument market metrics.

Fixes made:
- Built instrument universe layer.
- Fixed SQL seed tags and optional IDs.
- Fixed metadata refresh user foreign-key issue.
- Added instrument market data views.
- Stabilized FMP historical coverage and payload parsing.
- Unified refresh actions and improved refresh UX.
- Made instrument price refresh incremental.
- Added 3Y/5Y returns and later derived instrument market metrics.
- Split latest refresh from history backfill.
- Added history coverage summary and moved details to Settings.
- Improved universe page load performance.
- Refined crypto ETF/reference layout and latest crypto reference price refresh.
- Grouped stock universe by sector.
- Made refresh data skip fresh work.
- Completed instrument universe QA pass.

Validation / QA performed:
- Manual universe/watchlist UI testing.
- Manual refresh testing including backfill coverage and stale/fresh status.
- Comprehensive Instrument Universe and Watchlist QA review completed.
- Build/test checks were run during QA and fixes.

Related commits:
- `ddc1015` - Build instrument universe layer
- `32264c7` - Fix instrument universe SQL seed tags
- `e624d3f` - Fix metadata refresh user foreign key
- `7bda6c0` - Add instrument universe market data views
- `3b481c4` - Fix FMP historical coverage
- `217d46b` - Stabilize universe price refresh
- `0b56957` - Unify data refresh actions
- `86ebce6` - Fix universe seed optional ids
- `5367ef5` - Make instrument price refresh incremental
- `5d48520` - Add three and five year instrument returns
- `229e775` - Refine universe crypto layout and refresh UX
- `1bd323b` - Split latest refresh from history backfill
- `245c6c9` - Add universe history coverage summary
- `aee90c2` - Move history coverage details to settings
- `07a6ec4` - Speed up universe page market view load
- `f9ec86f` - Add derived instrument market metrics
- `390b3a7` - Fix history backfill coverage estimate
- `6c03cb7` - Use metrics for history coverage summary
- `8f23a2a` - Group stock universe by sector
- `d28d02c` - Refresh latest crypto reference prices
- `1c43369` - Add lighter universe latest refresh
- `4a6fe9f` - Make refresh data skip fresh work
- `202c04b` - QA instrument universe layer

Residual risks / follow-ups:
- Provider/API limits still require careful batching and observability.
- Human approval flow for universe additions/removals remains future hardening.
- Add admin review workflow for inactive/reference instruments.
- Add better refresh progress status if refresh jobs become longer-running.

## 2026-06-01 - Taxonomy QA Backfill

Scope:
- Canonical sectors.
- Canonical themes.
- Instrument canonical mappings.
- Taxonomy management under Settings.
- Risk analytics integration with canonical sectors.

Fixes made:
- Added canonical taxonomy management.
- Applied canonical taxonomy to risk reports.
- Normalized risk theme labels.
- Removed theme exposure from risk page to avoid duplication with sector exposure.
- Moved taxonomy page under Settings.

Validation / QA performed:
- Manual review of ETF sector classification, including broad-market ETF handling.
- Risk page review after taxonomy integration.
- Build/test checks were run during taxonomy implementation.

Related commits:
- `e2e76ed` - Add canonical taxonomy management
- `9d95be2` - Apply canonical taxonomy to risk reports
- `b331cb8` - Normalize risk theme labels
- `070add1` - Remove theme exposure from risk page
- `3561285` - Move taxonomy under settings

Residual risks / follow-ups:
- Add manual override audit trail if taxonomy editing becomes more active.
- Add unmapped provider value review workflow.
- Keep provider raw metadata isolated from UI/scoring logic.

## 2026-06-01 - Risk Analytics Implementation Backfill

Scope:
- Risk analytics foundation.
- Covariance risk contribution.
- Universe-backed history for risk correlations/drawdowns.
- Benchmark drawdown history.
- Derived risk report caching.

Fixes made:
- Built risk analytics foundation.
- Added covariance risk contribution.
- Used universe history for covariance and correlations.
- Used full/universe benchmark history for drawdown comparison.
- Added estimated portfolio drawdown.
- Cached derived risk analytics reports.
- Fixed risk report RLS user id cast.
- Removed duplicated theme exposure after taxonomy review.

Validation / QA performed:
- Manual review of risk page layout and metrics.
- Follow-up checks for covariance mode, correlation heatmap, benchmark drawdown, and suspicious benchmark drawdowns.
- Risk Analytics Layer QA later fixed correlation date alignment.

Related commits:
- `e3c658e` - Build risk analytics foundation
- `c9dac52` - Add covariance risk contribution
- `7e395da` - Use universe history for covariance risk
- `41fdc50` - Use universe history for risk correlations
- `c373199` - Use full benchmark history for drawdowns
- `70bf2c3` - Use universe benchmark history for risk drawdowns
- `76dbaa1` - Add estimated portfolio drawdown
- `ac04422` - Backfill benchmark drawdown history
- `9041de0` - Cache derived risk analytics reports
- `2068c07` - Fix risk report RLS user id cast
- `070add1` - Remove theme exposure from risk page

Residual risks / follow-ups:
- See the formal Risk Analytics Layer QA entry below for current residual risks.

## 2026-06-01 - Portfolio And Benchmark Return QA

Scope:
- Portfolio return accuracy.
- Benchmark comparison accuracy.
- Long-term performance chart behavior.
- Manual portfolio edge cases with incomplete transaction history.

Fixes made:
- Guarded portfolio returns against stale tiny manual snapshots.
- Switched portfolio performance to TWR-style chained subperiod returns where snapshot and cash-flow history supports it.
- Preserved manual-capital fallback where transaction history is incomplete.
- Aligned benchmark comparisons to nearest prior benchmark snapshot when exact dates are missing.
- Flattened stale pre-capital portfolio chart baselines to avoid artificial dips and spikes.
- Restored benchmark chart history without reintroducing stale portfolio return artifacts.

Tests added or improved:
- Decimal return formatting guard.
- Portfolio deposits excluded from returns.
- Portfolio withdrawals not treated as losses.
- TWR chaining across multiple subperiods.
- Stale tiny snapshot guard.
- Nearest prior benchmark date alignment.
- Long-term chart baseline guard.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Related commits:
- `4195ad6` - QA portfolio and benchmark returns
- `e8b0405` - Use TWR for portfolio returns
- `87d658c` - Guard TWR against stale manual snapshots
- `9120aa8` - Restore guarded benchmark chart history
- `0cb0356` - Align benchmarks to nearest prior snapshot
- `be10ee0` - Flatten stale portfolio chart baseline

Residual risks / follow-ups:
- Add true money-weighted return / XIRR as a separate personal-investor return.
- Add clearer methodology tooltips for TWR, benchmark price returns, and manual-capital fallback.
- Consider derived portfolio return tables once formulas stabilize.
- Add FX-aware returns once currency conversion is implemented.

## 2026-06-01 - Risk Analytics Layer QA

Scope:
- Volatility calculations.
- Drawdown calculations.
- Concentration risk.
- Correlation analysis.
- Risk contribution.
- Diversification score.
- Data integrity, architecture, UI, and performance review.

Fixes made:
- Fixed holding and asset-class correlations to align return series by date instead of by array position.
- Switched same-folder risk math import in `CorrelationService` to a relative import for test/runtime portability.

Tests added or improved:
- Uneven price-history correlation test.
- Existing coverage confirmed for volatility, drawdown, concentration, diversification, covariance risk contribution, and synthetic portfolio drawdown.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Related commit:
- `8a85616` - Align risk correlations by date

Findings:
- No critical issues remained after the correlation fix.
- Service/repository pattern is preserved.
- No direct Supabase or FMP calls from UI components.
- Risk report caching through `portfolio_risk_reports` is working as a portable derived-report table.

Residual risks / follow-ups:
- Portfolio volatility currently uses stored portfolio snapshots, so deposits/withdrawals can distort volatility until TWR-style volatility or synthetic current-weight volatility is added.
- Multi-currency risk remains native-currency based until FX conversion is added.
- Risk cache invalidation currently relies mainly on taxonomy version/date behavior; later it should consider latest snapshot and price freshness.
- Add methodology tooltips for snapshot volatility, covariance risk contribution, proxy risk contribution, and synthetic drawdown.
- Add explicit tests for cash-only, crypto-heavy, and bond-heavy portfolio reports at the service level.

## 2026-06-01 - Pre-Bond Intelligence Checkpoint

Purpose:
- Capture the current QA state before starting the Bond Intelligence Foundation layer.
- Keep a running checkpoint that future QA reviews should update after each major layer is completed.

Current readiness:
- The existing app foundation is ready to proceed to Bond Intelligence.
- No critical QA blocker is currently recorded for moving into the next layer.
- The strongest foundations already in place are the cloud-portable service/repository structure, provider-agnostic market data flow, instrument universe, canonical taxonomy, benchmark comparisons, and risk analytics cache.

Layer status summary:
- Core MVP is stable enough for continued development after auth, setup, cash, holdings, transaction, dashboard, and Vercel build fixes.
- FMP market data integration is working through server-side provider adapters, with retry and partial-response handling.
- Portfolio analytics is usable after return, cash-flow, inception, and dashboard UX fixes.
- Benchmarking is integrated into dashboard performance, with aligned benchmark dates and chart baseline fixes.
- Instrument universe and watchlist layers are seeded, refreshable, and using derived market metrics for faster UI loading.
- Taxonomy normalization is in place, so raw FMP sector/theme values should not drive intelligence logic directly.
- Risk analytics is functional, including volatility, drawdown, concentration, correlation, diversification, covariance-based risk contribution, and cached derived reports.

Important fixes already completed:
- Fixed Supabase/Auth cookie typing and Vercel build issues.
- Preserved the no-direct-Supabase/FMP-in-UI architecture rule.
- Prevented deposits and cash additions from being incorrectly counted as portfolio returns.
- Moved portfolio return methodology toward TWR-style chained returns where snapshot and cash-flow data supports it.
- Aligned benchmark comparisons to nearest valid benchmark dates.
- Fixed risk correlations to align uneven price histories by date instead of array position.
- Added canonical sector/theme normalization and removed duplicate theme exposure from the risk page.
- Added derived risk reports and derived instrument market metrics for faster loading.

Low-priority improvements carried forward:
- Add FX-aware portfolio values, returns, cash performance, risk, and allocation reporting.
- Add clearer UI methodology tooltips for TWR, benchmark price returns, manual-capital fallback, snapshot volatility, covariance risk contribution, proxy risk contribution, and synthetic drawdown.
- Add true money-weighted return / XIRR as a separate personal-investor return metric.
- Clarify benchmark price-return versus total-return methodology, especially for dividend ETFs and bond ETFs.
- Add adjusted-close support if provider data and plan limits allow it.
- Add provider health/status logs for failed symbols, stale prices, rate limits, refresh duration, and skipped fresh instruments.
- Add a stronger human approval workflow for universe additions, removals, activation changes, and inactive/reference instrument review.
- Add taxonomy manual override audit trail and unmapped provider-value review workflow.
- Improve risk cache invalidation using latest snapshot, latest price, and taxonomy version inputs.
- Add service-level tests for cash-only, crypto-heavy, and bond-heavy risk reports.
- Add CSV / IBKR ingestion after manual-entry flows remain stable.

Next recommended layer:
- Bond Intelligence Foundation.

Future QA process:
- After each completed major layer, append a new dated QA entry to this file.
- Update this checkpoint or add a new checkpoint before moving into the next major phase.
- Carry unresolved low-priority items forward until they are either implemented, superseded, or explicitly deferred.

## 2026-06-01 - Bond Intelligence Foundation Implementation QA

Scope:
- Bond ETF classification.
- Duration exposure.
- Credit exposure.
- Inflation-linked exposure.
- Treasury/corporate split.
- Cash-like bond exposure.
- Bond Intelligence dashboard.
- Risk Analytics bond summary integration.

Implemented:
- Added deterministic bond services:
  - `BondService`
  - `BondAnalyticsService`
  - `BondProfileService`
  - `DurationAnalysisService`
  - `CreditExposureService`
- Added `/bonds` dashboard route.
- Added Bonds navigation item.
- Added bond analytics cards to the Risk Analytics page.
- Added seed normalization migration for bond ETF classifications, including BNDX.
- Added tests for bond classification, duration exposure, credit exposure, inflation-linked exposure, treasury/corporate split, cash-like allocation, no-bond case, and bond-heavy warning case.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- No AI, recommendations, Market Vision, scoring, or telemetry logic was added.
- Bond calculations are deterministic and service-layer based.
- UI components read through server services and do not call Supabase or FMP directly.
- Existing `bond_profiles` remains the source of curated fixed-income classifications.
- FMP metadata remains supplemental and does not overwrite curated bond profile logic in this layer.

Residual risks / follow-ups:
- Apply `supabase/migrations/016_bond_intelligence_foundation.sql` in Supabase before expecting BND/AGG/BNDX and related profiles to show the newest canonical classifications in deployed data.
- Bond math is intentionally simple; duration convexity, yield, spread duration, SEC yield, effective duration, and option-adjusted spread remain future enhancements.
- Multi-currency bond exposure still relies on native value estimates until FX conversion is implemented.
- Add manual bond profile editing/admin review later if the curated classifications need user-level overrides in the UI.
- Add deeper integration into future allocation, scenario, Market Vision, and recommendation layers after those modules exist.

## 2026-06-01 - Bond Intelligence Enrichment QA

Scope:
- Yield placeholders.
- Effective duration placeholders.
- Spread duration placeholders.
- Bond scenario impacts.
- Bond diagnostics.
- Allocation-engine-ready guidance.
- Manual bond profile editing.

Implemented:
- Added enriched bond profile fields:
  - SEC yield
  - distribution yield
  - yield-to-maturity
  - yield as-of date
  - effective duration
  - average maturity
  - spread duration
  - option-adjusted spread
  - expense ratio
  - manual override flag
- Added deterministic scenario impacts:
  - rates +1%
  - rates -1%
  - inflation surprise
  - recession
  - credit spread widening
- Added bond diagnostics and allocation guidance messages.
- Added manual bond profile edit forms on the Bond Intelligence page.
- Extended bond analytics tests to cover scenario generation.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- No AI, recommendations, Market Vision, scoring, or telemetry logic was added.
- Scenario impacts remain deterministic and intentionally simple.
- Effective duration and spread duration are seeded placeholders until richer ETF provider data is added.
- Manual profile updates use server actions and repository/service layers.

Residual risks / follow-ups:
- Apply `supabase/migrations/017_bond_profile_enrichment.sql` after applying migration 016.
- Yield and duration placeholders should eventually be replaced or reviewed against issuer/provider data.
- Scenario math is first-order and does not include convexity, currency hedging, callable bond behavior, changing yield curves, or credit migration.
- Manual profile editing is intentionally simple; a fuller admin workflow can add audit history and review status later.

## 2026-06-01 - Bond Intelligence Layer QA

Scope:
- Bond ETF universe and classification accuracy.
- Duration, credit, treasury/corporate, inflation-linked, cash-like, recession-hedge, and credit-risk exposure calculations.
- Rate, inflation, and recession sensitivity labels.
- Portfolio and Risk Analytics integration.
- Bond profile migrations and data integrity.
- Service architecture, taxonomy consistency, UI/UX, edge cases, and test coverage.

Fixes made:
- Updated the runtime universe seed service so the `Seed universe` action uses the same Bond Intelligence classifications as the migrations and services.
- Corrected aggregate bond seed labels from coarse `aggregate` duration to `intermediate` duration and `mixed investment grade` credit quality.
- Corrected HYG seed labels to `short/intermediate`, `high yield`, and negative recession sensitivity.
- Corrected SGOV/BIL/SHY/IEF/TLT/TIP/LQD classifications to the canonical foundation labels.
- Counted government inflation-linked bonds as treasury/government exposure in treasury split calculations.
- Replaced the misleading bond profile coverage heuristic with a check for populated duration/type/credit fields.
- Prevented manual bond profile edits from attempting to write invalid rows for manually entered bond ETFs that are not in the curated instrument universe.
- Hid bond profile edit forms for non-curated synthetic/manual bond ETF rows and added a clear empty state.

Tests added or improved:
- Full seeded bond ETF universe classification test for SGOV, BIL, SHY, IEF, TLT, BND, AGG, TIP, LQD, HYG, and BNDX.
- Missing bond metadata test to confirm safe deterministic defaults.
- Existing bond analytics tests confirmed duration exposure, treasury/corporate split, credit exposure, inflation-linked exposure, cash-like exposure, no-bond case, and bond-heavy warning case.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- Classification accuracy is good for the Phase 2/early Phase 3 fixed-income foundation.
- Calculations are deterministic and centralized in bond services.
- Bond ETFs are included in portfolio valuation through existing holdings/price flows and in risk analytics through existing risk contribution logic.
- Cash-like bond ETFs are treated as bond ETFs with cash-like duration, not as actual cash balances.
- `bond_profiles` links to `instruments` through the existing primary-key foreign key.
- Manual bond profile overrides are stored in `bond_profiles` and are not overwritten by the enrichment migration.
- FMP metadata is not used directly for bond intelligence classifications.
- The Bond Intelligence page uses services/actions rather than direct Supabase or FMP calls.
- Taxonomy is consistent with `Bonds / Fixed Income` and canonical themes for seeded bond ETFs.

Critical issues:
- None remaining after this QA pass.

Medium-priority issues fixed:
- Runtime seed action could reintroduce older/coarser bond classifications.
- Treasury exposure did not explicitly include government inflation-linked exposure.
- Manual bond profile edit action could attempt an invalid foreign-key write for synthetic manual bond ETF rows.

Low-priority improvements:
- Replace seeded effective-duration and spread-duration placeholders with issuer/provider-reviewed values.
- Add an audit trail for manual bond profile changes.
- Add explicit methodology text/tooltips for duration-based scenario impacts.
- Add richer fixed-income data later if FMP proves insufficient for actual duration/yield/credit breakdown.
- Add issuer/provider timestamp and confidence score per bond profile field.
- Add service-level tests for inactive bond ETF holdings once inactive holdings behavior is explicitly defined.

Production-readiness assessment:
- Ready to proceed to the next layer after applying migrations 016 and 017 in Supabase.
- Suitable for deterministic bond ETF exposure intelligence.
- Not yet suitable for institutional-grade bond risk decomposition, because convexity, yield-curve shocks, callable behavior, currency hedging, and credit migration are intentionally out of scope.

## 2026-06-01 - Bond Intelligence Future Improvement Checkpoint

Purpose:
- Preserve lower-priority Bond Intelligence enhancements for future phases after the current foundation layer.

Future improvements:
- Replace seeded placeholders with issuer/provider-reviewed values for effective duration, spread duration, SEC yield, yield-to-maturity, distribution yield, average maturity, option-adjusted spread, and expense ratio.
- Add bond data freshness indicators so the UI shows when each bond profile was last reviewed or refreshed.
- Add field-level confidence/source labels for bond profile values:
  - seeded
  - manually reviewed
  - provider-sourced
  - stale
  - missing
- Add manual edit audit history for bond profiles, including changed field, previous value, new value, editor, and timestamp.
- Add methodology tooltips for effective duration, rate-shock impact, spread duration, recession hedge role, inflation-linked exposure, and cash-like bond ETF treatment.
- Improve scenario math later with convexity, yield-curve steepening/flattening, real-rate shocks, credit spread shocks by quality, currency hedging, callable bond behavior, and credit migration.
- Add richer provider or issuer data only if FMP plus manual profiles becomes limiting for exact bond ETF duration, yield, credit breakdown, or maturity breakdown.
- Integrate Bond Intelligence into the future allocation engine so allocation logic can distinguish cash-like ETFs, short treasuries, intermediate aggregate bonds, long treasuries, TIPS, corporate credit, and high yield.
- Add bond-specific benchmarking for the bond sleeve against BND, AGG, short Treasury, long Treasury, TIPS, corporate bond, and high-yield proxies.
- Add deeper service-level tests for inactive bond ETF behavior, manually edited profile persistence, bond-only portfolios, cash-like-only sleeves, TIPS-only sleeves, and high-yield-heavy sleeves.

## 2026-06-01 - Market Vision Skeleton Implementation QA

Scope:
- Market Vision dashboard/page.
- Manual draft/edit/publish/archive workflow.
- Market Vision report model.
- Macro indicators foundation.
- Deterministic market theme classification.
- Future AI/FMP/FRED integration placeholders.

Implemented:
- Added `/market-vision` dashboard route and navigation item.
- Added `market_vision_reports`, `macro_indicators`, and `market_theme_events` migration.
- Added manual workflow server actions:
  - create draft report
  - save draft sections
  - publish report
  - archive report
  - view latest/selected report
- Added Market Vision service/repository architecture:
  - `MarketVisionRepository`
  - `SupabaseMarketVisionRepository`
  - `MarketVisionService`
  - `MacroIndicatorService`
  - `MarketThemeService`
- Added future AI compatibility placeholders:
  - `AiMarketVisionProvider`
  - `MARKET_VISION_PROMPT_TEMPLATE`
  - `GenerateMarketVisionReportJob`
- Added tests for report lifecycle, macro indicator display logic, deterministic market theme classification, and empty-state dashboard behavior.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- No AI summarisation, recommendations, scoring, or telemetry logic was added.
- Market Vision remains manual/admin-driven in this phase.
- Supabase access is isolated in the repository layer; the UI uses server services/actions.
- No FMP calls are made from the Market Vision UI.
- Macro indicators are placeholder/manual rows prepared for later FRED/FMP ingestion.
- Market theme classification is deterministic and separate from future AI-generated source text.

Residual risks / follow-ups:
- Apply `supabase/migrations/018_market_vision_skeleton.sql` in Supabase before using the deployed Market Vision page.
- Add actual market theme event creation/editing UI later; current skeleton displays stored events but report editing focuses on report sections.
- Add FRED ingestion for macro indicators in a later phase.
- Add FMP market context ingestion in a later phase.
- Add OpenAI summarisation only after the deterministic report workflow and data sources are QA'd.
- Add richer error/loading UX if report workflows become more complex.

## 2026-06-01 - Market Vision Skeleton Comprehensive QA

Scope:
- Market Vision Skeleton only.
- Report page structure, manual workflow, data models, service/repository architecture, UI/UX, future AI compatibility, and database readiness.
- Explicitly excluded AI summarisation, news feeds, recommendations, scoring, and telemetry.

Architecture assessment:
- Market Vision UI uses server actions and services; Supabase access remains isolated in `SupabaseMarketVisionRepository`.
- No FMP, FRED, or OpenAI calls are made from UI components.
- `MarketVisionService`, `MacroIndicatorService`, and `MarketThemeService` keep deterministic logic centralized.
- Future AI hooks exist as interfaces/placeholders only, without generation behavior.
- Cloud portability is preserved because the repository interface can later be backed by Cloud SQL/PostgreSQL without changing UI components.

Data model assessment:
- `market_vision_reports` supports weekly manual reports with executive, equity, bond, gold, crypto, rates, inflation, currency, geopolitical, risks, opportunities, and portfolio implication sections.
- `macro_indicators` supports rates, inflation, yields, employment, growth, currency, commodities, and liquidity with provider/source tracking for future FRED/FMP ingestion.
- `market_theme_events` supports deterministic classification into short-term noise, medium-term theme, and structural long-term shift with severity, persistence, confidence, and affected exposure fields.
- Theme events cascade on report deletion, preventing orphaned rows.
- Latest report retrieval is indexed by status and report date.

UX assessment:
- The Market Vision page has a clear CIO-style section order and keeps manual draft editing separate from published report reading.
- Empty state, draft/published/archived status indicators, report selector, macro indicator cards, theme table, risks/opportunities, and portfolio implications are present.
- The page remains mobile-friendly through grid-based layouts and compact cards.

Critical issues:
- None found.

Medium-priority issues fixed:
- Missing-table handling now gracefully covers `market_vision_reports`, `macro_indicators`, and `market_theme_events`, so the page degrades safely before migration 018 is applied.
- Report upserts no longer overwrite `classification_summary` with `{}` when saving manual drafts.
- Draft creation now preserves an explicitly supplied classification summary, which protects future generated/imported workflows.

Tests added or improved:
- Added a regression test confirming draft saves preserve an existing classification summary when the save payload does not supply one.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Low-priority improvements:
- Add manual create/edit UI for market theme events once the skeleton moves beyond report-section editing.
- Add report versioning or revision history before AI-generated drafts are introduced.
- Add role-based admin permissions for report publishing if multiple users/accounts are supported.
- Add richer field-level validation for report period dates and publish readiness.
- Add source citation fields for future FRED/FMP/news-derived report sections.
- Add a structured portfolio implication schema per asset class before recommendations are connected.
- Add dedicated loading/error components if report workflows become more interactive.

Future AI compatibility assessment:
- Ready for a later AI generation service because report fields, theme classifications, source type, status, and prompt/provider placeholders are already separated from UI rendering.
- AI output should write drafts only, with human review before publish.
- News and macro retrieval should be implemented as provider services and background jobs, not direct UI calls.

Production-readiness assessment:
- Ready as a manual Market Vision skeleton after migration 018 is applied in Supabase.
- Not yet production-ready as an automated CIO briefing, because data streams, source citations, AI summarisation, versioning, and approval workflow hardening remain future phases.

## 2026-06-01 - News Intelligence Layer Implementation Checkpoint

Scope:
- News ingestion, deduplication, instrument linking, classification foundation, weekly reconciliation foundation, cron routes, admin UI, and light Market Vision integration.
- Explicitly excluded scoring, buy/sell recommendations, telemetry learning, and unrestricted chatbot behavior.

Implemented:
- Added FMP news provider behind a provider-agnostic `NewsProvider` port.
- Added optional OpenAI news classification/reconciliation provider behind `NewsAiProvider`.
- Added strict prompt templates that prohibit buy/sell recommendations.
- Added deterministic fallback classification when AI flags are disabled.
- Added daily ingestion and weekly reconciliation job classes.
- Added protected cron-compatible routes:
  - `/api/jobs/daily-news-ingestion`
  - `/api/jobs/weekly-news-reconciliation`
- Added `/news` admin dashboard for latest news, filters, duplicate indicators, classification status, weekly reconciliations, ingestion logs, manual pending classification, and duplicate override.
- Added Market Vision integration showing the latest weekly news reconciliation and creating a draft from it.

Database migration:
- Added `supabase/migrations/019_news_intelligence.sql`.
- New portable PostgreSQL tables:
  - `news_items`
  - `news_classifications`
  - `news_groups`
  - `weekly_news_reconciliations`
  - `news_ingestion_logs`

Architecture assessment:
- UI components do not call Supabase, FMP, or OpenAI directly.
- FMP and OpenAI keys remain server-side only.
- Repository/service/provider boundaries are preserved.
- Cron route protection uses `CRON_SECRET` and is compatible with Vercel Cron or Google Cloud Scheduler.
- Cost controls are configurable through environment variables and service config.

Tests added:
- News normalization/deduplication hash behavior.
- Instrument linking by symbol.
- Classification JSON validation and score clamping.
- Invalid model output fallback behavior.
- Duplicate and already-classified skip behavior.
- Weekly grouping and reconciliation creation.
- Cron secret validation.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Known limitations:
- FMP is the only live news provider in this phase.
- AI classification and weekly reconciliation are disabled by default.
- Weekly summaries use deterministic fallback until AI flags and `OPENAI_API_KEY` are configured.
- Manual review UI is basic; it supports duplicate override and pending classification but not full article editing.
- FMP endpoint availability can vary by plan, so first live run should be checked through ingestion logs.

Future improvements:
- Add source allowlists/denylists when real FMP source quality is observed.
- Add fuzzy title matching beyond canonical title/date hashing.
- Add richer manual review/edit workflow for classifications and linked instruments.
- Add article quality scoring before AI classification.
- Add news source citations into Market Vision drafts.
- Add BigQuery export path for larger-scale historical news analysis.
- Add telemetry later to compare news classification persistence against eventual portfolio/market outcomes.

## 2026-06-01 - News Intelligence Layer Comprehensive QA

Scope:
- News Intelligence Layer only.
- Reviewed FMP ingestion, deduplication, instrument linking, deterministic classification, weekly reconciliation, cron route protection, UI, Market Vision handoff, database integrity, and architecture boundaries.
- Explicitly excluded scoring, buy/sell recommendations, telemetry learning, and unrestricted chatbot behavior.

Live behavior observed:
- Daily ingestion can complete as `partial_success` when FMP returns duplicates.
- Example healthy run: `80 fetched, 68 saved, 16 duplicates`.
- Latest article cards are based on the displayed latest 60 rows, while ingestion logs report the full job run. This explains why UI duplicate counts can differ from log duplicate counts.
- Weekly reconciliation can be created and shown as a draft.

Architecture assessment:
- UI components do not call Supabase, FMP, or OpenAI directly.
- News data access remains isolated in `NewsRepository` / `SupabaseNewsRepository`.
- FMP is isolated behind `NewsProvider` / `FmpNewsProvider`.
- OpenAI is isolated behind `NewsAiProvider` and remains disabled by default.
- Cron routes are protected by `CRON_SECRET` and can be triggered by Vercel Cron or Google Cloud Scheduler.
- News jobs are reusable application job classes, not Vercel-specific logic.

Data model assessment:
- `news_items` stores normalized provider data, canonical hashes, source IDs, related instruments, duplicate flags, and raw provider metadata.
- `news_classifications` stores structured classification output without recommendation fields.
- `news_groups` and `weekly_news_reconciliations` are sufficient for Market Vision input preparation.
- `news_ingestion_logs` records provider/job metrics and failure messages.
- Follow-up migrations 020 and 021 harden the unique source ID constraint and repair duplicate source keys.

Critical issues fixed:
- `news_items` upsert failed when Supabase received an explicit null/undefined `id`.
- `news_classifications` upsert failed when Supabase received an explicit null/undefined `id`.
- `ON CONFLICT` failed because the database needed a concrete unique constraint on `(source_provider, source_id)`.
- Same-batch duplicate FMP articles caused `ON CONFLICT DO UPDATE command cannot affect row a second time`.
- News server actions caught Next.js redirects and surfaced `NEXT_REDIRECT`.

Medium-priority issues fixed:
- Deterministic fallback classification left many articles with no affected asset class, causing weekly reconciliation to default too many equity/ticker-linked items into macro.
- Weekly reconciliation now routes obvious ticker/index/stock-market articles to equities even if older classifications are sparse.
- Manual duplicate override no longer marks canonical articles as duplicates of themselves.
- Non-ASCII separator artifacts in the News page were replaced with ASCII separators.

Classification quality assessment:
- Deterministic fallback now routes obvious equities, bonds, gold/commodities, crypto, rates, inflation, currency, and geopolitical items more cleanly.
- Obvious stock/index examples such as Nvidia/Intel and S&P 500/SPY should route to equities instead of macro.
- AI classification remains optional and disabled by default, so nuanced classification will still be limited until the AI flag is intentionally enabled.

Cost-control assessment:
- Daily fetch volume is capped by env config.
- Per-instrument article volume is capped by env config.
- Classification skips duplicate articles.
- Classification skips already-classified articles.
- Weekly reconciliation caps article volume through env config.
- Token/cost tracking fields are present for AI-enabled phases.

Testing added or improved:
- Deterministic stock-news classification routes to equities and semiconductor themes.
- Weekly reconciliation does not dump ticker-linked market news into macro.
- Existing tests continue to cover deduplication hash behavior, symbol linking, JSON validation, duplicate skip behavior, classification payload defaults, weekly grouping, and cron secret validation.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Low-priority improvements:
- Add a dedicated reclassify-all-deterministic action for existing fallback classifications if historical cleanup is needed.
- Add manual classification editing for one-off article corrections.
- Add a canonical-article selector for marking a canonical article as duplicate of another article.
- Add clearer UI text explaining that cards show the latest 60 displayed rows, while logs show full job totals.
- Add source quality filters once FMP source quality patterns are known.
- Add fuzzy matching for near-duplicate titles beyond normalized title/date hashing.
- Add source citation extraction for Market Vision drafts.
- Add provider health metrics for FMP endpoint latency, 429s, and empty responses.

Production-readiness assessment:
- Ready as a News Intelligence foundation after migrations 019, 020, and 021 are applied in Supabase and Vercel has redeployed the latest commit.
- Suitable for collecting, normalizing, deduplicating, linking, classifying, and reconciling news for Market Vision input.
- Not yet a final CIO-quality narrative layer until AI classification/reconciliation, source citations, manual review tooling, and quality filters are added.

## 2026-06-02 - News Intelligence + Theme Intelligence Pre-FRED/GDELT QA

Scope:
- Reviewed the current News Intelligence Layer before adding FRED or GDELT.
- Covered ingestion, persistence, deduplication, normalization, instrument linking, deterministic classification, theme hierarchy, theme analytics, review queue, weekly reconciliation, cost controls, database integrity, UI/UX, Market Vision readiness, architecture, and edge cases.
- Explicitly excluded FRED, GDELT, AI Market Vision generation, recommendations, scoring, telemetry, and Portfolio Assistant work.

Summary of findings:
- The layer is structurally ready for the next data-stream phase after the hardening fixes below.
- FMP ingestion, news persistence, deduplication, classification, theme intelligence, and weekly reconciliation all remain provider/service/repository based.
- The existing design is cloud-portable and does not call Supabase, FMP, or OpenAI from UI components.
- FMP remains equity-heavy, so sparse macro/rates/currency/geopolitical output is expected until FRED/GDELT are added.

Critical issues:
- None remaining after this QA pass.

Medium-priority issues fixed:
- Repeated ingestion of the same canonical article could be interpreted as a duplicate because the canonical lookup found the existing row. The ingestion service now treats same-source canonical matches as updates, not duplicates.
- Ingestion logs did not expose enough QA metrics. The log metadata now records `articlesNormalized`, `articlesUpdated`, `inBatchDuplicatesRemoved`, `failedItems`, and `articlesSaved`.
- Theme trends could show `Rising` with only one week of data. Theme Intelligence now reports `Insufficient history` for one-week signals and `Low confidence trend` until four weeks of history exist.
- Emerging themes now require enough history before a theme is promoted as genuinely rising.

Ingestion accuracy assessment:
- FMP fetching is isolated in `FmpNewsProvider`.
- Daily ingestion pulls active universe instruments and includes general market news.
- API keys remain server-side only.
- Job routes are protected by `CRON_SECRET`.
- UI actions call server actions/jobs, not providers directly.
- Partial failures are logged, and malformed per-article processing increments `failedItems` without crashing the full batch.

Deduplication assessment:
- Canonical and content hashes are deterministic.
- Same-batch duplicate source keys are removed before DB upsert, preventing `ON CONFLICT DO UPDATE command cannot affect row a second time`.
- Repeated ingestion updates same-source canonical rows instead of marking them duplicate.
- Existing duplicate rows are preserved rather than deleted.
- Duplicates remain excluded from weekly reconciliation.

Classification assessment:
- Deterministic fallback supports equities, bonds, gold/commodities, crypto, macro, rates, inflation, currency, and geopolitical buckets.
- Asset-class classification remains separate from canonical theme classification.
- Known false positives have guardrails:
  - AI/technology articles are not classified as Credit without credit language.
  - ETF/mutual fund fee articles are not treated as bond/credit news without credit-risk language.
  - Gold/PMI macro headlines are not classified as Industrials solely because of manufacturing PMI wording.
- AI classification remains optional and disabled by default.

Theme Intelligence assessment:
- Theme hierarchy exists for Macro, Sector, and Investment categories.
- Average severity, persistence, and confidence are calculated from classified items.
- Trend output now reflects confidence in the available history instead of overclaiming with sparse data.
- Review queue flags low-confidence/suspicious mappings, though manual review editing remains a future improvement.

Weekly reconciliation assessment:
- Weekly reconciliation uses deterministic reclassification for the active period before summarizing.
- Duplicates are excluded.
- Coverage metadata tracks classified count, included count, excluded-by-limit count, bucket counts, and theme summaries.
- No buy/sell recommendations are generated.
- Draft output is usable by the Market Vision skeleton.

Cost-control assessment:
- Daily article count, weekly article count, and per-instrument article count are env-configurable.
- Duplicate articles and already-classified articles are skipped for classification.
- AI classification/reconciliation flags default to disabled.
- Model names, token usage fields, and cost estimate fields are present for later AI-enabled operation.

Database integrity assessment:
- `news_items` has generated UUIDs and a concrete unique constraint on `(source_provider, source_id)`.
- `news_classifications` has generated UUIDs and a unique index on `(news_item_id, classification_model)`.
- Follow-up migrations harden source ID generation and repair duplicate keys.
- Indexes exist for published date, canonical/content hashes, duplicate flag, ticker JSONB, related instruments JSONB, classification label, severity, primary theme, and secondary themes.
- Schema remains portable PostgreSQL apart from isolated Supabase RLS policies.

Architecture assessment:
- `NewsProvider`, `NewsRepository`, `NewsAiProvider`, application services, and jobs keep concerns separated.
- News UI uses server actions and dashboard services.
- Provider abstraction can accept FRED/GDELT/Finnhub/NewsAPI later.
- Business logic is centralized in services, not duplicated in UI components.

UX assessment:
- News dashboard shows latest news, filters, duplicate state, classification state, theme summaries, review queue, weekly reconciliation, and ingestion logs.
- Current UI is acceptable for an admin/testing dashboard.
- Button density is high for the final product, but acceptable before automation is introduced.
- Remaining minor cosmetic issue: encoded separator artifacts may still appear in a couple of metadata strings and should be cleaned up when the final admin UI is simplified.

Market Vision readiness assessment:
- Weekly reconciliation already separates Asset Views and Theme Views.
- News summaries are stored in a format that Market Vision can consume.
- FMP-only coverage is not enough for full macro/geopolitical CIO briefing quality.
- Ready for FRED integration next, with GDELT or another broad news stream after FRED.

Low-priority improvements:
- Add manual classification editing and approved override storage.
- Add a configurable rules table for theme mapping instead of code-only keyword rules.
- Add source quality scoring and source allow/deny lists.
- Add fuzzy duplicate matching for near-identical titles from different sources.
- Add provider health metrics for latency, 429s, and empty responses.
- Add more filter controls for theme, instrument, duplicate status, and source.
- Simplify the News page buttons once scheduled jobs are configured.
- Add citation/source extraction for Market Vision drafts.
- Expand canonical news themes later with `Momentum`, `Earnings`, `Policy / Trade`, `Valuation`, and `Liquidity`.

Tests added or updated:
- Repeated daily ingestion updates same-source canonical articles without marking them duplicate.
- Same-batch duplicate articles are removed before DB upsert.
- One-week theme signals show `Insufficient history`.
- Sparse multi-week theme signals show `Low confidence trend`.
- Existing News Intelligence tests continue to cover deduplication, linking, classification validation, stale classification correction, weekly reconciliation, theme summaries, and cron secret validation.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test` - 64 tests passed
- `npm.cmd run typecheck`
- `npm.cmd run build`

Production-readiness assessment:
- Ready for the next phase as a News Intelligence foundation.
- Recommended next step: add FRED macro indicators before GDELT, because FRED will improve rates/inflation/growth context with cleaner structured data and lower classification ambiguity.

## 2026-06-02 - FRED Macro Data Stream Layer Implementation Checkpoint

Scope:
- Built the structured FRED macro data stream foundation.
- Explicitly excluded GDELT, AI Market Vision generation, recommendations, scoring, telemetry, and Portfolio Assistant.

Implemented:
- Added FRED macro provider behind a provider-agnostic `MacroDataProvider` port.
- Added macro repository port and Supabase implementation for indicators, observations, trends, regime snapshots, dashboard reads, and ingestion logs.
- Added deterministic `MacroTrendService` for latest value, prior value, 1M/3M/6M/1Y changes, direction, acceleration, persistence, severity, and confidence.
- Added deterministic macro regime snapshot logic for rates, inflation, growth, employment, yield curve, liquidity, dollar, and commodities.
- Added controlled ingestion/backfill service that avoids full-history refetch unless requested or an indicator has no observations yet.
- Added protected cron-compatible route:
  - `/api/jobs/fred-macro-ingestion`
- Added manual server actions for Macro dashboard refresh and backfill.
- Added `/macro` dashboard page with indicator table, trend windows, regime cards, mini history charts, ingestion logs, refresh button, and backfill button.
- Added light read-only macro context cards to Market Vision, Bond Intelligence, and Risk Analytics without changing calculations or generating recommendations.

Database migration:
- Added `supabase/migrations/024_fred_macro_data_stream.sql`.
- Extended `macro_indicators` with `frequency`, `description`, and `is_active`.
- Added portable PostgreSQL tables:
  - `macro_observations`
  - `macro_trends`
  - `macro_regime_snapshots`
  - `macro_ingestion_logs`
- Added indexes for active/source/category indicators, observation dates, indicator/date lookups, regime snapshot dates, and ingestion logs.
- Added unique constraints to prevent duplicate observations and duplicate trend/regime rows.

Seeded FRED indicators:
- Rates: `FEDFUNDS`, `DGS2`, `DGS10`, `DGS30`
- Yield curve: `T10Y2Y`, `T10Y3M`
- Inflation: `CPIAUCSL`, `CPILFESL`, `PCEPI`, `PCEPILFE`
- Employment: `UNRATE`, `PAYEMS`
- Growth: `GDP`, `INDPRO`, `RSAFS`
- Liquidity / financial conditions: `WALCL`, `NFCI`
- Currency / dollar proxy: `DTWEXBGS`
- Commodities / oil: `DCOILWTICO`

Architecture assessment:
- UI components do not call FRED or Supabase directly.
- FRED API key is server-side only through `process.env.FRED_API_KEY`.
- Macro ingestion is isolated in application services and a reusable job class.
- Cron route uses the existing `CRON_SECRET` protection model.
- Schema remains PostgreSQL portable apart from isolated Supabase RLS policies.
- Market Vision, Bonds, Risk, and News compatibility is preserved through read-only macro context.

Testing added:
- FRED value parsing, including missing dot values.
- Trend calculation and insufficient-data behavior.
- Daily-window change calculation.
- Macro regime classification for restrictive rates, inverted yield curve, and weakening employment.
- Ingestion success, repeated refresh updates, and partial provider failure logging.
- Cron secret validation.

Validation run:
- `npm.cmd run test` - 72 tests passed
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Known limitations:
- FRED refresh requires `FRED_API_KEY` in local and Vercel environment variables.
- First run should use Backfill history so trends/regimes have enough observations.
- Regime logic is intentionally deterministic and simple; it is context, not advice.
- Inflation uses index-level changes as a foundation. Future work can add explicit YoY inflation-rate transforms.
- UI is admin-style and may be simplified once scheduled jobs are configured.

Production-readiness assessment:
- Ready as a structured macro data foundation once migration 024 is applied and `FRED_API_KEY` is configured.
- Recommended next step: run migration 024 in Supabase, add `FRED_API_KEY` in Vercel/local env, use Macro backfill once, then QA the Macro dashboard before adding GDELT.

## 2026-06-02 - FRED Macro Data Stream Comprehensive QA

Scope:
- Reviewed the completed FRED Data Stream Layer after successful live backfill and dashboard integration.
- Covered provider behavior, seeded indicator universe, database integrity, ingestion/backfill behavior, trend analysis, macro regime classification, UI, and integration with Market Vision, Bond Intelligence, and Risk Analytics.
- Explicitly excluded GDELT, AI Market Vision generation, recommendations, scoring, telemetry, and Portfolio Assistant work.

Live data verified:
- `macro_indicators`: 26 total rows, including 19 active FRED indicators.
- `macro_observations`: 10,193 rows.
- `macro_trends`: 19 rows.
- `macro_regime_snapshots`: 1 row.
- `macro_ingestion_logs`: 4 rows.
- Latest refresh log: `fred-macro-ingestion`, `success`, 19/19 indicators successful, 0 failed, 95 observations updated.
- Duplicate observation check: 0 duplicate `(indicator_id, observation_date)` rows found.
- Orphan check: 0 orphan observations and 0 orphan trends found.

Provider assessment:
- FRED is isolated behind `MacroDataProvider` and `FredMacroDataProvider`.
- `FRED_API_KEY` is server-side only.
- UI components do not call FRED directly.
- Provider requests use timeout protection, bounded retry, and safe parsing of FRED dot/missing values.
- Failed indicators are logged in `macro_ingestion_logs.metadata.failedItems`.

Indicator universe assessment:
- The expected FRED indicator universe is seeded and active:
  - `FEDFUNDS`, `DGS2`, `DGS10`, `DGS30`
  - `T10Y2Y`, `T10Y3M`
  - `CPIAUCSL`, `CPILFESL`, `PCEPI`, `PCEPILFE`
  - `UNRATE`, `PAYEMS`
  - `GDP`, `INDPRO`, `RSAFS`
  - `WALCL`, `NFCI`
  - `DTWEXBGS`
  - `DCOILWTICO`
- Categories, units, frequency, and active flags are present and usable for trend logic.

Database assessment:
- Primary keys, foreign keys, unique constraints, and indexes are defined in migration 024.
- `macro_observations` prevents duplicate observations through `(indicator_id, observation_date)`.
- `macro_trends` prevents duplicate trend rows through `(indicator_id, as_of_date)`.
- `macro_regime_snapshots` is unique by `snapshot_date`.
- Schema remains portable PostgreSQL apart from isolated Supabase RLS policies.

Ingestion/backfill assessment:
- Initial 5-year backfill succeeded with 19 indicators and 10,193 new observations.
- Subsequent refresh succeeded and updated recent observations instead of refetching full history.
- Duplicate observations are prevented.
- Partial and full provider failures are logged without breaking the entire job.
- Cron route is protected by `CRON_SECRET`.

Trend analysis assessment:
- Trend service calculates latest value, previous value, 1M/3M/6M/1Y changes, direction, acceleration, persistence, severity, and confidence.
- Daily, monthly, and quarterly indicators use stored frequency to choose more appropriate windows where implemented.
- Empty and insufficient data cases are handled safely.

Macro regime assessment:
- Regime classification is deterministic, explainable, and reproducible.
- Medium-priority correctness fix completed during QA:
  - Inflation regime now estimates YoY percent change for CPI index data instead of treating raw CPI index-point movement as an inflation rate.
  - Rate regime now supports richer labels: `rising_rate_pressure`, `falling_rate_support`, `restrictive`, and `neutral`.
- Existing live regime snapshot was generated before this fix; the next FRED refresh will regenerate the snapshot with the hardened classification logic.

Integration assessment:
- Market Vision shows FRED-backed regime cards, macro context bullets, and key macro indicators.
- Bond Intelligence shows rate, inflation, yield-curve, liquidity, and bond-relevant macro indicators without recommendation logic.
- Risk Analytics shows macro risk context and highest-severity macro indicators without changing portfolio calculations.
- No AI generation, scoring, or buy/sell recommendations are introduced.

Critical issues:
- None remaining after this QA pass.

Medium-priority issues fixed:
- Corrected inflation regime logic to use approximate YoY percent change for CPI-style index series.
- Expanded rate-regime logic to distinguish rising pressure and falling support instead of only level-based restrictive/easing labels.
- Added tests for rate direction and CPI YoY percentage handling.

Low-priority improvements:
- Add a lightweight ingestion lock to prevent overlapping manual/cron FRED runs.
- Add explicit UI helper text: run Backfill once, then use Refresh FRED for ongoing updates.
- Add query-level batching optimization for dashboard observation reads if the indicator universe grows materially.
- Add explicit YoY-transformed derived series for CPI/Core CPI/PCE/Core PCE instead of computing the estimate only inside regime logic.
- Add more macro-regime detail for growth and employment, including contracting/deteriorating labels when data supports it.
- Add a scheduled Vercel Cron/Cloud Scheduler configuration once refresh cadence is finalized.

Tests added or updated:
- FRED parser missing-value handling.
- Macro trend windows and insufficient-data handling.
- Macro regime classification for inverted curve and rising rate pressure.
- Macro regime classification using Fed funds direction and CPI YoY percentage.
- Ingestion success/repeated refresh behavior.
- Partial failure and all-indicator-failure logging.
- Macro context service for Market Vision, Bond Intelligence, and Risk Analytics.
- CRON_SECRET validation.

Validation run:
- `npm.cmd run test` - 75 tests passed.
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Production-readiness assessment:
- Ready as a structured FRED macro data foundation.
- Ready to support Market Vision, Bond Intelligence, and Risk Analytics as contextual inputs.
- Not yet a final macro intelligence layer until GDELT/broader news, richer source citations, and human review tooling are added.

Recommendation:
- Ready for GDELT integration.
- GDELT should be next because FRED now covers structured macro data, while FMP news remains equity-heavy and sparse for macro/geopolitical/rates/currency narratives.

## 2026-06-02 - GDELT Global Macro News Layer Implementation Checkpoint

Scope:
- Built the GDELT Integration Layer as a provider-agnostic global macro/world-news stream for News Intelligence and Market Vision.
- Explicitly excluded AI Market Vision generation, recommendations, scoring, telemetry, unrestricted chatbot behavior, and portfolio assistant logic.

What was built:
- Added GDELT query groups for macro/rates, inflation, growth/recession, currency/USD, geopolitical risk, trade/supply chain, energy/commodities, and global credit stress.
- Added GDELT database support:
  - `gdelt_query_groups`
  - `gdelt_ingestion_logs`
  - `gdelt_article_metadata`
- Added GDELT provider abstraction and implementation:
  - `GdeltNewsProvider`
  - `GdeltNormalizationService`
  - `GdeltRepository`
  - `SupabaseGdeltRepository`
- Added global news ingestion service:
  - Pulls active GDELT query groups.
  - Normalizes GDELT DOC 2.0 articles.
  - Filters obvious local/noise articles.
  - Deduplicates against existing canonical news, including cross-provider URL/hash matches.
  - Stores normalized articles in existing `news_items`.
  - Stores provider metadata in `gdelt_article_metadata`.
  - Adds deterministic classifications without buy/sell recommendations.
  - Logs both per-query and overall ingestion results.
- Added protected cron/manual route:
  - `/api/jobs/gdelt-news-ingestion`
  - Uses shared `CRON_SECRET` protection.
- Added News UI controls:
  - Separate `Refresh FMP` and `Refresh GDELT` actions for testing/admin use.
  - Source filter for all/FMP/GDELT.
  - Source column and GDELT macro/world-news panel.
- Added light Market Vision integration:
  - Shows latest GDELT macro/world-news input as source material only.
  - Does not generate Market Vision reports automatically.

Architecture assessment:
- GDELT calls are isolated in the provider layer.
- UI components do not call GDELT, FMP, OpenAI, or Supabase directly.
- GDELT is wired through service/repository/container boundaries and remains cloud-portable.
- No GDELT API key is required.
- Runtime control is environment-based through `ENABLE_GDELT_INGESTION` and bounded article limits.

Classification/data quality notes:
- GDELT query groups provide the primary macro theme anchor.
- Article text can add deterministic secondary themes.
- Added canonical theme `Trade / Supply Chain`.
- Broad GDELT news is intentionally not linked to individual instruments unless future reliable symbol extraction is added.
- GDELT articles can be sparse/noisy depending on query terms; this should be tuned through query groups and source controls rather than recommendations.

Validation performed:
- `npm.cmd run test` passed: 81 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Tests added or updated:
- GDELT compact date normalization.
- GDELT provider metadata preservation.
- GDELT relevance filtering.
- GDELT deterministic theme mapping.
- Trade/supply-chain weekly bucket behavior.
- Trade/supply-chain theme hierarchy behavior.
- End-to-end fake GDELT ingestion storing news, classification, metadata, and logs.

Critical issues:
- None remaining after implementation validation.

Medium-priority issues:
- None remaining after implementation validation.

Low-priority improvements for later:
- Add a dedicated GDELT query-group admin page for enabling/disabling query groups and tuning query strings.
- Add query-group-level ingestion log display in the News admin UI.
- Add manual relevance override for GDELT articles incorrectly filtered or included.
- Add source/domain allowlists or blocklists if noisy domains appear repeatedly.
- Add country/region aggregation once enough GDELT articles are stored.
- Add lightweight entity extraction before any future instrument linking.
- Add citation selection for Market Vision drafts.

Known setup requirements:
- Apply `supabase/migrations/025_gdelt_integration.sql` in Supabase before using GDELT ingestion.
- Set `ENABLE_GDELT_INGESTION=true` in `.env.local` and Vercel environment variables when ready.
- Keep `CRON_SECRET` configured locally and in Vercel for scheduled/manual job routes.

Production-readiness assessment:
- Ready as a foundational GDELT macro/world-news ingestion layer.
- Safe for admin/manual testing after migration 025 and env configuration.
- Ready to support richer Market Vision source inputs, but not yet a full AI Market Vision generator.

## 2026-06-02 - GDELT Query Reliability And Theme Classification Hardening

Scope:
- Hardened the working GDELT layer after live refresh showed partial success: 24 articles saved, 5 failed query groups.
- Focused on GDELT query reliability, diagnostics, and stable provider-neutral theme classification.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

Fixes and improvements:
- Added bounded fallback behavior in `GdeltNewsProvider`:
  - Try the full query group first.
  - If a combined OR query fails or returns no articles, split into up to four simpler fallback terms.
  - Deduplicate fallback results by URL.
  - Use `datedesc` sorting for simpler recent-news retrieval.
- Tuned seeded GDELT query groups to smaller broad macro query sets:
  - Rates.
  - Inflation.
  - Growth/recession.
  - Currency/USD.
  - Geopolitical risk.
  - Trade/supply chain.
  - Energy/commodities.
  - Global credit stress.
- Added migration `027_tune_gdelt_query_groups.sql` to update already-deployed Supabase rows.
- Added a GDELT query-group status table to the News page:
  - Query group.
  - Canonical theme.
  - Latest status.
  - Fetched/saved/duplicate counts.
  - Last error.
- Kept FMP and GDELT classification under the same canonical theme system.
- Kept GDELT articles broad and macro-oriented; they remain unlinked to individual holdings unless future reliable entity/symbol extraction is added.

Validation performed:
- `npm.cmd run test` passed: 85 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Tests added or updated:
- GDELT fallback term extraction.
- GDELT query formatting.
- GDELT query-group status exposure through `NewsDashboardService`.

Critical issues:
- None remaining after this hardening pass.

Medium-priority issues:
- None remaining after this hardening pass.

Low-priority improvements for later:
- Add an admin control to enable/disable individual GDELT query groups.
- Add manual GDELT query editing with validation before save.
- Add domain/source allowlist and blocklist controls.
- Add a dedicated low-confidence review workflow for GDELT relevance, not just classification.
- Add country/region rollups for Market Vision.
- Add richer cross-provider duplicate diagnostics.

Setup requirement:
- Apply `supabase/migrations/027_tune_gdelt_query_groups.sql` after Vercel redeploys.

Production-readiness assessment:
- More stable as a macro/world-news input layer.
- Ready for another live refresh and weekly reconciliation QA.
- Ready to feed Market Vision source panels after query group status is verified in the app.

## 2026-06-02 - News Source Quality Foundation

Scope:
- Added deterministic publisher quality scoring before the next theme-classification pass.
- Focused only on source quality metadata for FMP and GDELT news ingestion.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

What changed:
- Added `SourceQualityService` with deterministic source-name and domain matching.
- Added migration `028_news_source_quality.sql`.
- Added `source_quality_score` and `source_quality_tier` to `news_items`.
- Updated FMP and GDELT ingestion to score every saved article at ingestion time.
- Updated the News page to display the quality tier and score in the source column.
- Added unit coverage for Tier 1, Tier 2, Tier 3, and domain normalization behavior.

Current scoring policy:
- Tier 1: Reuters, Bloomberg, Financial Times, Wall Street Journal.
- Tier 2: CNBC, MarketWatch, Barron's, Seeking Alpha, Yahoo Finance.
- Tier 3: general blogs, known lower-context finance sites, unknown publishers, and missing sources.
- Existing rows default to Tier 3 / 45 until refreshed or backfilled.

Validation performed:
- `npm.cmd run test` passed: 87 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Add an admin-editable source quality mapping table.
- Add source quality override controls.
- Add source quality weighting inside weekly reconciliation.
- Add source quality display in Market Vision source panels.
- Add historical backfill job for old articles if needed.

Setup requirement:
- Apply `supabase/migrations/028_news_source_quality.sql` after Vercel redeploys.

Production-readiness assessment:
- Ready as a deterministic source quality foundation.
- Safe to use for future weekly reconciliation confidence, Market Vision citation selection, and recommendation-confidence inputs.

## 2026-06-02 - GDELT Queue-Based Refresh Pacing

Scope:
- Converted GDELT refresh from full-universe manual refresh to queue-based batch refresh.
- Focused only on GDELT reliability and rate-limit protection.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

What changed:
- Added migration `029_gdelt_query_queue.sql`.
- Added queue state to `gdelt_query_groups`:
  - `last_attempted_at`.
  - `last_success_at`.
  - `next_run_at`.
  - `failure_count`.
  - `last_error`.
- Added repository methods to list due query groups and update schedule/backoff state.
- Updated GDELT ingestion to process only the next due batch, defaulting to one query group per run.
- Successful query groups are scheduled forward using a configurable cooldown.
- Failed query groups are backed off deterministically, with longer cooldowns for rate-limit errors.
- Updated the News page button to `Refresh next GDELT batch`.
- Added queue status columns for next run and failure count.
- Updated the protected GDELT job route so scheduled callers process the queue instead of bypassing pacing.

Validation performed:
- `npm.cmd run test` passed: 88 tests.
- `npm.cmd run typecheck` passed.

Tests added or updated:
- GDELT ingestion stores normalized news and updates queue state.
- GDELT ingestion processes only the next due query group batch.
- GDELT ingestion backs off failed due groups.
- News dashboard exposes query-group status with queue state.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Add a GitHub Actions or Vercel Cron schedule to call `/api/jobs/gdelt-news-ingestion` every 15-30 minutes.
- Add a one-click admin control to pause/resume individual GDELT query groups.
- Add a dedicated queue summary card showing next due group.
- Add provider-level circuit breaker if GDELT returns repeated 429s across many runs.
- Add source/domain allowlists and blocklists for GDELT quality control.

Setup requirement:
- Apply `supabase/migrations/029_gdelt_query_queue.sql` after Vercel redeploys.
- Optional env tuning:
  - `GDELT_MAX_QUERY_GROUPS_PER_RUN`.
  - `GDELT_QUERY_SUCCESS_COOLDOWN_MINUTES`.
  - `GDELT_QUERY_FAILURE_BACKOFF_MINUTES`.
  - `GDELT_QUERY_RATE_LIMIT_BACKOFF_MINUTES`.

Production-readiness assessment:
- Safer for manual testing and ready for scheduled GitHub Actions or Vercel Cron triggering.
- GDELT should no longer attempt all query groups in one refresh.
- Rate-limit behavior is now visible and recoverable through query-group backoff state.

## 2026-06-02 - Overall News Theme Classification Hardening

Scope:
- Improved canonical theme classification for all normalized news sources.
- Applied the same deterministic theme logic to FMP-style article classification and GDELT query-group classification.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

What changed:
- Added `NewsThemeClassificationService` as the shared deterministic theme classifier.
- Added ticker-aware theme mapping for curated stocks, ETFs, bonds, gold, and crypto proxies.
- Added word-boundary matching for short terms such as `AI`, preventing accidental substring matches.
- Added broad-market Growth handling so generic market articles do not default to Technology.
- Kept GDELT query-group themes as provider context while enriching them with the shared classifier.
- Continued filtering brittle false positives:
  - Fund-structure articles should not become Credit without credit-risk language.
  - Gold rush articles should not become gold/commodities.
  - PMI/gold headlines should not become Industrials.
- Source quality tier now contributes lightly to deterministic theme confidence.

Validation performed:
- `npm.cmd run test` passed: 90 tests.
- `npm.cmd run typecheck` passed.

Tests added or updated:
- Broad-market articles classify as Growth rather than Technology.
- Sector-specific ticker articles classify into Financials and Healthcare.
- Existing false-positive regression tests remain passing.
- GDELT theme mapping remains compatible with the shared classifier.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Move ticker/theme mappings into database-managed admin tables.
- Add manual classification override workflow.
- Add a source-quality weighted weekly reconciliation ranking.
- Add cross-provider entity extraction before instrument-level macro linking.
- Add a review queue action to approve or correct theme classifications.

Production-readiness assessment:
- Better as a deterministic, provider-neutral classification foundation.
- Ready for another live reclassification/reconciliation pass in the app.
- Ready to support future Market Vision theme sections with cleaner source data.

## 2026-06-02 - GDELT Relevance And Noise Filtering Hardening

Scope:
- Tightened GDELT article relevance before classification and weekly reconciliation.
- Focused on reducing noisy macro/theme counts from non-English, local, and loose query-match articles.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

Problem observed:
- Live reconciliation showed too many GDELT articles entering macro and theme summaries.
- Examples included non-English/local articles and loosely related corporate AI headlines counted under macro/currency/industrials.

What changed:
- Added readable-English checks for GDELT articles.
- Dropped explicit non-English GDELT articles.
- Added category-specific relevance terms for:
  - Rates.
  - Inflation.
  - Growth.
  - Currency.
  - Geopolitical.
  - Trade / Supply Chain.
  - Energy / Commodities.
  - Global Credit.
- Added financial/macro context requirement.
- Preserved legitimate macro/world news while filtering loose query matches.
- Added regression tests for non-English articles and loose corporate headlines.

Validation performed:
- `npm.cmd run test` passed: 91 tests.
- `npm.cmd run typecheck` passed.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Add a manual review/approve queue for filtered GDELT candidates.
- Add domain/source allowlist and blocklist controls.
- Add per-query minimum relevance score instead of binary filtering.
- Store filtered article diagnostics if deeper tuning is needed.

Production-readiness assessment:
- GDELT macro input quality is meaningfully better.
- Ready for another live GDELT batch refresh followed by reclassification and weekly reconciliation.
- Current filters are intentionally conservative to protect Market Vision inputs from noisy macro summaries.

## 2026-06-02 - Existing GDELT Noise Exclusion In Summaries

Scope:
- Added summary-time eligibility filtering so previously stored noisy GDELT rows no longer pollute Theme Intelligence or Weekly Reconciliation.
- Preserved raw article storage for auditability; no articles are deleted.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

Problem observed:
- After GDELT ingestion filtering was improved, old noisy articles still appeared in weekly summaries because they were already stored and classified.
- Reclassifying alone could not remove those rows from weekly/theme counts.

What changed:
- Added `NewsSummaryEligibilityService`.
- Weekly reconciliation now filters ineligible GDELT rows before bucketing and summarizing.
- Theme Intelligence now filters ineligible GDELT rows before calculating theme counts and review queues.
- Weekly coverage metadata now includes `excludedByEligibility`.
- News page now displays `Excluded by quality`.

Validation performed:
- `npm.cmd run test` passed: 93 tests.
- `npm.cmd run typecheck` passed.

Tests added or updated:
- Weekly reconciliation excludes noisy stored GDELT rows without deleting them.
- Theme Intelligence excludes noisy stored GDELT rows from summaries and review queue.
- Test helper now respects source provider, language, and provider metadata overrides.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Add a visible filtered-article review table for admin inspection.
- Add manual restore/approve controls for filtered rows.
- Store explicit eligibility reason codes for diagnostics.

Production-readiness assessment:
- Existing noisy GDELT rows should no longer dominate Market Vision source summaries after rerunning weekly reconciliation.
- Safer foundation for future Market Vision generation.

## 2026-06-02 - News Summary Bucket And Theme Correction

Scope:
- Added summary-time correction for stale or obviously wrong news buckets and themes.
- Applied to Weekly Reconciliation and Theme Intelligence rollups.
- Preserved raw article rows and raw classification rows for auditability.
- Did not add recommendations, scoring, telemetry, or AI Market Vision generation.

Problem observed:
- Some already-classified articles were technically relevant but landed in weak summary buckets.
- Examples included AI stock articles counted as currency, gold/oil headlines counted as bonds, healthcare stocks counted as financials, and AI infrastructure headlines counted as industrials.

What changed:
- Added `NewsSummaryCorrectionService`.
- Corrects summary buckets before rollup for:
  - AI/technology stock articles -> equities.
  - Gold and precious-metals articles -> gold / commodities.
  - Bond-symbol and credit-risk articles -> bonds only when bond context is credible.
  - Currency/FX articles -> currency only when the headline is not mainly equity-specific.
  - Oil/energy articles -> macro/energy context without forcing them into bonds.
- Corrects theme sets before Theme Intelligence and Weekly Reconciliation:
  - Healthcare tickers and healthcare language map to Healthcare rather than Financials.
  - AI infrastructure/buildout/data-center articles map to AI and Technology rather than Industrials or Consumer.
  - Fund-structure articles without credit-risk language are not treated as Credit.
  - Gold-rush false positives are not treated as Gold or Inflation.

Validation performed:
- `npm.cmd run test` passed: 95 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Tests added or updated:
- Weekly reconciliation corrects stale bucket errors before summaries.
- Theme Intelligence corrects stale theme errors before rollups.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Store correction reason codes in weekly reconciliation metadata for admin diagnostics.
- Add a visible manual override queue for summary bucket/theme corrections.
- Add provider/source-specific confidence weighting once more data streams are stable.

Production-readiness assessment:
- Weekly summaries should now be materially cleaner after rerunning reclassification and weekly reconciliation.
- This remains deterministic summary hygiene, not recommendation logic.

## 2026-06-02 - Geopolitical Mapping And FRED Macro Theme Signals

Scope:
- Fixed geopolitical theme mapping before AI Market Vision.
- Added structured FRED macro-theme signals for Theme Intelligence and Weekly Reconciliation.
- Kept FRED observations separate from `news_items`.
- Did not add AI Market Vision, recommendations, scoring, or telemetry.

Problem observed:
- Iran, Middle East talks, sanctions, export controls, and trade restrictions were not always appearing as Geopolitical.
- Rates, Inflation, Growth, Employment, Yield Curve, Currency, and Energy themes could be absent from Theme Intelligence when there were no matching news articles, even though FRED macro trends existed.

What changed:
- Added migration `030_macro_theme_signals.sql`.
- Added `macro_theme_signals` as a portable PostgreSQL table for FRED-derived structured macro theme inputs.
- Added `Yield Curve` to the canonical news theme taxonomy.
- Added `FredThemeSignalService` and `MacroThemeSignalService`.
- FRED ingestion now generates macro theme signals after trends/regime snapshots are refreshed.
- Theme Intelligence now combines:
  - News-derived themes from FMP/GDELT.
  - Macro data-derived themes from FRED signals.
- Weekly Reconciliation theme metadata now includes FRED macro signals even when news item count is zero.
- UI now shows separate News and FRED signal counts in Theme Intelligence cards.
- Geopolitical keyword handling now covers Iran, Middle East, Israel, sanctions, war/conflict, military/missile, election risk, political instability, peace talks, tariff escalation, export controls, trade restrictions, maritime disruption, and supply-chain disruption.

Validation performed:
- `npm.cmd run test` passed: 100 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Tests added or updated:
- Iran/Middle East/sanctions/election/trade-restriction headlines map to Geopolitical.
- Oil plus geopolitical headline maps to Geopolitical with Energy as a secondary theme.
- FRED trends map to Rates, Inflation, Growth, Employment, Yield Curve, Currency, and Energy macro signals.
- FRED oil pressure can add an Inflation macro signal when the move is material.
- Weekly Reconciliation includes macro signals with zero news items.
- Theme Intelligence separates FRED signal counts from news item counts.

Critical issues:
- None.

Medium-priority issues:
- None.

Low-priority improvements for later:
- Add a dedicated Macro Theme Signals table/view on the Macro dashboard.
- Add manual override/review controls for macro signal severity and regime labels.
- Add explicit correction reason metadata for geopolitical reclassification.
- Add deeper FRED regime aggregation so multiple indicators can merge into one weekly macro theme narrative.

Production-readiness assessment:
- Ready as a pre-AI Market Vision input hardening layer.
- After applying migration 030, run FRED refresh/backfill once to populate macro theme signals, then run weekly reconciliation.

## 2026-06-02 - FRED Signal As-Of Lookup Follow-Up

Scope:
- Fixed FRED macro-theme signal visibility in Theme Intelligence and Weekly Reconciliation.
- Tightened a gold/yields bucket correction.

Problem observed:
- FRED signals showed as zero in the June 1-7 weekly Theme Intelligence view even after macro refresh because many FRED indicators have monthly, quarterly, or prior-trading-day `signal_date` values outside the exact news week.
- A gold headline mentioning Treasury yields appeared in the Bonds bucket.

What changed:
- Added latest-as-of macro signal lookup to `MacroIndicatorRepository`.
- Theme Intelligence now uses latest FRED macro theme signals available as of the weekly period end date.
- Weekly Reconciliation now includes latest FRED macro theme signals as of period end.
- Gold headlines such as “Gold gains...” are corrected into the Gold / Commodities bucket even when yields are mentioned.

Validation performed:
- `npm.cmd run test` passed: 101 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Production-readiness assessment:
- FRED theme cards should now populate after migration 030 is applied and FRED refresh/backfill has generated any macro theme signals.

## 2026-06-02 - News Intelligence Full QA Before AI Market Vision

Scope:
- Reviewed the completed News Intelligence pipeline after FMP news, GDELT macro/world news, source quality scoring, FRED macro signals, Theme Intelligence, and Weekly Reconciliation.
- Explicitly did not build AI Market Vision generation, recommendations, scoring, telemetry, or Portfolio Assistant.

Scores:
- News Intelligence: 88/100.
- Theme Intelligence: 88/100.
- FRED integration: 91/100.
- GDELT integration: 83/100.
- Market Vision readiness: 88/100.

Critical issues:
- None found.

Medium-priority issues fixed:
- Theme taxonomy was missing several requested canonical themes: Real Estate, Utilities, Materials, Value, High Beta, Long Duration, Inflation Hedge, and Recession Hedge.
- Theme ranking relied too much on raw article count. Added an `impactScore` using count, FRED signal count, severity, persistence, confidence, and structural count.
- GDELT theme mapping and AI prompt placeholders were updated to use the expanded controlled taxonomy.
- UI now shows impact score and separates News vs FRED signal counts in weekly theme cards.
- Tightened gold-rush false-positive handling so idiomatic headlines do not create macro/gold signals.

Classification anomaly report:
- Existing test coverage confirms AI/technology articles are no longer corrected into Credit or Currency during deterministic reconciliation.
- Healthcare ticker-linked articles are corrected away from stale Financials mappings.
- Technology hardware articles are corrected away from stale Consumer mappings where appropriate.
- Gold/yields headlines stay in Gold / Commodities rather than Bonds.
- Gold-rush idioms no longer map to gold, inflation, or macro.
- Remaining expected review-queue behavior: low-confidence or unmapped GDELT items remain stored and flagged rather than silently forced into a theme.

Architecture assessment:
- UI uses service/repository actions for News Intelligence and does not call FMP, GDELT, FRED, or OpenAI directly.
- Provider-specific logic remains behind provider and ingestion services.
- FRED macro signals remain separate from `news_items`.
- GDELT queue/backoff logic remains cloud-portable for Vercel Cron or GitHub Actions.
- Source quality scores are stored and used by weekly eligibility filtering.

Data integrity assessment:
- Duplicate articles are preserved but marked with `is_duplicate`/`duplicate_of_id`.
- Classification upserts are covered by tests and no longer send explicit null IDs.
- Repeated ingestion, duplicate batches, failed provider responses, empty GDELT queue runs, and GDELT backoff are covered by tests.
- FRED latest-as-of lookup prevents stale weekly windows from hiding valid macro signals.

Low-priority improvements for later:
- Add a manual classification review workflow for low-confidence/unmapped rows.
- Add a provider/source allowlist or per-query source preference for GDELT to reduce low-quality world-news noise.
- Add cross-provider fuzzy duplicate detection beyond URL/source/title hashes.
- Add a dashboard view for FRED macro theme signal provenance and regime contribution.
- Add historical reconciliation comparison once more than four weekly runs exist.
- Add richer GDELT diagnostics for which query terms caused fallback success vs 429 failures.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 104 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- Ready for AI Market Vision as a structured input foundation, with human review still recommended for low-confidence theme rows.
- Recommendation: proceed to AI Market Vision generation only after the latest weekly reconciliation is regenerated with the current taxonomy and impact scoring.

## 2026-06-02 - AI Market Vision Generation Implementation Checkpoint

Scope:
- Built AI Market Vision generation as a weekly CIO-style briefing layer.
- Used News Intelligence, Weekly Reconciliation, Theme Intelligence metadata, FRED macro regimes/signals, and optional portfolio/risk/bond context when a portfolio is available.
- Explicitly did not build buy/sell recommendations, scoring, telemetry, rebalancing instructions, or Portfolio Assistant behavior.

What changed:
- Added migration `031_ai_market_vision_generation.sql`.
- Extended `market_vision_reports` with generated-report metadata:
  - `growth_view`
  - `employment_view`
  - `confidence_score`
  - `model_used`
  - `prompt_version`
  - `token_usage`
  - `cost_estimate`
  - `source_snapshot`
  - `generation_duration_ms`
- Added `market_vision_generation_logs` for success, failure, and duplicate-skip tracking.
- Added `MARKET_VISION_MODEL`, `MARKET_VISION_INPUT_COST_PER_1M`, and `MARKET_VISION_OUTPUT_COST_PER_1M` environment config.
- Added strict Market Vision prompt template `market-vision-v1`.
- Added `MarketVisionGenerationService`.
- Added `OpenAiMarketVisionProvider`.
- Replaced the old placeholder job with a real `GenerateMarketVisionReportJob`.
- Added cron route `/api/jobs/weekly-market-vision`, protected by `CRON_SECRET`.
- Added manual `Generate AI draft` action on the Market Vision page.
- Updated Market Vision UI to display generated-report metadata and generation logs.

Guardrails:
- AI output must be structured JSON.
- Output validation rejects recommendation language such as buy, sell, trim, add, overweight, underweight, allocation increase/decrease, and rotation instructions.
- Generated reports are saved as drafts by default.
- Duplicate weekly generation is skipped unless forced manually.
- Cost is estimated only when pricing env vars are configured; token usage is stored regardless.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 108 tests.
- `npm.cmd run build` passed.

Tests added:
- AI Market Vision generation creates a generated draft with usage metadata.
- Duplicate weekly generated report is skipped unless forced.
- Missing weekly reconciliation is handled safely.
- Recommendation language is rejected during validation.

Known limitations:
- Cron generation does not attach a user portfolio unless a portfolio ID is supplied by a user-triggered flow; it still generates from weekly news/FRED context.
- Cost estimates require manually configured pricing environment variables.
- No automatic Market Vision publishing is enabled; generated output remains draft for review.

Production-readiness assessment:
- Ready for controlled AI Market Vision draft generation after migration 031 is applied and `OPENAI_API_KEY` plus `MARKET_VISION_MODEL` are configured.
- Recommended operational sequence: refresh news/FRED/GDELT, run weekly reconciliation, then generate AI Market Vision draft.

## 2026-06-02 - AI Market Vision Generation QA Checkpoint

Scope:
- Reviewed the completed AI Market Vision generation layer for report generation, input quality, macro reasoning, bond reasoning, theme integration, geopolitical treatment, portfolio context, cost/performance, UI, architecture, and testing.
- Explicitly did not build recommendations, scoring, telemetry, or Portfolio Assistant behavior.

Scores:
- Market Vision score: 86/100.
- Macro reasoning score: 84/100.
- Bond reasoning score: 82/100.
- Theme integration score: 84/100.
- Geopolitical reasoning score: 80/100.
- Portfolio implication score: 78/100.

Findings:
- Report generation workflow works for manual draft creation, AI draft creation, draft persistence, report selection, latest report retrieval, publishing, archiving, and generation logs.
- Duplicate generated weekly reports are prevented unless manual generation uses `force`.
- Prompt version, model version, token usage, estimated cost, source snapshot, and generation duration are stored.
- Weekly Reconciliation, Theme Intelligence metadata, FRED macro dashboard/regime data, macro theme signals, portfolio analytics, bond analytics, risk analytics, and benchmark comparison context are wired through services.
- UI does not call OpenAI, FMP, FRED, GDELT, or Supabase directly for business logic; calls remain in server actions/services/repositories.
- Generated output remains draft-only, which is appropriate for the current stage.

Critical issues:
- None found.

Medium-priority issues fixed automatically:
- Aligned Market Vision fallback model defaults with the intended `gpt-5.4-mini` model so logs/default behavior match the configured Market Vision layer.
- Added generated-text normalization for smart punctuation and common mojibake sequences before generated reports are persisted.
- Added provider-failure logging test coverage so failed OpenAI requests are recorded in `market_vision_generation_logs`.

Low-priority improvements for later:
- Add a compact dependency/provenance panel showing which input sets were present, missing, or stale for each generated report.
- Add report-level repetition metrics or section-compression hints before final publication.
- Add stricter source-citation/provenance display for top claims in each generated section.
- Add portfolio-theme attribution, e.g. which holdings/sectors/currencies/risk exposures were affected by each Market Vision theme.
- Add optional scheduled portfolio-aware generation once a safe owner/default portfolio selection strategy is designed for cron jobs.
- Add a UI badge for stale weekly reconciliation, stale FRED data, or missing portfolio context before generation.

Repetition report:
- AI/technology, inflation, rates, and growth recur across many sections by design.
- Current repetition is acceptable for a CIO-style draft, but future compression should make each section contribute a more distinct lens:
  - Executive Summary: top regime synthesis.
  - Global Summary: cross-asset facts.
  - Outlook sections: asset-specific implications.
  - Portfolio implications: portfolio-context-only relevance.

Cost assessment:
- Token usage and generation duration are stored.
- Cost estimate is stored only when `MARKET_VISION_INPUT_COST_PER_1M` and `MARKET_VISION_OUTPUT_COST_PER_1M` are configured.
- Expected usage is affordable for one weekly report; cost remains low because generation uses one structured weekly reconciliation plus compact portfolio/macro context rather than raw article dumps.
- Keep generated reports draft-only until costs and output quality are stable.

Production-readiness assessment:
- Ready for controlled Market Vision draft generation with human review.
- Not ready for automated publication or direct recommendation-engine use.
- Recommendation: NOT READY FOR RECOMMENDATION ENGINE.
- Next readiness step: add Market Vision dependency/provenance and portfolio-theme attribution before using this layer as recommendation input.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed: 111 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

## 2026-06-02 - Company Fundamentals Layer QA

Scope:
- Reviewed the completed Company Fundamentals Layer before Recommendation Engine V1.
- Covered stock-only scope, FMP provider integration, database schema, ingestion workflow, normalization, deterministic scoring, freshness, cost controls, UI, service/repository architecture, and test coverage.
- Explicitly did not build recommendations, buy/sell logic, telemetry, scoring recommendations, or Portfolio Assistant behavior.

Fundamentals Layer score:
- 84/100.

Data provider assessment:
- FMP is the only active fundamentals provider and is behind `FundamentalsProvider`.
- FMP API key is read server-side only from environment variables.
- FMP calls are made through provider/service code, not UI components.
- Provider responses are preserved in `provider_metadata`.
- 429/5xx requests retry with bounded attempts; unsupported 402/403/404 responses safely return empty rows and are handled as partial/missing data.

Database integrity assessment:
- Tables are portable PostgreSQL with primary keys, foreign keys, indexes, and unique constraints for profiles, statements, ratios, and scores.
- Duplicate prevention is present for:
  - `company_profiles.instrument_id`
  - `financial_statements.instrument_id + statement_type + period + fiscal_year + fiscal_quarter`
  - `financial_ratios.instrument_id + period + report_date`
  - `fundamental_scores.instrument_id + as_of_date`
- No fundamentals tables are intended to store ETF, bond ETF, gold ETF, crypto, or benchmark rows because repository eligibility is stock-only.

Normalization assessment:
- Profile, income statement, balance sheet, cash flow, and ratio fields are normalized with raw payload preservation.
- Missing provider values remain `null` rather than being treated as zero.
- Derived fallback ratios now fill missing P/E, price/sales, price/book, margins, ROE, ROA, debt/equity, FCF yield, revenue growth, EPS growth, net income growth, and FCF growth when statements provide enough data.
- Repository numeric mapping now guards against non-finite numbers rather than passing `NaN` into services.

Scoring accuracy assessment:
- Scores remain deterministic 0-100 values.
- High valuation reduces valuation score; cheap valuation alone does not guarantee high overall score.
- Growth, profitability, valuation, balance sheet, cash flow, quality, and overall scores are calculated centrally in `FundamentalScoringService`.
- Overall score weights are now centralized in `FUNDAMENTAL_SCORE_WEIGHTS`:
  - growth 20%
  - profitability 20%
  - valuation 20%
  - balance sheet 15%
  - cash flow 15%
  - quality 10%
- Score confidence falls when normalized inputs are missing.
- Sector-aware scoring is explicitly preliminary; the explanation says sector-aware peer medians are reserved for a later phase.

UI/UX assessment:
- Stock instrument detail pages show a Fundamentals tab with profile, ratios, statement snapshot, scores, explanation, warnings, market cap, shares outstanding, and diluted EPS.
- Non-stock instrument detail pages do not show a misleading Fundamentals tab.
- Fundamentals overview page provides stock-only coverage, refresh status, score components, confidence, freshness, and warnings.
- Universe and Watchlist directories now show compact stock-only fundamentals context: Overall, Valuation, Quality, and freshness. ETF/bond/crypto rows do not show fundamentals.

Cost-control assessment:
- Refresh uses `ENABLE_FUNDAMENTALS_REFRESH`.
- Refresh skips recently refreshed stocks unless force is used.
- Refresh respects `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH`.
- Refresh frequency uses `FUNDAMENTALS_REFRESH_FREQUENCY_DAYS`.
- Refresh logs partial failures and failed symbols.
- Manual single-symbol refresh is supported by server action inputs; scheduled route is protected by `CRON_SECRET`.

Critical issues:
- None found.

Medium-priority issues fixed automatically:
- Eligible stock selection now prioritizes current stock holdings, then active stock watchlist instruments, then active stock universe rows. This avoids a broad universe batch crowding out actual holdings.
- Repository numeric mapping now returns `null` for invalid numeric values instead of `NaN`.
- Score weights are centralized for auditability and future Recommendation Engine consumption.
- Universe and Watchlist stock rows now surface compact fundamentals score context without showing fundamentals for non-stocks.

Low-priority improvements for later:
- Add sector-relative scoring using sector and industry medians, especially for banks, financials, utilities, semiconductors, and software.
- Add explicit refresh age by table type: profile, statements, ratios, and scores.
- Add a fundamentals coverage widget to the Portfolio dashboard or Holdings page.
- Add duplicate/no-orphan SQL QA queries to an Admin/System Health page.
- Add database-side advisory lock or job-run guard for overlapping fundamentals refreshes if cron frequency increases.
- Add provider fallback support later if FMP endpoint coverage is incomplete for certain symbols.

Tests added/updated:
- FMP profile normalization preserves nulls and raw provider data.
- Fundamental scoring produces deterministic scores and confidence.
- Missing ratios are derived from financial statements.
- Refresh excludes non-stocks and logs partial success.
- Cron secret validation uses the shared protection helper.

Validation performed:
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 124 tests.
- `npm.cmd run build` passed.
- `npm.cmd run typecheck` passed after build regenerated route types.

Production-readiness assessment:
- READY FOR RECOMMENDATION ENGINE as an input layer with one caveat: Recommendation Engine V1 should treat sector-aware scoring as preliminary until sector-relative peer median scoring is implemented.

## 2026-06-03 - Fundamentals And Trend Layer QA

Scope:
- Reviewed the completed Company Fundamentals and Fundamental Trend layers before Recommendation Engine V1.
- Covered FMP ingestion, stock-only eligibility, annual and quarterly statements, derived ratios, deterministic scores, trend calculations, UI display, refresh controls, architecture boundaries, and future recommendation readiness.
- Explicitly did not build recommendations, buy/sell logic, telemetry, AI scoring, or Portfolio Assistant behavior.

Fundamentals layer score:
- 88/100.

Provider and coverage assessment:
- FMP remains the only active fundamentals provider and is wrapped behind `FundamentalsProvider`.
- Refresh pulls profile, annual statements/ratios, and quarterly statements/ratios for eligible stocks.
- Stock eligibility excludes ETFs, bond ETFs, gold ETFs, crypto, benchmarks, and reference instruments.
- Raw provider payloads continue to be stored in `provider_metadata`.
- Missing FMP ratios can be derived from stored financial statements where accounting inputs are sufficient.

Database integrity assessment:
- `company_profiles`, `financial_statements`, `financial_ratios`, `fundamental_scores`, `fundamental_trends`, `fundamental_trend_summaries`, and `fundamentals_refresh_logs` remain portable PostgreSQL tables.
- Unique constraints prevent duplicate company profiles, statements, ratios, scores, trends, trend summaries, and refresh-log identity issues.
- The trend migrations now support `not_applicable` plus expanded trend labels, and the UI renders short-term annual-only metrics as `N/A`.

Normalization and derived-ratio assessment:
- Missing provider values remain `null`; they are not coerced to zero.
- Annual and quarterly statement data are stored separately and can both feed trend calculations.
- Derived ratio fallbacks cover valuation, margins, profitability, balance-sheet, cash-flow, and growth metrics.
- Medium-priority hardening was added so invalid accounting denominators do not create misleading ratios:
  - negative or zero earnings no longer create derived P/E
  - negative or zero equity no longer creates price/book, ROE, or debt/equity
  - negative or zero current liabilities no longer creates current ratio
  - negative or zero revenue no longer creates margin ratios
  - negative or zero invested capital no longer creates ROIC
  - negative free cash flow yield is still allowed when market cap is valid

Trend accuracy assessment:
- Short-term growth and margin trends use YoY quarterly data when available.
- Long-term trend analysis uses annual data.
- Annual-only balance sheet and profitability metrics intentionally show short-term `N/A`.
- Trend labels are deterministic and include accelerating, improving, rebounding, stable, decelerating, deteriorating, volatile, mixed, insufficient data, and N/A.
- Trend confidence falls when history is sparse or volatile.
- Trend summaries produce category-level and overall trend scores without relying on AI.

UI/UX assessment:
- `/fundamentals` remains a compact stock fundamentals overview.
- `/instruments/[symbol]#fundamentals` shows detailed fundamentals, scores, statement snapshots, and trend metrics.
- Instrument detail trend rows show `Latest shown`, `Prior shown`, and basis labels without crowding the table.
- Non-stock instruments do not show misleading stock-fundamental data.

Architecture assessment:
- No FMP calls were found in UI components.
- No direct Supabase table access was found in `src/app` or `src/components` during the QA scan.
- The service/repository/provider architecture is preserved.
- Fundamentals refresh route remains protected by `CRON_SECRET`.
- API keys remain server-side only.

Critical issues:
- None found.

Medium-priority issues fixed automatically:
- Invalid denominator handling was tightened for derived fundamentals ratios.
- Trend calculations now ignore invalid balance-sheet and profitability denominators instead of producing misleading trend signals.
- Tests now cover invalid denominator behavior for both refresh-time derived ratios and trend calculations.

Low-priority improvements for later:
- Add sector-relative and industry-relative scoring before using fundamentals as a strong recommendation score input.
- Add financial-sector-specific scoring logic for banks, insurers, REITs, and capital-intensive sectors.
- Add a coverage/admin view showing which symbols have profile, annual, quarterly, ratio, score, and trend coverage.
- Add provider fallback support if FMP fundamentals coverage is incomplete for certain symbols.
- Add job overlap protection if fundamentals refresh is scheduled frequently.
- Add explicit per-table freshness badges for profile, statements, ratios, scores, and trends.

Tests added or updated:
- Derived ratios from financial statements.
- Invalid denominator protection for valuation, profitability, leverage, liquidity, and cash-flow yield.
- Quarterly statement fallback for short-term growth trends.
- Annual statement fallback for profitability and liquidity trends.
- Annual-only short-term `N/A` behavior.
- Non-stock exclusion during fundamentals refresh.
- Partial failure refresh logging and CRON secret protection.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed: 131 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY FOR RECOMMENDATION ENGINE V1 as a deterministic input layer.
- Recommendation Engine V1 should treat fundamental scores as one input, not a standalone buy/sell signal.
- Sector-relative scoring and financial-sector-specific scoring should be added before fundamentals become a high-weight recommendation driver.

## 2026-06-03 - Recommendation Engine Macro-Fit Calibration Checkpoint

Scope:
- Reviewed how stored FRED macro regime data feeds the deterministic Recommendation Engine.
- Checked live latest recommendation records for macro-score coverage by instrument type.
- Focused only on diagnostics and future hardening notes; no scoring changes were made.

Live recommendation diagnostics:
- Latest recommendation set contains 83 instruments.
- Standard ETFs: 24 / 24 have a stored `Macro Fit` component.
- Standard ETF `Macro Fit` scores are all exactly `55/100`.
- Bond ETFs: 11 / 11 have macro-related components, but they are named `Rate Regime`, `Inflation Regime`, and `Yield Curve`.
- Crypto instruments: 5 / 5 have `Liquidity Regime` and `Macro Risk Appetite`.
- Stocks do not currently have a direct FRED macro component.
- Gold ETFs do not currently have a visible direct macro component in the recommendation breakdown.

Latest FRED macro regime observed:
- Rates: `falling_rate_support`
- Inflation: `reaccelerating`
- Growth: `expanding`
- Employment: `stable`
- Yield curve: `normal`
- Liquidity: `tightening`
- Dollar: `weakening`
- Commodities: `falling_energy_pressure`

Assessment:
- This is not a display bug. Standard ETF macro fit is stored and shown on instrument detail pages.
- The main Recommendations page intentionally remains compact and does not show component-level breakdowns.
- The current ETF macro-fit rule set is too sparse: it starts at neutral `55/100` and only adjusts for a small number of macro-sensitive cases.
- In the current macro regime, none of the standard ETF-specific adjustment rules fire, so every standard ETF remains neutral.
- Current behavior is safe and deterministic, but too bland to be useful for ETF differentiation.

Low-priority improvements for the next Recommendation Engine hardening pass:
- Expand ETF macro-fit scoring by sector, theme, geography, and macro sensitivity.
- Add broad-market ETF macro scoring that blends growth, rates, liquidity, inflation, and dollar context.
- Add rate-sensitive logic for REITs, Utilities, Growth, Technology, and long-duration equity themes.
- Add dollar-sensitivity logic for international developed markets, emerging markets, and global ex-US ETFs.
- Add energy/commodity regime logic for Energy ETFs and Gold ETFs.
- Add defensive-sector macro logic for Consumer Staples, Healthcare, and Utilities during weak-growth or risk-off regimes.
- Add financial-sector logic using yield-curve regime and credit/liquidity context.
- Add a visible direct macro component for Gold ETFs.
- Consider a low-weight stock macro component only if it can remain stable and not overfit short-term macro noise.
- Rename or explain `55/100` as "Neutral macro context" in UI copy if the score remains common.

Recommended next action:
- Keep current scoring unchanged until a broader recommendation calibration pass.
- Treat this as a calibration backlog item, not a critical defect.

## 2026-06-03 - News Intelligence QA Checkpoint After NewsData.io Integration

Scope:
- Re-reviewed the News Intelligence layer after adding NewsData.io as a separate macro/world-news provider.
- Covered FMP instrument/general news, NewsData macro query groups, GDELT fallback query groups, deduplication, deterministic classification, source quality, weekly reconciliation readiness, UI summaries, cron routes, env config, and Supabase migration readiness.

Architecture assessment:
- PASS: FMP, NewsData, and GDELT remain server-side providers only.
- PASS: UI uses server actions and does not call FMP, NewsData, GDELT, or OpenAI directly.
- PASS: NewsData uses its own provider, normalization service, repository, ingestion service, cron route, and query-group queue state.
- PASS: GDELT remains a separate manual fallback source, not an automatic fallback.
- PASS: NewsData and GDELT query-group diagnostics are shown independently.
- PASS: FMP now has a dedicated fetch summary split into `Instrument news` and `General market news`.

Data model and migration assessment:
- PASS: `news_items` remains the canonical normalized article table.
- PASS: NewsData-specific raw metadata is stored in `newsdata_article_metadata`.
- PASS: NewsData query groups and logs are stored separately from GDELT query groups and logs.
- PASS: NewsData migration remains portable PostgreSQL and uses standard constraints/indexes.
- MEDIUM ISSUE FIXED: NewsData app defaults were changed to `8 x 10 = 80`, but migration 048 still seeded query groups at `8` articles/run. Added migration 049 and updated migration 048 so existing and fresh databases align at 10 articles per group.

Ingestion and classification assessment:
- PASS: FMP fetches active instrument news by symbol and then fills with general market news if capacity remains.
- PASS: NewsData fetches the 8 macro/world-news query groups using the same canonical group list as GDELT.
- PASS: NewsData query-group theme is used as the primary deterministic theme; headline/content signals are secondary context.
- PASS: GDELT remains queue-paced and rate-limit tolerant.
- PASS: Duplicate articles are not deleted; they are marked and linked to canonical articles.
- PASS: Source quality scores are assigned consistently for all news providers.
- PASS: Refresh FMP, Refresh NewsData, and Refresh GDELT each run pending classification backfill after ingestion.

UI/UX assessment:
- PASS: News page controls are clearer: `Refresh FMP`, `Refresh NewsData`, `Refresh GDELT fallback`, `Classify backfill`, and `Weekly reconcile`.
- PASS: NewsData and GDELT both show summary cards for fetched, saved, filtered, duplicates, failed groups, and latest run.
- PASS: FMP now shows provider summary cards and group-level rows for instrument/general news.
- PASS: Latest fetched news and filters support FMP, NewsData, and GDELT source labels.
- LOW: The News page is now functionally complete but dense; later product polish should move some diagnostics into Admin > Jobs or Data Sources.

Critical issues:
- None found.

Medium-priority issues fixed:
- Aligned NewsData DB query-group article cap with app defaults using migration 049.
- Updated service fallback defaults to match the intended NewsData refresh size.
- Corrected FMP group-level saved counts to use repository-returned saved rows.
- Increased dashboard ingestion-log lookback so FMP summaries do not disappear after several NewsData/GDELT refreshes.

Low-priority improvements for later:
- Add a provider-health page that centralizes FMP, NewsData, GDELT, FRED, and OpenAI job summaries.
- Add manual source allow/deny lists once NewsData/GDELT source quality has been observed over several weeks.
- Add per-provider article-quality histograms.
- Add a manual review workflow for low-confidence macro classifications.
- Add query tuning history for NewsData/GDELT query groups.
- Consider cron scheduling: NewsData daily/periodic, GDELT slower fallback, FMP daily instrument news, weekly reconciliation after ingestion.

Validation performed:
- `npm.cmd test -- news-intelligence` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY for controlled use after applying migrations 048 and 049 and setting required env vars.
- Required env vars: `NEWSDATA_API_KEY`, `ENABLE_NEWSDATA_INGESTION=true`, `CRON_SECRET`.
- Recommended env vars: `ENABLE_GDELT_INGESTION=true`, `NEWSDATA_MAX_QUERY_GROUPS=8`, `NEWSDATA_MAX_ARTICLES_PER_QUERY=10`, `NEWSDATA_MAX_ARTICLES_PER_DAY=80`.
- Continue treating News Intelligence as an input layer only. It should support Market Vision and future scoring, but it does not make buy/sell decisions.

## 2026-06-04 - Portfolio Review Engine V1 QA Checkpoint

Scope:
- Reviewed Portfolio Review Engine V1 before Telemetry Learning.
- Covered allocation, concentration, ETF look-through, sector/geography/theme exposure, diversification, risk, macro fit, recommendation alignment, fixed income, portfolio suggestions, candidate ranking, data coverage, UI semantics, tests, and architecture.
- No Telemetry, Portfolio Assistant, trade execution, position sizing, or Recommendation Engine scoring changes were made.

Architecture assessment:
- PASS: Portfolio Review uses service/repository boundaries and server actions.
- PASS: UI does not call Supabase, FMP, FRED, NewsData, GDELT, or OpenAI directly.
- PASS: Portfolio review generation stores deterministic snapshots in `portfolio_review_reports.inputs_snapshot`.
- PASS: ETF look-through stores sector/country/theme/top-holding exposure separately from review reports.
- PASS: Direct + ETF indirect underlying holdings are stored in `portfolio_lookthrough_holdings`.
- PASS: Suggestions remain non-execution review prompts and do not generate trades, position sizes, or rebalance instructions.

Calculation assessment:
- PASS: Allocation review covers equity, bonds, gold, crypto, and cash.
- PASS: Concentration review surfaces largest direct holding, largest indirect holding, combined top exposures, and ETF source contributors.
- PASS: ETF look-through supports sector exposure, country exposure, theme signals, and top holdings exposure.
- PASS: Theme signals are explicitly presented as overlapping signals, not allocations that should add to 100%.
- PASS: Geography review uses ETF country look-through when available and direct geography fallback otherwise.
- PASS: Risk review normalizes percent-style volatility and drawdown inputs before scoring.
- PASS: Fixed income review uses bond analytics outputs for duration, treasury/corporate split, high-yield exposure, recession hedge exposure, and profile coverage.
- PASS: Recommendation alignment checks current holdings against latest deterministic recommendations and surfaces weak held counts.
- PASS: Candidate ranking prioritizes issue fit and diversification benefit over raw recommendation score.

Medium-priority issues fixed during QA:
- Fixed allocation and macro-fit logic so bond ETFs, gold ETFs, crypto, and cash-like labels are not counted as equity ETF exposure.
- Updated Data Coverage so it no longer reaches 100% when a portfolio contains ETFs but ETF top-holding look-through is unavailable.
- Added data limitations for missing ETF sector and country look-through.
- Added tests for non-equity ETF allocation handling and ETF top-holding coverage impact.

Low-priority improvements for later:
- Add a dedicated table or chart showing top 3/top 5 combined concentration percentages explicitly.
- Add a scenario fixture suite for 100% cash, 100% bonds, 100% crypto, 100% gold, and 100% VOO portfolios.
- Add provider-quality badges for ETF look-through rows that distinguish live FMP rows from seeded fallback rows.
- Add stale-age indicators for ETF exposure snapshots inside Portfolio Review.
- Consider giving Geography a non-zero weight once look-through geography has more production history.
- Add deeper macro-fit differentiation by sector once Recommendation Engine macro scoring is further calibrated.

Tests added/updated:
- Allocation and macro reviews do not treat bond/gold ETFs as equity ETFs.
- Portfolio review data coverage falls when ETF top-holding look-through is missing.
- Existing portfolio review tests continue to cover indirect holding exposure, issue-to-candidate mapping, candidate ranking signals, potential actions without trade amounts, and risk drawdown normalization.

Validation performed:
- `npm.cmd test` passed: 169 tests.
- `npm.cmd run typecheck` passed after rerunning sequentially.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY FOR TELEMETRY as a deterministic review layer.
- Portfolio Review V1 is suitable as an input to Telemetry Learning, provided Telemetry remains observational and does not auto-change scoring weights without review.

## 2026-06-05 - Unified Price Refresh Architecture QA Checkpoint

Scope:
- Reviewed the latest price-refresh architecture update after unifying portfolio price refresh with instrument market metrics.
- Covered master instrument price refresh, portfolio price sync, `daily_prices`, `instrument_prices`, `instrument_market_metrics`, holding metrics, portfolio valuation sequencing, risk/return consumers, scheduled workflow order, and regression tests.

Architecture assessment:
- PASS: `/api/jobs/price-refresh` now refreshes the active master instrument universe before syncing portfolio asset prices.
- PASS: Portfolio asset prices now sync from `instrument_market_metrics`, which is the compact derived latest-price layer.
- PASS: The daily workflow now calls one combined price refresh before portfolio valuation, avoiding duplicate scheduled provider calls.
- PASS: Existing portfolio valuation, holding metrics, snapshots, return formulas, metadata enrichment, taxonomy, fundamentals, risk, recommendations, and portfolio review service boundaries were not redesigned.
- PASS: `/api/jobs/instrument-price-refresh` remains available for manual catch-up, but is no longer part of the daily automation.

Calculation assessment:
- PASS: Derived holding metrics continue to use `instrument_market_metrics` directly, so current holding value and holding return metrics are aligned with the master instrument layer.
- PASS: Portfolio valuation still runs after price refresh and continues to create portfolio, holding, and cash snapshots from current portfolio state.
- PASS: Portfolio and holding return formulas were not changed.
- PASS: Risk analytics still receives portfolio daily price history through the existing repository interface.

Medium-priority issue found and fixed:
- Issue: Syncing portfolio prices into `daily_prices` with provider `instrument_market_metrics` could create duplicate same-date rows alongside older `financial_modeling_prep` rows because `daily_prices` is unique on `(asset_id, provider, price_date)`.
- Risk: Duplicate same-date rows could pollute fallback holding price history and risk-return series even if headline valuations mostly stayed correct.
- Fix: Portfolio price sync now writes under canonical provider `financial_modeling_prep`, updating the existing row for that asset/date instead of creating a parallel row.
- Fix: `getLatestPricesForAssets` and `listDailyPricesForAssets` now defensively dedupe same asset/date rows and prefer canonical FMP rows over derived mirror rows if legacy duplicates exist.

Critical issues:
- None found.

Low-priority improvements for later:
- Add a database cleanup script only if legacy `daily_prices.provider = 'instrument_market_metrics'` rows were created in production before this fix.
- Add a trading-day-aware freshness label so valid US-market prices do not look stale solely due to Singapore calendar time.
- Add an admin warning for holdings whose ticker does not map to an active instrument.
- Consider eventually removing the `daily_prices` mirror once holdings are fully instrument-linked and all portfolio consumers can read directly from instrument-derived price history.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 170 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY after deployment of the duplicate-row fix.
- Recommended deployment verification: run Daily Data Refresh manually once, then confirm the `price-refresh` job summary includes both `masterInstrumentRefresh` and `portfolioPriceSync`, Universe/Watchlist freshness updates, and Portfolio valuation refresh creates a current snapshot using the synced prices.

## 2026-06-05 - Admin Data Sources Cleanup Pre-Merge QA Checkpoint

Scope:
- Reviewed branch `codex/admin-data-source-cleanup` before merging to `main`.
- Covered the Admin Data Sources consolidation, removal of provider refresh controls from product-facing pages, News & Themes layout changes, Market Vision workflow relocation, article URL linking, and compatibility with the prior performance-loading branch already merged into `main`.

Architecture assessment:
- PASS: Provider ingestion, refresh, backfill, and generation controls are centralized under `Admin -> Data Sources`.
- PASS: Product-facing pages no longer expose global data refresh buttons or source diagnostics links.
- PASS: `News & Themes` now focuses on article/theme/reconciliation output rather than provider queue diagnostics.
- PASS: `Market Vision` no longer owns draft generation controls or latest weekly reconciliation operations; those are now administered from Data Sources.
- PASS: No direct provider calls were added to UI components; existing server action and service/repository boundaries remain intact.
- PASS: `seedUniverseAction` now supports a `returnTo` path so Admin-originated seed operations return to Admin.

UX assessment:
- PASS: Removed leftover white `Data refresh` buttons from Portfolio, Universe, Watchlist, Setup, Macro, Fundamentals, and Portfolio Review.
- PASS: Removed `Data-source diagnostics` button from News & Themes.
- PASS: Latest fetched news now appears directly below filters on News & Themes.
- PASS: Latest fetched news uses an internal scroll area and keeps article rows compact.
- PASS: Weekly reconciliation and theme intelligence now appear side by side below latest news.
- PASS: News article headlines link to source URLs in a new tab when URLs are available.
- PASS: Market Vision macro/world-news input moved below Portfolio Implications.
- PASS: Market Vision macro/world-news headlines link to source URLs in a new tab when URLs are available.

Critical issues:
- None found.

Medium-priority issues:
- None found.

Low-priority improvements for later:
- Consider splitting `Admin -> Data Sources` into tabs or accordions if the operational console becomes too long.
- Consider adding a compact "data freshness" read-only badge to relevant product pages if users need passive status without refresh controls.
- Consider a visual browser QA pass in Vercel preview before merge because the local in-app browser tool was unavailable in this session.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 171 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY TO MERGE after Vercel preview approval.
- Merge risk is low: the branch is one scoped commit ahead of `main`, and `main` already includes the prior performance-loading branch.

## 2026-06-05 - Telemetry Learning Layer Implementation QA Checkpoint

Scope:
- Built Telemetry Learning Layer V1 on branch `codex/telemetry-learning-layer`.
- Covered immutable recommendation snapshots, outcome evaluation, factor outcome aggregation, Market Vision snapshots, Portfolio Review snapshots, Research navigation, scheduled job route, workflow integration, tests and documentation.

Architecture assessment:
- PASS: Telemetry is observational only and does not alter Recommendation Engine scoring, Portfolio Review logic, return formulas, or Market Vision generation.
- PASS: Snapshot capture is non-blocking; telemetry failures are swallowed so production recommendation/report jobs are not broken by telemetry writes.
- PASS: Service/repository pattern is preserved through `TelemetryRepository`, `SupabaseTelemetryRepository`, `TelemetrySnapshotService`, `TelemetryEvaluationService`, `TelemetryAggregationService`, and `TelemetryDashboardService`.
- PASS: UI reads through the container service and does not call Supabase directly.
- PASS: The protected `/api/jobs/telemetry-evaluation` route uses the shared cron job wrapper and `CRON_SECRET` protection.
- PASS: Weekly GitHub workflow now runs telemetry evaluation after Portfolio Review.

Data model assessment:
- PASS: `telemetry_recommendation_snapshots` stores immutable recommendation context, drivers, component scores, guardrails, benchmark symbol, and price at recommendation.
- PASS: `telemetry_recommendation_outcomes` upserts one row per snapshot/horizon for `1m`, `3m`, `6m`, and `12m`.
- PASS: `telemetry_factor_outcomes` aggregates hit rate, average asset return, average benchmark return, average excess return, and evidence bucket.
- PASS: Market Vision and Portfolio Review snapshot tables are present for future outcome evaluation.
- PASS: Tables use portable PostgreSQL, explicit indexes, RLS read policies, and existing `set_updated_at()` triggers where applicable.

Calculation assessment:
- PASS: Asset return uses `end_price / start_price - 1`.
- PASS: Benchmark return uses the same formula.
- PASS: Excess return is calculated as asset return minus benchmark return.
- PASS: Buy/Strong Buy success requires positive excess return.
- PASS: Reduce/Sell success requires negative excess return.
- PASS: Hold/Watch success rules are conservative diagnostic rules and are documented.
- PASS: Missing asset data is marked `insufficient_data`; missing benchmark data is marked `benchmark_missing`.
- PASS: Factor evidence buckets remain conservative and sample-size aware.

UX assessment:
- PASS: `Research -> Telemetry` page added.
- PASS: Dashboard shows overview metrics, recommendation outcome table, factor evidence cards, Market Vision snapshots, and Portfolio Review snapshots.
- PASS: Empty states explain when data is unavailable because snapshots have not matured yet.
- PASS: Copy clearly states telemetry is read-only evidence and does not auto-tune recommendations.

Critical issues:
- None found.

Medium-priority issues:
- None found.

Low-priority improvements for later:
- Add Market Vision outcome evaluation against proxy instruments.
- Add Portfolio Review outcome evaluation against portfolio snapshots, drawdown changes, and diversification/concentration score changes.
- Add manual calibration report views for recommendation guardrails and factor sensitivity.
- Add human-approved scoring weight suggestion workflow only after enough evidence accumulates.
- Consider a compact Admin Data Sources control to trigger telemetry evaluation manually.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 175 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY for preview deployment after migration `054_telemetry_learning_layer.sql` is applied.
- Safe rollout profile: telemetry writes are non-blocking and the dashboard handles missing tables/data with empty states.

## 2026-06-05 - Telemetry V1.5 Hardening QA Checkpoint

Scope:
- Completed Telemetry V1.5 hardening on branch `codex/telemetry-learning-layer`.
- Covered Market Vision outcome evaluation, Portfolio Review effectiveness evaluation, confidence calibration, coverage metrics, factor leaderboards, dashboard refinement, tests and documentation.

Architecture assessment:
- PASS: Telemetry remains observational and deterministic.
- PASS: No Recommendation Engine scores, weights, guardrails, Portfolio Review logic, Market Vision logic, portfolio data or return formulas were changed.
- PASS: Existing telemetry tables are reused where possible.
- PASS: One small migration adds `risk_score_change` and `effectiveness_classification` to `telemetry_portfolio_review_outcomes`.
- PASS: Evaluation is still driven through the existing `telemetry-evaluation` job and Admin Jobs manual control.

Calculation assessment:
- PASS: Market Vision outcomes calculate proxy return, benchmark return and excess return.
- PASS: Market Vision success rules are deterministic for bullish, bearish, neutral and mixed directions.
- PASS: Market Vision proxy mapping is centralized in `marketVisionProxyMap.ts`.
- PASS: Portfolio Review outcomes compare prior review snapshots with later review snapshots for the same portfolio.
- PASS: Portfolio Review effectiveness is classified as effective, neutral or deteriorated from material score changes.
- PASS: Confidence calibration groups evaluated recommendation outcomes by 0-49, 50-59, 60-69, 70-79, 80-89 and 90+ buckets.
- PASS: Coverage metrics compare evaluated observations against matured snapshot-horizons.
- PASS: Factor best/worst leaderboards require at least early evidence before ranking.

UX assessment:
- PASS: `/telemetry` now shows coverage, recommendation accuracy, confidence calibration, factor intelligence, Market Vision accuracy and Portfolio Review effectiveness.
- PASS: Empty states explain when no matured/evaluated data exists yet.
- PASS: Dashboard copy continues to avoid investment advice or certainty from small samples.

Critical issues:
- None found in implementation review.

Medium-priority issues:
- None found in implementation review.

Low-priority improvements for later:
- Add user-action tracking so Portfolio Review effectiveness can distinguish acted-on suggestions from passive market movement.
- Add richer Market Vision proxy mappings from canonical themes if the theme taxonomy expands.
- Add human-reviewed telemetry-based weight suggestion workflow only after enough evidence accumulates.
- Add per-instrument recommendation calibration drilldowns.

Validation performed:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 178 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY for preview deployment after migrations `054_telemetry_learning_layer.sql` and `055_telemetry_v1_5_hardening.sql` are applied.

## 2026-06-05 - Telemetry UX Hardening Pre-Merge QA Checkpoint

Scope:
- Reviewed branch `codex/telemetry-learning-layer` before merge to `main`.
- Covered full telemetry branch contents plus the final Telemetry UX hardening commit `eaf88ce`.
- Focused on confirming UX-only hardening did not alter telemetry calculations, recommendation logic, Portfolio Review logic, Market Vision logic, scheduled rules, or schema.

Architecture assessment:
- PASS: Telemetry page reads through `TelemetryDashboardService` and `TelemetryRepository`; no direct Supabase calls were added to UI.
- PASS: Latest UX hardening changed only `src/app/(dashboard)/telemetry/page.tsx`.
- PASS: Telemetry remains observational only.
- PASS: Existing service/repository pattern remains intact.
- PASS: Admin Jobs manual telemetry evaluation and weekly workflow telemetry evaluation remain wired through the shared cron job wrapper.

UX assessment:
- PASS: Telemetry first viewport now presents status-oriented cards instead of large empty zeroes.
- PASS: Lifecycle panel explains Capture -> Wait -> Evaluate -> Learn.
- PASS: Readiness panel explains which telemetry pillars are collecting, awaiting evidence, active, or available.
- PASS: Collection progress uses real snapshot counts only; no fabricated countdowns or inferred dates were introduced.
- PASS: Coverage cards now explain awaiting maturity instead of showing technical `0 / 0` states.
- PASS: Empty states were improved for recommendation outcomes, confidence calibration, factor intelligence, Market Vision accuracy and Portfolio Review effectiveness.
- PASS: Copy uses learning-system language: Collecting Evidence, Waiting For Maturity, Awaiting Evidence, Building History and Learning in Progress.

Calculation/data integrity assessment:
- PASS: No telemetry return formulas were changed.
- PASS: No recommendation scoring weights, labels or guardrails were changed.
- PASS: No Market Vision generation logic was changed.
- PASS: No Portfolio Review logic was changed.
- PASS: No database migrations were added by the UX hardening commit.

Critical issues:
- None found.

Medium-priority issues:
- None found.

Low-priority improvements for later:
- The instrument detail page still has a placeholder tab label for future telemetry; this is not merge-blocking but can be updated in a later detail-page pass.
- The telemetry evaluation job success message mentions recommendation outcomes first, while metadata includes Market Vision and Portfolio Review outcomes too; this can be made more descriptive later.
- A visual browser QA pass in Vercel Preview is still recommended because the in-app browser tool was unavailable in this session.

Validation performed:
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed: 178 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY TO MERGE after Vercel Preview visual approval.
- Merge risk is low: latest UX hardening is isolated to the Telemetry page and full validation is green.

## 2026-06-08 - Market Vision Follow-Up Backlog Checkpoint

Scope:
- Logged future Market Vision improvements after Phase A structured metadata was implemented.
- Phase A added regime transition tracking, cross-currents, evidence-based confidence scores, and portfolio macro impact mapping inside existing `market_vision_metadata`.
- This checkpoint is a revisit list, not a new QA pass.

Current state:
- Market Vision generation remains draft-first and requires review before publishing.
- Phase A stores structured metadata in JSONB; no additional migration was required for the Phase A fields.
- Latest test/build validation for Phase A passed before commit `64dd271`.
- The latest generated draft and latest published report were deleted manually at user request, so the next scheduled/manual generation should create a fresh report.

Things to revisit next:
- Generate a fresh Market Vision report after the next weekly reconciliation and review whether Phase A panels are readable and useful in the UI.
- Confirm the weekly scheduled Market Vision job creates the intended report period and status.
- Decide whether scheduled generated reports should remain `draft` for review or auto-publish after stronger QA.
- Review whether the Regime Transition Tracker compares against the right prior generated report when reports are deleted or regenerated.
- Review the Cross-Currents panel for wording quality and whether positive/negative forces feel too mechanical.
- Review the Evidence Confidence Scores for usefulness; tune the deterministic score formula only if repeated reports show scores are too flat or too harsh.
- Review the Portfolio Macro Impact Matrix for portfolio specificity, especially USD, rates, inflation, commodities and geopolitics relevance.
- Add source/citation display in Market Vision sections if the generated narrative still feels insufficiently auditable.
- Improve portfolio-theme attribution: show which sectors, ETFs, holdings, geographies or risks are affected by each Market Vision theme.
- Keep Market Vision as an input layer only; do not let it override recommendation guardrails or create buy/sell actions.

Phase B timing:
- Start Phase B after 2-3 generated reports have been reviewed, or sooner if the next fresh report clearly exposes wording/logic issues.
- Phase B should refine interpretation quality, not add new providers.
- Candidate Phase B work:
  - Improve regime transition interpretation and labels.
  - Make cross-current language more CIO-like and less mechanical.
  - Improve evidence/provenance display.
  - Tighten portfolio-specific implications.
  - Add better stale/missing-input warnings.
  - QA scheduled report generation against expected report periods.

Phase C timing:
- Start Phase C only after Market Vision telemetry has enough matured observations.
- Prefer waiting for at least early 1M outcomes before judging directional usefulness.
- Candidate Phase C work:
  - Evaluate Market Vision accuracy by theme/proxy.
  - Use telemetry to calibrate confidence display, not to auto-change recommendations.
  - Build human-reviewed calibration suggestions.
  - Add Market Vision historical comparison views.

Validation needed when revisiting:
- Generate a fresh weekly report.
- Confirm Phase A panels are populated.
- Confirm no investment recommendation language is generated.
- Confirm Market Vision alignment still behaves as a bounded recommendation input.
- Run `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` after any future code changes.

## 2026-06-08 - Recommendation Language Refinement Checkpoint

Scope:
- Refined consumer-facing recommendation language into ETFVision `Insights`, `Assessments`, and `Characteristics`.
- Added a presentation mapping layer so internal labels can remain stable while UI and assistant responses use safer, non-action labels.
- No scoring weights, guardrails, recommendation engine logic, telemetry calculations, scheduled jobs, or database schema were changed.

Public label mapping:
- Strong Buy -> Very Favorable Characteristics
- Buy -> Favorable Characteristics
- Hold -> Balanced Characteristics
- Watch -> Review Area
- Reduce -> Elevated Concerns
- Sell -> Significant Concerns

Updated surfaces:
- Main research nav and `/recommendations` page display `Insights`.
- Instrument detail pages display an `Insights` tab and assessment labels.
- Instrument insight cards use `Positive characteristics`, `Concern areas`, `Improvement triggers`, and `Deterioration triggers`.
- Portfolio Review displays improvement observations and assessment labels for candidate instruments.
- Telemetry displays insight snapshots/outcomes and assessment labels.
- Portfolio Assistant prompt, drawer copy, and assistant label mapping now use analytical classification language.

Intentionally preserved:
- Internal route/API/domain names containing `recommendation`.
- Transaction `buy`/`sell` wording.
- Prompt guardrails that prohibit buy/sell recommendations.
- Historical tests and service contracts where the term is an internal implementation detail.

Remaining future option:
- A deeper route/API/domain migration from `recommendation` to `insight` can be done later, but it should be handled as a separate schema/API migration.

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 202 tests.
- `npm.cmd run build` passed.

## 2026-06-08 - Recommendation Language Refinement QA

Scope:
- Reviewed the recommendation-language operation after implementation.
- Checked changed UI surfaces, assistant prompt wording, assessment-label mapping, generated driver text, and portfolio review suggestion text.
- Confirmed scoring logic, guardrail thresholds, telemetry math, database schema, and scheduled jobs were not changed.

Findings:
- Critical issues: none.
- Medium-priority issues: none.
- Low-priority issues found and fixed:
  - Portfolio Review data-readiness suggestion still said `Run recommendations before final review`; changed to `Run insights before final review`.
  - Crypto generated concern text still said `Crypto recommendations are intentionally conservative in V1`; changed to `Crypto insight classifications are intentionally conservative in V1`.

Residual terminology assessment:
- Remaining `recommendation` terms are internal service/API/domain contracts, telemetry field names, test fixtures, or explicit no-recommendation guardrails.
- Remaining `Buy`/`Sell` terms are transaction labels, old-question support in assistant tests/prompts, internal scoring labels, or explicit prohibited-language examples.
- No remaining problematic public section titles such as `Portfolio Recommendations`, `All Recommendations`, `Run recommendations`, `Buy / Strong Buy`, or `Reduce/Sell labels` were found in the focused scan.

Validation:
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 202 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY after visual review in the Vercel preview.
- Risk is low: the changes are presentation and prompt-language focused; recommendation scoring and persistence contracts remain intact.

## 2026-06-08 - Instrument Taxonomy / Alpha Universe QA

Scope:
- Added ETFVision-owned `asset_category` and `etf_category` fields for instrument product taxonomy.
- Added the approved Alpha source-of-truth universe: 204 ETFs and 100 stocks.
- Updated Universe and Watchlist directories to group by asset category, ETF product category, and stock sector.
- Confirmed portfolio sector allocation remains separate from ETF product category and should continue to use ETF look-through exposure.

Findings:
- Critical issues: none.
- Medium-priority issues: none.
- Low-priority follow-up:
  - Infrastructure and Clean Energy tickers were filled with standard liquid candidates and can be swapped if a different approved list is preferred.

Validation:
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run test -- --test-name-pattern=taxonomy` passed and ran the full suite: 205 tests.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY for preview after applying migration `062_instrument_product_taxonomy.sql` and pressing the Seed Universe action.
- Portfolio allocation charts should continue to be validated against ETF look-through data after seeding.

## 2026-06-08 - Instrument Taxonomy Follow-Up QA

Scope:
- Added persistent job-run logging for Seed Universe, Refresh Market Data, and Backfill Market History actions.
- Added Market Data operation logs and market-history coverage metrics to Admin/Data Sources.
- Refined Universe and Watchlist hierarchy so Equity Universe contains separate Equity ETF and Stock sections.
- Added a Crypto ETF display bucket so ETF proxies do not appear as generic uncategorized ETFs.
- Preserved the rule that ETF product category is not portfolio sector allocation.

Findings:
- Critical issues: none.
- Medium-priority issues: none.
- Low-priority follow-up:
  - Visual QA should be completed on the Vercel preview after deployment because the in-app browser tool was unavailable in this local session.

Validation:
- `npm.cmd run lint` passed.
- `npm.cmd run test` passed: 206 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

Production-readiness assessment:
- READY for preview.
- After deployment, run Seed Universe and Backfill Market History until Admin/Data Sources shows no remaining 5Y gaps for eligible instruments.

## 2026-06-10 - Exposure Context Consistency QA

Scope:
- Confirmed the Alpha universe remains 201 ETFs and 105 stocks, with raw crypto references inactive.
- Added a shared portfolio exposure context helper so portfolio-level engines can prefer ETF look-through sector/geography exposure.
- Wired look-through-aware exposure context into Risk Analytics, Recommendation portfolio fit, and Market Vision portfolio context.
- Preserved direct metadata fallback when look-through data is unavailable.

Findings:
- Critical issues: none.
- Medium-priority issues: none.
- Low-priority follow-up:
  - Market Vision output QA is deferred until the next weekly refresh/generation.
  - Recommendation portfolio-fit QA is deferred until the next recommendation run after refreshed data.
  - Optional hardening can add UI/admin labels that show whether a page used ETF look-through or direct metadata fallback.

Manual QA:
- Risk page was manually checked after bumping the risk taxonomy version.
- The old cached risk report was invalidated and the rebuilt Risk page used the look-through-aware exposure context.

Validation:
- `npm.cmd test` passed: 224 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.

Production-readiness assessment:
- READY for merge.
- Deferred Market Vision and Recommendation checks are not blockers because the implemented fallback is deterministic and the Risk page was verified directly.

## 2026-06-11 - Page Rendering Performance Audit And Summary Read-Model QA

Scope:
- Reviewed the current `development` branch after the page-rendering optimization passes.
- Updated `docs/PAGE_RENDERING_AUDIT.md` with the implemented phases, reverted/deferred phases, remaining work, and recommendations.
- Confirmed the corrected 10-phase plan after preview timing showed that some summary-table ideas helped and others did not.

Implemented and verified in code scan:
- Render timing instrumentation is present across the main pages through `measureRenderStep`.
- `portfolio_performance_summary` is implemented and read by `/portfolio` for stored performance and benchmark comparison panels.
- `portfolio_dashboard_summary` is implemented and read by `/portfolio`, `/holdings`, and `/cash`.
- `portfolio-summary-refresh` refreshes dashboard and performance summaries together.
- `portfolio-valuation-refresh` refreshes portfolio valuation snapshots and the two portfolio summary rows.
- Admin/Data Sources has manual portfolio summary refresh controls and daily summary job status cards.
- Fundamentals overview uses the `fundamentals_overview_metrics` view.
- Instrument fundamentals detail uses `get_fundamentals_detail_snapshot`.
- Universe and watchlist directories use `listSummaryRowsForInstruments` to avoid loading full fundamentals summary rows.
- Instrument detail avoids the earlier broad all-bond-profile path.
- `alpha` has been realigned to `main` plus release flags, so alpha should receive page-rendering optimizations without manual patch drift.

Important implementation decision:
- The attempted Instrument Directory Summary path was not retained because preview testing showed `/instruments/universe` became slower.
- Portfolio Risk Summary was intentionally not retained because the user asked to revert/not proceed with that summary layer.

Current phase status:
- Done:
  - Portfolio Performance Summary.
  - Portfolio Dashboard Summary.
  - Render timing instrumentation.
  - Fundamentals overview/detail optimization.
  - Watchlist/universe scoped fundamentals row loading.
  - Alpha alignment to main plus feature flags.
- Partially done:
  - Instrument Detail Summary: broad reads were reduced and fundamentals detail was optimized, but no full instrument detail summary table exists.
  - Market Vision Display Summary: stored reports are used; support diagnostics are instrumented, but no extra summary table exists.
- Deferred:
  - Instrument Directory Summary.
  - Portfolio Risk Summary.
  - Bond / Fixed Income Summary.
  - News / Theme Summary.
  - Telemetry Summary.
  - Admin Data Sources Health Summary.
  - Assistant context summary.

Preview timing evidence considered:
- `/portfolio` performance summary loads were around 260-285ms after summary read-model use.
- `/holdings` and `/cash` summary loads were commonly around 260ms with occasional higher cold/variable runs.
- `/fundamentals` improved from around 1.5s+ to roughly 500-700ms in later logs.
- `/instruments/watchlist` commonly improved to around 280-320ms after scoped reads and warm runs.
- `/instruments/universe` remains variable, often around 550-900ms and sometimes higher.
- `/instruments/[symbol]` improved after fundamentals detail RPC, but remains a candidate for a compact per-symbol read method if timings remain above 800-1000ms.

Findings:
- Critical issues: none.
- Medium-priority issues:
  - `/instruments/universe` remains the main user-facing page to watch.
  - `/instruments/[symbol]` may need another pass if real preview logs stay above target.
  - Telemetry can be slow, but it is not alpha/user-core and should not be prioritized ahead of user-facing pages.
- Low-priority issues:
  - Admin/Data Sources is still broad and diagnostic-heavy, but it is internal.
  - Market Vision support sections can be further hidden/deferred if needed.

Recommended next steps:
- Keep the portfolio summary read models and scheduled refresh.
- Do not reintroduce the reverted directory summary table as-is.
- For `/instruments/universe`, prefer server-side pagination, category lazy loading, or a narrow indexed/materialized directory view before another JSON summary table.
- For `/instruments/[symbol]`, consider a single per-symbol RPC/read method for market metrics, risk metrics, fundamentals snapshot, latest insight, and history if logs remain slow.
- Revisit Portfolio Risk Summary only after the user explicitly approves it again.
- Consider Telemetry Summary and Admin Data Sources Health Summary later because they are internal/non-alpha priorities.

Validation:
- This entry is a documentation and branch-audit checkpoint.
- No executable app code was changed in this documentation update.
- The underlying implementation passes were previously validated with `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build`.

Production-readiness assessment:
- READY as a checkpoint.
- Future optimization should remain evidence-led using `[render-timing]` logs and should avoid adding summary tables unless scoped-query improvements are insufficient.

## 2026-06-11 20:11 SGT - Current Architecture Handover Documentation Pack

Scope:
- Created the current authoritative documentation pack for ETFVision architecture, data flow, calculation methodology, scoring methodology, intelligence engines, operations, performance, security, and documentation gaps.
- This was a documentation-only update. No app behavior, migrations, scoring logic, routes, feature flags, UI, or jobs were changed.

Files added:
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATA_INGESTION_AND_PROVIDERS.md`
- `docs/INSTRUMENT_TAXONOMY_AND_COVERAGE.md`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
- `docs/NEWS_THEME_METHODOLOGY.md`
- `docs/MARKET_VISION_METHODOLOGY.md`
- `docs/ASSISTANT_ARCHITECTURE.md`
- `docs/TELEMETRY_ARCHITECTURE.md`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/PERFORMANCE_ARCHITECTURE.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/README.md`
- `docs/DOCUMENTATION_GAPS.md`

Primary code references checked:
- `src/server/container.ts`
- `src/server/jobs/runCronJob.ts`
- `src/server/jobs/cronAuth.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/portfolioReview/portfolioReviewScoring.ts`
- `supabase/migrations`
- `docs/scheduled-jobs.md`

Findings:
- PASS: Current service boundaries and scheduled job patterns are documented.
- PASS: Deterministic recommendation labels, confidence behavior, and guardrails are documented from code.
- PASS: Portfolio Review section weights are documented from code.
- PASS: Current performance architecture documents the implemented summary/derived metric tables and the reverted instrument directory summary attempt.
- PASS: The documentation pack explicitly separates ETF product category from look-through sector allocation.
- PASS: Open documentation gaps are captured rather than guessed.

Deferred follow-up:
- Full RLS audit.
- Exact formula tables for all fundamentals, risk score buckets, and type-specific recommendation component weights.
- Live Supabase validation of active instrument counts and current cron schedule state.
- Alpha branch feature-gate audit directly on the `alpha` branch.

Validation:
- Documentation files were created and indexed.
- No runtime tests were run because this change does not alter executable code.

## 2026-06-11 20:26 SGT - Formula-Level Score Methodology Documentation

Scope:
- Added a dedicated score methodology handover document covering formula-level scoring logic for fundamentals, fundamental trends, instrument risk, portfolio risk/diversification, recommendations, portfolio review sections, and FRED macro theme signals.
- Cross-linked the new document from the documentation index, calculation methodology, recommendation methodology, and portfolio review methodology.
- Narrowed documentation gaps where formula-level score documentation is now available.

Files updated:
- `docs/SCORE_METHODOLOGY.md`
- `docs/README.md`
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`

Primary code references checked:
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `src/application/services/fundamentals/FundamentalTrendCalculationService.ts`
- `src/application/services/InstrumentRiskService.ts`
- `src/application/services/risk/riskMath.ts`
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/StockRecommendationService.ts`
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `src/application/services/recommendations/BondEtfRecommendationService.ts`
- `src/application/services/recommendations/GoldRecommendationService.ts`
- `src/application/services/recommendations/CryptoRecommendationService.ts`
- `src/application/services/recommendations/portfolioFitService.ts`
- `src/application/services/portfolioReview/*ReviewService.ts`
- `src/application/services/macro/MacroTrendService.ts`
- `src/application/services/macro/FredThemeSignalService.ts`

Findings:
- PASS: Fundamentals overall score weights and subscore helper formulas are now documented.
- PASS: Fundamental trend short-term/long-term windows, direction mapping, score mapping and confidence are now documented.
- PASS: Instrument risk score formula and buckets are now documented.
- PASS: Recommendation score, confidence, guardrails and type-specific component weights are now documented.
- PASS: Portfolio Review section-level formulas are now documented.
- PASS: Macro/FRED severity, persistence and confidence score formulas are now documented.

Validation:
- Documentation-only update.
- No runtime tests were run because no executable code changed.

## 2026-06-12 22:55 SGT - Instrument Taxonomy Commercialization Audit Completion

Scope:
- Completed the Instrument Taxonomy Audit from the commercialization audit plan.
- Verified source-of-truth universe counts from `src/domain/universe/alphaUniverse.ts`.
- Verified live Supabase aggregate active counts and taxonomy null checks.
- Corrected stale documentation that described BTC, ETH and SOL raw crypto references as active.

Files updated:
- `docs/INSTRUMENT_TAXONOMY_AUDIT.md`
- `docs/INSTRUMENT_TAXONOMY_AND_COVERAGE.md`
- `docs/instrument-taxonomy-alpha-universe.md`
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/README.md`
- `docs/qa-log.md`

Static audit evidence:
- PASS: 201 ETF symbols in the source map.
- PASS: 201 unique ETF symbols.
- PASS: 105 stock symbols in the source map.
- PASS: 105 unique stock symbols.
- PASS: 0 duplicate ETF symbols.
- PASS: 0 duplicate stock symbols.
- PASS: 0 ETF/stock overlaps.
- PASS: 0 empty ETF categories.
- PASS: 0 empty stock sectors.

Live Supabase evidence:
- PASS: 324 total instrument rows.
- PASS: 306 active instruments.
- PASS: 18 inactive instruments.
- PASS: 196 active `etf` rows.
- PASS: 5 active `crypto_etf` rows.
- PASS: 105 active `stock` rows.
- PASS: 0 active duplicate symbols.
- PASS: 0 active ETFs missing `etf_category`.
- PASS: 0 active stocks missing `sector`.
- PASS: 0 active stocks missing `canonical_sector`.
- PASS: 0 active instruments missing `asset_category`.
- PASS: BTC, ETH and SOL raw crypto references are inactive.

Finding:
- `coverage_status` and `is_user_selectable` are not physical `instruments` columns. This is accepted for the current taxonomy audit because active/product eligibility is currently represented by `is_active`, feature visibility and freshness diagnostics. Whether to add explicit fields is deferred to the Data Provider Audit, Data Freshness UX Audit and Feature Flags/Product Modes Audit.

Validation:
- Static source audit via Node script.
- Live aggregate Supabase audit via service-role query, returning counts only.
- No runtime app tests were run because this was a documentation/audit completion pass.

## 2026-06-12 23:15 SGT - Data Normalization Commercialization Audit Completion

Scope:
- Completed the Data Normalization Audit from the commercialization audit plan.
- Verified raw provider metadata preservation.
- Verified normalized taxonomy field coverage across active instruments.
- Reviewed normalization services and provider metadata refresh flow.
- Reviewed ETF product taxonomy versus portfolio look-through exposure separation.

Files updated:
- `docs/DATA_NORMALIZATION_AUDIT.md`
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/README.md`
- `docs/qa-log.md`

Primary code references checked:
- `src/application/services/taxonomy/TaxonomyService.ts`
- `src/application/services/MetadataRefreshService.ts`
- `src/application/services/AssetMetadataService.ts`
- `src/application/services/UniverseManagementService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolio/PortfolioExposureContextService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/portfolioFitService.ts`
- `supabase/migrations/015_canonical_taxonomy.sql`
- `supabase/migrations/062_instrument_product_taxonomy.sql`

Live Supabase evidence:
- PASS: 306 active instruments checked.
- PASS: 306 active instruments have non-empty `provider_metadata`.
- PASS: 306 active instruments use `provider_primary = financial_modeling_prep`.
- PASS: 0 active instruments missing `asset_category`.
- PASS: 0 active ETF-style products missing `etf_category`.
- PASS: 0 active instruments missing `canonical_sector`.
- PASS: 0 active instruments missing `canonical_themes`.
- PASS: 0 active instruments missing `taxonomy_review_status`.
- PASS: 0 active manual override rows currently, with override-preservation code path confirmed.

Taxonomy review queue evidence:
- `mapped`: 211 active instruments.
- `needs_review`: 95 active instruments.
- `needs_review` split: 71 `etf`, 5 `crypto_etf`, 19 `stock`.
- Finding: the queue is noisy, not a normalized-field coverage failure. Generic provider values like `ETF`, `Multi-sector ETF`, `Bond ETF`, `Sector ETF`, `Digital Assets`, `Consumer Cyclical`, `Financial Services`, and `Basic Materials` are being flagged despite safe canonical normalization.

Finding:
- PASS: Raw provider metadata is preserved and separated from ETFVision normalized taxonomy.
- PASS: ETFVision-owned `asset_category` and `etf_category` are populated for active instruments.
- PASS: `canonical_sector` and `canonical_themes` are populated for active instruments.
- PASS: Portfolio exposure services prefer ETF look-through sector exposure over ETF product taxonomy.
- PASS WITH RECALC NEEDED: Code-level alias cleanup was added so generic provider labels and current ETF category slugs no longer create noisy taxonomy review items when normalized outputs are safe.
- WATCH ITEM: After deployment, run Seed Universe or Instrument Metadata Refresh to recalculate stored `taxonomy_review_status` values in Supabase.

Validation:
- Static source inspection.
- Live aggregate Supabase audit via service-role query, returning counts only.
- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed: 225 tests, 225 passed.
- Added taxonomy regression test for generic provider labels and alpha ETF category slugs.

## 2026-06-12 22:35 SGT - Commercialization Audit Plan Documentation

Scope:
- Added a current commercialization audit plan for ETFVision.
- Preserved the original 20 audit areas from the provided commercialization prompt.
- Added recommended missing audit areas for branch/deployment governance, migration safety, alpha UX, data freshness UX, cost control, error/empty states, data portability, incident response, accessibility, browser/device compatibility, support operations, and model/prompt governance.
- Added a current commercialization audit status matrix at the end of the document.

Files updated:
- `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
- `docs/README.md`
- `docs/qa-log.md`

Findings:
- PASS: Instrument Taxonomy Audit is marked mostly completed, with final live count checks still recommended after future universe additions.
- PASS: Security/RLS, legal/compliance, data licensing, privacy, alpha feature-gate, and provider coverage are explicitly called out as remaining commercialization blockers.
- PASS: The document now separates readiness for public alpha from readiness for first paying users and later scale.

Validation:
- Documentation-only update.
- No runtime tests were run because no executable code changed.

## 2026-06-12 22:20 SGT - Future ETF Universe Completion Candidate

Scope:
- Logged a future ETF taxonomy completion item for factor and option-income ETFs that are not yet part of the active 201 ETF seed list.
- No universe seeding change was made in this checkpoint.

Future ETF categories to add:
- Factor Investing: `QUAL`, `SPHQ`, `JQUA`, `MTUM`, `USMV`, `SPLV`
- Option Income: `JEPI`, `JEPQ`, `SPYI`

FMP coverage check:
- PASS: All 9 symbols returned profile metadata.
- PASS: All 9 symbols returned latest EOD price and recent historical price data through the historical EOD endpoints.
- PASS: All 9 symbols returned ETF sector and country exposure.
- LIMITATION: ETF top holdings returned `402` for all 9 symbols under the current FMP plan, so indirect top-holding overlap would remain unavailable unless another provider or plan is added.
- NOTE: Batch quote returned `402`, but ETFVision's EOD fallback path is sufficient for current price/history refresh architecture.

Recommended future implementation:
- Add a new `FACTOR_INVESTING` ETF product category or map the factor ETFs into existing factor-style categories if the taxonomy is intentionally kept smaller.
- Add a new `OPTION_INCOME` ETF product category for covered-call / premium-income ETFs.
- Seed the 9 candidates only after confirming whether alpha branch should expose the expanded categories.
- After seeding, run Seed Universe, instrument metadata refresh, market history backfill, ETF look-through refresh, daily returns, return anchors, market metrics, risk metrics, and summary refresh QA.

Validation:
- Documentation-only update.
- No runtime tests were run because no executable code changed.

## 2026-06-11 20:34 SGT - Methodology Documentation Gap Closure

Scope:
- Closed the first four methodology documentation gaps requested after the handover pack review.
- Added an additional fixed-income page methodology section after confirming the current `/bonds` page logic was only partially covered by prior design docs.

Files updated:
- `docs/CALCULATION_METHODOLOGY.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATA_INGESTION_AND_PROVIDERS.md`
- `docs/SCORE_METHODOLOGY.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`

Primary code references checked:
- `src/application/services/PerformanceService.ts`
- `src/application/services/AnalyticsService.ts`
- `src/application/services/risk/riskMath.ts`
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/application/services/risk/RiskAnalyticsService.ts`
- `src/application/services/risk/VolatilityService.ts`
- `src/application/services/risk/DrawdownService.ts`
- `src/application/services/risk/CorrelationService.ts`
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/infrastructure/providers/fundamentals/FmpFundamentalsProvider.ts`
- `src/application/services/fundamentals/FundamentalsRefreshService.ts`
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `src/application/services/fundamentals/FundamentalTrendCalculationService.ts`
- `src/application/services/bonds/BondAnalyticsService.ts`
- `src/application/services/bonds/BondProfileService.ts`
- `src/application/services/bonds/DurationAnalysisService.ts`
- `src/application/services/bonds/CreditExposureService.ts`
- `supabase/migrations/008_instrument_universe.sql`
- `supabase/migrations/017_bond_profile_enrichment.sql`
- `supabase/migrations/051_etf_lookthrough_exposure.sql`
- `supabase/migrations/052_portfolio_lookthrough_holdings.sql`

Findings:
- PASS: Portfolio TWR and cash-flow treatment now documents deposits, withdrawals, manual capital-base override, holding-level flow adjustments, cash metrics, and risk snapshot TWR.
- PASS: ETF look-through now has exact table names, key columns, unique keys, and portfolio allocation semantics.
- PASS: FMP fundamentals lineage now maps endpoints and fields into internal profiles, statements, ratios, derived fallback ratios, scores, and trends.
- PASS: Risk analytics page methodology now documents data assembly, flow-adjusted volatility/drawdown, correlation, covariance/proxy risk contribution, warnings, and benchmark context.
- PASS: Fixed income page methodology now documents bond profile storage, seeded fallbacks, allocation metrics, exposure formulas, shock/scenario approximations, warnings, diagnostics, allocation guidance, and Portfolio Review linkage.

Validation:
- Documentation-only update.
- No runtime tests were run because no executable code changed.

## 2026-06-11 20:50 SGT - Page-Level Documentation Gap Tracker Update

Scope:
- Expanded the documentation gap tracker with the remaining page-level handover gaps across Portfolio Dashboard, Universe, Watchlist, Market Vision, News & Themes, Macro, Fundamentals, Risk, Fixed Income, Insights, and Portfolio Review.
- Cleaned a duplicate Market Vision publish/draft lifecycle entry.

Files updated:
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`

Findings:
- PASS: Core formula and schema methodology gaps remain marked as closed.
- PASS: Remaining gaps are now clearly framed as page data map, UI section mapping, refresh dependency, and operational handover items.
- PASS: A future `docs/PAGE_DATA_MAP.md` is now explicitly listed as the canonical follow-up artifact.

Validation:
- Documentation-only update.
- No runtime tests were run because no executable code changed.

## 2026-06-14 00:00 SGT - Market Vision Portfolio Context Regression Fix

Scope:
- Fixed scheduled Market Vision generation so cron-created weekly drafts resolve the first active default portfolio before calling the Market Vision generation service.
- Replaced the old missing-context fallback that showed all portfolio macro rows as Low relevance with explicit `Not assessed` metadata.
- Added deterministic portfolio macro impact scoring from actual portfolio exposure inputs.
- Reworked confidence rows to use a mechanical support/direct/conflict/gap/stale formula.
- Reworked regime transition comparison to use canonical labels and distinguish minor wording/classification changes from true regime shifts.

Root cause:
- Manual Market Vision generation passed `portfolioId`.
- Scheduled weekly generation did not pass `portfolioId`, so the report was generated as a global report.
- The old fallback then made missing portfolio context look like valid Low relevance.

Files updated:
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
- `docs/MARKET_VISION_REGRESSION_FIX.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd test -- market-vision`

Follow-up:
- Check the next scheduled weekly Market Vision draft in the webapp and confirm `portfolioContextStatus = available`.
- Continue Market Vision Phase B/C refinement later; this checkpoint only addresses the regression and deterministic metadata hardening.

## 2026-06-14 22:30 SGT - Market Vision Final Calibration Cleanup

Scope:
- Implemented the final cleanup after comparing the 2026-06-07 and 2026-06-14 Market Vision reports.
- Tightened canonical regime mapping and transition labels.
- Added an Overall Market confidence cap for mixed regimes with competing supportive/adverse forces.
- Capped user-facing composite portfolio impact scores while preserving raw diagnostics and driver breakdowns.
- Added tactical theme status handling so contradicted/inactive tactical themes are hidden from the report but retained in telemetry diagnostics.
- Added USD-strength tactical theme normalization and suppression of contradicted weakening-USD themes.
- Sanitized advice-adjacent Market Vision language such as `tradeable attention`.

Files updated:
- `src/application/services/marketVision/MarketVisionGenerationService.ts`
- `src/domain/marketVision/types.ts`
- `tests/market-vision.test.ts`
- `docs/MARKET_VISION_METHODOLOGY.md`
- `docs/MARKET_VISION_FINAL_CLEANUP.md`
- `docs/qa-log.md`

Expected behavior:
- Inflation `reaccelerating` to `high and sticky / reaccelerating` is no longer treated as a full regime shift.
- Yield curve `mixed / normal with conflicting slope signals` to `mixed` is no longer treated as a full regime shift.
- USD `weakening` to `strengthening` remains a true regime shift.
- Overall Market mixed-but-constructive confidence should not show High/95.
- Geopolitics and other composite portfolio impact rows should not display over-100 percentages.
- `TACTICAL_WEAKENING_USD` should not show in user-facing tactical themes when USD is strengthening.

Validation:
- PASS: `npm.cmd test -- market-vision`
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run build`

## 2026-06-14 23:45 SGT - Recommendation Insufficient Data Follow-Up

Scope:
- Investigated why the latest 2026-06-14 Insights / Recommendation run showed 8 instruments as `Insufficient Data`.
- Confirmed this was not a summary-card counting issue. The 8 labels came directly from the latest recommendation output.
- Added missing deterministic bond ETF classifications for the active bond universe.
- Added FMP fundamentals provider-symbol normalization for `BRK.B` to use `BRK-B`.

Root cause:
- `BNDW`, `GOVT`, `IEI`, `JNK`, `STIP`, `VCIT`, and `VGIT` had market and risk metrics but no bond profile classifications, leaving fixed-income recommendation components unavailable and confidence below 50.
- `BRK.B` had price and risk data, but FMP fundamentals calls used `BRK.B` instead of FMP's `BRK-B` provider symbol, so profile, statement, ratio and scoring inputs were incomplete.

Files updated:
- `src/application/services/UniverseManagementService.ts`
- `src/application/services/bonds/BondProfileService.ts`
- `src/infrastructure/providers/fundamentals/FmpFundamentalsProvider.ts`
- `tests/bond-analytics.test.ts`
- `tests/fundamentals.test.ts`
- `docs/qa-log.md`

Operational follow-up:
- Deploy the patch.
- Run Seed Universe or the bond profile repair path so the new seeded bond profiles are stored in Supabase.
- Run Fundamentals Refresh for stocks so `BRK.B` is refreshed through `BRK-B`.
- Rerun Recommendation / Insights and confirm `Insufficient Data` falls from 8 unless a new missing-input case appears.

## 2026-06-15 00:20 SGT - Insights Label Commercialization Cleanup

Scope:
- Updated user-facing Insights labels to neutral characteristics-score language.
- Removed trade-like wording from generated instrument insight summaries.
- Updated assistant prompt requirements and assistant context labels to use the same neutral vocabulary.
- Updated portfolio review wording from recommendation alignment to insight alignment where surfaced to users.

User-facing label mapping:
- `Strong Buy` -> `Excellent`
- `Buy` -> `Good`
- `Hold` -> `Neutral`
- `Watch` -> `Weak`
- `Reduce` -> `Poor`
- `Sell` -> `Significant Concerns`
- `Insufficient Data` -> `Insufficient Data`
- `Not Applicable` -> `Not Applicable`

Notes:
- Internal recommendation labels remain unchanged for telemetry, historical records, guardrails and scoring compatibility.
- This is a product-language hardening pass, not legal advice or a change to scoring methodology.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run build`

## 2026-06-17 - Task 12 Active Universe Count Verification

Scope:
- Confirmed active instrument counts against expected alpha universe targets.
- Confirmed raw crypto references remain inactive.

Verification queries run in Supabase SQL Editor:

```sql
SELECT instrument_type, COUNT(*) AS active_count
FROM instruments
WHERE is_active = true
GROUP BY instrument_type
ORDER BY instrument_type;

SELECT COUNT(*) AS total_active_etfs
FROM instruments
WHERE is_active = true
  AND instrument_type IN ('etf', 'crypto_etf');

SELECT symbol, instrument_type, is_active
FROM instruments
WHERE instrument_type = 'crypto'
ORDER BY symbol;
```

Results:

| instrument_type | active_count |
|---|---|
| crypto_etf | 5 |
| etf | 196 |
| stock | 105 |

- Total active ETFs (etf + crypto_etf): 201
- BTC, ETH, SOL: instrument_type = crypto, is_active = false

Findings:
- PASS: 196 active `etf` rows + 5 active `crypto_etf` rows = 201 ETFs.
- PASS: 105 active `stock` rows.
- PASS: Total active ETFs = 201.
- PASS: BTC, ETH, SOL raw crypto references are inactive.
- No instrument universe changes detected since prior verification on 2026-06-12.

---

## 2026-06-15 20:15 SGT - Compliance Disclaimer And Public Methodology Updates

Scope:
- Added first-login compliance disclaimer acknowledgement modal and persistent footer disclaimer.
- Added user acknowledgement persistence through localStorage key `etfvision_disclaimer_v1` and PATCH `/api/user/disclaimer-acknowledged`.
- Added export/report disclaimer helper and wired disclaimer text into CSV/PDF export/report surfaces where implemented.
- Reframed Portfolio Review gap language away from improvement/action terminology and toward deterministic gap analysis.
- Added instrument-card disclaimer chips and why-this-appeared tooltip context for Portfolio Review gap findings.
- Added public `/methodology` and `/legal/disclosures` routes plus Methodology links in navigation/footer.
- Expanded `/methodology` from high-level definitions to formula-level scoring methodology, then hid dense formula tables behind closed-by-default accordions for non-technical readability.

Files and areas updated:
- `src/components/compliance/DisclaimerModal.tsx`
- `src/components/compliance/DisclaimerFooter.tsx`
- `src/lib/compliance/disclaimers.ts`
- `src/lib/compliance/exportDisclaimer.ts`
- `src/app/api/user/disclaimer-acknowledged/route.ts`
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `src/app/legal/disclosures/page.tsx`
- `src/components/compliance/MethodologyRelatedLinks.tsx`
- `src/components/layout/app-shell.tsx`
- Portfolio Review page/service language and gap-analysis rendering paths.

Expected behavior:
- First-login users see the compliance acknowledgement modal until they tick the acknowledgement checkbox and click Continue.
- Acknowledgement stores an ISO timestamp in `localStorage` and sends it to `/api/user/disclaimer-acknowledged`.
- A sticky footer disclaimer is visible across routes and links to the read-only full disclaimer modal.
- Portfolio Review gap analysis is presented as deterministic underweighted-category screening, not action or trade guidance.
- `/methodology` is public, explains the Characteristics Score, Portfolio Score, confidence, guardrails, risk, gap analysis, Market Vision inputs, and limitations.
- Public methodology tables show user-facing assessment labels only; internal labels remain internal to scoring, guardrails, telemetry, and history.
- Dense formula tables remain available for transparency but are collapsed behind formula-detail accordions by default.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run build`
- PASS: Manual source review confirmed internal labels are not exposed in the public methodology assessment table.
- NOTE: Browser/Supabase acknowledgement metadata verification should still be repeated in the deployed environment because it depends on authenticated session state and live Supabase user metadata.

---

## 2026-06-25 � Instrument Detail Price Chart QA

Scope:
- Added a display-only interactive SVG price chart to the instrument detail Overview.
- Added streamed server loading of stored adjusted close history via `getInstrumentPriceSeries`.
- Added client-side period slicing for 1M / 3M / 6M / 1Y / 5Y / 20Y, selected-period up/down coloring, hover crosshair tooltip, and adaptive x-axis labels.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (353 tests)
- PASS: `npm.cmd run build`
- PASS: Repository unit coverage confirms the price-series getter filters positive close prices, paginates, downsamples older history, and preserves the latest point.
- NOTE: Browser smoke verification was attempted. The local dev server stayed at `Starting...`, but the production server served on port 3001 after a successful build; `/instruments/MSFT` redirected to `/login`, so recheck a deep-history name and a recent IPO in an authenticated browser session.

Expected behavior:
- The Overview chart renders from already-stored price history and is streamed through Suspense, so the page shell is not blocked by the chart query.
- Period toggles reslice the in-memory series without network refetch.
- Hover tooltip shows only factual date, price, and period-to-date percentage context.
- This is display-only and does not feed scoring, guardrails, recommendation labels, or methodology.

---

## 2026-06-25 - Instrument Detail Characteristics Score Trend QA

Scope:
- Added a display-only Characteristics score-trend panel to the instrument detail Overview.
- Added `getScoreHistory(instrumentId)` over `recommendation_history`, deduped to one row per `run_date` with the latest run for that date winning.
- Streamed the panel through Suspense so score-history loading does not block the instrument detail shell.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests)
- PASS: `npm.cmd run build`
- PASS: Unit coverage confirms score-history rows dedupe by run date, select the latest created row for duplicate dates, and return in ascending run-date order.
- NOTE: Browser recheck in an authenticated session is still pending; unauthenticated local instrument detail requests redirect to `/login`.

Expected behavior:
- Overview shows a compact Characteristics score trend next to the Characteristics breakdown on large screens and stacked on mobile.
- Empty history shows "No insight history yet"; a one-point history shows the current score and explains that the trend builds over successive insight runs.
- Multi-point history shows a neutral SVG sparkline, markers, previous-run delta, and factual hover tooltip with run date and score.
- The series is currently short, roughly a few insight runs, and fills in as future recommendation runs accumulate.
- This is display-only and does not feed scoring, guardrails, recommendation labels, methodology, or data-pipeline logic.

---

## 2026-06-25 - Instrument Detail UI Polish QA

Scope:
- Added a sticky instrument identity header above the tab nav.
- Refined the Overview panel layout, moving identity out of the panel and grouping asset context, returns, 52-week position, long-horizon diagnostics, score trend, and Characteristics breakdown.
- Added price chart 52-week high/low reference lines, HTML y-axis price labels, and primary-token active period buttons.
- Updated score trend to a fixed 0-100 y-domain with y-axis labels and explicit previous-run summary.
- Added score-level colors and low-score warning indicators to Characteristics breakdown rows.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck for a stock, ETF, and bond ETF remains pending in an authenticated session. Local unauthenticated instrument detail requests redirect to `/login`.

Expected behavior:
- Sticky identity header stays visible below the dashboard top nav while switching and scrolling tabs.
- Overview avoids duplicate identity content and presents stats in compact responsive grids.
- Price chart overlays do not alter the y-domain; 52-week reference lines only render when the reference price falls inside the selected period domain.
- Score trend remains display-only and neutral, with a fixed 0-100 scale.
- Characteristics component colors and warning icons are visual diagnostics only and do not affect scoring.

---

## 2026-06-25 - Instrument Detail Characteristics Methodology Alignment QA

Scope:
- Added factual one-line descriptions below Characteristics component names for stock, ETF, bond ETF, gold, and crypto component keys.
- Aligned Characteristics row colors, score chips, and the low-score warning icon with the documented `RecommendationRulesService.labelFromScore` bands: Excellent 80+, Good 65+, Neutral 48+, Weak 35+, Poor 20+.
- Added faint score-band guide lines to the Characteristics score-trend chart at 80, 65, and 48, with HTML labels and a note that guardrails can cap the displayed assessment below the raw score band.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests; initial sandboxed run hit `.test-build` EPERM, elevated rerun passed)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck for stock, ETF, and bond ETF pages remains pending in an authenticated session.

Expected behavior:
- Characteristics descriptions render when a known component key is present and are omitted for unmapped keys.
- Breakdown colors use 65/48 bands rather than the interim 70/50 thresholds, and the warning icon appears only below 35.
- Score-trend band guides use the shared score-band constants, not duplicated magic numbers, and remain display-only.
- No scoring, recommendation labels, guardrail logic, methodology formulas, access controls, or data-pipeline behavior changed.

---

## 2026-06-25 - Instrument Price Chart Axis and Header Return Alignment QA

Scope:
- Moved price y-axis value labels from the right edge to the left edge of the instrument price chart.
- Kept 52-week high/low labels on the right edge beside their dashed reference lines.
- Updated the chart header return for 1Y, 5Y, and 20Y to use stored `marketView` returns so it matches the Overview metrics; 1M/3M/6M remain visible-window calculations.
- Preserved chart geometry, local period slicing, x-axis ticks, 52-week reference lines, and crosshair tooltip behavior.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck remains pending in an authenticated session.

Expected behavior:
- Price-scale labels render on the left while 52-week labels remain on the right.
- For named stored periods, chart header percentages match Overview's stored 1Y, 5Y, and 20Y returns exactly.
- Header dollar change is derived from latest price and the stored return for those periods.
- Hover tooltip remains window-relative and labelled "from period start."
- No scoring, recommendation, methodology, access-control, or data-pipeline behavior changed.

---

## 2026-06-25 - Instrument Long-Horizon CAGR Display QA

Scope:
- Updated the instrument detail Long-Horizon card to present 1Y, 5Y, 10Y, 15Y, and 20Y columns.
- Converted 5Y/10Y/15Y/20Y stored total returns to annualised CAGR for display; 1Y remains unchanged.
- Left volatility and max drawdown rows as stored values, with 5Y volatility shown as "�" because no stored field exists.
- Added CAGR bars and display-only disclosures.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests; initial sandboxed run hit `.test-build` EPERM, elevated rerun passed)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck remains pending in an authenticated session.

Expected behavior:
- Null periods render as "�".
- 5Y/10Y/15Y/20Y return cells show CAGR, not total return.
- Volatility remains annualised stored volatility; drawdown remains stored drawdown magnitude and is not annualised.
- CAGR bars clip visually above 100% while preserving the true percentage label.
- No scoring, recommendation, methodology, access-control, or data-pipeline behavior changed.

---

## 2026-06-26 - Instrument Detail Overview Polish QA

Scope:
- Replaced blank Tabler icon class spans with `lucide-react` icons in Key Observations and Characteristics breakdown.
- Made the chart/facts row and score-trend/return-character row participate in equal-height layouts.
- Added red max-drawdown bars to the Long-horizon risk card.
- Corrected rolling one-year return-character stats to use date-based 365-day windows instead of downsampled row offsets.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck remains pending in an authenticated session.

Expected behavior:
- Lucide icons render in both observation cards and breakdown rows.
- Chart bottom aligns with Key Facts and fills its card vertically.
- Long-horizon risk card shows red drawdown bars and visually balances the returns card.
- NVDA-style deep histories no longer show rolling 1Y stats inflated by weekly downsampling before the most recent 5 years.
- No scoring, methodology, guardrail, recommendation, access-control, feature-flag, or data-pipeline behavior changed.

---

## 2026-06-26 - Portfolio Scheduled Fan-Out QA

Scope:
- Portfolio valuation, portfolio summary, and Portfolio Review scheduled endpoints now process all active portfolios when no `portfolioId` query parameter is supplied.
- Explicit `portfolioId` runs still process a single portfolio.
- Recommendation-run remains universe-wide and was not changed.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (363 tests)
- PASS: `npm.cmd run build`

Expected behavior:
- A scheduled no-param valuation run creates analytics snapshots and refreshes dashboard/performance summaries for every active portfolio.
- A scheduled no-param summary run refreshes dashboard/performance summaries for every active portfolio.
- A scheduled no-param Portfolio Review run creates review runs/reports for every active portfolio.
- One failing portfolio is reported as `partial_success` while other portfolios continue.
- Sequential processing is acceptable for alpha; revisit concurrency and the Portfolio Review 25-minute lock TTL if the active portfolio count grows.

---

## 2026-06-26 - Instrument Detail Overview v2 QA

Scope:
- Reworked the instrument detail Overview into a score-first v2 layout with verdict hero, deterministic Key Observations, streamed chart/facts/percentile, full-width Characteristics breakdown, split long-horizon return/risk cards, score trend, and return-character diagnostics.
- Added rolling one-year return-character stats from the same streamed price series used by the price chart.
- Added a read-only active-universe latest-score helper for percentile display.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (354 tests after rerun with elevated filesystem permission)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck remains pending in an authenticated session for a deep stock, young IPO, ETF, and bond ETF.

Expected behavior:
- Key Observations use fixed deterministic templates from stored component keys and documented score bands.
- Return-character tiles render null values as "�" and do not affect scoring or guardrails.
- The price chart and return-character card share the same streamed price-series read.
- Key Facts render missing dividend yield as "�" because the current domain model does not expose that field.
- No scoring, methodology, guardrail, recommendation, access-control, feature-flag, or data-pipeline behavior changed.

---

## 2026-06-26 - Portfolio Dashboard Re-Skin Pass 1 QA

Scope:
- Re-skinned the Portfolio dashboard into the v2 executive overview with full-report health sub-ratings, descriptive 60/40 benchmark banner, value/stat cards, sparkline, labeled performance chart, 2x2 allocation/exposure grid, and watch-area summary.
- Loaded full Portfolio Review and performance summary data at page level for sub-ratings, banner delta, and sparkline context.
- Enhanced the performance period charts with return-axis labels, date ticks, emphasized 0% line, and dashed provisional tails after the latest price date.

Validation:
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd test` (364 tests)
- PASS: `npm.cmd run build`
- NOTE: Browser recheck remains pending in an authenticated session for visual alignment, provisional-tail rendering, and dark-mode presentation.

Expected behavior:
- Portfolio Health uses the full review report section scores for Diversification, Concentration, Risk, and Allocation.
- The banner remains descriptive and includes "not investment advice."
- Performance charts label return and date axes and mark price-lagged tails as provisional.
- Allocation/exposure panels use a 2x2 layout with geography rendered as bars.
- No scoring, methodology, data-pipeline, recommendation, guardrail, feature-flag, or access-control behavior changed.

---

## 2026-06-30 SGT - Exposure Bar Other Bucket QA

Scope:
- Fixed `HorizontalExposureBars` duplicate React keys when source data already contains a literal `Other` bucket.
- Folded pre-existing `Other` source rows into generated `Other` / `Other (N countries)` rollups for `maxItems` and `minPercent` collapse paths.
- Added a focused pure-helper test for source `Other` folding and duplicate-label prevention.

Validation:
- PASS: `npm.cmd test` after import-path correction; full suite included the new chart helper tests.
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `npm.cmd run build`
- NOTE: Browser recheck remains pending in an authenticated session.

Expected behavior:
- Portfolio exposure panels no longer emit React's duplicate key warning for `Other`.
- Geography renders one aggregated `Other (...)` row instead of adjacent `Other` and `Other (...)` rows.
- Asset class, sector, and currency exposure behavior remains unchanged except for folding duplicate `Other` buckets.
