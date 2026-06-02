-- Company fundamentals foundation for individual stocks.
-- Provider data is normalized into portable PostgreSQL tables and raw payloads stay in JSONB.

create table if not exists company_profiles (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  company_name text,
  sector text,
  industry text,
  country text,
  exchange text,
  currency text,
  market_cap numeric(28, 4),
  beta numeric(18, 8),
  description text,
  website text,
  ceo text,
  ipo_date date,
  employees integer,
  last_refreshed_at timestamptz,
  provider text not null,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id)
);

create table if not exists financial_statements (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  statement_type text not null check (statement_type in ('income_statement', 'balance_sheet', 'cash_flow')),
  period text not null check (period in ('annual', 'quarterly')),
  fiscal_year integer not null,
  fiscal_quarter integer not null default 0,
  report_date date,
  filing_date date,
  revenue numeric(28, 4),
  gross_profit numeric(28, 4),
  operating_income numeric(28, 4),
  ebitda numeric(28, 4),
  net_income numeric(28, 4),
  eps numeric(28, 10),
  diluted_eps numeric(28, 10),
  total_assets numeric(28, 4),
  total_liabilities numeric(28, 4),
  shareholders_equity numeric(28, 4),
  cash_and_equivalents numeric(28, 4),
  total_debt numeric(28, 4),
  operating_cash_flow numeric(28, 4),
  capital_expenditure numeric(28, 4),
  free_cash_flow numeric(28, 4),
  shares_outstanding numeric(28, 4),
  provider text not null,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, statement_type, period, fiscal_year, fiscal_quarter)
);

create table if not exists financial_ratios (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  period text not null check (period in ('annual', 'quarterly')),
  fiscal_year integer,
  fiscal_quarter integer not null default 0,
  report_date date not null,
  pe_ratio numeric(28, 10),
  forward_pe numeric(28, 10),
  price_to_sales numeric(28, 10),
  price_to_book numeric(28, 10),
  ev_to_ebitda numeric(28, 10),
  ev_to_sales numeric(28, 10),
  gross_margin numeric(28, 10),
  operating_margin numeric(28, 10),
  net_margin numeric(28, 10),
  roe numeric(28, 10),
  roic numeric(28, 10),
  roa numeric(28, 10),
  debt_to_equity numeric(28, 10),
  net_debt_to_ebitda numeric(28, 10),
  current_ratio numeric(28, 10),
  quick_ratio numeric(28, 10),
  free_cash_flow_yield numeric(28, 10),
  revenue_growth numeric(28, 10),
  eps_growth numeric(28, 10),
  net_income_growth numeric(28, 10),
  free_cash_flow_growth numeric(28, 10),
  provider text not null,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, period, report_date)
);

create table if not exists fundamental_scores (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  symbol text not null,
  as_of_date date not null,
  growth_score numeric(10, 4),
  profitability_score numeric(10, 4),
  valuation_score numeric(10, 4),
  balance_sheet_score numeric(10, 4),
  cash_flow_score numeric(10, 4),
  quality_score numeric(10, 4),
  overall_fundamental_score numeric(10, 4),
  score_confidence numeric(10, 4),
  explanation text,
  inputs_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, as_of_date)
);

create table if not exists fundamentals_refresh_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('success', 'partial_success', 'failed')),
  stocks_requested integer not null default 0,
  profiles_updated integer not null default 0,
  statements_updated integer not null default 0,
  ratios_updated integer not null default 0,
  scores_updated integer not null default 0,
  failed_symbols jsonb not null default '[]',
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_company_profiles_instrument on company_profiles (instrument_id);
create index if not exists idx_company_profiles_symbol on company_profiles (symbol);
create index if not exists idx_financial_statements_instrument on financial_statements (instrument_id);
create index if not exists idx_financial_statements_symbol on financial_statements (symbol);
create index if not exists idx_financial_statements_type on financial_statements (statement_type);
create index if not exists idx_financial_statements_period on financial_statements (period);
create index if not exists idx_financial_statements_report_date on financial_statements (report_date desc);
create index if not exists idx_financial_ratios_instrument on financial_ratios (instrument_id);
create index if not exists idx_financial_ratios_symbol on financial_ratios (symbol);
create index if not exists idx_financial_ratios_report_date on financial_ratios (report_date desc);
create index if not exists idx_fundamental_scores_instrument on fundamental_scores (instrument_id);
create index if not exists idx_fundamental_scores_as_of_date on fundamental_scores (as_of_date desc);
create index if not exists idx_fundamentals_refresh_logs_started_at on fundamentals_refresh_logs (started_at desc);

drop trigger if exists trg_company_profiles_updated_at on company_profiles;
create trigger trg_company_profiles_updated_at before update on company_profiles for each row execute function set_updated_at();

drop trigger if exists trg_financial_statements_updated_at on financial_statements;
create trigger trg_financial_statements_updated_at before update on financial_statements for each row execute function set_updated_at();

drop trigger if exists trg_financial_ratios_updated_at on financial_ratios;
create trigger trg_financial_ratios_updated_at before update on financial_ratios for each row execute function set_updated_at();

drop trigger if exists trg_fundamental_scores_updated_at on fundamental_scores;
create trigger trg_fundamental_scores_updated_at before update on fundamental_scores for each row execute function set_updated_at();

alter table company_profiles enable row level security;
alter table financial_statements enable row level security;
alter table financial_ratios enable row level security;
alter table fundamental_scores enable row level security;
alter table fundamentals_refresh_logs enable row level security;

drop policy if exists "users can read company profiles" on company_profiles;
create policy "users can read company profiles" on company_profiles for select using (true);

drop policy if exists "users can read financial statements" on financial_statements;
create policy "users can read financial statements" on financial_statements for select using (true);

drop policy if exists "users can read financial ratios" on financial_ratios;
create policy "users can read financial ratios" on financial_ratios for select using (true);

drop policy if exists "users can read fundamental scores" on fundamental_scores;
create policy "users can read fundamental scores" on fundamental_scores for select using (true);

drop policy if exists "users can read fundamentals refresh logs" on fundamentals_refresh_logs;
create policy "users can read fundamentals refresh logs" on fundamentals_refresh_logs for select using (true);
