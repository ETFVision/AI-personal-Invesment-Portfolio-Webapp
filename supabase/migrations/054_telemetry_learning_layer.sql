-- Telemetry Learning Layer V1.
-- Observational only: these tables store immutable snapshots and evaluated outcomes.
-- They do not modify recommendation, portfolio review, or Market Vision logic.

create table if not exists telemetry_recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  recommendation text not null,
  recommendation_score numeric(8, 4),
  confidence_score numeric(8, 4) not null default 0,
  generated_at timestamptz not null,
  run_id uuid references recommendation_runs(id) on delete set null,
  benchmark_symbol text,
  price_at_recommendation numeric(28, 10),
  price_date date,
  positive_drivers jsonb not null default '[]'::jsonb,
  negative_drivers jsonb not null default '[]'::jsonb,
  factor_inputs jsonb not null default '{}'::jsonb,
  component_scores jsonb not null default '[]'::jsonb,
  guardrails jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists telemetry_recommendation_outcomes (
  id uuid primary key default gen_random_uuid(),
  recommendation_snapshot_id uuid not null references telemetry_recommendation_snapshots(id) on delete cascade,
  horizon text not null check (horizon in ('1m', '3m', '6m', '12m')),
  evaluation_date date not null,
  start_price numeric(28, 10),
  end_price numeric(28, 10),
  asset_return numeric(28, 10),
  benchmark_return numeric(28, 10),
  excess_return numeric(28, 10),
  success boolean,
  outcome_status text not null default 'pending' check (outcome_status in ('pending', 'evaluated', 'insufficient_data', 'stale_price', 'benchmark_missing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recommendation_snapshot_id, horizon)
);

create table if not exists telemetry_factor_outcomes (
  id uuid primary key default gen_random_uuid(),
  factor_name text not null,
  factor_value text not null,
  factor_direction text not null default 'unknown',
  horizon text not null check (horizon in ('1m', '3m', '6m', '12m')),
  observation_count integer not null default 0,
  average_asset_return numeric(28, 10),
  average_benchmark_return numeric(28, 10),
  average_excess_return numeric(28, 10),
  hit_rate numeric(8, 4),
  confidence_bucket text not null default 'insufficient_evidence',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (factor_name, factor_value, factor_direction, horizon)
);

create table if not exists telemetry_market_vision_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references market_vision_reports(id) on delete cascade,
  report_period_start date,
  report_period_end date,
  generated_at timestamptz not null,
  theme text not null,
  direction text not null check (direction in ('bullish', 'neutral', 'bearish', 'mixed')),
  confidence numeric(8, 4) not null default 0,
  severity numeric(8, 4) not null default 0,
  supporting_signal_count integer not null default 0,
  fred_signal_count integer not null default 0,
  news_signal_count integer not null default 0,
  proxy_symbol text,
  created_at timestamptz not null default now()
);

create table if not exists telemetry_market_vision_outcomes (
  id uuid primary key default gen_random_uuid(),
  market_vision_snapshot_id uuid not null references telemetry_market_vision_snapshots(id) on delete cascade,
  horizon text not null check (horizon in ('1m', '3m', '6m', '12m')),
  evaluation_date date not null,
  proxy_symbol text,
  proxy_return numeric(28, 10),
  benchmark_return numeric(28, 10),
  excess_return numeric(28, 10),
  success boolean,
  outcome_status text not null default 'pending' check (outcome_status in ('pending', 'evaluated', 'insufficient_data', 'stale_price', 'benchmark_missing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_vision_snapshot_id, horizon)
);

create table if not exists telemetry_portfolio_review_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  review_id uuid references portfolio_review_reports(id) on delete cascade,
  generated_at timestamptz not null,
  portfolio_score numeric(8, 4),
  diversification_score numeric(8, 4),
  concentration_score numeric(8, 4),
  risk_score numeric(8, 4),
  fixed_income_score numeric(8, 4),
  macro_fit_score numeric(8, 4),
  theme_exposure_summary jsonb not null default '{}'::jsonb,
  top_risks jsonb not null default '[]'::jsonb,
  improvement_suggestions jsonb not null default '[]'::jsonb,
  allocation_snapshot jsonb not null default '{}'::jsonb,
  lookthrough_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists telemetry_portfolio_review_outcomes (
  id uuid primary key default gen_random_uuid(),
  portfolio_review_snapshot_id uuid not null references telemetry_portfolio_review_snapshots(id) on delete cascade,
  horizon text not null check (horizon in ('1m', '3m', '6m', '12m')),
  evaluation_date date not null,
  portfolio_return numeric(28, 10),
  benchmark_return numeric(28, 10),
  excess_return numeric(28, 10),
  volatility_change numeric(28, 10),
  drawdown_change numeric(28, 10),
  diversification_score_change numeric(28, 10),
  concentration_score_change numeric(28, 10),
  portfolio_score_change numeric(28, 10),
  outcome_status text not null default 'pending' check (outcome_status in ('pending', 'evaluated', 'insufficient_data', 'stale_price', 'benchmark_missing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_review_snapshot_id, horizon)
);

create index if not exists idx_telemetry_recommendation_snapshots_run
  on telemetry_recommendation_snapshots (run_id, generated_at desc);
create index if not exists idx_telemetry_recommendation_snapshots_instrument
  on telemetry_recommendation_snapshots (instrument_id, generated_at desc);
create index if not exists idx_telemetry_recommendation_outcomes_status
  on telemetry_recommendation_outcomes (outcome_status, evaluation_date desc);
create index if not exists idx_telemetry_factor_outcomes_horizon
  on telemetry_factor_outcomes (horizon, confidence_bucket, average_excess_return desc);
create index if not exists idx_telemetry_market_vision_snapshots_report
  on telemetry_market_vision_snapshots (report_id, generated_at desc);
create index if not exists idx_telemetry_market_vision_outcomes_status
  on telemetry_market_vision_outcomes (outcome_status, evaluation_date desc);
create index if not exists idx_telemetry_portfolio_review_snapshots_portfolio
  on telemetry_portfolio_review_snapshots (portfolio_id, generated_at desc);
create index if not exists idx_telemetry_portfolio_review_outcomes_status
  on telemetry_portfolio_review_outcomes (outcome_status, evaluation_date desc);

drop trigger if exists trg_telemetry_recommendation_outcomes_updated_at on telemetry_recommendation_outcomes;
create trigger trg_telemetry_recommendation_outcomes_updated_at before update on telemetry_recommendation_outcomes for each row execute function set_updated_at();

drop trigger if exists trg_telemetry_factor_outcomes_updated_at on telemetry_factor_outcomes;
create trigger trg_telemetry_factor_outcomes_updated_at before update on telemetry_factor_outcomes for each row execute function set_updated_at();

drop trigger if exists trg_telemetry_market_vision_outcomes_updated_at on telemetry_market_vision_outcomes;
create trigger trg_telemetry_market_vision_outcomes_updated_at before update on telemetry_market_vision_outcomes for each row execute function set_updated_at();

drop trigger if exists trg_telemetry_portfolio_review_outcomes_updated_at on telemetry_portfolio_review_outcomes;
create trigger trg_telemetry_portfolio_review_outcomes_updated_at before update on telemetry_portfolio_review_outcomes for each row execute function set_updated_at();

alter table telemetry_recommendation_snapshots enable row level security;
alter table telemetry_recommendation_outcomes enable row level security;
alter table telemetry_factor_outcomes enable row level security;
alter table telemetry_market_vision_snapshots enable row level security;
alter table telemetry_market_vision_outcomes enable row level security;
alter table telemetry_portfolio_review_snapshots enable row level security;
alter table telemetry_portfolio_review_outcomes enable row level security;

drop policy if exists "users can read telemetry recommendation snapshots" on telemetry_recommendation_snapshots;
create policy "users can read telemetry recommendation snapshots" on telemetry_recommendation_snapshots for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read telemetry recommendation outcomes" on telemetry_recommendation_outcomes;
create policy "users can read telemetry recommendation outcomes" on telemetry_recommendation_outcomes for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read telemetry factor outcomes" on telemetry_factor_outcomes;
create policy "users can read telemetry factor outcomes" on telemetry_factor_outcomes for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read telemetry market vision snapshots" on telemetry_market_vision_snapshots;
create policy "users can read telemetry market vision snapshots" on telemetry_market_vision_snapshots for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read telemetry market vision outcomes" on telemetry_market_vision_outcomes;
create policy "users can read telemetry market vision outcomes" on telemetry_market_vision_outcomes for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read telemetry portfolio review snapshots" on telemetry_portfolio_review_snapshots;
create policy "users can read telemetry portfolio review snapshots" on telemetry_portfolio_review_snapshots for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "users can read telemetry portfolio review outcomes" on telemetry_portfolio_review_outcomes;
create policy "users can read telemetry portfolio review outcomes" on telemetry_portfolio_review_outcomes for select using (
  auth.role() = 'authenticated'
);
