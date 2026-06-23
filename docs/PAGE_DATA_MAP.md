# ETFVision Page Data Map

Last updated: 2026-06-17

## How to read this document

This document maps ETFVision product routes to their route files, direct server actions, application services, repository implementations, Supabase tables/views, refresh jobs, cache layers, and known page-rendering notes. It traces the page -> service -> repository chain only. Entries marked `* - inferred from architecture docs` were not fully traceable from direct route inspection without a deeper implementation audit.

## Portfolio Group

### /portfolio - Dashboard

**Alpha mode:** Visible

**UI sections:**
- Portfolio overview: current market value, cash, gains/losses, allocation, and status cards.
- Holdings and allocation summaries: position-level and category-level exposure.
- Performance summary: cached time-weighted return and benchmark context.
- Portfolio review summary: latest stored review summary when available.

**Server component / action:**
- `src/app/(dashboard)/portfolio/page.tsx`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`
- `container.portfolioReviewRepository` -> `SupabasePortfolioReviewRepository`

**Repository / repositories:**
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- `MarketDataRepository` -> `SupabaseMarketDataRepository`
- `PortfolioReviewRepository` -> `SupabasePortfolioReviewRepository`

**Key tables / views:**
- `portfolios` - user portfolio record.
- `holdings` - current holdings used for allocation and valuation.
- `cash_balances` - cash balances included in total portfolio value.
- `transactions` - transaction ledger used by portfolio services.
- `portfolio_dashboard_summary` - cached dashboard-level metrics.
- `portfolio_performance_summary` - cached performance summary.
- `portfolio_review_reports` - latest stored portfolio review summary.

**Refresh job dependency:**
- `app-daily-portfolio-valuation-refresh` -> `/api/jobs/portfolio-valuation-refresh` -> daily.
- `app-daily-portfolio-summary-refresh` -> `/api/jobs/portfolio-summary-refresh` -> daily.
- `app-weekly-portfolio-review-run` -> `/api/jobs/portfolio-review-run` -> weekly.

**Cache / summary table:**
- `portfolio_dashboard_summary`
- `portfolio_performance_summary`

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` identifies this as a historically high-load route; cached dashboard and performance summaries are the retained optimization path.

### /holdings - Holdings

**Alpha mode:** Visible

**UI sections:**
- Holdings table: ticker, quantity, average cost, market value, unrealized gain/loss, and allocation.
- Holding editor: create or update position records.

**Server component / action:**
- `src/app/(dashboard)/holdings/page.tsx`
- `upsertHoldingAction`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`

**Repository / repositories:**
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- `MarketDataRepository` -> `SupabaseMarketDataRepository`

**Key tables / views:**
- `portfolios` - default portfolio lookup.
- `holdings` - editable holding records.
- `assets` - legacy/manual asset reference used by portfolio data.
- `portfolio_dashboard_summary` - cached holding valuation and allocation.

**Refresh job dependency:**
- `app-daily-portfolio-valuation-refresh` -> `/api/jobs/portfolio-valuation-refresh` -> daily.
- `app-daily-portfolio-summary-refresh` -> `/api/jobs/portfolio-summary-refresh` -> daily.
- Manual only for user holding edits through server action.

**Cache / summary table:**
- `portfolio_dashboard_summary`

**Known performance notes:**
- Uses cached dashboard summary to avoid rebuilding the full portfolio dashboard on every holdings render.

### /transactions - Transactions

**Alpha mode:** Visible

**UI sections:**
- Transaction ledger: buy/sell/cash-flow records as stored portfolio events.
- Transaction editor: create, update, and delete ledger rows.

**Server component / action:**
- `src/app/(dashboard)/transactions/page.tsx`
- `upsertTransactionAction`
- `deleteTransactionAction`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`
- Direct repository call through `container.portfolioRepository`

**Repository / repositories:**
- `PortfolioRepository` -> `SupabasePortfolioRepository`

**Key tables / views:**
- `portfolios` - default portfolio lookup.
- `transactions` - transaction ledger rows.

**Refresh job dependency:**
- Manual only - user ledger edits are written through server actions.
- Portfolio summaries refresh daily through `app-daily-portfolio-summary-refresh`.

**Cache / summary table:**
- None - live query for ledger rows.

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` notes the ledger is live-query based and should be paginated if row counts grow materially.

### /cash - Cash

**Alpha mode:** Visible

**UI sections:**
- Cash balance table: currency, amount, and account-level cash entries.
- Cash editor: create, update, and delete cash balance rows.

**Server component / action:**
- `src/app/(dashboard)/cash/page.tsx`
- `upsertCashBalanceAction`
- `deleteCashBalanceAction`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`

**Repository / repositories:**
- `PortfolioRepository` -> `SupabasePortfolioRepository`

**Key tables / views:**
- `portfolios` - default portfolio lookup.
- `cash_balances` - editable cash balance records.
- `portfolio_dashboard_summary` - cached cash-inclusive portfolio totals.

**Refresh job dependency:**
- Manual only - user cash edits are written through server actions.
- `app-daily-portfolio-summary-refresh` -> `/api/jobs/portfolio-summary-refresh` -> daily.

**Cache / summary table:**
- `portfolio_dashboard_summary`

**Known performance notes:**
- Uses cached dashboard summary for portfolio-level context while cash rows remain editable live data.

## Instruments Group

### /instruments/universe - Universe

**Alpha mode:** Visible

**UI sections:**
- Universe filters: query, category, type, activity, and product grouping controls.
- Instrument directory: symbols, names, classifications, freshness, market metrics, risk metrics, and fundamentals summary.

**Server component / action:**
- `src/app/(dashboard)/instruments/universe/page.tsx`

**Application service(s):**
- `container.instrumentService` -> `InstrumentService`
- `container.instrumentMarketService` -> `InstrumentMarketService`
- `container.fundamentalsRepository` -> `SupabaseFundamentalsRepository`

**Repository / repositories:**
- `UniverseRepository` -> `SupabaseUniverseRepository`
- `MarketDataRepository` -> `SupabaseMarketDataRepository`
- `FundamentalsRepository` -> `SupabaseFundamentalsRepository`

**Key tables / views:**
- `instruments` - active and inactive instrument directory.
- `instrument_prices` - latest instrument prices and price freshness.
- `instrument_market_metrics` - return and market-metric layer.
- `instrument_risk_metrics` - instrument-level risk layer.
- `fundamentals_overview_metrics` - fundamentals overview view.

**Refresh job dependency:**
- `app-daily-instrument-price-refresh` -> `/api/jobs/instrument-price-refresh?source=eod` -> daily single end-of-day pass.
- `app-daily-instrument-market-metrics-refresh` -> `/api/jobs/instrument-market-metrics-refresh` -> daily.
- `app-daily-instrument-risk-refresh` -> `/api/jobs/instrument-risk-refresh` -> daily single full-universe pass.
- `app-weekly-fundamentals-refresh` -> `/api/jobs/fundamentals-refresh` -> weekly single bounded-concurrency pass.
- `app-monthly-universe-validation` -> `/api/jobs/universe-validation` -> monthly.

**Cache / summary table:**
- None - live directory query plus precomputed metric tables.

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` notes the earlier directory-summary experiment was reverted; current route should rely on targeted directory and metric queries unless measured otherwise.

### /instruments/watchlist - Watchlist

**Alpha mode:** Visible

**UI sections:**
- Watchlist selector: available watchlists and selected list state.
- Watchlist items: instruments, ordering, classifications, freshness, market metrics, risk metrics, and fundamentals summary.

**Server component / action:**
- `src/app/(dashboard)/instruments/watchlist/page.tsx`

**Application service(s):**
- `container.watchlistService` -> `WatchlistService`
- `container.instrumentService` -> `InstrumentService`
- `container.instrumentMarketService` -> `InstrumentMarketService`
- `container.fundamentalsRepository` -> `SupabaseFundamentalsRepository`

**Repository / repositories:**
- `UniverseRepository` -> `SupabaseUniverseRepository`
- `MarketDataRepository` -> `SupabaseMarketDataRepository`
- `FundamentalsRepository` -> `SupabaseFundamentalsRepository`

**Key tables / views:**
- `watchlists` - named watchlist records.
- `watchlist_items` - instrument membership and ordering.
- `instruments` - instrument metadata for selected items.
- `instrument_market_metrics` - market metrics displayed for selected instruments.
- `instrument_risk_metrics` - risk metrics displayed for selected instruments.
- `fundamentals_overview_metrics` - fundamentals overview view.

**Refresh job dependency:**
- Manual only for watchlist membership.
- Instrument freshness depends on the same instrument, risk, market-metric, and fundamentals jobs used by `/instruments/universe`.

**Cache / summary table:**
- None - live watchlist query plus precomputed metric tables.

**Known performance notes:**
- Watchlist rendering is narrower than the full universe because metric views are built only for selected instruments.

### /instruments/[symbol] - Instrument detail

**Alpha mode:** Visible

**UI sections:**
- Instrument overview: identity, classifications, and metadata.
- Performance and risk panels: price history, market metrics, risk metrics, and benchmark context.
- Market Vision context: stored market context relevant to the instrument.
- Fundamentals, bond, crypto, or benchmark-specific panel depending on instrument type.
- Insight/assessment panel: latest stored characteristics output when present.

**Server component / action:**
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`

**Application service(s):**
- `container.instrumentService` -> `InstrumentService`
- `container.instrumentMarketService` -> `InstrumentMarketService`
- `container.instrumentRiskService` -> `InstrumentRiskService`
- `container.recommendationService` -> `RecommendationService`
- `container.fundamentalsRepository` -> `SupabaseFundamentalsRepository`

**Repository / repositories:**
- `UniverseRepository` -> `SupabaseUniverseRepository`
- `MarketDataRepository` -> `SupabaseMarketDataRepository`
- `FundamentalsRepository` -> `SupabaseFundamentalsRepository`
- `RecommendationRepository` -> `SupabaseRecommendationRepository`

**Key tables / views:**
- `instruments` - instrument identity and classification.
- `instrument_prices` - latest and historical instrument prices.
- `instrument_market_metrics` - return and market metrics.
- `instrument_risk_metrics` - risk metrics.
- `bond_profiles` - bond-specific profile data when applicable.
- `company_profiles`, `financial_statements`, `financial_ratios`, `fundamental_scores`, `fundamental_trends`, `fundamental_trend_summaries` - fundamentals detail data.
- `instrument_recommendations` - latest stored characteristics/insight output.

**Refresh job dependency:**
- Daily instrument price, return-anchor, market-metric, risk, metadata, benchmark, and weekly fundamentals jobs.
- `app-weekly-recommendation-run` -> `/api/jobs/recommendation-run` -> weekly.

**Cache / summary table:**
- None - live instrument query plus precomputed metric and fundamentals tables.

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` identifies instrument detail as potentially heavy; the current route narrows market views to the selected instrument and a one-year lookback.

## Research Group - Market Intelligence

### /market-vision - Market Vision

**Alpha mode:** Visible

**UI sections:**
- Market Vision report list and selected report body.
- Regime, transition, evidence, and portfolio-context sections from stored report data.
- Macro context panel.
- World-news input panel.
- Admin-only draft/publish/archive controls outside alpha.

**Server component / action:**
- `src/app/(dashboard)/market-vision/page.tsx`
- `saveMarketVisionDraftAction`
- `publishMarketVisionReportAction`
- `archiveMarketVisionReportAction`

**Application service(s):**
- `container.marketVisionService` -> `MarketVisionService`
- `container.macroDashboardService` -> `MacroDashboardService`
- `container.macroContextService` -> `MacroContextService`
- `container.newsRepository` -> `SupabaseNewsRepository`

**Repository / repositories:**
- `MarketVisionRepository` -> `SupabaseMarketVisionRepository`
- `MacroIndicatorRepository` -> `SupabaseMacroIndicatorRepository`
- `NewsRepository` -> `SupabaseNewsRepository`

**Key tables / views:**
- `market_vision_reports` - stored reports and structured report metadata.
- `market_vision_generation_logs` - generation audit trail.
- `macro_indicators`, `macro_observations`, `macro_trends`, `macro_regime_snapshots`, `macro_theme_signals` - macro context.
- `news_items`, `news_classifications` - world-news input context.

**Refresh job dependency:**
- `app-weekly-market-vision` -> `/api/jobs/market-vision-run` -> weekly.
- `app-daily-fred-macro-ingestion` -> `/api/jobs/fred-macro-ingestion` -> daily.
- `app-daily-newsdata-ingestion` and `app-daily-fmp-news-ingestion` -> daily news inputs.

**Cache / summary table:**
- `market_vision_reports` acts as the stored report layer.

**Known performance notes:**
- Alpha mode should display published reports; scheduled generation status behavior is documented in jobs and implementation logs.

### /news - News & Themes

**Alpha mode:** Hidden

**UI sections:**
- Theme dashboard: grouped theme intelligence and classification summaries.
- Article dashboard: article list, source/provider filters, duplicate visibility, and classification state.
- Duplicate override controls for manual curation.

**Server component / action:**
- `src/app/(dashboard)/news/page.tsx`
- `duplicateOverrideAction`

**Application service(s):**
- `container.newsDashboardService` -> `NewsDashboardService`

**Repository / repositories:**
- `NewsRepository` -> `SupabaseNewsRepository`

**Key tables / views:**
- `news_items` - stored articles from providers.
- `news_classifications` - deterministic article classification rows.
- `news_groups` - grouped news/theme records.
- `weekly_news_reconciliations` - weekly reconciliation output.
- `news_ingestion_logs` - ingestion audit trail.

**Refresh job dependency:**
- `app-daily-fmp-news-ingestion` -> `/api/jobs/fmp-news-ingestion` -> daily.
- `app-daily-newsdata-ingestion` -> `/api/jobs/newsdata-ingestion` -> daily.
- `app-weekly-news-reconciliation` -> `/api/jobs/news-reconciliation` -> weekly.

**Cache / summary table:**
- None - live query over stored news and classification tables.

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` notes news/theme summary tables may be useful later if article volume grows; current route remains hidden in alpha.

### /macro - Macro

**Alpha mode:** Hidden

**UI sections:**
- Macro indicator dashboard: indicator values, trends, regimes, and theme signals.
- Macro ingestion status and latest observation context.

**Server component / action:**
- `src/app/(dashboard)/macro/page.tsx`

**Application service(s):**
- `container.macroDashboardService` -> `MacroDashboardService`

**Repository / repositories:**
- `MacroIndicatorRepository` -> `SupabaseMacroIndicatorRepository`

**Key tables / views:**
- `macro_indicators` - configured macro series.
- `macro_observations` - stored observations by date.
- `macro_trends` - latest trend classifications.
- `macro_regime_snapshots` - regime snapshot layer.
- `macro_theme_signals` - theme signal outputs.
- `macro_ingestion_logs` - ingestion audit trail.

**Refresh job dependency:**
- `app-daily-fred-macro-ingestion` -> `/api/jobs/fred-macro-ingestion` -> daily.

**Cache / summary table:**
- None - live query over stored macro tables.

**Known performance notes:**
- Macro data also feeds Market Vision, Risk, Fixed Income, Portfolio Review, Insights, and Assistant context.

### /fundamentals - Fundamentals overview

**Alpha mode:** Visible

**UI sections:**
- Fundamentals overview table for instrument-level fundamentals status.
- Refresh-log summary for recent fundamentals jobs.

**Server component / action:**
- `src/app/(dashboard)/fundamentals/page.tsx`

**Application service(s):**
- Direct repository access through `container.fundamentalsRepository`

**Repository / repositories:**
- `FundamentalsRepository` -> `SupabaseFundamentalsRepository`

**Key tables / views:**
- `fundamentals_overview_metrics` - overview row source.
- `fundamentals_refresh_logs` - recent refresh status.
- `company_profiles`, `financial_statements`, `financial_ratios`, `fundamental_scores`, `fundamental_trends`, `fundamental_trend_summaries` - underlying fundamentals tables.

**Refresh job dependency:**
- `app-weekly-fundamentals-refresh` -> `/api/jobs/fundamentals-refresh` -> weekly single bounded-concurrency pass.

**Cache / summary table:**
- `fundamentals_overview_metrics`

**Known performance notes:**
- Overview uses a stored overview view/table rather than loading every fundamentals detail record.

### /fundamentals/[symbol] - Fundamentals detail

**Alpha mode:** Visible

**UI sections:**
- Redirect-only route to the instrument detail fundamentals tab.

**Server component / action:**
- `src/app/(dashboard)/fundamentals/[symbol]/page.tsx`

**Application service(s):**
- None - redirects to `/instruments/[symbol]#fundamentals`.

**Repository / repositories:**
- None - redirect-only route.

**Key tables / views:**
- None - redirect-only route. Fundamentals data is loaded by `/instruments/[symbol]`.

**Refresh job dependency:**
- Manual only for this redirect route; destination depends on weekly fundamentals refresh.

**Cache / summary table:**
- None - redirect-only route.

**Known performance notes:**
- No page data load occurs before redirect.

## Research Group - Analytics

### /risk - Risk Analytics

**Alpha mode:** Visible

**UI sections:**
- Portfolio risk summary: volatility, drawdown, downside risk, benchmark comparison, and risk contributors.
- Macro context and bond analytics context for risk interpretation.
- Cached risk report display when fresh; rebuilds stored report when stale.

**Server component / action:**
- `src/app/(dashboard)/risk/page.tsx`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`
- `container.macroDashboardService` -> `MacroDashboardService`
- `container.macroContextService` -> `MacroContextService`
- `container.bondService` -> `BondService`
- `container.riskAnalyticsDataService` -> `RiskAnalyticsDataService`
- `container.riskAnalyticsRepository` -> `SupabaseRiskAnalyticsRepository`

**Repository / repositories:**
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- `RiskAnalyticsRepository` -> `SupabaseRiskAnalyticsRepository`
- `MacroIndicatorRepository` -> `SupabaseMacroIndicatorRepository`
- `UniverseRepository` -> `SupabaseUniverseRepository`

**Key tables / views:**
- `portfolio_risk_reports` - stored risk analytics reports.
- `portfolio_dashboard_summary` - portfolio dashboard context.
- `portfolio_snapshots` - portfolio value snapshot source for risk calculations * - inferred from architecture docs.
- `holding_snapshots` - holding snapshot source for risk attribution * - inferred from architecture docs.
- `benchmark_snapshots` - benchmark comparison source * - inferred from architecture docs.
- `portfolio_lookthrough_exposures` - look-through exposure source * - inferred from architecture docs.
- `macro_regime_snapshots`, `macro_theme_signals` - macro context.

**Refresh job dependency:**
- `app-daily-portfolio-valuation-refresh` -> `/api/jobs/portfolio-valuation-refresh` -> daily.
- `app-daily-portfolio-summary-refresh` -> `/api/jobs/portfolio-summary-refresh` -> daily.
- `app-daily-fred-macro-ingestion` -> `/api/jobs/fred-macro-ingestion` -> daily.
- Risk report can also be rebuilt during page render when the cached report is stale.

**Cache / summary table:**
- `portfolio_risk_reports`
- `portfolio_dashboard_summary`

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` identified a future `portfolio_risk_summary` as a possible optimization; current retained implementation uses `portfolio_risk_reports`.

### /bonds - Fixed Income

**Alpha mode:** Visible

**UI sections:**
- Fixed-income dashboard: bond allocation, duration, yield, credit quality, and role summaries.
- Bond profile coverage: profile source quality, seeded fallback context, and manual override state.
- Macro context relevant to fixed income.

**Server component / action:**
- `src/app/(dashboard)/bonds/page.tsx`
- `saveBondProfileAction`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`
- `container.macroDashboardService` -> `MacroDashboardService`
- `container.bondService` -> `BondService`

**Repository / repositories:**
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- `UniverseRepository` -> `SupabaseUniverseRepository`
- `MacroIndicatorRepository` -> `SupabaseMacroIndicatorRepository`

**Key tables / views:**
- `bond_profiles` - bond profile data, seeded fallback rows, and manual overrides.
- `instruments` - fixed-income instrument metadata.
- `portfolio_dashboard_summary` - portfolio context.
- `holdings` - fixed-income holdings source.
- `macro_regime_snapshots`, `macro_theme_signals` - macro context.

**Refresh job dependency:**
- `app-daily-instrument-metadata-refresh` -> `/api/jobs/instrument-metadata-refresh` -> daily.
- `app-daily-portfolio-summary-refresh` -> `/api/jobs/portfolio-summary-refresh` -> daily.
- Manual only for `saveBondProfileAction` profile overrides.

**Cache / summary table:**
- `portfolio_dashboard_summary`

**Known performance notes:**
- Older bond-intelligence design items remain future-facing; current page uses bond profiles, portfolio context, and macro context.

### /recommendations - Insights

**Alpha mode:** Visible

**UI sections:**
- Insights overview: latest stored characteristics outputs and run metadata.
- Portfolio-scoped insight dashboard: current assessments and history.
- Run control: manual insight generation action.

**Server component / action:**
- `src/app/(dashboard)/recommendations/page.tsx`
- `runRecommendationsAction`

**Application service(s):**
- `container.recommendationService` -> `RecommendationService`
- `container.portfolioService` -> `PortfolioService`

**Repository / repositories:**
- `RecommendationRepository` -> `SupabaseRecommendationRepository`
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- `TelemetryRepository` -> `SupabaseTelemetryRepository` * - inferred from architecture docs

**Key tables / views:**
- `recommendation_runs` - run metadata.
- `instrument_recommendations` - latest stored characteristics/insight outputs.
- `recommendation_history` - historical insight records.
- `telemetry_recommendation_snapshots` - telemetry snapshot layer * - inferred from architecture docs.
- `telemetry_recommendation_outcomes` - telemetry outcome layer * - inferred from architecture docs.

**Refresh job dependency:**
- `app-weekly-recommendation-run` -> `/api/jobs/recommendation-run` -> weekly.
- Manual run through `runRecommendationsAction`.

**Cache / summary table:**
- Stored output tables: `instrument_recommendations`, `recommendation_history`.

**Known performance notes:**
- Page reads stored insight outputs; it should avoid recomputing instrument characteristics during render.

### /portfolio-review - Portfolio Review

**Alpha mode:** Visible

**UI sections:**
- Portfolio review dashboard: portfolio score, diagnostics, gap analysis, and supporting evidence.
- Analytical gap summary: deterministic gap findings and instrument cards.
- ETF exposure refresh status.
- Manual review run control.

**Server component / action:**
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `runPortfolioReviewAction`

**Application service(s):**
- `container.portfolioReviewService` -> `PortfolioReviewService`
- `container.portfolioService` -> `PortfolioService`
- `container.etfExposureRepository` -> `SupabaseEtfExposureRepository`

**Repository / repositories:**
- `PortfolioReviewRepository` -> `SupabasePortfolioReviewRepository`
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- `EtfExposureRepository` -> `SupabaseEtfExposureRepository`
- `RecommendationRepository` -> `SupabaseRecommendationRepository` * - inferred from architecture docs

**Key tables / views:**
- `portfolio_review_runs` - review run metadata.
- `portfolio_review_reports` - stored review reports and summaries.
- `portfolio_lookthrough_exposures` - sector/category exposure source * - inferred from architecture docs.
- `portfolio_lookthrough_holdings` - look-through holdings source * - inferred from architecture docs.
- ETF exposure refresh logs - latest look-through refresh status.

**Refresh job dependency:**
- `app-weekly-portfolio-review-run` -> `/api/jobs/portfolio-review-run` -> weekly.
- `app-monthly-etf-lookthrough-refresh` -> `/api/jobs/etf-lookthrough-refresh` -> monthly single bounded-concurrency pass.
- Manual run through `runPortfolioReviewAction`.

**Cache / summary table:**
- `portfolio_review_reports`

**Known performance notes:**
- Gap analysis must remain framed as deterministic analysis. Look-through data is precomputed through monthly ETF look-through refresh.

## Research Group - AI and Review

### /telemetry - Telemetry

**Alpha mode:** Hidden

**UI sections:**
- Telemetry dashboard: insight outcomes, Market Vision outcomes, portfolio review outcomes, factor outcomes, and recent snapshots.

**Server component / action:**
- `src/app/(dashboard)/telemetry/page.tsx`

**Application service(s):**
- `container.telemetryDashboardService` -> `TelemetryDashboardService`

**Repository / repositories:**
- `TelemetryRepository` -> `SupabaseTelemetryRepository`

**Key tables / views:**
- `telemetry_recommendation_snapshots` - stored insight snapshots.
- `telemetry_recommendation_outcomes` - measured insight outcomes.
- `telemetry_market_vision_snapshots` - stored Market Vision snapshots.
- `telemetry_market_vision_outcomes` - Market Vision outcome records.
- `telemetry_portfolio_review_snapshots` - stored portfolio review snapshots.
- `telemetry_portfolio_review_outcomes` - portfolio review outcome records.
- `telemetry_factor_outcomes` - factor outcome records.

**Refresh job dependency:**
- `app-weekly-telemetry-evaluation` -> `/api/jobs/telemetry-evaluation` -> weekly.

**Cache / summary table:**
- None - live query over stored telemetry tables.

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` notes a future telemetry summary table may be useful if telemetry row counts grow; route is hidden in alpha.

### /assistant - Portfolio Assistant

**Alpha mode:** Hidden

**UI sections:**
- Conversation list: recent user conversations.
- Conversation transcript: latest selected messages.
- Assistant input is supported by application context through API actions.

**Server component / action:**
- `src/app/(dashboard)/assistant/page.tsx`
- `src/app/api/assistant/route.ts`

**Application service(s):**
- `container.portfolioService` -> `PortfolioService`
- `container.assistantRepository` -> `SupabaseAssistantRepository`
- `container.portfolioAssistantService` -> `PortfolioAssistantService` * - inferred from architecture docs
- `container.assistantContextBuilder` -> `AssistantContextBuilder` * - inferred from architecture docs

**Repository / repositories:**
- `AssistantRepository` -> `SupabaseAssistantRepository`
- `PortfolioRepository` -> `SupabasePortfolioRepository`
- Additional context repositories are used by `AssistantContextBuilder` * - inferred from architecture docs

**Key tables / views:**
- `assistant_conversations` - conversation records.
- `assistant_messages` - stored user and assistant messages.
- `assistant_usage_logs` - usage and cost telemetry.
- Portfolio, market, macro, insight, and review tables may be read for context through the context builder * - inferred from architecture docs.

**Refresh job dependency:**
- Manual only - conversation and message data are written during assistant interactions.
- Context freshness depends on portfolio, market, macro, insight, and review refresh jobs.

**Cache / summary table:**
- None - live query over assistant tables and context sources.

**Known performance notes:**
- Assistant route is hidden in alpha; usage and cost reporting are administered separately under AI Usage.

## Admin Group

### /admin/data-sources - Data Sources

**Alpha mode:** Hidden

**UI sections:**
- Provider health and data freshness panels.
- News, macro, fundamentals, ETF look-through, market data, and Market Vision status.
- Manual job controls and recent job run history.

**Server component / action:**
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- News, macro, fundamentals, ETF look-through, data refresh, universe seed, and Market Vision server actions.

**Application service(s):**
- `container.newsDashboardService` -> `NewsDashboardService`
- `container.macroDashboardService` -> `MacroDashboardService`
- `container.instrumentService` -> `InstrumentService`
- `container.instrumentMarketService` -> `InstrumentMarketService`
- `container.marketVisionService` -> `MarketVisionService`
- `container.jobRunService` -> `JobRunService`

**Repository / repositories:**
- `NewsRepository` -> `SupabaseNewsRepository`
- `MacroIndicatorRepository` -> `SupabaseMacroIndicatorRepository`
- `FundamentalsRepository` -> `SupabaseFundamentalsRepository`
- `EtfExposureRepository` -> `SupabaseEtfExposureRepository`
- `UniverseRepository` -> `SupabaseUniverseRepository`
- `MarketVisionRepository` -> `SupabaseMarketVisionRepository`
- `JobRunRepository` -> `SupabaseJobRunRepository`

**Key tables / views:**
- `job_runs` - recent job executions.
- `news_items`, `news_classifications`, `news_ingestion_logs` - news source status.
- `macro_indicators`, `macro_observations`, `macro_ingestion_logs` - macro source status.
- `fundamentals_refresh_logs`, `fundamentals_overview_metrics` - fundamentals status.
- ETF exposure tables and logs - look-through freshness * - inferred from architecture docs.
- `market_vision_reports`, `market_vision_generation_logs` - Market Vision status.
- `instrument_prices`, `instrument_market_metrics`, `instrument_risk_metrics` - market-data layer coverage.

**Refresh job dependency:**
- All scheduled data-refresh jobs listed in `docs/scheduled-jobs.md`; this page also exposes manual job controls through server actions.

**Cache / summary table:**
- None - administrative live query over provider/status tables.

**Known performance notes:**
- `docs/PAGE_RENDERING_AUDIT.md` identifies a future `data_source_health_summary` as a possible optimization; the implementation was reverted and does not currently exist.

### /admin/jobs - Jobs

**Alpha mode:** Hidden

**UI sections:**
- Recent job run list.
- Telemetry evaluation manual run control.

**Server component / action:**
- `src/app/(dashboard)/admin/jobs/page.tsx`
- `runTelemetryEvaluationAction`

**Application service(s):**
- `container.jobRunService` -> `JobRunService`

**Repository / repositories:**
- `JobRunRepository` -> `SupabaseJobRunRepository`

**Key tables / views:**
- `job_runs` - scheduled and manual job execution records.

**Refresh job dependency:**
- Manual only for this page's telemetry run action.
- Displays all scheduled job executions recorded by the job runner.

**Cache / summary table:**
- None - live query over `job_runs`.

**Known performance notes:**
- Recent job list is bounded; no separate summary table is documented.

### /admin/assistant-usage - AI Usage

**Alpha mode:** Hidden

**UI sections:**
- Assistant usage summary: conversations, message counts, usage totals, and cost telemetry.
- Usage grouping and latest log records.

**Server component / action:**
- `src/app/(dashboard)/admin/assistant-usage/page.tsx`

**Application service(s):**
- Direct repository access through `container.assistantRepository`

**Repository / repositories:**
- `AssistantRepository` -> `SupabaseAssistantRepository`

**Key tables / views:**
- `assistant_usage_logs` - usage and cost entries.
- `assistant_conversations` - conversation metadata.
- `assistant_messages` - stored message records.

**Refresh job dependency:**
- Manual only - written during assistant interactions.

**Cache / summary table:**
- None - live query over assistant usage records.

**Known performance notes:**
- Route is admin-only and hidden in alpha; bounded usage summary query is currently sufficient.

### /admin/system-health - System Health

**Alpha mode:** Hidden

**UI sections:**
- Health summary placeholder for future provider freshness, job health, and data quality checks.

**Server component / action:**
- `src/app/(dashboard)/admin/system-health/page.tsx`

**Application service(s):**
- `container.authProvider` -> `SupabaseAuthProvider`

**Repository / repositories:**
- None - placeholder route.

**Key tables / views:**
- None - placeholder route.

**Refresh job dependency:**
- Manual only - no implemented aggregation yet.

**Cache / summary table:**
- None - placeholder route.

**Known performance notes:**
- No system-health aggregation is implemented yet.

### /setup/taxonomy - Taxonomy

**Alpha mode:** Visible

**UI sections:**
- Canonical sectors and canonical themes.
- Unmapped provider values requiring review.
- Current instrument taxonomy mappings and manual override form.
- Provider taxonomy mapping inventory.

**Server component / action:**
- `src/app/(dashboard)/setup/taxonomy/page.tsx`
- `approveTaxonomyMappingAction`
- `saveInstrumentTaxonomyAction`

**Application service(s):**
- `container.instrumentService` -> `InstrumentService`

**Repository / repositories:**
- `UniverseRepository` -> `SupabaseUniverseRepository`

**Key tables / views:**
- `canonical_sectors` - controlled sector vocabulary.
- `canonical_themes` - controlled theme vocabulary.
- `provider_taxonomy_mappings` - raw provider value mappings.
- `instrument_sector_mappings` - instrument sector assignments.
- `instrument_theme_mappings` - instrument theme assignments.
- `instrument_tags` - instrument tag records.
- `instruments` - instrument metadata and raw provider classifications.

**Refresh job dependency:**
- `app-daily-instrument-metadata-refresh` -> `/api/jobs/instrument-metadata-refresh` -> daily.
- Manual only for taxonomy approvals and overrides.

**Cache / summary table:**
- None - live taxonomy query.

**Known performance notes:**
- Page is operational/admin-style but visible in alpha via `/setup` route prefix.

## Public Group

### /methodology - Public methodology

**Alpha mode:** Visible

**UI sections:**
- Formula-level methodology for characteristics score, fundamentals score, confidence, guardrails, portfolio score, risk analytics, gap analysis, Market Vision, and limitations.
- Related compliance and methodology links.

**Server component / action:**
- `src/app/methodology/page.tsx`

**Application service(s):**
- None - static route.

**Repository / repositories:**
- None - static route.

**Key tables / views:**
- None - methodology content is static page content and documentation-derived.

**Refresh job dependency:**
- Manual only - content changes through code/documentation updates.

**Cache / summary table:**
- None - static route.

**Known performance notes:**
- Static route with no Supabase data dependency.

### /legal/disclosures - Legal disclosures

**Alpha mode:** Visible

**UI sections:**
- Legal disclosure placeholder.
- Link to public analytical methodology.

**Server component / action:**
- `src/app/legal/disclosures/page.tsx`

**Application service(s):**
- None - static route.

**Repository / repositories:**
- None - static route.

**Key tables / views:**
- None - legal disclosure content is static page content.

**Refresh job dependency:**
- Manual only - content changes through code/documentation updates.

**Cache / summary table:**
- None - static route.

**Known performance notes:**
- Static route with no Supabase data dependency.

## Legacy Routes

The legacy route files `/universe`, `/watchlists`, and `/taxonomy` exist as redirect paths and are not primary product entries in this map. Primary entries are `/instruments/universe`, `/instruments/watchlist`, and `/setup/taxonomy`.
