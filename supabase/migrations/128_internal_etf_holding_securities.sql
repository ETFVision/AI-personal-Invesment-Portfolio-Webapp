-- Incrementally backfill internal-only securities for ETF top-holding symbols.
--
-- Apply manually after migration 127. Migration 127 links newly seeded
-- selectable instruments first, so this migration only creates internal stubs
-- for remaining non-universe ETF underlying holdings.

alter table securities_master add column if not exists is_user_selectable boolean not null default false;
alter table securities_master add column if not exists is_internal_only boolean not null default false;

with distinct_holdings as (
  select
    upper(trim(holding_symbol)) as holding_symbol,
    max(nullif(trim(holding_name), '')) as holding_name,
    count(*) as row_count,
    max(as_of_date) as latest_as_of_date
  from etf_top_holdings
  where nullif(trim(holding_symbol), '') is not null
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
    holding.holding_symbol,
    coalesce(holding.holding_name, holding.holding_symbol),
    'STOCK',
    'EQUITY',
    true,
    false,
    true,
    jsonb_build_array('etf_top_holdings', 'etfvision'),
    60,
    format(
      'Internal ETF underlying security backfilled from %s top-holding row(s); latest as-of date %s by migration 128.',
      holding.row_count,
      holding.latest_as_of_date
    )
  from distinct_holdings holding
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

select * from public.sync_etf_holding_security_ids();
select * from public.sync_security_issuer_links();
