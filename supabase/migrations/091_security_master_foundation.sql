-- Security Master Foundation Phase 1.
-- Additive only: creates canonical security identity tables, adds nullable
-- instrument identifier columns, and backfills current active instruments.
-- This migration does not change portfolio, look-through, recommendation, or
-- telemetry calculations.

create table if not exists securities_master (
  id uuid primary key default gen_random_uuid(),
  canonical_symbol text,
  canonical_name text not null,
  security_type text not null default 'UNKNOWN',
  asset_category text,
  sector text,
  industry text,
  country text,
  currency text,
  primary_exchange text,
  isin text,
  figi text,
  cusip text,
  sedol text,
  lei text,
  is_active boolean not null default true,
  source_priority jsonb not null default '[]'::jsonb,
  identifier_quality_score numeric(8, 4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security_identifiers (
  id uuid primary key default gen_random_uuid(),
  security_id uuid not null references securities_master(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  source text not null,
  is_primary boolean not null default false,
  valid_from date,
  valid_to date,
  confidence_score numeric(8, 4),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  provider_raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security_aliases (
  id uuid primary key default gen_random_uuid(),
  security_id uuid not null references securities_master(id) on delete cascade,
  old_symbol text,
  new_symbol text,
  alias_type text not null,
  reason text,
  effective_date date,
  valid_from date,
  valid_to date,
  source text not null default 'etfvision',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table instruments add column if not exists security_id uuid references securities_master(id) on delete set null;
alter table instruments add column if not exists isin text;
alter table instruments add column if not exists cusip text;
alter table instruments add column if not exists figi text;
alter table instruments add column if not exists provider_symbol text;
alter table instruments add column if not exists identifier_quality_score numeric(8, 4);
alter table instruments add column if not exists identifier_last_refreshed_at timestamptz;
alter table instruments add column if not exists coverage_status text;
alter table instruments add column if not exists is_user_selectable boolean not null default true;
alter table instruments add column if not exists is_internal_only boolean not null default false;
alter table instruments add column if not exists is_alpha_enabled boolean;

create unique index if not exists idx_securities_master_active_isin
  on securities_master (isin)
  where is_active = true and isin is not null and isin <> '';

create unique index if not exists idx_securities_master_active_figi
  on securities_master (figi)
  where is_active = true and figi is not null and figi <> '';

create index if not exists idx_securities_master_exchange_symbol
  on securities_master (primary_exchange, canonical_symbol);

create index if not exists idx_security_identifiers_lookup
  on security_identifiers (identifier_type, identifier_value);

create index if not exists idx_security_identifiers_security
  on security_identifiers (security_id);

create unique index if not exists idx_security_identifiers_active_unique
  on security_identifiers (identifier_type, identifier_value, source, security_id)
  where valid_to is null;

create index if not exists idx_security_aliases_old_symbol
  on security_aliases (old_symbol);

create index if not exists idx_security_aliases_security
  on security_aliases (security_id);

create unique index if not exists idx_security_aliases_active_unique
  on security_aliases (security_id, old_symbol, new_symbol, alias_type, source)
  where valid_to is null;

create index if not exists idx_instruments_security_id
  on instruments (security_id);

create index if not exists idx_instruments_isin
  on instruments (isin);

create index if not exists idx_instruments_provider_symbol
  on instruments (provider_primary, provider_symbol);

drop trigger if exists trg_securities_master_updated_at on securities_master;
create trigger trg_securities_master_updated_at before update on securities_master for each row execute function set_updated_at();

drop trigger if exists trg_security_identifiers_updated_at on security_identifiers;
create trigger trg_security_identifiers_updated_at before update on security_identifiers for each row execute function set_updated_at();

drop trigger if exists trg_security_aliases_updated_at on security_aliases;
create trigger trg_security_aliases_updated_at before update on security_aliases for each row execute function set_updated_at();

alter table securities_master enable row level security;
alter table security_identifiers enable row level security;
alter table security_aliases enable row level security;

drop policy if exists "authenticated users can read securities master" on securities_master;
create policy "authenticated users can read securities master" on securities_master for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read security identifiers" on security_identifiers;
create policy "authenticated users can read security identifiers" on security_identifiers for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read security aliases" on security_aliases;
create policy "authenticated users can read security aliases" on security_aliases for select using (auth.role() = 'authenticated');

with instrument_source as (
  select
    i.id as instrument_id,
    nullif(trim(i.symbol), '') as symbol,
    i.name,
    i.instrument_type,
    i.asset_category,
    i.sector,
    i.industry,
    i.geography,
    i.currency,
    i.exchange,
    i.provider_primary,
    coalesce(
      nullif(i.provider_metadata->'financial_modeling_prep'->>'symbol', ''),
      nullif(i.provider_metadata->>'symbol', ''),
      nullif(trim(i.symbol), '')
    ) as provider_symbol,
    coalesce(
      nullif(i.provider_metadata->'financial_modeling_prep'->>'isin', ''),
      nullif(i.provider_metadata->>'isin', '')
    ) as isin,
    coalesce(
      nullif(i.provider_metadata->'financial_modeling_prep'->>'cusip', ''),
      nullif(i.provider_metadata->>'cusip', '')
    ) as cusip,
    coalesce(
      nullif(i.provider_metadata->'financial_modeling_prep'->>'figi', ''),
      nullif(i.provider_metadata->>'figi', '')
    ) as figi,
    i.provider_metadata
  from instruments i
  where i.is_active = true
    and nullif(trim(i.symbol), '') is not null
),
inserted_securities as (
  insert into securities_master (
    canonical_symbol,
    canonical_name,
    security_type,
    asset_category,
    sector,
    industry,
    country,
    currency,
    primary_exchange,
    isin,
    figi,
    cusip,
    is_active,
    source_priority,
    identifier_quality_score,
    notes
  )
  select
    src.symbol,
    src.name,
    case
      when src.instrument_type = 'stock' then 'STOCK'
      when src.instrument_type in ('etf', 'crypto_etf') then 'ETF'
      when src.asset_category = 'BOND' then 'ETF'
      when src.asset_category = 'CASH' then 'FUND'
      else 'UNKNOWN'
    end,
    src.asset_category,
    src.sector,
    src.industry,
    src.geography,
    src.currency,
    src.exchange,
    src.isin,
    src.figi,
    src.cusip,
    true,
    jsonb_build_array(coalesce(src.provider_primary, 'seeded'), 'etfvision'),
    case
      when src.figi is not null then 98
      when src.isin is not null then 95
      when src.cusip is not null then 90
      when src.exchange is not null and src.symbol is not null then 75
      else 55
    end,
    'Backfilled from active ETFVision instrument universe by migration 091.'
  from instrument_source src
  where not exists (
    select 1
    from securities_master sm
    where sm.is_active = true
      and (
        (src.figi is not null and sm.figi = src.figi)
        or (src.isin is not null and sm.isin = src.isin)
        or (src.figi is null and src.isin is null and sm.primary_exchange is not distinct from src.exchange and upper(sm.canonical_symbol) = upper(src.symbol))
      )
  )
  returning id, canonical_symbol, isin, figi, cusip, primary_exchange
),
matched as (
  select
    src.*,
    coalesce(sm_by_figi.id, sm_by_isin.id, sm_by_symbol.id) as security_id
  from instrument_source src
  left join securities_master sm_by_figi
    on src.figi is not null and sm_by_figi.figi = src.figi and sm_by_figi.is_active = true
  left join securities_master sm_by_isin
    on src.isin is not null and sm_by_isin.isin = src.isin and sm_by_isin.is_active = true
  left join securities_master sm_by_symbol
    on src.symbol is not null
    and sm_by_symbol.primary_exchange is not distinct from src.exchange
    and upper(sm_by_symbol.canonical_symbol) = upper(src.symbol)
    and sm_by_symbol.is_active = true
)
update instruments i
set
  security_id = matched.security_id,
  isin = matched.isin,
  cusip = matched.cusip,
  figi = matched.figi,
  provider_symbol = matched.provider_symbol,
  identifier_quality_score = case
    when matched.figi is not null then 98
    when matched.isin is not null then 95
    when matched.cusip is not null then 90
    when matched.exchange is not null and matched.symbol is not null then 75
    else 55
  end,
  identifier_last_refreshed_at = now(),
  coverage_status = coalesce(i.coverage_status, case when matched.security_id is not null then 'mapped' else 'needs_identifier_review' end)
from matched
where i.id = matched.instrument_id
  and matched.security_id is not null;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'SYMBOL', upper(i.symbol), 'etfvision', true, 80, '{}'::jsonb
from instruments i
where i.security_id is not null and i.symbol is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'EXCHANGE_SYMBOL', concat_ws(':', i.exchange, upper(i.symbol)), 'etfvision', true, 82, '{}'::jsonb
from instruments i
where i.security_id is not null and i.symbol is not null and i.exchange is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'PROVIDER_SYMBOL', upper(i.provider_symbol), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 82, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
where i.security_id is not null and i.provider_symbol is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'ISIN', upper(i.isin), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 95, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
where i.security_id is not null and i.isin is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'CUSIP', upper(i.cusip), coalesce(i.provider_primary, 'financial_modeling_prep'), false, 90, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
where i.security_id is not null and i.cusip is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'FIGI', upper(i.figi), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 98, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
where i.security_id is not null and i.figi is not null
on conflict do nothing;

insert into security_aliases (security_id, old_symbol, new_symbol, alias_type, reason, source, notes)
select i.security_id, 'BRK-B', 'BRK.B', 'SYMBOL_FORMAT_VARIANT', 'FMP uses dash format for Berkshire Hathaway Class B.', 'etfvision', 'Alias does not imply share-class merge beyond this configured security.'
from instruments i
where i.symbol = 'BRK.B' and i.security_id is not null
on conflict do nothing;

insert into security_aliases (security_id, old_symbol, new_symbol, alias_type, reason, source, notes)
select i.security_id, 'BRK/B', 'BRK.B', 'SYMBOL_FORMAT_VARIANT', 'Slash format can appear in legacy/provider ticker displays.', 'etfvision', 'Alias does not imply share-class merge beyond this configured security.'
from instruments i
where i.symbol = 'BRK.B' and i.security_id is not null
on conflict do nothing;

insert into security_aliases (security_id, old_symbol, new_symbol, alias_type, reason, effective_date, source, notes)
select i.security_id, 'FB', 'META', 'TICKER_CHANGE', 'Facebook changed ticker to META.', '2022-06-09'::date, 'etfvision', 'Historical alias for Meta Platforms.'
from instruments i
where i.symbol = 'META' and i.security_id is not null
on conflict do nothing;
