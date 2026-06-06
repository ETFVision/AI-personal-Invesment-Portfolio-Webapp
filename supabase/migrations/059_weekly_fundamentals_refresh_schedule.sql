-- Move fundamentals freshness from monthly to weekly.
-- Historical/deeper fundamentals backfill remains a future/manual mode.

do $$
begin
  begin
    perform cron.unschedule('app-weekly-fundamentals-refresh');
  exception
    when others then
      null;
  end;

  begin
    perform cron.unschedule('app-monthly-fundamentals-refresh');
  exception
    when others then
      null;
  end;
end;
$$;

-- Monday 7:30 AM SGT, before weekly reconciliation, Market Vision, recommendations and Portfolio Review.
select cron.schedule(
  'app-weekly-fundamentals-refresh',
  '30 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);
