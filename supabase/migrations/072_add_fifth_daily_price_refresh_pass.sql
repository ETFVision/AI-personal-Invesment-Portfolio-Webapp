-- Add a fifth daily latest-price refresh pass for the expanded universe.
--
-- Each price pass calls the bounded endpoint with batchSize=25 and
-- maxBatches=3, so each pass can refresh up to 75 stale/missing instruments.
-- Five passes provide up to 375 latest-price instruments before downstream
-- benchmark, portfolio valuation, macro and news jobs run.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-price-refresh-1',
    'app-daily-instrument-price-refresh-2',
    'app-daily-instrument-price-refresh-3',
    'app-daily-instrument-price-refresh-4',
    'app-daily-instrument-price-refresh-5',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion'
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

-- Daily refreshes, Singapore time.
-- 5:30 AM SGT: latest-price pass 1.
select cron.schedule(
  'app-daily-instrument-price-refresh-1',
  '30 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 5:40 AM SGT: latest-price pass 2.
select cron.schedule(
  'app-daily-instrument-price-refresh-2',
  '40 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 5:50 AM SGT: latest-price pass 3.
select cron.schedule(
  'app-daily-instrument-price-refresh-3',
  '50 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:00 AM SGT: latest-price pass 4.
select cron.schedule(
  'app-daily-instrument-price-refresh-4',
  '0 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:10 AM SGT: latest-price pass 5.
select cron.schedule(
  'app-daily-instrument-price-refresh-5',
  '10 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:20 AM SGT: benchmark recent history after instrument prices.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '20 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

-- 6:30 AM SGT: portfolio valuation after instrument and benchmark data.
select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

-- 6:40 AM SGT: macro indicators.
select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

-- 6:50 AM SGT: FMP instrument and market news.
select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

-- 7:00 AM SGT: NewsData macro/world news.
select cron.schedule(
  'app-daily-newsdata-ingestion',
  '0 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);
