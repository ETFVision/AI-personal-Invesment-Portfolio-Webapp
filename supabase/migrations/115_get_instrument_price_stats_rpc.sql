create or replace function get_instrument_price_stats(p_instrument_ids uuid[] default null)
returns table (
  instrument_id uuid,
  earliest_price_date date,
  latest_price_date date,
  observation_count integer
)
language sql
stable
as $$
  select
    instrument_prices.instrument_id,
    min(instrument_prices.price_date) as earliest_price_date,
    max(instrument_prices.price_date) as latest_price_date,
    count(*)::integer as observation_count
  from instrument_prices
  where p_instrument_ids is null
     or instrument_prices.instrument_id = any(p_instrument_ids)
  group by instrument_prices.instrument_id;
$$;
