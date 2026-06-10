create or replace function list_instrument_daily_return_stats(target_instrument_ids uuid[] default null)
returns table (
  instrument_id uuid,
  latest_price_date date,
  observation_count bigint
)
language sql
stable
as $$
  select
    instrument_daily_returns.instrument_id,
    max(instrument_daily_returns.price_date) as latest_price_date,
    count(*) as observation_count
  from instrument_daily_returns
  where target_instrument_ids is null
     or instrument_daily_returns.instrument_id = any(target_instrument_ids)
  group by instrument_daily_returns.instrument_id;
$$;
