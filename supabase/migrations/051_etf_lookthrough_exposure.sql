-- ETF Look-Through Exposure Engine V2.
-- Provider ETF allocations are cached and then used for deterministic portfolio look-through analysis.

create table if not exists etf_sector_exposures (
  id uuid primary key default gen_random_uuid(),
  etf_instrument_id uuid not null references instruments(id) on delete cascade,
  etf_symbol text not null,
  sector text not null,
  exposure_weight numeric(12, 8) not null,
  as_of_date date not null,
  source_provider text not null,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (etf_instrument_id, sector, as_of_date, source_provider)
);

create table if not exists etf_country_exposures (
  id uuid primary key default gen_random_uuid(),
  etf_instrument_id uuid not null references instruments(id) on delete cascade,
  etf_symbol text not null,
  country text not null,
  exposure_weight numeric(12, 8) not null,
  as_of_date date not null,
  source_provider text not null,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (etf_instrument_id, country, as_of_date, source_provider)
);

create table if not exists etf_top_holdings (
  id uuid primary key default gen_random_uuid(),
  etf_instrument_id uuid not null references instruments(id) on delete cascade,
  etf_symbol text not null,
  holding_symbol text not null,
  holding_name text,
  holding_weight numeric(12, 8) not null,
  as_of_date date not null,
  source_provider text not null,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (etf_instrument_id, holding_symbol, as_of_date, source_provider)
);

create table if not exists etf_theme_exposures (
  id uuid primary key default gen_random_uuid(),
  etf_instrument_id uuid not null references instruments(id) on delete cascade,
  etf_symbol text not null,
  theme text not null,
  exposure_weight numeric(12, 8) not null,
  confidence_score numeric(8, 4) not null default 70,
  derivation_method text not null default 'sector_mapping',
  as_of_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (etf_instrument_id, theme, as_of_date, derivation_method)
);

create table if not exists portfolio_lookthrough_exposures (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  exposure_type text not null,
  exposure_name text not null,
  exposure_weight numeric(12, 8) not null,
  direct_weight numeric(12, 8) not null default 0,
  etf_lookthrough_weight numeric(12, 8) not null default 0,
  as_of_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, exposure_type, exposure_name, as_of_date)
);

create table if not exists etf_exposure_refresh_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null default 'etf-lookthrough-refresh',
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('success', 'partial_success', 'failed')),
  etfs_requested integer not null default 0,
  etfs_refreshed integer not null default 0,
  sector_rows integer not null default 0,
  country_rows integer not null default 0,
  top_holding_rows integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table portfolio_review_reports
  add column if not exists geography_review jsonb not null default '{}'::jsonb;

create index if not exists idx_etf_sector_exposures_instrument_date
  on etf_sector_exposures (etf_instrument_id, as_of_date desc);

create index if not exists idx_etf_country_exposures_instrument_date
  on etf_country_exposures (etf_instrument_id, as_of_date desc);

create index if not exists idx_etf_top_holdings_instrument_date
  on etf_top_holdings (etf_instrument_id, as_of_date desc);

create index if not exists idx_etf_theme_exposures_instrument_date
  on etf_theme_exposures (etf_instrument_id, as_of_date desc);

create index if not exists idx_portfolio_lookthrough_exposures_portfolio_date
  on portfolio_lookthrough_exposures (portfolio_id, as_of_date desc, exposure_type);

create index if not exists idx_etf_exposure_refresh_logs_created
  on etf_exposure_refresh_logs (created_at desc);

drop trigger if exists trg_etf_sector_exposures_updated_at on etf_sector_exposures;
create trigger trg_etf_sector_exposures_updated_at before update on etf_sector_exposures for each row execute function set_updated_at();

drop trigger if exists trg_etf_country_exposures_updated_at on etf_country_exposures;
create trigger trg_etf_country_exposures_updated_at before update on etf_country_exposures for each row execute function set_updated_at();

drop trigger if exists trg_etf_top_holdings_updated_at on etf_top_holdings;
create trigger trg_etf_top_holdings_updated_at before update on etf_top_holdings for each row execute function set_updated_at();

drop trigger if exists trg_etf_theme_exposures_updated_at on etf_theme_exposures;
create trigger trg_etf_theme_exposures_updated_at before update on etf_theme_exposures for each row execute function set_updated_at();

drop trigger if exists trg_portfolio_lookthrough_exposures_updated_at on portfolio_lookthrough_exposures;
create trigger trg_portfolio_lookthrough_exposures_updated_at before update on portfolio_lookthrough_exposures for each row execute function set_updated_at();

alter table etf_sector_exposures enable row level security;
alter table etf_country_exposures enable row level security;
alter table etf_top_holdings enable row level security;
alter table etf_theme_exposures enable row level security;
alter table portfolio_lookthrough_exposures enable row level security;
alter table etf_exposure_refresh_logs enable row level security;

drop policy if exists "authenticated users can read etf sector exposures" on etf_sector_exposures;
create policy "authenticated users can read etf sector exposures" on etf_sector_exposures for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read etf country exposures" on etf_country_exposures;
create policy "authenticated users can read etf country exposures" on etf_country_exposures for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read etf top holdings" on etf_top_holdings;
create policy "authenticated users can read etf top holdings" on etf_top_holdings for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read etf theme exposures" on etf_theme_exposures;
create policy "authenticated users can read etf theme exposures" on etf_theme_exposures for select using (auth.role() = 'authenticated');

drop policy if exists "users can read own portfolio lookthrough exposures" on portfolio_lookthrough_exposures;
create policy "users can read own portfolio lookthrough exposures" on portfolio_lookthrough_exposures
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from portfolios p
      join users u on u.id = p.user_id
      where p.id = portfolio_lookthrough_exposures.portfolio_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

drop policy if exists "authenticated users can read etf exposure refresh logs" on etf_exposure_refresh_logs;
create policy "authenticated users can read etf exposure refresh logs" on etf_exposure_refresh_logs for select using (auth.role() = 'authenticated');
