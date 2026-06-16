-- Correction for migration 107: the portfolio summary RLS policies used
-- user_id = auth.uid() which always returns zero rows because portfolios.user_id
-- references the internal app users.id UUID, not the Supabase Auth UID.
-- The Supabase Auth UID is stored in users.auth_provider_user_id (text).
-- This fix uses the same exists() pattern as portfolio_snapshots (migration 004)
-- and cash_balances/holdings/transactions (migration 001).

drop policy if exists "users can read own portfolio dashboard summary" on portfolio_dashboard_summary;
drop policy if exists "users can read own portfolio performance summary" on portfolio_performance_summary;

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
