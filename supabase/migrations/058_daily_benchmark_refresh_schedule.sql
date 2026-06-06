-- Keep benchmark comparison series current with daily recent refreshes.
-- Historical benchmark backfill stays manual through Admin > Data Sources.

do $$
begin
  begin
    perform cron.unschedule('app-daily-benchmark-refresh');
  exception
    when others then
      null;
  end;

  begin
    perform cron.unschedule('app-monthly-benchmark-refresh');
  exception
    when others then
      null;
  end;
end;
$$;

-- Daily 6:35 AM SGT, between master price refresh and portfolio valuation.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);
