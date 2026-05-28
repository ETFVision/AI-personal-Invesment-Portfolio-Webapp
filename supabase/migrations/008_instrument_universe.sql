-- Curated instrument universe, watchlists, and profile tables.
-- Keeps the universe human-curated and portable across PostgreSQL deployments.

create table if not exists instruments (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  asset_class text not null,
  instrument_type text not null,
  sector text,
  industry text,
  geography text,
  currency text,
  exchange text,
  watchlist_tier text,
  benchmark_tags jsonb not null default '[]',
  thematic_tags jsonb not null default '[]',
  risk_category text,
  volatility_bucket text,
  duration_category text,
  treasury_classification text,
  inflation_linked boolean,
  credit_quality text,
  geo_exposure text,
  rate_sensitivity text,
  inflation_sensitivity text,
  recession_sensitivity text,
  liquidity_role text,
  crypto_classification text,
  metadata_last_refreshed_at timestamptz,
  provider_primary text,
  provider_metadata jsonb not null default '{}',
  source_type text not null default 'seeded',
  human_approved_at timestamptz,
  approval_status text not null default 'approved',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  watchlist_key text not null unique,
  name text not null,
  watchlist_tier text not null,
  description text,
  is_system boolean not null default true,
  is_active boolean not null default true,
  human_approval_required boolean not null default true,
  source_type text not null default 'seeded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  instrument_id uuid not null references instruments(id) on delete cascade,
  item_rank integer,
  rationale text,
  approval_status text not null default 'approved',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watchlist_id, instrument_id)
);

create table if not exists instrument_tags (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  tag text not null,
  tag_type text not null,
  source text not null default 'human',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, tag_type, tag)
);

create table if not exists bond_profiles (
  instrument_id uuid primary key references instruments(id) on delete cascade,
  duration_category text,
  treasury_classification text,
  inflation_linked boolean,
  credit_quality text,
  geo_exposure text,
  rate_sensitivity text,
  inflation_sensitivity text,
  recession_sensitivity text,
  liquidity_role text,
  currency text,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists benchmark_profiles (
  id uuid primary key default gen_random_uuid(),
  benchmark_key text not null unique,
  benchmark_name text not null,
  benchmark_type text not null,
  instrument_id uuid references instruments(id) on delete set null,
  instrument_symbol text,
  provider_symbol text,
  currency text not null default 'USD',
  base_value numeric(28, 10) not null default 100,
  components jsonb not null default '[]',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crypto_profiles (
  instrument_id uuid primary key references instruments(id) on delete cascade,
  chain text,
  market_cap_bucket text,
  custody_risk text,
  volatility_bucket text,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists metadata_refresh_logs (
  id uuid primary key default gen_random_uuid(),
  refresh_scope text not null,
  provider text not null,
  requested_count integer not null default 0,
  updated_count integer not null default 0,
  missing_count integer not null default 0,
  status text not null,
  message text,
  requested_symbols jsonb not null default '[]',
  missing_symbols jsonb not null default '[]',
  requested_by_user_id uuid references users(id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_instruments_symbol on instruments (symbol);
create index if not exists idx_instruments_asset_class on instruments (asset_class);
create index if not exists idx_instruments_active on instruments (is_active);
create index if not exists idx_instruments_watchlist_tier on instruments (watchlist_tier);
create index if not exists idx_watchlists_key on watchlists (watchlist_key);
create index if not exists idx_watchlist_items_watchlist on watchlist_items (watchlist_id, item_rank);
create index if not exists idx_watchlist_items_instrument on watchlist_items (instrument_id);
create index if not exists idx_instrument_tags_instrument on instrument_tags (instrument_id, tag_type);
create index if not exists idx_bond_profiles_duration on bond_profiles (duration_category);
create index if not exists idx_benchmark_profiles_key on benchmark_profiles (benchmark_key);
create index if not exists idx_crypto_profiles_chain on crypto_profiles (chain);
create index if not exists idx_metadata_refresh_logs_created on metadata_refresh_logs (created_at desc);

drop trigger if exists trg_instruments_updated_at on instruments;
create trigger trg_instruments_updated_at before update on instruments for each row execute function set_updated_at();

drop trigger if exists trg_watchlists_updated_at on watchlists;
create trigger trg_watchlists_updated_at before update on watchlists for each row execute function set_updated_at();

drop trigger if exists trg_watchlist_items_updated_at on watchlist_items;
create trigger trg_watchlist_items_updated_at before update on watchlist_items for each row execute function set_updated_at();

drop trigger if exists trg_instrument_tags_updated_at on instrument_tags;
create trigger trg_instrument_tags_updated_at before update on instrument_tags for each row execute function set_updated_at();

drop trigger if exists trg_bond_profiles_updated_at on bond_profiles;
create trigger trg_bond_profiles_updated_at before update on bond_profiles for each row execute function set_updated_at();

drop trigger if exists trg_benchmark_profiles_updated_at on benchmark_profiles;
create trigger trg_benchmark_profiles_updated_at before update on benchmark_profiles for each row execute function set_updated_at();

drop trigger if exists trg_crypto_profiles_updated_at on crypto_profiles;
create trigger trg_crypto_profiles_updated_at before update on crypto_profiles for each row execute function set_updated_at();

alter table instruments enable row level security;
alter table watchlists enable row level security;
alter table watchlist_items enable row level security;
alter table instrument_tags enable row level security;
alter table bond_profiles enable row level security;
alter table benchmark_profiles enable row level security;
alter table crypto_profiles enable row level security;
alter table metadata_refresh_logs enable row level security;

create policy "users can read instruments" on instruments for select using (true);
create policy "users can read watchlists" on watchlists for select using (true);
create policy "users can read watchlist items" on watchlist_items for select using (true);
create policy "users can read instrument tags" on instrument_tags for select using (true);
create policy "users can read bond profiles" on bond_profiles for select using (true);
create policy "users can read benchmark profiles" on benchmark_profiles for select using (true);
create policy "users can read crypto profiles" on crypto_profiles for select using (true);
create policy "users can read metadata refresh logs" on metadata_refresh_logs for select using (true);

insert into instruments (symbol, name, asset_class, instrument_type, sector, industry, geography, currency, exchange, watchlist_tier, benchmark_tags, thematic_tags, risk_category, volatility_bucket, duration_category, treasury_classification, inflation_linked, credit_quality, geo_exposure, rate_sensitivity, inflation_sensitivity, recession_sensitivity, liquidity_role, crypto_classification, provider_primary, provider_metadata, is_active, source_type)
values
  ('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '["sp500"]'::jsonb, '["broad-market"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VOO', 'Vanguard S&P 500 ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '["sp500"]'::jsonb, '["broad-market"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('IVV', 'iShares Core S&P 500 ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '["sp500"]'::jsonb, '["broad-market"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VTI', 'Vanguard Total Stock Market ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["broad-market"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VT', 'Vanguard Total World Stock ETF', 'etf', 'etf', 'ETF', 'ETF', 'Global', 'USD', 'NYSE Arca', null, '["global-equities"]'::jsonb, '["global"]'::jsonb, null, null, null, null, null, null, 'Global', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VXUS', 'Vanguard Total International Stock ETF', 'etf', 'etf', 'ETF', 'ETF', 'International', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["global"]'::jsonb, null, null, null, null, null, null, 'International', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VEA', 'Vanguard FTSE Developed Markets ETF', 'etf', 'etf', 'ETF', 'ETF', 'Developed Markets', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["global"]'::jsonb, null, null, null, null, null, null, 'Developed Markets', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('ACWI', 'iShares MSCI ACWI ETF', 'etf', 'etf', 'ETF', 'ETF', 'Global', 'USD', 'NYSE Arca', null, '["global-equities"]'::jsonb, '["global"]'::jsonb, null, null, null, null, null, null, 'Global', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VWO', 'Vanguard FTSE Emerging Markets ETF', 'etf', 'etf', 'ETF', 'ETF', 'Emerging Markets', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["emerging-markets"]'::jsonb, null, null, null, null, null, null, 'Emerging Markets', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('IEMG', 'iShares Core MSCI Emerging Markets ETF', 'etf', 'etf', 'ETF', 'ETF', 'Emerging Markets', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["emerging-markets"]'::jsonb, null, null, null, null, null, null, 'Emerging Markets', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('QQQ', 'Invesco QQQ Trust', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NASDAQ', null, '["nasdaq-100"]'::jsonb, '["growth", "technology"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VGT', 'Vanguard Information Technology ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["technology"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XLK', 'Technology Select Sector SPDR Fund', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["technology"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('SMH', 'VanEck Semiconductor ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NASDAQ', null, '[]'::jsonb, '["semiconductors", "ai"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('SOXX', 'iShares Semiconductor ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NASDAQ', null, '[]'::jsonb, '["semiconductors", "ai"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('SCHD', 'Schwab U.S. Dividend Equity ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["dividend", "defensive"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VIG', 'Vanguard Dividend Appreciation ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["dividend", "defensive"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XLP', 'Consumer Staples Select Sector SPDR Fund', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["defensive", "consumer"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XLU', 'Utilities Select Sector SPDR Fund', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["defensive", "utilities"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XLV', 'Health Care Select Sector SPDR Fund', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["healthcare"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VHT', 'Vanguard Health Care ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["healthcare"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XLF', 'Financial Select Sector SPDR Fund', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["financials"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XLE', 'Energy Select Sector SPDR Fund', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["energy"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('VNQ', 'Vanguard Real Estate ETF', 'etf', 'etf', 'ETF', 'ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["reits", "real-estate"]'::jsonb, null, null, null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('BND', 'Vanguard Total Bond Market ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "stability"]'::jsonb, 'fixed_income', 'low', 'aggregate', 'aggregate', false, 'investment_grade', 'United States', 'medium', 'medium', 'low', 'stability', null, null, '{}'::jsonb, true, 'seeded'),
  ('AGG', 'iShares Core U.S. Aggregate Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "stability"]'::jsonb, 'fixed_income', 'low', 'aggregate', 'aggregate', false, 'investment_grade', 'United States', 'medium', 'medium', 'low', 'stability', null, null, '{}'::jsonb, true, 'seeded'),
  ('SHY', 'iShares 1-3 Year Treasury Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "cash-like"]'::jsonb, 'fixed_income', 'low', 'short', 'treasury', false, 'treasury', 'United States', 'low', 'low', 'very_low', 'stability', null, null, '{}'::jsonb, true, 'seeded'),
  ('IEF', 'iShares 7-10 Year Treasury Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "stability"]'::jsonb, 'fixed_income', 'low', 'intermediate', 'treasury', false, 'treasury', 'United States', 'medium', 'medium', 'very_low', 'stability', null, null, '{}'::jsonb, true, 'seeded'),
  ('TLT', 'iShares 20+ Year Treasury Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "duration"]'::jsonb, 'fixed_income', 'medium', 'long', 'treasury', false, 'treasury', 'United States', 'high', 'high', 'very_low', 'stability', null, null, '{}'::jsonb, true, 'seeded'),
  ('TIP', 'iShares TIPS Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "inflation-hedge"]'::jsonb, 'fixed_income', 'low', 'intermediate', 'treasury', true, 'treasury', 'United States', 'medium', 'low', 'very_low', 'inflation-hedge', null, null, '{}'::jsonb, true, 'seeded'),
  ('LQD', 'iShares iBoxx $ Investment Grade Corporate Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "income"]'::jsonb, 'fixed_income', 'low', 'intermediate', 'corporate', false, 'investment_grade', 'United States', 'medium', 'medium', 'low', 'income', null, null, '{}'::jsonb, true, 'seeded'),
  ('HYG', 'iShares iBoxx $ High Yield Corporate Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["bond", "income"]'::jsonb, 'fixed_income', 'medium', 'short', 'corporate', false, 'high_yield', 'United States', 'medium', 'medium', 'medium', 'income', null, null, '{}'::jsonb, true, 'seeded'),
  ('SGOV', 'iShares 0-3 Month Treasury Bond ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["cash-like"]'::jsonb, 'fixed_income', 'very_low', 'ultra-short', 'treasury', false, 'treasury', 'United States', 'very_low', 'very_low', 'very_low', 'cash-like', null, null, '{}'::jsonb, true, 'seeded'),
  ('BIL', 'SPDR Bloomberg 1-3 Month T-Bill ETF', 'bond_etf', 'etf', 'Fixed Income', 'Bond ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["cash-like"]'::jsonb, 'fixed_income', 'very_low', 'ultra-short', 'treasury', false, 'treasury', 'United States', 'very_low', 'very_low', 'very_low', 'cash-like', null, null, '{}'::jsonb, true, 'seeded'),
  ('GLD', 'SPDR Gold Shares', 'gold_etf', 'etf', 'Commodities', 'Gold ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["gold", "inflation-hedge"]'::jsonb, 'commodity', 'medium', null, null, null, null, 'United States', null, null, null, 'inflation-hedge', null, null, '{}'::jsonb, true, 'seeded'),
  ('IAU', 'iShares Gold Trust', 'gold_etf', 'etf', 'Commodities', 'Gold ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["gold", "inflation-hedge"]'::jsonb, 'commodity', 'medium', null, null, null, null, 'United States', null, null, null, 'inflation-hedge', null, null, '{}'::jsonb, true, 'seeded'),
  ('IBIT', 'iShares Bitcoin Trust ETF', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'NYSE Arca', null, '["bitcoin"]'::jsonb, '["crypto", "spot-bitcoin"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-bitcoin', null, '{"underlying":"Bitcoin"}'::jsonb, true, 'seeded'),
  ('FBTC', 'Fidelity Wise Origin Bitcoin Fund', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'Cboe BZX', null, '["bitcoin"]'::jsonb, '["crypto", "spot-bitcoin"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-bitcoin', null, '{"underlying":"Bitcoin"}'::jsonb, true, 'seeded'),
  ('ETHA', 'iShares Ethereum Trust ETF', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'NASDAQ', null, '[]'::jsonb, '["crypto", "spot-ethereum"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-ethereum', null, '{"underlying":"Ethereum"}'::jsonb, true, 'seeded'),
  ('FETH', 'Fidelity Ethereum Fund', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'Cboe BZX', null, '[]'::jsonb, '["crypto", "spot-ethereum"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-ethereum', null, '{"underlying":"Ethereum"}'::jsonb, true, 'seeded'),
  ('BSOL', 'Bitwise Solana Staking ETF', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["crypto", "spot-solana"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-solana', null, '{"underlying":"Solana"}'::jsonb, true, 'seeded'),
  ('BTC', 'Bitcoin', 'crypto', 'crypto', 'Digital Assets', 'Crypto', 'Global', 'USD', 'Crypto', null, '["bitcoin"]'::jsonb, '["store-of-value"]'::jsonb, 'crypto', 'high', null, null, null, null, 'Global', null, null, null, 'store-of-value', 'store-of-value', null, '{"chain":"Bitcoin"}'::jsonb, false, 'seeded'),
  ('ETH', 'Ethereum', 'crypto', 'crypto', 'Digital Assets', 'Crypto', 'Global', 'USD', 'Crypto', null, '[]'::jsonb, '["smart-contract"]'::jsonb, 'crypto', 'high', null, null, null, null, 'Global', null, null, null, 'smart-contract', 'smart-contract', null, '{"chain":"Ethereum"}'::jsonb, false, 'seeded'),
  ('SOL', 'Solana', 'crypto', 'crypto', 'Digital Assets', 'Crypto', 'Global', 'USD', 'Crypto', null, '[]'::jsonb, '["smart-contract"]'::jsonb, 'crypto', 'high', null, null, null, null, 'Global', null, null, null, 'smart-contract', 'smart-contract', null, '{"chain":"Solana"}'::jsonb, false, 'seeded'),
  ('AAPL', 'Apple', 'stock', 'stock', 'Technology', 'Consumer Electronics', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["quality", "technology"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('MSFT', 'Microsoft', 'stock', 'stock', 'Technology', 'Software', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["quality", "technology", "cloud"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('NVDA', 'NVIDIA', 'stock', 'stock', 'Technology', 'Semiconductors', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["ai", "semiconductors", "growth"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('GOOGL', 'Alphabet', 'stock', 'stock', 'Communication Services', 'Internet Content', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["quality", "technology", "advertising"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('META', 'Meta Platforms', 'stock', 'stock', 'Communication Services', 'Internet Content', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["quality", "technology", "advertising"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('AMZN', 'Amazon', 'stock', 'stock', 'Consumer Discretionary', 'Internet Retail', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["quality", "consumer", "cloud"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('AMD', 'Advanced Micro Devices', 'stock', 'stock', 'Technology', 'Semiconductors', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["semiconductors", "ai", "growth"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('TSM', 'Taiwan Semiconductor Manufacturing', 'stock', 'stock', 'Technology', 'Semiconductor Equipment', 'Taiwan', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["semiconductors", "ai"]'::jsonb, 'equity', 'medium', null, null, null, null, 'Taiwan', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('ASML', 'ASML Holding', 'stock', 'stock', 'Technology', 'Semiconductor Equipment', 'Netherlands', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["semiconductors", "equipment"]'::jsonb, 'equity', 'medium', null, null, null, null, 'Netherlands', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('JPM', 'JPMorgan Chase', 'stock', 'stock', 'Financials', 'Banks', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["financials", "quality"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('GS', 'Goldman Sachs', 'stock', 'stock', 'Financials', 'Capital Markets', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["financials"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('LLY', 'Eli Lilly', 'stock', 'stock', 'Healthcare', 'Pharmaceuticals', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["healthcare", "quality"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('UNH', 'UnitedHealth Group', 'stock', 'stock', 'Healthcare', 'Managed Health Care', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["healthcare", "quality"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('JNJ', 'Johnson & Johnson', 'stock', 'stock', 'Healthcare', 'Pharmaceuticals', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["healthcare", "defensive"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('COST', 'Costco Wholesale', 'stock', 'stock', 'Consumer Staples', 'Discount Stores', 'United States', 'USD', 'NASDAQ', 'core_quality', '[]'::jsonb, '["consumer", "quality"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('PG', 'Procter & Gamble', 'stock', 'stock', 'Consumer Staples', 'Household Products', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["consumer", "defensive"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('KO', 'Coca-Cola', 'stock', 'stock', 'Consumer Staples', 'Beverages', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["consumer", "defensive"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('XOM', 'Exxon Mobil', 'stock', 'stock', 'Energy', 'Oil & Gas', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["energy", "dividend"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('CVX', 'Chevron', 'stock', 'stock', 'Energy', 'Oil & Gas', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["energy", "dividend"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('CAT', 'Caterpillar', 'stock', 'stock', 'Industrials', 'Farm & Heavy Construction Machinery', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["industrials"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('GE', 'GE Aerospace', 'stock', 'stock', 'Industrials', 'Aerospace & Defense', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["industrials"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('V', 'Visa', 'stock', 'stock', 'Financials', 'Credit Services', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["financials", "payments"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('MA', 'Mastercard', 'stock', 'stock', 'Financials', 'Credit Services', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["financials", "payments"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('HD', 'Home Depot', 'stock', 'stock', 'Consumer Discretionary', 'Home Improvement Retail', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["consumer", "quality"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('MRK', 'Merck', 'stock', 'stock', 'Healthcare', 'Pharmaceuticals', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["healthcare", "defensive"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('ORCL', 'Oracle', 'stock', 'stock', 'Technology', 'Software', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["technology", "software"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('IBM', 'IBM', 'stock', 'stock', 'Technology', 'IT Services', 'United States', 'USD', 'NYSE', 'core_quality', '[]'::jsonb, '["technology", "defensive"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('AVGO', 'Broadcom', 'stock', 'stock', 'Technology', 'Semiconductors', 'United States', 'USD', 'NASDAQ', 'tactical_thematic', '[]'::jsonb, '["ai", "semiconductors"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('ANET', 'Arista Networks', 'stock', 'stock', 'Technology', 'Networking', 'United States', 'USD', 'NYSE', 'tactical_thematic', '[]'::jsonb, '["ai", "infrastructure"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('PANW', 'Palo Alto Networks', 'stock', 'stock', 'Technology', 'Software', 'United States', 'USD', 'NASDAQ', 'tactical_thematic', '[]'::jsonb, '["cybersecurity"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('CRWD', 'CrowdStrike', 'stock', 'stock', 'Technology', 'Software', 'United States', 'USD', 'NASDAQ', 'tactical_thematic', '[]'::jsonb, '["cybersecurity"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('ISRG', 'Intuitive Surgical', 'stock', 'stock', 'Healthcare', 'Medical Devices', 'United States', 'USD', 'NASDAQ', 'tactical_thematic', '[]'::jsonb, '["healthcare", "medical-devices"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('ABBV', 'AbbVie', 'stock', 'stock', 'Healthcare', 'Pharmaceuticals', 'United States', 'USD', 'NYSE', 'tactical_thematic', '[]'::jsonb, '["healthcare", "biotech"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('NEE', 'NextEra Energy', 'stock', 'stock', 'Utilities', 'Electric Utilities', 'United States', 'USD', 'NYSE', 'tactical_thematic', '[]'::jsonb, '["energy-transition", "utilities"]'::jsonb, 'equity', 'low', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('NFLX', 'Netflix', 'stock', 'stock', 'Communication Services', 'Entertainment', 'United States', 'USD', 'NASDAQ', 'tactical_thematic', '[]'::jsonb, '["consumer-digital"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('SHOP', 'Shopify', 'stock', 'stock', 'Technology', 'Software', 'Canada', 'USD', 'NYSE', 'tactical_thematic', '[]'::jsonb, '["consumer-digital"]'::jsonb, 'equity', 'high', null, null, null, null, 'Canada', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('PYPL', 'PayPal', 'stock', 'stock', 'Financials', 'Credit Services', 'United States', 'USD', 'NASDAQ', 'opportunistic', '[]'::jsonb, '["payments"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('DIS', 'Walt Disney', 'stock', 'stock', 'Communication Services', 'Entertainment', 'United States', 'USD', 'NYSE', 'opportunistic', '[]'::jsonb, '["consumer"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('BA', 'Boeing', 'stock', 'stock', 'Industrials', 'Aerospace & Defense', 'United States', 'USD', 'NYSE', 'opportunistic', '[]'::jsonb, '["industrials"]'::jsonb, 'equity', 'high', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('NKE', 'Nike', 'stock', 'stock', 'Consumer Discretionary', 'Footwear', 'United States', 'USD', 'NYSE', 'opportunistic', '[]'::jsonb, '["consumer"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded'),
  ('INTC', 'Intel', 'stock', 'stock', 'Technology', 'Semiconductors', 'United States', 'USD', 'NASDAQ', 'opportunistic', '[]'::jsonb, '["semiconductors"]'::jsonb, 'equity', 'medium', null, null, null, null, 'United States', null, null, null, null, null, null, '{}'::jsonb, true, 'seeded')
on conflict (symbol) do update
set
  name = excluded.name,
  asset_class = excluded.asset_class,
  instrument_type = excluded.instrument_type,
  sector = excluded.sector,
  industry = excluded.industry,
  geography = excluded.geography,
  currency = excluded.currency,
  exchange = excluded.exchange,
  watchlist_tier = excluded.watchlist_tier,
  benchmark_tags = excluded.benchmark_tags,
  thematic_tags = excluded.thematic_tags,
  risk_category = excluded.risk_category,
  volatility_bucket = excluded.volatility_bucket,
  duration_category = excluded.duration_category,
  treasury_classification = excluded.treasury_classification,
  inflation_linked = excluded.inflation_linked,
  credit_quality = excluded.credit_quality,
  geo_exposure = excluded.geo_exposure,
  rate_sensitivity = excluded.rate_sensitivity,
  inflation_sensitivity = excluded.inflation_sensitivity,
  recession_sensitivity = excluded.recession_sensitivity,
  liquidity_role = excluded.liquidity_role,
  crypto_classification = excluded.crypto_classification,
  provider_primary = excluded.provider_primary,
  provider_metadata = excluded.provider_metadata,
  source_type = excluded.source_type,
  is_active = excluded.is_active;

insert into watchlists (watchlist_key, name, watchlist_tier, description, is_system, is_active, human_approval_required, source_type)
values
  ('core_quality', 'Core Quality Watchlist', 'core_quality', 'Long-term high-quality businesses with durable franchises.', true, true, true, 'seeded'),
  ('tactical_thematic', 'Tactical / Thematic Watchlist', 'tactical_thematic', 'Theme-driven names that are higher conviction but more cyclical.', true, true, true, 'seeded'),
  ('opportunistic', 'Opportunistic Watchlist', 'opportunistic', 'Smaller, lower-conviction ideas kept for future review.', true, true, true, 'seeded')
on conflict (watchlist_key) do update
set
  name = excluded.name,
  watchlist_tier = excluded.watchlist_tier,
  description = excluded.description,
  is_system = excluded.is_system,
  is_active = excluded.is_active,
  human_approval_required = excluded.human_approval_required,
  source_type = excluded.source_type;

insert into watchlist_items (watchlist_id, instrument_id, item_rank, rationale, approval_status, is_active)
select w.id, i.id, v.item_rank, null, 'approved', true
from (
  values
    ('core_quality', 'AAPL', 1),
    ('core_quality', 'MSFT', 2),
    ('core_quality', 'NVDA', 3),
    ('core_quality', 'GOOGL', 4),
    ('core_quality', 'META', 5),
    ('core_quality', 'AMZN', 6),
    ('core_quality', 'AMD', 7),
    ('core_quality', 'TSM', 8),
    ('core_quality', 'ASML', 9),
    ('core_quality', 'JPM', 10),
    ('core_quality', 'GS', 11),
    ('core_quality', 'LLY', 12),
    ('core_quality', 'UNH', 13),
    ('core_quality', 'JNJ', 14),
    ('core_quality', 'COST', 15),
    ('core_quality', 'PG', 16),
    ('core_quality', 'KO', 17),
    ('core_quality', 'XOM', 18),
    ('core_quality', 'CVX', 19),
    ('core_quality', 'CAT', 20),
    ('core_quality', 'GE', 21),
    ('core_quality', 'V', 22),
    ('core_quality', 'MA', 23),
    ('core_quality', 'HD', 24),
    ('core_quality', 'MRK', 25),
    ('core_quality', 'ORCL', 26),
    ('core_quality', 'IBM', 27),
    ('tactical_thematic', 'AVGO', 1),
    ('tactical_thematic', 'ANET', 2),
    ('tactical_thematic', 'PANW', 3),
    ('tactical_thematic', 'CRWD', 4),
    ('tactical_thematic', 'ISRG', 5),
    ('tactical_thematic', 'ABBV', 6),
    ('tactical_thematic', 'NEE', 7),
    ('tactical_thematic', 'NFLX', 8),
    ('tactical_thematic', 'SHOP', 9),
    ('opportunistic', 'PYPL', 1),
    ('opportunistic', 'DIS', 2),
    ('opportunistic', 'BA', 3),
    ('opportunistic', 'NKE', 4),
    ('opportunistic', 'INTC', 5)
) as v(watchlist_key, symbol, item_rank)
join watchlists w on w.watchlist_key = v.watchlist_key
join instruments i on i.symbol = v.symbol
on conflict (watchlist_id, instrument_id) do update
set
  item_rank = excluded.item_rank,
  approval_status = excluded.approval_status,
  is_active = excluded.is_active;

insert into benchmark_profiles (benchmark_key, benchmark_name, benchmark_type, instrument_id, instrument_symbol, provider_symbol, currency, base_value, components, notes, is_active)
select v.benchmark_key, v.benchmark_name, v.benchmark_type, i.id, v.instrument_symbol, v.provider_symbol, v.currency, v.base_value, v.components, v.notes, true
from (
  values
    ('sp500', 'S&P 500', 'equity', 'SPY', 'SPY', 'USD', 100, '[]'::jsonb, 'S&P 500 ETF proxy'),
    ('nasdaq100', 'Nasdaq 100', 'equity', 'QQQ', 'QQQ', 'USD', 100, '[]'::jsonb, 'Nasdaq 100 ETF proxy'),
    ('global_equities', 'Global equities', 'equity', 'VT', 'VT', 'USD', 100, '[]'::jsonb, 'Global equities ETF proxy'),
    ('us_aggregate_bonds', 'US aggregate bonds', 'bond', 'BND', 'BND', 'USD', 100, '[]'::jsonb, 'US aggregate bond ETF proxy'),
    ('gold', 'Gold', 'commodity', 'GLD', 'GLD', 'USD', 100, '[]'::jsonb, 'Gold ETF proxy'),
    ('bitcoin', 'Bitcoin', 'crypto', 'BTC', 'BTCUSD', 'USD', 100, '[]'::jsonb, 'Bitcoin spot proxy')
) as v(benchmark_key, benchmark_name, benchmark_type, instrument_symbol, provider_symbol, currency, base_value, components, notes)
join instruments i on i.symbol = v.instrument_symbol
on conflict (benchmark_key) do update
set
  benchmark_name = excluded.benchmark_name,
  benchmark_type = excluded.benchmark_type,
  instrument_id = excluded.instrument_id,
  instrument_symbol = excluded.instrument_symbol,
  provider_symbol = excluded.provider_symbol,
  currency = excluded.currency,
  base_value = excluded.base_value,
  components = excluded.components,
  notes = excluded.notes,
  is_active = excluded.is_active;

insert into benchmark_profiles (benchmark_key, benchmark_name, benchmark_type, instrument_id, instrument_symbol, provider_symbol, currency, base_value, components, notes, is_active)
values
  ('sixty_forty', '60/40 portfolio proxy', 'composite', null, null, null, 'USD', 100, '[{"symbol":"SPY","weight":0.6},{"symbol":"AGG","weight":0.4}]'::jsonb, '60% S&P 500 + 40% US aggregate bonds', true)
on conflict (benchmark_key) do update
set
  benchmark_name = excluded.benchmark_name,
  benchmark_type = excluded.benchmark_type,
  instrument_id = excluded.instrument_id,
  instrument_symbol = excluded.instrument_symbol,
  provider_symbol = excluded.provider_symbol,
  currency = excluded.currency,
  base_value = excluded.base_value,
  components = excluded.components,
  notes = excluded.notes,
  is_active = excluded.is_active;

insert into bond_profiles (instrument_id, duration_category, treasury_classification, inflation_linked, credit_quality, geo_exposure, rate_sensitivity, inflation_sensitivity, recession_sensitivity, liquidity_role, currency, provider_metadata)
select i.id, v.duration_category, v.treasury_classification, v.inflation_linked, v.credit_quality, v.geo_exposure, v.rate_sensitivity, v.inflation_sensitivity, v.recession_sensitivity, v.liquidity_role, v.currency, '{}'::jsonb
from (
  values
    ('BND', 'aggregate', 'aggregate', false, 'investment_grade', 'United States', 'medium', 'medium', 'low', 'stability', 'USD'),
    ('AGG', 'aggregate', 'aggregate', false, 'investment_grade', 'United States', 'medium', 'medium', 'low', 'stability', 'USD'),
    ('SHY', 'short', 'treasury', false, 'treasury', 'United States', 'low', 'low', 'very_low', 'stability', 'USD'),
    ('IEF', 'intermediate', 'treasury', false, 'treasury', 'United States', 'medium', 'medium', 'very_low', 'stability', 'USD'),
    ('TLT', 'long', 'treasury', false, 'treasury', 'United States', 'high', 'high', 'very_low', 'stability', 'USD'),
    ('TIP', 'intermediate', 'treasury', true, 'treasury', 'United States', 'medium', 'low', 'very_low', 'inflation-hedge', 'USD'),
    ('LQD', 'intermediate', 'corporate', false, 'investment_grade', 'United States', 'medium', 'medium', 'low', 'income', 'USD'),
    ('HYG', 'short', 'corporate', false, 'high_yield', 'United States', 'medium', 'medium', 'medium', 'income', 'USD'),
    ('SGOV', 'ultra-short', 'treasury', false, 'treasury', 'United States', 'very_low', 'very_low', 'very_low', 'cash-like', 'USD'),
    ('BIL', 'ultra-short', 'treasury', false, 'treasury', 'United States', 'very_low', 'very_low', 'very_low', 'cash-like', 'USD')
) as v(symbol, duration_category, treasury_classification, inflation_linked, credit_quality, geo_exposure, rate_sensitivity, inflation_sensitivity, recession_sensitivity, liquidity_role, currency)
join instruments i on i.symbol = v.symbol
on conflict (instrument_id) do update
set
  duration_category = excluded.duration_category,
  treasury_classification = excluded.treasury_classification,
  inflation_linked = excluded.inflation_linked,
  credit_quality = excluded.credit_quality,
  geo_exposure = excluded.geo_exposure,
  rate_sensitivity = excluded.rate_sensitivity,
  inflation_sensitivity = excluded.inflation_sensitivity,
  recession_sensitivity = excluded.recession_sensitivity,
  liquidity_role = excluded.liquidity_role,
  currency = excluded.currency,
  provider_metadata = excluded.provider_metadata;

insert into crypto_profiles (instrument_id, chain, market_cap_bucket, custody_risk, volatility_bucket, provider_metadata)
select i.id, v.chain, v.market_cap_bucket, v.custody_risk, v.volatility_bucket, v.provider_metadata
from (
  values
    ('BTC', 'Bitcoin', 'large-cap', 'medium', 'high', '{"classification":"store-of-value"}'::jsonb),
    ('ETH', 'Ethereum', 'large-cap', 'medium', 'high', '{"classification":"smart-contract"}'::jsonb),
    ('SOL', 'Solana', 'mid-cap', 'medium', 'high', '{"classification":"smart-contract"}'::jsonb)
) as v(symbol, chain, market_cap_bucket, custody_risk, volatility_bucket, provider_metadata)
join instruments i on i.symbol = v.symbol
on conflict (instrument_id) do update
set
  chain = excluded.chain,
  market_cap_bucket = excluded.market_cap_bucket,
  custody_risk = excluded.custody_risk,
  volatility_bucket = excluded.volatility_bucket,
  provider_metadata = excluded.provider_metadata;

insert into instrument_tags (instrument_id, tag, tag_type, source, is_active)
select i.id, benchmark_tag.tag, 'benchmark', 'seeded', true
from instruments i
cross join lateral jsonb_array_elements_text(i.benchmark_tags) as benchmark_tag(tag)
on conflict (instrument_id, tag_type, tag) do update
set source = excluded.source,
    is_active = excluded.is_active;

insert into instrument_tags (instrument_id, tag, tag_type, source, is_active)
select i.id, thematic_tag.tag, 'thematic', 'seeded', true
from instruments i
cross join lateral jsonb_array_elements_text(i.thematic_tags) as thematic_tag(tag)
on conflict (instrument_id, tag_type, tag) do update
set source = excluded.source,
    is_active = excluded.is_active;
