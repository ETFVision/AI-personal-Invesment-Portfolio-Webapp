-- Sequence daily downstream refreshes after staggered instrument price batches.
--
-- Price batches finish at 7:00 AM SGT. These jobs now start after that window
-- so benchmark, portfolio valuation, macro and news refreshes do not overlap
-- with the heavier instrument-price chain.

do $$
declare
  job_name text;
  job_names text[] := array[
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

-- 7:15 AM SGT: benchmark recent history after all instrument price batches.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '15 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

-- 7:25 AM SGT: portfolio valuation after instrument and benchmark data.
select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '25 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

-- 7:35 AM SGT: macro indicators.
select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '35 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

-- 7:45 AM SGT: FMP instrument and market news.
select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '45 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

-- 8:05 AM SGT: NewsData macro/world news after FMP news.
select cron.schedule(
  'app-daily-newsdata-ingestion',
  '5 0 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);
