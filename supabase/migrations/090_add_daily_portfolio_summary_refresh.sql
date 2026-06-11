-- Add an explicit daily portfolio summary read-model refresh.
--
-- Times below are UTC. Singapore time is UTC+8.
-- 6:30 AM SGT runs after portfolio valuation and before macro/news ingestion.

do $$
begin
  begin
    perform cron.unschedule('app-daily-portfolio-summary-refresh');
  exception
    when others then
      null;
  end;
end;
$$;

select cron.schedule(
  'app-daily-portfolio-summary-refresh',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-summary-refresh');$$
);
