# ETFVision Feature Roadmap

Last updated: 2026-06-30 SGT

## Overview

This document captures planned and candidate product features beyond the current alpha surface. It is a planning reference, not an implementation log. Each feature includes user value, technical approach, compliance framing, rough effort, and dependencies.

ETFVision is positioned as a portfolio analytics and intelligence platform — not an investment adviser. All features must remain consistent with this positioning. See `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 15 and `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md` for compliance guardrails.

---

## Roadmap Status Summary

| Tier | Feature | Status |
|---|---|---|
| 1 | CSV / Brokerage transaction import | Not started |
| 1 | Dividend income tracking and yield on cost | Not started |
| 1 | Performance attribution by holding | Not started |
| 1 | ETF head-to-head comparison | Not started |
| 1 | Rebalancing drift analysis | Not started |
| 1 | Multiple portfolio / account aggregation | Not started |
| 1 | Scheduled email digest | Not started |
| 2 | Custom blended benchmark | Not started |
| 2 | Tax lot tracking and unrealised gain/loss | Not started |
| 2 | Factor exposure analysis | Not started |
| 2 | Risk-return scatter chart | Not started |
| 2 | Portfolio correlation matrix | Not started |
| 2 | Portfolio volatility decomposition | Not started |
| 2 | Rolling risk metrics | Not started |
| 2 | News-to-portfolio linking | Not started |
| 2 | ETF overlap and hidden concentration tool | Not started |
| 2 | In-app alerts and notifications | Not started |
| 2 | PDF / shareable report export | Not started |
| 3 | Scenario and stress test analysis | Not started |
| 3 | Earnings and macro calendar | Not started |
| 3 | Watchlist price and metric alerts | Not started |
| 3 | Mobile-optimised experience | Not started |

---

## In-Progress UX / Redesign Track (existing surfaces)

Distinct from the net-new feature tiers below: these are **redesigns and cleanup of surfaces that already exist in alpha**, tracked here so the forward backlog lives in the repo rather than only in working notes. All items are display/UX only — they must not alter scoring, frozen economic anchors, recommendation guardrails, or compliance vocabulary. Capture each as its own `implementation-log.md` entry when built.

### Instrument Detail Page v2 (premium non-advisory redesign)

Shared design language across all tabs: verdict-first hero + confidence/freshness/"how it's calculated" + deterministic Key Observations; trend glyphs (green up = improving / blue flat = stable / red down = deteriorating, colour **flips on Risk** where rising volatility = red); band-aligned breakdowns (65/48 thresholds). Strictly descriptive/non-advisory.

- **Overview tab — SHIPPED & QC'd.** Verdict hero (score + label + universe percentile + confidence + freshness + methodology link), deterministic Key Observations, Key Facts, characteristics breakdown with lucide-react icons, long-horizon CAGR / volatility / max-drawdown bars, score-trend panel.
- **Fundamentals tab — SHIPPED.** Business-quality verdict, 6 band-coloured sub-scores, key ratios + financial snapshot, 5 trend cards, collapsible metric detail; period-consistency QC fix (Key Ratios use latest annual + a separate labelled latest-quarter momentum line).
- **Risk tab v2 — PENDING (next).** Approved mockup: risk verdict + drivers + volatility windows with trend glyph + drawdown + tail/downside.
- **Insights tab v2 — PENDING (after Risk).** Approved mockup: breakdown-with-reasons + Assessment sensitivity (`recommendationChangeTriggers`, already computed) + score trend + Similar Instruments (descriptive peer table, no stars, self-row highlighted, similarity-ordered, disclaimer).

### Portfolio Dashboard re-skin

- **Pass 1 — SHIPPED.** Health gauge + 2×2 sub-ratings + caption, value/stat cards, tabbed performance chart (1Y/YTD/Since-inception) with curated benchmarks, sector/asset donuts + currency/geography bars, descriptive non-advisory banner.
- **Performance + geography fixes — SHIPPED 2026-06-30.** Return Summary period correctness (latest-snapshot anchoring; 1Y/YTD/SI collapse for young portfolios), chart axis-label de-stretch, exposure-bar "Other" dedup.
- **Pass 2 — PENDING.** Recent-activity feed; best/worst-month tiles; 1Y volatility in the Return Summary.

### Cleanup pass (long-horizon program tail)

- **raw_payload Part 2 — PENDING.** Stop writing the FMP blob on the price upsert (`SupabaseUniverseRepository`). Part 1 (null + vacuum, 1019→447 MB) is done.
- **Force-recompute flag — PENDING.** Add to the derived-metric admin buttons so deep backfills don't need the manual SQL-RPC workaround (`refresh_instrument_*_only(null)` force calls).

### Related repo trackers (do not duplicate here)

- Universe expansion (merge + seed + post-seed QA) — `DOCUMENTATION_GAPS.md` Low 5 / E49, plus Security Master auto-setup (Med 41 / E14).
- Cross-cutting iterative visual polish — `DOCUMENTATION_GAPS.md` "Cross-cutting — UI/UX improvement track."

---

## Tier 1 — High Impact, Feasible with Existing Data

### 1. CSV / Brokerage Transaction Import

**Goal:** Allow users to import holdings and transaction history from a CSV file exported from their brokerage, removing the need for manual entry.

**User value:** Manual transaction entry is the single biggest friction point for new users. Most alpha users will arrive with an existing portfolio held elsewhere. CSV import turns a 2-hour manual task into a 5-minute import.

**Data sources:** Existing `transactions`, `assets`, `holdings`, `cash_balances` tables. Instrument identity resolved through `instruments` and `securities_master`.

**Technical approach:**
- New route `/import` with a file upload form and a preview/mapping step.
- Parser that handles common brokerage CSV formats: Schwab, Fidelity, IBKR, TD Ameritrade, Vanguard.
- Mapping layer: user confirms column mappings (date, symbol, quantity, price, type) before commit.
- Symbol resolver: look up the uploaded symbol in `instruments` or `securities_master`; flag unknown symbols for manual resolution.
- New table: `import_sessions` (file name, status, row count, errors, created_at) for import history and rollback.
- Server action: `importTransactionsAction` — validates, maps, and inserts rows; triggers portfolio summary refresh.

**Compliance framing:** Data entry utility only. No interpretation of imported transactions.

**Effort:** 2–3 days (Codex)

**Dependencies:** Instrument identity resolution requires `securities_master` (already complete). Portfolio summary refresh jobs must be triggered after import.

**Sequencing note:** Should be the first Tier 1 feature built — it is the enabler for every other feature that depends on having real portfolio data. Also closes the new-user onboarding gap (Documentation Gaps Medium 39).

---

### 2. Dividend Income Tracking and Yield on Cost

**Goal:** Track dividend income from held ETFs and stocks. Show projected annual income, yield on cost, dividend history, and an income calendar.

**User value:** Dividend income is the primary return metric for income-oriented ETF investors. Knowing how much their portfolio generates annually is a core question that the current platform does not answer.

**Data sources:** FMP dividend history endpoint (`/historical-price-full/stock_dividend/{symbol}`). Existing `holdings`, `transactions`, `instrument_prices`.

**Technical approach:**
- New table: `instrument_dividends` (instrument_id, ex_dividend_date, payment_date, dividend_per_share, currency, source_provider, provider_metadata).
- New job: `app-monthly-dividend-refresh` → ingests FMP dividend history for all active instruments.
- Calculations (in a new `DividendIncomeService`):
  - Yield on cost = (trailing 12-month dividends per share) / (average cost basis per share).
  - Projected annual income = shares held × trailing 12-month dividend per share.
  - Portfolio income total = sum across all holdings.
- New route: `/income` — income dashboard with portfolio income summary, per-holding income table, and dividend calendar.
- Alpha visibility: Visible.

**Compliance framing:** Historical and trailing dividend data only. Income projections are based on trailing payments, not forecasts. Label as "based on trailing 12-month payments — not a guarantee of future distributions."

**Effort:** 2 days (Codex)

**Dependencies:** FMP provider access (existing plan). Monthly job infrastructure (existing pattern). Cost basis tracking from transactions (existing).

---

### 3. Performance Attribution by Holding

**Goal:** Show which individual holdings contributed most and least to total portfolio return over a selected period.

**User value:** Investors want to know which holdings drove their performance and which were a drag. This is standard in any serious portfolio analytics tool.

**Data sources:** Existing `holding_market_metrics`, `instrument_daily_returns`, `portfolio_dashboard_summary`, `holdings`.

**Technical approach:**
- Calculation: holding contribution = beginning weight × holding period return. Sum of contributions = total portfolio return (subject to rebalancing approximation).
- New table: `portfolio_attribution_snapshots` (portfolio_id, as_of_date, period, holdings breakdown JSON).
- Refresh: added to the existing `app-daily-portfolio-summary-refresh` job.
- UI: Attribution waterfall or bar chart, sortable table with holding name, weight, return, contribution. Positive and negative contributors highlighted.
- New section on `/portfolio` dashboard or `/holdings` page.

**Compliance framing:** Historical attribution only. No framing as predictive or as a ranking of future performance.

**Effort:** 1–2 days (Codex)

**Dependencies:** Existing daily returns and summary refresh jobs. No new provider data required.

---

### 4. ETF Head-to-Head Comparison

**Goal:** Allow users to compare 2–3 ETFs side by side across key metrics — returns, risk, costs, sector exposure, and top holdings overlap.

**User value:** Users researching a new ETF to add often want to compare it against what they already hold or against a competitor. All the data already exists in the platform — it just needs a comparison view.

**Data sources:** Existing `instrument_market_metrics`, `instrument_risk_metrics`, `bond_profiles`, `etf_sector_exposures`, `etf_top_holdings`, `instrument_recommendations`.

**Technical approach:**
- New route: `/instruments/compare` with query params `?a=VOO&b=QQQ&c=VTI`.
- Comparison table: expense ratio, 1Y/3Y/5Y return, volatility, Sharpe ratio, max drawdown, top sector exposures, top 5 holdings.
- Overlap score: percentage of holdings by weight that appear in both ETFs (using `etf_top_holdings` + security master mapping).
- Characteristics summary: latest stored insight label from `instrument_recommendations` for each ETF.
- Link from Universe, Watchlist, and Instrument Detail pages.

**Compliance framing:** Comparative analytics only. No recommendation on which ETF is "better." Labels remain neutral characteristics framing consistent with Insights.

**Effort:** 1–2 days (Codex)

**Dependencies:** ETF look-through data must be populated for compared instruments. Security master mapping improves overlap accuracy.

---

### 5. Rebalancing Drift Analysis

**Goal:** Show how far the user's current portfolio has drifted from a user-defined target allocation. Display the gap as a visual comparison, not as trade instructions.

**User value:** ETF investors who follow a target asset allocation strategy need to know when to rebalance. The current platform shows what they have but not how far it is from their plan.

**Data sources:** Existing `portfolio_lookthrough_exposures`, `portfolio_dashboard_summary`, `holdings`.

**Technical approach:**
- New table: `portfolio_target_allocations` (portfolio_id, allocation_type [asset_class/sector/geography], allocation_name, target_weight, created_at, updated_at).
- UI: Target allocation editor — user sets target % per category (must sum to 100%).
- Drift view: side-by-side bar chart showing actual vs. target allocation. Over/underweight delta displayed in percentage points.
- New section on `/portfolio` dashboard or a new `/rebalance` route.
- No trade calculations or specific buy/sell amounts — only the allocation gap is shown.

**Compliance framing:** "Allocation drift" only — how far the portfolio is from the user's own stated target. ETFVision does not recommend what the target should be or what trades to make. Users define their own targets.

**Effort:** 2 days (Codex)

**Dependencies:** Existing look-through exposure infrastructure. User-set target allocation is new data.

---

### 6. Multiple Portfolio / Account Aggregation

**Goal:** Allow users to view all their portfolios combined as a single aggregated view — combined performance, combined exposure, and combined risk.

**User value:** Many investors maintain multiple accounts (taxable account, pension/retirement account, ISA/SRS, joint account). They want a household view of their total asset allocation, not just each account in isolation.

**Data sources:** Existing schema is already portfolio_id-scoped throughout. Aggregation is a query-level change.

**Technical approach:**
- New table: `portfolio_groups` (group_id, user_id, name, created_at) + `portfolio_group_members` (group_id, portfolio_id).
- Aggregated views compute weighted sums across all portfolios in a group: combined holdings, combined exposure, combined performance.
- New `AggregatedPortfolioService` that runs existing service calculations across a group rather than a single portfolio.
- New route: `/portfolios/aggregate` — aggregated dashboard using the same components as `/portfolio` but with combined data.
- Existing individual portfolio routes remain unchanged.

**Compliance framing:** Aggregation is purely analytical. No advice on how portfolios should be structured relative to each other.

**Effort:** 2–3 days (Codex)

**Dependencies:** Requires users to have multiple portfolios. Works best after CSV import (feature 1) allows easy population of multiple accounts.

---

### 7. Scheduled Email Digest

**Goal:** Send users a weekly email summarising their portfolio performance, any new Market Vision report, and key changes since last week.

**User value:** Brings users back to the platform passively. Users who do not log in daily still feel informed. Critical for engagement in early alpha where habit formation matters.

**Data sources:** Existing `portfolio_dashboard_summary`, `portfolio_performance_summary`, `market_vision_reports`, `job_runs`.

**Technical approach:**
- Email delivery infrastructure: Resend or SendGrid (same service used for alpha invite emails in Task 13 — build together).
- New table: `email_subscriptions` (user_id, digest_enabled, last_sent_at) + `email_digest_logs`.
- New job: `app-weekly-email-digest` — runs after the weekly Market Vision and recommendation jobs complete.
- Digest content: portfolio value and weekly return, new Market Vision headline and key regime signals, any recommendation label changes, data freshness status.
- User can opt out in account settings.
- Unsubscribe link required in every email.

**Compliance framing:** Digest content is informational. Same compliance rules as on-platform copy — no advice language, neutral labels, disclaimer footer.

**Effort:** 2 days (Codex)

**Dependencies:** Email delivery infrastructure (shared with Task 13 invite flow — build Task 13 first and reuse the integration). Supabase auth email SMTP setup (Documentation Gaps Medium 37).

---

## Tier 2 — High Value, Moderate Build Effort

### 8. Custom Blended Benchmark

**Goal:** Allow users to define their own benchmark as a weighted blend of existing instruments (e.g., 60% SPY + 40% BND) and compare portfolio performance against it.

**User value:** A fixed 100% equity benchmark is not meaningful for a mixed portfolio. Users who target a specific asset allocation want to compare against that allocation, not against SPY.

**Technical approach:**
- New table: `custom_benchmarks` (portfolio_id, name, components JSON [{symbol, weight}]).
- Blend calculation: daily blend return = sum(component daily return × weight). Cumulative return series then compared against portfolio TWR.
- Reuses existing `benchmark_snapshots` infrastructure. Custom blend is precomputed and stored as a synthetic benchmark snapshot.
- UI: Benchmark builder on the `/portfolio` settings or benchmark selector.

**Effort:** 2 days (Codex)

---

### 9. Tax Lot Tracking and Unrealised Gain/Loss

**Goal:** Track individual purchase lots per holding to calculate unrealised gain/loss, cost basis, and short vs. long-term capital gain exposure.

**User value:** Most serious investors track their tax position. Knowing which lots are short-term vs. long-term and what their total unrealised gain/loss is in a position are common inputs to year-end decisions.

**Technical approach:**
- Extend `transactions` or add `transaction_lots` (transaction_id, lot_id, quantity, cost_basis_price, cost_basis_date, lot_type [FIFO/specific]).
- New calculations: unrealised gain = (current price − cost basis) × quantity; short-term flag = cost_basis_date < 1 year ago.
- UI: Holdings table expanded with lot drill-down. Total unrealised gain/loss column per holding and for the whole portfolio.

**Compliance framing:** Tax information displayed is for the user's reference only. ETFVision does not provide tax advice. Wash sale detection and tax-loss harvesting are informational observations, not recommendations.

**Effort:** 2–3 days (Codex)

---

### 10. Factor Exposure Analysis

**Goal:** Show the portfolio's tilt toward investment factors — value, growth, momentum, quality, low volatility — based on underlying holdings.

**User value:** Factor investing is a growing category. Users holding ETFs like QUAL, MTUM, USMV, SPLV will want to see their aggregate factor exposure. Also useful for understanding the style bias of a seemingly diversified portfolio.

**Technical approach:**
- New table: `instrument_factor_exposures` (instrument_id, as_of_date, value_score, growth_score, momentum_score, quality_score, low_vol_score, methodology_note).
- Sources: derived from FMP fundamentals ratios for stocks; ETF factor scores derived from provider data or weighted average of underlying holdings.
- Portfolio factor tilt = weighted average of holding factor scores by portfolio weight.
- Connects directly to planned Factor Investing ETF additions (QUAL, SPHQ, JQUA, MTUM, USMV, SPLV — see Documentation Gaps Low 5).
- UI: Factor radar chart on `/risk` or a new `/factors` route.

**Effort:** 2–3 days (Codex)

**Dependencies:** Factor Investing ETF additions (Low 5) should be seeded first. FMP fundamentals data for stock holdings.

---

### 11. News-to-Portfolio Linking

**Goal:** Surface news articles relevant to instruments the user currently holds, directly on portfolio and instrument pages.

**User value:** News is currently a separate module and hidden in alpha. The natural upgrade is making it portfolio-aware — when a user views their holdings, they see recent news about those ETFs and their major underlying companies.

**Technical approach:**
- Join `news_classifications` (which tags news items to instruments) with `portfolio_lookthrough_holdings` (which knows what the user holds directly and indirectly).
- New query: "news items classified to any instrument in portfolio_id X, last 7 days."
- UI: "Portfolio News" card on `/portfolio` dashboard. News tab on `/instruments/[symbol]` page.
- Requires News module to be enabled (currently hidden in alpha behind `PRODUCT_MODE`).

**Effort:** 1 day (Codex) — mostly UI work since the data linkage already exists.

**Dependencies:** News module must be enabled in full product mode. News ingestion jobs must be running.

---

### 12. ETF Overlap and Hidden Concentration Tool

**Goal:** Show users the percentage of holdings overlap between ETFs they hold — e.g., VOO and QQQ both hold significant MSFT/Apple — and surface the effective single-stock concentration.

**User value:** Many investors think they are diversified by holding multiple ETFs but have high hidden concentration in a few large-cap names. The current Portfolio Review surfaces this in reports; this feature makes it a standalone exploratory tool.

**Technical approach:**
- Extends existing `portfolio_lookthrough_holdings` and security master mapping.
- New view or function: `etf_pair_overlap(etf_a, etf_b)` — returns holdings in common, their weights in each ETF, and an overlap score.
- UI: Overlap matrix on the `/instruments/compare` page (feature 4) or a dedicated section in Portfolio Review.
- Already partially surfaced in the Portfolio Review look-through; this makes it user-accessible without running a full review.

**Effort:** 1–2 days (Codex)

**Dependencies:** ETF top holdings must be populated for the compared ETFs. Security master mapping improves overlap accuracy.

---

### 13. In-App Alerts and Notifications

**Goal:** Alert users when conditions they care about are met — price thresholds, new reports published, risk changes, data staleness.

**User value:** Removes the need for users to log in to check if anything has changed. Increases platform stickiness and gives users a reason to return.

**Technical approach:**
- New tables: `user_alert_rules` (user_id, rule_type, instrument_id, threshold, enabled), `user_notifications` (user_id, type, title, body, read_at, created_at).
- Alert types: instrument price above/below threshold; new Market Vision report published; portfolio risk metric materially changed; scheduled job failed to refresh data (user-facing version of the operations alert).
- New job: `app-daily-alert-evaluation` — evaluates alert rules against latest data.
- Delivery: in-app notification panel (bell icon in nav) + optional email (using the email infrastructure from feature 7).

**Effort:** 2–3 days (Codex)

---

### 14. PDF / Shareable Report Export

**Goal:** Allow users to export a Portfolio Review, performance summary, or risk report as a PDF for offline use or sharing with a financial adviser.

**User value:** A PDF report makes the platform feel professional and trustworthy. Many users will want to share their portfolio analysis with an adviser or keep a dated record.

**Technical approach:**
- Server-side PDF generation using a headless browser (Puppeteer) or a Next.js-compatible HTML-to-PDF library.
- PDF templates for: Portfolio Review report, performance summary, risk report.
- Disclaimer automatically included on every page using existing `exportDisclaimer.ts` helper.
- New server action: `exportReportPdfAction` triggered by an "Export PDF" button on relevant pages.
- Stored temporarily in Supabase Storage or streamed directly to the browser.

**Compliance framing:** Export disclaimer is already implemented in `src/lib/compliance/exportDisclaimer.ts`. Every PDF must include the full disclaimer on the final page.

**Effort:** 2 days (Codex)

**Dependencies:** `exportDisclaimer.ts` already in place. Supabase Storage or equivalent file handling.

---

### 15. Risk-Return Scatter Chart

**Goal:** Plot each portfolio holding and the portfolio overall as a dot on a two-dimensional chart showing annualised volatility (x-axis) against annualised return (y-axis), alongside a selection of reference benchmarks.

**User value:** Gives investors an immediate visual sense of whether each holding and the portfolio as a whole are delivering returns commensurate with the risk they carry. Provides the conceptual intuition of quantitative risk analysis without any optimization or implied action.

**Data sources:** Existing `instrument_risk_metrics` (annualised volatility), `instrument_market_metrics` (1Y, 3Y return), `holding_market_metrics` (portfolio-level risk and return already computed).

**Technical approach:**
- Chart component: scatter plot with volatility on x-axis, annualised return on y-axis.
- Data points: each held instrument as a labelled dot; portfolio aggregate as a highlighted dot; optional overlay of reference instruments (e.g., MSCI World ETF, AGG bonds ETF) for context.
- Colour-code by asset class (equity, fixed income, alternatives, cash).
- Period selector: 1Y, 3Y (only instruments with sufficient history shown for 3Y).
- No efficient frontier curve — the chart shows where instruments sit historically, not where they theoretically should be. Adding a frontier curve would require expected return estimation and quadratic optimization and would imply the portfolio is "suboptimal."
- New section on the `/risk` route or a tab on `/portfolio`.

**Compliance framing:** "Historical risk and return of your holdings over the selected period." No efficient frontier line, no labelling of holdings as "efficient" or "inefficient," no suggestion of reallocation. Tooltip: "Based on trailing [period] data. Past risk and return patterns are not indicative of future outcomes."

**Effort:** 1 day (Codex)

**Dependencies:** Existing `instrument_risk_metrics` and `instrument_market_metrics` must be populated for held instruments — already in place.

---

### 16. Portfolio Correlation Matrix

**Goal:** Display the pairwise correlation between every pair of holdings as a colour-coded heat map, showing how closely holdings move together over the trailing period.

**User value:** Many investors believe they are diversified because they hold multiple ETFs but unknowingly hold highly correlated instruments. The correlation matrix makes diversification quality visible and concrete — a 0.95 correlation between two equity ETFs tells a clearer story than "both are large-cap equity."

**Data sources:** Existing `instrument_daily_returns` table — correlations calculated from the daily return series.

**Technical approach:**
- New table: `portfolio_holding_correlations` (portfolio_id, as_of_date, instrument_id_a, instrument_id_b, correlation_60d, correlation_252d).
- New job extension: added to `app-daily-portfolio-summary-refresh`. For each portfolio, computes the pairwise Pearson correlation matrix from `instrument_daily_returns` for the trailing 60 and 252 calendar days.
- UI: Heat map grid where cell colour represents correlation strength (red = high positive, blue = negative, white = uncorrelated). Instrument tickers on both axes. Toggle between 60-day and 252-day window.
- New section on `/risk` page.

**Compliance framing:** "How your holdings have moved relative to each other based on trailing returns. Correlation is based on historical data and may not reflect future relationships." No suggestions about which holdings to add or remove.

**Effort:** 1–2 days (Codex)

**Dependencies:** `instrument_daily_returns` must be populated for all held instruments. Minimum 60 trading days of history required per instrument for the 60-day window to be meaningful.

---

### 17. Portfolio Volatility Decomposition

**Goal:** Break total portfolio volatility into the contribution from each individual holding — showing which positions are the largest sources of portfolio-level risk.

**User value:** Knowing that a portfolio has 14% annualised volatility is less informative than knowing that 40% of that volatility comes from a single 8% holding. Risk contribution analysis reveals hidden concentration in risk terms, which is different from concentration in weight terms.

**Data sources:** Existing `instrument_risk_metrics` (individual volatility, beta), `holding_market_metrics` (weights), correlation data from Feature 16.

**Technical approach:**
- Risk contribution per holding = (weight × covariance of holding with portfolio) / portfolio variance. Covariance derived from individual volatility and beta using a single-factor approximation: cov(i, P) ≈ β_i × σ_P².
- Percentage risk contribution = risk contribution / sum of all risk contributions.
- New stored result: `portfolio_risk_decomposition` (portfolio_id, as_of_date, instrument_id, weight_pct, risk_contribution_pct, marginal_risk_contribution).
- Refresh: extended from existing `app-daily-portfolio-summary-refresh` job.
- UI: Bar chart showing % risk contribution per holding alongside % weight. Holdings where risk contribution significantly exceeds weight are highlighted. New section on `/risk`.

**Compliance framing:** "Each holding's estimated contribution to total portfolio volatility, based on historical return data." No suggestion to reduce any specific position.

**Effort:** 1–2 days (Codex)

**Dependencies:** Feature 16 correlation data improves accuracy but is not strictly required — the single-factor beta approximation is sufficient for the initial implementation.

---

### 18. Rolling Risk Metrics

**Goal:** Show how key portfolio risk metrics — annualised volatility, Sharpe ratio, maximum drawdown, and beta — have changed over time using a rolling trailing window.

**User value:** A single point-in-time Sharpe ratio of 0.8 conceals whether the portfolio has been consistently generating risk-adjusted returns or whether that number is the result of one unusually good period masking recent deterioration. Rolling metrics reveal the stability and trend of the risk profile over time.

**Data sources:** Existing `instrument_daily_returns`, portfolio daily return series.

**Technical approach:**
- New table: `instrument_rolling_metrics` (instrument_id, as_of_date, window_months [3, 6, 12], sharpe_ratio, annualised_volatility, max_drawdown, beta_to_market).
- New table: `portfolio_rolling_metrics` (portfolio_id, as_of_date, window_months [3, 6, 12], sharpe_ratio, annualised_volatility, max_drawdown, beta_to_market).
- New job: `app-weekly-rolling-metrics-refresh` — runs weekly (full lookback recalculation makes daily runs wasteful).
- UI: Line chart per metric over time. Window selector: 3-month, 6-month, 12-month rolling. Chart displayed on `/risk` for the portfolio and on `/instruments/[symbol]` for individual holdings.

**Compliance framing:** "Historical rolling risk metrics. Past patterns do not predict future risk or return. Chart stops at today's date — no forward projection." No trend extrapolation displayed.

**Effort:** 1–2 days (Codex)

**Dependencies:** Minimum 12 months of daily return history required for the 12-month rolling window to be meaningful. Uses the same `instrument_daily_returns` feed already powering existing risk calculations.

---

## Tier 3 — Future Direction, More Complex

### 19. Scenario and Stress Test Analysis

**Goal:** Show how the current portfolio would have performed during specific historical market scenarios — the 2008 GFC, the 2020 COVID crash, the 2022 rate hike cycle.

**User value:** Helps investors understand the risk profile of their portfolio in concrete, relatable terms rather than abstract volatility numbers.

**Technical approach:**
- Define scenario date ranges in a `market_scenarios` table (name, start_date, end_date, description).
- Apply portfolio weights at scenario start to daily returns over the scenario period.
- Calculate scenario return, max drawdown, and comparison against a benchmark.
- UI: Scenario selector with waterfall chart and comparison table.

**Compliance framing:** Historical analysis only. Not a forecast or prediction of future performance. Clearly labelled as "how this portfolio would have performed in [period]" — not "how it will perform."

**Effort:** 2–3 days (Codex)

**Dependencies:** Full daily price history for all held instruments must be available for the scenario period. Most instruments have multi-year history already loaded.

---

### 20. Earnings and Macro Calendar

**Goal:** Show upcoming earnings dates for stock holdings and key macro economic events (FOMC, CPI, NFP) relevant to the portfolio.

**User value:** Contextualises Market Vision reports and helps users understand upcoming data events that may affect their holdings.

**Technical approach:**
- New table: `earnings_calendar` (instrument_id, report_date, estimate_eps, source_provider) — populated from FMP earnings calendar endpoint.
- Macro events already exist in FRED macro ingestion infrastructure; add an `economic_event_calendar` table for known release dates.
- New job: `app-weekly-earnings-calendar-refresh`.
- UI: Calendar view on `/market-vision` or a new `/calendar` route. "Upcoming for your portfolio" highlights events for held instruments.

**Effort:** 2 days (Codex)

**Dependencies:** FMP earnings calendar endpoint within current provider plan. FRED economic release schedule (public data).

---

### 21. Watchlist Price and Metric Alerts

**Goal:** Alert users when a watchlisted instrument crosses a user-defined price threshold or when a key metric changes materially.

**User value:** Lets researchers track instruments they are considering without constantly checking prices.

**Technical approach:**
- Extension of the alerts infrastructure in feature 13.
- Alert rule type: watchlist instrument price above/below X; volatility change above threshold.
- Evaluate during `app-daily-alert-evaluation` job using latest `instrument_market_metrics`.

**Effort:** Half day (Codex) — builds on feature 13 infrastructure.

**Dependencies:** Feature 13 (alerts and notifications) must be built first.

---

### 22. Mobile-Optimised Experience

**Goal:** Ensure the core portfolio views are usable on a mobile device without requiring a native app.

**User value:** Users checking their portfolio performance on the go need at minimum the dashboard, holdings, and instrument detail pages to be readable and functional on a phone.

**Technical approach:**
- No backend changes. Pure frontend responsive design pass using existing Tailwind CSS breakpoints.
- Priority pages: `/portfolio` dashboard, `/holdings`, `/instruments/[symbol]`, `/market-vision`.
- Key UX work: collapsible metric tables, mobile-friendly chart sizing, bottom navigation bar for core sections.

**Effort:** 2–3 days (frontend Codex + manual device testing)

**Dependencies:** Browser and device compatibility audit (Low 11) should follow to verify the result.

---

## Recommended Sequencing

Build order based on impact and dependency chains:

```
Phase A — Unblock real data (pre-paying users)
  1. CSV Import              → gets real portfolios in without manual entry
  2. Dividend Income         → answers the first question of income investors
  3. Performance Attribution → immediate analytical depth on populated portfolios

Phase B — Deepen engagement (early alpha)
  4. ETF Comparison          → research tool before adding instruments
  5. ETF Overlap Tool        → natural companion to Portfolio Review
  6. Rebalancing Drift       → personalises the platform with user-set targets
  7. Email Digest            → brings users back passively (share infra with Task 13)

Phase C — Account completeness (before paid)
  8. Multiple Portfolio Aggregation → household view
  9. Custom Blended Benchmark       → relevant benchmark for mixed portfolios
 10. In-App Alerts                  → stickiness mechanism
 11. PDF Export                     → professional credibility

Phase D — Depth features (post-launch)
 12. Tax Lot Tracking
 13. Factor Exposure Analysis
 14. News-to-Portfolio Linking (requires News module enabled)
 15. Risk-Return Scatter Chart
 16. Portfolio Correlation Matrix
 17. Portfolio Volatility Decomposition
 18. Rolling Risk Metrics
 19. Scenario and Stress Test Analysis
 20. Earnings and Macro Calendar

Phase E — Platform maturity
 21. Watchlist Alerts
 22. Mobile-Optimised Experience
```

---

## Compliance Guardrails for All Features

Every feature must conform to the ETFVision product positioning as a portfolio analytics platform, not an investment adviser. Specific rules for this roadmap:

| Feature area | Allowed framing | Not allowed |
|---|---|---|
| Rebalancing drift | "Your portfolio has drifted X% from your target" | "You should buy/sell to rebalance" |
| Dividend income | "Trailing 12-month income based on past payments" | "Expected income" or "projected dividend" as a forecast |
| Tax lots | "Unrealised gain/loss for your reference" | "You should harvest this loss" or "tax advice" |
| Performance attribution | "Holding X contributed Y% to your return" | Ranking holdings as "good" or "bad" investments |
| Scenario analysis | "How this portfolio would have performed in [period]" | Forward projections or risk forecasts |
| ETF comparison | Neutral characteristics metrics side by side | "ETF A is better than ETF B" |
| Factor exposure | "Your portfolio has a tilt toward quality and low volatility" | "You should increase momentum exposure" |
| Risk-return scatter | "Historical risk and return position of your holdings over the selected period" | Drawing an efficient frontier curve; labelling holdings as "inefficient" or "suboptimal" |
| Correlation matrix | "How your holdings have moved relative to each other based on trailing returns" | "Your holdings are too correlated — you should sell X" |
| Volatility decomposition | "Holding X contributes an estimated Y% of your total portfolio volatility" | "Reduce your allocation to X to lower portfolio risk" |
| Rolling metrics | "How your portfolio's risk profile has evolved over the trailing period" | Forward projections; implying a recent trend will continue |

See `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md` and `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 10 for full guidance.

---

## Features Intentionally Out of Scope

The following capabilities are outside the current product positioning and should not be built without a deliberate strategic decision:

- **Trade execution or brokerage integration** — ETFVision is not a trading platform.
- **Personalised buy/sell recommendations** — the insights engine is deterministic characteristics scoring, not personalised advice.
- **Robo-adviser or automated rebalancing** — would require regulatory authorisation in most jurisdictions.
- **Social / community features** — anonymous portfolio benchmarking, sharing portfolios publicly. Different product direction.
- **Crypto trading or DeFi** — raw crypto references are intentionally inactive. Crypto ETF proxies (BTC ETFs, ETH ETFs) remain in scope as ETF products.
- **White-label / multi-tenant adviser platform** — possible future product tier, not current scope.
- **Real-time pricing** — the platform is designed around scheduled daily refresh, not real-time market data feeds.
- **Efficient Frontier / mean-variance optimisation** — displays a theoretically "optimal" portfolio allocation, which is functionally a personalized portfolio recommendation and is based on expected return estimates that are inherently unreliable for ETFs. The risk-return scatter chart (Feature 15) provides the visual context of risk versus return without any optimization curve or implied action.
