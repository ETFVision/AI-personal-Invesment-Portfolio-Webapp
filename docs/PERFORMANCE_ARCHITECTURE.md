# Performance Architecture

Last updated: 2026-06-17 +08:00

## Purpose

The current performance strategy is to move expensive calculations from page rendering into scheduled, stored summaries and metric tables.

## Next.js Data Cache Layer (unstable_cache)

Shared non-personalized pages use `unstable_cache` from `'next/cache'` for server-side caching. Each page wraps its service calls at module scope with a tag-keyed cached function. Scheduled jobs invalidate those tags via an `onSuccess` callback on `runCronJob` so page data is refreshed promptly after job completion.

Cache tags and their job invalidators:

| Tag | Invalidating jobs |
|---|---|
| `market-data` | instrument-price-refresh, instrument-daily-returns-refresh, instrument-return-anchors-refresh, instrument-market-metrics-refresh, instrument-risk-refresh, instrument-metadata-refresh, benchmark-refresh, etf-lookthrough-refresh |
| `macro-data` | fred-macro-ingestion |
| `news-data` | daily-news-ingestion, newsdata-news-ingestion, weekly-news-reconciliation |
| `market-vision-data` | weekly-market-vision |
| `fundamentals-data` | fundamentals-refresh |

Pages cached:

| Route | Cache tags used | Safety TTL |
|---|---|---|
| `/instruments/universe` (default active view) | `market-data` | 24h |
| `/macro` | `macro-data` | 24h |
| `/news` | `news-data` | 24h |
| `/market-vision` (main report + theme intelligence + world-news support) | `market-vision-data`, `news-data` | 7d (report), 24h (support data) |
| `/market-vision` (MacroContextSection) | `macro-data` | 24h |
| `/fundamentals` | `fundamentals-data` | 24h |

Pages NOT cached (personalized or real-time):

- `/portfolio`, `/holdings`, `/transactions`, `/cash` — user portfolio data
- `/risk`, `/bonds` — portfolio-specific analytics
- `/recommendations`, `/portfolio-review` — portfolio-specific intelligence
- `/telemetry` — user-specific evaluation history
- `/assistant` — real-time chat
- `/watchlist` — user-curated list

Manual flush: `POST /api/admin/revalidate` with `x-admin-secret: <ADMIN_SECRET>` invalidates all five tags at once. See `docs/JOBS_AND_OPERATIONS.md` for the full cache invalidation pattern.

Achieved warm render timings (measured with `ENABLE_RENDER_TIMING`):

| Route | Before caching | After caching |
|---|---|---|
| `/macro` | ~350–600ms | 7–14ms |
| `/fundamentals` | ~300–500ms | 11–12ms |
| `/news` | ~400–700ms | 7–8ms |
| `/market-vision` (full) | ~800ms+ | 17–31ms |
| `/instruments/[symbol]` (lookup) | ~200–400ms (list+filter) | ~20–40ms (getBySymbol) |

## Render Timing

Render timing helper:

- `src/infrastructure/observability/renderTiming.ts`
- Controlled by `ENABLE_RENDER_TIMING`

See `docs/PAGE_RENDERING_AUDIT.md` for the detailed performance audit and phase history.

## Implemented Summary Tables

- `portfolio_performance_summary`
- `portfolio_dashboard_summary`

## Implemented Derived Metric Tables

- `instrument_daily_returns`
- `instrument_return_anchors`
- `instrument_market_metrics`
- `instrument_risk_metrics`
- `holding_market_metrics`
- `portfolio_current_metrics`

## Current Rendering Choices

- `/portfolio` uses cached portfolio performance summary and deferred analytics panels.
- `/holdings` and `/cash` use cached dashboard summary data.
- Universe/watchlist summary-table experiment was reverted because it did not improve universe render consistently. Keep this as a warning for future optimization: summary tables help only if their query shape and indexes are simpler than the original read path.

## Recommended Next Performance Phases

1. Portfolio Risk Summary: optimize `/risk` after confirming required chart/table payloads.
2. Bond/Fixed Income Summary: optimize `/bonds`.
3. Telemetry Summary: optimize `/telemetry` — repository currently aggregates many snapshot/outcome rows.
4. Admin Data Sources Health Summary: optimize diagnostics without loading excessive logs.
5. Compact Assistant Context Summary: reduce per-message context build cost in `/api/assistant`.

Completed phases (no longer candidates):

- `/news` — cached with `news-data` tag; 24h TTL + job invalidation (2026-06-17).
- `/market-vision` — cached with `market-vision-data` and `news-data` tags; MacroContextSection cached under `macro-data` (2026-06-17).
- `/instruments/universe` (default view) — cached with `market-data` tag (2026-06-17).
- `/macro` — cached with `macro-data` tag (2026-06-17).
- `/fundamentals` — cached with `fundamentals-data` tag (2026-06-17).
- `/instruments/[symbol]` — broad list lookup replaced with `getBySymbol()` direct exact-match (2026-06-17).

Instrument directory and detail summary phases should be revisited only with query-plan evidence because the last directory summary attempt was not beneficial for universe.

## Performance Guardrails

- Do not add summary tables unless they reduce query complexity or network payload.
- Keep summaries refreshed in the daily schedule when they affect core pages.
- Keep detailed diagnostic/log tables in Admin, not product pages.
- Use indexes on `(portfolio_id, updated_at desc)`, `(instrument_id, date desc)`, and status/date filters where relevant.
