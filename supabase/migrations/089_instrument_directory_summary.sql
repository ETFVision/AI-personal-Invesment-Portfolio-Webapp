create table if not exists instrument_directory_summary (
  instrument_id uuid primary key references instruments(id) on delete cascade,
  symbol text,
  name text not null,
  asset_class text,
  asset_category text,
  instrument_type text,
  stock_sector text,
  etf_category text,
  is_active boolean not null default true,
  directory_search_text text not null default '',
  latest_price_date date,
  daily_return numeric,
  market_view_json jsonb not null default '{}'::jsonb,
  fundamentals_summary_json jsonb,
  watchlist_items_json jsonb not null default '[]'::jsonb,
  calculation_version text not null default 'instrument-directory-summary-v1',
  status text not null default 'fresh',
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_instrument_directory_summary_active_symbol
  on instrument_directory_summary (is_active, symbol);

create index if not exists idx_instrument_directory_summary_asset_type
  on instrument_directory_summary (asset_category, instrument_type);

create index if not exists idx_instrument_directory_summary_sector
  on instrument_directory_summary (stock_sector);

create index if not exists idx_instrument_directory_summary_etf_category
  on instrument_directory_summary (etf_category);

create index if not exists idx_instrument_directory_summary_search
  on instrument_directory_summary using gin (to_tsvector('simple', directory_search_text));
