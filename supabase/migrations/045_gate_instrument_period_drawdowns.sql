-- Avoid showing fixed-period drawdowns when stored history does not cover the period.
-- Current/max drawdown without a suffix remains based on all stored history.

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
      min(period_drawdowns.drawdown) filter (where period_drawdowns.period_key = '5y') as max_drawdown_5y
    from period_drawdowns
    group by period_drawdowns.instrument_id, period_drawdowns.latest_price_date
  ),
  period_summary as (
    select
      raw_summary.instrument_id,
      raw_summary.latest_price_date,
      case
        when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '1 year' + interval '14 days')::date
          then raw_summary.current_drawdown_1y
        else null
      end as current_drawdown_1y,
      case
        when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '1 year' + interval '14 days')::date
          then raw_summary.max_drawdown_1y
        else null
      end as max_drawdown_1y,
      case
        when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '3 years' + interval '30 days')::date
          then raw_summary.current_drawdown_3y
        else null
      end as current_drawdown_3y,
      case
        when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '3 years' + interval '30 days')::date
          then raw_summary.max_drawdown_3y
        else null
      end as max_drawdown_3y,
      case
        when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '5 years' + interval '30 days')::date
          then raw_summary.current_drawdown_5y
        else null
      end as current_drawdown_5y,
      case
        when history_coverage.history_start_date <= (raw_summary.latest_price_date - interval '5 years' + interval '30 days')::date
          then raw_summary.max_drawdown_5y
        else null
      end as max_drawdown_5y
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
    updated_at = now()
  from period_summary
  where instrument_risk_metrics.instrument_id = period_summary.instrument_id
    and instrument_risk_metrics.metric_date = period_summary.latest_price_date;
end;
$$;

select refresh_instrument_risk_period_drawdowns();
