-- Widen the 20Y long-horizon completeness tolerance to absorb the provider's
-- 5000-bar history cap.
--
-- FMP's historical EOD endpoint returns a maximum of ~5000 daily bars, so the
-- deepest instruments only reach ~19.85 calendar years (earliest price lands
-- ~2006-08-07 rather than the true 20yr mark). The original +10 day tolerance on
-- twenty_year_complete was ~58 days too tight, so EVERY instrument failed the
-- check and return_20y was null universe-wide (have_20y = 0).
--
-- Widening the 20Y tolerance to 120 days treats any 2006-vintage instrument
-- (data from Aug/Sep/Oct 2006) as "20Y available" while still excluding 2007+
-- launches. The displayed 20Y return is therefore the deepest-available
-- (~19.7-19.85yr) total return, labelled 20Y for presentation. This is a
-- DISPLAY-ONLY metric: it does not feed scoring, guardrails, risk metrics, or
-- recommendation logic. 10Y/15Y tolerances are unchanged (they sit well inside
-- the data and are unaffected by the cap).
--
-- Apply manually to Supabase after migration 130, then re-run
--   select refresh_instrument_market_metrics_only(null);
-- to repopulate return_20y.

create or replace function refresh_instrument_market_metrics_only(target_instrument_ids uuid[] default null)
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
  long_baselines as (
    select
      instrument_return_anchors.instrument_id,
      ten_year.close_price as ten_year_baseline_price,
      fifteen_year.close_price as fifteen_year_baseline_price,
      twenty_year.close_price as twenty_year_baseline_price,
      instrument_return_anchors.history_start_date <= (instrument_return_anchors.as_of_date - interval '10 years' + interval '10 days')::date as ten_year_complete,
      instrument_return_anchors.history_start_date <= (instrument_return_anchors.as_of_date - interval '15 years' + interval '10 days')::date as fifteen_year_complete,
      instrument_return_anchors.history_start_date <= (instrument_return_anchors.as_of_date - interval '20 years' + interval '120 days')::date as twenty_year_complete
    from instrument_return_anchors
    join target_instruments on target_instruments.id = instrument_return_anchors.instrument_id
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = instrument_return_anchors.instrument_id
        and instrument_daily_returns.price_date >= (instrument_return_anchors.as_of_date - interval '10 years')::date
      order by instrument_daily_returns.price_date asc
      limit 1
    ) ten_year on true
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = instrument_return_anchors.instrument_id
        and instrument_daily_returns.price_date >= (instrument_return_anchors.as_of_date - interval '15 years')::date
      order by instrument_daily_returns.price_date asc
      limit 1
    ) fifteen_year on true
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = instrument_return_anchors.instrument_id
        and instrument_daily_returns.price_date >= (instrument_return_anchors.as_of_date - interval '20 years')::date
      order by instrument_daily_returns.price_date asc
      limit 1
    ) twenty_year on true
  )
  insert into instrument_market_metrics (
    instrument_id,
    latest_price,
    latest_price_date,
    previous_close_price,
    previous_price_date,
    daily_return,
    ytd_return,
    one_year_return,
    three_year_return,
    five_year_return,
    return_10y,
    return_15y,
    return_20y,
    fifty_two_week_low,
    fifty_two_week_high,
    observation_count,
    history_start_date,
    history_end_date
  )
  select
    instrument_return_anchors.instrument_id,
    instrument_return_anchors.latest_price,
    instrument_return_anchors.as_of_date,
    instrument_return_anchors.previous_close_price,
    instrument_return_anchors.previous_price_date,
    instrument_return_anchors.daily_return,
    case
      when instrument_return_anchors.ytd_baseline_price is null or instrument_return_anchors.ytd_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / instrument_return_anchors.ytd_baseline_price - 1
    end,
    case
      when instrument_return_anchors.one_year_baseline_price is null or instrument_return_anchors.one_year_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / instrument_return_anchors.one_year_baseline_price - 1
    end,
    case
      when instrument_return_anchors.three_year_baseline_price is null or instrument_return_anchors.three_year_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / instrument_return_anchors.three_year_baseline_price - 1
    end,
    case
      when instrument_return_anchors.five_year_baseline_price is null or instrument_return_anchors.five_year_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / instrument_return_anchors.five_year_baseline_price - 1
    end,
    case
      when not coalesce(long_baselines.ten_year_complete, false) or long_baselines.ten_year_baseline_price is null or long_baselines.ten_year_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / long_baselines.ten_year_baseline_price - 1
    end,
    case
      when not coalesce(long_baselines.fifteen_year_complete, false) or long_baselines.fifteen_year_baseline_price is null or long_baselines.fifteen_year_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / long_baselines.fifteen_year_baseline_price - 1
    end,
    case
      when not coalesce(long_baselines.twenty_year_complete, false) or long_baselines.twenty_year_baseline_price is null or long_baselines.twenty_year_baseline_price = 0 then null
      else instrument_return_anchors.latest_price / long_baselines.twenty_year_baseline_price - 1
    end,
    instrument_return_anchors.fifty_two_week_low,
    instrument_return_anchors.fifty_two_week_high,
    instrument_return_anchors.observation_count,
    instrument_return_anchors.history_start_date,
    instrument_return_anchors.history_end_date
  from instrument_return_anchors
  join target_instruments on target_instruments.id = instrument_return_anchors.instrument_id
  left join long_baselines on long_baselines.instrument_id = instrument_return_anchors.instrument_id
  on conflict (instrument_id) do update set
    latest_price = excluded.latest_price,
    latest_price_date = excluded.latest_price_date,
    previous_close_price = excluded.previous_close_price,
    previous_price_date = excluded.previous_price_date,
    daily_return = excluded.daily_return,
    ytd_return = excluded.ytd_return,
    one_year_return = excluded.one_year_return,
    three_year_return = excluded.three_year_return,
    five_year_return = excluded.five_year_return,
    return_10y = excluded.return_10y,
    return_15y = excluded.return_15y,
    return_20y = excluded.return_20y,
    fifty_two_week_low = excluded.fifty_two_week_low,
    fifty_two_week_high = excluded.fifty_two_week_high,
    observation_count = excluded.observation_count,
    history_start_date = excluded.history_start_date,
    history_end_date = excluded.history_end_date,
    updated_at = now();
end;
$$;
