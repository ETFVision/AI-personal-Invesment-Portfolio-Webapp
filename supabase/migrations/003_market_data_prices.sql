-- Market data foundation for Phase 2.1.
-- Provider-specific API details stay outside the schema; this table stores normalized daily prices.

create table if not exists daily_prices (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  provider text not null,
  symbol text not null,
  price_date date not null,
  close_price numeric(28, 10) not null,
  currency text,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, provider, price_date)
);

create index if not exists idx_daily_prices_asset_date on daily_prices (asset_id, price_date desc);
create index if not exists idx_daily_prices_symbol_date on daily_prices (symbol, price_date desc);

drop trigger if exists trg_daily_prices_updated_at on daily_prices;
create trigger trg_daily_prices_updated_at before update on daily_prices for each row execute function set_updated_at();

alter table daily_prices enable row level security;

create policy "users can read prices for owned holdings" on daily_prices
  for select using (
    exists (
      select 1 from holdings
      join portfolios on portfolios.id = holdings.portfolio_id
      join users on users.id = portfolios.user_id
      where holdings.asset_id = daily_prices.asset_id
        and holdings.is_active = true
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );
