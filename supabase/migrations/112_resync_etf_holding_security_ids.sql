-- Re-sync Security Master ETF holding mappings after ETF look-through backfill.
--
-- Idempotent migration:
-- 1. Expand issuer-name normalization for additional FMP suffixes.
-- 2. Re-run internal ETF underlying security stub backfill.
-- 3. Re-map ETF top holdings to Security Master rows.
-- 4. Re-sync issuer links for newly created stubs.

create or replace function public.normalize_issuer_name(input_name text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(coalesce(input_name, ''), '\s+', ' ', 'g'),
                            '\s+class\s+[a-z0-9]+$', '', 'i'
                          ),
                          '\s+ordinary\s+shares?$', '', 'i'
                        ),
                        '\s+common\s+stock$', '', 'i'
                      ),
                      '\s+sponsored\s+adr$', '', 'i'
                    ),
                    '\s+adr$', '', 'i'
                  ),
                  '\s+capital\s+stock$', '', 'i'
                ),
                '\s+series\s+[a-z0-9]+$', '', 'i'
              ),
              '\s+depositary\s+receipts?$', '', 'i'
            ),
            '\s+non-voting$', '', 'i'
          ),
          '[\.,]+$', '', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

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

select * from public.sync_security_issuer_links();
