-- Sequence weekly and monthly refreshes after the daily refresh chain.
--
-- Daily jobs now run through 8:05 AM SGT. Weekly jobs are moved after that
-- buffer. Monthly jobs are moved after the weekly chain to avoid overlap when
-- the first day of the month falls on a Monday.

do $$
declare
  job_name text;
  job_names text[] := array[
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

-- Weekly intelligence chain, every Monday SGT.
-- 8:20 AM SGT: fundamentals pass 1 after daily NewsData completes.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '20 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 8:50 AM SGT: fundamentals pass 2.
select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '50 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 9:20 AM SGT: fundamentals pass 3.
select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '20 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

-- 9:50 AM SGT: weekly news reconciliation after fundamentals passes.
select cron.schedule(
  'app-weekly-news-reconciliation',
  '50 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

-- 10:10 AM SGT: Market Vision after reconciliation.
select cron.schedule(
  'app-weekly-market-vision',
  '10 2 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

-- 10:35 AM SGT: recommendations after Market Vision.
select cron.schedule(
  'app-weekly-recommendation-run',
  '35 2 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

-- 11:00 AM SGT: portfolio review after recommendations.
select cron.schedule(
  'app-weekly-portfolio-review-run',
  '0 3 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

-- 11:20 AM SGT: telemetry snapshots/evaluation after weekly outputs.
select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '20 3 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly slower refreshes, first day of month SGT.
-- Starts after the weekly chain window in case the 1st is a Monday.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-1',
  '0 4 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-2',
  '30 4 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-3',
  '0 5 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-4',
  '30 5 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-5',
  '0 6 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

-- 2:30 PM SGT: universe validation after monthly look-through passes.
select cron.schedule(
  'app-monthly-universe-validation',
  '30 6 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
