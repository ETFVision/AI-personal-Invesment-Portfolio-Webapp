-- Fundamental trend layer.
-- Deterministic derived data from stored fundamentals only; no provider calls happen here.

create table if not exists fundamental_trends (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  metric_name text not null,
  metric_category text not null check (metric_category in ('growth', 'margin', 'profitability', 'balance_sheet', 'quality')),
  current_value numeric(28, 10),
  previous_value numeric(28, 10),
  three_period_avg numeric(28, 10),
  five_period_avg numeric(28, 10),
  short_term_trend_direction text not null check (short_term_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable')),
  short_term_trend_strength text not null check (short_term_trend_strength in ('weak', 'moderate', 'strong', 'insufficient_data', 'not_applicable')),
  short_term_trend_score numeric(10, 4),
  short_term_confidence_score numeric(10, 4) not null default 0,
  long_term_trend_direction text not null check (long_term_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable')),
  long_term_trend_strength text not null check (long_term_trend_strength in ('weak', 'moderate', 'strong', 'insufficient_data', 'not_applicable')),
  long_term_trend_score numeric(10, 4),
  long_term_confidence_score numeric(10, 4) not null default 0,
  overall_trend_direction text not null check (overall_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable')),
  overall_trend_score numeric(10, 4),
  overall_confidence_score numeric(10, 4) not null default 0,
  periods_analyzed integer not null default 0,
  short_term_periods_analyzed integer not null default 0,
  long_term_periods_analyzed integer not null default 0,
  display_period text check (display_period in ('annual', 'quarterly')),
  display_window text check (display_window in ('short_term', 'long_term')),
  as_of_date date not null,
  explanation text not null default '',
  inputs_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, metric_name, as_of_date)
);

create table if not exists fundamental_trend_summaries (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  as_of_date date not null,
  overall_trend_score numeric(10, 4),
  overall_confidence_score numeric(10, 4) not null default 0,
  overall_trend_direction text not null check (overall_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable')),
  improving_metrics_count integer not null default 0,
  deteriorating_metrics_count integer not null default 0,
  stable_metrics_count integer not null default 0,
  volatile_metrics_count integer not null default 0,
  insufficient_data_metrics_count integer not null default 0,
  growth_trend_score numeric(10, 4),
  margin_trend_score numeric(10, 4),
  profitability_trend_score numeric(10, 4),
  balance_sheet_trend_score numeric(10, 4),
  quality_trend_score numeric(10, 4),
  warnings jsonb not null default '[]',
  explanation text not null default '',
  inputs_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, as_of_date)
);

create index if not exists idx_fundamental_trends_instrument on fundamental_trends (instrument_id);
create index if not exists idx_fundamental_trends_symbol on fundamental_trends (symbol);
create index if not exists idx_fundamental_trends_metric on fundamental_trends (metric_name);
create index if not exists idx_fundamental_trends_as_of_date on fundamental_trends (as_of_date desc);
create index if not exists idx_fundamental_trends_direction on fundamental_trends (overall_trend_direction);
create index if not exists idx_fundamental_trend_summaries_instrument on fundamental_trend_summaries (instrument_id);
create index if not exists idx_fundamental_trend_summaries_symbol on fundamental_trend_summaries (symbol);
create index if not exists idx_fundamental_trend_summaries_as_of_date on fundamental_trend_summaries (as_of_date desc);
create index if not exists idx_fundamental_trend_summaries_direction on fundamental_trend_summaries (overall_trend_direction);

drop trigger if exists trg_fundamental_trends_updated_at on fundamental_trends;
create trigger trg_fundamental_trends_updated_at before update on fundamental_trends for each row execute function set_updated_at();

drop trigger if exists trg_fundamental_trend_summaries_updated_at on fundamental_trend_summaries;
create trigger trg_fundamental_trend_summaries_updated_at before update on fundamental_trend_summaries for each row execute function set_updated_at();

alter table fundamental_trends enable row level security;
alter table fundamental_trend_summaries enable row level security;

drop policy if exists "users can read fundamental trends" on fundamental_trends;
create policy "users can read fundamental trends" on fundamental_trends for select using (true);

drop policy if exists "users can read fundamental trend summaries" on fundamental_trend_summaries;
create policy "users can read fundamental trend summaries" on fundamental_trend_summaries for select using (true);
