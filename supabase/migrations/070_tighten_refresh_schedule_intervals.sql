-- Tighten daily, weekly and monthly refresh schedules.
--
-- Daily starts at 5:30 AM SGT and all dependent jobs run at 10-minute
-- intervals. Weekly and monthly chains also use 10-minute intervals while
-- keeping monthly after the weekly window when the 1st falls on a Monday.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-price-refresh-1',
    'app-daily-instrument-price-refresh-2',
    'app-daily-instrument-price-refresh-3',
    'app-daily-instrument-price-refresh-4',
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
-- 5:30 AM SGT: first latest-price batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-1',
  '30 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 5:40 AM SGT: second latest-price batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-2',
  '40 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 5:50 AM SGT: third latest-price batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-3',
  '50 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:00 AM SGT: final latest-price catch-up batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-4',
  '0 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:10 AM SGT: benchmark recent history after instrument prices.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '10 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

-- 6:20 AM SGT: portfolio valuation after instrument and benchmark data.
select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '20 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

-- 6:30 AM SGT: macro indicators.
select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

-- 6:40 AM SGT: FMP instrument and market news.
select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

-- 6:50 AM SGT: NewsData macro/world news.
select cron.schedule(
  'app-daily-newsdata-ingestion',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence chain, every Monday SGT.
-- 7:10 AM SGT: fundamentals pass 1 after daily chain completes.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '10 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 7:20 AM SGT: fundamentals pass 2.
select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '20 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 7:30 AM SGT: fundamentals pass 3.
select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '30 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 7:40 AM SGT: weekly news reconciliation.
select cron.schedule(
  'app-weekly-news-reconciliation',
  '40 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

-- 7:50 AM SGT: Market Vision after reconciliation.
select cron.schedule(
  'app-weekly-market-vision',
  '50 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

-- 8:00 AM SGT: recommendations after Market Vision.
select cron.schedule(
  'app-weekly-recommendation-run',
  '0 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

-- 8:10 AM SGT: portfolio review after recommendations.
select cron.schedule(
  'app-weekly-portfolio-review-run',
  '10 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

-- 8:20 AM SGT: telemetry snapshots/evaluation after weekly outputs.
select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '20 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly slower refreshes, first day of month SGT.
-- Starts after the weekly chain window in case the 1st is a Monday.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-1',
  '40 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-2',
  '50 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-3',
  '0 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-4',
  '10 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-5',
  '20 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

-- 9:30 AM SGT: universe validation after monthly look-through passes.
select cron.schedule(
  'app-monthly-universe-validation',
  '30 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
