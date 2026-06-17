-- Pre-commercial RLS hardening for assistant and telemetry tables.
-- Replaces broad authenticated SELECT policies with user-scoped policies.
-- Application writes and scheduled jobs use the service role, which bypasses RLS.

drop policy if exists "users can read assistant conversations" on assistant_conversations;
create policy "users can read own assistant conversations" on assistant_conversations
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from users u
      where u.id = assistant_conversations.user_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

drop policy if exists "users can read assistant messages" on assistant_messages;
create policy "users can read own assistant messages" on assistant_messages
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from assistant_conversations ac
      join users u on u.id = ac.user_id
      where ac.id = assistant_messages.conversation_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

drop policy if exists "users can read assistant usage logs" on assistant_usage_logs;
create policy "users can read own assistant usage logs" on assistant_usage_logs
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from users u
      where u.id = assistant_usage_logs.user_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

drop policy if exists "users can read telemetry recommendation snapshots" on telemetry_recommendation_snapshots;
create policy "users can read own telemetry recommendation snapshots" on telemetry_recommendation_snapshots
  for select using (
    auth.role() = 'authenticated'
    and (
      portfolio_id is null
      or exists (
        select 1 from portfolios p
        join users u on u.id = p.user_id
        where p.id = telemetry_recommendation_snapshots.portfolio_id
          and u.auth_provider = 'supabase'
          and u.auth_provider_user_id = auth.uid()::text
      )
    )
  );

drop policy if exists "users can read telemetry portfolio review snapshots" on telemetry_portfolio_review_snapshots;
create policy "users can read own telemetry portfolio review snapshots" on telemetry_portfolio_review_snapshots
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from portfolios p
      join users u on u.id = p.user_id
      where p.id = telemetry_portfolio_review_snapshots.portfolio_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

drop policy if exists "users can read telemetry recommendation outcomes" on telemetry_recommendation_outcomes;
create policy "users can read own telemetry recommendation outcomes" on telemetry_recommendation_outcomes
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from telemetry_recommendation_snapshots trs
      join portfolios p on p.id = trs.portfolio_id
      join users u on u.id = p.user_id
      where trs.id = telemetry_recommendation_outcomes.recommendation_snapshot_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

drop policy if exists "users can read telemetry portfolio review outcomes" on telemetry_portfolio_review_outcomes;
create policy "users can read own telemetry portfolio review outcomes" on telemetry_portfolio_review_outcomes
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from telemetry_portfolio_review_snapshots tprs
      join portfolios p on p.id = tprs.portfolio_id
      join users u on u.id = p.user_id
      where tprs.id = telemetry_portfolio_review_outcomes.portfolio_review_snapshot_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );
