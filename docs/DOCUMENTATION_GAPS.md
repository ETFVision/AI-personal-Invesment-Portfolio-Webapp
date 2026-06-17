# Documentation Gaps and Follow-Up Audit List

Last updated: 2026-06-17 SGT

This document records areas where the handover pack intentionally avoids guessing. These should be verified before commercialization or before a new developer changes related logic.

An independent deep architecture audit with live read-only database verification was completed on 2026-06-16; see `docs/ARCHITECTURE_AUDIT_2026-06-16.md`. Several items below now carry confirmed live evidence from that pass and are marked accordingly.

## High Priority

1. RLS policy audit
   - **Closed 2026-06-17:** pre-commercial read-policy hardening completed for the identified broad authenticated-read policies on assistant and telemetry tables.
   - Migration `109_rls_hardening.sql` replaces broad `auth.role() = 'authenticated'` SELECT policies with user-scoped policies on `assistant_conversations`, `assistant_messages`, `assistant_usage_logs`, `telemetry_recommendation_snapshots`, `telemetry_portfolio_review_snapshots`, `telemetry_recommendation_outcomes`, and `telemetry_portfolio_review_outcomes`.
   - Live `pg_policies` verification returned 7 rows with `users can read own ...` policy names for all seven tables.
   - **Confirmed live 2026-06-16 (see `ARCHITECTURE_AUDIT_2026-06-16.md` section 1A):** every public table currently has exactly one `SELECT`-only policy and **zero INSERT/UPDATE/DELETE policies**; user-table writes rely entirely on the service role plus application-layer `userId` scoping. Add owner-scoped write policies where needed, or formally document and test the service-role-only write model.
   - **Updated 2026-06-16:** `assets` now has migration `106_assets_rls.sql`, which enables RLS and adds one authenticated SELECT policy. No write policies were added, preserving default-deny writes for non-service-role callers. This closes the specific `assets` RLS-disabled gap.
   - **Updated 2026-06-16:** `portfolio_dashboard_summary` and `portfolio_performance_summary` now have migration `107_portfolio_summary_rls_policies.sql`, which adds user-scoped SELECT policies through `portfolio_id` -> `portfolios.user_id = auth.uid()`.
   - **Updated 2026-06-16:** `ingestion_events` is confirmed unused by current `src/` code and remains intentionally blocked with no policy.
   - **Updated 2026-06-16:** the zero-write-policy service-role model is formally documented in `SECURITY_AND_ACCESS_ARCHITECTURE.md`.
   - **Closed 2026-06-16:** `instrument_directory_summary` confirmed as an orphaned experimental table from page-rendering performance work; implementation reverted per `docs/PAGE_RENDERING_AUDIT.md`. Not present in any migration or source file. No policy added; no policy needed. No further action required.

2. Alpha branch feature gate audit
   - Validate on `alpha` branch, not only `development`.
   - Confirm Admin/Data Sources and internal diagnostics are not exposed if not intended for alpha.
   - `qa-log.md` records alpha realignment during page rendering work, but a complete route-by-route alpha feature audit remains open.
   - **Updated 2026-06-16:** app-level admin authorization is now implemented through `AuthProvider.requireAdmin()` and environment allowlists (`ADMIN_USER_IDS`, optional `ADMIN_EMAILS`). `/admin/*`, `/setup/taxonomy`, and admin-only server actions are guarded, and the Admin nav is hidden for non-admins.
   - **Updated 2026-06-16:** runtime product-mode gating is implemented through server-only `PRODUCT_MODE=alpha|full`. Alpha mode hides News & Themes, Macro, Assistant, Telemetry, and Admin navigation; middleware blocks non-alpha routes; Market Vision shows published reports only and hides editorial actions.
   - Remaining gap: there is still no DB-backed `users.is_admin` role.
   - **QA passed 2026-06-16:** admin nav visible for admin users, hidden for non-admins; direct `/admin/*` requests return 404 for non-admins. Confirmed in Vercel preview deployment.
   - **QA passed 2026-06-16:** `PRODUCT_MODE=alpha` correctly hides nav items, blocks routes, suppresses Assistant drawer, and restricts Market Vision to published reports. `PRODUCT_MODE=full` restores full surface. Logo issue in alpha mode resolved (middleware asset exclusion fix — see implementation log). All checks passed; platform cleared for alpha invites.

3. Price-refresh route reconciliation (closed 2026-06-17)
   - **Confirmed live 2026-06-16:** `/api/jobs/price-refresh` is not present in `cron.job`. The active daily chain uses `instrument-price-refresh` ×5 + `portfolio-valuation-refresh`.
   - **Closed 2026-06-17:** orphaned `/api/jobs/price-refresh` HTTP route deleted. `RefreshPortfolioPricesJob`, user-triggered server actions, and `/api/jobs/instrument-price-refresh` are preserved. Live cron confirmation remains the 2026-06-16 architecture audit result: `price-refresh` absent from `cron.job`; active daily chain uses `instrument-price-refresh` ×5. `docs/chatgpt-handover.md` (which contained the stale unified-price-refresh description) was removed separately on 2026-06-17.

4. Daily derived-metrics chain reliability and job monitoring
   - **Confirmed live 2026-06-16 (`job_runs`, 7-day window):** `instrument-daily-returns-refresh` (3 failed), `instrument-return-anchors-refresh` (2 failed), and `instrument-market-metrics-refresh` (1 failed) intermittently fail; `refresh_instrument_risk_metrics` is mostly skipped (68 skipped / 39 success); `newsdata-news-ingestion` is chronically `partial_success` (7/7).
   - **Updated 2026-06-16:** all five failing jobs (`instrument-daily-returns-refresh`, `instrument-return-anchors-refresh`, `instrument-market-metrics-refresh`, `refresh_instrument_risk_metrics`, `newsdata-news-ingestion`) are resolved for now. Root cause for anchor refresh was duplicate daily-return work, fixed in migration `101`. Monitor in future runs.
   - Remaining gap: no alerting exists on required-chain failures. Add job-failure alerting before commercial launch so persistent failures surface without manual `job_runs` inspection.

5. Signup restriction and assistant rate-limit
   - **Implemented 2026-06-16:** signup restriction and assistant daily rate-limit are implemented and configurable.
   - `ALLOWED_SIGNUP_EMAILS` gates new registration in `SupabaseAuthProvider.signUpWithPassword`; empty value preserves open signup for development, non-empty value makes signup invite-only.
   - Login UI hides the Create account button and shows "Early access only. Contact us to request an invitation." when the allowlist is set.
   - `ASSISTANT_DAILY_LIMIT` adds a per-user daily assistant conversation cap; `0` preserves unlimited development/default behavior. The assistant API returns HTTP 429 with a user-friendly reset message when exceeded.
   - Before alpha invites, set `ALLOWED_SIGNUP_EMAILS` and `ASSISTANT_DAILY_LIMIT` in Vercel.

6. AI cost constants and model ID validation
   - **Implemented 2026-06-16:** `gpt-5.4-mini` confirmed as a valid OpenAI model ID for Portfolio Assistant and Market Vision.
   - `.env.example` now includes real current pricing for Portfolio Assistant and Market Vision: input `$0.75 / 1M tokens`, output `$4.50 / 1M tokens`.
   - `env.ts` keeps runtime defaults at `0` for cost variables so existing deployments do not break; set non-zero values in Vercel production environment variables for real spend tracking in Admin > Assistant Usage.
   - Note: `OpenAiNewsProvider` also calls OpenAI but is disabled by default (`ENABLE_AI_NEWS_CLASSIFICATION=false`, `ENABLE_WEEKLY_NEWS_RECONCILIATION=false`); news model cost tracking is deferred until those features are enabled.

7. Migration tracking and numbering
   - **Confirmed live 2026-06-16:** `supabase_migrations.schema_migrations` does not exist, so applied migration state cannot be verified from a ledger.
   - Duplicate-numbered files exist (`052`, `061`, `062`). Adopt tracked/timestamped migrations and generate a consolidated schema snapshot before commercial launch.

## Medium Priority

1. Market Vision publish/draft lifecycle
   - Verify whether scheduled jobs should publish or create drafts.
   - Follow up in `MarketVisionGenerationService.ts`.
   - Note: the scheduled portfolio-context regression was fixed on 2026-06-14; scheduled generation still creates drafts unless a separate publish policy is approved.
   - **Closed 2026-06-17:** the 2026-06-08 to 2026-06-14 report was regenerated using `market-vision-v3` prompt with `gpt-5.4-mini`, published, confidence 78%, cost $0.053669. All regime scorecard, transition tracker, evidence scores, narrative sections, themes, and portfolio context sections are populated. No recommendation language. Market Vision v3 calibration is closed.

2. CI pipeline enforcement
   - **Closed 2026-06-17:** `.github/workflows/ci.yml` added for pull requests and pushes targeting `development` and `main`. Workflow runs lint, typecheck, test, and build. Branch protection rules enabled (GitHub Team account). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` added as repository secrets. CI verified working end-to-end.

3. CRON_SECRET accepted as URL query parameter
   - **Closed 2026-06-17:** `/api/jobs/*` cron authentication now requires the `Authorization: Bearer <CRON_SECRET>` header only.
   - The `?secret=` query-parameter path was removed from `src/server/jobs/cronAuth.ts`.
   - Supabase Cron and manual fallback scripts already send the Bearer header, so no database migration was required.

4. Assistant table/cost schema
   - Confirm exact assistant tables and cost formulas.
   - Follow up in assistant migrations and `SupabaseAssistantRepository.ts`.
   - **Note 2026-06-16:** cost constants are being addressed in High Priority item #6 (AI cost constants). Once `.env.example` is populated with real values and set in Vercel, Admin > Assistant Usage will show real spend data.

5. News classification formula and thresholds
   - Summarize deterministic rules, confidence scoring, source quality weighting, and review queue conditions.

6. Active universe verification
   - **Closed 2026-06-17:** live Supabase counts confirmed: 196 active `etf` + 5 active `crypto_etf` = 201 ETFs, 105 active `stock` rows. BTC, ETH, SOL raw crypto references are inactive. See `docs/qa-log.md` — Task 12.

7. Security Master provider observation automation
   - Phase 6/7 tables exist for corporate actions and provider reconciliation.
   - Future metadata refresh should write provider observations and conflict rows once provider-priority rules are approved.
   - Do not auto-resolve identifier conflicts until the review queue has been validated.

8. Score methodology maintenance
   - Formula-level score documentation now exists in `docs/SCORE_METHODOLOGY.md`.
   - Public `/methodology` now presents the formula-level methodology with neutral labels and collapsible technical sections.
   - Future scoring changes must update that document in the same commit.

9. FX conversion not implemented
   - All multi-currency portfolio calculations return native-currency estimates when FX conversion is not performed.
   - No FX rate table or conversion service exists; portfolios with assets in multiple currencies show values in their base currency without cross-currency normalisation.
   - Flagged as low-priority carried-forward item from Phase 2 MVP, Portfolio Analytics, Benchmark, and Risk Analytics QA entries.
   - Resolution: document the limitation explicitly on Portfolio and Risk pages, or implement an FX rate feed and conversion layer.

10. Portfolio volatility distorted by deposits/withdrawals
    - Portfolio volatility currently uses stored portfolio snapshots. Deposits and withdrawals within a measurement window inflate or deflate the apparent volatility of the investment strategy.
    - This is a fundamental difference between raw portfolio-value volatility and true investment-return volatility.
    - Flagged from Risk Analytics Layer QA entry.
    - Resolution: either document this limitation alongside the volatility metric, or switch to return-series-based volatility using daily percentage changes net of external cash flows.

11. Benchmark total-return vs price-return distinction not documented
    - The benchmark returns shown in Portfolio Review and Risk are not clearly labelled as total-return (dividends reinvested) or price-return.
    - Users comparing against published index benchmarks may use different return conventions.
    - Flagged from Benchmark QA entry.
    - Resolution: add a tooltip or footnote on any benchmark return figure clarifying the return convention and data source.

12. XIRR / money-weighted return missing
    - The platform implements TWR (time-weighted return) for portfolio performance.
    - XIRR / money-weighted return, which accounts for the timing and size of cash flows, is the return figure most personal investors recognise from brokerage statements.
    - Flagged from Portfolio Return QA entry as a low-priority carried-forward improvement.
    - Resolution: implement XIRR calculation in `PortfolioPerformanceService` using the existing transaction and cash-flow data, and surface it alongside TWR on the Portfolio dashboard.

13. Page data map documentation
   - **Closed 2026-06-17:** canonical route-to-data lineage map created in `docs/PAGE_DATA_MAP.md`.

14. Portfolio dashboard page map
   - **Closed 2026-06-17:** Portfolio Group page lineage documented in `docs/PAGE_DATA_MAP.md`.

15. Universe and watchlist page map
   - **Closed 2026-06-17:** Instruments Group page lineage documented in `docs/PAGE_DATA_MAP.md`.

16. Market Vision UI and lifecycle map
   - **Closed 2026-06-17:** Market Vision page lineage and lifecycle dependencies documented in `docs/PAGE_DATA_MAP.md`.

17. News and themes page map
   - **Closed 2026-06-17:** News and Themes page lineage documented in `docs/PAGE_DATA_MAP.md`.

18. Macro page map and integration lineage
   - **Closed 2026-06-17:** Macro page lineage and downstream integration dependencies documented in `docs/PAGE_DATA_MAP.md`.

19. Fundamentals page map
   - **Closed 2026-06-17:** Fundamentals overview and detail routing documented in `docs/PAGE_DATA_MAP.md`.

20. Risk page map
   - **Closed 2026-06-17:** Risk page lineage and cache dependencies documented in `docs/PAGE_DATA_MAP.md`.

21. Fixed income page map
   - **Closed 2026-06-17:** Fixed Income page lineage, bond profile source, and manual override dependencies documented in `docs/PAGE_DATA_MAP.md`.

22. Insights page map
   - **Closed 2026-06-17:** Insights page and instrument detail insight dependencies documented in `docs/PAGE_DATA_MAP.md`.

23. Portfolio Review page map
   - **Closed 2026-06-17:** Portfolio Review page lineage, gap-analysis dependencies, and refresh dependencies documented in `docs/PAGE_DATA_MAP.md`.

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

5. Future ETF universe additions — Factor Investing and Option Income
   - Nine candidate ETFs confirmed with FMP profile metadata, EOD prices, and historical price data.
   - Factor Investing: `QUAL`, `SPHQ`, `JQUA`, `MTUM`, `USMV`, `SPLV`.
   - Option Income: `JEPI`, `JEPQ`, `SPYI`.
   - Two new ETF product categories will be needed in `alphaUniverse.ts`: `FACTOR_INVESTING` and `OPTION_INCOME` (add to `EtfCategory` type and `ETF_CATEGORY_LABELS`).
   - Seed only after deciding whether alpha mode should expose the expanded categories.
   - After seeding: run Seed Universe, instrument metadata refresh, market history backfill, ETF look-through refresh, daily returns, return anchors, market metrics, risk metrics, and summary refresh QA.
   - Source: `docs/qa-log.md` — "2026-06-12 22:20 SGT - Future ETF Universe Completion Candidate".

## Recently Closed Documentation Gaps

Closed on 2026-06-15:

- Product compliance and public methodology surfaces are now documented in:
  - `docs/ARCHITECTURE_OVERVIEW.md`
  - `docs/SCORE_METHODOLOGY.md`
  - `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
  - `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
  - `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
  - `docs/qa-log.md`
- The first-login disclaimer modal, sticky footer disclaimer, full-disclaimer modal, export/report disclaimer helper, `/methodology`, and `/legal/disclosures` placeholder are covered in the handover pack.
- Portfolio Review user-facing gap analysis wording is now documented as deterministic underweighted-category screening rather than action-oriented candidate suggestions.
- The public methodology page is documented as the user-facing presentation layer for formula-level score methodology, with internal labels kept out of public assessment tables.

Closed on 2026-06-13:

- Security Master Phase 5 identity propagation is now documented in:
  - `docs/SECURITY_MASTER_AUDIT.md`
  - `docs/DATABASE_SCHEMA.md`
  - `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
  - `docs/TELEMETRY_ARCHITECTURE.md`
- Recommendation and telemetry history now preserve historical symbols while storing optional stable `security_id` / `issuer_id` for future ticker/share-class continuity.
- Security Master Phase 8 monitoring, Phase 6 corporate-action readiness, and Phase 7 provider reconciliation readiness are now documented in:
  - `docs/SECURITY_MASTER_AUDIT.md`
  - `docs/DATABASE_SCHEMA.md`
  - `docs/ARCHITECTURE_OVERVIEW.md`
  - `docs/qa-log.md`
- Security Master full QA/QC closeout is now documented in:
  - `docs/SECURITY_MASTER_AUDIT.md`
  - `docs/COMMERCIALIZATION_AUDIT_PLAN.md`
  - `docs/README.md`
  - `docs/qa-log.md`
- Security Master is marked completed for the current commercialization checkpoint. Remaining corporate-action ingestion and multi-provider observation automation are future operational extensions, not current audit blockers.

Closed on 2026-06-12 22:36:00 +08:00:

- Security Master Phase 4C/4D architecture is now reflected in the main handover pack:
  - `docs/ARCHITECTURE_OVERVIEW.md`
  - `docs/DATABASE_SCHEMA.md`
  - `docs/DATA_INGESTION_AND_PROVIDERS.md`
  - `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
  - `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
  - `docs/ASSISTANT_ARCHITECTURE.md`
- The documentation index now includes a handover status snapshot mapping audits to authoritative docs and remaining risks.

Closed on 2026-06-11 20:34:49 +08:00:

- Exact portfolio TWR and cash-flow methodology documented in `docs/CALCULATION_METHODOLOGY.md`.
- ETF exposure table and column map documented in `docs/DATABASE_SCHEMA.md`.
- FMP fundamentals endpoint-to-field lineage documented in `docs/DATA_INGESTION_AND_PROVIDERS.md`.
- Risk analytics page methodology documented in `docs/SCORE_METHODOLOGY.md`.
- Fixed income page methodology and bond profile schema documented in `docs/SCORE_METHODOLOGY.md` and `docs/DATABASE_SCHEMA.md`.
