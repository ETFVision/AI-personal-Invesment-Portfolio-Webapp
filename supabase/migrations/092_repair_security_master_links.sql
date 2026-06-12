-- Repair Security Master Phase 1 instrument links.
--
-- Migration 091 can create securities_master rows before instruments are linked.
-- This migration is intentionally idempotent: it links active instruments to
-- existing canonical securities, creates any missing canonical rows, and then
-- populates identifier and alias rows.

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
  'Backfilled from active ETFVision instrument universe by migration 092 repair.'
from instrument_source src
where not exists (
  select 1
  from securities_master sm
  where sm.is_active = true
    and (
      (src.figi is not null and sm.figi = src.figi)
      or (src.isin is not null and sm.isin = src.isin)
      or (
        src.symbol is not null
        and sm.primary_exchange is not distinct from src.exchange
        and upper(sm.canonical_symbol) = upper(src.symbol)
      )
    )
);

with instrument_source as (
  select
    i.id as instrument_id,
    nullif(trim(i.symbol), '') as symbol,
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
  coverage_status = case when matched.security_id is not null then 'mapped' else 'needs_identifier_review' end
from matched
where i.id = matched.instrument_id;

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
