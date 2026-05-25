-- Phase 2 MVP schema.
-- Portable PostgreSQL tables with Supabase-specific RLS policies isolated here.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  auth_provider_user_id text not null,
  email text,
  display_name text,
  base_currency text not null default 'USD',
  timezone text not null default 'UTC',
  risk_profile text,
  onboarding_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_provider, auth_provider_user_id)
);

create table if not exists portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  base_currency text not null default 'USD',
  strategy_label text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  ticker text,
  symbol text,
  name text not null,
  exchange text,
  currency text,
  country text,
  region text,
  sector text,
  industry text,
  provider_primary text,
  provider_ids jsonb not null default '{}',
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cash_balances (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  account_name text,
  broker_name text,
  currency text not null,
  amount numeric(28, 10) not null,
  as_of_date date not null,
  source_type text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  asset_id uuid not null references assets(id),
  asset_type text not null,
  ticker text,
  asset_name text not null,
  account_name text,
  broker_name text,
  quantity numeric(28, 10) not null,
  average_cost numeric(28, 10),
  cost_currency text not null,
  first_purchase_date date,
  source_type text not null default 'manual',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  asset_id uuid references assets(id),
  transaction_type text not null,
  asset_type text,
  ticker text,
  asset_name text,
  account_name text,
  broker_name text,
  quantity numeric(28, 10),
  price numeric(28, 10),
  fees numeric(28, 10) not null default 0,
  gross_amount numeric(28, 10),
  net_amount numeric(28, 10),
  currency text not null,
  transaction_date date not null,
  source_type text not null default 'manual',
  external_id text,
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingestion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  source_type text not null,
  status text not null,
  raw_payload jsonb not null default '{}',
  normalized_payload jsonb not null default '{}',
  validation_errors jsonb not null default '[]',
  duplicate_warnings jsonb not null default '[]',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_users_auth on users (auth_provider, auth_provider_user_id);
create index if not exists idx_portfolios_user_id on portfolios (user_id);
create index if not exists idx_assets_ticker on assets (ticker);
create index if not exists idx_assets_type on assets (asset_type);
create index if not exists idx_cash_balances_portfolio on cash_balances (portfolio_id);
create index if not exists idx_holdings_portfolio on holdings (portfolio_id);
create index if not exists idx_holdings_asset on holdings (asset_id);
create index if not exists idx_transactions_portfolio_date on transactions (portfolio_id, transaction_date desc);
create index if not exists idx_transactions_asset on transactions (asset_id);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users for each row execute function set_updated_at();

drop trigger if exists trg_portfolios_updated_at on portfolios;
create trigger trg_portfolios_updated_at before update on portfolios for each row execute function set_updated_at();

drop trigger if exists trg_assets_updated_at on assets;
create trigger trg_assets_updated_at before update on assets for each row execute function set_updated_at();

drop trigger if exists trg_cash_balances_updated_at on cash_balances;
create trigger trg_cash_balances_updated_at before update on cash_balances for each row execute function set_updated_at();

drop trigger if exists trg_holdings_updated_at on holdings;
create trigger trg_holdings_updated_at before update on holdings for each row execute function set_updated_at();

drop trigger if exists trg_transactions_updated_at on transactions;
create trigger trg_transactions_updated_at before update on transactions for each row execute function set_updated_at();

alter table users enable row level security;
alter table portfolios enable row level security;
alter table cash_balances enable row level security;
alter table holdings enable row level security;
alter table transactions enable row level security;
alter table ingestion_events enable row level security;

create policy "users can read own profile" on users
  for select using (auth_provider = 'supabase' and auth_provider_user_id = auth.uid()::text);

create policy "users can read own portfolios" on portfolios
  for select using (
    exists (
      select 1 from users
      where users.id = portfolios.user_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );

create policy "users can read own cash balances" on cash_balances
  for select using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = cash_balances.portfolio_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );

create policy "users can read own holdings" on holdings
  for select using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = holdings.portfolio_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );

create policy "users can read own transactions" on transactions
  for select using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = transactions.portfolio_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );
