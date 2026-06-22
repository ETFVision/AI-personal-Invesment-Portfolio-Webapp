-- Security Master monitoring: internal-only stubs and stub collisions.
--
-- Additive only. Extends the Admin/Data Sources health snapshot JSON without
-- changing schema, calculations, or Security Master sync behavior.

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
    select
      count(*) as total,
      count(security_id) as with_security,
      count(issuer_id) as with_issuer
    from instrument_recommendations
  ),
  recommendation_history_coverage as (
    select
      count(*) as total,
      count(security_id) as with_security,
      count(issuer_id) as with_issuer
    from recommendation_history
  ),
  telemetry_coverage as (
    select
      count(*) as total,
      count(security_id) as with_security,
      count(issuer_id) as with_issuer
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
    'internalOnlySecurities', (
      select count(*)
      from securities_master
      where is_active = true
        and is_internal_only = true
    ),
    'stubCollisionCount', (
      select count(distinct sm.id)
      from securities_master sm
      join instruments i
        on upper(trim(i.symbol)) = upper(trim(sm.canonical_symbol))
        and i.is_active = true
      where sm.is_active = true
        and sm.is_internal_only = true
    ),
    'issuerRecords', (select count(*) from issuers where is_active = true),
    'linkedSecurities', (
      select count(distinct security_id)
      from security_issuer_links
      where valid_to is null
    ),
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
    'corporateActionRows', 0,
    'lifecycleLinkRows', 0,
    'providerObservationRows', 0,
    'providerConflictRows', 0,
    'providerOpenConflictRows', 0
  );
$$;

comment on function public.get_security_master_health_snapshot() is
  'Returns a JSON Security Master coverage snapshot for Admin/Data Sources monitoring.';
