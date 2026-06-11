# Documentation Gaps and Follow-Up Audit List

Last updated: 2026-06-11 20:50:00 +08:00

This document records areas where the handover pack intentionally avoids guessing. These should be verified before commercialization or before a new developer changes related logic.

## High Priority

1. RLS policy audit
   - Verify every user-specific table is scoped correctly.
   - Check assistant conversations, recommendation history, telemetry, portfolio review, and summary tables.

2. Alpha branch feature gate audit
   - Validate on `alpha` branch, not only `development`.
   - Confirm Admin/Data Sources and internal diagnostics are not exposed if not intended for alpha.

## Medium Priority

1. Market Vision publish/draft lifecycle
   - Verify whether scheduled jobs should publish or create drafts.
   - Follow up in `MarketVisionGenerationService.ts`.

2. Assistant table/cost schema
   - Confirm exact assistant tables and cost formulas.
   - Follow up in assistant migrations and `SupabaseAssistantRepository.ts`.

3. News classification formula and thresholds
   - Summarize deterministic rules, confidence scoring, source quality weighting, and review queue conditions.

4. Active universe verification
   - Confirm live Supabase active count equals intended 201 ETFs and 105 stocks, with raw crypto inactive.

5. Score methodology maintenance
   - Formula-level score documentation now exists in `docs/SCORE_METHODOLOGY.md`.
   - Future scoring changes must update that document in the same commit.

6. Page data map documentation
   - Create a canonical `docs/PAGE_DATA_MAP.md`.
   - For each product route, document UI section, server component/action, service, repository, table/view, refresh job dependency, formula reference, cache/summary table, and known performance notes.
   - Minimum routes to cover: `/portfolio`, `/holdings`, `/transactions`, `/cash`, `/instruments/universe`, `/instruments/watchlist`, `/instruments/[symbol]`, `/market-vision`, `/news`, `/macro`, `/fundamentals`, `/risk`, `/bonds`, `/recommendations`, `/portfolio-review`, `/telemetry`, `/assistant`, and Admin pages.

7. Portfolio dashboard page map
   - Map each `/portfolio`, `/holdings`, `/transactions`, and `/cash` section to source services and summary tables.
   - Document which cards use `portfolio_dashboard_summary`, `portfolio_performance_summary`, `portfolio_current_metrics`, `holding_market_metrics`, cash balances, transactions, and live portfolio dashboard services.
   - Clarify the dependency chain between holdings, cash, transactions, portfolio valuation, snapshots, and summary refresh jobs.

8. Universe and watchlist page map
   - Document exact grouping/filter logic by asset category, instrument type, ETF product category, stock sector, and active status.
   - Document row-level freshness derivation for price, market metrics, risk metrics, metadata, fundamentals, and watchlist membership.
   - Map page fields to `instruments`, `instrument_market_metrics`, `instrument_risk_metrics`, fundamentals overview/detail views, and watchlist tables.

9. Market Vision UI and lifecycle map
   - Document each Market Vision page section, including report body, structured metadata, macro inputs, world-news inputs, portfolio implications, and generation logs.
   - Confirm and document scheduled generation status behavior: draft versus published.
   - Document source/citation display rules and which stored report fields drive UI rendering.

10. News and themes page map
   - Expand deterministic classification documentation with threshold details, source-quality effects, review queue conditions, and manual/fallback behavior.
   - Document NewsData query group display, FMP/general article display, GDELT manual role, article URL linking, weekly reconciliation placement, and theme summary data sources.
   - Clarify that NewsData is the preferred scheduled macro/world-news source and GDELT is manual/fallback due to rate-limit instability.

11. Macro page map and integration lineage
   - Document macro dashboard UI sections and their source tables.
   - Expand the indicator-to-theme mapping table for FRED macro signals.
   - Document how macro regimes/signals flow into Market Vision, Insights, Portfolio Review, Risk, Fixed Income, Theme Intelligence, and Assistant context.

12. Fundamentals page map
   - Document which fields appear on the fundamentals overview versus each instrument detail fundamentals tab.
   - Map UI fields to `company_profiles`, `financial_statements`, `financial_ratios`, `fundamental_scores`, `fundamental_trends`, and `fundamental_trend_summaries`.
   - Mark sector-relative scoring and financial-sector-specific scoring as future hardening unless implemented later.

13. Risk page map
   - Map each `/risk` panel to risk analytics service outputs, stored risk metrics, portfolio snapshots, holding snapshots, benchmark snapshots, and look-through exposure tables.
   - Tie covariance/proxy risk contribution eligibility to the UI panels that show risk contributors.
   - Document benchmark comparison display logic separately from portfolio TWR risk logic.

14. Fixed income page map
   - Add a fixed-income coverage table showing seeded fallback bond profiles versus provider/manual profile rows.
   - Document bond profile refresh/source quality and manual override behavior.
   - Clearly mark older `bond-intelligence.md` future design items that are not yet built, such as future bond score tables or advanced bond macro snapshots.

15. Insights page map
   - Document public language mapping from internal recommendation records to consumer-facing Insights, Assessments, and Characteristics.
   - Map all Insights page and instrument detail recommendation/insight panels to recommendation service outputs, telemetry snapshots, and stored history.
   - Clarify how recommendation history and telemetry relate to current insight labels.

16. Portfolio Review page map
   - Expand candidate suggestion ranking and explanation rules, especially diversification, healthcare/defensive, fixed-income, and inflation/geopolitical hedge candidates.
   - Map each Portfolio Review section to the underlying service, score formula, portfolio exposure source, and refresh dependency.
   - Document the difference between diversification candidates, defensive/healthcare candidates, fixed-income candidates, and issue-specific portfolio actions.

## Low Priority

1. Provider endpoint inventory
   - FMP fundamentals endpoint lineage is documented in `docs/DATA_INGESTION_AND_PROVIDERS.md`.
   - Remaining provider endpoint details to complete: FMP market/news, FRED, NewsData, GDELT, OpenAI.

2. Render timing baseline
   - Maintain a benchmark table for each key route after major performance work.

3. Job schedule drift check
   - Compare `docs/scheduled-jobs.md`, latest schedule migration, and live Supabase `cron.job` table after manual schedule edits.

4. Old docs cleanup
   - Older lowercase docs remain useful, but some overlap with this handover pack.
   - Do not delete until the user approves an archive/cleanup pass.

## Recently Closed Documentation Gaps

Closed on 2026-06-11 20:34:49 +08:00:

- Exact portfolio TWR and cash-flow methodology documented in `docs/CALCULATION_METHODOLOGY.md`.
- ETF exposure table and column map documented in `docs/DATABASE_SCHEMA.md`.
- FMP fundamentals endpoint-to-field lineage documented in `docs/DATA_INGESTION_AND_PROVIDERS.md`.
- Risk analytics page methodology documented in `docs/SCORE_METHODOLOGY.md`.
- Fixed income page methodology and bond profile schema documented in `docs/SCORE_METHODOLOGY.md` and `docs/DATABASE_SCHEMA.md`.
