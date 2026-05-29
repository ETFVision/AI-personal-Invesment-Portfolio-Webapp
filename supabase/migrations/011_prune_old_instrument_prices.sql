-- Universe/watchlist screens retain five years of instrument history.
-- Benchmark history remains separate in benchmark_snapshots.

delete from instrument_prices
where price_date < current_date - interval '5 years';
