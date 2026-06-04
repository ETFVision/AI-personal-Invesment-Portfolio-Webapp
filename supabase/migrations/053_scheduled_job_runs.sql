-- Generic scheduled job observability and lightweight overlap prevention.

create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_source text not null default 'github_actions'
    check (run_source in ('github_actions', 'manual_ui', 'vercel_cron', 'local')),
  status text not null
    check (status in ('success', 'partial_success', 'failed', 'skipped')),
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms integer,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists job_locks (
  job_name text primary key,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  lock_owner text not null
);

create index if not exists idx_job_runs_job_started
  on job_runs (job_name, started_at desc);

create index if not exists idx_job_runs_status_started
  on job_runs (status, started_at desc);

create index if not exists idx_job_locks_expires_at
  on job_locks (expires_at);

alter table job_runs enable row level security;
alter table job_locks enable row level security;

drop policy if exists "authenticated users can read job runs" on job_runs;
create policy "authenticated users can read job runs" on job_runs
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read job locks" on job_locks;
create policy "authenticated users can read job locks" on job_locks
  for select using (auth.role() = 'authenticated');
