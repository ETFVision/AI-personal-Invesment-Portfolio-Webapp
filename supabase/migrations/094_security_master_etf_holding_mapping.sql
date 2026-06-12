-- Security Master Phase 2: map ETF holdings and portfolio look-through holdings.
--
-- Additive only. This migration does not switch portfolio concentration,
-- overlap, recommendation, or assistant calculations to security_id. It adds
-- canonical security references and a sync helper so raw holding symbols can be
-- dual-run and audited against canonical security mappings.

alter table etf_top_holdings add column if not exists holding_security_id uuid references securities_master(id) on delete set null;
alter table etf_top_holdings add column if not exists mapping_status text not null default 'unmapped';
alter table etf_top_holdings add column if not exists mapping_confidence_score numeric(8, 4);
alter table etf_top_holdings add column if not exists mapping_source text;
alter table etf_top_holdings add column if not exists mapping_updated_at timestamptz;

alter table portfolio_lookthrough_holdings add column if not exists holding_security_id uuid references securities_master(id) on delete set null;
alter table portfolio_lookthrough_holdings add column if not exists mapping_status text not null default 'unmapped';
alter table portfolio_lookthrough_holdings add column if not exists mapping_confidence_score numeric(8, 4);
alter table portfolio_lookthrough_holdings add column if not exists mapping_source text;
alter table portfolio_lookthrough_holdings add column if not exists mapping_updated_at timestamptz;

alter table portfolio_lookthrough_exposures add column if not exists exposure_security_id uuid references securities_master(id) on delete set null;

create index if not exists idx_etf_top_holdings_holding_security
  on etf_top_holdings (holding_security_id, as_of_date desc);

create index if not exists idx_etf_top_holdings_mapping_status
  on etf_top_holdings (mapping_status, as_of_date desc);

create index if not exists idx_portfolio_lookthrough_holdings_security
  on portfolio_lookthrough_holdings (portfolio_id, holding_security_id, as_of_date desc);

create index if not exists idx_portfolio_lookthrough_holdings_mapping_status
  on portfolio_lookthrough_holdings (mapping_status, as_of_date desc);

create index if not exists idx_portfolio_lookthrough_exposures_security
  on portfolio_lookthrough_exposures (portfolio_id, exposure_security_id, as_of_date desc);

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
    union all
    select hi.row_id, sa.security_id, 35 as priority, 'security_alias' as source, 78::numeric as confidence
    from holding_inputs hi
    join security_aliases sa
      on sa.valid_to is null
      and (upper(trim(sa.old_symbol)) = hi.symbol_key or upper(trim(sa.new_symbol)) = hi.symbol_key)
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
    union all
    select hi.row_id, sa.security_id, 35 as priority, 'security_alias' as source, 78::numeric as confidence
    from holding_inputs hi
    join security_aliases sa
      on sa.valid_to is null
      and (upper(trim(sa.old_symbol)) = hi.symbol_key or upper(trim(sa.new_symbol)) = hi.symbol_key)
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

select * from public.sync_etf_holding_security_ids();
