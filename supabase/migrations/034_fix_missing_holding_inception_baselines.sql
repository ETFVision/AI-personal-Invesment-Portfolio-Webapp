-- Fix position-period baselines for recently purchased holdings.
-- If a period is clamped to the holding inception date and price history is sparse,
-- use the holding average cost instead of accidentally using the latest price.

create or replace function refresh_holding_portfolio_metrics(target_portfolio_id uuid default null)
returns void
language plpgsql
as $$
begin
  update holdings
  set instrument_id = instruments.id
  from instruments
  where holdings.instrument_id is null
    and holdings.ticker is not null
    and upper(holdings.ticker) = upper(instruments.symbol)
    and (target_portfolio_id is null or holdings.portfolio_id = target_portfolio_id);

  with target_holdings as (
    select
      holdings.*,
      coalesce(holdings.instrument_id, instruments.id) as resolved_instrument_id,
      coalesce(
        holdings.first_purchase_date,
        (
          select min(transactions.transaction_date)
          from transactions
          where transactions.portfolio_id = holdings.portfolio_id
            and transactions.is_deleted = false
            and transactions.transaction_type = 'buy'
            and (
              (transactions.asset_id is not null and transactions.asset_id = holdings.asset_id)
              or (
                transactions.asset_id is null
                and transactions.ticker is not null
                and holdings.ticker is not null
                and upper(transactions.ticker) = upper(holdings.ticker)
              )
            )
        )
      ) as inception_date
    from holdings
    left join instruments on holdings.ticker is not null and upper(instruments.symbol) = upper(holdings.ticker)
    where holdings.is_active = true
      and (target_portfolio_id is null or holdings.portfolio_id = target_portfolio_id)
  ),
  latest_prices as (
    select
      target_holdings.*,
      coalesce(instrument_market_metrics.latest_price, latest.close_price, target_holdings.average_cost) as effective_latest_price,
      coalesce(instrument_market_metrics.latest_price_date, latest.price_date) as effective_latest_price_date,
      instrument_market_metrics.previous_close_price,
      instrument_market_metrics.previous_price_date,
      instrument_market_metrics.fifty_two_week_low,
      instrument_market_metrics.fifty_two_week_high
    from target_holdings
    left join instrument_market_metrics on instrument_market_metrics.instrument_id = target_holdings.resolved_instrument_id
    left join lateral (
      select instrument_prices.close_price, instrument_prices.price_date
      from instrument_prices
      where instrument_prices.instrument_id = target_holdings.resolved_instrument_id
      order by instrument_prices.price_date desc
      limit 1
    ) latest on true
  ),
  baselines as (
    select
      latest_prices.*,
      greatest(coalesce(latest_prices.inception_date, latest_prices.effective_latest_price_date, current_date), latest_prices.effective_latest_price_date - interval '7 days')::date as weekly_target_date,
      greatest(coalesce(latest_prices.inception_date, latest_prices.effective_latest_price_date, current_date), latest_prices.effective_latest_price_date - interval '30 days')::date as monthly_target_date,
      greatest(coalesce(latest_prices.inception_date, latest_prices.effective_latest_price_date, current_date), date_trunc('year', latest_prices.effective_latest_price_date)::date)::date as ytd_target_date,
      greatest(coalesce(latest_prices.inception_date, latest_prices.effective_latest_price_date, current_date), latest_prices.effective_latest_price_date - interval '1 year')::date as one_year_target_date,
      greatest(coalesce(latest_prices.inception_date, latest_prices.effective_latest_price_date, current_date), latest_prices.effective_latest_price_date - interval '3 years')::date as three_year_target_date,
      greatest(coalesce(latest_prices.inception_date, latest_prices.effective_latest_price_date, current_date), latest_prices.effective_latest_price_date - interval '5 years')::date as five_year_target_date
    from latest_prices
  ),
  priced_baselines as (
    select
      baselines.*,
      weekly.close_price as weekly_close_price,
      monthly.close_price as monthly_close_price,
      ytd.close_price as ytd_close_price,
      one_year.close_price as one_year_close_price,
      three_year.close_price as three_year_close_price,
      five_year.close_price as five_year_close_price
    from baselines
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = baselines.resolved_instrument_id
        and instrument_prices.price_date >= baselines.weekly_target_date
      order by instrument_prices.price_date asc
      limit 1
    ) weekly on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = baselines.resolved_instrument_id
        and instrument_prices.price_date >= baselines.monthly_target_date
      order by instrument_prices.price_date asc
      limit 1
    ) monthly on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = baselines.resolved_instrument_id
        and instrument_prices.price_date >= baselines.ytd_target_date
      order by instrument_prices.price_date asc
      limit 1
    ) ytd on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = baselines.resolved_instrument_id
        and instrument_prices.price_date >= baselines.one_year_target_date
      order by instrument_prices.price_date asc
      limit 1
    ) one_year on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = baselines.resolved_instrument_id
        and instrument_prices.price_date >= baselines.three_year_target_date
      order by instrument_prices.price_date asc
      limit 1
    ) three_year on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = baselines.resolved_instrument_id
        and instrument_prices.price_date >= baselines.five_year_target_date
      order by instrument_prices.price_date asc
      limit 1
    ) five_year on true
  )
  insert into holding_market_metrics (
    holding_id,
    portfolio_id,
    instrument_id,
    latest_price,
    latest_price_date,
    market_value,
    daily_return,
    weekly_return,
    monthly_return,
    ytd_return,
    one_year_return,
    three_year_return,
    five_year_return,
    since_inception_return,
    fifty_two_week_low,
    fifty_two_week_high
  )
  select
    priced_baselines.id,
    priced_baselines.portfolio_id,
    priced_baselines.resolved_instrument_id,
    priced_baselines.effective_latest_price,
    priced_baselines.effective_latest_price_date,
    priced_baselines.quantity * coalesce(priced_baselines.effective_latest_price, 0),
    case
      when priced_baselines.previous_close_price is null
        or priced_baselines.previous_close_price = 0
        or priced_baselines.previous_price_date < coalesce(priced_baselines.inception_date, priced_baselines.previous_price_date)
      then null
      else priced_baselines.effective_latest_price / priced_baselines.previous_close_price - 1
    end,
    case
      when (
        priced_baselines.weekly_target_date = priced_baselines.inception_date
        or (priced_baselines.inception_date is null and priced_baselines.weekly_close_price = priced_baselines.effective_latest_price)
      ) and priced_baselines.average_cost > 0
      then priced_baselines.effective_latest_price / priced_baselines.average_cost - 1
      when priced_baselines.weekly_close_price is null or priced_baselines.weekly_close_price = 0 then null
      else priced_baselines.effective_latest_price / priced_baselines.weekly_close_price - 1
    end,
    case
      when (
        priced_baselines.monthly_target_date = priced_baselines.inception_date
        or (priced_baselines.inception_date is null and priced_baselines.monthly_close_price = priced_baselines.effective_latest_price)
      ) and priced_baselines.average_cost > 0
      then priced_baselines.effective_latest_price / priced_baselines.average_cost - 1
      when priced_baselines.monthly_close_price is null or priced_baselines.monthly_close_price = 0 then null
      else priced_baselines.effective_latest_price / priced_baselines.monthly_close_price - 1
    end,
    case
      when (
        priced_baselines.ytd_target_date = priced_baselines.inception_date
        or (priced_baselines.inception_date is null and priced_baselines.ytd_close_price = priced_baselines.effective_latest_price)
      ) and priced_baselines.average_cost > 0
      then priced_baselines.effective_latest_price / priced_baselines.average_cost - 1
      when priced_baselines.ytd_close_price is null or priced_baselines.ytd_close_price = 0 then null
      else priced_baselines.effective_latest_price / priced_baselines.ytd_close_price - 1
    end,
    case
      when (
        priced_baselines.one_year_target_date = priced_baselines.inception_date
        or (priced_baselines.inception_date is null and priced_baselines.one_year_close_price = priced_baselines.effective_latest_price)
      ) and priced_baselines.average_cost > 0
      then priced_baselines.effective_latest_price / priced_baselines.average_cost - 1
      when priced_baselines.one_year_close_price is null or priced_baselines.one_year_close_price = 0 then null
      else priced_baselines.effective_latest_price / priced_baselines.one_year_close_price - 1
    end,
    case
      when (
        priced_baselines.three_year_target_date = priced_baselines.inception_date
        or (priced_baselines.inception_date is null and priced_baselines.three_year_close_price = priced_baselines.effective_latest_price)
      ) and priced_baselines.average_cost > 0
      then priced_baselines.effective_latest_price / priced_baselines.average_cost - 1
      when priced_baselines.three_year_close_price is null or priced_baselines.three_year_close_price = 0 then null
      else priced_baselines.effective_latest_price / priced_baselines.three_year_close_price - 1
    end,
    case
      when (
        priced_baselines.five_year_target_date = priced_baselines.inception_date
        or (priced_baselines.inception_date is null and priced_baselines.five_year_close_price = priced_baselines.effective_latest_price)
      ) and priced_baselines.average_cost > 0
      then priced_baselines.effective_latest_price / priced_baselines.average_cost - 1
      when priced_baselines.five_year_close_price is null or priced_baselines.five_year_close_price = 0 then null
      else priced_baselines.effective_latest_price / priced_baselines.five_year_close_price - 1
    end,
    case when priced_baselines.average_cost is null or priced_baselines.average_cost = 0 then null else priced_baselines.effective_latest_price / priced_baselines.average_cost - 1 end,
    priced_baselines.fifty_two_week_low,
    priced_baselines.fifty_two_week_high
  from priced_baselines
  on conflict (holding_id) do update set
    portfolio_id = excluded.portfolio_id,
    instrument_id = excluded.instrument_id,
    latest_price = excluded.latest_price,
    latest_price_date = excluded.latest_price_date,
    market_value = excluded.market_value,
    daily_return = excluded.daily_return,
    weekly_return = excluded.weekly_return,
    monthly_return = excluded.monthly_return,
    ytd_return = excluded.ytd_return,
    one_year_return = excluded.one_year_return,
    three_year_return = excluded.three_year_return,
    five_year_return = excluded.five_year_return,
    since_inception_return = excluded.since_inception_return,
    fifty_two_week_low = excluded.fifty_two_week_low,
    fifty_two_week_high = excluded.fifty_two_week_high,
    updated_at = now();

  delete from holding_market_metrics
  where (target_portfolio_id is null or holding_market_metrics.portfolio_id = target_portfolio_id)
    and not exists (
      select 1
      from holdings
      where holdings.id = holding_market_metrics.holding_id
        and holdings.is_active = true
    );

  with portfolio_ids as (
    select portfolios.id
    from portfolios
    where target_portfolio_id is null or portfolios.id = target_portfolio_id
  ),
  cash_totals as (
    select
      portfolio_ids.id as portfolio_id,
      coalesce(sum(cash_balances.amount), 0) as total_cash
    from portfolio_ids
    left join cash_balances on cash_balances.portfolio_id = portfolio_ids.id
    group by portfolio_ids.id
  ),
  holding_totals as (
    select
      portfolio_ids.id as portfolio_id,
      coalesce(sum(holding_market_metrics.market_value), 0) as total_holdings_market_value,
      coalesce(sum(holdings.quantity * coalesce(holdings.average_cost, 0)), 0) as invested_amount,
      max(holding_market_metrics.latest_price_date) as latest_price_date
    from portfolio_ids
    left join holdings on holdings.portfolio_id = portfolio_ids.id and holdings.is_active = true
    left join holding_market_metrics on holding_market_metrics.holding_id = holdings.id
    group by portfolio_ids.id
  )
  insert into portfolio_current_metrics (
    portfolio_id,
    total_cash,
    total_holdings_market_value,
    total_value_estimate,
    invested_amount,
    unrealized_gain_loss,
    unrealized_gain_loss_percent,
    latest_price_date
  )
  select
    portfolio_ids.id,
    cash_totals.total_cash,
    holding_totals.total_holdings_market_value,
    cash_totals.total_cash + holding_totals.total_holdings_market_value,
    holding_totals.invested_amount,
    holding_totals.total_holdings_market_value - holding_totals.invested_amount,
    case
      when holding_totals.invested_amount = 0 then 0
      else (holding_totals.total_holdings_market_value - holding_totals.invested_amount) / holding_totals.invested_amount
    end,
    holding_totals.latest_price_date
  from portfolio_ids
  join cash_totals on cash_totals.portfolio_id = portfolio_ids.id
  join holding_totals on holding_totals.portfolio_id = portfolio_ids.id
  on conflict (portfolio_id) do update set
    total_cash = excluded.total_cash,
    total_holdings_market_value = excluded.total_holdings_market_value,
    total_value_estimate = excluded.total_value_estimate,
    invested_amount = excluded.invested_amount,
    unrealized_gain_loss = excluded.unrealized_gain_loss,
    unrealized_gain_loss_percent = excluded.unrealized_gain_loss_percent,
    latest_price_date = excluded.latest_price_date,
    updated_at = now();
end;
$$;

select refresh_holding_portfolio_metrics();
