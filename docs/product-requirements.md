# Product Requirements Document: Personal AI Portfolio Intelligence Web App

## 1. App Objective

Build a personal-use AI portfolio intelligence web app that helps an individual investor track, understand, benchmark, and improve a multi-asset portfolio across stocks, ETFs, bonds and bond ETFs, gold and gold ETFs, crypto, and cash.

The app should prioritize ETF-first portfolio construction, using broad, diversified, low-maintenance ETF allocations as the default foundation. Selective individual stock exposure is supported as an optional satellite layer when it improves conviction, diversification, or thematic exposure without overwhelming portfolio risk.

The product is not a trading terminal. It is a portfolio intelligence system: a calm, evidence-oriented assistant that turns holdings, market data, benchmarks, risks, watchlists, and user behavior into structured recommendations.

## 2. Target User

The primary user is an individual investor managing personal capital with a medium- to long-term horizon.

User characteristics:

- Wants ETF-first portfolio construction rather than high-frequency trading.
- Holds or plans to hold a mix of equities, ETFs, bonds, bond ETFs, gold exposure, crypto, and cash.
- Wants weekly decision support, not constant alerts.
- Is comfortable manually entering portfolio data during MVP.
- Wants clear explanations for allocation, risk, and rebalancing suggestions.
- Has a monthly operating budget of USD 50-100 for hosting, APIs, storage, and AI usage.
- Values portability and does not want the app permanently locked into one hosting or database vendor.

## 3. Product Principles

### ETF-First Philosophy

The app should treat ETFs as the default building blocks for portfolio construction because they offer diversification, liquidity, simplicity, and lower maintenance burden.

Individual stocks should be treated as optional satellite exposures, not the core portfolio foundation. The recommendation engine should ask whether individual stock exposure improves the portfolio versus a simpler ETF alternative.

ETF-first logic should favor:

- Broad-market equity ETFs.
- Regional and international diversification ETFs.
- Sector or thematic ETFs only when justified by portfolio goals.
- Bond ETFs for duration, credit, and income exposure.
- Gold ETFs as an optional diversifier.
- Cash or cash-equivalent exposure for liquidity and optionality.

### Watchlist Philosophy

The watchlist is not a hype feed. It is an intelligence layer for candidates that may improve the portfolio in the future.

Every watched asset should be evaluated against:

- Portfolio role.
- Existing exposure overlap.
- Valuation or price context.
- Risk contribution.
- Correlation with current holdings.
- Better ETF alternatives.
- Entry conditions or trigger criteria.

The app should help the user decide whether to ignore, monitor, research, or add an asset.

### Bond Intelligence Philosophy

Bonds and bond ETFs should not be treated as generic safe assets. The app should explain bond exposure through duration, interest-rate sensitivity, credit quality, yield, inflation context, and role in the portfolio.

Bond intelligence should help answer:

- Is the portfolio underweight or overweight fixed income?
- Is duration appropriate for the user's horizon and macro environment?
- Does the portfolio need Treasury, investment-grade, high-yield, inflation-linked, or cash-like exposure?
- Are bond ETFs being used for stability, income, diversification, or tactical macro positioning?

## 4. Asset Classes

The app must support the following asset classes:

- Stocks: individual public equities.
- ETFs: equity ETFs, sector ETFs, thematic ETFs, commodity ETFs, bond ETFs, and multi-asset ETFs.
- Bonds and bond ETFs: Treasury, sovereign, investment-grade, high-yield, inflation-linked, short-duration, intermediate-duration, long-duration, and aggregate bond exposure.
- Gold and gold ETFs: physical gold proxy ETFs and other gold-linked instruments.
- Crypto: major crypto assets such as BTC and ETH, with room for additional tokens.
- Cash: uninvested cash balances and cash-equivalent allocations.

Each asset should have a normalized asset profile that includes ticker or symbol, name, asset class, region, currency, sector or category, data provider mapping, and portfolio role.

## 5. Core Features

### 5.1 Portfolio Tracking

The user can maintain a current portfolio across all supported asset classes.

Requirements:

- Add, edit, and delete holdings manually.
- Track quantity, average cost, current price, market value, unrealized gain/loss, allocation percentage, and asset class.
- Support multiple accounts or buckets in future scope, but MVP can use one consolidated portfolio.
- Show portfolio allocation by asset class, geography, sector, ETF versus individual stock, currency, and risk bucket.
- Distinguish core holdings from satellite holdings.
- Track cash separately from invested assets.

### 5.2 Manual Portfolio Ingestion Layer

The MVP should support manual data entry and structured imports before brokerage integrations.

Manual ingestion methods:

- Form-based holding entry.
- CSV upload.
- Copy-paste table ingestion.
- Manual cash balance entry.
- Manual watchlist entry.

Required ingestion behavior:

- Normalize tickers and symbols.
- Detect duplicate holdings.
- Map assets to provider identifiers.
- Classify asset class and likely portfolio role.
- Flag incomplete or ambiguous entries for user review.
- Preserve original uploaded values for auditability.

The ingestion layer should be designed as a provider-agnostic service so future brokerage importers can be added without changing the portfolio domain model.

### 5.3 Initial Capital Allocation Engine

The app should help allocate new capital according to user constraints and portfolio philosophy.

Inputs:

- Starting capital amount.
- Risk profile.
- Investment horizon.
- Preferred ETF-first allocation model.
- Existing holdings, if any.
- Cash reserve preference.
- Regional or asset restrictions.
- Optional individual stock watchlist.

Outputs:

- Proposed allocation by asset class.
- Recommended ETF-first holdings.
- Optional satellite stock allocations.
- Suggested cash reserve.
- Rationale for each allocation.
- Warnings for concentration, overlap, liquidity, volatility, or currency exposure.

The engine should produce an allocation plan, not automatically execute trades.

### 5.4 Daily Price Updates

The app should update prices and core market data daily.

Daily updates should include:

- Closing prices for stocks and ETFs.
- Crypto prices.
- Gold ETF prices.
- Bond ETF prices.
- Benchmark prices.
- Foreign exchange rates if required for multi-currency support.
- Key macro series from FRED where relevant.

Daily jobs should write normalized price snapshots to the database and preserve enough history for performance, risk, and scenario analysis.

### 5.5 Weekly AI Portfolio Recommendations

Once per week, the app should generate an AI-assisted portfolio review.

Weekly recommendation topics:

- Allocation drift.
- Rebalancing suggestions.
- ETF alternatives to concentrated individual positions.
- Opportunities to deploy cash.
- Holdings that require attention.
- Watchlist assets that now meet entry or research criteria.
- Bond allocation and duration observations.
- Benchmark-relative performance.
- Risk changes.
- Scenario vulnerability.

Each recommendation should include:

- Summary.
- Rationale.
- Supporting data.
- Confidence level.
- Risk notes.
- Suggested action category: hold, rebalance, research, add, reduce, or ignore.

The app must clearly label recommendations as decision support, not financial advice.

### 5.6 Monthly Telemetry Learning

The app should review user behavior and portfolio outcomes monthly to improve future recommendations.

Telemetry learning should consider:

- Which recommendations the user accepted, rejected, or ignored.
- Whether user actions improved diversification, risk, or benchmark-relative performance.
- User preference patterns, such as risk tolerance, favored asset classes, or reluctance to sell.
- Watchlist conversion history.
- Allocation drift patterns.
- Cash deployment behavior.

The monthly learning layer should update user preference profiles and recommendation heuristics. It should not silently change the user's portfolio strategy without presenting the change.

### 5.7 Market Vision Tab

The Market Vision tab provides a structured view of market conditions relevant to the portfolio.

Sections:

- Market regime summary.
- Equity market overview.
- Bond and rates overview.
- Gold and inflation context.
- Crypto market overview.
- Macro indicators from FRED.
- Benchmark trend summary.
- Portfolio implication summary.

The Market Vision tab should avoid noisy news-feed behavior. It should synthesize data into a small number of portfolio-relevant observations.

### 5.8 Benchmarking Layer

The app should compare portfolio performance against relevant benchmarks.

Benchmark examples:

- S&P 500 ETF proxy.
- Total US market ETF proxy.
- Global equity ETF proxy.
- Aggregate bond ETF proxy.
- 60/40 portfolio proxy.
- Gold ETF proxy.
- BTC or crypto benchmark.
- Custom blended benchmark based on target allocation.

Benchmarking requirements:

- Compare daily, weekly, monthly, year-to-date, and since-inception performance.
- Show absolute and relative returns.
- Show volatility and drawdown versus benchmark.
- Support a custom benchmark that reflects the user's strategic allocation.

### 5.9 Risk Analytics Layer

The risk analytics layer should help the user understand what could go wrong.

Risk metrics:

- Asset class concentration.
- Single-position concentration.
- ETF overlap where data is available.
- Sector concentration.
- Geographic concentration.
- Currency exposure.
- Volatility.
- Max drawdown.
- Correlation between holdings.
- Beta versus selected benchmarks.
- Bond duration and credit exposure.
- Crypto allocation risk.
- Cash drag.

Risk outputs should be written in plain language and connected to possible actions.

### 5.10 Scenario Analysis Layer

The app should model hypothetical market scenarios and estimate portfolio impact.

MVP scenarios:

- Equity market correction.
- Interest-rate increase.
- Interest-rate decrease.
- Inflation shock.
- USD strengthening or weakening.
- Gold rally.
- Crypto drawdown.
- Recession-style risk-off scenario.

Scenario outputs:

- Estimated portfolio impact.
- Asset classes most affected.
- Holdings most affected.
- Risk explanation.
- Possible defensive or opportunistic actions.

### 5.11 Watchlist Intelligence Layer

The watchlist intelligence layer evaluates potential future investments.

Capabilities:

- Add assets to watchlist.
- Classify watched assets by asset class, theme, sector, and portfolio role.
- Compare watched assets against current holdings.
- Identify ETF alternatives for individual stocks.
- Track price movement, valuation context where available, and momentum.
- Flag duplicate exposure.
- Recommend watchlist action: ignore, monitor, research, or consider adding.

Watchlist recommendations should be integrated into weekly AI reviews.

### 5.12 Bond Intelligence Layer

The bond intelligence layer provides fixed-income-specific analysis.

Capabilities:

- Classify bond ETFs by duration, credit quality, issuer type, and role.
- Track yield, duration, and price sensitivity where data is available.
- Incorporate FRED rates data.
- Explain how rate movements may affect bond holdings.
- Compare current bond allocation to target allocation.
- Recommend short-duration, aggregate, Treasury, inflation-linked, or credit exposure based on user risk profile and market context.

### 5.13 Cloud-Portable Architecture

The app should be designed so it can start on Vercel and Supabase, then later migrate to Google Cloud Run, Cloud SQL PostgreSQL, Cloud Scheduler, and BigQuery.

Architecture principles:

- Keep business logic out of vendor-specific serverless functions where possible.
- Use provider-agnostic service interfaces for database access, job scheduling, AI calls, market data, authentication, object storage, and analytics exports.
- Keep domain models independent of Supabase-specific client shapes.
- Use PostgreSQL-compatible schema design.
- Treat scheduled jobs as portable workers.
- Isolate Vercel-specific deployment code.
- Isolate Supabase Auth behind an auth service interface.
- Avoid direct coupling between UI components and data provider clients.
- Use environment-based configuration for providers.

## 6. Data Sources

### Financial Modeling Prep

Primary source for:

- Stock prices.
- ETF prices.
- Company profile data.
- ETF and equity fundamentals where available.
- Historical price data.
- Market indices or benchmark proxies.

### CoinGecko

Primary source for:

- Crypto asset prices.
- Historical crypto prices.
- Crypto market metadata.

### FRED

Primary source for:

- Treasury yields.
- Inflation indicators.
- Policy rates.
- Credit spreads where available.
- Macro indicators relevant to market regime and bond intelligence.

### OpenAI API

Used for:

- Weekly portfolio recommendation summaries.
- Market Vision synthesis.
- Watchlist intelligence narratives.
- Bond intelligence explanations.
- User-facing rationale generation.
- Monthly telemetry interpretation.

The OpenAI layer should consume structured data and produce structured outputs wherever possible.

## 7. Daily, Weekly, and Monthly Cadence

### Daily Cadence

Daily jobs should:

- Fetch latest prices.
- Update portfolio market values.
- Update benchmark prices.
- Update crypto prices.
- Pull relevant macro data where cadence allows.
- Recalculate allocation drift.
- Recalculate key risk metrics.
- Store daily snapshots.

### Weekly Cadence

Weekly jobs should:

- Generate AI portfolio review.
- Evaluate rebalancing needs.
- Review watchlist candidates.
- Review bond allocation.
- Compare against benchmarks.
- Summarize risk changes.
- Create a recommendation record for user review.

### Monthly Cadence

Monthly jobs should:

- Analyze recommendation acceptance and rejection behavior.
- Update user preference profile.
- Review portfolio progress against target allocation.
- Review risk and benchmark trends.
- Identify recurring behavioral patterns.
- Generate a monthly learning summary.

## 8. Recommendation Engine

The recommendation engine should combine deterministic portfolio rules with AI-generated explanation.

Deterministic layer:

- Allocation drift thresholds.
- Concentration limits.
- Asset class target bands.
- ETF-first substitution rules.
- Cash reserve constraints.
- Benchmark-relative performance checks.
- Risk metric triggers.
- Watchlist trigger conditions.
- Bond duration and rate sensitivity rules.

AI layer:

- Converts structured signals into coherent recommendations.
- Explains tradeoffs.
- Highlights uncertainties.
- Summarizes market context.
- Adapts tone and focus based on user preferences.

The app should store both the input signals and generated recommendation output for auditability.

## 9. MVP Scope

The MVP should include:

- Authentication via Supabase Auth.
- Manual portfolio entry.
- CSV portfolio import.
- Consolidated portfolio dashboard.
- Daily price updates for stocks, ETFs, crypto, gold ETFs, and bond ETFs.
- Basic cash tracking.
- Asset class allocation view.
- ETF versus individual stock exposure view.
- Initial capital allocation engine.
- Weekly AI portfolio recommendation.
- Basic Market Vision tab.
- Benchmark comparison against selected ETF proxies.
- Basic risk analytics: concentration, volatility, drawdown, allocation drift.
- Basic scenario analysis with predefined scenarios.
- Watchlist entry and basic watchlist intelligence.
- Bond ETF classification and rate-sensitivity explanation.
- Portable service-layer architecture.
- Deployment on Vercel.
- Supabase Postgres database.

## 10. Future Scope

Future versions may include:

- Brokerage integrations.
- Multi-account support.
- Tax-lot tracking.
- Dividend and income forecasting.
- ETF holdings overlap analysis using detailed constituent data.
- More advanced portfolio optimization.
- Monte Carlo simulations.
- Custom scenario builder.
- Real-time alerts.
- AI chat over portfolio history.
- Automated document generation for investment policy statements.
- BigQuery analytics warehouse.
- Google Cloud Run migration.
- Cloud Scheduler job migration.
- Cloud SQL PostgreSQL migration.
- Advanced telemetry models.
- Multi-currency reporting.
- Tax-aware rebalancing.
- Mobile app or responsive PWA enhancements.

## 11. Non-Goals

The app should not include the following in MVP:

- Trade execution.
- Brokerage custody.
- Financial advisor workflows for managing client assets.
- High-frequency trading tools.
- Intraday scalping signals.
- Options strategy automation.
- Margin or leverage management.
- Social investing feed.
- Public portfolio sharing.
- Guaranteed investment advice.
- Fully automated portfolio changes without explicit user action.

## 12. Functional Requirements

### Portfolio Domain

- The user can create and maintain holdings.
- The system calculates market value and allocation.
- The system classifies holdings by asset class.
- The system preserves historical portfolio snapshots.
- The system supports cash as a first-class asset.

### Ingestion Domain

- The user can manually enter holdings.
- The user can upload CSV files.
- The system validates and normalizes imported holdings.
- The system flags ambiguous data.
- The system stores ingestion events for traceability.

### Market Data Domain

- The system fetches prices from configured providers.
- The system stores daily price snapshots.
- The system handles provider failures gracefully.
- The system supports provider replacement through service interfaces.

### Recommendation Domain

- The system generates weekly portfolio recommendations.
- The system stores recommendation inputs, outputs, and user responses.
- The user can mark recommendations as accepted, rejected, ignored, or completed.
- The system uses responses in monthly telemetry learning.

### Analytics Domain

- The system calculates benchmark-relative performance.
- The system calculates risk metrics.
- The system runs predefined scenarios.
- The system explains analytics in plain language.

## 13. Non-Functional Requirements

### Budget

The app should operate within USD 50-100 per month for personal use.

Budget considerations:

- Vercel hobby or low-tier paid hosting.
- Supabase free or low-tier paid project.
- Carefully limited OpenAI API calls.
- Financial Modeling Prep plan appropriate for daily data, not high-frequency use.
- CoinGecko free or low-tier usage depending on rate limits.
- FRED API free usage.

### Performance

- Dashboard should load within 2 seconds for typical personal portfolios.
- Daily jobs should complete within provider rate limits.
- Weekly AI recommendation generation can be asynchronous.

### Reliability

- Failed provider calls should be retried.
- Partial data failures should be visible to the user.
- Historical snapshots should not be overwritten by failed updates.
- Scheduled job failures should be logged.

### Security

- User data should be protected by authentication and row-level security.
- API keys should be stored only in environment variables or secure secret storage.
- The app should avoid storing unnecessary personal financial information.
- AI prompts should not include secrets or credentials.

### Explainability

- Recommendations must include rationale.
- The user should be able to inspect the data behind major recommendations.
- AI outputs should be grounded in structured portfolio and market data.

## 14. Technical Architecture

### MVP Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui.
- Backend: Next.js API routes or server actions behind service interfaces.
- Database: Supabase Postgres.
- Auth: Supabase Auth.
- Hosting: Vercel.
- AI: OpenAI API.
- Market data: Financial Modeling Prep, CoinGecko, FRED.

### Service Layers

Recommended service interfaces:

- `PortfolioService`
- `IngestionService`
- `MarketDataService`
- `RecommendationService`
- `AllocationService`
- `BenchmarkService`
- `RiskAnalyticsService`
- `ScenarioAnalysisService`
- `WatchlistService`
- `BondIntelligenceService`
- `TelemetryService`
- `AuthService`
- `JobSchedulerService`
- `AnalyticsExportService`

Each service should expose domain-level methods and hide provider-specific implementation details.

### Portability Mapping

| Capability | MVP Provider | Future Provider |
| --- | --- | --- |
| Web hosting | Vercel | Google Cloud Run |
| Database | Supabase Postgres | Cloud SQL PostgreSQL |
| Auth | Supabase Auth | Supabase Auth alternative or custom auth layer |
| Scheduled jobs | Vercel Cron | Cloud Scheduler |
| Analytics warehouse | Supabase/Postgres views | BigQuery |
| AI | OpenAI API | OpenAI API or alternate model provider behind interface |
| Market data | FMP, CoinGecko, FRED | Same providers or replacements behind interface |

## 15. Suggested Data Model

Core tables:

- `users`
- `portfolios`
- `holdings`
- `assets`
- `asset_provider_mappings`
- `price_snapshots`
- `portfolio_snapshots`
- `cash_balances`
- `benchmarks`
- `benchmark_snapshots`
- `watchlist_items`
- `recommendations`
- `recommendation_feedback`
- `risk_snapshots`
- `scenario_runs`
- `market_vision_reports`
- `telemetry_events`
- `user_preference_profiles`
- `ingestion_events`
- `job_runs`

## 16. Success Metrics

MVP success should be measured by whether the user can:

- Enter or import a portfolio successfully.
- See accurate daily portfolio value updates.
- Understand allocation across asset classes.
- Receive a useful weekly AI recommendation.
- Compare performance against benchmarks.
- Identify concentration or risk issues.
- Use the watchlist to improve future allocation decisions.
- Understand bond exposure and rate sensitivity.
- Run simple scenario analysis.
- Operate the app within the USD 50-100 monthly budget.

## 17. Key Risks

Product risks:

- AI recommendations may feel too generic unless grounded in strong structured signals.
- ETF overlap and bond analytics may be limited by available data.
- Manual ingestion may be tedious if CSV handling is too rigid.
- User may over-trust AI output without enough caveats.

Technical risks:

- Market data provider limits may constrain daily updates.
- Supabase-specific patterns may leak into business logic if not controlled.
- Scheduled jobs on Vercel may become insufficient for future workloads.
- Cost may rise if OpenAI calls are too frequent or too verbose.

Mitigations:

- Use structured recommendation inputs and outputs.
- Store all generated recommendation evidence.
- Keep AI cadence weekly and monthly rather than continuous.
- Design service interfaces from the beginning.
- Make provider failures visible and recoverable.

## 18. Open Questions

- What target allocation model should be used by default?
- Should the app support multiple currencies in MVP?
- Which benchmark proxies should be preconfigured?
- What risk profile categories should be offered?
- Should individual bonds be supported in MVP, or only bond ETFs?
- How much portfolio history should be retained on the low-cost tier?
- Should recommendations include suggested dollar amounts, percentage changes, or both?
- Should the app support recurring contribution planning?

