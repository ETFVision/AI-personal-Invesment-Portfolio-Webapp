-- Derived instrument risk metrics for instrument detail pages.
-- Raw instrument_prices remains the source of truth; this table keeps reads compact.

create table if not exists instrument_risk_metrics (
  instrument_id uuid not null references instruments(id) on delete cascade,
  metric_date date not null,
  volatility_30d numeric(28, 10),
  volatility_90d numeric(28, 10),
  volatility_1y numeric(28, 10),
  volatility_trend text not null default 'insufficient_data',
  downside_volatility numeric(28, 10),
  current_drawdown numeric(28, 10),
  max_drawdown numeric(28, 10),
  drawdown_duration_days integer,
  drawdown_bucket text not null default 'insufficient_data',
  negative_return_frequency numeric(28, 10),
  worst_daily_return numeric(28, 10),
  worst_weekly_return numeric(28, 10),
  risk_score numeric(10, 4),
  risk_bucket text not null default 'insufficient_data',
  volatility_bucket text not null default 'insufficient_data',
  confidence_score numeric(10, 4) not null default 0,
  observation_count integer not null default 0,
  history_start_date date,
  history_end_date date,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (instrument_id, metric_date)
);

create index if not exists idx_instrument_risk_metrics_metric_date on instrument_risk_metrics (metric_date desc);
create index if not exists idx_instrument_risk_metrics_risk_score on instrument_risk_metrics (risk_score desc);

drop trigger if exists trg_instrument_risk_metrics_updated_at on instrument_risk_metrics;
create trigger trg_instrument_risk_metrics_updated_at before update on instrument_risk_metrics for each row execute function set_updated_at();

alter table instrument_risk_metrics enable row level security;

drop policy if exists "users can read instrument risk metrics" on instrument_risk_metrics;
create policy "users can read instrument risk metrics" on instrument_risk_metrics
  for select using (true);
