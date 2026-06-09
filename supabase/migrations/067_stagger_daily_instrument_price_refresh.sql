-- Split the expanded-universe daily price refresh into smaller staggered runs.
--
-- The prior schedule used one large request:
--   /api/jobs/instrument-price-refresh?batchSize=50&maxBatches=8&lookbackDays=30
-- With 300+ instruments this can exceed database statement timeouts while
-- rebuilding derived metrics. Smaller staggered runs keep each request bounded.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-price-refresh-1',
    'app-daily-instrument-price-refresh-2',
    'app-daily-instrument-price-refresh-3',
    'app-daily-instrument-price-refresh-4'
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

-- 6:30 AM SGT: first latest-price batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-1',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:40 AM SGT: second latest-price batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-2',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 6:50 AM SGT: third latest-price batch.
select cron.schedule(
  'app-daily-instrument-price-refresh-3',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);

-- 7:00 AM SGT: final catch-up batch before benchmark and portfolio refresh.
select cron.schedule(
  'app-daily-instrument-price-refresh-4',
  '0 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);
