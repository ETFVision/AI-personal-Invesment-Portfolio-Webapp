-- Derived instrument metrics used by Universe and Watchlist pages.
-- Raw instrument_prices remains the source of truth; this table keeps page reads compact.

create table if not exists instrument_market_metrics (
  instrument_id uuid primary key references instruments(id) on delete cascade,
  latest_price numeric(28, 10),
  latest_price_date date,
  previous_close_price numeric(28, 10),
  previous_price_date date,
  daily_return numeric(28, 10),
  ytd_return numeric(28, 10),
  one_year_return numeric(28, 10),
  three_year_return numeric(28, 10),
  five_year_return numeric(28, 10),
  fifty_two_week_low numeric(28, 10),
  fifty_two_week_high numeric(28, 10),
  observation_count integer not null default 0,
  history_start_date date,
  history_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instrument_market_metrics_latest_date on instrument_market_metrics (latest_price_date desc);
create index if not exists idx_instrument_market_metrics_daily_return on instrument_market_metrics (daily_return desc);

drop trigger if exists trg_instrument_market_metrics_updated_at on instrument_market_metrics;
create trigger trg_instrument_market_metrics_updated_at before update on instrument_market_metrics for each row execute function set_updated_at();

create or replace function refresh_instrument_market_metrics(target_instrument_ids uuid[] default null)
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
      instrument_prices.close_price,
      instrument_prices.price_date
    from instrument_prices
    join target_instruments on target_instruments.id = instrument_prices.instrument_id
    order by instrument_prices.instrument_id, instrument_prices.price_date desc
  ),
  previous_prices as (
    select latest_prices.instrument_id, previous.close_price, previous.price_date
    from latest_prices
    left join lateral (
      select instrument_prices.close_price, instrument_prices.price_date
      from instrument_prices
      where instrument_prices.instrument_id = latest_prices.instrument_id
        and instrument_prices.price_date < latest_prices.price_date
      order by instrument_prices.price_date desc
      limit 1
    ) previous on true
  ),
  baselines as (
    select
      latest_prices.instrument_id,
      ytd.close_price as ytd_close_price,
      one_year.close_price as one_year_close_price,
      three_year.close_price as three_year_close_price,
      five_year.close_price as five_year_close_price
    from latest_prices
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = latest_prices.instrument_id
        and instrument_prices.price_date >= date_trunc('year', latest_prices.price_date)::date
      order by instrument_prices.price_date asc
      limit 1
    ) ytd on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = latest_prices.instrument_id
        and instrument_prices.price_date >= latest_prices.price_date - interval '1 year'
      order by instrument_prices.price_date asc
      limit 1
    ) one_year on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = latest_prices.instrument_id
        and instrument_prices.price_date >= latest_prices.price_date - interval '3 years'
      order by instrument_prices.price_date asc
      limit 1
    ) three_year on true
    left join lateral (
      select instrument_prices.close_price
      from instrument_prices
      where instrument_prices.instrument_id = latest_prices.instrument_id
        and instrument_prices.price_date >= latest_prices.price_date - interval '5 years'
      order by instrument_prices.price_date asc
      limit 1
    ) five_year on true
  ),
  ranges as (
    select
      latest_prices.instrument_id,
      min(instrument_prices.close_price) as fifty_two_week_low,
      max(instrument_prices.close_price) as fifty_two_week_high
    from latest_prices
    join instrument_prices on instrument_prices.instrument_id = latest_prices.instrument_id
    where instrument_prices.price_date >= latest_prices.price_date - interval '1 year'
    group by latest_prices.instrument_id
  ),
  stats as (
    select
      instrument_prices.instrument_id,
      count(*)::integer as observation_count,
      min(instrument_prices.price_date) as history_start_date,
      max(instrument_prices.price_date) as history_end_date
    from instrument_prices
    join target_instruments on target_instruments.id = instrument_prices.instrument_id
    group by instrument_prices.instrument_id
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
    latest_prices.instrument_id,
    latest_prices.close_price,
    latest_prices.price_date,
    previous_prices.close_price,
    previous_prices.price_date,
    case when previous_prices.close_price is null or previous_prices.close_price = 0 then null else latest_prices.close_price / previous_prices.close_price - 1 end,
    case when baselines.ytd_close_price is null or baselines.ytd_close_price = 0 then null else latest_prices.close_price / baselines.ytd_close_price - 1 end,
    case when baselines.one_year_close_price is null or baselines.one_year_close_price = 0 then null else latest_prices.close_price / baselines.one_year_close_price - 1 end,
    case when baselines.three_year_close_price is null or baselines.three_year_close_price = 0 then null else latest_prices.close_price / baselines.three_year_close_price - 1 end,
    case when baselines.five_year_close_price is null or baselines.five_year_close_price = 0 then null else latest_prices.close_price / baselines.five_year_close_price - 1 end,
    ranges.fifty_two_week_low,
    ranges.fifty_two_week_high,
    stats.observation_count,
    stats.history_start_date,
    stats.history_end_date
  from latest_prices
  left join previous_prices on previous_prices.instrument_id = latest_prices.instrument_id
  left join baselines on baselines.instrument_id = latest_prices.instrument_id
  left join ranges on ranges.instrument_id = latest_prices.instrument_id
  left join stats on stats.instrument_id = latest_prices.instrument_id
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

select refresh_instrument_market_metrics();

alter table instrument_market_metrics enable row level security;

drop policy if exists "users can read instrument market metrics" on instrument_market_metrics;
create policy "users can read instrument market metrics" on instrument_market_metrics
  for select using (true);
