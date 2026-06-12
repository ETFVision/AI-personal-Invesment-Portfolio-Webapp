# ETFVision Security Master Audit

Last updated: 2026-06-13 00:22:00 +08:00

Status: Phase A audit and architecture design completed. Phase 1 additive foundation has been implemented in the repo and is pending Supabase migration application. Migration 092 repairs partially applied migration 091 states where canonical securities were inserted before instruments and identifiers were linked. No portfolio, look-through, recommendation, telemetry, or Market Vision calculations have been switched to security-master logic yet.

## Revised Phase A Prompt

Audit and design ETFVision's security master system without implementing it yet.

Goal:

- Create a clean architecture for mapping user-selectable instruments, direct portfolio holdings, ETF holdings, aliases, identifiers, provider symbols, and look-through exposures to canonical securities.
- Prepare ETFVision for reliable ETF holdings, overlap analysis, concentration analysis, corporate action handling, and future multi-provider data.

Scope for Phase A:

- Inspect current repo and current Supabase state where useful.
- Document current tables, models, code paths, and calculation risks.
- Define target concepts and target schema.
- Recommend additive migrations and implementation phases.
- Do not rewrite app logic.
- Do not delete existing instruments.
- Do not remove FMP/provider fields.
- Do not implement feature flags.
- Do not switch portfolio calculations to a new security master in this phase.

Phase A output:

- `docs/SECURITY_MASTER_AUDIT.md`
- Current-state mapping table.
- Proposed security-master schema.
- Identifier strategy.
- ETF holdings mapping strategy.
- Calculation impact risk register.
- Corporate action readiness notes.
- Recommended implementation phases.

## Executive Summary

ETFVision currently has a strong `instruments` universe and normalized product taxonomy, but it does not yet have a repo-owned canonical security master. Most instrument-facing app logic uses `instruments.id` and `symbol`. ETF look-through currently stores and aggregates top holdings by raw `holding_symbol`, not by a canonical `security_id`.

This is acceptable for the current alpha universe, but it is the main gap before deeper ETF overlap, direct-plus-indirect concentration, corporate action handling, and multi-provider reconciliation become commercial-grade.

The recommended direction is additive:

1. Create canonical `securities_master`, `security_identifiers`, and `security_aliases` migrations in the repo.
2. Add nullable `security_id`, `isin`, `cusip`, `figi`, and `provider_symbol` columns to `instruments`.
3. Backfill approved ETF/stocks from FMP profile metadata.
4. Add a deterministic security resolver.
5. Map ETF top holdings to canonical securities.
6. Only then switch overlap/concentration calculations from raw symbol to `security_id`.

## Phase 1 Implementation Status

Implemented on 2026-06-13:

| Area | Status | Notes |
|---|---|---|
| Additive schema | Implemented in repo | `supabase/migrations/091_security_master_foundation.sql` creates `securities_master`, `security_identifiers`, and `security_aliases`. |
| Instrument linkage columns | Implemented in repo | Adds nullable `security_id`, normalized `isin`, `cusip`, `figi`, `provider_symbol`, identifier quality, coverage, user-selectable, internal-only, and alpha-enabled columns to `instruments`. |
| Initial backfill | Implemented in migration | Uses stored FMP metadata where available and falls back to exchange + symbol matching. |
| Link repair | Implemented in repo | `supabase/migrations/092_repair_security_master_links.sql` safely links active instruments to already-created securities and populates missing identifiers/aliases. |
| Metadata identifier sync | Implemented in repo | `supabase/migrations/093_sync_security_master_identifiers.sql` lets future metadata refreshes promote ISIN/CUSIP/FIGI into security-master tables. |
| ETF holding mapping | Implemented in repo | `supabase/migrations/094_security_master_etf_holding_mapping.sql` adds canonical security mapping columns to ETF top holdings, portfolio look-through holdings, and top-holding exposures. |
| Internal ETF underlying backfill | Implemented in repo | `supabase/migrations/095_backfill_internal_etf_underlying_securities.sql` creates non-user-selectable securities for unmapped ETF top holdings and reruns the mapper. |
| Resolver service | Implemented | `src/application/services/securityMaster/SecurityMasterService.ts` resolves by FIGI, ISIN, CUSIP, SEDOL, exchange + symbol, provider symbol, alias, then low-confidence name fallback. |
| Resolver tests | Implemented | Covers ISIN priority, exchange-symbol matching, BRK.B provider variants, FB to META alias, GOOG/GOOGL non-merge, unmapped symbols, and ambiguous names. |
| Calculation dual-run QA | Implemented in repo | `supabase/migrations/096_security_master_dual_run_qa.sql` adds a persistent QA report table and runner for raw-symbol versus canonical security-ID portfolio look-through grouping. |
| Calculation switch | Started | Portfolio look-through top-holding aggregation now prefers canonical security IDs when available, with raw-symbol fallback preserved. Broader engines still need follow-up QA before switching additional calculations. |
| Issuer master | Implemented in repo | `supabase/migrations/097_issuer_master_foundation.sql` adds issuer entities and links securities to issuers for share-class/company-level exposure rollups. |

Post-deployment checks after running migrations 091, 092, 093, 094, 095, and 096:

```sql
select count(*) as active_instruments_without_security_id
from instruments
where is_active = true and security_id is null;

select coverage_status, count(*)
from instruments
where is_active = true
group by coverage_status
order by count(*) desc;

select identifier_type, count(*)
from security_identifiers
group by identifier_type
order by identifier_type;

select count(*) as securities_master_count
from securities_master;

select mapping_status, count(*)
from etf_top_holdings
group by mapping_status
order by count(*) desc;

select mapping_status, count(*)
from portfolio_lookthrough_holdings
group by mapping_status
order by count(*) desc;

select is_internal_only, is_user_selectable, count(*)
from securities_master
group by is_internal_only, is_user_selectable
order by is_internal_only, is_user_selectable;
```

## Live Evidence Snapshot

Live Supabase/FMP checks performed on 2026-06-12:

| Check | Result |
|---|---:|
| Active instruments | 306 |
| Active stocks | 105 |
| Active ETFs | 196 |
| Active crypto ETFs | 5 |
| FMP `/stable/profile` returned ISIN/CUSIP in live probe | Yes |
| Full active-universe FMP probe profile + ISIN success | 301 / 306 |
| Remaining 5 full-run misses | FMP `429 Limit Reach`, not missing ISIN responses |
| Single retry for `XLV` | ISIN returned successfully |
| Active instruments with nested stored `provider_metadata.financial_modeling_prep.isin` | 201 |
| Active instruments with nested stored `provider_metadata.financial_modeling_prep.cusip` | 201 |
| ETF sector exposure rows | 220 |
| ETF country exposure rows | 396 |
| ETF top holding rows | 240 |
| Portfolio look-through holding rows | 52 |

Important interpretation:

- FMP appears able to supply ISIN/CUSIP for the active universe.
- ISIN/CUSIP are currently preserved inside nested raw provider metadata when FMP metadata has been refreshed.
- ISIN/CUSIP are not currently promoted into first-class normalized columns.
- The repo does not currently define `securities_master`, `security_identifiers`, `security_aliases`, or `etf_holdings` migrations. Live API checks returned schema-cache misses for these table names, so they should be treated as not implemented in the repo/runtime contract.

## Core Concepts

### Instrument

A user-selectable or tradable product in ETFVision.

Examples:

- `VOO`
- `QQQ`
- `AGG`
- `AAPL`
- `MSFT`

Current source of truth: `instruments`.

### Security

A canonical underlying entity used for identity, holdings, overlap, and exposure calculations.

Examples:

- Apple Inc.
- Microsoft Corp.
- Nvidia Corp.
- Vanguard S&P 500 ETF.
- iShares Core U.S. Aggregate Bond ETF.

Target source of truth: proposed `securities_master`.

### Holding

A portfolio or ETF position in an instrument/security.

Examples:

- User holds 20 shares of `VOO`.
- `VOO` holds Apple at a given provider snapshot weight.
- `QQQ` holds Apple at a given provider snapshot weight.

The user-selectable instrument universe and the internal ETF holdings security universe are not the same:

- User universe: approved ETFs and approved directly selectable stocks.
- Internal security universe: all underlying ETF holdings, potentially thousands of securities that are not user-selectable.

## Current State Table Audit

| Table | Purpose | Key symbol/identifier fields | User-selectable or internal | Source-of-truth or derived | Current mapping risk |
|---|---|---|---|---|---|
| `instruments` | Canonical user-selectable universe. | `symbol`, `name`, `exchange`, `provider_primary`, nested `provider_metadata.financial_modeling_prep.isin/cusip`. No `security_id`, `isin`, `cusip`, `figi` columns. | User-selectable. | Source of truth for approved instruments. | Uses symbol as business identity. Identifier data is nested raw JSON, not normalized. |
| `assets` | Portfolio asset records used by holdings/transactions. | `ticker`, `symbol`, `provider_ids`, `metadata`. | User portfolio assets. | Source of truth for user asset rows. | Separate from `instruments`; no canonical `security_id`. |
| `holdings` | Current portfolio holdings. | `asset_id`, `ticker`, `asset_name`. | User holdings. | Source of truth for current positions. | Links to `assets`, not canonical security. Symbol variants can split exposure. |
| `transactions` | Manual transaction ledger. | `asset_id`, `ticker`, `external_id`. | User transactions. | Source of truth for activity/cost basis. | No canonical security identity for ticker changes or provider aliases. |
| `instrument_prices` | Raw historical/latest instrument prices. | `instrument_id`, `symbol`. | Instrument price layer. | Source of truth for market prices. | Uses `instrument_id` and symbol; no security identity. |
| `instrument_daily_returns` | Precomputed returns from prices. | `instrument_id`. | Instrument analytics. | Derived. | Safe for current instrument analytics; not security-master aware. |
| `instrument_return_anchors` | Latest/baseline price anchors. | `instrument_id`. | Instrument analytics. | Derived. | Safe for current instrument analytics; not security-master aware. |
| `instrument_market_metrics` | Page-facing price/return metrics. | `instrument_id`, `symbol`. | Instrument analytics. | Derived. | Safe for display; not identity resolver. |
| `instrument_risk_metrics` | Per-instrument risk metrics. | `instrument_id`, `symbol`. | Instrument analytics. | Derived. | Safe for display; not identity resolver. |
| `etf_sector_exposures` | ETF sector look-through allocation. | `etf_instrument_id`, `etf_symbol`, `sector`. | Internal ETF exposure. | Provider-cached/derived. | Sector rows do not require security master, but should carry provider lineage. |
| `etf_country_exposures` | ETF country look-through allocation. | `etf_instrument_id`, `etf_symbol`, `country`. | Internal ETF exposure. | Provider-cached/derived. | Country rows do not require security master, but should carry provider lineage. |
| `etf_top_holdings` | Provider top holdings inside ETFs. | `etf_instrument_id`, `etf_symbol`, `holding_symbol`, `holding_name`. | Internal ETF holdings. | Provider-cached. | High: no `holding_security_id`; raw symbol is the unique key. |
| `portfolio_lookthrough_exposures` | Portfolio sector/country/currency/theme/top-holding output. | `exposure_name`. | Portfolio analytics output. | Derived. | Allocation views are acceptable; top-holding exposure should move to `security_id` after security master exists. |
| `portfolio_lookthrough_holdings` | Direct plus indirect stock-level exposure. | `holding_symbol`, `holding_name`, `source_etfs`. | Portfolio analytics output. | Derived. | High: direct + indirect aggregation uses raw symbol, not canonical security. |
| `instrument_recommendations` | Latest deterministic insight classifications. | `instrument_id`, `symbol`. | Instrument analytics. | Derived output. | Acceptable for instrument-level insights; future security identity can improve history across ticker changes. |
| `recommendation_history` | Historical recommendation labels/scores. | `instrument_id`, `symbol`. | Instrument analytics. | Derived history. | Ticker changes could fragment history without security identity. |
| `telemetry_recommendation_snapshots` | Recommendation telemetry observations. | `instrument_id`, `symbol`, `benchmark_symbol`. | Telemetry. | Immutable observational snapshots. | Ticker changes or alias drift could fragment long-term telemetry. |
| `telemetry_portfolio_review_snapshots` | Portfolio review telemetry. | JSON snapshots including look-through data. | Telemetry. | Immutable observational snapshots. | Inherits current look-through symbol-based mapping risk. |
| `bond_profiles`, `benchmark_profiles`, `crypto_profiles` | Type-specific profile rows. | `instrument_id`, `symbol`/`instrument_symbol`, provider metadata. | Instrument profiles. | Source/fallback profile data. | Should eventually link through `security_id` for robust identity. |

## Proposed Security Master Schema

### `securities_master`

Canonical security record.

Recommended fields:

- `id uuid primary key`
- `canonical_symbol text`
- `canonical_name text not null`
- `security_type text not null`
- `asset_category text`
- `sector text`
- `industry text`
- `country text`
- `currency text`
- `primary_exchange text`
- `isin text`
- `figi text`
- `cusip text`
- `sedol text`
- `lei text`
- `is_active boolean not null default true`
- `source_priority text[]`
- `identifier_quality_score numeric`
- `notes text`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended `security_type` values:

- `STOCK`
- `ETF`
- `BOND`
- `FUND`
- `CASH`
- `CRYPTO`
- `INTERNAL_SECURITY`
- `UNKNOWN`

Recommended constraints:

- Unique active `isin` where not null.
- Unique active `figi` where not null.
- Do not make ticker globally unique.
- Index `(primary_exchange, canonical_symbol)`.

### `security_identifiers`

All identifiers and aliases for each security.

Recommended fields:

- `id uuid primary key`
- `security_id uuid references securities_master(id)`
- `identifier_type text not null`
- `identifier_value text not null`
- `source text not null`
- `is_primary boolean not null default false`
- `valid_from date`
- `valid_to date`
- `confidence_score numeric`
- `first_seen_at timestamptz`
- `last_seen_at timestamptz`
- `provider_raw_json jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended `identifier_type` values:

- `SYMBOL`
- `PROVIDER_SYMBOL`
- `EXCHANGE_SYMBOL`
- `ISIN`
- `FIGI`
- `CUSIP`
- `SEDOL`
- `LEI`
- `NAME_ALIAS`
- `OLD_TICKER`
- `PROVIDER_ID`

Recommended constraints:

- Unique `(identifier_type, identifier_value, source, valid_to is null)` where practical.
- Index `(identifier_type, identifier_value)`.
- Index `(security_id)`.

### Additive changes to `instruments`

Do not replace the existing table. Add nullable fields:

- `security_id uuid references securities_master(id)`
- `isin text`
- `cusip text`
- `figi text`
- `provider_symbol text`
- `identifier_quality_score numeric`
- `identifier_last_refreshed_at timestamptz`
- `coverage_status text`
- `is_user_selectable boolean not null default true`
- `is_internal_only boolean not null default false`
- `is_alpha_enabled boolean`

### `security_aliases`

Explicit alias/ticker-change table.

Recommended fields:

- `id uuid primary key`
- `security_id uuid references securities_master(id)`
- `old_symbol text`
- `new_symbol text`
- `alias_type text`
- `reason text`
- `effective_date date`
- `valid_from date`
- `valid_to date`
- `source text`
- `notes text`
- `created_at timestamptz`
- `updated_at timestamptz`

Examples:

- `BRK.B`, `BRK-B`, `BRK/B` as symbol-format variants.
- `FB` to `META` as ticker-change alias.
- `GOOG` and `GOOGL` should remain separate unless an explicit share-class rule intentionally links them.

### Additive changes to ETF holdings

Current `etf_top_holdings` should either be evolved or mirrored into a new `etf_holdings` table.

Recommended fields:

- `id uuid primary key`
- `etf_instrument_id uuid references instruments(id)`
- `etf_security_id uuid references securities_master(id)`
- `holding_security_id uuid references securities_master(id)`
- `raw_holding_symbol text`
- `raw_holding_name text`
- `raw_identifier text`
- `raw_identifier_type text`
- `snapshot_date date`
- `weight numeric`
- `shares numeric`
- `market_value numeric`
- `source text`
- `provider_raw_json jsonb`
- `mapping_status text`
- `mapping_confidence numeric`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended `mapping_status` values:

- `MAPPED`
- `AMBIGUOUS`
- `UNMAPPED`
- `MANUAL_REVIEW`
- `IGNORED_CASH_OR_DERIVATIVE`

## Identifier Strategy

Recommended matching priority:

1. FIGI.
2. ISIN.
3. CUSIP or SEDOL.
4. Exchange + symbol.
5. Provider symbol.
6. Name fallback.

Rules:

- Do not rely on ticker alone.
- Preserve raw provider values even when normalized identifiers are created.
- Return mapping status and confidence for every resolution.
- Never silently merge ambiguous candidates.
- Treat `BRK.B` / `BRK-B` / `BRK/B` as configurable symbol-format variants.
- Do not automatically merge `GOOG` and `GOOGL`.
- Do not automatically merge ADRs with local shares unless strong identifiers and explicit rules support it.

## Proposed Security Resolver

Recommended service location:

- `src/application/services/securityMaster/SecurityMasterService.ts`

Recommended functions:

- `resolveSecurity(input)`
- `resolveByFigi(figi)`
- `resolveByIsin(isin)`
- `resolveByCusip(cusip)`
- `resolveByExchangeSymbol(exchange, symbol)`
- `resolveByProviderSymbol(provider, providerSymbol)`
- `resolveByNameFallback(name)`
- `createSecurityIfMissing(input)`
- `linkIdentifier(securityId, identifier)`
- `markMappingAmbiguous(input, candidates)`
- `normalizeTickerSymbol(symbol)`

Return shape should include:

- `securityId`
- `mappingStatus`
- `mappingConfidence`
- `matchedBy`
- `candidates`
- `warnings`

## ETF Holdings Mapping Rules

When ingesting ETF holdings:

1. Preserve raw holding row.
2. Attempt identifier-based match to `security_id`.
3. If matched, store `holding_security_id`.
4. If unmatched, create placeholder security or mark `UNMAPPED`, depending on product decision.
5. Do not drop unmapped holdings silently.
6. Aggregate overlap/concentration by `security_id`.
7. Do not aggregate by raw name alone unless marked low confidence.
8. Classify cash, futures, swaps, collateral, derivatives, and temporary cash-like rows separately.

Mapping output should include:

- mapped count
- unmapped count
- ambiguous count
- ignored cash/derivative count
- total holdings count
- mapped weight
- unmapped weight

## Calculation Impact Risk Register

| Area | Current behavior | Risk | Severity | Recommended action |
|---|---|---|---|---|
| ETF top holdings | `etf_top_holdings` keyed by `holding_symbol`. | Symbol variants can split identical underlying securities. | High | Add `holding_security_id` and map via resolver. |
| Portfolio look-through holdings | Aggregates by `holding_symbol`. | Direct stock plus ETF holding may not aggregate if provider symbol differs. | High | Rebuild with `security_id` once mapped ETF holdings exist. |
| Concentration review | Uses look-through holding rows when available. | Inherits symbol-based duplicates. | High | Switch combined exposure to `security_id`. |
| Portfolio review suggestions | Use look-through and recommendation context. | Candidate explanations can be affected by unmapped/duplicated indirect holdings. | Medium | Add mapping coverage as data limitation. |
| Risk analytics | Mostly instrument/portfolio snapshot based. | Less affected by security master, but sector/concentration panels inherit exposure context. | Medium | Use security-master-backed look-through once available. |
| Recommendations/Insights | Instrument-level by `instrument_id`. | Ticker changes can fragment history and telemetry. | Medium | Add `security_id` to recommendation snapshots/history later. |
| Telemetry | Stores `instrument_id` and symbol snapshots. | Long-horizon outcomes may fragment across ticker changes. | Medium | Add optional `security_id` to future snapshots. |
| Universe/Watchlist | Uses `instruments` taxonomy. | Safe for product listing; missing normalized identifier columns. | Low/Medium | Add normalized identifier columns for display/admin readiness. |

## Corporate Actions Readiness

Current system can preserve provider metadata and maintain active/inactive instruments, but it is not yet corporate-action ready.

Future support should include:

- Ticker changes.
- ETF name changes.
- Mergers.
- Spin-offs.
- Share-class changes.
- ETF closures.
- ISIN changes.
- Provider symbol changes.

Recommended future fields:

- `valid_from`
- `valid_to`
- `corporate_action_type`
- `predecessor_security_id`
- `successor_security_id`
- `action_effective_date`
- `source`
- `source_document_url`

## Tests To Add In Implementation Phases

Identifier matching:

- Resolve by FIGI.
- Resolve by ISIN.
- Resolve by CUSIP.
- Resolve by exchange + symbol.
- Resolve by provider symbol.
- Unknown symbol returns `UNMAPPED`.

Alias handling:

- `BRK.B`, `BRK-B`, and `BRK/B` resolve to same security when alias configured.
- `FB` resolves to `META` when alias configured.
- `GOOG` and `GOOGL` are not incorrectly merged without explicit rule.

ETF holdings:

- `VOO` holding `AAPL` maps to Apple security.
- `QQQ` holding `AAPL` maps to same Apple security.
- Direct Apple holding and indirect Apple exposure aggregate correctly.
- Unmapped holding is reported, not dropped.
- Duplicate raw holdings aggregate by `security_id`.

Overlap/concentration:

- Same security across two ETFs is aggregated.
- Ticker variant does not create duplicate exposure.
- Missing identifiers lower mapping confidence.

## Recommended Implementation Phases

### Phase 1 - Additive Security Master Foundation

- Add repo-owned migration for `securities_master`, `security_identifiers`, and `security_aliases`.
- Add nullable `security_id`, `isin`, `cusip`, `figi`, `provider_symbol`, `identifier_quality_score`, and `identifier_last_refreshed_at` to `instruments`.
- Backfill approved active instruments from FMP profile metadata.
- Seed explicit aliases for `BRK.B` variants and `FB` to `META`.
- Add resolver service and unit tests.
- Do not change portfolio calculations yet.

### Phase 2 - ETF Holdings Mapping

- Add or evolve holdings table with `holding_security_id`.
- Preserve raw provider holding rows.
- Map ETF top holdings through the resolver.
- Store mapped/unmapped/ambiguous diagnostics.
- Add Admin/Data Sources mapping coverage card.

### Phase 3 - Calculation Dual Run

- Recalculate portfolio look-through holdings by both raw symbol and security ID.
- Compare output deltas.
- Add QA report for overlap/concentration differences.
- Switch concentration and top indirect holdings only after differences are understood.

Implementation status:

- `security_master_dual_run_reports` stores portfolio-level comparison reports.
- `run_security_master_dual_run_qa(p_portfolio_id uuid default null)` refreshes ETF holding mappings, compares the latest `portfolio_lookthrough_holdings` snapshot by raw symbol and by `holding_security_id`, stores the report, and returns the latest QA rows.
- The report tracks source rows, raw symbol group count, canonical security group count, mapped/unmapped/ambiguous rows, total weight delta, merged group count, QA status, and a JSON top-holding summary.
- `pass` means the current symbol grouping and security-ID grouping have matching total weights and no unmapped/ambiguous rows.
- `warning` means security-ID grouping changes grouping shape, usually because aliases or duplicate raw symbols merge into one canonical security. This is not automatically a bug, but it must be reviewed before switching production calculations.
- `failed` means at least one latest look-through row is unmapped/ambiguous or total weights do not reconcile.

Recommended Supabase QA:

```sql
select * from public.run_security_master_dual_run_qa();

select
  portfolio_id,
  as_of_date,
  qa_status,
  source_row_count,
  symbol_group_count,
  security_group_count,
  mapped_row_count,
  unmapped_row_count,
  ambiguous_row_count,
  total_weight_delta,
  merged_group_count,
  created_at
from security_master_dual_run_reports
order by created_at desc
limit 10;
```

Production switch criteria:

- Latest reports for active portfolios are `pass` or reviewed `warning`.
- `unmapped_row_count = 0`.
- `ambiguous_row_count = 0`.
- `total_weight_delta` is effectively zero.
- Any `merged_group_count > 0` is explained by expected alias/security consolidation.
- Portfolio Review concentration, top indirect holdings, assistant context, and recommendation portfolio-fit output are manually checked against the dual-run summary.

### Phase 4 - Switch Core Exposure Calculations

The original security-master audit separated calculation switch from later corporate-action and multi-provider hardening. The practical order is:

- Phase 4A: switch top-holding and indirect-holding calculations from raw symbols to canonical `security_id`.
- Phase 4B: add an issuer master so share classes and economically equivalent issuer exposure can be grouped above the security level.
- Phase 4C: use issuer-level grouping for concentration, hidden overlap, assistant context, and portfolio-fit explanations where appropriate.
- Later phases: add recommendation/telemetry/history hardening, corporate actions, multi-provider reconciliation, and admin monitoring.

### Phase 4A - Initial Security-ID Calculation Switch

Implemented:

- `PortfolioLookthroughExposureService` now aggregates direct and ETF-indirect top-holding exposure by `security_id` when available.
- Raw provider holding symbols are preserved in `inputsSnapshot.rawSymbols`.
- Stored `portfolio_lookthrough_holdings` now carries `holding_security_id`, mapping status, and mapping confidence where available.
- Stored `portfolio_lookthrough_exposures` top-holding rows now carry `exposure_security_id`.
- The user-facing output remains compatible with the existing UI: display still uses `holding_symbol` / `exposure_name`.
- The test suite now verifies that direct `MSFT` and ETF-provider `MSFT US` aggregate into the same top-holding exposure when they share the same security ID.

Still not switched:

- Sector, country, currency, and theme exposure remain allocation/group labels rather than security-master entities.
- Recommendation scoring, assistant response generation, telemetry snapshots, and Market Vision continue to consume the same portfolio exposure shape, but now benefit from the canonical top-holding rows once Portfolio Review refreshes.
- Corporate actions and multi-provider conflict resolution remain future Phase 4B/4C work.

Post-deployment QA:

1. Refresh Portfolio Review after deploying this change.
2. Run `select * from public.run_security_master_dual_run_qa();`.
3. Confirm the latest report remains `pass`.
4. Check Portfolio Review top holdings and indirect holdings for expected direct-plus-ETF aggregation.
5. Spot-check assistant/recommendation portfolio-fit wording for concentration questions.

### Phase 4B - Issuer Master Foundation

Implemented:

- `issuers` stores canonical issuer/company/fund entities.
- `security_issuer_links` maps each active security to an issuer.
- `normalize_issuer_name(input_name text)` strips share-class and ADR/common-stock suffix noise for deterministic grouping.
- `sync_security_issuer_links()` backfills issuers and active security-to-issuer links from `securities_master`.
- Manual high-confidence share-class seed logic marks `GOOG`, `GOOGL`, `BRK.A`, and `BRK.B` as explicit share-class cases where those securities exist.
- The issuer layer does not merge securities. It links separate securities to a common issuer for concentration and exposure rollups.

Phase 4B hardening:

- `issuer_aliases` stores approved issuer-name variants, common names, and share-class name variants.
- `sync_security_issuer_links()` is alias-aware. It checks approved aliases before creating or linking to a normalized issuer name.
- Seeded aliases cover known high-value variants including `Alphabet` -> `Alphabet Inc`, Berkshire share classes, `TSMC`, `Meta Platforms`, `JPMorgan Chase`, `Novo Nordisk`, and `Samsung Electronics`.
- `issuer_duplicate_candidates` stores potential issuer duplicates for manual review. It is a QA queue, not an automatic merge mechanism.
- `issuer_base_name(input_name text)` strips legal suffixes only for duplicate-candidate detection. It is intentionally not used as the primary automatic linker.
- `clean_issuer_display_name(input_name text)` removes share-class/security suffixes from `issuers.issuer_name` only. Share-class detail remains on `security_issuer_links.share_class` and the underlying security record.
- A trigger cleans issuer display names on future issuer inserts/updates, so rows such as `Alphabet Inc Class C` display as `Alphabet Inc`.

Recommended Supabase QA:

```sql
select * from public.sync_security_issuer_links();
select * from public.refresh_issuer_duplicate_candidates();

select
  count(*) as active_securities,
  count(link.security_id) as linked_securities,
  count(*) filter (where link.security_id is null) as unlinked_securities
from securities_master sm
left join security_issuer_links link
  on link.security_id = sm.id
  and link.valid_to is null
where sm.is_active = true;

select
  issuer.issuer_name,
  issuer.issuer_type,
  count(*) as securities,
  array_agg(master.canonical_symbol order by master.canonical_symbol) as symbols
from issuers issuer
join security_issuer_links link on link.issuer_id = issuer.id and link.valid_to is null
join securities_master master on master.id = link.security_id
where issuer.is_active = true
group by issuer.id, issuer.issuer_name, issuer.issuer_type
having count(*) > 1
order by securities desc, issuer.issuer_name
limit 25;

select
  master.canonical_symbol,
  master.canonical_name
from securities_master master
left join security_issuer_links link
  on link.security_id = master.id
  and link.valid_to is null
where master.is_active = true
  and link.security_id is null
order by master.canonical_symbol;

select
  issuer.issuer_name,
  array_agg(master.canonical_symbol order by master.canonical_symbol) as symbols,
  array_agg(link.link_source order by master.canonical_symbol) as link_sources
from issuers issuer
join security_issuer_links link on link.issuer_id = issuer.id and link.valid_to is null
join securities_master master on master.id = link.security_id
where master.canonical_symbol in ('GOOG', 'GOOGL')
group by issuer.id, issuer.issuer_name;

select
  candidate.review_status,
  count(*) as candidates
from issuer_duplicate_candidates candidate
group by candidate.review_status
order by candidate.review_status;

select
  issuer_name_a,
  issuer_name_b,
  detection_method,
  confidence_score,
  review_status
from issuer_duplicate_candidates
where review_status = 'needs_review'
order by confidence_score desc, updated_at desc
limit 25;
```

Expected healthy result:

- `unlinked_securities = 0`.
- Multi-security issuers are explainable share-class or listing cases, such as Alphabet if both `GOOG` and `GOOGL` are present.
- `GOOG` and `GOOGL` should return under one issuer row after the alias-aware sync runs.
- The issuer display name for Alphabet should be clean, for example `Alphabet Inc`, while individual securities still preserve Class A/Class C detail.
- Duplicate candidates are allowed if they are genuinely uncertain, but they should be reviewed and converted into approved `issuer_aliases` only after confirmation.
- Issuer links preserve security-level detail and do not replace `securities_master`.

Not switched yet:

- Recommendation snapshots/history, telemetry recommendation snapshots, and Market Vision historical inputs do not yet persist `issuer_id`.
- Corporate actions and multi-provider conflict handling are still later phases.

Next step after QA:

### Phase 4C / 4D - Issuer-Level Rollups With Security Drill-Down

Implemented:

- `portfolio_lookthrough_holdings` now has optional `holding_issuer_id` and `holding_issuer_name`.
- `portfolio_lookthrough_exposures` now has optional `exposure_issuer_id` and `exposure_issuer_name`.
- Portfolio look-through calculation groups direct stock plus ETF underlying exposure by issuer when a valid issuer link exists.
- Direct ETF/fund wrappers remain separate direct securities, not issuer-grouped company exposure.
- Each issuer-grouped look-through row stores `inputsSnapshot.securityBreakdown` with security-level details:
  - raw symbol
  - security ID
  - issuer ID/name
  - share class
  - issuer link source
  - direct weight
  - indirect weight
  - source ETF contribution
- Portfolio Review concentration uses issuer IDs first, then falls back to legacy issuer-name normalization for older reports.
- Portfolio Assistant context now includes issuer-level indirect holdings and security breakdown details.
- Recommendation portfolio-fit scoring uses issuer-level look-through exposure when available before falling back to direct ticker exposure.

Supabase QA after applying migration `100` and refreshing Portfolio Review:

```sql
select
  holding_issuer_name,
  holding_issuer_id,
  holding_symbol,
  holding_name,
  direct_weight,
  indirect_weight,
  total_weight,
  inputs_snapshot->'rawSymbols' as raw_symbols,
  inputs_snapshot->'securityBreakdown' as security_breakdown
from portfolio_lookthrough_holdings
where holding_issuer_name = 'Alphabet Inc'
order by as_of_date desc
limit 5;

select
  exposure_name,
  exposure_issuer_name,
  exposure_weight,
  direct_weight,
  etf_lookthrough_weight
from portfolio_lookthrough_exposures
where exposure_type = 'top_holding'
  and exposure_issuer_name = 'Alphabet Inc'
order by as_of_date desc
limit 5;
```

Expected healthy result:

- Issuer-level rows show clean issuer names such as `Alphabet Inc`.
- `rawSymbols` and `securityBreakdown` preserve share-class/security details such as `GOOG` and `GOOGL`.
- Direct ETF wrappers remain visible under direct positions and are not mixed into top underlying company exposure.
- Portfolio-fit duplicate exposure can flag existing issuer exposure even when direct ticker exposure is zero.

Next step after Phase 4C/4D QA:

- Add optional `issuer_id` and `security_id` to recommendation snapshots/history, telemetry recommendation snapshots, and portfolio review snapshots where relevant.
- Preserve historical symbol-at-time-of-snapshot while using stable IDs to avoid future ticker/share-class fragmentation.
- Add lifecycle tables for ticker changes, mergers, spin-offs, share-class changes, ETF name changes, ETF closures, and predecessor/successor securities.

## Phase A Conclusion

The current app is safe enough for current instrument-level analytics and alpha-style ETFVision use, but it is not yet a true security-master architecture. The biggest commercial-grade gap is symbol-based ETF holdings and look-through aggregation. The next implementation task should be Phase 1: add the additive security-master schema and backfill active instruments from FMP ISIN/CUSIP metadata, without switching calculations yet.
