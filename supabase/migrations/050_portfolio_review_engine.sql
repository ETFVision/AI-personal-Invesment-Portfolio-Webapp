-- Portfolio Review Engine V1.
-- Deterministic portfolio-level review. It does not place trades or produce exact position sizes.

create table if not exists portfolio_review_runs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios(id) on delete cascade,
  run_date date not null default current_date,
  run_type text not null default 'manual' check (run_type in ('manual', 'scheduled')),
  status text not null default 'success' check (status in ('success', 'partial_success', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists portfolio_review_reports (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  portfolio_review_run_id uuid references portfolio_review_runs(id) on delete set null,
  review_date date not null default current_date,
  period_start date,
  period_end date,
  status text not null default 'draft' check (status in ('draft', 'final')),
  executive_summary text not null,
  allocation_review jsonb not null default '{}'::jsonb,
  concentration_review jsonb not null default '{}'::jsonb,
  diversification_review jsonb not null default '{}'::jsonb,
  risk_review jsonb not null default '{}'::jsonb,
  macro_fit_review jsonb not null default '{}'::jsonb,
  recommendation_alignment_review jsonb not null default '{}'::jsonb,
  fixed_income_review jsonb not null default '{}'::jsonb,
  theme_exposure_review jsonb not null default '{}'::jsonb,
  watch_areas jsonb not null default '[]'::jsonb,
  portfolio_improvement_suggestions jsonb not null default '[]'::jsonb,
  potential_actions jsonb not null default '[]'::jsonb,
  data_limitations jsonb not null default '[]'::jsonb,
  overall_portfolio_score numeric(8, 4),
  confidence_score numeric(8, 4) not null default 0,
  inputs_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_review_reports_portfolio_date
  on portfolio_review_reports (portfolio_id, review_date desc, created_at desc);

create index if not exists idx_portfolio_review_reports_status
  on portfolio_review_reports (status);

create index if not exists idx_portfolio_review_runs_portfolio_created
  on portfolio_review_runs (portfolio_id, created_at desc);

drop trigger if exists trg_portfolio_review_runs_updated_at on portfolio_review_runs;
create trigger trg_portfolio_review_runs_updated_at before update on portfolio_review_runs for each row execute function set_updated_at();

drop trigger if exists trg_portfolio_review_reports_updated_at on portfolio_review_reports;
create trigger trg_portfolio_review_reports_updated_at before update on portfolio_review_reports for each row execute function set_updated_at();

alter table portfolio_review_runs enable row level security;
alter table portfolio_review_reports enable row level security;

drop policy if exists "users can read portfolio review runs" on portfolio_review_runs;
create policy "users can read portfolio review runs" on portfolio_review_runs
  for select using (
    auth.role() = 'authenticated'
    and (
      portfolio_id is null
      or exists (
        select 1
        from portfolios p
        join users up on up.id = p.user_id
        where p.id = portfolio_review_runs.portfolio_id
          and up.auth_provider_user_id = auth.uid()::text
      )
    )
  );

drop policy if exists "users can read portfolio review reports" on portfolio_review_reports;
create policy "users can read portfolio review reports" on portfolio_review_reports
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from portfolios p
        join users up on up.id = p.user_id
      where p.id = portfolio_review_reports.portfolio_id
        and up.auth_provider_user_id = auth.uid()::text
    )
  );
