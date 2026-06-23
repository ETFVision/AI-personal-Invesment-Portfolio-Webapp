-- Lock in Security Master ETF holding mapping cleanup after migrations 127/128.
--
-- Removes identifiers attached to inactive securities, hardens the ETF holding
-- mapping function so inactive identifier/alias targets cannot become mapping
-- candidates, and deactivates dot/dash class-share internal stubs when an
-- active real security exists for the same class-share symbol.

delete from security_identifiers si
using securities_master sm
where si.security_id = sm.id
  and sm.is_active = false;

create or replace function public.sync_etf_holding_security_ids()
returns table (
  etf_top_holdings_mapped integer,
  etf_top_holdings_ambiguous integer,
  etf_top_holdings_unmapped integer,
  portfolio_holdings_mapped integer,
  portfolio_holdings_ambiguous integer,
  portfolio_holdings_unmapped integer,
  portfolio_exposures_mapped integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etf_mapped integer := 0;
  v_etf_ambiguous integer := 0;
  v_etf_unmapped integer := 0;
  v_portfolio_mapped integer := 0;
  v_portfolio_ambiguous integer := 0;
  v_portfolio_unmapped integer := 0;
  v_exposure_mapped integer := 0;
begin
  with holding_inputs as (
    select id as row_id, upper(trim(holding_symbol)) as symbol_key
    from etf_top_holdings
    where nullif(trim(holding_symbol), '') is not null
  ),
  candidate_rows as (
    select hi.row_id, i.security_id, 20 as priority, 'instrument_symbol' as source, 82::numeric as confidence
    from holding_inputs hi
    join instruments i on i.security_id is not null and i.is_active = true and upper(trim(i.symbol)) = hi.symbol_key
    union all
    select hi.row_id, i.security_id, 25 as priority, 'instrument_provider_symbol' as source, 82::numeric as confidence
    from holding_inputs hi
    join instruments i on i.security_id is not null and i.is_active = true and upper(trim(i.provider_symbol)) = hi.symbol_key
    union all
    select hi.row_id, si.security_id, 30 as priority, 'security_identifier' as source,
      case si.identifier_type when 'ISIN' then 95 when 'CUSIP' then 90 when 'PROVIDER_SYMBOL' then 82 else 80 end::numeric as confidence
    from holding_inputs hi
    join security_identifiers si
      on si.valid_to is null
      and (
        upper(trim(si.identifier_value)) = hi.symbol_key
        or (si.identifier_type = 'EXCHANGE_SYMBOL' and upper(split_part(si.identifier_value, ':', 2)) = hi.symbol_key)
      )
    join securities_master sm_identifier on sm_identifier.id = si.security_id and sm_identifier.is_active = true
    union all
    select hi.row_id, sa.security_id, 35 as priority, 'security_alias' as source, 78::numeric as confidence
    from holding_inputs hi
    join security_aliases sa
      on sa.valid_to is null
      and (upper(trim(sa.old_symbol)) = hi.symbol_key or upper(trim(sa.new_symbol)) = hi.symbol_key)
    join securities_master sm_alias on sm_alias.id = sa.security_id and sm_alias.is_active = true
    union all
    select hi.row_id, sm.id as security_id, 45 as priority, 'canonical_symbol' as source, 75::numeric as confidence
    from holding_inputs hi
    join securities_master sm on sm.is_active = true and upper(trim(sm.canonical_symbol)) = hi.symbol_key
  ),
  candidate_security as (
    select row_id, security_id, min(priority) as priority, max(confidence) as confidence, min(source) as source
    from candidate_rows
    where security_id is not null
    group by row_id, security_id
  ),
  candidate_summary as (
    select row_id, count(*) as security_count, min(priority) as best_priority
    from candidate_security
    group by row_id
  ),
  mapped as (
    select cs.row_id, cs.security_id, cs.confidence, cs.source
    from candidate_security cs
    join candidate_summary summary on summary.row_id = cs.row_id and summary.security_count = 1
  ),
  updated_mapped as (
    update etf_top_holdings row
    set
      holding_security_id = mapped.security_id,
      mapping_status = 'mapped',
      mapping_confidence_score = mapped.confidence,
      mapping_source = mapped.source,
      mapping_updated_at = now()
    from mapped
    where row.id = mapped.row_id
    returning row.id
  ),
  updated_ambiguous as (
    update etf_top_holdings row
    set
      mapping_status = 'ambiguous',
      mapping_confidence_score = 35,
      mapping_source = 'multiple_security_candidates',
      mapping_updated_at = now()
    from candidate_summary summary
    where row.id = summary.row_id
      and summary.security_count > 1
      and row.holding_security_id is null
    returning row.id
  ),
  updated_unmapped as (
    update etf_top_holdings row
    set
      mapping_status = 'unmapped',
      mapping_confidence_score = 0,
      mapping_source = null,
      mapping_updated_at = now()
    where row.holding_security_id is null
      and not exists (select 1 from candidate_summary summary where summary.row_id = row.id)
    returning row.id
  )
  select
    (select count(*) from updated_mapped),
    (select count(*) from updated_ambiguous),
    (select count(*) from updated_unmapped)
  into v_etf_mapped, v_etf_ambiguous, v_etf_unmapped;

  with holding_inputs as (
    select id as row_id, upper(trim(holding_symbol)) as symbol_key
    from portfolio_lookthrough_holdings
    where nullif(trim(holding_symbol), '') is not null
  ),
  candidate_rows as (
    select hi.row_id, i.security_id, 20 as priority, 'instrument_symbol' as source, 82::numeric as confidence
    from holding_inputs hi
    join instruments i on i.security_id is not null and i.is_active = true and upper(trim(i.symbol)) = hi.symbol_key
    union all
    select hi.row_id, i.security_id, 25 as priority, 'instrument_provider_symbol' as source, 82::numeric as confidence
    from holding_inputs hi
    join instruments i on i.security_id is not null and i.is_active = true and upper(trim(i.provider_symbol)) = hi.symbol_key
    union all
    select hi.row_id, si.security_id, 30 as priority, 'security_identifier' as source,
      case si.identifier_type when 'ISIN' then 95 when 'CUSIP' then 90 when 'PROVIDER_SYMBOL' then 82 else 80 end::numeric as confidence
    from holding_inputs hi
    join security_identifiers si
      on si.valid_to is null
      and (
        upper(trim(si.identifier_value)) = hi.symbol_key
        or (si.identifier_type = 'EXCHANGE_SYMBOL' and upper(split_part(si.identifier_value, ':', 2)) = hi.symbol_key)
      )
    join securities_master sm_identifier on sm_identifier.id = si.security_id and sm_identifier.is_active = true
    union all
    select hi.row_id, sa.security_id, 35 as priority, 'security_alias' as source, 78::numeric as confidence
    from holding_inputs hi
    join security_aliases sa
      on sa.valid_to is null
      and (upper(trim(sa.old_symbol)) = hi.symbol_key or upper(trim(sa.new_symbol)) = hi.symbol_key)
    join securities_master sm_alias on sm_alias.id = sa.security_id and sm_alias.is_active = true
    union all
    select hi.row_id, sm.id as security_id, 45 as priority, 'canonical_symbol' as source, 75::numeric as confidence
    from holding_inputs hi
    join securities_master sm on sm.is_active = true and upper(trim(sm.canonical_symbol)) = hi.symbol_key
  ),
  candidate_security as (
    select row_id, security_id, min(priority) as priority, max(confidence) as confidence, min(source) as source
    from candidate_rows
    where security_id is not null
    group by row_id, security_id
  ),
  candidate_summary as (
    select row_id, count(*) as security_count, min(priority) as best_priority
    from candidate_security
    group by row_id
  ),
  mapped as (
    select cs.row_id, cs.security_id, cs.confidence, cs.source
    from candidate_security cs
    join candidate_summary summary on summary.row_id = cs.row_id and summary.security_count = 1
  ),
  updated_mapped as (
    update portfolio_lookthrough_holdings row
    set
      holding_security_id = mapped.security_id,
      mapping_status = 'mapped',
      mapping_confidence_score = mapped.confidence,
      mapping_source = mapped.source,
      mapping_updated_at = now()
    from mapped
    where row.id = mapped.row_id
    returning row.id
  ),
  updated_ambiguous as (
    update portfolio_lookthrough_holdings row
    set
      mapping_status = 'ambiguous',
      mapping_confidence_score = 35,
      mapping_source = 'multiple_security_candidates',
      mapping_updated_at = now()
    from candidate_summary summary
    where row.id = summary.row_id
      and summary.security_count > 1
      and row.holding_security_id is null
    returning row.id
  ),
  updated_unmapped as (
    update portfolio_lookthrough_holdings row
    set
      mapping_status = 'unmapped',
      mapping_confidence_score = 0,
      mapping_source = null,
      mapping_updated_at = now()
    where row.holding_security_id is null
      and not exists (select 1 from candidate_summary summary where summary.row_id = row.id)
    returning row.id
  )
  select
    (select count(*) from updated_mapped),
    (select count(*) from updated_ambiguous),
    (select count(*) from updated_unmapped)
  into v_portfolio_mapped, v_portfolio_ambiguous, v_portfolio_unmapped;

  with mapped_holdings as (
    select distinct on (portfolio_id, as_of_date, holding_symbol)
      portfolio_id,
      as_of_date,
      holding_symbol,
      holding_security_id
    from portfolio_lookthrough_holdings
    where holding_security_id is not null
    order by portfolio_id, as_of_date, holding_symbol, total_weight desc
  ),
  updated_exposures as (
    update portfolio_lookthrough_exposures exposure
    set exposure_security_id = mapped_holdings.holding_security_id
    from mapped_holdings
    where exposure.exposure_type = 'top_holding'
      and exposure.portfolio_id = mapped_holdings.portfolio_id
      and exposure.as_of_date = mapped_holdings.as_of_date
      and upper(trim(exposure.exposure_name)) = upper(trim(mapped_holdings.holding_symbol))
    returning exposure.id
  )
  select count(*) into v_exposure_mapped from updated_exposures;

  return query select
    v_etf_mapped,
    v_etf_ambiguous,
    v_etf_unmapped,
    v_portfolio_mapped,
    v_portfolio_ambiguous,
    v_portfolio_unmapped,
    v_exposure_mapped;
end;
$$;

do $$
declare
  duplicate_symbols text[];
begin
  with duplicate_stubs as (
    select stub.id, stub.canonical_symbol
    from securities_master stub
    where stub.is_active = true
      and coalesce(stub.is_internal_only, false) = true
      and exists (
        select 1
        from securities_master real_security
        where real_security.is_active = true
          and not coalesce(real_security.is_internal_only, false)
          and real_security.id <> stub.id
          and (
            upper(replace(trim(real_security.canonical_symbol), '.', '-')) = upper(replace(trim(stub.canonical_symbol), '.', '-'))
            or upper(replace(trim(real_security.canonical_symbol), '-', '.')) = upper(replace(trim(stub.canonical_symbol), '-', '.'))
          )
      )
  ),
  deactivated as (
    update securities_master sm
    set
      is_active = false,
      updated_at = now(),
      notes = concat_ws(' ', nullif(sm.notes, ''), 'Deactivated by migration 129 because an active selectable security exists for the same dot/dash-normalized class-share symbol.')
    from duplicate_stubs duplicate
    where sm.id = duplicate.id
    returning duplicate.canonical_symbol
  )
  select array_agg(distinct canonical_symbol order by canonical_symbol) into duplicate_symbols
  from deactivated;

  if duplicate_symbols is not null then
    raise notice 'Migration 129 deactivated dot/dash duplicate internal-only securities for symbols: %', array_to_string(duplicate_symbols, ', ');
  else
    raise notice 'Migration 129 found no dot/dash duplicate internal-only securities to deactivate.';
  end if;
end;
$$;

delete from security_identifiers si
using securities_master sm
where si.security_id = sm.id
  and sm.is_active = false;

do $$
begin
  perform public.sync_etf_holding_security_ids();
  perform public.sync_security_issuer_links();
end;
$$;
