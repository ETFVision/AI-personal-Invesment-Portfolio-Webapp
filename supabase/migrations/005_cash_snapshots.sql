-- Cash performance history foundation.
-- Cash snapshots separate balance movement from external deposits and withdrawals.

create table if not exists cash_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  cash_balance_id uuid not null references cash_balances(id) on delete cascade,
  snapshot_date date not null,
  amount numeric(28, 10) not null,
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, cash_balance_id, snapshot_date)
);

create index if not exists idx_cash_snapshots_portfolio_date on cash_snapshots (portfolio_id, snapshot_date desc);
create index if not exists idx_cash_snapshots_balance_date on cash_snapshots (cash_balance_id, snapshot_date desc);

drop trigger if exists trg_cash_snapshots_updated_at on cash_snapshots;
create trigger trg_cash_snapshots_updated_at before update on cash_snapshots for each row execute function set_updated_at();

alter table cash_snapshots enable row level security;

create policy "users can read own cash snapshots" on cash_snapshots
  for select using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = cash_snapshots.portfolio_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );
