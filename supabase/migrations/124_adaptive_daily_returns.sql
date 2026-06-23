-- Upgrade daily-return refresh from a simple fixed incremental window to a
-- per-instrument adaptive rebuild. Instruments whose daily returns do not cover
-- their stored price history are rebuilt from the start; complete instruments
-- only upsert the recent window. Apply manually to Supabase after migration 123.

drop function if exists refresh_instrument_daily_returns(uuid[], integer);

create or replace function refresh_instrument_daily_returns(
  target_instrument_ids uuid[] default null,
  p_recent_window_days integer default 30,
  p_force_full boolean default false
)
returns void
language plpgsql
as $$
begin
  with target_instruments as (
    select instruments.id
    from instruments
    where target_instrument_ids is null
       or instruments.id = any(target_instrument_ids)
  ),
  price_bounds as (
    select
      instrument_prices.instrument_id,
      min(instrument_prices.price_date) as first_price_date
    from instrument_prices
    join target_instruments on target_instruments.id = instrument_prices.instrument_id
    where instrument_prices.close_price > 0
    group by instrument_prices.instrument_id
  ),
  return_bounds as (
    select
      instrument_daily_returns.instrument_id,
      min(instrument_daily_returns.price_date) as first_return_date
    from instrument_daily_returns
    join target_instruments on target_instruments.id = instrument_daily_returns.instrument_id
    group by instrument_daily_returns.instrument_id
  ),
  rebuild_plan as (
    select
      price_bounds.instrument_id,
      case
        when p_force_full then date '1900-01-01'
        when return_bounds.first_return_date is null then date '1900-01-01'
        when return_bounds.first_return_date > price_bounds.first_price_date + 7 then date '1900-01-01'
        else current_date - greatest(1, p_recent_window_days)
      end as cutoff_date
    from price_bounds
    left join return_bounds on return_bounds.instrument_id = price_bounds.instrument_id
  ),
  ordered_prices as (
    select
      instrument_prices.instrument_id,
      instrument_prices.price_date,
      instrument_prices.close_price,
      instrument_prices.provider,
      instrument_prices.currency,
      rebuild_plan.cutoff_date,
      lag(instrument_prices.close_price) over (
        partition by instrument_prices.instrument_id
        order by instrument_prices.price_date
      ) as previous_close_price,
      lag(instrument_prices.close_price, 5) over (
        partition by instrument_prices.instrument_id
        order by instrument_prices.price_date
      ) as five_day_close_price
    from instrument_prices
    join rebuild_plan on rebuild_plan.instrument_id = instrument_prices.instrument_id
    where instrument_prices.close_price > 0
  )
  insert into instrument_daily_returns (
    instrument_id,
    price_date,
    close_price,
    previous_close_price,
    five_day_close_price,
    daily_return,
    weekly_return,
    provider,
    currency
  )
  select
    ordered_prices.instrument_id,
    ordered_prices.price_date,
    ordered_prices.close_price,
    ordered_prices.previous_close_price,
    ordered_prices.five_day_close_price,
    case
      when ordered_prices.previous_close_price is null or ordered_prices.previous_close_price = 0 then null
      else ordered_prices.close_price / ordered_prices.previous_close_price - 1
    end,
    case
      when ordered_prices.five_day_close_price is null or ordered_prices.five_day_close_price = 0 then null
      else ordered_prices.close_price / ordered_prices.five_day_close_price - 1
    end,
    ordered_prices.provider,
    ordered_prices.currency
  from ordered_prices
  where ordered_prices.price_date >= ordered_prices.cutoff_date
  on conflict (instrument_id, price_date) do update set
    close_price = excluded.close_price,
    previous_close_price = excluded.previous_close_price,
    five_day_close_price = excluded.five_day_close_price,
    daily_return = excluded.daily_return,
    weekly_return = excluded.weekly_return,
    provider = excluded.provider,
    currency = excluded.currency,
    updated_at = now();
end;
$$;

do $$
begin
  begin
    perform cron.unschedule('app-daily-instrument-daily-returns-refresh');
  exception
    when others then
      null;
  end;
end;
$$;

select cron.schedule(
  'app-daily-instrument-daily-returns-refresh',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-daily-returns-refresh?batchSize=25&recentWindowDays=30&lockTtlSeconds=300');$$
);
