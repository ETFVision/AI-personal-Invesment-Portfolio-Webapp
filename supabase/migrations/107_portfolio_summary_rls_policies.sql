-- Add user-scoped SELECT policies to portfolio summary tables.
-- RLS is already enabled on both tables. Reads and writes in the app
-- use the service role (which bypasses RLS), so these policies are
-- defensive only and do not change application behaviour.
-- Uses the same exists() pattern as portfolio_snapshots (migration 004):
-- joins through users.auth_provider_user_id because portfolios.user_id
-- references the internal app users.id UUID, not the Supabase Auth UID.

create policy "users can read own portfolio dashboard summary"
  on portfolio_dashboard_summary for select
  using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = portfolio_dashboard_summary.portfolio_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );

create policy "users can read own portfolio performance summary"
  on portfolio_performance_summary for select
  using (
    exists (
      select 1 from portfolios
      join users on users.id = portfolios.user_id
      where portfolios.id = portfolio_performance_summary.portfolio_id
        and users.auth_provider = 'supabase'
        and users.auth_provider_user_id = auth.uid()::text
    )
  );
