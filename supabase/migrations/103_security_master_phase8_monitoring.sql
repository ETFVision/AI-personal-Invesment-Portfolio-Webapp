-- Security Master Phase 8.
-- Admin QA / monitoring layer. Additive only: exposes coverage diagnostics and
-- an exportable gap report without changing calculations.

create or replace view security_master_mapping_gap_report as
select
  'instrument_missing_security_id'::text as gap_type,
  'high'::text as severity,
  'instrument'::text as entity_type,
  instrument.id as entity_id,
  instrument.symbol as symbol,
  instrument.name as name,
  jsonb_build_object(
    'instrumentType', instrument.instrument_type,
    'assetCategory', instrument.asset_category,
    'isUserSelectable', coalesce(instrument.is_user_selectable, true),
    'isInternalOnly', coalesce(instrument.is_internal_only, false)
  ) as details,
  instrument.updated_at as detected_at
from instruments instrument
where instrument.is_active = true
  and instrument.security_id is null

union all

select
  'instrument_missing_primary_identifier'::text,
  case when instrument.instrument_type = 'crypto_etf' then 'low' else 'medium' end,
  'instrument',
  instrument.id,
  instrument.symbol,
  instrument.name,
  jsonb_build_object(
    'instrumentType', instrument.instrument_type,
    'identifierQualityScore', instrument.identifier_quality_score,
    'coverageStatus', instrument.coverage_status
  ),
  coalesce(instrument.identifier_last_refreshed_at, instrument.updated_at)
from instruments instrument
where instrument.is_active = true
  and coalesce(instrument.is_user_selectable, true) = true
  and instrument.security_id is not null
  and nullif(coalesce(instrument.isin, instrument.cusip, instrument.figi), '') is null

union all

select
  'instrument_stale_identifier_refresh'::text,
  'medium'::text,
  'instrument',
  instrument.id,
  instrument.symbol,
  instrument.name,
  jsonb_build_object(
    'lastRefreshedAt', instrument.identifier_last_refreshed_at,
    'coverageStatus', instrument.coverage_status
  ),
  coalesce(instrument.identifier_last_refreshed_at, instrument.updated_at)
from instruments instrument
where instrument.is_active = true
  and coalesce(instrument.is_user_selectable, true) = true
  and (
    instrument.identifier_last_refreshed_at is null
    or instrument.identifier_last_refreshed_at < now() - interval '30 days'
  )

union all

select
  'etf_holding_unmapped'::text,
  case when holding.mapping_status = 'ambiguous' then 'high' else 'medium' end,
  'etf_holding',
  holding.id,
  holding.holding_symbol,
  holding.holding_name,
  jsonb_build_object(
    'etfSymbol', holding.etf_symbol,
    'asOfDate', holding.as_of_date,
    'mappingStatus', holding.mapping_status,
    'mappingConfidence', holding.mapping_confidence_score,
    'mappingSource', holding.mapping_source
  ),
  coalesce(holding.mapping_updated_at, holding.created_at)
from etf_top_holdings holding
where holding.holding_security_id is null
   or coalesce(holding.mapping_status, 'unmapped') <> 'mapped'

union all

select
  'issuer_duplicate_candidate'::text,
  case when candidate.confidence_score >= 85 then 'high' else 'medium' end,
  'issuer',
  candidate.id,
  null,
  concat(candidate.issuer_name_a, ' / ', candidate.issuer_name_b),
  jsonb_build_object(
    'issuerIdA', candidate.issuer_id_a,
    'issuerIdB', candidate.issuer_id_b,
    'detectionMethod', candidate.detection_method,
    'confidenceScore', candidate.confidence_score,
    'reviewStatus', candidate.review_status
  ),
  candidate.updated_at
from issuer_duplicate_candidates candidate
where candidate.review_status in ('needs_review', 'pending');

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
    'corporateActionRows', (select coalesce(to_regclass('public.security_corporate_actions') is not null, false)),
    'providerConflictRows', (select coalesce(to_regclass('public.security_identifier_conflicts') is not null, false))
  );
$$;

comment on view security_master_mapping_gap_report is
  'Exportable Security Master gap report for Admin QA. It lists missing security IDs, missing identifiers, stale identifier refreshes, unmapped ETF holdings and issuer duplicate candidates.';

comment on function public.get_security_master_health_snapshot() is
  'Returns a JSON Security Master coverage snapshot for Admin/Data Sources monitoring.';
