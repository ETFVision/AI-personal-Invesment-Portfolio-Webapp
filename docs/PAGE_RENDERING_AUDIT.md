# ETFVision Page Rendering Performance Audit

Date: 2026-06-11  
Branch: `development`  
Scope: Page-rendering audit and implementation checkpoint. This document now records the original audit, the implemented optimization phases, deferred phases, QA notes, and recommended next actions.

## 1. Objective

Improve ETFVision page rendering speed without sacrificing correctness, auditability, user isolation, or calculation reproducibility.

The app already has several precomputed and scheduled metric layers. This audit therefore starts from the current architecture and avoids recommending new summary tables where existing stored metrics already solve the problem.

## 2. Added Requirements For This Audit

The uploaded prompt is accepted with the following ETFVision-specific additions:

- Audit existing precomputed tables before proposing new tables.
- Verify pages are not recomputing values already stored in:
  - `instrument_prices`
  - `instrument_daily_returns`
  - `instrument_return_anchors`
  - `instrument_market_metrics`
  - `instrument_risk_metrics`
  - portfolio valuation snapshots
  - holding/portfolio derived metrics
  - ETF look-through exposure tables
  - portfolio review reports
  - recommendations
  - Market Vision reports
  - telemetry snapshots/outcomes
  - fundamentals scores/trends
- Include alpha behavior for every route: `show`, `limited`, `hide`, or `internal-only`.
- Do not optimize hidden alpha pages unless they still affect shared layout, shared context, API calls, or scheduled refreshes.
- Include a `do nothing` recommendation when the route is already simple or low risk.
- Add a rollback strategy for any future summary table.
- Preserve user isolation for all user-specific summaries.
- Prefer stale/fresh status indicators and last-updated timestamps when pages read summaries.

## 3. Existing Precomputed Layers

These layers should be reused before adding new cache/summary tables:

| Layer | Purpose | Primary Consumers | Refresh Mode |
|---|---|---|---|
| `instrument_prices` | Raw daily/latest instrument prices | instruments, metrics, holdings | daily price refresh and manual backfill |
| `instrument_daily_returns` | Precomputed price returns | market/risk metrics | daily scheduled refresh |
| `instrument_return_anchors` | Return baselines and 52-week anchors | market metrics, universe/watchlist | daily scheduled refresh |
| `instrument_market_metrics` | Stored price, return, 52-week range metrics | universe, watchlist, holdings, instrument pages | daily scheduled refresh |
| `instrument_risk_metrics` | Stored volatility/drawdown/risk metrics | instrument pages, risk, recommendations | daily scheduled refresh |
| ETF look-through exposure tables | ETF sector/country/top holding/theme look-through | portfolio, review, risk, assistant | monthly/manual refresh |
| fundamentals tables | profiles, ratios, statements, scores, trends | fundamentals, instrument detail, recommendations | weekly/manual refresh |
| recommendation tables | latest deterministic analytical classifications | recommendations, instrument detail, assistant | weekly/manual refresh |
| portfolio review reports | stored review sections and snapshots | portfolio review, portfolio dashboard, assistant | weekly/manual refresh |
| Market Vision reports | stored generated weekly reports | market vision, recommendations, assistant | weekly/manual refresh |
| telemetry snapshots/outcomes | historical evaluation data | telemetry, assistant | weekly evaluation |
| job/provider logs | operational diagnostics | admin pages | on job/provider run |

## 4. Freshness Classes

| Class | Meaning | Typical Refresh |
|---|---|---|
| `REAL_TIME` | Must reflect user edits immediately. | page load or write transaction |
| `ON_CHANGE` | Changes when portfolio/user data changes. | transaction/holding/cash update |
| `DAILY` | Can rely on daily precomputed data. | scheduled daily refresh |
| `WEEKLY` | Can rely on weekly published outputs. | weekly intelligence chain |
| `RARE` | Mostly static or manual admin data. | seed/manual refresh |
| `ADMIN_DIAGNOSTIC` | Internal diagnostics; can be slower/paginated. | on demand |

## 5. Route Inventory And Recommendations

### 5.1 Core Portfolio Routes

| Route | Page File | Current Data Path | Freshness | Alpha Behavior | Load Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/portfolio` | `src/app/(dashboard)/portfolio/page.tsx` | `portfolioService.getDashboard(portfolio.id)` plus latest portfolio review summary | `ON_CHANGE` + `DAILY` | show | high | Candidate for `portfolio_dashboard_summary`; first check whether `PortfolioService.getDashboard` recomputes allocation/performance from raw holdings each render. |
| `/holdings` | `src/app/(dashboard)/holdings/page.tsx` | default portfolio lookup, then `portfolioService.getDashboard` | `ON_CHANGE` + `DAILY` | show | medium | Reuse stored holding/portfolio metrics only; consider splitting holdings table from dashboard summary if render remains slow. |
| `/transactions` | `src/app/(dashboard)/transactions/page.tsx` | portfolio lookup, then `portfolioRepository.listTransactions(portfolio.id)` | `REAL_TIME` | show | low | Do not precompute. Paginate if transaction count grows. |
| `/cash` | `src/app/(dashboard)/cash/page.tsx` | default portfolio lookup, then `portfolioService.getDashboard` | `REAL_TIME` + `ON_CHANGE` | show | medium | Cash editing needs live data, but summary cards should come from dashboard summary if added. |
| `/setup` | `src/app/(dashboard)/setup/page.tsx` | `instrumentService.listInstruments()` | `RARE` | limited/internal onboarding | medium | Limit instrument list loaded for setup or rely on search/pagination; not priority for alpha if setup is controlled. |

Current bottleneck hypothesis:

- `PortfolioService.getDashboard` is shared by `/portfolio`, `/holdings`, `/cash`, `/risk`, `/bonds`, assistant context, recommendation fit, and portfolio review generation.
- If it builds allocation, look-through exposure, benchmarks, performance and risk-related inputs repeatedly, it is the first user-facing candidate for summary extraction.

### 5.2 Instrument Routes

| Route | Page File | Current Data Path | Freshness | Alpha Behavior | Load Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/instruments/universe` | `src/app/(dashboard)/instruments/universe/page.tsx` | `instrumentService.listInstruments`, `instrumentService.listMarketViews`, `fundamentalsRepository.listSummaryRows` | `DAILY` + `WEEKLY` | limited | medium/high | Already uses market metrics views. Add pagination/lazy categories before adding a table. Alpha should filter visible universe. |
| `/instruments/watchlist` | `src/app/(dashboard)/instruments/watchlist/page.tsx` | watchlists, watchlist items, instruments, market views, fundamentals summary rows | `DAILY` + `WEEKLY` | limited | medium | Similar to universe; avoid full fundamentals summary load if only watchlist subset is needed. |
| `/instruments/[symbol]` | `src/app/(dashboard)/instruments/[symbol]/page.tsx` | symbol lookup, all market views, all bond profiles, fundamentals detail, risk metric, recommendation, recommendation history | `DAILY` + `WEEKLY` | limited | high | Strong candidate for `instrument_page_summary` or narrower per-symbol repository methods. Avoid loading all market views and all bond profiles for one symbol. |
| `/fundamentals/[symbol]` | `src/app/(dashboard)/fundamentals/[symbol]/page.tsx` | redirect to `/instruments/[symbol]#fundamentals` | n/a | limited | low | Do nothing. |
| `/universe` | `src/app/(dashboard)/universe/page.tsx` | redirect to `/instruments/universe` | n/a | limited | low | Do nothing. |
| `/watchlists` | `src/app/(dashboard)/watchlists/page.tsx` | redirect to `/instruments/watchlist` | n/a | limited | low | Do nothing. |

Current bottleneck hypothesis:

- Instrument detail should not load all market views and all bond profiles to render one symbol.
- Universe/watchlist pages should continue reading existing `instrument_market_metrics`/`instrument_risk_metrics` rather than deriving metrics on render.

### 5.3 Research Routes

| Route | Page File | Current Data Path | Freshness | Alpha Behavior | Load Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/portfolio-review` | `src/app/(dashboard)/portfolio-review/page.tsx` | `portfolioReviewService.getDashboard(portfolio.id)`, latest ETF exposure log | `WEEKLY` + `ON_CHANGE` | limited | medium | Should read stored review report; do not regenerate on render. Add alpha-filtered section rendering later. |
| `/risk` | `src/app/(dashboard)/risk/page.tsx` | `portfolioService.getDashboard`, macro dashboard, cached risk report, bond report/report build | `DAILY` | show/limited | high | Candidate for `portfolio_risk_summary`; page should avoid building risk report if latest cached report is fresh. |
| `/bonds` | `src/app/(dashboard)/bonds/page.tsx` | `portfolioService.getDashboard`, macro dashboard, bond analytics on dashboard | `DAILY` + `WEEKLY` | hide initially | medium | If hidden in alpha, optimize later. In full mode, reuse portfolio dashboard summary and macro dashboard summary. |
| `/macro` | `src/app/(dashboard)/macro/page.tsx` | `macroDashboardService.getDashboard` | `DAILY` | hide initially | medium | Existing macro dashboard repository already centralizes data. Add summary only if measured slow. |
| `/market-vision` | `src/app/(dashboard)/market-vision/page.tsx` | market vision dashboard, 40 NewsData articles, 40 GDELT articles, macro dashboard | `WEEKLY` | limited/basic or hide | high | Use latest published report for initial render; move raw global news input below/lazy-load or admin-only. |
| `/news` | `src/app/(dashboard)/news/page.tsx` | `newsDashboardService.getDashboard(filters)` | `DAILY` + `WEEKLY` | hide or limited | high | Ensure latest articles are limited/paginated; candidate for `news_theme_summary` if theme summary is recalculated on render. |
| `/fundamentals` | `src/app/(dashboard)/fundamentals/page.tsx` | `fundamentalsRepository.listSummaryRows`, refresh logs | `WEEKLY` | hide or limited | medium | Add pagination/filtering for large stock universe; no new summary table needed initially because summary rows exist. |
| `/recommendations` | `src/app/(dashboard)/recommendations/page.tsx` | `recommendationService.getDashboard(portfolioId)` | `WEEKLY` | hide initially | medium | Reads latest recommendations; add pagination and alpha guard rather than precompute. |
| `/telemetry` | `src/app/(dashboard)/telemetry/page.tsx` | `telemetryDashboardService.getDashboard` | `WEEKLY` | hide | high | Candidate for telemetry dashboard summary because repository currently aggregates many snapshot/outcome rows. |

Current bottleneck hypothesis:

- `/risk`, `/market-vision`, `/telemetry`, and `/news` are likely heavier than the simple CRUD pages.
- `/market-vision` currently loads raw macro/world-news inputs in addition to the stored report, which is useful but not needed for first paint.

### 5.4 Assistant Routes

| Route/API | File | Current Data Path | Freshness | Alpha Behavior | Load Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/assistant` | `src/app/(dashboard)/assistant/page.tsx` | recent conversations and selected messages | `REAL_TIME` | optional/hide | low | Do nothing beyond pagination already present. |
| `/api/assistant` | `src/app/api/assistant/route.ts` | assistant context builder: portfolio dashboard, latest review, latest recommendations, Market Vision, telemetry, recent messages | `REAL_TIME` + `DAILY` + `WEEKLY` | server flag required | high | Strong candidate for compact assistant context summary. Must enforce feature guard before alpha. |

Current bottleneck hypothesis:

- The assistant API gathers a broad context every chat turn. It should eventually read compact summaries rather than full dashboard/report structures.

### 5.5 Admin/Internal Routes

| Route | Page File | Current Data Path | Freshness | Alpha Behavior | Load Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/admin/data-sources` | `src/app/(dashboard)/admin/data-sources/page.tsx` | news dashboard, macro dashboard, fundamentals logs/rows, ETF logs, Market Vision dashboard, instruments, job runs, ETF exposures, market coverage summaries | `ADMIN_DIAGNOSTIC` | internal-only | high | Candidate for `data_source_health_summary`; first add pagination/defer diagnostics if needed. |
| `/admin/jobs` | `src/app/(dashboard)/admin/jobs/page.tsx` | `jobRunService.listRecent(30)` | `ADMIN_DIAGNOSTIC` | internal-only | low | Do nothing now; add filters/pagination if logs grow. |
| `/admin/assistant-usage` | `src/app/(dashboard)/admin/assistant-usage/page.tsx` | assistant usage/cost data | `ADMIN_DIAGNOSTIC` | internal-only | unknown/medium | Audit repository query before optimizing. Likely pagination. |
| `/admin/system-health` | `src/app/(dashboard)/admin/system-health/page.tsx` | container/env/system health checks | `ADMIN_DIAGNOSTIC` | internal-only | low | Do nothing. |
| `/setup/taxonomy` | `src/app/(dashboard)/setup/taxonomy/page.tsx` | sectors, themes, provider mappings, instrument mappings | `RARE` | internal-only | medium | Pagination/search if mappings grow. |
| `/taxonomy` | `src/app/(dashboard)/taxonomy/page.tsx` | redirect to setup taxonomy | n/a | internal-only | low | Do nothing. |

Admin pages can be slower than user-facing pages, but they should not block user workflows. Optimization priority is lower unless they are noticeably slow.

### 5.6 Auth/Root Routes

| Route | Page File | Current Data Path | Freshness | Alpha Behavior | Load Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | likely redirect/landing | n/a | show | low | Do nothing. |
| `/login` | `src/app/login/page.tsx` | auth UI | n/a | show | low | Do nothing. |

## 6. API Endpoint Inventory

### User-Facing API

| Endpoint | File | Purpose | Performance Note |
|---|---|---|---|
| `/api/assistant` | `src/app/api/assistant/route.ts` | Chat assistant response generation | Heavy because context builder reads portfolio, review, recommendations, Market Vision, telemetry. Add feature guard and summary context later. |

### Job API Endpoints

These are protected by `CRON_SECRET` and are not page-rendering endpoints, but their output freshness affects page speed and correctness:

| Endpoint | Purpose |
|---|---|
| `/api/jobs/instrument-price-refresh` | Latest prices only in current schedule |
| `/api/jobs/instrument-daily-returns-refresh` | Precompute daily returns |
| `/api/jobs/instrument-return-anchors-refresh` | Precompute anchors |
| `/api/jobs/instrument-market-metrics-refresh` | Precompute market metrics |
| `/api/jobs/instrument-risk-refresh` | Precompute risk metrics |
| `/api/jobs/instrument-metadata-refresh` | Refresh instrument profile metadata |
| `/api/jobs/benchmark-refresh` | Refresh benchmark data |
| `/api/jobs/portfolio-valuation-refresh` | Refresh portfolio valuation snapshots |
| `/api/jobs/fred-macro-ingestion` | Refresh macro data |
| `/api/jobs/daily-news-ingestion` | Refresh FMP news |
| `/api/jobs/newsdata-news-ingestion` | Refresh NewsData articles |
| `/api/jobs/gdelt-news-ingestion` | Manual GDELT ingestion |
| `/api/jobs/weekly-news-reconciliation` | Weekly news/theme reconciliation |
| `/api/jobs/weekly-market-vision` | Weekly Market Vision generation |
| `/api/jobs/recommendation-run` | Recommendation refresh |
| `/api/jobs/portfolio-review-run` | Portfolio Review refresh |
| `/api/jobs/telemetry-evaluation` | Telemetry horizon evaluation |
| `/api/jobs/etf-lookthrough-refresh` | ETF look-through refresh |
| `/api/jobs/fundamentals-refresh` | Fundamentals refresh |
| `/api/jobs/universe-validation` | Universe validation |
| `/api/jobs/market-history-backfill` | Manual history backfill |
| `/api/jobs/price-refresh` | Legacy/portfolio price refresh path |

Job endpoint optimization priority:

1. Keep page renders reading job outputs, not recalculating job logic.
2. Keep job summaries clear enough for Admin diagnostics.
3. Do not let hidden alpha features run unnecessary jobs if alpha later has per-feature job flags.

## 7. Likely Bottlenecks By Area

| Area | Bottleneck Hypothesis | Evidence From Current Route Calls |
|---|---|---|
| Shared portfolio dashboard | Recomputed or overbuilt for many pages | `portfolioService.getDashboard` used by portfolio, holdings, cash, risk, bonds, assistant context and review services |
| Instrument detail | Broad list loads for one symbol | detail page calls `listInstruments({ query })`, `listMarketViews`, `listBondProfiles`, fundamentals detail, risk metric, recommendation, history |
| Risk page | Builds dashboard plus macro plus cached/derived reports | route fetches dashboard, macro, cached report, then bond/report data |
| Market Vision | Loads stored reports plus 80 global news rows plus macro dashboard | route loads Market Vision dashboard, NewsData/GDELT news, macro dashboard |
| News page | Dashboard may gather latest articles, classifications, theme summaries, query statuses | `newsDashboardService.getDashboard` is central and likely multi-query |
| Admin data sources | Many independent diagnostics and full coverage summaries | route executes broad Promise.all plus ETF exposure lists plus coverage methods |
| Telemetry | Aggregates snapshots/outcomes across multiple horizons | repository dashboard builds from recommendation, Market Vision, portfolio review snapshots/outcomes |
| Assistant API | Wide context per message | context builder loads dashboard, review, recommendations, Market Vision, telemetry, messages |

## 8. Candidate Summary Tables

These are candidates, not approved implementation items.

### 8.1 High-Priority Candidates

#### `portfolio_dashboard_summary`

Purpose:

- Fast first render for `/portfolio`, `/holdings`, `/cash`, and assistant portfolio context.

Source tables:

- holdings, transactions, cash balances, latest prices, portfolio snapshots, ETF look-through exposure, holding/portfolio metrics.

Refresh trigger:

- transaction/holding/cash changes
- daily price refresh
- ETF look-through refresh
- taxonomy change

Expected columns:

- `portfolio_id`, `user_id`, `as_of_date`, `status`, `total_value`, `cash_value`, `invested_value`, `daily_return`, `allocation_json`, `sector_exposure_json`, `country_exposure_json`, `top_holdings_json`, `calculation_version`, `taxonomy_version`, `source_snapshot_id`, `error_message`, `updated_at`.

Indexes:

- `(portfolio_id, as_of_date desc)`
- `(user_id, updated_at desc)`

Rollback:

- Keep existing `PortfolioService.getDashboard` as fallback when summary missing/stale/failed.

#### `portfolio_risk_summary`

Purpose:

- Fast `/risk` render and assistant risk context.

Source tables:

- portfolio snapshots, TWR series, benchmark snapshots, instrument risk metrics, look-through exposure.

Refresh trigger:

- daily price/metric refresh
- portfolio transaction changes
- risk calculation version changes

Expected columns:

- `portfolio_id`, `user_id`, `as_of_date`, `status`, `risk_score`, `volatility_json`, `drawdown_json`, `risk_contribution_json`, `concentration_json`, `benchmark_json`, `calculation_version`, `source_snapshot_id`, `error_message`, `updated_at`.

Rollback:

- Preserve latest good summary and display stale badge; do not block portfolio page.

#### `instrument_page_summary`

Purpose:

- Fast `/instruments/[symbol]` render.

Source tables:

- instruments, market metrics, risk metrics, fundamentals scores/trends, recommendations, ETF exposure.

Refresh trigger:

- price/market/risk refresh
- fundamentals refresh
- recommendation refresh
- metadata/taxonomy refresh
- ETF exposure refresh

Expected columns:

- `instrument_id`, `symbol`, `as_of_date`, `status`, `profile_json`, `market_metrics_json`, `risk_metrics_json`, `fundamentals_summary_json`, `recommendation_summary_json`, `exposure_summary_json`, `calculation_version`, `updated_at`.

Rollback:

- Use existing repositories section-by-section if summary absent.

### 8.2 Medium-Priority Candidates

#### `news_theme_summary`

- Good if `/news` or `/market-vision` spends time rebuilding theme summaries.
- Refresh after classification and weekly reconciliation.

#### `telemetry_summary`

- Good because telemetry dashboard likely aggregates many snapshots/outcomes.
- Refresh after telemetry evaluation.

#### `data_source_health_summary`

- Useful for Admin/Data Sources only.
- Refresh after jobs or on admin open if missing.

### 8.3 Lower-Priority / Do Not Start Here

| Candidate | Reason |
|---|---|
| `market_vision_summary` | Market Vision reports already store generated output; optimize raw diagnostics first. |
| `instrument_fundamentals_summary` | Fundamentals summary/trend tables already exist. |
| `admin_job_summary` | Current `/admin/jobs` only loads recent 30 rows. |
| `portfolio_review_summary` | Portfolio review report table already stores output. |

## 9. Index Audit Targets

Phase 1 did not add indexes. These should be checked in Phase 2 against actual query plans:

| Access Pattern | Tables | Candidate Index |
|---|---|---|
| latest prices by instrument/date | `instrument_prices` | `(instrument_id, price_date desc)` |
| latest market metrics | `instrument_market_metrics` | `(instrument_id, latest_price_date desc)` |
| latest risk metrics | `instrument_risk_metrics` | `(instrument_id, metric_date desc)` |
| daily returns refresh/staleness | `instrument_daily_returns` | `(instrument_id, return_date desc)` |
| return anchors | `instrument_return_anchors` | `(instrument_id, as_of_date desc)` |
| portfolio transactions | `transactions` | `(portfolio_id, transaction_date desc)` |
| portfolio snapshots | `portfolio_snapshots` | `(portfolio_id, snapshot_date desc)` |
| job diagnostics | `job_runs` | `(job_name, started_at desc)`, `(status, started_at desc)` |
| latest recommendations | recommendation tables | `(instrument_id, generated_at desc)` |
| latest fundamentals | fundamentals tables | `(instrument_id, period_end desc)` |
| ETF latest exposures | ETF exposure tables | `(etf_instrument_id, as_of_date desc)` |
| news page | news/classification tables | `(published_at desc)`, `(source_provider, published_at desc)` |

Avoid over-indexing until slow query evidence exists.

## 10. Alpha Feature Flag Considerations

Feature-flag-aware performance strategy:

- Hidden alpha routes should not appear in nav and should not load in shared layout.
- Direct access to hidden routes should eventually be guarded server-side.
- Alpha-visible instrument universe should be filtered before expensive joins where possible.
- Alpha portfolio/risk pages should read the same optimized summaries but render fewer sections.
- Admin pages remain internal-only; do not spend early performance budget optimizing them unless internal usage is painful.
- Job endpoints can continue refreshing full internal data for now. If alpha cost becomes an issue, add job flags later.

Suggested alpha route behavior:

| Route Area | Alpha Behavior |
|---|---|
| Portfolio, holdings, transactions, cash | show |
| Universe/watchlist | limited alpha-visible instruments |
| Instrument detail | limited but useful |
| Risk | show basic risk if summary-backed |
| Portfolio Review | limited/basic sections |
| Market Vision | optional basic latest published view only |
| News, macro, fundamentals, recommendations, telemetry, assistant | hide initially unless explicitly enabled |
| Admin/setup/taxonomy | internal-only |

## 11. Phase 2 Measurement Plan

Add lightweight timing guarded by an environment variable, not noisy production logs.

Suggested flag:

```text
ENABLE_RENDER_TIMING=true
```

Measure:

- page-level server render data fetch time
- major service calls
- repository calls that load many rows
- API assistant context build time
- Admin diagnostics calls

Initial targets:

1. `portfolioService.getDashboard`
2. `instrumentService.listMarketViews`
3. `portfolioReviewService.getDashboard`
4. `riskAnalyticsDataService.buildReport`
5. `marketVisionService.getDashboard`
6. `newsDashboardService.getDashboard`
7. `telemetryDashboardService.getDashboard`
8. assistant context builder
9. Admin/Data Sources coverage summaries

Do not persist timings to a database in Phase 2 unless logs are insufficient.

## 12. Recommended Implementation Stages

### Stage 1: Low-Risk Rendering Improvements

- Add timing instrumentation under `ENABLE_RENDER_TIMING`.
- Confirm pages use stored market/risk metrics rather than raw price calculations.
- Replace all-symbol loads on instrument detail with per-symbol reads.
- Add pagination or limits for admin diagnostics where missing.
- Lazy/defer Market Vision raw world-news input.
- Avoid full fundamentals summary load on watchlist if only watchlist instruments are shown.

### Stage 2: One Proof-Of-Pattern Summary

Recommended first summary table:

- `instrument_page_summary` if instrument detail is slowest.
- `portfolio_dashboard_summary` if portfolio/holdings/cash shared dashboard is slowest.

Choose based on Stage 1 timing.

### Stage 3: Portfolio/Risk Summaries

- Add `portfolio_dashboard_summary`.
- Add `portfolio_risk_summary`.
- Refresh on portfolio writes and daily metric jobs.
- Preserve latest good summary on failure.

### Stage 4: Admin/Internal Summaries

- Add `data_source_health_summary` if Admin/Data Sources remains slow.
- Add `telemetry_summary` if telemetry dashboard remains slow.

## 13. Quick Wins To Consider First

1. `/instruments/[symbol]`: replace broad `listMarketViews` and `listBondProfiles` with symbol/id-specific repository calls.
2. `/market-vision`: lazy-load or collapse raw NewsData/GDELT article inputs.
3. `/admin/data-sources`: keep the current page, but consider split/lazy diagnostic panels if render is slow.
4. `/instruments/watchlist`: avoid fetching all fundamentals summary rows if a subset query can serve the displayed instruments.
5. `/risk`: never rebuild heavy risk analytics during render if cached report is fresh.

## 14. Open Questions Before Implementation

- Which page currently feels slowest in real use: portfolio, risk, instrument detail, Market Vision, or Admin/Data Sources?
- Should alpha include basic Market Vision or keep it hidden until pro/internal?
- Is Supabase query-plan access available for `EXPLAIN ANALYZE`, or should timing be app-level first?
- Do we want summary freshness badges visible on user pages immediately, or only after summaries exist?

## 15. Recommended Next Task

Implement Phase 2 timing instrumentation and one low-risk route optimization, not new summary tables yet.

Recommended first slice:

1. Add `ENABLE_RENDER_TIMING` helper.
2. Instrument:
   - `portfolioService.getDashboard`
   - `/instruments/[symbol]`
   - `/risk`
   - `/market-vision`
   - `/admin/data-sources`
3. Replace broad instrument detail loads with symbol-specific reads if the code path is straightforward.
4. Re-run lint/typecheck/build.
5. Use the timing output to choose the first summary table.

## 16. Phase 2 Initial Implementation

Completed on `development`:

- Added guarded render timing behind `ENABLE_RENDER_TIMING`.
- Instrumented key page-level data loads:
  - `/portfolio`
  - `/risk`
  - `/market-vision`
  - `/admin/data-sources`
  - `/instruments/[symbol]`
- Optimized `/instruments/[symbol]` to:
  - limit symbol lookup to the requested symbol query window.
  - fetch only the selected instrument's bond profile instead of loading every bond profile.
- Parallelized Admin/Data Sources market coverage summaries that were independent but previously loaded sequentially.

Validation:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Next recommended measurement:

Set `ENABLE_RENDER_TIMING=true` in a development or preview environment, open the slowest pages, and compare `[render-timing]` server logs. Use those timings to decide whether the first summary target should be `portfolio_dashboard_summary`, `instrument_page_summary`, or an Admin/Data Sources health summary.

## 17. 2026-06-11 Rendering Optimization Execution Update

This section supersedes the earlier phase-order notes where later testing changed the plan.

### 17.1 What Has Been Implemented

#### Render Timing Instrumentation

Implemented:

- Added `measureRenderStep` in `src/infrastructure/observability/renderTiming.ts`.
- Render timing is guarded by `ENABLE_RENDER_TIMING=true`.
- Main user and admin pages now emit page-level or section-level timings, including:
  - `/portfolio`
  - `/holdings`
  - `/cash`
  - `/transactions`
  - `/instruments/universe`
  - `/instruments/watchlist`
  - `/instruments/[symbol]`
  - `/fundamentals`
  - `/risk`
  - `/bonds`
  - `/recommendations`
  - `/portfolio-review`
  - `/market-vision`
  - `/news`
  - `/macro`
  - `/telemetry`
  - `/assistant`
  - Admin/Data Sources
  - Admin/Jobs
  - Admin/Assistant Usage
  - Setup/Taxonomy

Result:

- The timing layer made it clear that raw server data load, not client rendering, was the main bottleneck for the slowest pages.
- The most useful measurements were portfolio summary load, fundamentals overview load, instrument detail fundamentals load, universe/watchlist market/fundamentals load, and portfolio analytics panels.

#### Portfolio Performance Summary

Implemented:

- Added `portfolio_performance_summary`.
- Added `/api/jobs/portfolio-performance-summary-refresh`.
- Added `PortfolioService.getPerformanceSummary`.
- `/portfolio` reads stored performance and benchmark comparison rows first.
- If missing, `/portfolio` falls back to live dashboard calculation and stores the summary.

Result:

- `/portfolio` performance chart load dropped to roughly the 250-300ms range in preview logs when summary rows were available.
- This is the strongest successful proof-of-pattern summary table so far.

#### Portfolio Dashboard Summary

Implemented:

- Added `portfolio_dashboard_summary`.
- Added `/api/jobs/portfolio-dashboard-summary-refresh`.
- Added `/api/jobs/portfolio-summary-refresh` to refresh dashboard and performance summaries together.
- Added daily scheduled refresh for `portfolio-summary-refresh`.
- `portfolio-valuation-refresh` now refreshes dashboard and performance summaries after valuation snapshot creation.
- `/portfolio`, `/holdings`, and `/cash` read the cached dashboard summary through `PortfolioService.getCachedDashboardSummary`.

Result:

- `/holdings` and `/cash` typically moved into the roughly 250-700ms range in preview logs.
- `/portfolio` first-paint summary/card data is now summary-backed.
- `/portfolio` still has deferred performance/analytics panels, but the heaviest repeated dashboard recomputation has been reduced.

#### Fundamentals Overview And Detail Optimization

Implemented:

- Added `fundamentals_overview_metrics` view.
- Added `get_fundamentals_detail_snapshot(input_symbol text)` RPC.
- `/fundamentals` reads the overview view instead of rebuilding from raw statements/ratios.
- `/instruments/[symbol]` reads the fundamentals detail snapshot for the selected instrument.

Result:

- `/fundamentals` moved from roughly 1.5s+ to roughly 500-700ms in later preview logs, with occasional variation.
- `/instruments/[symbol]` fundamentals detail improved materially, with later GOOGL logs around 300-450ms after the final refinements, although some earlier detail loads were still around 1.1-1.4s.

#### Instrument Detail Narrowing

Implemented:

- Instrument detail lookup was narrowed to the requested symbol query window.
- Bond profile loading was narrowed to the selected instrument instead of loading all bond profiles.
- Fundamentals detail now uses the detail snapshot RPC.

Result:

- The route is no longer doing the broadest all-instrument/all-bond-profile reads for a single symbol.
- Remaining work is to combine market, risk, recommendation, and fundamentals data into a single per-symbol summary/read model only if real timings remain high.

#### Universe And Watchlist Optimization

Implemented:

- Universe/watchlist pages still use live directory reads, but they now avoid full fundamentals summary loading.
- Added `listSummaryRowsForInstruments(instruments)` and use it for displayed instruments/watchlist subset.
- Watchlist reads market and fundamentals rows only for selected watchlist instruments.
- An attempted instrument directory summary-table approach was tested and then reverted because the universe page became slower in preview logs.

Result:

- `/instruments/watchlist` generally improved to roughly 280-320ms after warm runs.
- `/instruments/universe` remains variable and often sits around 550-900ms, sometimes higher.
- Current recommendation is not to reintroduce the reverted directory summary table until there is a narrower query/materialized view design or server-side pagination.

#### Admin Data Sources Controls For Summary Refreshes

Implemented:

- Added Admin/Data Sources refresh control for portfolio summary tables.
- Added daily refresh status cards for the scheduled chain.
- Added summary read-model job cards/log surfaces.

Result:

- Operators can now manually refresh portfolio summaries and inspect daily summary job status.
- This remains internal/full-mode functionality and should not be exposed to consumer alpha users.

#### Alpha Branch Alignment

Implemented:

- `alpha` was realigned to `main` plus release flags instead of remaining a manually patchworked partial branch.
- Alpha now receives the same page-rendering optimizations as main.
- Alpha-specific behavior is handled through:
  - `src/config/release.ts`
  - `src/middleware.ts`
  - `src/components/layout/app-shell.tsx`
  - alpha-safe Market Vision display rules

Result:

- Future main-to-alpha updates should be simpler.
- Alpha can keep consumer-facing limitations without missing core performance fixes.

### 17.2 Corrected 10-Phase Status

| Phase | Area | Status | Current Notes |
|---|---|---|---|
| 1 | Portfolio Performance Summary | Done | `portfolio_performance_summary` is implemented and used by `/portfolio` performance panels. |
| 2 | Instrument Directory Summary | Deferred / changed approach | Summary-table attempt was slower and reverted. Current approach is scoped fundamentals rows plus existing market metrics. Watchlist is acceptable; universe remains a future optimization target. |
| 3 | Instrument Detail Summary | Partially done | Broad reads reduced; fundamentals snapshot RPC added. No full `instrument_page_summary` table yet. |
| 4 | Portfolio Dashboard Summary | Done | `portfolio_dashboard_summary` is implemented and used by `/portfolio`, `/holdings`, and `/cash`. |
| 5 | Portfolio Risk Summary | Deferred by decision | Risk summary work was started conceptually but intentionally not kept. `/risk` still reads dashboard summary plus cached risk/bond/macro data. |
| 6 | Bond / Fixed Income Summary | Not started | `/bonds` is instrumented and uses summary dashboard/macro summary, but no bond page summary table exists. |
| 7 | News / Theme Summary | Not started | `/news` is instrumented. Existing dashboard/reconciliation structures are used; no `news_theme_summary` table yet. |
| 8 | Market Vision Display Summary | Partially done by page structure | Market Vision reports are already stored. Raw macro/news support sections are measured and can be hidden/lazy in alpha; no new display summary table added. |
| 9 | Telemetry Summary | Not started | `/telemetry` is instrumented and still showed slow build-time data in one production build log. Candidate for future summary/read model. |
| 10 | Admin Data Sources Health Summary | Not started | Admin page has more timing and summary controls, but no `data_source_health_summary` table. Internal-only; lower user-facing priority. |

### 17.3 Development Branch QA Findings

Current development branch state:

- Working tree was clean before this documentation update.
- `portfolio_performance_summary` and `portfolio_dashboard_summary` are present in migrations and repository/service code.
- `/portfolio` uses:
  - `getCachedDashboardSummary` for top/dashboard data.
  - `getPerformanceSummary` for performance/benchmark panels.
  - live fallback only when summary rows are absent.
- `/holdings` and `/cash` use `getCachedDashboardSummary`.
- `/risk` and `/bonds` use `getDashboardSummary`, not the full historical dashboard, for their portfolio base.
- `/instruments/universe` and `/instruments/watchlist` use `listSummaryRowsForInstruments`, avoiding full fundamentals summary scans.
- `/instruments/[symbol]` uses `get_fundamentals_detail_snapshot` for fundamentals detail.
- Admin/Data Sources includes portfolio summary refresh controls and job status cards.
- No retained `instrument_directory_summary`, `portfolio_risk_summary`, `telemetry_summary`, or `data_source_health_summary` implementation exists on development.

Validation previously run during implementation:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Documentation-only update note:

- This checkpoint updates documentation and does not change executable application code.

### 17.4 Remaining Work And Recommendations

High priority:

1. Keep the current portfolio summary implementation.
   - It produced the clearest improvement.
   - Keep the live fallback path for missing/stale rows.
   - Keep daily `portfolio-summary-refresh` scheduled after portfolio valuation.

2. Do not reintroduce the previous instrument directory summary table as-is.
   - It made `/instruments/universe` slower in preview testing.
   - If universe remains slow, use server-side pagination, category-level lazy sections, or a narrower materialized directory view with explicit indexes.

3. Optimize `/instruments/[symbol]` only if new logs still show >800-1000ms.
   - Preferred next step: a compact per-symbol read method or RPC that returns market metrics, risk metrics, fundamentals snapshot, recommendation, and recommendation history for one symbol.
   - Avoid a large JSON summary table until the per-symbol query is proven slow.

Medium priority:

4. Portfolio Risk Summary remains optional.
   - The user explicitly asked to revert/not proceed with portfolio risk summary.
   - Revisit only if `/risk` remains a major bottleneck after cached reports are confirmed fresh.

5. Telemetry Summary is a good candidate later.
   - Telemetry is hidden from alpha and not core consumer first-paint.
   - Build-time/render timing showed it can be heavy.
   - Implement after user-facing pages are stable.

6. Admin Data Sources Health Summary is useful but internal.
   - It can consolidate coverage, job status, provider diagnostics and freshness.
   - Do it only if internal admin usage is painful.

Lower priority:

7. Bond / Fixed Income Summary.
   - `/bonds` is now using lighter dashboard/macro summary inputs.
   - Add a summary only if preview logs show it remains slow.

8. News / Theme Summary.
   - Existing weekly reconciliation and theme intelligence are already stored.
   - Add a summary only if `/news` repeatedly exceeds acceptable load times after article limits/pagination.

9. Market Vision Display Summary.
   - Market Vision reports are already stored outputs.
   - Next work should focus on hiding/lazy-loading support diagnostics rather than adding another table.

10. Assistant context summary.
   - Not part of the page-rendering implementation yet.
   - Later assistant performance can improve by reading compact portfolio/review/insight/Market Vision/telemetry summaries instead of broad context every chat turn.

### 17.5 Operational Checklist

After deploying a branch containing summary-read changes:

1. Run migrations through the latest migration on the target environment.
2. Ensure `portfolio-summary-refresh` appears in Supabase cron.
3. Manually run `/api/jobs/portfolio-summary-refresh` once or use the Admin/Data Sources button.
4. Confirm rows exist:
   - `portfolio_dashboard_summary`
   - `portfolio_performance_summary`
5. Open `/portfolio`, `/holdings`, and `/cash` with `ENABLE_RENDER_TIMING=true`.
6. Confirm logs show summary-backed timings.
7. Keep checking:
   - `/instruments/universe`
   - `/instruments/watchlist`
   - `/instruments/[symbol]`
   - `/fundamentals`
8. Do not create new summary tables unless fresh logs show persistent slow paths after scoped-query optimization.
