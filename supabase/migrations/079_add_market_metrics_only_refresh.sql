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
    instrument_return_anchors.fifty_two_week_low,
    instrument_return_anchors.fifty_two_week_high,
    instrument_return_anchors.observation_count,
    instrument_return_anchors.history_start_date,
    instrument_return_anchors.history_end_date
  from instrument_return_anchors
  join target_instruments on target_instruments.id = instrument_return_anchors.instrument_id
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
    fifty_two_week_low = excluded.fifty_two_week_low,
    fifty_two_week_high = excluded.fifty_two_week_high,
    observation_count = excluded.observation_count,
    history_start_date = excluded.history_start_date,
    history_end_date = excluded.history_end_date,
    updated_at = now();
end;
$$;
