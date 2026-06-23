-- Incrementally set up Security Master rows for newly-seeded active instruments.
--
-- Re-runs the migration 091 insert/link/identifier shape for instruments whose
-- security_id is still null, then refreshes issuer and ETF-holding security
-- links. Apply manually to Supabase after seeding newly-added instruments.

create temp table if not exists temp_security_master_newly_linked_instruments (
  instrument_id uuid primary key,
  security_id uuid not null,
  symbol text not null,
  instrument_type text,
  is_active boolean not null default true
) on commit drop;

truncate temp_security_master_newly_linked_instruments;

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
    ) as figi
  from instruments i
  where i.is_active = true
    and i.security_id is null
    and nullif(trim(i.symbol), '') is not null
)
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
  is_user_selectable,
  is_internal_only,
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
  true,
  false,
  jsonb_build_array(coalesce(src.provider_primary, 'seeded'), 'etfvision'),
  case
    when src.figi is not null then 98
    when src.isin is not null then 95
    when src.cusip is not null then 90
    when src.exchange is not null and src.symbol is not null then 75
    else 55
  end,
  'Incrementally backfilled from active ETFVision instrument universe by migration 127.'
from instrument_source src
where not exists (
  select 1
  from securities_master sm
  where sm.is_active = true
    and (
      (src.figi is not null and sm.figi = src.figi)
      or (src.isin is not null and sm.isin = src.isin)
      or (
        src.figi is null
        and src.isin is null
        and sm.primary_exchange is not distinct from src.exchange
        and upper(sm.canonical_symbol) = upper(src.symbol)
      )
    )
);

with instrument_source as (
  select
    i.id as instrument_id,
    nullif(trim(i.symbol), '') as symbol,
    i.instrument_type,
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
    ) as figi
  from instruments i
  where i.is_active = true
    and i.security_id is null
    and nullif(trim(i.symbol), '') is not null
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
),
updated as (
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
    coverage_status = case when matched.security_id is not null then 'mapped' else 'needs_identifier_review' end
  from matched
  where i.id = matched.instrument_id
    and matched.security_id is not null
  returning i.id as instrument_id, i.security_id, upper(i.symbol) as symbol, i.instrument_type, i.is_active
)
insert into temp_security_master_newly_linked_instruments (instrument_id, security_id, symbol, instrument_type, is_active)
select instrument_id, security_id, symbol, instrument_type, is_active
from updated
on conflict (instrument_id) do update set
  security_id = excluded.security_id,
  symbol = excluded.symbol,
  instrument_type = excluded.instrument_type,
  is_active = excluded.is_active;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'SYMBOL', upper(i.symbol), 'etfvision', true, 80, '{}'::jsonb
from instruments i
join temp_security_master_newly_linked_instruments linked on linked.instrument_id = i.id
where i.security_id is not null and i.symbol is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'EXCHANGE_SYMBOL', concat_ws(':', i.exchange, upper(i.symbol)), 'etfvision', true, 82, '{}'::jsonb
from instruments i
join temp_security_master_newly_linked_instruments linked on linked.instrument_id = i.id
where i.security_id is not null and i.symbol is not null and i.exchange is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'PROVIDER_SYMBOL', upper(i.provider_symbol), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 82, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
join temp_security_master_newly_linked_instruments linked on linked.instrument_id = i.id
where i.security_id is not null and i.provider_symbol is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'ISIN', upper(i.isin), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 95, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
join temp_security_master_newly_linked_instruments linked on linked.instrument_id = i.id
where i.security_id is not null and i.isin is not null
on conflict do nothing;

insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
select i.security_id, 'CUSIP', upper(i.cusip), coalesce(i.provider_primary, 'financial_modeling_prep'), false, 90, coalesce(i.provider_metadata, '{}'::jsonb)
from instruments i
join temp_security_master_newly_linked_instruments linked on linked.instrument_id = i.id
where i.security_id is not null and i.cusip is not null
on conflict do nothing;

select * from public.sync_security_issuer_links();
select * from public.sync_etf_holding_security_ids();

do $$
declare
  duplicate_symbols text[];
begin
  with duplicate_active as (
    select linked.symbol
    from temp_security_master_newly_linked_instruments linked
    join instruments i on i.id = linked.instrument_id
    join securities_master sm
      on sm.is_active = true
      and upper(trim(sm.canonical_symbol)) = linked.symbol
    where i.instrument_type = 'stock'
    group by linked.symbol
    having count(*) filter (where coalesce(sm.is_internal_only, false)) > 0
       and count(*) filter (where not coalesce(sm.is_internal_only, false)) > 0
  ),
  deactivated as (
    update securities_master sm
    set
      is_active = false,
      updated_at = now(),
      notes = concat_ws(' ', nullif(sm.notes, ''), 'Deactivated by migration 127 after selectable instrument security was linked for the same canonical symbol.')
    from duplicate_active duplicate
    where sm.is_active = true
      and coalesce(sm.is_internal_only, false) = true
      and upper(trim(sm.canonical_symbol)) = duplicate.symbol
    returning duplicate.symbol
  )
  select array_agg(distinct symbol order by symbol) into duplicate_symbols
  from deactivated;

  if duplicate_symbols is not null then
    raise notice 'Migration 127 deactivated internal-only duplicate securities for symbols: %', array_to_string(duplicate_symbols, ', ');
  else
    raise notice 'Migration 127 found no internal-only duplicate active securities to deactivate.';
  end if;
end;
$$;

select * from public.sync_etf_holding_security_ids();
