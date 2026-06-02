-- AI Market Vision generation metadata and logs.
-- Adds generated-report observability without changing recommendation/scoring behavior.

alter table market_vision_reports
  add column if not exists growth_view text not null default '',
  add column if not exists employment_view text not null default '',
  add column if not exists confidence_score numeric(5, 2),
  add column if not exists model_used text,
  add column if not exists prompt_version text,
  add column if not exists token_usage jsonb not null default '{}',
  add column if not exists cost_estimate numeric(18, 6),
  add column if not exists source_snapshot jsonb not null default '{}',
  add column if not exists generation_duration_ms integer;

create table if not exists market_vision_generation_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references market_vision_reports(id) on delete set null,
  period_start date,
  period_end date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  model_used text,
  prompt_version text,
  token_usage jsonb not null default '{}',
  cost_estimate numeric(18, 6),
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint market_vision_generation_logs_status_check check (status in ('success', 'failed', 'skipped'))
);

create index if not exists idx_market_vision_reports_generated_period
  on market_vision_reports (source_type, report_period_start, report_period_end, report_date desc);

create index if not exists idx_market_vision_generation_logs_period
  on market_vision_generation_logs (period_start, period_end, created_at desc);

create index if not exists idx_market_vision_generation_logs_status
  on market_vision_generation_logs (status, created_at desc);

alter table market_vision_generation_logs enable row level security;

drop policy if exists "users can read market vision generation logs" on market_vision_generation_logs;
create policy "users can read market vision generation logs" on market_vision_generation_logs for select using (true);
