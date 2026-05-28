-- Instrument-level price history for the curated universe and watchlists.

create table if not exists instrument_prices (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  provider text not null,
  symbol text not null,
  price_date date not null,
  close_price numeric(28, 10) not null,
  currency text,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, provider, price_date)
);

create index if not exists idx_instrument_prices_instrument_date on instrument_prices (instrument_id, price_date desc);
create index if not exists idx_instrument_prices_symbol_date on instrument_prices (symbol, price_date desc);

drop trigger if exists trg_instrument_prices_updated_at on instrument_prices;
create trigger trg_instrument_prices_updated_at before update on instrument_prices for each row execute function set_updated_at();

alter table instrument_prices enable row level security;

create policy "users can read instrument prices" on instrument_prices
  for select using (true);
