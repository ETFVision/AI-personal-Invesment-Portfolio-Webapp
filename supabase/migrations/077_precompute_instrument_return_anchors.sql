-- Cache return baselines and 52-week ranges used by instrument_market_metrics.
-- This keeps market metric refreshes from repeatedly scanning the same history
-- for YTD/1Y/3Y/5Y anchors and latest 52-week range.

create table if not exists instrument_return_anchors (
  instrument_id uuid primary key references instruments(id) on delete cascade,
  as_of_date date not null,
  latest_price numeric(28, 10),
  previous_close_price numeric(28, 10),
  previous_price_date date,
  daily_return numeric(28, 10),
  ytd_baseline_price numeric(28, 10),
  one_year_baseline_price numeric(28, 10),
  three_year_baseline_price numeric(28, 10),
  five_year_baseline_price numeric(28, 10),
  fifty_two_week_low numeric(28, 10),
  fifty_two_week_high numeric(28, 10),
  observation_count integer not null default 0,
  history_start_date date,
  history_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instrument_return_anchors_as_of_date
  on instrument_return_anchors (as_of_date desc);

drop trigger if exists trg_instrument_return_anchors_updated_at on instrument_return_anchors;
create trigger trg_instrument_return_anchors_updated_at
  before update on instrument_return_anchors
  for each row execute function set_updated_at();

create or replace function refresh_instrument_return_anchors(target_instrument_ids uuid[] default null)
returns void
language plpgsql
as $$
begin
  perform refresh_instrument_daily_returns(target_instrument_ids);

  with target_instruments as (
    select instruments.id
    from instruments
    where target_instrument_ids is null
       or instruments.id = any(target_instrument_ids)
  ),
  latest_returns as (
    select distinct on (instrument_daily_returns.instrument_id)
      instrument_daily_returns.instrument_id,
      instrument_daily_returns.price_date,
      instrument_daily_returns.close_price,
      instrument_daily_returns.previous_close_price,
      instrument_daily_returns.daily_return
    from instrument_daily_returns
    join target_instruments on target_instruments.id = instrument_daily_returns.instrument_id
    where instrument_daily_returns.close_price > 0
    order by instrument_daily_returns.instrument_id, instrument_daily_returns.price_date desc
  ),
  previous_returns as (
    select latest_returns.instrument_id, previous.close_price, previous.price_date
    from latest_returns
    left join lateral (
      select instrument_daily_returns.close_price, instrument_daily_returns.price_date
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = latest_returns.instrument_id
        and instrument_daily_returns.price_date < latest_returns.price_date
      order by instrument_daily_returns.price_date desc
      limit 1
    ) previous on true
  ),
  baselines as (
    select
      latest_returns.instrument_id,
      ytd.close_price as ytd_baseline_price,
      one_year.close_price as one_year_baseline_price,
      three_year.close_price as three_year_baseline_price,
      five_year.close_price as five_year_baseline_price
    from latest_returns
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = latest_returns.instrument_id
        and instrument_daily_returns.price_date >= date_trunc('year', latest_returns.price_date)::date
      order by instrument_daily_returns.price_date asc
      limit 1
    ) ytd on true
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = latest_returns.instrument_id
        and instrument_daily_returns.price_date >= latest_returns.price_date - interval '1 year'
      order by instrument_daily_returns.price_date asc
      limit 1
    ) one_year on true
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = latest_returns.instrument_id
        and instrument_daily_returns.price_date >= latest_returns.price_date - interval '3 years'
      order by instrument_daily_returns.price_date asc
      limit 1
    ) three_year on true
    left join lateral (
      select instrument_daily_returns.close_price
      from instrument_daily_returns
      where instrument_daily_returns.instrument_id = latest_returns.instrument_id
        and instrument_daily_returns.price_date >= latest_returns.price_date - interval '5 years'
      order by instrument_daily_returns.price_date asc
      limit 1
    ) five_year on true
  ),
  ranges as (
    select
      latest_returns.instrument_id,
      min(instrument_daily_returns.close_price) as fifty_two_week_low,
      max(instrument_daily_returns.close_price) as fifty_two_week_high
    from latest_returns
    join instrument_daily_returns on instrument_daily_returns.instrument_id = latest_returns.instrument_id
    where instrument_daily_returns.price_date >= latest_returns.price_date - interval '1 year'
    group by latest_returns.instrument_id
  ),
  stats as (
    select
      instrument_daily_returns.instrument_id,
      count(*)::integer as observation_count,
      min(instrument_daily_returns.price_date) as history_start_date,
      max(instrument_daily_returns.price_date) as history_end_date
    from instrument_daily_returns
    join target_instruments on target_instruments.id = instrument_daily_returns.instrument_id
    group by instrument_daily_returns.instrument_id
  )
  insert into instrument_return_anchors (
    instrument_id,
    as_of_date,
    latest_price,
    previous_close_price,
    previous_price_date,
    daily_return,
    ytd_baseline_price,
    one_year_baseline_price,
    three_year_baseline_price,
    five_year_baseline_price,
    fifty_two_week_low,
    fifty_two_week_high,
    observation_count,
    history_start_date,
    history_end_date
  )
  select
    latest_returns.instrument_id,
    latest_returns.price_date,
    latest_returns.close_price,
    coalesce(latest_returns.previous_close_price, previous_returns.close_price),
    previous_returns.price_date,
    latest_returns.daily_return,
    baselines.ytd_baseline_price,
    baselines.one_year_baseline_price,
    baselines.three_year_baseline_price,
    baselines.five_year_baseline_price,
    ranges.fifty_two_week_low,
    ranges.fifty_two_week_high,
    stats.observation_count,
    stats.history_start_date,
    stats.history_end_date
  from latest_returns
  left join previous_returns on previous_returns.instrument_id = latest_returns.instrument_id
  left join baselines on baselines.instrument_id = latest_returns.instrument_id
  left join ranges on ranges.instrument_id = latest_returns.instrument_id
  left join stats on stats.instrument_id = latest_returns.instrument_id
  on conflict (instrument_id) do update set
    as_of_date = excluded.as_of_date,
    latest_price = excluded.latest_price,
    previous_close_price = excluded.previous_close_price,
    previous_price_date = excluded.previous_price_date,
    daily_return = excluded.daily_return,
    ytd_baseline_price = excluded.ytd_baseline_price,
    one_year_baseline_price = excluded.one_year_baseline_price,
    three_year_baseline_price = excluded.three_year_baseline_price,
    five_year_baseline_price = excluded.five_year_baseline_price,
    fifty_two_week_low = excluded.fifty_two_week_low,
    fifty_two_week_high = excluded.fifty_two_week_high,
    observation_count = excluded.observation_count,
    history_start_date = excluded.history_start_date,
    history_end_date = excluded.history_end_date,
    updated_at = now();
end;
$$;

create or replace function refresh_instrument_market_metrics(target_instrument_ids uuid[] default null)
returns void
language plpgsql
as $$
begin
  perform refresh_instrument_return_anchors(target_instrument_ids);

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

alter table instrument_return_anchors enable row level security;

drop policy if exists "users can read instrument return anchors" on instrument_return_anchors;
create policy "users can read instrument return anchors" on instrument_return_anchors
  for select using (true);
