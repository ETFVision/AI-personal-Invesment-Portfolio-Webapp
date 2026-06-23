-- Tighten autovacuum on instrument_prices so its visibility map stays current
-- under heavy write volume (daily EOD refresh + multi-year backfills). Without
-- this, the visibility map goes stale after large writes and the index-only scan
-- in get_instrument_price_stats() falls back to tens of thousands of heap fetches,
-- pushing the stats query past Supabase's statement_timeout (observed: ~40-64k
-- heap fetches, 4-6s). Lowering the scale factors makes autovacuum keep pages
-- all-visible so the stats RPC stays index-only and sub-second.
--
-- Applied manually to Supabase (matches the live setting already in place).

alter table instrument_prices set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);
