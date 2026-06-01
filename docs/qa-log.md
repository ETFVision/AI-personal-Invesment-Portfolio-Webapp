# QA Log

This file records completed QA reviews, fixes, test coverage, residual risks, and follow-up items for future phases.

Backfilled entries are reconstructed from commit history and prior implementation/QA work before this log existed.

## 2026-06-01 - Phase 2 Core MVP QA Backfill

Scope:
- Next.js + TypeScript app scaffold.
- Tailwind/shadcn setup.
- Supabase Auth.
- Portfolio setup.
- Cash balances.
- Holdings.
- Transactions.
- Dashboard basics.
- Cloud-portable service/repository pattern.

Fixes made:
- Fixed Vercel build type errors around Supabase auth cookie handling.
- Tightened middleware cookie typings.
- Fixed duplicate default portfolio handling.
- Added setup/profile visibility and edit support.
- Added holding total and estimated holding values on dashboard.
- Clarified unconverted currency totals for multi-currency portfolios.
- Added explicit holding/cash currency display.
- Standardized displayed asset type labels, including ETF capitalization.

Validation / QA performed:
- Manual local and Vercel smoke testing of login, setup, cash, holdings, transactions, dashboard, and holdings table.
- Vercel production build failures were resolved until deployment passed.
- Phase 2 QA checklist created in `docs/phase-2-qa-checklist.md`.

Related commits:
- `ee310fc` - Build Phase 2 core MVP scaffold
- `548784e` - Fix Vercel build type errors
- `31a96a0` - Type Supabase auth cookie updates
- `9153019` - Type middleware cookie updates
- `a9e6d3c` - Handle duplicate default portfolios
- `40259c4` - Show estimated holding values
- `87db6fa` - Show holdings total on dashboard
- `baab69b` - Clarify unconverted dashboard currency totals
- `7988eab` - Show holding currencies explicitly
- `f3b2e50` - Show setup profile details
- `b0c2ea0` - Allow editing portfolio setup
- `8592f2f` - Add Phase 2 QA checklist
- `7b6bf93` - Format asset type labels

Residual risks / follow-ups:
- FX conversion is not implemented, so mixed-currency totals remain native-currency estimates.
- Transaction reconciliation is still manual-first; CSV/IBKR import remains future scope.
- Auth and RLS should receive another review before any multi-user production rollout.

## 2026-06-01 - FMP Market Data Integration QA Backfill

Scope:
- Provider-agnostic market data service.
- Financial Modeling Prep adapter.
- Latest price refresh.
- Historical price refresh.
- Daily price storage.
- Manual refresh flow.
- API key handling and rate-limit protection.

Fixes made:
- Added market data price refresh foundation.
- Fixed FMP price refresh endpoint handling.
- Added retry handling.
- Handled partial FMP responses safely.
- Fixed FMP historical fallback and payload variants.
- Hardened benchmark refresh error handling.

Validation / QA performed:
- Manual local and Vercel testing of refresh flows.
- Confirmed API key stays server-side through service/action paths.
- Confirmed UI does not call FMP directly.
- Confirmed price refresh works with stored environment variables.

Related commits:
- `a0abe38` - Add market data price refresh foundation
- `5cbba5d` - Fix FMP price refresh endpoint
- `011c0b4` - Add FMP retry handling
- `c017d03` - Handle partial FMP price responses
- `1f79222` - Fix FMP historical price fallback
- `148587b` - Accept FMP historical payload variants
- `980abed` - Harden benchmark refresh error handling

Residual risks / follow-ups:
- FMP plan/API limits require conservative batching and stale-data checks.
- Crypto reference instruments may need provider-specific handling beyond FMP.
- Add explicit provider health/status logs for failed symbols.

## 2026-06-01 - Portfolio Analytics Layer QA Backfill

Scope:
- Total value.
- Cash/invested amount.
- Unrealised and realised gain/loss.
- Portfolio, holding, and cash performance.
- Asset allocation, currency exposure, sector/geography.
- Dashboard UX simplification.

Fixes made:
- Built portfolio dashboard analytics.
- Added portfolio analytics layer.
- Added flow-adjusted product and cash performance.
- Fixed inception return and integrated product performance into holdings table.
- Excluded cash capital from inception return.
- Added one-year performance metric.
- Refined and split dashboard performance charts.
- Simplified dashboard sections to avoid duplicating holdings/cash details.
- Added asset metadata enrichment and ETF metadata classification correction.
- Hardened analytics cash-flow calculations and holding snapshot handling.

Validation / QA performed:
- Manual dashboard testing for cash, holdings, transactions, performance, and allocation.
- QA review of portfolio analytics and FMP metadata extraction.
- Build/test checks were run during implementation passes.

Related commits:
- `f98e2c4` - Add portfolio dashboard analytics
- `f0b2437` - Build portfolio analytics layer
- `de8181c` - Add flow-adjusted product and cash performance
- `c3d2824` - Fix inception return and holdings performance UX
- `938e348` - Exclude cash capital from inception return
- `c787981` - Add one-year performance metric
- `f6cb165` - Add dashboard performance bar chart
- `518b5ef` - Refine dashboard performance chart
- `87e1fdc` - Split performance chart by period
- `4dde036` - Simplify portfolio dashboard detail sections
- `0e6f045` - Add asset metadata enrichment
- `b6d0312` - Classify ETF metadata correctly
- `24f4290` - Harden analytics cash flow calculations
- `3c9498c` - Tighten holding performance snapshots

Residual risks / follow-ups:
- Portfolio volatility still needs TWR/synthetic-return treatment.
- FX-aware performance and cash returns remain future work.
- Add explicit methodology tooltips for each performance metric.

## 2026-06-01 - Benchmark Layer QA Backfill

Scope:
- Benchmark universe.
- Benchmark price refresh.
- Benchmark historical snapshots.
- Portfolio vs benchmark return comparison.
- Cumulative and rolling comparison.
- Drawdown comparison.
- Dashboard benchmark UX.

Fixes made:
- Built benchmark layer.
- Moved benchmark comparison into the performance section.
- Folded benchmark series into long-term performance charts.
- Tightened auth gating while working around dashboard access.
- Folded short-term benchmark spreads into daily/weekly/monthly performance cards.
- Later return QA fixed benchmark alignment, TWR comparison, and chart artifacts.

Validation / QA performed:
- Comprehensive benchmark QA review completed before later return-calculation QA.
- Manual UI review of benchmark placement and chart readability.
- Build/test checks were run during benchmark implementation and later return QA.

Related commits:
- `dd1cc78` - Build benchmark layer
- `f654b28` - Move benchmark comparison into performance
- `b76c660` - Fold benchmark series into performance charts
- `54c23c3` - Tighten auth gating and login route
- `6bb51e8` - Fold short-term benchmark spreads into performance cards
- `f8d01ca` - Show all benchmarks in performance charts

Residual risks / follow-ups:
- Benchmark total-return versus price-return distinction should be made explicit.
- Add benchmark methodology tooltip and data-freshness indicators.
- Consider adjusted-close support if provider plan/data allows it.

## 2026-06-01 - Instrument Universe And Watchlist QA Backfill

Scope:
- Seeded ETF universe.
- Bond/gold/cash ETF universe.
- Benchmark instruments.
- Crypto instruments and crypto ETF handling.
- Watchlist stock universe.
- Instrument metadata.
- Price/history refresh UX.
- Derived instrument market metrics.

Fixes made:
- Built instrument universe layer.
- Fixed SQL seed tags and optional IDs.
- Fixed metadata refresh user foreign-key issue.
- Added instrument market data views.
- Stabilized FMP historical coverage and payload parsing.
- Unified refresh actions and improved refresh UX.
- Made instrument price refresh incremental.
- Added 3Y/5Y returns and later derived instrument market metrics.
- Split latest refresh from history backfill.
- Added history coverage summary and moved details to Settings.
- Improved universe page load performance.
- Refined crypto ETF/reference layout and latest crypto reference price refresh.
- Grouped stock universe by sector.
- Made refresh data skip fresh work.
- Completed instrument universe QA pass.

Validation / QA performed:
- Manual universe/watchlist UI testing.
- Manual refresh testing including backfill coverage and stale/fresh status.
- Comprehensive Instrument Universe and Watchlist QA review completed.
- Build/test checks were run during QA and fixes.

Related commits:
- `ddc1015` - Build instrument universe layer
- `32264c7` - Fix instrument universe SQL seed tags
- `e624d3f` - Fix metadata refresh user foreign key
- `7bda6c0` - Add instrument universe market data views
- `3b481c4` - Fix FMP historical coverage
- `217d46b` - Stabilize universe price refresh
- `0b56957` - Unify data refresh actions
- `86ebce6` - Fix universe seed optional ids
- `5367ef5` - Make instrument price refresh incremental
- `5d48520` - Add three and five year instrument returns
- `229e775` - Refine universe crypto layout and refresh UX
- `1bd323b` - Split latest refresh from history backfill
- `245c6c9` - Add universe history coverage summary
- `aee90c2` - Move history coverage details to settings
- `07a6ec4` - Speed up universe page market view load
- `f9ec86f` - Add derived instrument market metrics
- `390b3a7` - Fix history backfill coverage estimate
- `6c03cb7` - Use metrics for history coverage summary
- `8f23a2a` - Group stock universe by sector
- `d28d02c` - Refresh latest crypto reference prices
- `1c43369` - Add lighter universe latest refresh
- `4a6fe9f` - Make refresh data skip fresh work
- `202c04b` - QA instrument universe layer

Residual risks / follow-ups:
- Provider/API limits still require careful batching and observability.
- Human approval flow for universe additions/removals remains future hardening.
- Add admin review workflow for inactive/reference instruments.
- Add better refresh progress status if refresh jobs become longer-running.

## 2026-06-01 - Taxonomy QA Backfill

Scope:
- Canonical sectors.
- Canonical themes.
- Instrument canonical mappings.
- Taxonomy management under Settings.
- Risk analytics integration with canonical sectors.

Fixes made:
- Added canonical taxonomy management.
- Applied canonical taxonomy to risk reports.
- Normalized risk theme labels.
- Removed theme exposure from risk page to avoid duplication with sector exposure.
- Moved taxonomy page under Settings.

Validation / QA performed:
- Manual review of ETF sector classification, including broad-market ETF handling.
- Risk page review after taxonomy integration.
- Build/test checks were run during taxonomy implementation.

Related commits:
- `e2e76ed` - Add canonical taxonomy management
- `9d95be2` - Apply canonical taxonomy to risk reports
- `b331cb8` - Normalize risk theme labels
- `070add1` - Remove theme exposure from risk page
- `3561285` - Move taxonomy under settings

Residual risks / follow-ups:
- Add manual override audit trail if taxonomy editing becomes more active.
- Add unmapped provider value review workflow.
- Keep provider raw metadata isolated from UI/scoring logic.

## 2026-06-01 - Risk Analytics Implementation Backfill

Scope:
- Risk analytics foundation.
- Covariance risk contribution.
- Universe-backed history for risk correlations/drawdowns.
- Benchmark drawdown history.
- Derived risk report caching.

Fixes made:
- Built risk analytics foundation.
- Added covariance risk contribution.
- Used universe history for covariance and correlations.
- Used full/universe benchmark history for drawdown comparison.
- Added estimated portfolio drawdown.
- Cached derived risk analytics reports.
- Fixed risk report RLS user id cast.
- Removed duplicated theme exposure after taxonomy review.

Validation / QA performed:
- Manual review of risk page layout and metrics.
- Follow-up checks for covariance mode, correlation heatmap, benchmark drawdown, and suspicious benchmark drawdowns.
- Risk Analytics Layer QA later fixed correlation date alignment.

Related commits:
- `e3c658e` - Build risk analytics foundation
- `c9dac52` - Add covariance risk contribution
- `7e395da` - Use universe history for covariance risk
- `41fdc50` - Use universe history for risk correlations
- `c373199` - Use full benchmark history for drawdowns
- `70bf2c3` - Use universe benchmark history for risk drawdowns
- `76dbaa1` - Add estimated portfolio drawdown
- `ac04422` - Backfill benchmark drawdown history
- `9041de0` - Cache derived risk analytics reports
- `2068c07` - Fix risk report RLS user id cast
- `070add1` - Remove theme exposure from risk page

Residual risks / follow-ups:
- See the formal Risk Analytics Layer QA entry below for current residual risks.

## 2026-06-01 - Portfolio And Benchmark Return QA

Scope:
- Portfolio return accuracy.
- Benchmark comparison accuracy.
- Long-term performance chart behavior.
- Manual portfolio edge cases with incomplete transaction history.

Fixes made:
- Guarded portfolio returns against stale tiny manual snapshots.
- Switched portfolio performance to TWR-style chained subperiod returns where snapshot and cash-flow history supports it.
- Preserved manual-capital fallback where transaction history is incomplete.
- Aligned benchmark comparisons to nearest prior benchmark snapshot when exact dates are missing.
- Flattened stale pre-capital portfolio chart baselines to avoid artificial dips and spikes.
- Restored benchmark chart history without reintroducing stale portfolio return artifacts.

Tests added or improved:
- Decimal return formatting guard.
- Portfolio deposits excluded from returns.
- Portfolio withdrawals not treated as losses.
- TWR chaining across multiple subperiods.
- Stale tiny snapshot guard.
- Nearest prior benchmark date alignment.
- Long-term chart baseline guard.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Related commits:
- `4195ad6` - QA portfolio and benchmark returns
- `e8b0405` - Use TWR for portfolio returns
- `87d658c` - Guard TWR against stale manual snapshots
- `9120aa8` - Restore guarded benchmark chart history
- `0cb0356` - Align benchmarks to nearest prior snapshot
- `be10ee0` - Flatten stale portfolio chart baseline

Residual risks / follow-ups:
- Add true money-weighted return / XIRR as a separate personal-investor return.
- Add clearer methodology tooltips for TWR, benchmark price returns, and manual-capital fallback.
- Consider derived portfolio return tables once formulas stabilize.
- Add FX-aware returns once currency conversion is implemented.

## 2026-06-01 - Risk Analytics Layer QA

Scope:
- Volatility calculations.
- Drawdown calculations.
- Concentration risk.
- Correlation analysis.
- Risk contribution.
- Diversification score.
- Data integrity, architecture, UI, and performance review.

Fixes made:
- Fixed holding and asset-class correlations to align return series by date instead of by array position.
- Switched same-folder risk math import in `CorrelationService` to a relative import for test/runtime portability.

Tests added or improved:
- Uneven price-history correlation test.
- Existing coverage confirmed for volatility, drawdown, concentration, diversification, covariance risk contribution, and synthetic portfolio drawdown.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Related commit:
- `8a85616` - Align risk correlations by date

Findings:
- No critical issues remained after the correlation fix.
- Service/repository pattern is preserved.
- No direct Supabase or FMP calls from UI components.
- Risk report caching through `portfolio_risk_reports` is working as a portable derived-report table.

Residual risks / follow-ups:
- Portfolio volatility currently uses stored portfolio snapshots, so deposits/withdrawals can distort volatility until TWR-style volatility or synthetic current-weight volatility is added.
- Multi-currency risk remains native-currency based until FX conversion is added.
- Risk cache invalidation currently relies mainly on taxonomy version/date behavior; later it should consider latest snapshot and price freshness.
- Add methodology tooltips for snapshot volatility, covariance risk contribution, proxy risk contribution, and synthetic drawdown.
- Add explicit tests for cash-only, crypto-heavy, and bond-heavy portfolio reports at the service level.

## 2026-06-01 - Pre-Bond Intelligence Checkpoint

Purpose:
- Capture the current QA state before starting the Bond Intelligence Foundation layer.
- Keep a running checkpoint that future QA reviews should update after each major layer is completed.

Current readiness:
- The existing app foundation is ready to proceed to Bond Intelligence.
- No critical QA blocker is currently recorded for moving into the next layer.
- The strongest foundations already in place are the cloud-portable service/repository structure, provider-agnostic market data flow, instrument universe, canonical taxonomy, benchmark comparisons, and risk analytics cache.

Layer status summary:
- Core MVP is stable enough for continued development after auth, setup, cash, holdings, transaction, dashboard, and Vercel build fixes.
- FMP market data integration is working through server-side provider adapters, with retry and partial-response handling.
- Portfolio analytics is usable after return, cash-flow, inception, and dashboard UX fixes.
- Benchmarking is integrated into dashboard performance, with aligned benchmark dates and chart baseline fixes.
- Instrument universe and watchlist layers are seeded, refreshable, and using derived market metrics for faster UI loading.
- Taxonomy normalization is in place, so raw FMP sector/theme values should not drive intelligence logic directly.
- Risk analytics is functional, including volatility, drawdown, concentration, correlation, diversification, covariance-based risk contribution, and cached derived reports.

Important fixes already completed:
- Fixed Supabase/Auth cookie typing and Vercel build issues.
- Preserved the no-direct-Supabase/FMP-in-UI architecture rule.
- Prevented deposits and cash additions from being incorrectly counted as portfolio returns.
- Moved portfolio return methodology toward TWR-style chained returns where snapshot and cash-flow data supports it.
- Aligned benchmark comparisons to nearest valid benchmark dates.
- Fixed risk correlations to align uneven price histories by date instead of array position.
- Added canonical sector/theme normalization and removed duplicate theme exposure from the risk page.
- Added derived risk reports and derived instrument market metrics for faster loading.

Low-priority improvements carried forward:
- Add FX-aware portfolio values, returns, cash performance, risk, and allocation reporting.
- Add clearer UI methodology tooltips for TWR, benchmark price returns, manual-capital fallback, snapshot volatility, covariance risk contribution, proxy risk contribution, and synthetic drawdown.
- Add true money-weighted return / XIRR as a separate personal-investor return metric.
- Clarify benchmark price-return versus total-return methodology, especially for dividend ETFs and bond ETFs.
- Add adjusted-close support if provider data and plan limits allow it.
- Add provider health/status logs for failed symbols, stale prices, rate limits, refresh duration, and skipped fresh instruments.
- Add a stronger human approval workflow for universe additions, removals, activation changes, and inactive/reference instrument review.
- Add taxonomy manual override audit trail and unmapped provider-value review workflow.
- Improve risk cache invalidation using latest snapshot, latest price, and taxonomy version inputs.
- Add service-level tests for cash-only, crypto-heavy, and bond-heavy risk reports.
- Add CSV / IBKR ingestion after manual-entry flows remain stable.

Next recommended layer:
- Bond Intelligence Foundation.

Future QA process:
- After each completed major layer, append a new dated QA entry to this file.
- Update this checkpoint or add a new checkpoint before moving into the next major phase.
- Carry unresolved low-priority items forward until they are either implemented, superseded, or explicitly deferred.

## 2026-06-01 - Bond Intelligence Foundation Implementation QA

Scope:
- Bond ETF classification.
- Duration exposure.
- Credit exposure.
- Inflation-linked exposure.
- Treasury/corporate split.
- Cash-like bond exposure.
- Bond Intelligence dashboard.
- Risk Analytics bond summary integration.

Implemented:
- Added deterministic bond services:
  - `BondService`
  - `BondAnalyticsService`
  - `BondProfileService`
  - `DurationAnalysisService`
  - `CreditExposureService`
- Added `/bonds` dashboard route.
- Added Bonds navigation item.
- Added bond analytics cards to the Risk Analytics page.
- Added seed normalization migration for bond ETF classifications, including BNDX.
- Added tests for bond classification, duration exposure, credit exposure, inflation-linked exposure, treasury/corporate split, cash-like allocation, no-bond case, and bond-heavy warning case.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- No AI, recommendations, Market Vision, scoring, or telemetry logic was added.
- Bond calculations are deterministic and service-layer based.
- UI components read through server services and do not call Supabase or FMP directly.
- Existing `bond_profiles` remains the source of curated fixed-income classifications.
- FMP metadata remains supplemental and does not overwrite curated bond profile logic in this layer.

Residual risks / follow-ups:
- Apply `supabase/migrations/016_bond_intelligence_foundation.sql` in Supabase before expecting BND/AGG/BNDX and related profiles to show the newest canonical classifications in deployed data.
- Bond math is intentionally simple; duration convexity, yield, spread duration, SEC yield, effective duration, and option-adjusted spread remain future enhancements.
- Multi-currency bond exposure still relies on native value estimates until FX conversion is implemented.
- Add manual bond profile editing/admin review later if the curated classifications need user-level overrides in the UI.
- Add deeper integration into future allocation, scenario, Market Vision, and recommendation layers after those modules exist.

## 2026-06-01 - Bond Intelligence Enrichment QA

Scope:
- Yield placeholders.
- Effective duration placeholders.
- Spread duration placeholders.
- Bond scenario impacts.
- Bond diagnostics.
- Allocation-engine-ready guidance.
- Manual bond profile editing.

Implemented:
- Added enriched bond profile fields:
  - SEC yield
  - distribution yield
  - yield-to-maturity
  - yield as-of date
  - effective duration
  - average maturity
  - spread duration
  - option-adjusted spread
  - expense ratio
  - manual override flag
- Added deterministic scenario impacts:
  - rates +1%
  - rates -1%
  - inflation surprise
  - recession
  - credit spread widening
- Added bond diagnostics and allocation guidance messages.
- Added manual bond profile edit forms on the Bond Intelligence page.
- Extended bond analytics tests to cover scenario generation.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- No AI, recommendations, Market Vision, scoring, or telemetry logic was added.
- Scenario impacts remain deterministic and intentionally simple.
- Effective duration and spread duration are seeded placeholders until richer ETF provider data is added.
- Manual profile updates use server actions and repository/service layers.

Residual risks / follow-ups:
- Apply `supabase/migrations/017_bond_profile_enrichment.sql` after applying migration 016.
- Yield and duration placeholders should eventually be replaced or reviewed against issuer/provider data.
- Scenario math is first-order and does not include convexity, currency hedging, callable bond behavior, changing yield curves, or credit migration.
- Manual profile editing is intentionally simple; a fuller admin workflow can add audit history and review status later.

## 2026-06-01 - Bond Intelligence Layer QA

Scope:
- Bond ETF universe and classification accuracy.
- Duration, credit, treasury/corporate, inflation-linked, cash-like, recession-hedge, and credit-risk exposure calculations.
- Rate, inflation, and recession sensitivity labels.
- Portfolio and Risk Analytics integration.
- Bond profile migrations and data integrity.
- Service architecture, taxonomy consistency, UI/UX, edge cases, and test coverage.

Fixes made:
- Updated the runtime universe seed service so the `Seed universe` action uses the same Bond Intelligence classifications as the migrations and services.
- Corrected aggregate bond seed labels from coarse `aggregate` duration to `intermediate` duration and `mixed investment grade` credit quality.
- Corrected HYG seed labels to `short/intermediate`, `high yield`, and negative recession sensitivity.
- Corrected SGOV/BIL/SHY/IEF/TLT/TIP/LQD classifications to the canonical foundation labels.
- Counted government inflation-linked bonds as treasury/government exposure in treasury split calculations.
- Replaced the misleading bond profile coverage heuristic with a check for populated duration/type/credit fields.
- Prevented manual bond profile edits from attempting to write invalid rows for manually entered bond ETFs that are not in the curated instrument universe.
- Hid bond profile edit forms for non-curated synthetic/manual bond ETF rows and added a clear empty state.

Tests added or improved:
- Full seeded bond ETF universe classification test for SGOV, BIL, SHY, IEF, TLT, BND, AGG, TIP, LQD, HYG, and BNDX.
- Missing bond metadata test to confirm safe deterministic defaults.
- Existing bond analytics tests confirmed duration exposure, treasury/corporate split, credit exposure, inflation-linked exposure, cash-like exposure, no-bond case, and bond-heavy warning case.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- Classification accuracy is good for the Phase 2/early Phase 3 fixed-income foundation.
- Calculations are deterministic and centralized in bond services.
- Bond ETFs are included in portfolio valuation through existing holdings/price flows and in risk analytics through existing risk contribution logic.
- Cash-like bond ETFs are treated as bond ETFs with cash-like duration, not as actual cash balances.
- `bond_profiles` links to `instruments` through the existing primary-key foreign key.
- Manual bond profile overrides are stored in `bond_profiles` and are not overwritten by the enrichment migration.
- FMP metadata is not used directly for bond intelligence classifications.
- The Bond Intelligence page uses services/actions rather than direct Supabase or FMP calls.
- Taxonomy is consistent with `Bonds / Fixed Income` and canonical themes for seeded bond ETFs.

Critical issues:
- None remaining after this QA pass.

Medium-priority issues fixed:
- Runtime seed action could reintroduce older/coarser bond classifications.
- Treasury exposure did not explicitly include government inflation-linked exposure.
- Manual bond profile edit action could attempt an invalid foreign-key write for synthetic manual bond ETF rows.

Low-priority improvements:
- Replace seeded effective-duration and spread-duration placeholders with issuer/provider-reviewed values.
- Add an audit trail for manual bond profile changes.
- Add explicit methodology text/tooltips for duration-based scenario impacts.
- Add richer fixed-income data later if FMP proves insufficient for actual duration/yield/credit breakdown.
- Add issuer/provider timestamp and confidence score per bond profile field.
- Add service-level tests for inactive bond ETF holdings once inactive holdings behavior is explicitly defined.

Production-readiness assessment:
- Ready to proceed to the next layer after applying migrations 016 and 017 in Supabase.
- Suitable for deterministic bond ETF exposure intelligence.
- Not yet suitable for institutional-grade bond risk decomposition, because convexity, yield-curve shocks, callable behavior, currency hedging, and credit migration are intentionally out of scope.

## 2026-06-01 - Bond Intelligence Future Improvement Checkpoint

Purpose:
- Preserve lower-priority Bond Intelligence enhancements for future phases after the current foundation layer.

Future improvements:
- Replace seeded placeholders with issuer/provider-reviewed values for effective duration, spread duration, SEC yield, yield-to-maturity, distribution yield, average maturity, option-adjusted spread, and expense ratio.
- Add bond data freshness indicators so the UI shows when each bond profile was last reviewed or refreshed.
- Add field-level confidence/source labels for bond profile values:
  - seeded
  - manually reviewed
  - provider-sourced
  - stale
  - missing
- Add manual edit audit history for bond profiles, including changed field, previous value, new value, editor, and timestamp.
- Add methodology tooltips for effective duration, rate-shock impact, spread duration, recession hedge role, inflation-linked exposure, and cash-like bond ETF treatment.
- Improve scenario math later with convexity, yield-curve steepening/flattening, real-rate shocks, credit spread shocks by quality, currency hedging, callable bond behavior, and credit migration.
- Add richer provider or issuer data only if FMP plus manual profiles becomes limiting for exact bond ETF duration, yield, credit breakdown, or maturity breakdown.
- Integrate Bond Intelligence into the future allocation engine so allocation logic can distinguish cash-like ETFs, short treasuries, intermediate aggregate bonds, long treasuries, TIPS, corporate credit, and high yield.
- Add bond-specific benchmarking for the bond sleeve against BND, AGG, short Treasury, long Treasury, TIPS, corporate bond, and high-yield proxies.
- Add deeper service-level tests for inactive bond ETF behavior, manually edited profile persistence, bond-only portfolios, cash-like-only sleeves, TIPS-only sleeves, and high-yield-heavy sleeves.

## 2026-06-01 - Market Vision Skeleton Implementation QA

Scope:
- Market Vision dashboard/page.
- Manual draft/edit/publish/archive workflow.
- Market Vision report model.
- Macro indicators foundation.
- Deterministic market theme classification.
- Future AI/FMP/FRED integration placeholders.

Implemented:
- Added `/market-vision` dashboard route and navigation item.
- Added `market_vision_reports`, `macro_indicators`, and `market_theme_events` migration.
- Added manual workflow server actions:
  - create draft report
  - save draft sections
  - publish report
  - archive report
  - view latest/selected report
- Added Market Vision service/repository architecture:
  - `MarketVisionRepository`
  - `SupabaseMarketVisionRepository`
  - `MarketVisionService`
  - `MacroIndicatorService`
  - `MarketThemeService`
- Added future AI compatibility placeholders:
  - `AiMarketVisionProvider`
  - `MARKET_VISION_PROMPT_TEMPLATE`
  - `GenerateMarketVisionReportJob`
- Added tests for report lifecycle, macro indicator display logic, deterministic market theme classification, and empty-state dashboard behavior.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Findings:
- No AI summarisation, recommendations, scoring, or telemetry logic was added.
- Market Vision remains manual/admin-driven in this phase.
- Supabase access is isolated in the repository layer; the UI uses server services/actions.
- No FMP calls are made from the Market Vision UI.
- Macro indicators are placeholder/manual rows prepared for later FRED/FMP ingestion.
- Market theme classification is deterministic and separate from future AI-generated source text.

Residual risks / follow-ups:
- Apply `supabase/migrations/018_market_vision_skeleton.sql` in Supabase before using the deployed Market Vision page.
- Add actual market theme event creation/editing UI later; current skeleton displays stored events but report editing focuses on report sections.
- Add FRED ingestion for macro indicators in a later phase.
- Add FMP market context ingestion in a later phase.
- Add OpenAI summarisation only after the deterministic report workflow and data sources are QA'd.
- Add richer error/loading UX if report workflows become more complex.

## 2026-06-01 - Market Vision Skeleton Comprehensive QA

Scope:
- Market Vision Skeleton only.
- Report page structure, manual workflow, data models, service/repository architecture, UI/UX, future AI compatibility, and database readiness.
- Explicitly excluded AI summarisation, news feeds, recommendations, scoring, and telemetry.

Architecture assessment:
- Market Vision UI uses server actions and services; Supabase access remains isolated in `SupabaseMarketVisionRepository`.
- No FMP, FRED, or OpenAI calls are made from UI components.
- `MarketVisionService`, `MacroIndicatorService`, and `MarketThemeService` keep deterministic logic centralized.
- Future AI hooks exist as interfaces/placeholders only, without generation behavior.
- Cloud portability is preserved because the repository interface can later be backed by Cloud SQL/PostgreSQL without changing UI components.

Data model assessment:
- `market_vision_reports` supports weekly manual reports with executive, equity, bond, gold, crypto, rates, inflation, currency, geopolitical, risks, opportunities, and portfolio implication sections.
- `macro_indicators` supports rates, inflation, yields, employment, growth, currency, commodities, and liquidity with provider/source tracking for future FRED/FMP ingestion.
- `market_theme_events` supports deterministic classification into short-term noise, medium-term theme, and structural long-term shift with severity, persistence, confidence, and affected exposure fields.
- Theme events cascade on report deletion, preventing orphaned rows.
- Latest report retrieval is indexed by status and report date.

UX assessment:
- The Market Vision page has a clear CIO-style section order and keeps manual draft editing separate from published report reading.
- Empty state, draft/published/archived status indicators, report selector, macro indicator cards, theme table, risks/opportunities, and portfolio implications are present.
- The page remains mobile-friendly through grid-based layouts and compact cards.

Critical issues:
- None found.

Medium-priority issues fixed:
- Missing-table handling now gracefully covers `market_vision_reports`, `macro_indicators`, and `market_theme_events`, so the page degrades safely before migration 018 is applied.
- Report upserts no longer overwrite `classification_summary` with `{}` when saving manual drafts.
- Draft creation now preserves an explicitly supplied classification summary, which protects future generated/imported workflows.

Tests added or improved:
- Added a regression test confirming draft saves preserve an existing classification summary when the save payload does not supply one.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Low-priority improvements:
- Add manual create/edit UI for market theme events once the skeleton moves beyond report-section editing.
- Add report versioning or revision history before AI-generated drafts are introduced.
- Add role-based admin permissions for report publishing if multiple users/accounts are supported.
- Add richer field-level validation for report period dates and publish readiness.
- Add source citation fields for future FRED/FMP/news-derived report sections.
- Add a structured portfolio implication schema per asset class before recommendations are connected.
- Add dedicated loading/error components if report workflows become more interactive.

Future AI compatibility assessment:
- Ready for a later AI generation service because report fields, theme classifications, source type, status, and prompt/provider placeholders are already separated from UI rendering.
- AI output should write drafts only, with human review before publish.
- News and macro retrieval should be implemented as provider services and background jobs, not direct UI calls.

Production-readiness assessment:
- Ready as a manual Market Vision skeleton after migration 018 is applied in Supabase.
- Not yet production-ready as an automated CIO briefing, because data streams, source citations, AI summarisation, versioning, and approval workflow hardening remain future phases.

## 2026-06-01 - News Intelligence Layer Implementation Checkpoint

Scope:
- News ingestion, deduplication, instrument linking, classification foundation, weekly reconciliation foundation, cron routes, admin UI, and light Market Vision integration.
- Explicitly excluded scoring, buy/sell recommendations, telemetry learning, and unrestricted chatbot behavior.

Implemented:
- Added FMP news provider behind a provider-agnostic `NewsProvider` port.
- Added optional OpenAI news classification/reconciliation provider behind `NewsAiProvider`.
- Added strict prompt templates that prohibit buy/sell recommendations.
- Added deterministic fallback classification when AI flags are disabled.
- Added daily ingestion and weekly reconciliation job classes.
- Added protected cron-compatible routes:
  - `/api/jobs/daily-news-ingestion`
  - `/api/jobs/weekly-news-reconciliation`
- Added `/news` admin dashboard for latest news, filters, duplicate indicators, classification status, weekly reconciliations, ingestion logs, manual pending classification, and duplicate override.
- Added Market Vision integration showing the latest weekly news reconciliation and creating a draft from it.

Database migration:
- Added `supabase/migrations/019_news_intelligence.sql`.
- New portable PostgreSQL tables:
  - `news_items`
  - `news_classifications`
  - `news_groups`
  - `weekly_news_reconciliations`
  - `news_ingestion_logs`

Architecture assessment:
- UI components do not call Supabase, FMP, or OpenAI directly.
- FMP and OpenAI keys remain server-side only.
- Repository/service/provider boundaries are preserved.
- Cron route protection uses `CRON_SECRET` and is compatible with Vercel Cron or Google Cloud Scheduler.
- Cost controls are configurable through environment variables and service config.

Tests added:
- News normalization/deduplication hash behavior.
- Instrument linking by symbol.
- Classification JSON validation and score clamping.
- Invalid model output fallback behavior.
- Duplicate and already-classified skip behavior.
- Weekly grouping and reconciliation creation.
- Cron secret validation.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Known limitations:
- FMP is the only live news provider in this phase.
- AI classification and weekly reconciliation are disabled by default.
- Weekly summaries use deterministic fallback until AI flags and `OPENAI_API_KEY` are configured.
- Manual review UI is basic; it supports duplicate override and pending classification but not full article editing.
- FMP endpoint availability can vary by plan, so first live run should be checked through ingestion logs.

Future improvements:
- Add source allowlists/denylists when real FMP source quality is observed.
- Add fuzzy title matching beyond canonical title/date hashing.
- Add richer manual review/edit workflow for classifications and linked instruments.
- Add article quality scoring before AI classification.
- Add news source citations into Market Vision drafts.
- Add BigQuery export path for larger-scale historical news analysis.
- Add telemetry later to compare news classification persistence against eventual portfolio/market outcomes.
