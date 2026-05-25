# Phase 1 Implementation Roadmap

## Purpose

This roadmap translates the Phase 1 architecture package into an implementation sequence for Phase 2. It does not build the app. It defines the order of work, dependencies, and completion criteria.

## Phase 1 Scope Boundary

Build in Phase 2:

- Next.js, TypeScript, Tailwind CSS, shadcn/ui app.
- Supabase Postgres/Auth initial deployment.
- Manual portfolio setup.
- Portfolio dashboard.
- Daily prices.
- ETF-first allocation engine.
- Bond Intelligence.
- Watchlist Intelligence.
- Weekly recommendations.
- Market Vision.
- Benchmarking, risk, scenarios, news, telemetry.

Do not include in Phase 1:

- Trade execution.
- Brokerage sync.
- Individual bond modeling.
- Tax optimization.
- Mobile native app.
- Real-time trading alerts.

## Milestone 0: Project Foundation

Goals:

- Create Next.js application.
- Configure TypeScript, Tailwind, shadcn/ui.
- Configure Supabase project and local environment variables.
- Add provider-agnostic folder structure.
- Add dependency container and service interfaces.

Deliverables:

- App shell.
- Auth boundary.
- Typed environment loader.
- Repository and provider interfaces.
- Initial route protection.

Completion criteria:

- User can sign in.
- App can connect to Postgres through repository layer.
- UI components do not call Supabase directly.

## Milestone 1: Database and Repositories

Goals:

- Implement portable PostgreSQL schema.
- Add migrations.
- Implement repository adapters.
- Add seed data for asset universe and benchmarks.

Deliverables:

- Tables from `database-schema.md`.
- `PortfolioRepository`
- `AssetRepository`
- `PriceRepository`
- `WatchlistRepository`
- `RecommendationRepository`
- `TelemetryRepository`
- `BenchmarkRepository`
- `RiskRepository`

Completion criteria:

- Repositories pass integration tests against Postgres.
- Schema avoids direct dependency on Supabase Auth tables.

## Milestone 2: Manual Portfolio Ingestion

Goals:

- Build onboarding and manual entry flows.
- Support cash, holdings, and transactions.
- Add validation, duplicate warnings, reconciliation, editing, and deletion.

Deliverables:

- Login handoff to setup wizard.
- Add cash form.
- Add/edit holding form.
- Add/edit transaction form.
- Ingestion event records.
- Cost basis and multi-currency storage support.

Completion criteria:

- User can create a cash-only, holdings-only, or mixed portfolio.
- Reconciliation previews match saved state.
- Duplicate warnings appear before writes.

## Milestone 3: Market Data and Daily Jobs

Goals:

- Add provider clients for Financial Modeling Prep, CoinGecko, and FRED.
- Implement daily price update job.
- Store daily prices and macro indicators.
- Track job runs and provider errors.

Deliverables:

- `MarketDataProvider`
- `CryptoDataProvider`
- `MacroDataProvider`
- Daily price job.
- Macro refresh job.
- Provider usage logging.

Completion criteria:

- Holdings and benchmarks receive daily prices.
- Failures are logged without corrupting existing snapshots.

## Milestone 4: Portfolio Dashboard and Holdings

Goals:

- Build dashboard and holdings table.
- Calculate current market value, allocation, gain/loss, and cash.

Deliverables:

- Portfolio dashboard.
- Holdings table.
- Asset allocation chart.
- Benchmark preview.
- Price stale states.

Completion criteria:

- User can understand total value, allocation, top holdings, and price freshness.

## Milestone 5: ETF Allocation and Initial Capital Engine

Goals:

- Implement ETF-first allocation model.
- Recommend deployment of available cash.
- Include staged deployment schedules.

Deliverables:

- Allocation models.
- Allocation recommendation service.
- ETF allocation dashboard.
- Recommendation storage.

Completion criteria:

- Engine recommends cash reserve, ETF core, bonds, gold, crypto, and optional selective stocks within constraints.

## Milestone 6: Bond Intelligence

Goals:

- Classify bond ETFs by duration, credit quality, type, currency, and geography.
- Estimate rate, inflation, recession, credit-spread, and stability roles.

Deliverables:

- Bond ETF profile catalog.
- Bond scoring.
- Bond dashboard.
- Bond scenario impact functions.

Completion criteria:

- User can see bond sleeve duration, credit mix, and rate-shock impact.

## Milestone 7: Watchlist Intelligence

Goals:

- Build core quality, tactical/thematic, and opportunistic watchlists.
- Add scoring, triggers, suggestions, and quarterly review path.

Deliverables:

- Watchlist dashboard.
- Watchlist item detail.
- Watchlist scoring.
- Trigger evaluation.
- Suggestion generation.

Completion criteria:

- User can maintain a bounded research universe and see high-signal suggestions.

## Milestone 8: Scoring and Recommendations

Goals:

- Implement deterministic scoring engine.
- Use AI only for summarization/classification.
- Produce Strong Buy, Buy, Hold, Watch, Reduce, Sell labels.

Deliverables:

- General asset scoring.
- Bond-specific scoring.
- Recommendation mapping.
- Guardrails and hysteresis.
- Recommendations page.

Completion criteria:

- Recommendations store score evidence, guardrails, final label, and user feedback.

## Milestone 9: Market Vision and News Intelligence

Goals:

- Build weekly CIO-style Market Vision report.
- Add daily news collection, deduplication, scoring, time decay, and weekly summaries.

Deliverables:

- Market Vision dashboard.
- News cluster tables.
- AI summarization workflow.
- Recommendation impact records.

Completion criteria:

- Market developments are classified as noise, theme, or structural shift.
- Market Vision adjustments are bounded and auditable.

## Milestone 10: Benchmarking, Risk, and Scenario Analysis

Goals:

- Implement benchmark comparisons.
- Implement risk analytics.
- Implement scenario tests with bond impacts.

Deliverables:

- Benchmarking dashboard.
- Risk analytics dashboard.
- Scenario analysis dashboard.
- Benchmark and risk snapshot jobs.

Completion criteria:

- User can compare portfolio to S&P 500, Nasdaq, global equities, 60/40, gold, Bitcoin, and bonds.
- User can run required scenarios and see bond impacts.

## Milestone 11: Monthly Telemetry

Goals:

- Evaluate recommendation outcomes and signal accuracy.
- Detect overreaction.
- Suggest scoring weight changes with human approval.

Deliverables:

- Monthly telemetry job.
- Telemetry dashboard.
- Weight change approval UI.

Completion criteria:

- User can approve or reject proposed scoring changes.
- System does not silently alter strategy.

## Milestone 12: Settings, API, and Portability Readiness

Goals:

- Build settings/API page.
- Show provider health and API usage.
- Validate portability boundaries.

Deliverables:

- Settings/API page.
- Provider tests.
- Export/migration controls.
- Cloud portability checklist.

Completion criteria:

- App can switch provider implementations through environment configuration.
- Supabase usage remains isolated to auth and infrastructure adapters.

## Testing Strategy

Unit tests:

- Allocation rules.
- Scoring rules.
- Recommendation mapping.
- Bond duration and scenario math.
- News dampening.

Integration tests:

- Repository adapters.
- Ingestion reconciliation.
- Daily price jobs.
- Recommendation generation.

End-to-end tests:

- Onboarding.
- Add cash/holding/transaction.
- Dashboard load.
- Recommendation feedback.
- Scenario run.

## Phase 2 Readiness Checklist

Before implementation begins:

- Review all docs in `/docs`.
- Confirm Phase 1 asset universe.
- Confirm benchmark proxies.
- Confirm default allocation models.
- Confirm Supabase project and API budget.
- Confirm OpenAI model and structured output strategy.
- Confirm FMP, CoinGecko, and FRED access.
- Confirm deployment environment variables.

