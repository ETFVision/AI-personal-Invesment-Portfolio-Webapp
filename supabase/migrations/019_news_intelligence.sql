create table if not exists news_items (
  id uuid primary key default gen_random_uuid(),
  source_provider text not null,
  source_id text not null,
  url text,
  title text not null,
  summary text,
  content_snippet text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  tickers jsonb not null default '[]',
  related_instrument_ids jsonb not null default '[]',
  raw_symbols jsonb not null default '[]',
  source_name text,
  author text,
  image_url text,
  language text,
  country text,
  provider_metadata jsonb not null default '{}',
  content_hash text not null,
  canonical_hash text not null,
  is_duplicate boolean not null default false,
  duplicate_of_id uuid references news_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists news_classifications (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references news_items(id) on delete cascade,
  classification_model text not null,
  sentiment text not null,
  event_type text,
  classification text not null,
  severity_score integer not null default 0,
  persistence_score integer not null default 0,
  confidence_score integer not null default 0,
  affected_asset_classes jsonb not null default '[]',
  affected_sectors jsonb not null default '[]',
  affected_themes jsonb not null default '[]',
  affected_instruments jsonb not null default '[]',
  affected_macro_categories jsonb not null default '[]',
  reasoning_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_classifications_sentiment_check check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  constraint news_classifications_label_check check (classification in ('short_term_noise', 'medium_term_theme', 'structural_long_term_shift', 'existential_risk')),
  constraint news_classifications_score_bounds check (
    severity_score between 0 and 100 and
    persistence_score between 0 and 100 and
    confidence_score between 0 and 100
  )
);

create table if not exists news_groups (
  id uuid primary key default gen_random_uuid(),
  group_key text not null,
  group_title text not null,
  group_type text not null,
  period_start date not null,
  period_end date not null,
  related_news_item_ids jsonb not null default '[]',
  affected_instruments jsonb not null default '[]',
  affected_themes jsonb not null default '[]',
  affected_asset_classes jsonb not null default '[]',
  group_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_groups_group_type_check check (group_type in ('company', 'sector', 'theme', 'macro', 'geopolitical', 'asset_class'))
);

create table if not exists weekly_news_reconciliations (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  equities_summary text,
  bonds_summary text,
  gold_summary text,
  crypto_summary text,
  macro_summary text,
  rates_summary text,
  inflation_summary text,
  currency_summary text,
  geopolitical_summary text,
  key_risks jsonb not null default '[]',
  key_opportunities jsonb not null default '[]',
  portfolio_implications jsonb not null default '{}',
  model_used text,
  token_usage jsonb not null default '{}',
  cost_estimate numeric(18, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_news_reconciliations_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists news_ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  source_provider text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  instruments_requested integer not null default 0,
  articles_fetched integer not null default 0,
  articles_inserted integer not null default 0,
  duplicates_detected integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint news_ingestion_logs_status_check check (status in ('success', 'partial_success', 'failed'))
);

create unique index if not exists idx_news_items_provider_source_id
  on news_items (source_provider, source_id);
create unique index if not exists idx_news_items_provider_url
  on news_items (source_provider, url)
  where url is not null;
create index if not exists idx_news_items_published_at on news_items (published_at desc);
create index if not exists idx_news_items_canonical_hash on news_items (canonical_hash);
create index if not exists idx_news_items_content_hash on news_items (content_hash);
create index if not exists idx_news_items_duplicate on news_items (is_duplicate);
create index if not exists idx_news_items_tickers on news_items using gin (tickers);
create index if not exists idx_news_items_related_instruments on news_items using gin (related_instrument_ids);

create unique index if not exists idx_news_classifications_news_model
  on news_classifications (news_item_id, classification_model);
create index if not exists idx_news_classifications_label on news_classifications (classification);
create index if not exists idx_news_classifications_severity on news_classifications (severity_score desc);

create unique index if not exists idx_news_groups_period_key on news_groups (period_start, period_end, group_key);
create index if not exists idx_news_groups_type on news_groups (group_type);
create unique index if not exists idx_weekly_news_reconciliations_period_status
  on weekly_news_reconciliations (period_start, period_end, status);
create index if not exists idx_news_ingestion_logs_started_at on news_ingestion_logs (started_at desc);

drop trigger if exists trg_news_items_updated_at on news_items;
create trigger trg_news_items_updated_at before update on news_items for each row execute function set_updated_at();
drop trigger if exists trg_news_classifications_updated_at on news_classifications;
create trigger trg_news_classifications_updated_at before update on news_classifications for each row execute function set_updated_at();
drop trigger if exists trg_news_groups_updated_at on news_groups;
create trigger trg_news_groups_updated_at before update on news_groups for each row execute function set_updated_at();
drop trigger if exists trg_weekly_news_reconciliations_updated_at on weekly_news_reconciliations;
create trigger trg_weekly_news_reconciliations_updated_at before update on weekly_news_reconciliations for each row execute function set_updated_at();

alter table news_items enable row level security;
alter table news_classifications enable row level security;
alter table news_groups enable row level security;
alter table weekly_news_reconciliations enable row level security;
alter table news_ingestion_logs enable row level security;

drop policy if exists "users can read news items" on news_items;
drop policy if exists "users can read news classifications" on news_classifications;
drop policy if exists "users can read news groups" on news_groups;
drop policy if exists "users can read weekly news reconciliations" on weekly_news_reconciliations;
drop policy if exists "users can read news ingestion logs" on news_ingestion_logs;

create policy "users can read news items" on news_items for select using (true);
create policy "users can read news classifications" on news_classifications for select using (true);
create policy "users can read news groups" on news_groups for select using (true);
create policy "users can read weekly news reconciliations" on weekly_news_reconciliations for select using (true);
create policy "users can read news ingestion logs" on news_ingestion_logs for select using (true);
