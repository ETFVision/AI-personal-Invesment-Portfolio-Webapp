-- Portfolio Review Round 3: direct + ETF indirect underlying holding exposure.

create table if not exists portfolio_lookthrough_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  as_of_date date not null,
  holding_symbol text not null,
  holding_name text,
  direct_weight numeric(12, 8) not null default 0,
  indirect_weight numeric(12, 8) not null default 0,
  total_weight numeric(12, 8) not null default 0,
  source_etfs jsonb not null default '[]'::jsonb,
  inputs_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, holding_symbol, as_of_date)
);

create index if not exists idx_portfolio_lookthrough_holdings_portfolio_date
  on portfolio_lookthrough_holdings (portfolio_id, as_of_date desc);

create index if not exists idx_portfolio_lookthrough_holdings_symbol
  on portfolio_lookthrough_holdings (holding_symbol);

drop trigger if exists trg_portfolio_lookthrough_holdings_updated_at on portfolio_lookthrough_holdings;
create trigger trg_portfolio_lookthrough_holdings_updated_at before update on portfolio_lookthrough_holdings for each row execute function set_updated_at();

alter table portfolio_lookthrough_holdings enable row level security;

drop policy if exists "users can read own portfolio lookthrough holdings" on portfolio_lookthrough_holdings;
create policy "users can read own portfolio lookthrough holdings" on portfolio_lookthrough_holdings
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from portfolios p
      join users u on u.id = p.user_id
      where p.id = portfolio_lookthrough_holdings.portfolio_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );
