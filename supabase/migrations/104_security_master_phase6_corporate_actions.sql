-- Security Master Phase 6.
-- Corporate-action readiness. Additive only: records lifecycle events and
-- predecessor/successor links without changing active calculations.

create table if not exists security_corporate_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (
    action_type in (
      'TICKER_CHANGE',
      'MERGER',
      'SPIN_OFF',
      'SHARE_CLASS_CHANGE',
      'ETF_NAME_CHANGE',
      'ETF_CLOSURE',
      'DELISTING',
      'SUCCESSOR_PREDECESSOR',
      'OTHER'
    )
  ),
  security_id uuid references securities_master(id) on delete set null,
  issuer_id uuid references issuers(id) on delete set null,
  predecessor_security_id uuid references securities_master(id) on delete set null,
  successor_security_id uuid references securities_master(id) on delete set null,
  old_symbol text,
  new_symbol text,
  old_name text,
  new_name text,
  effective_date date,
  announcement_date date,
  source text not null default 'manual',
  source_event_id text,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'applied', 'superseded')),
  confidence_score numeric(8, 4),
  raw_payload jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security_lifecycle_links (
  id uuid primary key default gen_random_uuid(),
  predecessor_security_id uuid not null references securities_master(id) on delete cascade,
  successor_security_id uuid not null references securities_master(id) on delete cascade,
  relationship_type text not null check (
    relationship_type in (
      'TICKER_CHANGE',
      'MERGER',
      'SPIN_OFF',
      'SHARE_CLASS_CHANGE',
      'ETF_NAME_CHANGE',
      'ETF_CLOSURE',
      'SUCCESSOR_PREDECESSOR',
      'OTHER'
    )
  ),
  corporate_action_id uuid references security_corporate_actions(id) on delete set null,
  valid_from date,
  valid_to date,
  confidence_score numeric(8, 4),
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_lifecycle_links_no_self_link check (predecessor_security_id <> successor_security_id)
);

create index if not exists idx_security_corporate_actions_security
  on security_corporate_actions (security_id, effective_date desc);

create index if not exists idx_security_corporate_actions_issuer
  on security_corporate_actions (issuer_id, effective_date desc);

create index if not exists idx_security_corporate_actions_status
  on security_corporate_actions (status, effective_date desc);

create index if not exists idx_security_corporate_actions_symbols
  on security_corporate_actions (upper(old_symbol), upper(new_symbol));

create index if not exists idx_security_lifecycle_links_predecessor
  on security_lifecycle_links (predecessor_security_id, valid_from desc);

create index if not exists idx_security_lifecycle_links_successor
  on security_lifecycle_links (successor_security_id, valid_from desc);

create unique index if not exists idx_security_lifecycle_links_active_unique
  on security_lifecycle_links (predecessor_security_id, successor_security_id, relationship_type)
  where valid_to is null;

drop trigger if exists trg_security_corporate_actions_updated_at on security_corporate_actions;
create trigger trg_security_corporate_actions_updated_at
  before update on security_corporate_actions
  for each row
  execute function set_updated_at();

drop trigger if exists trg_security_lifecycle_links_updated_at on security_lifecycle_links;
create trigger trg_security_lifecycle_links_updated_at
  before update on security_lifecycle_links
  for each row
  execute function set_updated_at();

alter table security_corporate_actions enable row level security;
alter table security_lifecycle_links enable row level security;

drop policy if exists "authenticated users can read security corporate actions" on security_corporate_actions;
create policy "authenticated users can read security corporate actions" on security_corporate_actions
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read security lifecycle links" on security_lifecycle_links;
create policy "authenticated users can read security lifecycle links" on security_lifecycle_links
  for select using (auth.role() = 'authenticated');

comment on table security_corporate_actions is
  'Corporate-action event log for ticker changes, mergers, spin-offs, share-class changes, ETF name changes, ETF closures and lifecycle events. Additive readiness only.';

comment on table security_lifecycle_links is
  'Predecessor/successor security links created from approved corporate actions. Used for future history continuity and audit.';
