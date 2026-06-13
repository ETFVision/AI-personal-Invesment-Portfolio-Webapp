-- Optimize return-anchor refresh after the split daily-return pipeline.
--
-- The daily schedule already refreshes instrument_daily_returns before
-- instrument_return_anchors. The original anchor function still invoked
-- refresh_instrument_daily_returns internally, causing duplicate heavy work and
-- statement timeouts on the larger universe. This migration makes anchors read
-- the precomputed daily returns only, then staggers dependent jobs.

create or replace function refresh_instrument_return_anchors(target_instrument_ids uuid[] default null)
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

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-return-anchors-refresh',
    'app-daily-instrument-market-metrics-refresh',
    'app-daily-instrument-risk-refresh-1',
    'app-daily-instrument-risk-refresh-2',
    'app-daily-instrument-metadata-refresh',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-portfolio-summary-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion',
    'app-weekly-fundamentals-refresh-1',
    'app-weekly-fundamentals-refresh-2',
    'app-weekly-fundamentals-refresh-3',
    'app-weekly-news-reconciliation',
    'app-weekly-market-vision',
    'app-weekly-recommendation-run',
    'app-weekly-portfolio-review-run',
    'app-weekly-telemetry-evaluation'
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

-- Daily price and daily-return schedules remain as configured by earlier migrations:
-- 5:20-5:40 AM SGT for prices, 5:45 AM SGT for daily returns.
-- The dependent chain below is staggered further apart to avoid pg_net overlap.

select cron.schedule(
  'app-daily-instrument-return-anchors-refresh',
  '55 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-return-anchors-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh',
  '5 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-risk-refresh-1',
  '15 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?batchSize=200&minObservations=30&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-risk-refresh-2',
  '25 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?batchSize=150&minObservations=30&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-metadata-refresh',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-metadata-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-benchmark-refresh',
  '45 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '55 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-portfolio-summary-refresh',
  '5 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-summary-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '15 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '25 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '35 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence now starts after the longer Sunday daily chain.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '50 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '0 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '10 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '20 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '30 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '40 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '50 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '0 1 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);
