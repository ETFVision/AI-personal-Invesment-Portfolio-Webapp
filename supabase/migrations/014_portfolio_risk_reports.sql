-- Derived risk analytics reports.
-- Calculations remain in portable application services; this table caches the report for fast dashboard reads.

create table if not exists portfolio_risk_reports (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  as_of_date date not null,
  report jsonb not null,
  source text not null default 'application_service',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, as_of_date)
);

create index if not exists idx_portfolio_risk_reports_portfolio_date
  on portfolio_risk_reports (portfolio_id, as_of_date desc);

drop trigger if exists trg_portfolio_risk_reports_updated_at on portfolio_risk_reports;
create trigger trg_portfolio_risk_reports_updated_at
  before update on portfolio_risk_reports
  for each row execute function set_updated_at();

alter table portfolio_risk_reports enable row level security;

create policy "users can read owned risk reports" on portfolio_risk_reports
  for select using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = portfolio_risk_reports.portfolio_id
        and users.auth_provider_user_id = auth.uid()
    )
  );
