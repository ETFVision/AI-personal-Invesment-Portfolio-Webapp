-- Remove the temporary latest market-data catch-up schedule.
--
-- Run this after Admin / Data Sources shows latest market data coverage is
-- complete, or whenever the temporary catch-up is no longer needed.

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
