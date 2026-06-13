# ETFVision Architecture Overview

Last updated: 2026-06-13

Authoritative status: current handover snapshot for future developers. This document supersedes older overlapping architecture notes where the contents conflict, while older audit logs remain useful as historical context.

## Purpose

ETFVision is a Next.js web application for portfolio tracking, instrument research, macro/news intelligence, deterministic recommendation insights, portfolio review, telemetry, and a portfolio assistant. The app is designed around stored Supabase data and scheduled refresh jobs so interactive pages can read precomputed metrics instead of recalculating expensive analytics on every request.

## Runtime Stack

- Frontend and server rendering: Next.js 15 App Router, React 19.
- Language: TypeScript.
- Styling: Tailwind CSS and shared React components.
- Database: Supabase Postgres with RLS, service-role server operations, cron, vault secrets, and `pg_net` HTTP calls.
- Auth: Supabase auth helpers through `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`.
- AI providers: OpenAI-backed Market Vision, news classification/reconciliation, and portfolio assistant providers.
- External data providers: FMP, FRED, NewsData.io, GDELT, OpenAI.

## Layering

The codebase follows a mostly clean architecture layout:

| Layer | Main location | Role |
|---|---|---|
| App routes | `src/app` | Pages, API routes, route-level composition. |
| Server actions | `src/server/actions` | Form actions and UI-triggered mutations/jobs. |
| Container | `src/server/container.ts` | Dependency assembly for repositories, providers, services, and jobs. |
| Application services | `src/application/services` | Business logic, scoring, classification, metrics, dashboards. |
| Application jobs | `src/application/jobs` | Job orchestration for scheduled/manual refreshes. |
| Ports | `src/application/ports` | Repository/provider contracts. |
| Infrastructure | `src/infrastructure` | Supabase repositories, provider adapters, observability helpers. |
| Domain types | `src/domain` | Shared domain model types. |
| Database | `supabase/migrations` | Schema, functions, indexes, cron schedule. |
| Docs | `docs` | Product, architecture, QA, schedule, audit, and handover notes. |

## Main User Areas

- Dashboard: `/portfolio`
- Portfolio: `/holdings`, `/transactions`, `/cash`
- Instruments: `/instruments/universe`, `/instruments/watchlist`, `/instruments/[symbol]`
- Research: `/market-vision`, `/news`, `/macro`, `/risk`, `/bonds`, `/fundamentals`, `/recommendations`, `/portfolio-review`, `/telemetry`, `/assistant`
- Admin: `/admin/data-sources`, `/admin/jobs`, `/admin/assistant-usage`, `/admin/system-health`, `/setup/taxonomy`

## API Job Routes

Protected job endpoints live under `src/app/api/jobs`. They are wrapped by `src/server/jobs/runCronJob.ts`, which handles:

- `CRON_SECRET` authorization.
- Supabase `job_locks` overlap prevention.
- Supabase `job_runs` logging.
- Structured JSON status with `success`, `partial_success`, `failed`, or `skipped`.

Important job routes include instrument prices, daily returns, return anchors, market metrics, risk metrics, metadata, ETF look-through, fundamentals, FRED macro, FMP news, NewsData.io, GDELT, benchmarks, portfolio valuation, summary refresh, Market Vision, recommendations, portfolio review, and telemetry evaluation.

## Security Master And Identity Layers

ETFVision now separates product/instrument identity from underlying security and issuer identity. This is one of the most important handover concepts.

| Layer | Main tables | Purpose | Example |
|---|---|---|---|
| Instrument/product universe | `instruments`, `watchlists`, type-specific profile tables | User-selectable instruments shown in Universe, Watchlist, holdings, and instrument detail pages. | `VOO`, `QQQ`, `MSFT`, `GLD` |
| Canonical security master | `securities_master`, `security_identifiers`, `security_aliases` | Stable security identity for instruments and ETF underlying holdings. Preserves ISIN/CUSIP/provider-symbol aliases and avoids raw ticker fragmentation. | `MSFT`, `MSFT US`, provider aliases resolving to one Microsoft security |
| Issuer/company rollup | `issuers`, `security_issuer_links`, `issuer_aliases`, `issuer_duplicate_candidates` | Company/fund issuer grouping above security level for share-class and issuer-level concentration analysis. | `GOOG` + `GOOGL` grouped under `Alphabet Inc` |
| ETF provider look-through rows | `etf_sector_exposures`, `etf_country_exposures`, `etf_top_holdings`, `etf_theme_exposures` | Cached provider ETF allocation/holdings inputs. Top holdings are mapped to canonical/internal securities where possible. | VOO holding Microsoft/NVIDIA/Apple |
| Portfolio look-through outputs | `portfolio_lookthrough_exposures`, `portfolio_lookthrough_holdings` | Derived direct + indirect portfolio exposure used by Portfolio Review, Risk, Assistant context, and Recommendation portfolio fit. | Microsoft total exposure = direct MSFT + VOO/QQQ/VT indirect exposure |
| Security Master QA | `security_master_mapping_gap_report`, `get_security_master_health_snapshot()` | Admin/Data Sources monitoring for mapping gaps, stale identifiers, recommendation/telemetry identity coverage, corporate-action readiness and provider-conflict readiness. | 306/306 selectable instruments mapped |
| Corporate-action readiness | `security_corporate_actions`, `security_lifecycle_links` | Future lifecycle event and predecessor/successor tracking. | SPYM replacing SPLG, ticker changes, ETF closure records |
| Provider reconciliation readiness | `security_provider_identifier_observations`, `security_identifier_conflicts` | Future multi-provider identifier comparison and review queue. | FMP versus future provider ISIN/CUSIP mismatch |

Current production behavior after Security Master Phase 5:

- `instruments` remains the product universe. Do not replace it with `securities_master` for Universe/Watchlist routing.
- ETF top holdings can create internal non-user-selectable securities. These support look-through analysis but should not appear as normal Universe/Watchlist instruments.
- Portfolio Review top underlying company exposure is issuer-level where issuer links exist, then security-level, then raw-symbol fallback.
- Direct ETF/fund wrappers remain direct product positions and are excluded from underlying company concentration charts.
- Direct stock holdings win display classification. If an ETF indirect row creates an issuer row first, a later direct MSFT/NVDA holding must still display as `Stock`, not `Underlying Security`.
- Recommendation rows, recommendation history rows, and telemetry recommendation snapshots now persist optional `security_id` and `issuer_id` while preserving historical symbols.
- Portfolio Review report snapshots and portfolio review telemetry snapshots carry `security_identity_snapshot` metadata that records the identity basis used by look-through calculations.
- Admin/Data Sources includes a Security Master QA card. The card is diagnostic and does not trigger calculation changes.
- Corporate-action and provider-reconciliation tables are currently additive readiness layers. No automatic lifecycle rewrites or provider conflict resolution occurs yet.
- Raw provider symbols remain stored in snapshots for audit and drill-down.

The focused audit and QA details live in [Security Master Audit](SECURITY_MASTER_AUDIT.md) and [QA Log](qa-log.md).

## Audit To Architecture Traceability

The following audits have architecture-level implications and should be treated as part of the current handover state:

| Audit | Current architecture impact | Authoritative follow-up docs |
|---|---|---|
| Instrument Taxonomy Audit | Defines the active product universe, ETF categories, stock sectors, asset categories, and alpha/full feature visibility. | `INSTRUMENT_TAXONOMY_AND_COVERAGE.md`, `INSTRUMENT_TAXONOMY_AUDIT.md` |
| Data Normalization Audit | Separates provider raw data from ETFVision normalized taxonomy and calculation fields. | `DATA_NORMALIZATION_AUDIT.md`, `DATABASE_SCHEMA.md` |
| Security Master Audit | Adds canonical security, identifier, alias, issuer, issuer-alias, ETF-holding mapping, and issuer-level rollup layers. | `SECURITY_MASTER_AUDIT.md`, `DATABASE_SCHEMA.md` |
| Portfolio Review QA | Confirms look-through exposure, issuer-level hidden overlap, direct position display precedence, and candidate explanation behavior. | `PORTFOLIO_REVIEW_METHODOLOGY.md`, `qa-log.md` |
| Rendering Performance Audit | Establishes summary-table strategy for heavy pages and documents remaining page-summary phases. | `PERFORMANCE_ARCHITECTURE.md`, `PAGE_RENDERING_AUDIT.md` |
| Recommendation / Assistant hardening | Keeps recommendation deterministic and uses assistant as explanatory layer over stored analytics. | `RECOMMENDATION_INSIGHTS_METHODOLOGY.md`, `ASSISTANT_ARCHITECTURE.md` |
| Scheduled Jobs Audit | Moves production refresh orchestration to Supabase cron and splits heavy jobs into smaller dependent stages. | `scheduled-jobs.md`, `JOBS_AND_OPERATIONS.md`, `DATA_INGESTION_AND_PROVIDERS.md` |
| Market Vision / News / Macro QA | Separates scheduled NewsData/FMP/FRED inputs from manual GDELT and documents Market Vision as a narrative layer over stored intelligence. | `MARKET_VISION_METHODOLOGY.md`, `NEWS_THEME_METHODOLOGY.md`, `DATA_INGESTION_AND_PROVIDERS.md` |
| Fundamentals / Risk / Fixed Income QA | Documents deterministic score and metric methodologies for fundamentals, risk, fixed income, and stored derived metrics. | `SCORE_METHODOLOGY.md`, `CALCULATION_METHODOLOGY.md`, `DATABASE_SCHEMA.md` |
| Telemetry Audit | Tracks recommendation/Market Vision/Portfolio Review outcome evaluation architecture. | `TELEMETRY_ARCHITECTURE.md`, `DOCUMENTATION_GAPS.md` |
| Feature Gates / Alpha Audit | Documents alpha versus full-product surface separation and the need to preserve flags when merging. | `feature-gated-production-architecture-audit.md`, `SECURITY_AND_ACCESS_ARCHITECTURE.md` |

When an audit graduates from recommendation to implementation, update both the focused audit doc and the architecture/methodology doc that owns the runtime behavior. Use `docs/qa-log.md` as the evidence source before marking a handover area complete; older QA entries are historical evidence, while the uppercase handover documents describe the current intended architecture.

## Current Performance Architecture

The app has moved from direct heavy page calculations toward stored summary and metric tables:

- `instrument_daily_returns`: daily/weekly returns derived from raw prices.
- `instrument_return_anchors`: latest price, prior close, YTD/1Y/3Y/5Y anchors, 52-week range.
- `instrument_market_metrics`: page-facing instrument metrics.
- `instrument_risk_metrics`: volatility/drawdown/downside risk metrics.
- `holding_market_metrics` and `portfolio_current_metrics`: holding and portfolio derived metrics.
- `portfolio_performance_summary`: cached portfolio performance series and benchmark comparisons.
- `portfolio_dashboard_summary`: cached dashboard/holdings/cash summary payloads.

Render timing instrumentation is in `src/infrastructure/observability/renderTiming.ts` and controlled by `ENABLE_RENDER_TIMING`.

## Branching Model

Current working convention:

- `development`: default branch for testing and future feature work.
- `main`: finalized full product branch.
- `alpha`: consumer-facing limited feature branch with feature-gated surface area.

Alpha should be maintained from main/development with feature gates rather than permanent one-off patchwork.

## Key Design Principles

- Store expensive calculations in Supabase and refresh via scheduled jobs.
- Keep page rendering mostly read-only and summary-table driven where possible.
- Treat AI outputs as narrative/intelligence layers, not raw portfolio calculation sources.
- Keep recommendation logic deterministic; OpenAI is not used to decide recommendation labels.
- Use ETF look-through exposure for portfolio sector/geography exposure, not ETF product category.
- Use security/issuer identity for underlying company concentration when available, not raw ETF provider symbols alone.
- Keep admin diagnostics and refresh buttons out of consumer-facing alpha surfaces unless explicitly enabled.
