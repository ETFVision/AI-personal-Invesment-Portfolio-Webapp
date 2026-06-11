create table if not exists portfolio_dashboard_summary (
  portfolio_id uuid primary key references portfolios(id) on delete cascade,
  as_of_date date,
  latest_price_date date,
  dashboard_json jsonb not null default '{}'::jsonb,
  calculation_version text not null default 'portfolio-dashboard-summary-v1',
  status text not null default 'fresh',
  stale_reason text,
  error_message text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_dashboard_summary_updated_at_idx
  on portfolio_dashboard_summary(updated_at desc);
