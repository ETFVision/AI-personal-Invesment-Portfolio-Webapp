-- Add display-only 10Y/15Y/20Y risk windows.
--
-- These fields extend instrument_risk_metrics for instrument-detail display.
-- They do not feed risk_score, risk_bucket, volatility_bucket,
-- confidence_score, scoring, guardrails, or recommendation logic.

alter table instrument_risk_metrics add column if not exists volatility_10y numeric(28, 10);
alter table instrument_risk_metrics add column if not exists volatility_15y numeric(28, 10);
alter table instrument_risk_metrics add column if not exists volatility_20y numeric(28, 10);
alter table instrument_risk_metrics add column if not exists max_drawdown_10y numeric(28, 10);
alter table instrument_risk_metrics add column if not exists max_drawdown_15y numeric(28, 10);
alter table instrument_risk_metrics add column if not exists max_drawdown_20y numeric(28, 10);

create or replace function refresh_instrument_risk_metrics(target_instrument_ids uuid[] default null)
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
  ),
  daily_returns as (
    select
      ordered_prices.instrument_id,
      ordered_prices.price_date,
      ordered_prices.close_price,
      case
        when ordered_prices.previous_close_price is null or ordered_prices.previous_close_price = 0 then null
        else ordered_prices.close_price / ordered_prices.previous_close_price - 1
      end as daily_return,
      case
        when ordered_prices.five_day_close_price is null or ordered_prices.five_day_close_price = 0 then null
        else ordered_prices.close_price / ordered_prices.five_day_close_price - 1
      end as weekly_return
    from ordered_prices
  ),
  latest_prices as (
    select distinct on (daily_returns.instrument_id)
      daily_returns.instrument_id,
      daily_returns.price_date as latest_price_date,
      daily_returns.close_price as latest_close_price
    from daily_returns
    order by daily_returns.instrument_id, daily_returns.price_date desc
  ),
  stats as (
    select
      daily_returns.instrument_id,
      count(*)::integer as observation_count,
      min(daily_returns.price_date) as history_start_date,
      max(daily_returns.price_date) as history_end_date
    from daily_returns
    group by daily_returns.instrument_id
  ),
  return_stats as (
    select
      daily_returns.instrument_id,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '30 days') as return_count_30d,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '90 days') as return_count_90d,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') as return_count_1y,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year' and daily_returns.daily_return < 0) as negative_count_1y,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '30 days') * sqrt(252) as volatility_30d_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '90 days') * sqrt(252) as volatility_90d_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') * sqrt(252) as volatility_1y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '10 years') * sqrt(252) as volatility_10y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '15 years') * sqrt(252) as volatility_15y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '20 years') * sqrt(252) as volatility_20y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year' and daily_returns.daily_return < 0) * sqrt(252) as downside_volatility_raw,
      min(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') as worst_daily_return,
      min(daily_returns.weekly_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') as worst_weekly_return
    from daily_returns
    join latest_prices on latest_prices.instrument_id = daily_returns.instrument_id
    group by daily_returns.instrument_id
  ),
  risk_returns as (
    select
      return_stats.instrument_id,
      case when return_stats.return_count_30d >= 10 then return_stats.volatility_30d_raw else null end as volatility_30d,
      case when return_stats.return_count_90d >= 30 then return_stats.volatility_90d_raw else null end as volatility_90d,
      case when return_stats.return_count_1y >= 60 then return_stats.volatility_1y_raw else null end as volatility_1y,
      case when stats.history_start_date <= (latest_prices.latest_price_date - interval '10 years' + interval '30 days')::date then return_stats.volatility_10y_raw else null end as volatility_10y,
      case when stats.history_start_date <= (latest_prices.latest_price_date - interval '15 years' + interval '30 days')::date then return_stats.volatility_15y_raw else null end as volatility_15y,
      case when stats.history_start_date <= (latest_prices.latest_price_date - interval '20 years' + interval '120 days')::date then return_stats.volatility_20y_raw else null end as volatility_20y,
      case when return_stats.negative_count_1y >= 10 then return_stats.downside_volatility_raw else null end as downside_volatility,
      case when return_stats.return_count_1y = 0 then null else return_stats.negative_count_1y::numeric / return_stats.return_count_1y::numeric end as negative_return_frequency,
      return_stats.worst_daily_return,
      return_stats.worst_weekly_return
    from return_stats
    join latest_prices on latest_prices.instrument_id = return_stats.instrument_id
    join stats on stats.instrument_id = return_stats.instrument_id
  ),
  price_drawdowns as (
    select
      ordered_prices.instrument_id,
      ordered_prices.price_date,
      ordered_prices.close_price,
      max(ordered_prices.close_price) over (
        partition by ordered_prices.instrument_id
        order by ordered_prices.price_date
        rows between unbounded preceding and current row
      ) as running_peak
    from ordered_prices
  ),
  drawdown_stats as (
    select
      price_drawdowns.instrument_id,
      min(case when price_drawdowns.running_peak = 0 then null else price_drawdowns.close_price / price_drawdowns.running_peak - 1 end) as max_drawdown
    from price_drawdowns
    group by price_drawdowns.instrument_id
  ),
  latest_drawdowns as (
    select distinct on (price_drawdowns.instrument_id)
      price_drawdowns.instrument_id,
      case when price_drawdowns.running_peak = 0 then null else price_drawdowns.close_price / price_drawdowns.running_peak - 1 end as current_drawdown,
      price_drawdowns.running_peak
    from price_drawdowns
    order by price_drawdowns.instrument_id, price_drawdowns.price_date desc
  ),
  latest_peak_dates as (
    select
      price_drawdowns.instrument_id,
      max(price_drawdowns.price_date) as latest_peak_date
    from price_drawdowns
    join latest_drawdowns on latest_drawdowns.instrument_id = price_drawdowns.instrument_id
    where price_drawdowns.close_price = latest_drawdowns.running_peak
    group by price_drawdowns.instrument_id
  ),
  scored as (
    select
      latest_prices.instrument_id,
      latest_prices.latest_price_date,
      risk_returns.volatility_30d,
      risk_returns.volatility_90d,
      risk_returns.volatility_1y,
      risk_returns.volatility_10y,
      risk_returns.volatility_15y,
      risk_returns.volatility_20y,
      case
        when risk_returns.volatility_30d is null or risk_returns.volatility_90d is null or risk_returns.volatility_90d = 0 then 'insufficient_data'
        when risk_returns.volatility_30d > risk_returns.volatility_90d * 1.15 then 'rising'
        when risk_returns.volatility_30d < risk_returns.volatility_90d * 0.85 then 'falling'
        else 'stable'
      end as volatility_trend,
      risk_returns.downside_volatility,
      latest_drawdowns.current_drawdown,
      drawdown_stats.max_drawdown,
      case
        when latest_drawdowns.current_drawdown is not null
         and latest_drawdowns.current_drawdown < 0
         and latest_peak_dates.latest_peak_date is not null
          then greatest(0, latest_prices.latest_price_date - latest_peak_dates.latest_peak_date)
        else 0
      end::integer as drawdown_duration_days,
      case
        when drawdown_stats.max_drawdown is null then 'insufficient_data'
        when abs(drawdown_stats.max_drawdown) < 0.1 then 'low'
        when abs(drawdown_stats.max_drawdown) < 0.2 then 'moderate'
        when abs(drawdown_stats.max_drawdown) < 0.35 then 'elevated'
        else 'severe'
      end as drawdown_bucket,
      risk_returns.negative_return_frequency,
      risk_returns.worst_daily_return,
      risk_returns.worst_weekly_return,
      case
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) is null then 'insufficient_data'
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) < 0.12 then 'low'
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) < 0.25 then 'medium'
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) < 0.45 then 'high'
        else 'very_high'
      end as volatility_bucket,
      case
        when stats.observation_count >= 252 then 90
        when stats.observation_count >= 120 then 70
        when stats.observation_count >= 60 then 55
        when stats.observation_count >= 30 then 40
        else 20
      end::numeric as confidence_score,
      stats.observation_count,
      stats.history_start_date,
      stats.history_end_date
    from latest_prices
    join stats on stats.instrument_id = latest_prices.instrument_id
    left join risk_returns on risk_returns.instrument_id = latest_prices.instrument_id
    left join drawdown_stats on drawdown_stats.instrument_id = latest_prices.instrument_id
    left join latest_drawdowns on latest_drawdowns.instrument_id = latest_prices.instrument_id
    left join latest_peak_dates on latest_peak_dates.instrument_id = latest_prices.instrument_id
  ),
  final_scores as (
    select
      scored.*,
      case
        when scored.volatility_1y is null or scored.max_drawdown is null then null
        else
          least(greatest((scored.volatility_1y / 0.6) * 100, 0), 100) * 0.35 +
          least(greatest((abs(scored.max_drawdown) / 0.5) * 100, 0), 100) * 0.35 +
          least(greatest((coalesce(scored.downside_volatility, scored.volatility_1y) / 0.45) * 100, 0), 100) * 0.2 +
          least(greatest(coalesce(scored.negative_return_frequency, 0.5) * 100, 0), 100) * 0.1
      end as risk_score
    from scored
  )
  insert into instrument_risk_metrics (
    instrument_id,
    metric_date,
    volatility_30d,
    volatility_90d,
    volatility_1y,
    volatility_10y,
    volatility_15y,
    volatility_20y,
    volatility_trend,
    downside_volatility,
    current_drawdown,
    max_drawdown,
    drawdown_duration_days,
    drawdown_bucket,
    negative_return_frequency,
    worst_daily_return,
    worst_weekly_return,
    risk_score,
    risk_bucket,
    volatility_bucket,
    confidence_score,
    observation_count,
    history_start_date,
    history_end_date,
    calculated_at
  )
  select
    final_scores.instrument_id,
    final_scores.latest_price_date,
    final_scores.volatility_30d,
    final_scores.volatility_90d,
    final_scores.volatility_1y,
    final_scores.volatility_10y,
    final_scores.volatility_15y,
    final_scores.volatility_20y,
    final_scores.volatility_trend,
    final_scores.downside_volatility,
    final_scores.current_drawdown,
    final_scores.max_drawdown,
    final_scores.drawdown_duration_days,
    final_scores.drawdown_bucket,
    final_scores.negative_return_frequency,
    final_scores.worst_daily_return,
    final_scores.worst_weekly_return,
    final_scores.risk_score,
    case
      when final_scores.risk_score is null then 'insufficient_data'
      when final_scores.risk_score < 25 then 'low'
      when final_scores.risk_score < 50 then 'medium'
      when final_scores.risk_score < 75 then 'high'
      else 'very_high'
    end,
    final_scores.volatility_bucket,
    final_scores.confidence_score,
    final_scores.observation_count,
    final_scores.history_start_date,
    final_scores.history_end_date,
    now()
  from final_scores
  on conflict (instrument_id, metric_date) do update set
    volatility_30d = excluded.volatility_30d,
    volatility_90d = excluded.volatility_90d,
    volatility_1y = excluded.volatility_1y,
    volatility_10y = excluded.volatility_10y,
    volatility_15y = excluded.volatility_15y,
    volatility_20y = excluded.volatility_20y,
    volatility_trend = excluded.volatility_trend,
    downside_volatility = excluded.downside_volatility,
    current_drawdown = excluded.current_drawdown,
    max_drawdown = excluded.max_drawdown,
    drawdown_duration_days = excluded.drawdown_duration_days,
    drawdown_bucket = excluded.drawdown_bucket,
    negative_return_frequency = excluded.negative_return_frequency,
    worst_daily_return = excluded.worst_daily_return,
    worst_weekly_return = excluded.worst_weekly_return,
    risk_score = excluded.risk_score,
    risk_bucket = excluded.risk_bucket,
    volatility_bucket = excluded.volatility_bucket,
    confidence_score = excluded.confidence_score,
    observation_count = excluded.observation_count,
    history_start_date = excluded.history_start_date,
    history_end_date = excluded.history_end_date,
    calculated_at = now(),
    updated_at = now();
end;
$$;

create or replace function refresh_instrument_risk_metrics_only(target_instrument_ids uuid[] default null)
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
  daily_returns as (
    select
      instrument_daily_returns.instrument_id,
      instrument_daily_returns.price_date,
      instrument_daily_returns.close_price,
      instrument_daily_returns.daily_return,
      instrument_daily_returns.weekly_return
    from instrument_daily_returns
    join target_instruments on target_instruments.id = instrument_daily_returns.instrument_id
    where instrument_daily_returns.close_price > 0
  ),
  latest_prices as (
    select distinct on (daily_returns.instrument_id)
      daily_returns.instrument_id,
      daily_returns.price_date as latest_price_date,
      daily_returns.close_price as latest_close_price
    from daily_returns
    order by daily_returns.instrument_id, daily_returns.price_date desc
  ),
  stats as (
    select
      daily_returns.instrument_id,
      count(*)::integer as observation_count,
      min(daily_returns.price_date) as history_start_date,
      max(daily_returns.price_date) as history_end_date
    from daily_returns
    group by daily_returns.instrument_id
  ),
  return_stats as (
    select
      daily_returns.instrument_id,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '30 days') as return_count_30d,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '90 days') as return_count_90d,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') as return_count_1y,
      count(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year' and daily_returns.daily_return < 0) as negative_count_1y,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '30 days') * sqrt(252) as volatility_30d_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '90 days') * sqrt(252) as volatility_90d_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') * sqrt(252) as volatility_1y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '10 years') * sqrt(252) as volatility_10y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '15 years') * sqrt(252) as volatility_15y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '20 years') * sqrt(252) as volatility_20y_raw,
      stddev_samp(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year' and daily_returns.daily_return < 0) * sqrt(252) as downside_volatility_raw,
      min(daily_returns.daily_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') as worst_daily_return,
      min(daily_returns.weekly_return) filter (where daily_returns.price_date >= latest_prices.latest_price_date - interval '1 year') as worst_weekly_return
    from daily_returns
    join latest_prices on latest_prices.instrument_id = daily_returns.instrument_id
    group by daily_returns.instrument_id
  ),
  risk_returns as (
    select
      return_stats.instrument_id,
      case when return_stats.return_count_30d >= 10 then return_stats.volatility_30d_raw else null end as volatility_30d,
      case when return_stats.return_count_90d >= 30 then return_stats.volatility_90d_raw else null end as volatility_90d,
      case when return_stats.return_count_1y >= 60 then return_stats.volatility_1y_raw else null end as volatility_1y,
      case when stats.history_start_date <= (latest_prices.latest_price_date - interval '10 years' + interval '30 days')::date then return_stats.volatility_10y_raw else null end as volatility_10y,
      case when stats.history_start_date <= (latest_prices.latest_price_date - interval '15 years' + interval '30 days')::date then return_stats.volatility_15y_raw else null end as volatility_15y,
      case when stats.history_start_date <= (latest_prices.latest_price_date - interval '20 years' + interval '120 days')::date then return_stats.volatility_20y_raw else null end as volatility_20y,
      case when return_stats.negative_count_1y >= 10 then return_stats.downside_volatility_raw else null end as downside_volatility,
      case when return_stats.return_count_1y = 0 then null else return_stats.negative_count_1y::numeric / return_stats.return_count_1y::numeric end as negative_return_frequency,
      return_stats.worst_daily_return,
      return_stats.worst_weekly_return
    from return_stats
    join latest_prices on latest_prices.instrument_id = return_stats.instrument_id
    join stats on stats.instrument_id = return_stats.instrument_id
  ),
  price_drawdowns as (
    select
      daily_returns.instrument_id,
      daily_returns.price_date,
      daily_returns.close_price,
      max(daily_returns.close_price) over (
        partition by daily_returns.instrument_id
        order by daily_returns.price_date
        rows between unbounded preceding and current row
      ) as running_peak
    from daily_returns
  ),
  drawdown_stats as (
    select
      price_drawdowns.instrument_id,
      min(case when price_drawdowns.running_peak = 0 then null else price_drawdowns.close_price / price_drawdowns.running_peak - 1 end) as max_drawdown
    from price_drawdowns
    group by price_drawdowns.instrument_id
  ),
  latest_drawdowns as (
    select distinct on (price_drawdowns.instrument_id)
      price_drawdowns.instrument_id,
      case when price_drawdowns.running_peak = 0 then null else price_drawdowns.close_price / price_drawdowns.running_peak - 1 end as current_drawdown,
      price_drawdowns.running_peak
    from price_drawdowns
    order by price_drawdowns.instrument_id, price_drawdowns.price_date desc
  ),
  latest_peak_dates as (
    select
      price_drawdowns.instrument_id,
      max(price_drawdowns.price_date) as latest_peak_date
    from price_drawdowns
    join latest_drawdowns on latest_drawdowns.instrument_id = price_drawdowns.instrument_id
    where price_drawdowns.close_price = latest_drawdowns.running_peak
    group by price_drawdowns.instrument_id
  ),
  scored as (
    select
      latest_prices.instrument_id,
      latest_prices.latest_price_date,
      risk_returns.volatility_30d,
      risk_returns.volatility_90d,
      risk_returns.volatility_1y,
      risk_returns.volatility_10y,
      risk_returns.volatility_15y,
      risk_returns.volatility_20y,
      case
        when risk_returns.volatility_30d is null or risk_returns.volatility_90d is null or risk_returns.volatility_90d = 0 then 'insufficient_data'
        when risk_returns.volatility_30d > risk_returns.volatility_90d * 1.15 then 'rising'
        when risk_returns.volatility_30d < risk_returns.volatility_90d * 0.85 then 'falling'
        else 'stable'
      end as volatility_trend,
      risk_returns.downside_volatility,
      latest_drawdowns.current_drawdown,
      drawdown_stats.max_drawdown,
      case
        when latest_drawdowns.current_drawdown is not null
         and latest_drawdowns.current_drawdown < 0
         and latest_peak_dates.latest_peak_date is not null
          then greatest(0, latest_prices.latest_price_date - latest_peak_dates.latest_peak_date)
        else 0
      end::integer as drawdown_duration_days,
      case
        when drawdown_stats.max_drawdown is null then 'insufficient_data'
        when abs(drawdown_stats.max_drawdown) < 0.1 then 'low'
        when abs(drawdown_stats.max_drawdown) < 0.2 then 'moderate'
        when abs(drawdown_stats.max_drawdown) < 0.35 then 'elevated'
        else 'severe'
      end as drawdown_bucket,
      risk_returns.negative_return_frequency,
      risk_returns.worst_daily_return,
      risk_returns.worst_weekly_return,
      case
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) is null then 'insufficient_data'
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) < 0.12 then 'low'
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) < 0.25 then 'medium'
        when coalesce(risk_returns.volatility_1y, risk_returns.volatility_90d, risk_returns.volatility_30d) < 0.45 then 'high'
        else 'very_high'
      end as volatility_bucket,
      case
        when stats.observation_count >= 252 then 90
        when stats.observation_count >= 120 then 70
        when stats.observation_count >= 60 then 55
        when stats.observation_count >= 30 then 40
        else 20
      end::numeric as confidence_score,
      stats.observation_count,
      stats.history_start_date,
      stats.history_end_date
    from latest_prices
    join stats on stats.instrument_id = latest_prices.instrument_id
    left join risk_returns on risk_returns.instrument_id = latest_prices.instrument_id
    left join drawdown_stats on drawdown_stats.instrument_id = latest_prices.instrument_id
    left join latest_drawdowns on latest_drawdowns.instrument_id = latest_prices.instrument_id
    left join latest_peak_dates on latest_peak_dates.instrument_id = latest_prices.instrument_id
  ),
  final_scores as (
    select
      scored.*,
      case
        when scored.volatility_1y is null or scored.max_drawdown is null then null
        else
          least(greatest((scored.volatility_1y / 0.6) * 100, 0), 100) * 0.35 +
          least(greatest((abs(scored.max_drawdown) / 0.5) * 100, 0), 100) * 0.35 +
          least(greatest((coalesce(scored.downside_volatility, scored.volatility_1y) / 0.45) * 100, 0), 100) * 0.2 +
          least(greatest(coalesce(scored.negative_return_frequency, 0.5) * 100, 0), 100) * 0.1
      end as risk_score
    from scored
  )
  insert into instrument_risk_metrics (
    instrument_id,
    metric_date,
    volatility_30d,
    volatility_90d,
    volatility_1y,
    volatility_10y,
    volatility_15y,
    volatility_20y,
    volatility_trend,
    downside_volatility,
    current_drawdown,
    max_drawdown,
    drawdown_duration_days,
    drawdown_bucket,
    negative_return_frequency,
    worst_daily_return,
    worst_weekly_return,
    risk_score,
    risk_bucket,
    volatility_bucket,
    confidence_score,
    observation_count,
    history_start_date,
    history_end_date,
    calculated_at
  )
  select
    final_scores.instrument_id,
    final_scores.latest_price_date,
    final_scores.volatility_30d,
    final_scores.volatility_90d,
    final_scores.volatility_1y,
    final_scores.volatility_10y,
    final_scores.volatility_15y,
    final_scores.volatility_20y,
    final_scores.volatility_trend,
    final_scores.downside_volatility,
    final_scores.current_drawdown,
    final_scores.max_drawdown,
    final_scores.drawdown_duration_days,
    final_scores.drawdown_bucket,
    final_scores.negative_return_frequency,
    final_scores.worst_daily_return,
    final_scores.worst_weekly_return,
    final_scores.risk_score,
    case
      when final_scores.risk_score is null then 'insufficient_data'
      when final_scores.risk_score < 25 then 'low'
      when final_scores.risk_score < 50 then 'medium'
      when final_scores.risk_score < 75 then 'high'
      else 'very_high'
    end,
    final_scores.volatility_bucket,
    final_scores.confidence_score,
    final_scores.observation_count,
    final_scores.history_start_date,
    final_scores.history_end_date,
    now()
  from final_scores
  on conflict (instrument_id, metric_date) do update set
    volatility_30d = excluded.volatility_30d,
    volatility_90d = excluded.volatility_90d,
    volatility_1y = excluded.volatility_1y,
    volatility_10y = excluded.volatility_10y,
    volatility_15y = excluded.volatility_15y,
    volatility_20y = excluded.volatility_20y,
    volatility_trend = excluded.volatility_trend,
    downside_volatility = excluded.downside_volatility,
    current_drawdown = excluded.current_drawdown,
    max_drawdown = excluded.max_drawdown,
    drawdown_duration_days = excluded.drawdown_duration_days,
    drawdown_bucket = excluded.drawdown_bucket,
    negative_return_frequency = excluded.negative_return_frequency,
    worst_daily_return = excluded.worst_daily_return,
    worst_weekly_return = excluded.worst_weekly_return,
    risk_score = excluded.risk_score,
    risk_bucket = excluded.risk_bucket,
    volatility_bucket = excluded.volatility_bucket,
    confidence_score = excluded.confidence_score,
    observation_count = excluded.observation_count,
    history_start_date = excluded.history_start_date,
    history_end_date = excluded.history_end_date,
    calculated_at = now(),
    updated_at = now();
end;
$$;

create or replace function refresh_instrument_risk_period_drawdowns(target_instrument_ids uuid[] default null)
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
  latest_prices as (
    select distinct on (instrument_prices.instrument_id)
      instrument_prices.instrument_id,
      instrument_prices.price_date as latest_price_date
    from instrument_prices
    join target_instruments on target_instruments.id = instrument_prices.instrument_id
    where instrument_prices.close_price > 0
    order by instrument_prices.instrument_id, instrument_prices.price_date desc
  ),
  history_coverage as (
    select
      instrument_prices.instrument_id,
      min(instrument_prices.price_date) as history_start_date
    from instrument_prices
    join latest_prices on latest_prices.instrument_id = instrument_prices.instrument_id
    where instrument_prices.close_price > 0
    group by instrument_prices.instrument_id
  ),
  period_definitions as (
    select '1y'::text as period_key, interval '1 year' as lookback
    union all select '3y'::text, interval '3 years'
    union all select '5y'::text, interval '5 years'
    union all select '10y'::text, interval '10 years'
    union all select '15y'::text, interval '15 years'
    union all select '20y'::text, interval '20 years'
  ),
  period_prices as (
    select
      instrument_prices.instrument_id,
      period_definitions.period_key,
      latest_prices.latest_price_date,
      instrument_prices.price_date,
      instrument_prices.close_price,
      max(instrument_prices.close_price) over (
        partition by instrument_prices.instrument_id, period_definitions.period_key
        order by instrument_prices.price_date
        rows between unbounded preceding and current row
      ) as running_peak
    from instrument_prices
    join latest_prices on latest_prices.instrument_id = instrument_prices.instrument_id
    cross join period_definitions
    where instrument_prices.close_price > 0
      and instrument_prices.price_date >= latest_prices.latest_price_date - period_definitions.lookback
  ),
  period_drawdowns as (
    select
      period_prices.instrument_id,
      period_prices.period_key,
      period_prices.latest_price_date,
      period_prices.price_date,
      case
        when period_prices.running_peak is null or period_prices.running_peak = 0 then null
        else period_prices.close_price / period_prices.running_peak - 1
      end as drawdown
    from period_prices
  ),
  raw_summary as (
    select
      period_drawdowns.instrument_id,
      period_drawdowns.latest_price_date,
      max(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '1y' and period_drawdowns.price_date = period_drawdowns.latest_price_date) as current_drawdown_1y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '1y') as max_drawdown_1y,
      max(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '3y' and period_drawdowns.price_date = period_drawdowns.latest_price_date) as current_drawdown_3y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '3y') as max_drawdown_3y,
      max(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '5y' and period_drawdowns.price_date = period_drawdowns.latest_price_date) as current_drawdown_5y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '5y') as max_drawdown_5y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '10y') as max_drawdown_10y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '15y') as max_drawdown_15y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '20y') as max_drawdown_20y
    from period_drawdowns
    group by period_drawdowns.instrument_id, period_drawdowns.latest_price_date
  ),
  period_summary as (
    select
      raw_summary.instrument_id,
      raw_summary.latest_price_date,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '1 year' + interval '14 days')::date then raw_summary.current_drawdown_1y else null end as current_drawdown_1y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '1 year' + interval '14 days')::date then raw_summary.max_drawdown_1y else null end as max_drawdown_1y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '3 years' + interval '30 days')::date then raw_summary.current_drawdown_3y else null end as current_drawdown_3y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '3 years' + interval '30 days')::date then raw_summary.max_drawdown_3y else null end as max_drawdown_3y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '5 years' + interval '30 days')::date then raw_summary.current_drawdown_5y else null end as current_drawdown_5y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '5 years' + interval '30 days')::date then raw_summary.max_drawdown_5y else null end as max_drawdown_5y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '10 years' + interval '30 days')::date then raw_summary.max_drawdown_10y else null end as max_drawdown_10y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '15 years' + interval '30 days')::date then raw_summary.max_drawdown_15y else null end as max_drawdown_15y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '20 years' + interval '120 days')::date then raw_summary.max_drawdown_20y else null end as max_drawdown_20y
    from raw_summary
    join history_coverage on history_coverage.instrument_id = raw_summary.instrument_id
  )
  update instrument_risk_metrics
  set
    current_drawdown_1y = period_summary.current_drawdown_1y,
    max_drawdown_1y = period_summary.max_drawdown_1y,
    current_drawdown_3y = period_summary.current_drawdown_3y,
    max_drawdown_3y = period_summary.max_drawdown_3y,
    current_drawdown_5y = period_summary.current_drawdown_5y,
    max_drawdown_5y = period_summary.max_drawdown_5y,
    max_drawdown_10y = period_summary.max_drawdown_10y,
    max_drawdown_15y = period_summary.max_drawdown_15y,
    max_drawdown_20y = period_summary.max_drawdown_20y,
    updated_at = now()
  from period_summary
  where instrument_risk_metrics.instrument_id = period_summary.instrument_id
    and instrument_risk_metrics.metric_date = period_summary.latest_price_date;
end;
$$;

create or replace function refresh_instrument_risk_period_drawdowns_only(target_instrument_ids uuid[] default null)
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
  latest_prices as (
    select distinct on (instrument_daily_returns.instrument_id)
      instrument_daily_returns.instrument_id,
      instrument_daily_returns.price_date as latest_price_date
    from instrument_daily_returns
    join target_instruments on target_instruments.id = instrument_daily_returns.instrument_id
    where instrument_daily_returns.close_price > 0
    order by instrument_daily_returns.instrument_id, instrument_daily_returns.price_date desc
  ),
  history_coverage as (
    select
      instrument_daily_returns.instrument_id,
      min(instrument_daily_returns.price_date) as history_start_date
    from instrument_daily_returns
    join latest_prices on latest_prices.instrument_id = instrument_daily_returns.instrument_id
    where instrument_daily_returns.close_price > 0
    group by instrument_daily_returns.instrument_id
  ),
  period_definitions as (
    select '1y'::text as period_key, interval '1 year' as lookback
    union all select '3y'::text, interval '3 years'
    union all select '5y'::text, interval '5 years'
    union all select '10y'::text, interval '10 years'
    union all select '15y'::text, interval '15 years'
    union all select '20y'::text, interval '20 years'
  ),
  period_prices as (
    select
      instrument_daily_returns.instrument_id,
      period_definitions.period_key,
      latest_prices.latest_price_date,
      instrument_daily_returns.price_date,
      instrument_daily_returns.close_price,
      max(instrument_daily_returns.close_price) over (
        partition by instrument_daily_returns.instrument_id, period_definitions.period_key
        order by instrument_daily_returns.price_date
        rows between unbounded preceding and current row
      ) as running_peak
    from instrument_daily_returns
    join latest_prices on latest_prices.instrument_id = instrument_daily_returns.instrument_id
    cross join period_definitions
    where instrument_daily_returns.close_price > 0
      and instrument_daily_returns.price_date >= latest_prices.latest_price_date - period_definitions.lookback
  ),
  period_drawdowns as (
    select
      period_prices.instrument_id,
      period_prices.period_key,
      period_prices.latest_price_date,
      period_prices.price_date,
      case
        when period_prices.running_peak is null or period_prices.running_peak = 0 then null
        else period_prices.close_price / period_prices.running_peak - 1
      end as drawdown
    from period_prices
  ),
  raw_summary as (
    select
      period_drawdowns.instrument_id,
      period_drawdowns.latest_price_date,
      max(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '1y' and period_drawdowns.price_date = period_drawdowns.latest_price_date) as current_drawdown_1y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '1y') as max_drawdown_1y,
      max(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '3y' and period_drawdowns.price_date = period_drawdowns.latest_price_date) as current_drawdown_3y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '3y') as max_drawdown_3y,
      max(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '5y' and period_drawdowns.price_date = period_drawdowns.latest_price_date) as current_drawdown_5y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '5y') as max_drawdown_5y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '10y') as max_drawdown_10y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '15y') as max_drawdown_15y,
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '20y') as max_drawdown_20y
    from period_drawdowns
    group by period_drawdowns.instrument_id, period_drawdowns.latest_price_date
  ),
  period_summary as (
    select
      raw_summary.instrument_id,
      raw_summary.latest_price_date,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '1 year' + interval '14 days')::date then raw_summary.current_drawdown_1y else null end as current_drawdown_1y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '1 year' + interval '14 days')::date then raw_summary.max_drawdown_1y else null end as max_drawdown_1y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '3 years' + interval '30 days')::date then raw_summary.current_drawdown_3y else null end as current_drawdown_3y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '3 years' + interval '30 days')::date then raw_summary.max_drawdown_3y else null end as max_drawdown_3y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '5 years' + interval '30 days')::date then raw_summary.current_drawdown_5y else null end as current_drawdown_5y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '5 years' + interval '30 days')::date then raw_summary.max_drawdown_5y else null end as max_drawdown_5y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '10 years' + interval '30 days')::date then raw_summary.max_drawdown_10y else null end as max_drawdown_10y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '15 years' + interval '30 days')::date then raw_summary.max_drawdown_15y else null end as max_drawdown_15y,
      case when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '20 years' + interval '120 days')::date then raw_summary.max_drawdown_20y else null end as max_drawdown_20y
    from raw_summary
    join history_coverage on history_coverage.instrument_id = raw_summary.instrument_id
  )
  update instrument_risk_metrics
  set
    current_drawdown_1y = period_summary.current_drawdown_1y,
    max_drawdown_1y = period_summary.max_drawdown_1y,
    current_drawdown_3y = period_summary.current_drawdown_3y,
    max_drawdown_3y = period_summary.max_drawdown_3y,
    current_drawdown_5y = period_summary.current_drawdown_5y,
    max_drawdown_5y = period_summary.max_drawdown_5y,
    max_drawdown_10y = period_summary.max_drawdown_10y,
    max_drawdown_15y = period_summary.max_drawdown_15y,
    max_drawdown_20y = period_summary.max_drawdown_20y,
    updated_at = now()
  from period_summary
  where instrument_risk_metrics.instrument_id = period_summary.instrument_id
    and instrument_risk_metrics.metric_date = period_summary.latest_price_date;
end;
$$;

select refresh_instrument_risk_metrics_only(null);
select refresh_instrument_risk_period_drawdowns_only(null);
