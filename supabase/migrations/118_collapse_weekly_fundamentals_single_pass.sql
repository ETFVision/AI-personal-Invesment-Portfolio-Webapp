-- Collapse the weekly fundamentals refresh from three cron passes to one now
-- that bounded-concurrency refresh can cover the full due stock universe in a
-- single run. The weekly chain now stays entirely before midnight UTC with no
-- Sunday-UTC rollover. Apply manually to Supabase so pg_cron uses this schedule.

do $$
declare
  job_name text;
  job_names text[] := array[
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

-- Weekly refreshes, Saturday UTC with no midnight-UTC rollover.
select cron.schedule(
  'app-weekly-fundamentals-refresh',
  '30 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '35 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '40 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '45 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '50 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '55 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);
