-- Refresh schedules tuned for the expanded Alpha universe.
--
-- Goals:
-- - Daily latest market data covers the full active instrument list.
-- - Weekly fundamentals gets enough passes to cover the expanded stock universe.
-- - Monthly ETF look-through runs in staggered batches for the larger ETF universe.
-- - GDELT remains excluded from automation because of provider rate limits.
--
-- All schedules are UTC. Comments include Singapore time.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion',
    'app-weekly-fundamentals-refresh',
    'app-weekly-fundamentals-refresh-1',
    'app-weekly-fundamentals-refresh-2',
    'app-weekly-fundamentals-refresh-3',
    'app-weekly-news-reconciliation',
    'app-weekly-market-vision',
    'app-weekly-recommendation-run',
    'app-weekly-portfolio-review-run',
    'app-weekly-telemetry-evaluation',
    'app-monthly-etf-lookthrough-refresh',
    'app-monthly-etf-lookthrough-refresh-1',
    'app-monthly-etf-lookthrough-refresh-2',
    'app-monthly-etf-lookthrough-refresh-3',
    'app-monthly-etf-lookthrough-refresh-4',
    'app-monthly-etf-lookthrough-refresh-5',
    'app-monthly-universe-validation'
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

-- Daily refreshes.
-- 6:30 AM SGT: full active universe latest-price refresh, up to 50 x 8 = 400 instruments.
select cron.schedule(
  'app-daily-instrument-price-refresh',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=50&maxBatches=8&lookbackDays=30');$$
);

-- 6:55 AM SGT: benchmark recent history after master prices.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '55 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

-- 7:05 AM SGT: portfolio valuation after instrument and benchmark data.
select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '5 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

-- 7:15 AM SGT: macro indicators.
select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '15 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

-- 7:25 AM SGT: FMP instrument and market news.
select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '25 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

-- 7:45 AM SGT: NewsData macro/world news.
select cron.schedule(
  'app-daily-newsdata-ingestion',
  '45 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence chain, every Monday SGT.
-- Three fundamentals passes cover the expanded stock universe even when the env cap remains 50.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '50 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '20 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '50 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 9:15 AM SGT: reconcile classified weekly news after daily news has run.
select cron.schedule(
  'app-weekly-news-reconciliation',
  '15 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

-- 9:30 AM SGT: generate Market Vision after reconciliation.
select cron.schedule(
  'app-weekly-market-vision',
  '30 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

-- 9:50 AM SGT: recommendations after fundamentals and Market Vision.
select cron.schedule(
  'app-weekly-recommendation-run',
  '50 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

-- 10:10 AM SGT: portfolio review after recommendations.
select cron.schedule(
  'app-weekly-portfolio-review-run',
  '10 2 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

-- 10:25 AM SGT: telemetry snapshots/evaluation after weekly outputs exist.
select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '25 2 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly slower refreshes, first day of month SGT.
-- Five look-through passes cover the expanded ETF universe when ETF_LOOKTHROUGH_MAX_ETFS_PER_RUN is 50.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-1',
  '40 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-2',
  '10 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-3',
  '40 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-4',
  '10 2 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-5',
  '40 2 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

-- 11:10 AM SGT: seed/universe validation after monthly look-through batch starts are clear.
select cron.schedule(
  'app-monthly-universe-validation',
  '10 3 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
