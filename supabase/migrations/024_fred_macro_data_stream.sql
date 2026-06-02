-- FRED macro data stream foundation.
-- Extends the Market Vision macro placeholder table with provider-neutral macro history,
-- trend, regime, and ingestion-log tables.

alter table macro_indicators
  add column if not exists frequency text,
  add column if not exists description text,
  add column if not exists is_active boolean not null default true;

create table if not exists macro_observations (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references macro_indicators(id) on delete cascade,
  observation_date date not null,
  value numeric(28, 10),
  source_provider text not null,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint macro_observations_indicator_date_key unique (indicator_id, observation_date)
);

create table if not exists macro_trends (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references macro_indicators(id) on delete cascade,
  as_of_date date not null,
  latest_value numeric(28, 10),
  previous_value numeric(28, 10),
  change_value numeric(28, 10),
  change_percent numeric(18, 10),
  one_month_change numeric(28, 10),
  three_month_change numeric(28, 10),
  six_month_change numeric(28, 10),
  one_year_change numeric(28, 10),
  direction text not null default 'insufficient_data',
  acceleration text not null default 'insufficient_data',
  persistence_score integer not null default 0,
  severity_score integer not null default 0,
  confidence_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint macro_trends_indicator_date_key unique (indicator_id, as_of_date),
  constraint macro_trends_direction_check check (direction in ('rising', 'falling', 'stable', 'insufficient_data')),
  constraint macro_trends_acceleration_check check (acceleration in ('accelerating', 'decelerating', 'stable', 'insufficient_data')),
  constraint macro_trends_score_bounds check (
    persistence_score between 0 and 100 and
    severity_score between 0 and 100 and
    confidence_score between 0 and 100
  )
);

create table if not exists macro_regime_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  rates_regime text not null default 'insufficient_data',
  inflation_regime text not null default 'insufficient_data',
  growth_regime text not null default 'insufficient_data',
  employment_regime text not null default 'insufficient_data',
  yield_curve_regime text not null default 'insufficient_data',
  liquidity_regime text not null default 'insufficient_data',
  dollar_regime text not null default 'insufficient_data',
  commodities_regime text not null default 'insufficient_data',
  overall_macro_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists macro_ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  source_provider text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  indicators_requested integer not null default 0,
  indicators_successful integer not null default 0,
  indicators_failed integer not null default 0,
  observations_inserted integer not null default 0,
  observations_updated integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint macro_ingestion_logs_status_check check (status in ('success', 'partial_success', 'failed'))
);

create index if not exists idx_macro_indicators_active on macro_indicators (is_active);
create index if not exists idx_macro_indicators_source_category on macro_indicators (source_provider, category);
create index if not exists idx_macro_observations_date on macro_observations (observation_date desc);
create index if not exists idx_macro_observations_indicator_date on macro_observations (indicator_id, observation_date desc);
create index if not exists idx_macro_trends_indicator_date on macro_trends (indicator_id, as_of_date desc);
create index if not exists idx_macro_regime_snapshots_date on macro_regime_snapshots (snapshot_date desc);
create index if not exists idx_macro_ingestion_logs_started_at on macro_ingestion_logs (started_at desc);

drop trigger if exists trg_macro_observations_updated_at on macro_observations;
create trigger trg_macro_observations_updated_at before update on macro_observations for each row execute function set_updated_at();
drop trigger if exists trg_macro_trends_updated_at on macro_trends;
create trigger trg_macro_trends_updated_at before update on macro_trends for each row execute function set_updated_at();
drop trigger if exists trg_macro_regime_snapshots_updated_at on macro_regime_snapshots;
create trigger trg_macro_regime_snapshots_updated_at before update on macro_regime_snapshots for each row execute function set_updated_at();

alter table macro_observations enable row level security;
alter table macro_trends enable row level security;
alter table macro_regime_snapshots enable row level security;
alter table macro_ingestion_logs enable row level security;

drop policy if exists "users can read macro observations" on macro_observations;
drop policy if exists "users can read macro trends" on macro_trends;
drop policy if exists "users can read macro regime snapshots" on macro_regime_snapshots;
drop policy if exists "users can read macro ingestion logs" on macro_ingestion_logs;

create policy "users can read macro observations" on macro_observations for select using (true);
create policy "users can read macro trends" on macro_trends for select using (true);
create policy "users can read macro regime snapshots" on macro_regime_snapshots for select using (true);
create policy "users can read macro ingestion logs" on macro_ingestion_logs for select using (true);

insert into macro_indicators (
  indicator_code,
  indicator_name,
  source_provider,
  category,
  unit,
  frequency,
  description,
  is_active,
  metadata
)
values
  ('FEDFUNDS', 'Effective Federal Funds Rate', 'fred', 'interest_rates', 'percent', 'monthly', 'Effective federal funds rate.', true, '{}'::jsonb),
  ('DGS2', '2-Year Treasury Yield', 'fred', 'yields', 'percent', 'daily', 'Market yield on U.S. Treasury securities at 2-year constant maturity.', true, '{}'::jsonb),
  ('DGS10', '10-Year Treasury Yield', 'fred', 'yields', 'percent', 'daily', 'Market yield on U.S. Treasury securities at 10-year constant maturity.', true, '{}'::jsonb),
  ('DGS30', '30-Year Treasury Yield', 'fred', 'yields', 'percent', 'daily', 'Market yield on U.S. Treasury securities at 30-year constant maturity.', true, '{}'::jsonb),
  ('T10Y2Y', '10Y minus 2Y Treasury Spread', 'fred', 'yields', 'percent', 'daily', '10-year Treasury constant maturity minus 2-year Treasury constant maturity.', true, '{}'::jsonb),
  ('T10Y3M', '10Y minus 3M Treasury Spread', 'fred', 'yields', 'percent', 'daily', '10-year Treasury constant maturity minus 3-month Treasury bill.', true, '{}'::jsonb),
  ('CPIAUCSL', 'Consumer Price Index', 'fred', 'inflation', 'index', 'monthly', 'Consumer Price Index for All Urban Consumers.', true, '{}'::jsonb),
  ('CPILFESL', 'Core CPI', 'fred', 'inflation', 'index', 'monthly', 'Consumer Price Index less food and energy.', true, '{}'::jsonb),
  ('PCEPI', 'PCE Price Index', 'fred', 'inflation', 'index', 'monthly', 'Personal Consumption Expenditures price index.', true, '{}'::jsonb),
  ('PCEPILFE', 'Core PCE Price Index', 'fred', 'inflation', 'index', 'monthly', 'PCE price index excluding food and energy.', true, '{}'::jsonb),
  ('UNRATE', 'Unemployment Rate', 'fred', 'employment', 'percent', 'monthly', 'Civilian unemployment rate.', true, '{}'::jsonb),
  ('PAYEMS', 'Nonfarm Payrolls', 'fred', 'employment', 'thousands', 'monthly', 'All employees, total nonfarm.', true, '{}'::jsonb),
  ('GDP', 'Gross Domestic Product', 'fred', 'growth', 'billions_usd', 'quarterly', 'Gross Domestic Product.', true, '{}'::jsonb),
  ('INDPRO', 'Industrial Production Index', 'fred', 'growth', 'index', 'monthly', 'Industrial production index.', true, '{}'::jsonb),
  ('RSAFS', 'Retail Sales', 'fred', 'growth', 'millions_usd', 'monthly', 'Advance retail and food services sales.', true, '{}'::jsonb),
  ('WALCL', 'Fed Balance Sheet', 'fred', 'liquidity', 'millions_usd', 'weekly', 'Assets: total assets, Federal Reserve.', true, '{}'::jsonb),
  ('NFCI', 'Chicago Fed Financial Conditions Index', 'fred', 'liquidity', 'index', 'weekly', 'National Financial Conditions Index.', true, '{}'::jsonb),
  ('DTWEXBGS', 'Trade Weighted U.S. Dollar Index', 'fred', 'currency', 'index', 'daily', 'Trade weighted U.S. dollar index: broad, goods.', true, '{}'::jsonb),
  ('DCOILWTICO', 'WTI Crude Oil Price', 'fred', 'commodities', 'usd', 'daily', 'Crude oil prices: West Texas Intermediate.', true, '{}'::jsonb)
on conflict (indicator_code, source_provider) do update
set
  indicator_name = excluded.indicator_name,
  category = excluded.category,
  unit = excluded.unit,
  frequency = excluded.frequency,
  description = excluded.description,
  is_active = excluded.is_active,
  metadata = macro_indicators.metadata || excluded.metadata;
