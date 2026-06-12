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
| Resolver service | Implemented | `src/application/services/securityMaster/SecurityMasterService.ts` resolves by FIGI, ISIN, CUSIP, SEDOL, exchange + symbol, provider symbol, alias, then low-confidence name fallback. |
| Resolver tests | Implemented | Covers ISIN priority, exchange-symbol matching, BRK.B provider variants, FB to META alias, GOOG/GOOGL non-merge, unmapped symbols, and ambiguous names. |
| Calculation switch | Not started | Current app calculations remain instrument/symbol based until Phase 2/3 dual-run QA. |

Post-deployment checks after running migrations 091, 092, 093, and 094:

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

### Phase 4 - Corporate Actions And Multi-Provider

- Add corporate action lineage fields.
- Add FIGI or other provider enrichment if needed.
- Add multi-provider reconciliation and source priority logic.
- Add formal duplicate/ambiguous security review workflow.

## Phase A Conclusion

The current app is safe enough for current instrument-level analytics and alpha-style ETFVision use, but it is not yet a true security-master architecture. The biggest commercial-grade gap is symbol-based ETF holdings and look-through aggregation. The next implementation task should be Phase 1: add the additive security-master schema and backfill active instruments from FMP ISIN/CUSIP metadata, without switching calculations yet.
