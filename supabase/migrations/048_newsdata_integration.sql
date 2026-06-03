-- NewsData.io macro/world-news integration.
-- NewsData uses the same high-level query groups as GDELT, but maintains
-- independent queue state so it can serve as fallback enrichment.

create table if not exists newsdata_query_groups (
  id uuid primary key default gen_random_uuid(),
  query_key text not null unique,
  query_name text not null,
  query_text text not null,
  canonical_theme text not null,
  category text not null,
  is_active boolean not null default true,
  max_articles_per_run integer not null default 8,
  last_attempted_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz,
  failure_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists newsdata_ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  query_group_id uuid references newsdata_query_groups(id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  articles_fetched integer not null default 0,
  articles_inserted integer not null default 0,
  duplicates_detected integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint newsdata_ingestion_logs_status_check check (status in ('success', 'partial_success', 'failed'))
);

create table if not exists newsdata_article_metadata (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references news_items(id) on delete cascade,
  source_id text,
  source_name text,
  source_url text,
  country text,
  language text,
  category jsonb not null default '[]',
  creator jsonb not null default '[]',
  keywords jsonb not null default '[]',
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsdata_article_metadata_news_item_key unique (news_item_id)
);

create index if not exists idx_newsdata_query_groups_active on newsdata_query_groups (is_active, category);
create index if not exists idx_newsdata_query_groups_theme on newsdata_query_groups (canonical_theme);
create index if not exists idx_newsdata_query_groups_due on newsdata_query_groups (is_active, next_run_at, last_attempted_at);
create index if not exists idx_newsdata_ingestion_logs_started_at on newsdata_ingestion_logs (started_at desc);
create index if not exists idx_newsdata_ingestion_logs_query_group on newsdata_ingestion_logs (query_group_id, started_at desc);
create index if not exists idx_newsdata_article_metadata_news_item on newsdata_article_metadata (news_item_id);
create index if not exists idx_newsdata_article_metadata_source on newsdata_article_metadata (source_id, source_name);

drop trigger if exists trg_newsdata_query_groups_updated_at on newsdata_query_groups;
create trigger trg_newsdata_query_groups_updated_at before update on newsdata_query_groups for each row execute function set_updated_at();
drop trigger if exists trg_newsdata_article_metadata_updated_at on newsdata_article_metadata;
create trigger trg_newsdata_article_metadata_updated_at before update on newsdata_article_metadata for each row execute function set_updated_at();

alter table newsdata_query_groups enable row level security;
alter table newsdata_ingestion_logs enable row level security;
alter table newsdata_article_metadata enable row level security;

drop policy if exists "users can read newsdata query groups" on newsdata_query_groups;
drop policy if exists "users can read newsdata ingestion logs" on newsdata_ingestion_logs;
drop policy if exists "users can read newsdata article metadata" on newsdata_article_metadata;

create policy "users can read newsdata query groups" on newsdata_query_groups for select using (true);
create policy "users can read newsdata ingestion logs" on newsdata_ingestion_logs for select using (true);
create policy "users can read newsdata article metadata" on newsdata_article_metadata for select using (true);

insert into newsdata_query_groups (query_key, query_name, query_text, canonical_theme, category, is_active, max_articles_per_run, next_run_at)
values
  ('macro_rates_policy', 'Macro / rates policy', 'Federal Reserve OR interest rates OR Treasury yields', 'Rates', 'macro_rates', true, 8, now()),
  ('inflation_prices', 'Inflation and prices', 'inflation OR CPI OR PCE inflation', 'Inflation', 'inflation', true, 8, now()),
  ('growth_recession', 'Growth / recession risk', 'recession risk OR economic slowdown OR GDP growth', 'Growth', 'growth', true, 8, now()),
  ('currency_usd', 'Currency / USD', 'US dollar OR dollar index OR currency markets', 'Currency', 'currency', true, 8, now()),
  ('geopolitical_risk', 'Geopolitical risk', 'geopolitical risk OR Middle East OR Iran sanctions', 'Geopolitical', 'geopolitical', true, 8, now()),
  ('trade_supply_chain', 'Trade / supply chain', 'tariffs OR export controls OR supply chain', 'Trade / Supply Chain', 'trade_supply_chain', true, 8, now()),
  ('energy_commodities', 'Energy / commodities', 'oil prices OR OPEC OR natural gas', 'Energy', 'energy_commodities', true, 8, now()),
  ('global_credit_stress', 'Global risk / credit stress', 'banking stress OR sovereign debt OR credit stress', 'Credit', 'global_credit', true, 8, now())
on conflict (query_key) do update
set
  query_name = excluded.query_name,
  query_text = excluded.query_text,
  canonical_theme = excluded.canonical_theme,
  category = excluded.category,
  is_active = excluded.is_active,
  max_articles_per_run = excluded.max_articles_per_run,
  next_run_at = coalesce(newsdata_query_groups.next_run_at, excluded.next_run_at),
  updated_at = now();
