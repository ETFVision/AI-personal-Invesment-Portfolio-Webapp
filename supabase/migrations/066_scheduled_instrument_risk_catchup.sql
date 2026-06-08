-- Temporary catch-up schedule for expanded-universe instrument risk metrics.
--
-- Runs small risk batches every 10 minutes. The endpoint only refreshes
-- instruments with missing or stale risk metrics, so completed batches become
-- skipped job logs instead of repeatedly recalculating current instruments.

do $$
begin
  begin
    perform cron.unschedule('app-instrument-risk-refresh-catchup');
  exception
    when others then
      null;
  end;
end;
$$;

select cron.schedule(
  'app-instrument-risk-refresh-catchup',
  '*/10 * * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?batchSize=10&minObservations=30');$$
);
