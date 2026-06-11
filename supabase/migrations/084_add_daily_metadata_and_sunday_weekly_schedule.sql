-- Add daily instrument metadata refresh after risk metrics and move weekly jobs to Sunday SGT.
--
-- Times below are UTC. Singapore time is UTC+8.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-metadata-refresh',
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

-- Daily downstream refreshes, every day.
-- 6:10 AM SGT: instrument metadata after risk metrics.
select cron.schedule(
  'app-daily-instrument-metadata-refresh',
  '10 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-metadata-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300');$$
);

-- 6:15-6:55 AM SGT: downstream daily jobs.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '15 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '25 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '45 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '55 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence chain, every Sunday SGT, after the Sunday daily chain.
-- Sunday 7:10 AM SGT is Saturday 11:10 PM UTC.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '10 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '20 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '30 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '40 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '50 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

-- Sunday 8:00 AM SGT onward is Sunday UTC.
select cron.schedule(
  'app-weekly-recommendation-run',
  '0 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '10 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '20 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);
