create table if not exists portfolio_performance_summary (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  as_of_date date,
  latest_price_date date,
  performance_json jsonb not null default '[]'::jsonb,
  benchmark_comparisons_json jsonb not null default '[]'::jsonb,
  calculation_version text not null default 'portfolio-performance-summary-v1',
  status text not null default 'fresh',
  stale_reason text,
  error_message text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_performance_summary_portfolio_unique unique (portfolio_id)
);

create index if not exists idx_portfolio_performance_summary_portfolio_updated
  on portfolio_performance_summary (portfolio_id, updated_at desc);

