-- Market history backfill is kept as a manual Admin > Data Sources action.
-- Remove the temporary scheduled batch job if migration 061 was applied.

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
