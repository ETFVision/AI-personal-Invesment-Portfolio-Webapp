-- Security Master Phase 7.
-- Multi-provider reconciliation readiness. Additive only: records provider
-- observations and identifier conflicts for review without changing resolver
-- priority or production calculations.

create table if not exists security_provider_identifier_observations (
  id uuid primary key default gen_random_uuid(),
  security_id uuid references securities_master(id) on delete set null,
  instrument_id uuid references instruments(id) on delete set null,
  provider text not null,
  provider_symbol text,
  identifier_type text not null,
  identifier_value text not null,
  provider_security_name text,
  provider_exchange text,
  provider_country text,
  observed_at timestamptz not null default now(),
  confidence_score numeric(8, 4),
  source_priority_rank integer,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security_identifier_conflicts (
  id uuid primary key default gen_random_uuid(),
  security_id uuid references securities_master(id) on delete set null,
  instrument_id uuid references instruments(id) on delete set null,
  conflict_type text not null check (
    conflict_type in (
      'IDENTIFIER_MISMATCH',
      'PROVIDER_SYMBOL_MISMATCH',
      'NAME_MISMATCH',
      'EXCHANGE_MISMATCH',
      'COUNTRY_MISMATCH',
      'DUPLICATE_IDENTIFIER',
      'AMBIGUOUS_PROVIDER_MAPPING',
      'OTHER'
    )
  ),
  identifier_type text,
  existing_value text,
  observed_value text,
  existing_provider text,
  observed_provider text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  review_status text not null default 'needs_review' check (review_status in ('needs_review', 'approved', 'rejected', 'resolved', 'ignored')),
  confidence_score numeric(8, 4),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_identifier_observations_security
  on security_provider_identifier_observations (security_id, observed_at desc);

create index if not exists idx_provider_identifier_observations_instrument
  on security_provider_identifier_observations (instrument_id, observed_at desc);

create index if not exists idx_provider_identifier_observations_lookup
  on security_provider_identifier_observations (identifier_type, upper(identifier_value), provider);

create index if not exists idx_security_identifier_conflicts_security
  on security_identifier_conflicts (security_id, review_status, severity);

create index if not exists idx_security_identifier_conflicts_instrument
  on security_identifier_conflicts (instrument_id, review_status, severity);

create index if not exists idx_security_identifier_conflicts_status
  on security_identifier_conflicts (review_status, severity, last_seen_at desc);

create unique index if not exists idx_security_identifier_conflicts_active_unique
  on security_identifier_conflicts (
    coalesce(security_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(instrument_id, '00000000-0000-0000-0000-000000000000'::uuid),
    conflict_type,
    coalesce(identifier_type, ''),
    coalesce(existing_value, ''),
    coalesce(observed_value, ''),
    coalesce(observed_provider, '')
  )
  where review_status = 'needs_review';

drop trigger if exists trg_provider_identifier_observations_updated_at on security_provider_identifier_observations;
create trigger trg_provider_identifier_observations_updated_at
  before update on security_provider_identifier_observations
  for each row
  execute function set_updated_at();

drop trigger if exists trg_security_identifier_conflicts_updated_at on security_identifier_conflicts;
create trigger trg_security_identifier_conflicts_updated_at
  before update on security_identifier_conflicts
  for each row
  execute function set_updated_at();

alter table security_provider_identifier_observations enable row level security;
alter table security_identifier_conflicts enable row level security;

drop policy if exists "authenticated users can read security provider observations" on security_provider_identifier_observations;
create policy "authenticated users can read security provider observations" on security_provider_identifier_observations
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read security identifier conflicts" on security_identifier_conflicts;
create policy "authenticated users can read security identifier conflicts" on security_identifier_conflicts
  for select using (auth.role() = 'authenticated');

create or replace function public.get_security_master_health_snapshot()
returns jsonb
language sql
stable
as $$
  with active_instruments as (
    select *
    from instruments
    where is_active = true
      and coalesce(is_internal_only, false) = false
  ),
  selectable_instruments as (
    select *
    from active_instruments
    where coalesce(is_user_selectable, true) = true
  ),
  etf_holdings as (
    select *
    from etf_top_holdings
  ),
  recommendation_coverage as (
    select count(*) as total, count(security_id) as with_security, count(issuer_id) as with_issuer
    from instrument_recommendations
  ),
  recommendation_history_coverage as (
    select count(*) as total, count(security_id) as with_security, count(issuer_id) as with_issuer
    from recommendation_history
  ),
  telemetry_coverage as (
    select count(*) as total, count(security_id) as with_security, count(issuer_id) as with_issuer
    from telemetry_recommendation_snapshots
  ),
  portfolio_review_phase as (
    select
      count(*) filter (where security_identity_snapshot->>'securityMasterPhase' = 'phase5') as phase5_reports,
      count(*) as total_reports
    from portfolio_review_reports
  )
  select jsonb_build_object(
    'activeInstruments', (select count(*) from active_instruments),
    'selectableInstruments', (select count(*) from selectable_instruments),
    'instrumentsWithSecurityId', (select count(*) from active_instruments where security_id is not null),
    'selectableWithSecurityId', (select count(*) from selectable_instruments where security_id is not null),
    'selectableWithIsin', (select count(*) from selectable_instruments where nullif(isin, '') is not null),
    'selectableWithCusip', (select count(*) from selectable_instruments where nullif(cusip, '') is not null),
    'selectableWithFigi', (select count(*) from selectable_instruments where nullif(figi, '') is not null),
    'staleIdentifierRefreshes', (
      select count(*)
      from selectable_instruments
      where identifier_last_refreshed_at is null
         or identifier_last_refreshed_at < now() - interval '30 days'
    ),
    'securityMasterRecords', (select count(*) from securities_master where is_active = true),
    'issuerRecords', (select count(*) from issuers where is_active = true),
    'linkedSecurities', (select count(distinct security_id) from security_issuer_links where valid_to is null),
    'etfTopHoldingRows', (select count(*) from etf_holdings),
    'etfTopHoldingsMapped', (select count(*) from etf_holdings where holding_security_id is not null and mapping_status = 'mapped'),
    'etfTopHoldingsUnmapped', (select count(*) from etf_holdings where holding_security_id is null or coalesce(mapping_status, 'unmapped') = 'unmapped'),
    'etfTopHoldingsAmbiguous', (select count(*) from etf_holdings where mapping_status = 'ambiguous'),
    'issuerDuplicateCandidatesOpen', (
      select count(*)
      from issuer_duplicate_candidates
      where review_status in ('needs_review', 'pending')
    ),
    'mappingGapRows', (select count(*) from security_master_mapping_gap_report),
    'recommendationsTotal', (select total from recommendation_coverage),
    'recommendationsWithSecurityId', (select with_security from recommendation_coverage),
    'recommendationsWithIssuerId', (select with_issuer from recommendation_coverage),
    'recommendationHistoryTotal', (select total from recommendation_history_coverage),
    'recommendationHistoryWithSecurityId', (select with_security from recommendation_history_coverage),
    'recommendationHistoryWithIssuerId', (select with_issuer from recommendation_history_coverage),
    'telemetryRecommendationSnapshotsTotal', (select total from telemetry_coverage),
    'telemetryRecommendationSnapshotsWithSecurityId', (select with_security from telemetry_coverage),
    'telemetryRecommendationSnapshotsWithIssuerId', (select with_issuer from telemetry_coverage),
    'portfolioReviewPhase5Reports', (select phase5_reports from portfolio_review_phase),
    'portfolioReviewReports', (select total_reports from portfolio_review_phase),
    'corporateActionRows', (select count(*) from security_corporate_actions),
    'lifecycleLinkRows', (select count(*) from security_lifecycle_links),
    'providerObservationRows', (select count(*) from security_provider_identifier_observations),
    'providerConflictRows', (select count(*) from security_identifier_conflicts),
    'providerOpenConflictRows', (
      select count(*)
      from security_identifier_conflicts
      where review_status = 'needs_review'
    )
  );
$$;

comment on table security_provider_identifier_observations is
  'Provider-level identifier observations used for future multi-provider reconciliation and source-priority auditing.';

comment on table security_identifier_conflicts is
  'Review queue for conflicting security identifiers, provider symbols, names, exchanges and ambiguous provider mappings.';
