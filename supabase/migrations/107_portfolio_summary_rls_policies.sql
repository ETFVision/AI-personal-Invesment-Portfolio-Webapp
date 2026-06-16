-- Add user-scoped SELECT policies to portfolio summary tables.
-- RLS is already enabled on both tables. Reads and writes in the app
-- use the service role (which bypasses RLS), so these policies are
-- defensive only and do not change application behaviour.

create policy "users can read own portfolio dashboard summary"
  on portfolio_dashboard_summary for select
  using (
    portfolio_id in (
      select id from portfolios where user_id = auth.uid()
    )
  );

create policy "users can read own portfolio performance summary"
  on portfolio_performance_summary for select
  using (
    portfolio_id in (
      select id from portfolios where user_id = auth.uid()
    )
  );
