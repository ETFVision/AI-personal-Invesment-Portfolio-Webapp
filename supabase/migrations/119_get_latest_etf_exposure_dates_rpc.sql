create index if not exists idx_etf_sector_exposures_instrument_date
  on etf_sector_exposures (etf_instrument_id, as_of_date desc);

create index if not exists idx_etf_top_holdings_instrument_date
  on etf_top_holdings (etf_instrument_id, as_of_date desc);

create or replace function get_latest_etf_exposure_dates(p_instrument_ids uuid[] default null)
returns table (
  etf_instrument_id uuid,
  latest_exposure_date date,
  latest_holdings_date date
)
language sql
stable
as $$
  with sector_latest as (
    select
      etf_sector_exposures.etf_instrument_id,
      max(etf_sector_exposures.as_of_date) as latest_exposure_date
    from etf_sector_exposures
    where p_instrument_ids is null
       or etf_sector_exposures.etf_instrument_id = any(p_instrument_ids)
    group by etf_sector_exposures.etf_instrument_id
  ),
  holdings_latest as (
    select
      etf_top_holdings.etf_instrument_id,
      max(etf_top_holdings.as_of_date) as latest_holdings_date
    from etf_top_holdings
    where p_instrument_ids is null
       or etf_top_holdings.etf_instrument_id = any(p_instrument_ids)
    group by etf_top_holdings.etf_instrument_id
  )
  select
    coalesce(sector_latest.etf_instrument_id, holdings_latest.etf_instrument_id) as etf_instrument_id,
    sector_latest.latest_exposure_date,
    holdings_latest.latest_holdings_date
  from sector_latest
  full outer join holdings_latest
    on holdings_latest.etf_instrument_id = sector_latest.etf_instrument_id;
$$;
