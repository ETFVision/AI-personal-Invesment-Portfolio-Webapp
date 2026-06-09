-- Temporary latest market-data catch-up schedule for the expanded universe.
--
-- Runs the same bounded latest-price endpoint used by the daily schedule every
-- 5 minutes. The endpoint only refreshes stale or missing latest prices, so
-- completed coverage turns into skipped/no-op job logs instead of repeatedly
-- updating current instruments.

do $$
begin
  begin
    perform cron.unschedule('app-temporary-market-data-catchup');
  exception
    when others then
      null;
  end;
end;
$$;

select cron.schedule(
  'app-temporary-market-data-catchup',
  '*/5 * * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30');$$
);
