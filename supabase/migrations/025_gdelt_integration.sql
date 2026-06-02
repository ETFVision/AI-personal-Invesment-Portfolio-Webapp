-- GDELT macro/world-news integration.
-- Keeps GDELT-specific configuration portable while normalized articles continue
-- to flow into the existing news_items/news_classifications tables.

create table if not exists gdelt_query_groups (
  id uuid primary key default gen_random_uuid(),
  query_key text not null unique,
  query_name text not null,
  query_text text not null,
  canonical_theme text not null,
  category text not null,
  is_active boolean not null default true,
  max_articles_per_run integer not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gdelt_ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  query_group_id uuid references gdelt_query_groups(id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  articles_fetched integer not null default 0,
  articles_inserted integer not null default 0,
  duplicates_detected integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint gdelt_ingestion_logs_status_check check (status in ('success', 'partial_success', 'failed'))
);

create table if not exists gdelt_article_metadata (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references news_items(id) on delete cascade,
  domain text,
  source_country text,
  source_language text,
  tone numeric(12, 6),
  gdelt_themes jsonb not null default '[]',
  locations jsonb not null default '[]',
  persons jsonb not null default '[]',
  organizations jsonb not null default '[]',
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gdelt_article_metadata_news_item_key unique (news_item_id)
);

create index if not exists idx_gdelt_query_groups_active on gdelt_query_groups (is_active, category);
create index if not exists idx_gdelt_query_groups_theme on gdelt_query_groups (canonical_theme);
create index if not exists idx_gdelt_ingestion_logs_started_at on gdelt_ingestion_logs (started_at desc);
create index if not exists idx_gdelt_article_metadata_news_item on gdelt_article_metadata (news_item_id);
create index if not exists idx_gdelt_article_metadata_domain on gdelt_article_metadata (domain);

drop trigger if exists trg_gdelt_query_groups_updated_at on gdelt_query_groups;
create trigger trg_gdelt_query_groups_updated_at before update on gdelt_query_groups for each row execute function set_updated_at();
drop trigger if exists trg_gdelt_article_metadata_updated_at on gdelt_article_metadata;
create trigger trg_gdelt_article_metadata_updated_at before update on gdelt_article_metadata for each row execute function set_updated_at();

alter table gdelt_query_groups enable row level security;
alter table gdelt_ingestion_logs enable row level security;
alter table gdelt_article_metadata enable row level security;

drop policy if exists "users can read gdelt query groups" on gdelt_query_groups;
drop policy if exists "users can read gdelt ingestion logs" on gdelt_ingestion_logs;
drop policy if exists "users can read gdelt article metadata" on gdelt_article_metadata;

create policy "users can read gdelt query groups" on gdelt_query_groups for select using (true);
create policy "users can read gdelt ingestion logs" on gdelt_ingestion_logs for select using (true);
create policy "users can read gdelt article metadata" on gdelt_article_metadata for select using (true);

insert into gdelt_query_groups (query_key, query_name, query_text, canonical_theme, category, is_active, max_articles_per_run)
values
  ('macro_rates_policy', 'Macro / rates policy', '"Federal Reserve" OR "interest rates" OR "Treasury yields" OR "central bank policy" OR "rate cuts" OR "rate hikes"', 'Rates', 'macro_rates', true, 8),
  ('inflation_prices', 'Inflation and prices', 'inflation OR CPI OR "PCE inflation" OR "food prices" OR "energy prices"', 'Inflation', 'inflation', true, 8),
  ('growth_recession', 'Growth / recession risk', '"recession risk" OR "GDP growth" OR "economic slowdown" OR unemployment OR "jobs report"', 'Growth', 'growth', true, 8),
  ('currency_usd', 'Currency / USD', '"US dollar" OR "dollar index" OR "currency volatility" OR "FX markets"', 'Currency', 'currency', true, 8),
  ('geopolitical_risk', 'Geopolitical risk', 'sanctions OR war OR conflict OR "military escalation" OR "election risk" OR "political instability"', 'Geopolitical', 'geopolitical', true, 10),
  ('trade_supply_chain', 'Trade / supply chain', 'tariffs OR "export controls" OR "supply chain disruption" OR "trade war" OR "semiconductor restrictions"', 'Trade / Supply Chain', 'trade_supply_chain', true, 8),
  ('energy_commodities', 'Energy / commodities', '"oil prices" OR OPEC OR "crude oil supply" OR "natural gas" OR "commodity shock"', 'Energy', 'energy_commodities', true, 8),
  ('global_credit_stress', 'Global risk / credit stress', '"banking stress" OR "sovereign debt" OR "fiscal crisis" OR "debt ceiling" OR "credit stress"', 'Credit', 'global_credit', true, 8)
on conflict (query_key) do update
set
  query_name = excluded.query_name,
  query_text = excluded.query_text,
  canonical_theme = excluded.canonical_theme,
  category = excluded.category,
  is_active = excluded.is_active,
  max_articles_per_run = excluded.max_articles_per_run;
