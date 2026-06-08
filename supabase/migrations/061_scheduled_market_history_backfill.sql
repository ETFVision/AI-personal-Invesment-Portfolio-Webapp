-- Run long market-history backfills as small, repeatable scheduled batches.
-- The endpoint exits quickly once instrument history is complete and then keeps
-- benchmark history fresh/full without a long browser request.

do $$
begin
  begin
    perform cron.unschedule('app-market-history-backfill');
  exception
    when others then
      null;
  end;
end;
$$;

select cron.schedule(
  'app-market-history-backfill',
  '*/3 * * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/market-history-backfill?batchSize=3&maxBatches=1');$$
);
