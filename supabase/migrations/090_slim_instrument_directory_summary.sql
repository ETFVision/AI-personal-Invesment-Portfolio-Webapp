alter table instrument_directory_summary
  add column if not exists currency text,
  add column if not exists exchange text,
  add column if not exists sector text,
  add column if not exists canonical_sector text,
  add column if not exists canonical_themes jsonb not null default '[]'::jsonb,
  add column if not exists benchmark_tags jsonb not null default '[]'::jsonb,
  add column if not exists risk_category text,
  add column if not exists volatility_bucket text,
  add column if not exists latest_price numeric,
  add column if not exists ytd_return numeric,
  add column if not exists one_year_return numeric,
  add column if not exists three_year_return numeric,
  add column if not exists five_year_return numeric,
  add column if not exists fifty_two_week_low numeric,
  add column if not exists fifty_two_week_high numeric,
  add column if not exists liquidity text,
  add column if not exists freshness_label text,
  add column if not exists freshness_tone text,
  add column if not exists price_observation_count integer not null default 0,
  add column if not exists price_history_start date,
  add column if not exists price_history_end date,
  add column if not exists fundamentals_overall_score numeric,
  add column if not exists fundamentals_valuation_score numeric,
  add column if not exists fundamentals_quality_score numeric,
  add column if not exists fundamentals_last_refreshed_at timestamptz,
  add column if not exists is_watchlisted boolean not null default false,
  add column if not exists active_watchlist_tiers text[] not null default array[]::text[];

create index if not exists idx_instrument_directory_summary_watchlisted
  on instrument_directory_summary (is_watchlisted, is_active, symbol);

create index if not exists idx_instrument_directory_summary_watchlist_tiers
  on instrument_directory_summary using gin (active_watchlist_tiers);
