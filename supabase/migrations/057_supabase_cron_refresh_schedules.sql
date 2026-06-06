-- Move production refresh scheduling from GitHub Actions to Supabase Cron.
--
-- Required Vault secrets before these jobs can successfully invoke the app:
--   select vault.create_secret('https://your-app.vercel.app', 'APP_URL', 'Public Vercel app URL for scheduled app jobs');
--   select vault.create_secret('<same value as Vercel CRON_SECRET>', 'CRON_SECRET', 'Bearer secret for scheduled app jobs');
--
-- All schedules are expressed in UTC. Comments include the Singapore time equivalent.
-- GDELT is intentionally excluded and remains a separate/manual refresh because of provider rate limits.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

alter table if exists job_runs
  drop constraint if exists job_runs_run_source_check;

alter table if exists job_runs
  add constraint job_runs_run_source_check
  check (run_source in ('github_actions', 'manual_ui', 'vercel_cron', 'supabase_cron', 'local'));

create or replace function public.invoke_scheduled_app_job(job_path text)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  app_url text;
  cron_secret text;
  normalized_url text;
  request_id bigint;
begin
  select decrypted_secret
    into app_url
    from vault.decrypted_secrets
   where name = 'APP_URL'
   limit 1;

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'CRON_SECRET'
   limit 1;

  if app_url is null or length(trim(app_url)) = 0 then
    raise exception 'APP_URL Vault secret is required for Supabase scheduled app jobs.';
  end if;

  if cron_secret is null or length(trim(cron_secret)) = 0 then
    raise exception 'CRON_SECRET Vault secret is required for Supabase scheduled app jobs.';
  end if;

  normalized_url := regexp_replace(trim(app_url), '/+$', '') || job_path;

  select net.http_post(
    url := normalized_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json',
      'X-Job-Source', 'supabase_cron'
    ),
    timeout_milliseconds := 300000
  )
    into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_scheduled_app_job(text) from public;

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion',
    'app-weekly-news-reconciliation',
    'app-weekly-market-vision',
    'app-weekly-recommendation-run',
    'app-weekly-portfolio-review-run',
    'app-weekly-telemetry-evaluation',
    'app-monthly-fundamentals-refresh',
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

-- Daily refreshes: start at 6:30 AM SGT and stagger dependent jobs.
select cron.schedule(
  'app-daily-instrument-price-refresh',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh');$$
);

select cron.schedule(
  'app-daily-benchmark-refresh',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '0 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '10 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence refreshes: every Monday from 8:00 AM SGT.
select cron.schedule(
  'app-weekly-news-reconciliation',
  '0 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '10 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '25 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '35 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '45 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly slower refreshes: first day of each month from 8:30 AM SGT.
select cron.schedule(
  'app-monthly-fundamentals-refresh',
  '30 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh',
  '45 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-universe-validation',
  '15 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
