-- Security Master Phase 5.
-- Persist stable security/issuer identity on recommendation and telemetry
-- snapshots while preserving historical symbols and labels for audit.
-- This is additive only: it does not change recommendation scoring,
-- portfolio review scoring, or telemetry evaluation logic.

alter table instrument_recommendations
  add column if not exists security_id uuid references securities_master(id) on delete set null,
  add column if not exists issuer_id uuid references issuers(id) on delete set null;

alter table recommendation_history
  add column if not exists security_id uuid references securities_master(id) on delete set null,
  add column if not exists issuer_id uuid references issuers(id) on delete set null;

alter table telemetry_recommendation_snapshots
  add column if not exists security_id uuid references securities_master(id) on delete set null,
  add column if not exists issuer_id uuid references issuers(id) on delete set null;

alter table portfolio_review_reports
  add column if not exists security_identity_snapshot jsonb not null default '{}'::jsonb;

alter table telemetry_portfolio_review_snapshots
  add column if not exists security_identity_snapshot jsonb not null default '{}'::jsonb;

create index if not exists idx_instrument_recommendations_security
  on instrument_recommendations (security_id, created_at desc);

create index if not exists idx_instrument_recommendations_issuer
  on instrument_recommendations (issuer_id, created_at desc);

create index if not exists idx_recommendation_history_security_date
  on recommendation_history (security_id, run_date desc);

create index if not exists idx_recommendation_history_issuer_date
  on recommendation_history (issuer_id, run_date desc);

create index if not exists idx_telemetry_recommendation_snapshots_security
  on telemetry_recommendation_snapshots (security_id, generated_at desc);

create index if not exists idx_telemetry_recommendation_snapshots_issuer
  on telemetry_recommendation_snapshots (issuer_id, generated_at desc);

create or replace function public.resolve_instrument_security_identity(
  p_instrument_id uuid,
  p_symbol text
)
returns table (
  resolved_security_id uuid,
  resolved_issuer_id uuid
)
language sql
stable
as $$
  select
    instrument.security_id as resolved_security_id,
    issuer_link.issuer_id as resolved_issuer_id
  from instruments instrument
  left join security_issuer_links issuer_link
    on issuer_link.security_id = instrument.security_id
   and issuer_link.valid_to is null
  where (
      p_instrument_id is not null
      and instrument.id = p_instrument_id
    )
    or (
      p_symbol is not null
      and upper(instrument.symbol) = upper(p_symbol)
      and instrument.is_active = true
    )
  order by
    case
      when p_instrument_id is not null and instrument.id = p_instrument_id then 0
      else 1
    end,
    instrument.is_active desc,
    instrument.updated_at desc nulls last
  limit 1;
$$;

create or replace function public.set_snapshot_security_identity()
returns trigger
language plpgsql
as $$
declare
  resolved record;
begin
  if new.security_id is null or new.issuer_id is null then
    select *
    into resolved
    from public.resolve_instrument_security_identity(new.instrument_id, new.symbol);

    if found then
      if new.security_id is null then
        new.security_id := resolved.resolved_security_id;
      end if;

      if new.issuer_id is null then
        new.issuer_id := resolved.resolved_issuer_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_instrument_recommendations_security_identity on instrument_recommendations;
create trigger trg_instrument_recommendations_security_identity
  before insert or update of instrument_id, symbol, security_id, issuer_id
  on instrument_recommendations
  for each row
  execute function public.set_snapshot_security_identity();

drop trigger if exists trg_recommendation_history_security_identity on recommendation_history;
create trigger trg_recommendation_history_security_identity
  before insert or update of instrument_id, symbol, security_id, issuer_id
  on recommendation_history
  for each row
  execute function public.set_snapshot_security_identity();

drop trigger if exists trg_telemetry_recommendation_snapshots_security_identity on telemetry_recommendation_snapshots;
create trigger trg_telemetry_recommendation_snapshots_security_identity
  before insert or update of instrument_id, symbol, security_id, issuer_id
  on telemetry_recommendation_snapshots
  for each row
  execute function public.set_snapshot_security_identity();

with resolved as (
  select
    rec.id,
    identity.resolved_security_id,
    identity.resolved_issuer_id
  from instrument_recommendations rec
  cross join lateral public.resolve_instrument_security_identity(rec.instrument_id, rec.symbol) identity
  where rec.security_id is null or rec.issuer_id is null
)
update instrument_recommendations rec
set
  security_id = coalesce(rec.security_id, resolved.resolved_security_id),
  issuer_id = coalesce(rec.issuer_id, resolved.resolved_issuer_id)
from resolved
where rec.id = resolved.id;

with resolved as (
  select
    history.id,
    identity.resolved_security_id,
    identity.resolved_issuer_id
  from recommendation_history history
  cross join lateral public.resolve_instrument_security_identity(history.instrument_id, history.symbol) identity
  where history.security_id is null or history.issuer_id is null
)
update recommendation_history history
set
  security_id = coalesce(history.security_id, resolved.resolved_security_id),
  issuer_id = coalesce(history.issuer_id, resolved.resolved_issuer_id)
from resolved
where history.id = resolved.id;

with resolved as (
  select
    snapshot.id,
    identity.resolved_security_id,
    identity.resolved_issuer_id
  from telemetry_recommendation_snapshots snapshot
  cross join lateral public.resolve_instrument_security_identity(snapshot.instrument_id, snapshot.symbol) identity
  where snapshot.security_id is null or snapshot.issuer_id is null
)
update telemetry_recommendation_snapshots snapshot
set
  security_id = coalesce(snapshot.security_id, resolved.resolved_security_id),
  issuer_id = coalesce(snapshot.issuer_id, resolved.resolved_issuer_id)
from resolved
where snapshot.id = resolved.id;

update portfolio_review_reports report
set security_identity_snapshot = coalesce(nullif(report.security_identity_snapshot, '{}'::jsonb), '{}'::jsonb) ||
  jsonb_build_object(
    'securityMasterPhase', 'phase5',
    'portfolioLookthroughIdentityBasis', 'issuer_id_then_security_id_then_raw_symbol',
    'historicalSymbolsPreserved', true,
    'backfilledAt', now()
  )
where report.security_identity_snapshot = '{}'::jsonb
   or report.security_identity_snapshot->>'securityMasterPhase' is null;

update telemetry_portfolio_review_snapshots snapshot
set security_identity_snapshot = coalesce(nullif(snapshot.security_identity_snapshot, '{}'::jsonb), '{}'::jsonb) ||
  jsonb_build_object(
    'securityMasterPhase', 'phase5',
    'portfolioLookthroughIdentityBasis', 'issuer_id_then_security_id_then_raw_symbol',
    'historicalSymbolsPreserved', true,
    'backfilledAt', now()
  )
where snapshot.security_identity_snapshot = '{}'::jsonb
   or snapshot.security_identity_snapshot->>'securityMasterPhase' is null;

comment on column instrument_recommendations.security_id is
  'Stable canonical security identity captured at recommendation snapshot time; historical symbol remains stored for audit.';
comment on column instrument_recommendations.issuer_id is
  'Stable issuer identity for share-class/ticker continuity in recommendation analysis.';
comment on column recommendation_history.security_id is
  'Stable canonical security identity captured for recommendation history continuity.';
comment on column recommendation_history.issuer_id is
  'Stable issuer identity captured for recommendation history continuity.';
comment on column telemetry_recommendation_snapshots.security_id is
  'Stable canonical security identity captured for telemetry evaluation continuity.';
comment on column telemetry_recommendation_snapshots.issuer_id is
  'Stable issuer identity captured for telemetry evaluation continuity.';
comment on column portfolio_review_reports.security_identity_snapshot is
  'Portfolio-level traceability metadata describing how security/issuer identity was used for look-through calculations.';
comment on column telemetry_portfolio_review_snapshots.security_identity_snapshot is
  'Portfolio-level telemetry traceability metadata describing security/issuer identity basis at snapshot time.';
