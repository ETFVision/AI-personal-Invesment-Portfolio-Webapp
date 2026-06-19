# Data Normalization Audit

Last updated: 2026-06-12 23:45:00 +08:00

## Audit Result

Status: completed for the current commercialization checkpoint.

The application has a functioning separation between raw provider data and ETFVision-normalized taxonomy fields. Active instruments have populated normalized fields required for current product use. The audit also added a code-level cleanup for noisy taxonomy review statuses by accepting generic provider labels that are already safely normalized.

## Scope

This audit verifies:

- Raw provider data is preserved.
- ETFVision normalized fields are populated.
- Provider categories are not the product taxonomy source of truth.
- Manual ETFVision taxonomy overrides are respected.
- Portfolio sector allocation avoids ETF product category and prefers look-through exposure.
- Unknown mappings and review-queue conditions are surfaced.

Primary files checked:

- `src/application/services/taxonomy/TaxonomyService.ts`
- `src/application/services/MetadataRefreshService.ts`
- `src/application/services/AssetMetadataService.ts`
- `src/application/services/UniverseManagementService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolio/PortfolioExposureContextService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/portfolioFitService.ts`
- `supabase/migrations/015_canonical_taxonomy.sql`
- `supabase/migrations/062_instrument_product_taxonomy.sql`
- `supabase/migrations/085_fundamentals_overview_metrics.sql`

## Normalization Architecture

ETFVision separates provider metadata from normalized fields.

| Layer | Stored fields / source | Purpose |
|---|---|---|
| Raw provider metadata | `provider_metadata`, `provider_primary`, `sector`, `industry`, profile payloads | Preserve provider lineage and original metadata. |
| Product taxonomy | `instrument_type`, `asset_category`, `etf_category`, `asset_class` | Instrument listing, grouping, type handling and product classification. |
| Canonical analytics taxonomy | `canonical_sector`, `canonical_themes`, `taxonomy_review_status`, `taxonomy_is_manual_override` | Stable analytics, recommendations, themes and review workflow. |
| ETF look-through exposure | `etf_sector_exposures`, `etf_country_exposures`, `etf_top_holdings`, portfolio look-through rows | Portfolio exposure analytics; should override broad ETF product category when available. |

## Provider Data Preservation

Provider data is preserved through:

- `instruments.provider_metadata`
- `instruments.provider_primary`
- `assets.raw_provider_payload` / asset metadata repository payloads where applicable
- ETF exposure `provider_metadata`
- Fundamentals `provider_metadata`

Live Supabase evidence on active instruments:

| Check | Result |
|---|---:|
| Active instruments checked | 306 |
| Active instruments with non-empty `provider_metadata` | 306 |
| Active instruments with `provider_primary = financial_modeling_prep` | 306 |

## Normalized Field Coverage

Live Supabase verification on active instruments:

| Check | Result |
|---|---:|
| Active instruments | 306 |
| Missing `asset_category` | 0 |
| Active ETF-style products missing `etf_category` | 0 |
| Missing `canonical_sector` | 0 |
| Missing `canonical_themes` | 0 |
| Missing `taxonomy_review_status` | 0 |
| Manual override rows | 0 |

Taxonomy review status:

| `taxonomy_review_status` | Count |
|---|---:|
| `mapped` | 211 |
| `needs_review` | 95 |

## Review Queue Finding And Cleanup

The `needs_review` queue currently contains 95 active instruments:

| Type | Count |
|---|---:|
| `etf` | 71 |
| `crypto_etf` | 5 |
| `stock` | 19 |

Top raw sectors in the review queue:

| Raw sector | Count |
|---|---:|
| ETF | 31 |
| Multi-sector ETF | 19 |
| Fixed Income | 13 |
| Financial Services | 6 |
| Consumer Cyclical | 6 |
| Digital Assets | 5 |
| Commodities | 3 |

Top raw industries in the review queue:

| Raw industry | Count |
|---|---:|
| ETF | 58 |
| Bond ETF | 7 |
| Crypto ETF | 5 |
| Sector ETF | 5 |
| Restaurants | 2 |
| Telecommunications Services | 2 |
| Chemicals - Specialty | 2 |

Interpretation of the live database state before recalculation:

- This is not a normalized-field coverage failure.
- Every active instrument has a populated `canonical_sector`, `canonical_themes`, `asset_category`, and required ETF product category where applicable.
- The review queue was noisy because generic values like `ETF`, `Multi-sector ETF`, `Bond ETF`, `Sector ETF`, `Digital Assets`, `Consumer Cyclical`, `Financial Services`, and `Basic Materials` can be mapped correctly but still counted as unmapped raw values by the prior review-status heuristic.

Implemented cleanup:

- `TaxonomyService` now treats generic provider labels and current ETF category slugs as accepted aliases when normalized outputs are otherwise safe.
- A taxonomy regression test now verifies provider labels and alpha ETF category slugs do not create noisy unmapped review items.
- Keep true review status for genuinely unmapped provider values, unknown sectors, and conflicted mappings.

Operational note:

- The live Supabase counts above are the pre-cleanup database snapshot.
- After deployment, run Seed Universe or Instrument Metadata Refresh to recalculate `taxonomy_review_status` for active instruments.
- Re-check with:

```sql
select taxonomy_review_status, count(*)
from instruments
where is_active = true
group by taxonomy_review_status
order by taxonomy_review_status;
```

## Manual Override Preservation

Manual taxonomy overrides are respected in the normalization pipeline:

- `UniverseManagementService.ensureSeededUniverse` preserves existing `taxonomy_is_manual_override`, `canonical_sector`, and `canonical_themes`.
- `MetadataRefreshService.refreshUniverseMetadata` preserves canonical fields when `taxonomy_is_manual_override` is true.
- Taxonomy admin actions write manual overrides through `/setup/taxonomy`.

Live evidence:

- Current active manual override count: 0.
- The preservation path exists and should be retained even if no active override currently exists.

## Provider Category Usage Review

Current intended usage:

- Provider `sector` / `industry` may be preserved as raw/display metadata.
- `canonical_sector` should drive normalized stock sector grouping and analytics.
- `asset_category` and `etf_category` should drive Universe/Watchlist product grouping.
- Portfolio sector allocation should use ETF look-through exposure when available and direct metadata only as fallback.

Key implementation evidence:

- `TaxonomyService` derives canonical sector/themes **curated-authoritatively** (2026-06-19): for instruments in the alpha universe, ETF sector resolves from `ALPHA_ETF_CATEGORIES` (via an explicit `EtfCategory → canonical_sector` map) and stock sector from `ALPHA_STOCK_SECTORS`, taking precedence over provider sector/industry; provider sector/industry is used only as fallback for instruments outside the curated maps. Themes are an independent, additive layer (not derived from sector, not blanket-applied — `Global Diversification` only for genuinely global/ex-US categories), and sector is never inferred from a theme. See `docs/instrument-taxonomy-alpha-universe.md` → "Canonical Sector And Theme Derivation".
- `MetadataRefreshService` stores raw provider payload while calculating canonical fields, and exposes a CRON-protected, override-respecting, idempotent taxonomy backfill (`backfillCanonicalTaxonomy`, via `/api/jobs/instrument-metadata-refresh?taxonomyBackfill=true`) that re-normalizes active rows without refetching provider metadata.
- `UniverseManagementService` seeds ETFVision-owned `asset_category` and `etf_category`.
- `PortfolioExposureContextService` prefers look-through sector rows over direct metadata fallback.
- `PortfolioLookthroughExposureService` uses ETF sector exposure where available and records diagnostics when fallback is needed.
- Recommendation portfolio fit and macro alignment read `canonicalSector ?? sector`, giving preference to normalized taxonomy.

Known caution:

- Some older or generic services may still display `sector` as raw metadata. That is acceptable for display, but calculations and portfolio exposure should prefer `canonical_sector` or look-through exposure.

## Checklist Result

| Check | Result | Evidence |
|---|---|---|
| FMP raw fields preserved | PASS | `provider_metadata` populated for 306 active instruments. |
| Normalized fields populated | PASS | 0 missing active `asset_category`, `canonical_sector`, `canonical_themes`; 0 missing ETF `etf_category`. |
| Provider categories not used directly in core portfolio exposure calculations | PASS WITH WATCH ITEM | Portfolio exposure context prefers ETF look-through rows; direct metadata is fallback. Continue checking older services during page-map audit. |
| Unknown mappings detected | PASS | `taxonomy_review_status` exists and flagged 95 active instruments before the alias cleanup. |
| Review queue quality | PASS WITH RECALC NEEDED | Code-level alias cleanup is implemented; deploy and re-run seed/metadata refresh to update stored statuses. |
| Manual ETFVision taxonomy overrides provider category | PASS | Code preserves manual overrides during seeding and metadata refresh. Current active override count is 0. |
| ETF product taxonomy separate from portfolio sector allocation | PASS | `etf_category` is product classification; portfolio exposure services prefer look-through exposure. |

## Remaining Follow-Ups

These are not blockers to completing the Data Normalization Audit, but should be handled before broader commercial launch:

1. Deploy the alias cleanup and run Seed Universe or Instrument Metadata Refresh to recalculate stored taxonomy review statuses.
2. Create a provider mapping gap report that lists only truly unmapped or conflicted raw values.
3. During the Page Data Map documentation pass, verify every route uses `canonical_sector`, `asset_category`, `etf_category`, or look-through exposure intentionally.
4. During the Data Provider Audit, decide whether to add a physical `coverage_status` field or continue using freshness/provider diagnostics.
5. During the Feature Flags/Product Modes Audit, decide whether to add `is_user_selectable` separate from `is_active`.

## Conclusion

The Data Normalization Audit is complete for the current commercialization checkpoint.

The app preserves provider data, stores ETFVision-owned product taxonomy, maintains normalized canonical sectors/themes, respects manual override paths, and separates ETF product category from portfolio exposure analytics. The main remediation item has been implemented in code; the remaining step is operational recalculation of stored taxonomy statuses after deployment.
