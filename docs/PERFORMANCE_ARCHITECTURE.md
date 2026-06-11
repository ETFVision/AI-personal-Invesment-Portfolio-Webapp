# Performance Architecture

Last updated: 2026-06-11 20:11:07 +08:00

## Purpose

The current performance strategy is to move expensive calculations from page rendering into scheduled, stored summaries and metric tables.

## Render Timing

Render timing helper:

- `src/infrastructure/observability/renderTiming.ts`
- Controlled by `ENABLE_RENDER_TIMING`

Recent observed optimized targets:

- Portfolio performance summary reads around a few hundred milliseconds.
- Watchlist reads are generally faster than universe reads.
- Fundamentals and instrument detail have been improved with indexes/snapshot RPCs but can still vary.

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
3. News/Theme Summary: optimize `/news`, especially current article list and theme summaries.
4. Market Vision Display Summary: optimize `/market-vision`.
5. Telemetry Summary: optimize `/telemetry`.
6. Admin Data Sources Health Summary: optimize diagnostics without loading excessive logs.

Instrument directory and detail summary phases should be revisited only with query-plan evidence because the last directory summary attempt was not beneficial for universe.

## Performance Guardrails

- Do not add summary tables unless they reduce query complexity or network payload.
- Keep summaries refreshed in the daily schedule when they affect core pages.
- Keep detailed diagnostic/log tables in Admin, not product pages.
- Use indexes on `(portfolio_id, updated_at desc)`, `(instrument_id, date desc)`, and status/date filters where relevant.
