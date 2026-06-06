-- Bring weekly and monthly refreshes earlier while preserving daily dependencies.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-weekly-fundamentals-refresh',
    'app-weekly-news-reconciliation',
    'app-weekly-market-vision',
    'app-weekly-recommendation-run',
    'app-weekly-portfolio-review-run',
    'app-weekly-telemetry-evaluation',
    'app-monthly-etf-lookthrough-refresh',
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

-- Weekly intelligence chain. Daily data finishes at 7:10 AM SGT; this starts after a short buffer.
select cron.schedule(
  'app-weekly-fundamentals-refresh',
  '20 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '45 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '55 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '10 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '25 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '35 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly refreshes start after the earlier weekly chain when the first day is a Monday.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh',
  '40 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-universe-validation',
  '5 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
