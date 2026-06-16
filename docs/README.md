# ETFVision Documentation Index

Last updated: 2026-06-15 20:15:00 +08:00

This folder contains both current handover documents and older historical audits. The uppercase documents below are the current authoritative handover pack as of the timestamp above.

## Handover Status Snapshot

The handover pack is current for the major architecture and audit work completed through 2026-06-13:

| Area | Current status | Primary docs | Notes for next developer |
|---|---|---|---|
| Core app architecture | Current | `ARCHITECTURE_OVERVIEW.md`, `DATABASE_SCHEMA.md` | Includes current branch model, summary-table direction, Security Master identity layers, and refresh-job dependency model. |
| Instrument taxonomy | Completed for current universe | `INSTRUMENT_TAXONOMY_AND_COVERAGE.md`, `INSTRUMENT_TAXONOMY_AUDIT.md`, `COMMERCIALIZATION_AUDIT_PLAN.md` | Current live target is 306 active user-selectable instruments: 201 ETF-style products and 105 stocks. Raw crypto references remain inactive. |
| Data normalization | Completed for current checkpoint | `DATA_NORMALIZATION_AUDIT.md`, `DATABASE_SCHEMA.md`, `DATA_INGESTION_AND_PROVIDERS.md` | ETF product taxonomy is separate from portfolio exposure. Portfolio sector allocation must use look-through exposure where available. |
| Security Master | Completed for current commercialization checkpoint | `SECURITY_MASTER_AUDIT.md`, `ARCHITECTURE_OVERVIEW.md`, `DATABASE_SCHEMA.md`, `PORTFOLIO_REVIEW_METHODOLOGY.md` | Canonical security, identifier, issuer, issuer-alias, ETF-holding mapping, dual-run QA, issuer-level look-through rollups, Phase 5 identity propagation, Phase 8 monitoring, and Phase 6/7 readiness layers are documented. |
| Price, return, market metric, and risk metric refresh | Current | `DATA_INGESTION_AND_PROVIDERS.md`, `JOBS_AND_OPERATIONS.md`, `PERFORMANCE_ARCHITECTURE.md`, `scheduled-jobs.md` | Daily refresh is split into price, daily returns, anchors, market metrics, risk metrics, and metadata jobs to avoid long request timeouts. |
| Portfolio dashboard and page rendering performance | Partly completed | `PERFORMANCE_ARCHITECTURE.md`, `PAGE_RENDERING_AUDIT.md`, `ARCHITECTURE_OVERVIEW.md` | Portfolio performance/holdings/cash summaries are optimized. Universe/watchlist summary-table experiment was reverted; future phases remain documented. |
| Portfolio Review | Current for current UI | `PORTFOLIO_REVIEW_METHODOLOGY.md`, `SECURITY_MASTER_AUDIT.md`, `qa-log.md` | Uses issuer-level company exposure where available, preserves direct ETF wrappers, and stores security-level drill-down for audit. |
| Recommendation / Insights | Mostly current | `RECOMMENDATION_INSIGHTS_METHODOLOGY.md`, `SCORE_METHODOLOGY.md`, `recommendation-language-audit.md` | Deterministic engine. Public labels use Characteristics Score assessments. Portfolio fit can use issuer-level exposure. Recommendation, recommendation history, and telemetry recommendation snapshots now persist stable `security_id` / `issuer_id` where available. |
| Public methodology and compliance surfaces | Current product implementation; legal review still required | `ARCHITECTURE_OVERVIEW.md`, `SCORE_METHODOLOGY.md`, `COMMERCIALIZATION_AUDIT_PLAN.md`, `qa-log.md` | First-login disclaimer acknowledgement, sticky footer disclaimer, full disclaimer modal, export/report disclaimer helper, public `/methodology`, and `/legal/disclosures` placeholder are implemented. |
| Assistant | Mostly current | `ASSISTANT_ARCHITECTURE.md`, `SECURITY_MASTER_AUDIT.md` | Assistant context can explain issuer-level hidden overlap after Portfolio Review refresh. Cost tracking and exact table inventory still need final schema audit. |
| Market Vision, News, Macro, Fundamentals, Risk, Fixed Income, Telemetry | Methodology documented; some UI/data-map gaps remain | `MARKET_VISION_METHODOLOGY.md`, `MARKET_VISION_REGRESSION_FIX.md`, `NEWS_THEME_METHODOLOGY.md`, `SCORE_METHODOLOGY.md`, `TELEMETRY_ARCHITECTURE.md`, `DOCUMENTATION_GAPS.md` | Market Vision scheduled portfolio context regression is fixed. Route-by-route field lineage is still a follow-up documentation task. |
| Scheduled refresh automation | Current, but should be checked against live Supabase cron after edits | `scheduled-jobs.md`, `JOBS_AND_OPERATIONS.md`, `DATA_INGESTION_AND_PROVIDERS.md` | Supabase cron replaced GitHub Actions for production refreshes. Keep schedule docs aligned with migrations and live `cron.job`. |
| Feature gates and alpha branch | Partly completed | `feature-gated-production-architecture-audit.md`, `COMMERCIALIZATION_AUDIT_PLAN.md`, `SECURITY_AND_ACCESS_ARCHITECTURE.md` | Alpha is intended to expose a smaller consumer surface. Future merges from main/development into alpha should preserve feature flags. |
| Commercialization readiness | In progress | `COMMERCIALIZATION_AUDIT_PLAN.md`, `DOCUMENTATION_GAPS.md`, focused audit docs | Commercialization audit is the master checklist. Completed audits should be marked there, not only in implementation notes. |

If a future implementation changes calculations, refresh order, feature gates, Security Master behavior, AI prompts, recommendation labels, or portfolio exposure logic, update the relevant handover doc and append QA evidence to `qa-log.md` in the same change.

## Audit Coverage Index

This is the quick map of notable audits completed or started so far. `qa-log.md` is the validation evidence trail; the documents listed here are the current handover summaries built from that trail.

| Audit / QA stream | Status in handover pack | Current summary docs | QA evidence |
|---|---|---|---|
| Phase 2 / core MVP foundation | Historical baseline captured | `ARCHITECTURE_OVERVIEW.md`, `CALCULATION_METHODOLOGY.md` | `qa-log.md` Phase 2 Core MVP QA Backfill |
| FMP market data integration | Historical baseline captured; current refresh architecture updated later | `DATA_INGESTION_AND_PROVIDERS.md`, `JOBS_AND_OPERATIONS.md` | `qa-log.md` FMP Market Data Integration QA Backfill |
| Portfolio analytics / TWR / benchmark returns | Current methodology documented | `CALCULATION_METHODOLOGY.md`, `SCORE_METHODOLOGY.md` | `qa-log.md` Portfolio Analytics Layer QA, Portfolio And Benchmark Return QA |
| Instrument universe and watchlist | Current taxonomy documented; route-level field map still pending | `INSTRUMENT_TAXONOMY_AND_COVERAGE.md`, `INSTRUMENT_TAXONOMY_AUDIT.md` | `qa-log.md` Instrument Universe And Watchlist QA, Instrument Taxonomy Commercialization Audit Completion |
| Taxonomy and data normalization | Completed for current checkpoint | `DATA_NORMALIZATION_AUDIT.md`, `DATABASE_SCHEMA.md`, `COMMERCIALIZATION_AUDIT_PLAN.md` | `qa-log.md` Taxonomy QA Backfill, Data Normalization Commercialization Audit Completion |
| Risk analytics | Current formula methodology documented; route-level lineage pending | `SCORE_METHODOLOGY.md`, `CALCULATION_METHODOLOGY.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Risk Analytics Layer QA, Exposure Context Consistency QA |
| Fixed income / bond intelligence | Current methodology documented; profile coverage map pending | `SCORE_METHODOLOGY.md`, `DATABASE_SCHEMA.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Bond Intelligence Foundation, Enrichment, and Layer QA |
| Market Vision | Methodology documented; scheduled context regression fixed; publish/draft lifecycle remains a product-policy question | `MARKET_VISION_METHODOLOGY.md`, `MARKET_VISION_REGRESSION_FIX.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Market Vision Skeleton QA, Market Vision Follow-Up Backlog Checkpoint, Market Vision Portfolio Context Regression Fix |
| News and themes | Methodology documented; threshold/page map follow-up pending | `NEWS_THEME_METHODOLOGY.md`, `DATA_INGESTION_AND_PROVIDERS.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` News Intelligence Layer Comprehensive QA |
| Fundamentals layer | Score/trend methodology documented; page-field map pending | `SCORE_METHODOLOGY.md`, `DATABASE_SCHEMA.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Documentation Methodology Follow-Up entries |
| Recommendation / Insights | Mostly completed | `RECOMMENDATION_INSIGHTS_METHODOLOGY.md`, `recommendation-language-audit.md`, `SCORE_METHODOLOGY.md` | `qa-log.md` Recommendation Language Refinement QA, Exposure Context Consistency QA, Security Master Phase 5 identity propagation |
| Compliance disclaimer and public methodology | Partly completed pending formal legal review | `ARCHITECTURE_OVERVIEW.md`, `SCORE_METHODOLOGY.md`, `COMMERCIALIZATION_AUDIT_PLAN.md` | `qa-log.md` Compliance Disclaimer And Public Methodology Updates |
| Portfolio Assistant | Mostly completed; cost/table schema audit pending | `ASSISTANT_ARCHITECTURE.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Recommendation Language Refinement QA and Security Master hidden-overlap entries |
| Telemetry | Architecture documented; recommendation snapshot identity propagated | `TELEMETRY_ARCHITECTURE.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Telemetry Layer, Telemetry UX Hardening QA, and Security Master Phase 5 identity entries |
| Page rendering performance | Partly completed; phased roadmap remains | `PAGE_RENDERING_AUDIT.md`, `PERFORMANCE_ARCHITECTURE.md` | `qa-log.md` Page Rendering Performance Audit And Summary Read-Model QA |
| Scheduled jobs / data refresh | Current, verify against live cron after changes | `scheduled-jobs.md`, `JOBS_AND_OPERATIONS.md`, `DATA_INGESTION_AND_PROVIDERS.md` | `qa-log.md` schedule and performance architecture entries |
| Security Master / issuer rollups | Completed for current commercialization checkpoint | `SECURITY_MASTER_AUDIT.md`, `DATABASE_SCHEMA.md`, `ARCHITECTURE_OVERVIEW.md`, `PORTFOLIO_REVIEW_METHODOLOGY.md` | `qa-log.md` Security Master Phase A through Phase 8/6/7 closeout entries |
| ETF holdings / look-through | Partly completed due provider top-holding limits; current portfolio rollups work where data exists | `SECURITY_MASTER_AUDIT.md`, `PORTFOLIO_REVIEW_METHODOLOGY.md`, `COMMERCIALIZATION_AUDIT_PLAN.md` | `qa-log.md` ETF holding mapping and Portfolio Review look-through entries |
| Portfolio Review engine | Current, with future candidate-ranking hardening noted | `PORTFOLIO_REVIEW_METHODOLOGY.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` Portfolio Review and Security Master Phase 4C/4D entries |
| Feature gates / alpha branch | Partly completed; alpha branch should remain flag-aligned with main | `feature-gated-production-architecture-audit.md`, `COMMERCIALIZATION_AUDIT_PLAN.md` | `qa-log.md` Page Rendering QA notes on alpha realignment |
| Security/access/RLS | Not fully audited | `SECURITY_AND_ACCESS_ARCHITECTURE.md`, `DOCUMENTATION_GAPS.md` | `qa-log.md` only has scattered RLS fixes; full RLS audit remains open |

## Current Handover Pack

- [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Data Ingestion and Providers](DATA_INGESTION_AND_PROVIDERS.md)
- [Instrument Taxonomy and Coverage](INSTRUMENT_TAXONOMY_AND_COVERAGE.md)
- [Instrument Taxonomy Audit](INSTRUMENT_TAXONOMY_AUDIT.md)
- [Data Normalization Audit](DATA_NORMALIZATION_AUDIT.md)
- [Security Master Audit](SECURITY_MASTER_AUDIT.md)
- [Calculation Methodology](CALCULATION_METHODOLOGY.md)
- [Score Methodology](SCORE_METHODOLOGY.md)
- [Portfolio Review Methodology](PORTFOLIO_REVIEW_METHODOLOGY.md)
- [Recommendation Insights Methodology](RECOMMENDATION_INSIGHTS_METHODOLOGY.md)
- [Recommendation Language Audit](recommendation-language-audit.md)
- [News and Theme Methodology](NEWS_THEME_METHODOLOGY.md)
- [Market Vision Methodology](MARKET_VISION_METHODOLOGY.md)
- [Market Vision Regression Fix](MARKET_VISION_REGRESSION_FIX.md)
- [Assistant Architecture](ASSISTANT_ARCHITECTURE.md)
- [Telemetry Architecture](TELEMETRY_ARCHITECTURE.md)
- [Jobs and Operations](JOBS_AND_OPERATIONS.md)
- [Performance Architecture](PERFORMANCE_ARCHITECTURE.md)
- [Security and Access Architecture](SECURITY_AND_ACCESS_ARCHITECTURE.md)
- [Commercialization Audit Plan](COMMERCIALIZATION_AUDIT_PLAN.md)
- [Documentation Gaps](DOCUMENTATION_GAPS.md)

## Important Supporting Docs

- [Scheduled Jobs](scheduled-jobs.md)
- [Page Rendering Audit](PAGE_RENDERING_AUDIT.md)
- [QA Log](qa-log.md)
- [Instrument Taxonomy Alpha Universe](instrument-taxonomy-alpha-universe.md)
- [Feature-Gated Production Architecture Audit](feature-gated-production-architecture-audit.md)
- [Recommendation Language Audit](recommendation-language-audit.md)
- [Deep Architecture Audit 2026-06-16](ARCHITECTURE_AUDIT_2026-06-16.md) — independent 20-domain review with live read-only database verification (§1A).

## Maintenance Rule

When major architecture changes are made, update the relevant uppercase handover doc and append validation evidence to `qa-log.md` or a focused audit doc. Avoid creating duplicate architecture docs with similar names unless there is a clear phase-specific reason.
