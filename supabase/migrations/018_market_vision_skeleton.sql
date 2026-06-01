-- Market Vision Skeleton.
-- Manual/admin first; AI generation, FRED ingestion, and weekly jobs are future layers.

create table if not exists market_vision_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  report_period_start date,
  report_period_end date,
  title text not null,
  executive_summary text not null default '',
  global_market_summary text not null default '',
  equity_view text not null default '',
  bond_view text not null default '',
  gold_view text not null default '',
  crypto_view text not null default '',
  rates_view text not null default '',
  inflation_view text not null default '',
  currency_view text not null default '',
  geopolitical_risk_view text not null default '',
  opportunities jsonb not null default '[]',
  risks jsonb not null default '[]',
  portfolio_implications jsonb not null default '{}',
  classification_summary jsonb not null default '{}',
  source_type text not null default 'manual',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_vision_reports_source_type_check check (source_type in ('manual', 'generated', 'imported')),
  constraint market_vision_reports_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists macro_indicators (
  id uuid primary key default gen_random_uuid(),
  indicator_code text not null,
  indicator_name text not null,
  source_provider text not null,
  latest_value numeric(28, 10),
  previous_value numeric(28, 10),
  change_value numeric(28, 10),
  change_percent numeric(18, 10),
  observation_date date,
  category text not null,
  unit text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (indicator_code, source_provider),
  constraint macro_indicators_category_check check (
    category in ('interest_rates', 'inflation', 'yields', 'employment', 'growth', 'currency', 'commodities', 'liquidity')
  )
);

create table if not exists market_theme_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references market_vision_reports(id) on delete cascade,
  title text not null,
  description text not null default '',
  theme_category text not null,
  affected_asset_classes jsonb not null default '[]',
  affected_sectors jsonb not null default '[]',
  affected_themes jsonb not null default '[]',
  severity_score numeric(5, 4) not null default 0,
  persistence_score numeric(5, 4) not null default 0,
  confidence_score numeric(5, 4) not null default 0,
  classification text not null default 'short_term_noise',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_theme_events_classification_check check (
    classification in ('short_term_noise', 'medium_term_theme', 'structural_long_term_shift')
  ),
  constraint market_theme_events_score_bounds check (
    severity_score >= 0 and severity_score <= 1 and
    persistence_score >= 0 and persistence_score <= 1 and
    confidence_score >= 0 and confidence_score <= 1
  )
);

create index if not exists idx_market_vision_reports_status_date on market_vision_reports (status, report_date desc);
create index if not exists idx_market_vision_reports_date on market_vision_reports (report_date desc);
create index if not exists idx_macro_indicators_category on macro_indicators (category);
create index if not exists idx_macro_indicators_code_provider on macro_indicators (indicator_code, source_provider);
create index if not exists idx_market_theme_events_report on market_theme_events (report_id);
create index if not exists idx_market_theme_events_classification on market_theme_events (classification);

drop trigger if exists trg_market_vision_reports_updated_at on market_vision_reports;
create trigger trg_market_vision_reports_updated_at before update on market_vision_reports for each row execute function set_updated_at();

drop trigger if exists trg_macro_indicators_updated_at on macro_indicators;
create trigger trg_macro_indicators_updated_at before update on macro_indicators for each row execute function set_updated_at();

drop trigger if exists trg_market_theme_events_updated_at on market_theme_events;
create trigger trg_market_theme_events_updated_at before update on market_theme_events for each row execute function set_updated_at();

alter table market_vision_reports enable row level security;
alter table macro_indicators enable row level security;
alter table market_theme_events enable row level security;

drop policy if exists "users can read market vision reports" on market_vision_reports;
drop policy if exists "users can read macro indicators" on macro_indicators;
drop policy if exists "users can read market theme events" on market_theme_events;

create policy "users can read market vision reports" on market_vision_reports for select using (true);
create policy "users can read macro indicators" on macro_indicators for select using (true);
create policy "users can read market theme events" on market_theme_events for select using (true);

insert into macro_indicators (
  indicator_code,
  indicator_name,
  source_provider,
  latest_value,
  previous_value,
  change_value,
  change_percent,
  observation_date,
  category,
  unit,
  metadata
)
values
  ('FEDFUNDS', 'Federal Funds Rate', 'manual_placeholder', null, null, null, null, null, 'interest_rates', 'percent', '{"future_provider":"FRED"}'::jsonb),
  ('DGS10', '10-Year Treasury Yield', 'manual_placeholder', null, null, null, null, null, 'yields', 'percent', '{"future_provider":"FRED"}'::jsonb),
  ('DGS2', '2-Year Treasury Yield', 'manual_placeholder', null, null, null, null, null, 'yields', 'percent', '{"future_provider":"FRED"}'::jsonb),
  ('CPIAUCSL', 'Consumer Price Index', 'manual_placeholder', null, null, null, null, null, 'inflation', 'index', '{"future_provider":"FRED"}'::jsonb),
  ('UNRATE', 'Unemployment Rate', 'manual_placeholder', null, null, null, null, null, 'employment', 'percent', '{"future_provider":"FRED"}'::jsonb),
  ('DXY', 'US Dollar Index', 'manual_placeholder', null, null, null, null, null, 'currency', 'index', '{"future_provider":"FMP_or_other"}'::jsonb),
  ('GOLD', 'Gold Spot Proxy', 'manual_placeholder', null, null, null, null, null, 'commodities', 'USD', '{"future_provider":"FMP"}'::jsonb)
on conflict (indicator_code, source_provider) do update
set
  indicator_name = excluded.indicator_name,
  category = excluded.category,
  unit = excluded.unit,
  metadata = macro_indicators.metadata || excluded.metadata;
