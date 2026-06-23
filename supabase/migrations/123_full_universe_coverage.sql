-- Auto-size derived refresh jobs to the active universe and make the daily
-- returns cron incremental. Full/manual paths keep passing null incremental
-- days for an unchanged full recompute. Apply manually to Supabase.

drop function if exists refresh_instrument_daily_returns(uuid[]);

create or replace function refresh_instrument_daily_returns(
  target_instrument_ids uuid[] default null,
  incremental_days integer default null
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
  ordered_prices as (
    select
      instrument_prices.instrument_id,
      instrument_prices.price_date,
      instrument_prices.close_price,
      instrument_prices.provider,
      instrument_prices.currency,
      lag(instrument_prices.close_price) over (
        partition by instrument_prices.instrument_id
        order by instrument_prices.price_date
      ) as previous_close_price,
      lag(instrument_prices.close_price, 5) over (
        partition by instrument_prices.instrument_id
        order by instrument_prices.price_date
      ) as five_day_close_price
    from instrument_prices
    join target_instruments on target_instruments.id = instrument_prices.instrument_id
    where instrument_prices.close_price > 0
      and (
        incremental_days is null
        or instrument_prices.price_date >= current_date - (incremental_days + 20)
      )
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
  where incremental_days is null
     or ordered_prices.price_date >= current_date - incremental_days
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
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-daily-returns-refresh',
    'app-daily-instrument-return-anchors-refresh',
    'app-daily-instrument-market-metrics-refresh',
    'app-daily-instrument-risk-refresh'
  ];
begin
  foreach job_name in array job_names loop
    begin
      perform cron.unschedule(job_name);
    exception
      when others then
        null;
    end;
  end loop;
end;
$$;

select cron.schedule(
  'app-daily-instrument-daily-returns-refresh',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-daily-returns-refresh?batchSize=25&incrementalDays=30&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-return-anchors-refresh',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-return-anchors-refresh?batchSize=25&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh',
  '45 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-risk-refresh',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?minObservations=30&lockTtlSeconds=600');$$
);
