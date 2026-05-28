-- Benchmark metadata and historical series.
-- This stays portable across Supabase and Cloud SQL and is populated by application services.

create table if not exists benchmarks (
  id uuid primary key default gen_random_uuid(),
  benchmark_key text not null unique,
  name text not null,
  benchmark_type text not null,
  symbol text,
  currency text not null default 'USD',
  base_value numeric(28, 10) not null default 100,
  components jsonb not null default '[]',
  provider_primary text,
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists benchmark_snapshots (
  id uuid primary key default gen_random_uuid(),
  benchmark_id uuid not null references benchmarks(id) on delete cascade,
  snapshot_date date not null,
  close_price numeric(28, 10),
  level_value numeric(28, 10) not null,
  daily_return numeric(28, 10),
  drawdown numeric(28, 10),
  currency text not null,
  provider text not null,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (benchmark_id, snapshot_date)
);

create index if not exists idx_benchmarks_active on benchmarks (is_active);
create index if not exists idx_benchmarks_type on benchmarks (benchmark_type);
create index if not exists idx_benchmark_snapshots_benchmark_date on benchmark_snapshots (benchmark_id, snapshot_date desc);
create index if not exists idx_benchmark_snapshots_date on benchmark_snapshots (snapshot_date desc);

drop trigger if exists trg_benchmarks_updated_at on benchmarks;
create trigger trg_benchmarks_updated_at before update on benchmarks for each row execute function set_updated_at();

drop trigger if exists trg_benchmark_snapshots_updated_at on benchmark_snapshots;
create trigger trg_benchmark_snapshots_updated_at before update on benchmark_snapshots for each row execute function set_updated_at();

alter table benchmarks enable row level security;
alter table benchmark_snapshots enable row level security;

create policy "users can read benchmarks" on benchmarks
  for select using (true);

create policy "users can read benchmark snapshots" on benchmark_snapshots
  for select using (true);

insert into benchmarks (benchmark_key, name, benchmark_type, symbol, currency, base_value, components, provider_primary, metadata, is_active)
values
  ('sp500', 'S&P 500', 'equity', 'SPY', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"S&P 500 ETF proxy"}'::jsonb, true),
  ('nasdaq100', 'Nasdaq 100', 'equity', 'QQQ', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"Nasdaq 100 ETF proxy"}'::jsonb, true),
  ('global_equities', 'Global equities', 'equity', 'VT', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"Global equities ETF proxy"}'::jsonb, true),
  ('us_aggregate_bonds', 'US aggregate bonds', 'bond', 'AGG', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"US aggregate bond ETF proxy"}'::jsonb, true),
  ('gold', 'Gold', 'commodity', 'GLD', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"Gold ETF proxy"}'::jsonb, true),
  ('bitcoin', 'Bitcoin', 'crypto', 'BTCUSD', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"Bitcoin spot proxy"}'::jsonb, true),
  ('sixty_forty', '60/40 portfolio proxy', 'composite', null, 'USD', 100, '[{"symbol":"SPY","weight":0.6},{"symbol":"AGG","weight":0.4}]'::jsonb, 'financial_modeling_prep', '{"benchmark":"60% S&P 500 + 40% US aggregate bonds"}'::jsonb, true)
on conflict (benchmark_key) do update
set
  name = excluded.name,
  benchmark_type = excluded.benchmark_type,
  symbol = excluded.symbol,
  currency = excluded.currency,
  base_value = excluded.base_value,
  components = excluded.components,
  provider_primary = excluded.provider_primary,
  metadata = excluded.metadata,
  is_active = excluded.is_active;
