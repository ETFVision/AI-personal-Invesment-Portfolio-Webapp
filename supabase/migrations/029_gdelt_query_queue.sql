-- Queue-based GDELT pacing.
-- Each ingestion run should process only the next due query group batch instead
-- of refreshing the full macro universe at once.

alter table gdelt_query_groups
  add column if not exists last_attempted_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists next_run_at timestamptz,
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_error text;

create index if not exists idx_gdelt_query_groups_due
  on gdelt_query_groups (is_active, next_run_at, last_attempted_at);

update gdelt_query_groups
set next_run_at = coalesce(next_run_at, now())
where is_active = true;
