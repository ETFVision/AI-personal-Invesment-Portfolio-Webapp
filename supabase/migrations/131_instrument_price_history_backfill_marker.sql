-- Track the deepest raw price-history backfill target attempted for each instrument.
--
-- This lets forced deep backfills converge when a provider returns less than
-- the requested 20-year window; each instrument can be attempted once for a
-- target depth and then skipped on later passes.

alter table instruments
  add column if not exists price_history_backfilled_through date;
