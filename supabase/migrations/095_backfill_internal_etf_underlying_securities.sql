-- Security Master Phase 2B: internal ETF underlying securities.
--
-- Additive only. This creates non-user-selectable securities for ETF
-- underlying holdings that appear in provider/seeded top-holding data but are
-- not part of ETFVision's selectable instrument universe.

alter table securities_master add column if not exists is_user_selectable boolean not null default false;
alter table securities_master add column if not exists is_internal_only boolean not null default false;

update securities_master sm
set
  is_user_selectable = true,
  is_internal_only = false,
  updated_at = now()
from instruments i
where i.security_id = sm.id
  and i.is_active = true;

with unmapped_holdings as (
  select
    upper(trim(holding_symbol)) as holding_symbol,
    max(nullif(trim(holding_name), '')) as holding_name,
    count(*) as row_count,
    max(as_of_date) as latest_as_of_date
  from etf_top_holdings
  where mapping_status = 'unmapped'
    and holding_security_id is null
    and nullif(trim(holding_symbol), '') is not null
  group by upper(trim(holding_symbol))
),
inserted as (
  insert into securities_master (
    canonical_symbol,
    canonical_name,
    security_type,
    asset_category,
    is_active,
    is_user_selectable,
    is_internal_only,
    source_priority,
    identifier_quality_score,
    notes
  )
  select
    holding_symbol,
    coalesce(holding_name, holding_symbol),
    'STOCK',
    'EQUITY',
    true,
    false,
    true,
    jsonb_build_array('etf_top_holdings', 'etfvision'),
    60,
    format(
      'Internal ETF underlying security backfilled from %s top-holding row(s); latest as-of date %s.',
      row_count,
      latest_as_of_date
    )
  from unmapped_holdings holding
  where not exists (
    select 1
    from securities_master sm
    where sm.is_active = true
      and upper(trim(sm.canonical_symbol)) = holding.holding_symbol
  )
  returning id, canonical_symbol
)
insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select id, 'SYMBOL', canonical_symbol, 'etf_top_holdings', true, 60, '{}'::jsonb
from inserted
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select sm.id, 'SYMBOL', upper(trim(sm.canonical_symbol)), 'etf_top_holdings', true, 60, '{}'::jsonb
from securities_master sm
where sm.is_active = true
  and sm.is_internal_only = true
  and nullif(trim(sm.canonical_symbol), '') is not null
on conflict do nothing;

select * from public.sync_etf_holding_security_ids();
