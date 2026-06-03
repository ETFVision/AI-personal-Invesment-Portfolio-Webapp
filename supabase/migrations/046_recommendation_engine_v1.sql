-- Deterministic Recommendation Engine V1.
-- Recommendations are research signals only. They do not place trades or connect to brokers.

create table if not exists recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  run_type text not null default 'manual',
  status text not null default 'success' check (status in ('success', 'partial_success', 'failed')),
  instruments_evaluated integer not null default 0,
  recommendations_created integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists instrument_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_run_id uuid references recommendation_runs(id) on delete set null,
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  instrument_type text not null,
  recommendation_label text not null check (
    recommendation_label in ('Strong Buy', 'Buy', 'Hold', 'Watch', 'Reduce', 'Sell', 'Insufficient Data', 'Not Applicable')
  ),
  overall_score numeric(8, 4),
  confidence_score numeric(8, 4) not null default 0,
  risk_level text not null default 'unknown',
  time_horizon text not null default 'medium_term',
  recommendation_reasoning_summary text not null,
  positive_drivers jsonb not null default '[]'::jsonb,
  negative_drivers jsonb not null default '[]'::jsonb,
  guardrails_applied jsonb not null default '[]'::jsonb,
  data_limitations jsonb not null default '[]'::jsonb,
  inputs_snapshot jsonb not null default '{}'::jsonb,
  scoring_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recommendation_history (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  recommendation_label text not null,
  overall_score numeric(8, 4),
  confidence_score numeric(8, 4) not null default 0,
  run_date date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_instrument_recommendations_run_instrument
  on instrument_recommendations (recommendation_run_id, instrument_id);

create index if not exists idx_instrument_recommendations_instrument_created
  on instrument_recommendations (instrument_id, created_at desc);

create index if not exists idx_instrument_recommendations_label
  on instrument_recommendations (recommendation_label);

create index if not exists idx_instrument_recommendations_score
  on instrument_recommendations (overall_score desc);

create index if not exists idx_recommendation_history_instrument_date
  on recommendation_history (instrument_id, run_date desc);

create index if not exists idx_recommendation_runs_created
  on recommendation_runs (created_at desc);

drop trigger if exists trg_instrument_recommendations_updated_at on instrument_recommendations;
create trigger trg_instrument_recommendations_updated_at before update on instrument_recommendations for each row execute function set_updated_at();

alter table recommendation_runs enable row level security;
alter table instrument_recommendations enable row level security;
alter table recommendation_history enable row level security;

drop policy if exists "users can read recommendation runs" on recommendation_runs;
create policy "users can read recommendation runs" on recommendation_runs
  for select using (auth.role() = 'authenticated');

drop policy if exists "users can read instrument recommendations" on instrument_recommendations;
create policy "users can read instrument recommendations" on instrument_recommendations
  for select using (auth.role() = 'authenticated');

drop policy if exists "users can read recommendation history" on recommendation_history;
create policy "users can read recommendation history" on recommendation_history
  for select using (auth.role() = 'authenticated');
