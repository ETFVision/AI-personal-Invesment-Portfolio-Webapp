-- Reschedule daily instrument metadata refresh to cover the full active universe.
--
-- The application now auto-sizes metadata refresh batches when maxBatches is
-- omitted, so this job keeps the 22:55 UTC slot from migration 117 but removes
-- the fixed maxBatches cap. Apply manually to Supabase.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-metadata-refresh'
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

select cron.schedule(
  'app-daily-instrument-metadata-refresh',
  '55 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-metadata-refresh?batchSize=25&lockTtlSeconds=600');$$
);
