-- Replace the five daily latest-price passes with one adjusted-close EOD refresh
-- using the same historical-price-eod source as the backfill.
--
-- Times below are UTC. Singapore time is UTC+8.
-- Apply manually to Supabase so pg_cron uses the adjusted EOD endpoint.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-price-refresh-1',
    'app-daily-instrument-price-refresh-2',
    'app-daily-instrument-price-refresh-3',
    'app-daily-instrument-price-refresh-4',
    'app-daily-instrument-price-refresh-5'
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

-- 5:20 AM SGT daily: one adjusted EOD price pull after the US close / EOD publish window.
select cron.schedule(
  'app-daily-instrument-price-refresh',
  '20 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?source=eod&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);
