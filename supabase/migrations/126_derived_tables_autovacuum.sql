-- Tighten autovacuum on the high-write derived-metric tables so their
-- visibility maps stay current under the daily refresh + seed/backfill write
-- volume. Without this, after a batch of writes the index-only scans in the
-- coverage-stats aggregates (e.g. list_instrument_daily_return_stats, the
-- admin Data Sources coverage cards) fall back to tens of thousands of heap
-- fetches and exceed Supabase's statement_timeout, erroring the page.
--
-- Mirrors migration 122 (instrument_prices). instrument_daily_returns gets the
-- tighter 0.02 (largest, most-written, full-history rows); the per-instrument
-- metric tables use 0.05. Apply manually to Supabase.

alter table instrument_daily_returns set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);

alter table instrument_return_anchors set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

alter table instrument_market_metrics set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

alter table instrument_risk_metrics set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);
