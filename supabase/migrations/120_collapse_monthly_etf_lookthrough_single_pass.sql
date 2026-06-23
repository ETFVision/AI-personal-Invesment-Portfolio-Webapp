-- Collapse monthly ETF look-through refresh from five cron passes to one now
-- that set-based eligibility and bounded-concurrency refresh can cover all due
-- ETFs in a single run. Both monthly jobs still fire on the 1st UTC, which is
-- also the 1st in US Eastern. Apply manually to Supabase so pg_cron uses this
-- schedule.

do $$
declare
  job_name text;
  job_names text[] := array[
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

-- Monthly refreshes, first day of month UTC.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh',
  '30 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-universe-validation',
  '35 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
