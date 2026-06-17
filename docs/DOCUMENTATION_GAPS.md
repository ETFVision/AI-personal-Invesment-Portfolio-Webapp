# Documentation Gaps and Follow-Up Audit List

Last updated: 2026-06-17 SGT

This document records areas where the handover pack intentionally avoids guessing. These should be verified before commercialization or before a new developer changes related logic.

An independent deep architecture audit with live read-only database verification was completed on 2026-06-16; see `docs/ARCHITECTURE_AUDIT_2026-06-16.md`. Several items below now carry confirmed live evidence from that pass and are marked accordingly.

## Status Summary

| Priority | Total items | Open | Closed |
|---|---|---|---|
| High | 10 | 8 | 2 |
| Medium | 39 | 24 | 15 |
| Low | 13 | 13 | 0 |
| **Total** | **62** | **45** | **17** |

**Open blockers — before public alpha:**

| Item | Description |
|---|---|
| High 2 | Alpha feature gate — formal route access matrix and alpha git branch audit |
| High 4 | Job failure alerting not yet implemented |
| High 7 | Migration tracking — no schema ledger, duplicate-numbered files remain |
| Medium 24 | Data provider full-universe coverage matrix not produced |
| Medium 26 | Calculation golden regression suite and manual validation pack |
| Medium 27 | AI output regression tests not yet written |
| Medium 32 | Alpha UX walkthrough not yet conducted |
| Medium 36 | Service-role key client component check — confirm no service-role key in browser |
| Medium 37 | Email deliverability — verify Supabase auth emails reach alpha users |
| Medium 38 | Runtime error monitoring — no error tracking currently in place |
| Medium 39 | New user onboarding — first-login empty state has no guidance today |

**Open blockers — before first paying user:**

| Item | Description |
|---|---|
| High 8 | Legal and compliance — qualified legal review required |
| High 9 | Data licensing — provider licensing confirmation required |
| High 10 | User privacy — data retention, export and deletion capability |
| Medium 31 | Database — formal index audit, backup policy, restore process |
| Medium 34 | Cost control — provider quota register and budget alerting |
| Medium 35 | Error handling and empty state full inventory |

**Pre-alpha configuration pending:**

| Item | Description |
|---|---|
| High 5 | Set `ALLOWED_SIGNUP_EMAILS` and `ASSISTANT_DAILY_LIMIT` in Vercel before alpha invites |
| Medium 37 | Test Supabase auth email delivery end-to-end before first invite is sent |

---

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
   - **Remaining open items:** confirm no service-role key is used in client components; confirm job endpoints reject unauthenticated requests in production; external penetration test before 100+ users.

2. Alpha branch feature gate audit
   - Validate on `alpha` branch, not only `development`.
   - Confirm Admin/Data Sources and internal diagnostics are not exposed if not intended for alpha.
   - `qa-log.md` records alpha realignment during page rendering work, but a complete route-by-route alpha feature audit remains open.
   - **Updated 2026-06-16:** app-level admin authorization is now implemented through `AuthProvider.requireAdmin()` and environment allowlists (`ADMIN_USER_IDS`, optional `ADMIN_EMAILS`). `/admin/*`, `/setup/taxonomy`, and admin-only server actions are guarded, and the Admin nav is hidden for non-admins.
   - **Updated 2026-06-16:** runtime product-mode gating is implemented through server-only `PRODUCT_MODE=alpha|full`. Alpha mode hides News & Themes, Macro, Assistant, Telemetry, and Admin navigation; middleware blocks non-alpha routes; Market Vision shows published reports only and hides editorial actions.
   - Remaining gap: there is still no DB-backed `users.is_admin` role.
   - **QA passed 2026-06-16:** admin nav visible for admin users, hidden for non-admins; direct `/admin/*` requests return 404 for non-admins. Confirmed in Vercel preview deployment.
   - **QA passed 2026-06-16:** `PRODUCT_MODE=alpha` correctly hides nav items, blocks routes, suppresses Assistant drawer, and restricts Market Vision to published reports. `PRODUCT_MODE=full` restores full surface. Logo issue in alpha mode resolved (middleware asset exclusion fix — see implementation log). All checks passed; platform cleared for alpha invites.
   - **Remaining open items:** produce a formal route access matrix document; conduct alpha git branch audit to confirm the branch can receive main updates without patchwork drift.

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

8. Legal and compliance — qualified legal review
   - The product compliance framework is implemented: first-login disclaimer acknowledgement modal, persistent footer disclaimer, full-disclaimer modal, export/report disclaimer helper, public `/methodology` page, and `/legal/disclosures` placeholder.
   - Public wording states that scores are deterministic analytical classifications for informational purposes only and not investment advice, securities ratings, or buy/sell/hold recommendations.
   - Remaining: the current implementation is product positioning, not a legal opinion. A qualified legal review of Terms of Service, Privacy Policy, disclaimers, data licensing obligations, and PDPA obligations is required before first paying users.
   - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 15.

9. Data licensing — provider licensing confirmation
   - FMP, FRED, NewsData.io, and GDELT data is used for portfolio analytics, market data, fundamentals, macro context, and news intelligence.
   - Remaining: confirm commercial use rights, redistribution restrictions, attribution requirements, API plan limits, caching and storage rights, and user-facing display rights for each provider before charging users. This audit has not been meaningfully performed.
   - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 16.

10. User privacy audit — data retention, export and deletion
    - User portfolios, transactions, holdings snapshots, assistant conversations, assistant messages, and telemetry snapshots are stored in Supabase.
    - RLS hardening (migration 109) addresses per-user read isolation, but data lifecycle management is not yet implemented.
    - Remaining: define and implement data retention policy; build user data export capability; build account deletion or data removal capability; document third-party data sharing disclosure. Required before first paying users and ideally before broad alpha.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 19.

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
   - **Updated 2026-06-17:** Universal scoring model change (remove portfolio-dependent components) updated `docs/SCORE_METHODOLOGY.md`, `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`, and `src/app/methodology/page.tsx` in the same session. All five instrument type weight tables, the portfolio-fit formula section, and the three portfolio-dependent guardrail rows were corrected. The methodology page `METHODOLOGY_LAST_UPDATED` constant was set to `2026-06-17`.

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

24. Data provider full-universe coverage matrix
    - FMP coverage has been tested ad hoc for active instruments. A formal matrix covering all 306 active instruments across each data type (prices, fundamentals, ETF holdings, metadata) has not been produced.
    - Remaining: produce a coverage matrix classifying each instrument as `SUPPORTED`, `PARTIAL_SUPPORT`, `UNSUPPORTED`, or `UNKNOWN` per data type. Identify instruments requiring fallback data or development-only demotion.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 2.

25. ETF holdings provider plan expansion monitoring
    - Top holdings are limited under the current FMP plan for many ETFs. Portfolio indirect-holding overlap is partial.
    - Remaining: evaluate FMP plan expansion for richer top-holdings data; monitor ETF-to-security mapping coverage after any plan change. Document which ETFs have complete versus partial top-holdings coverage.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 5.

26. Calculation golden regression suite and manual validation pack
    - Core calculation methodology is documented in `docs/CALCULATION_METHODOLOGY.md` and `docs/SCORE_METHODOLOGY.md`.
    - Remaining: build a golden portfolio regression suite with at least one worked example (TWR, volatility, sector allocation, portfolio score, ETF look-through) validated manually or against a spreadsheet. This is required before first paying users to confirm calculations are correct end-to-end.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 6.

27. AI output regression tests
    - Assistant and Market Vision prompts are hardened. No formal regression test suite exists.
    - Remaining: add question-based regression tests for Portfolio Assistant (hallucination check, no-advice check, missing-data behavior), Market Vision narrative (no allocation language, evidence attribution), and Insights explanations (neutral characteristics framing only). These tests should be repeatable after prompt or model changes.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 8.

28. Market Vision evidence traceability audit
    - Market Vision v3 calibration is complete as of 2026-06-17. A formal evidence traceability audit — verifying that regime scorecard scores link back to stored `macro_observations` and `news_classifications` rows — has not been conducted.
    - Remaining: for at least one published report, trace each evidence confidence score back to its source data rows in the database. Document the evidence-to-report traceability chain.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 9.

29. Recommendation calibration QA after weekly refresh
    - User-facing Insights labels now use neutral characteristics language. Calibration QA has not been run on a full production weekly cycle.
    - Remaining: after at least one complete `app-weekly-recommendation-run` on production data, rerun the calibration QA to confirm no drift in label distribution, scoring, or compliance wording.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 10.

30. Observability and reproducibility matrix
    - Refresh logs, job logs, AI call logs, portfolio snapshots, and holdings snapshots exist.
    - Remaining: produce a reproducibility matrix proving that each major user-facing result (portfolio score, recommendation label, Market Vision report, portfolio review output) can be traced back to its source data, calculation version, and timestamp. Follow up in `docs/TELEMETRY_ARCHITECTURE.md`.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 14.

31. Database index audit, backup policy, and restore process
    - Schema is documented and RLS is hardened through migration 109.
    - Remaining: formal index audit to confirm key query paths are covered (portfolio, holdings, instrument metrics, telemetry); confirm Supabase backup policy is enabled; test restore process on a development database before first paying users.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 18.

32. Alpha UX walkthrough
    - Alpha feature-gate is implemented and browser QA passed 2026-06-16 for route blocking and admin gating.
    - Remaining: end-to-end walkthrough of the alpha product as a new user, covering: no broken navigation or empty states from hidden features, no internal or admin language exposed, known limitations cleanly disclosed, and feature labels consistent with alpha positioning.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 23.

33. Data freshness UX product audit
    - Freshness diagnostics exist in Admin/Data Sources and job run logs.
    - Remaining: audit each user-facing page to verify that stale, partial, or provider-limited data states are communicated clearly rather than silently driving high-confidence outputs. Confirm stale summary states are surfaced rather than shown as current data.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 24.

34. Cost control — provider quota register and budget alerting
    - Per-user `ASSISTANT_DAILY_LIMIT`, `estimateTokenCost()`, and env-based cost constants are implemented.
    - Remaining: FMP call volume tracking and quota monitoring; provider quota register covering OpenAI, FMP, NewsData.io, and Vercel; define alerting or budget limits before scaling. Required before first paying users to avoid unexpected cost spikes.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 25.

35. Error handling and empty state full inventory
    - Some provider error states and empty states have been improved.
    - Remaining: systematic audit of every user-facing page for provider failure states, empty-table explanations, stale-refresh states, and missing-data fallbacks. Confirm no raw technical errors reach users on any page.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 26.

36. Service-role key client component audit
    - Migration 109 user-scoped RLS policies assume the service-role key is only used server-side. If it appears in any client component or is exposed via a public env var, all RLS is bypassed for those users and migration 109 is rendered ineffective.
    - Remaining: grep `src/` for `SUPABASE_SERVICE_ROLE_KEY` and `createSupabaseAdminClient` usage; confirm every call site is a server component, server action, or API route — never a client component or any `NEXT_PUBLIC_` variable. Verify this before alpha invites.
    - Related: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 11 remaining items.

37. Email deliverability and Supabase auth email configuration
    - Supabase sends signup confirmation and password reset emails. Neither the codebase nor the docs verify whether a custom SMTP sender is configured, whether the sender domain is authenticated (SPF/DKIM), or whether auth emails will reach users rather than spam.
    - If email confirmation is broken or goes to spam, alpha users cannot complete signup regardless of the invite gating.
    - Remaining: confirm Supabase auth email settings (custom SMTP or Supabase default sender); verify sender domain authentication; send a test signup confirmation email end-to-end before the first alpha invite goes out.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 33.

38. Runtime error monitoring
    - No error monitoring service (Sentry, Vercel error alerts, or equivalent) is configured. When alpha users hit unhandled server errors, React rendering crashes, or API 500s, there is currently no mechanism to detect these without users reporting them manually.
    - Remaining: integrate an error monitoring service (Sentry is the standard choice for Next.js); configure source maps for readable stack traces; set up alerting for error spikes before alpha users are onboarded.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 34.

39. New user onboarding and empty state
    - The alpha product assumes users arrive with an existing portfolio. A brand-new alpha user landing on `/portfolio` with no holdings, no transactions, and no cash balance will see an empty state with no guidance on how to get started.
    - Remaining: define and implement a first-login empty state on the portfolio dashboard (e.g. a "get started" prompt or guide explaining how to add holdings and transactions); verify the empty state is informative and does not surface errors or broken UI.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 35.

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

5. Future ETF universe additions
   - Nine candidate ETFs confirmed with FMP profile metadata, EOD prices, and historical price data.
   - Factor Investing: `QUAL`, `SPHQ`, `JQUA`, `MTUM`, `USMV`, `SPLV`.
   - Option Income: `JEPI`, `JEPQ`, `SPYI`.
   - Two new ETF product categories will be needed in `alphaUniverse.ts`: `FACTOR_INVESTING` and `OPTION_INCOME` (add to `EtfCategory` type and `ETF_CATEGORY_LABELS`).
   - Seed only after deciding whether alpha mode should expose the expanded categories.
   - After seeding: run Seed Universe, instrument metadata refresh, market history backfill, ETF look-through refresh, daily returns, return anchors, market metrics, risk metrics, and summary refresh QA.
   - Source: `docs/qa-log.md` — "2026-06-12 22:20 SGT - Future ETF Universe Completion Candidate".

   Additional candidate categories identified in universe comprehensiveness review (2026-06-17), in priority order:

   - **Priority 1 — Mid-cap ETFs** (`MID_CAP`): MDY, IJH, VO. Most impactful single addition after the 9 confirmed ETFs. Mid-cap is a common holding in a diversified US equity portfolio alongside large-cap and small-cap. Many three-fund US equity allocations would have a mid-cap ETF outside the current universe. FMP coverage TBD.
   - ~~Priority 2 — International bond ETFs~~ **Not a gap (2026-06-17 correction).** BNDX and BNDW are already in the Bond category. The only absent international bond instruments are IAGG and BWX, which are not critical given existing coverage. No separate `INTERNATIONAL_BOND` category needed.
   - ~~Priority 2 — TIPS / inflation-protected ETFs~~ **Not a gap (2026-06-17 correction).** TIP and STIP are already in the Bond category. Only SCHP is absent, which is not critical given TIP and STIP coverage. No separate `TIPS_INFLATION_PROTECTED` category needed.
   - **Priority 3 — ESG / socially responsible ETFs** (`ESG_SOCIALLY_RESPONSIBLE`): ESGU, ESGD, ESGE, SUSA. Growing investor segment but niche for most current ETF portfolios. FMP coverage TBD.
   - **Priority 3 — Multi-asset / balanced ETFs** (`MULTI_ASSET_BALANCED`): AOR, AOM, AOA. Some investors use a single balanced ETF as their entire holding. Lower priority since the platform is better suited to multi-holding portfolios. FMP coverage TBD.

   Source: instrument comprehensiveness review — `docs/INSTRUMENT_TAXONOMY_AUDIT.md`.

6. Branch and deployment governance formal policy
   - Runtime `PRODUCT_MODE=alpha|full` reduces alpha branch drift risk, and the development → main → alpha merge workflow is in practice.
   - Remaining: formal written policy documenting merge direction, Vercel deployment targets per branch, environment variable governance, and rollback process.
   - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 21.

7. Migration safety formal review
   - Migrations are active and frequently added; duplicate-numbered files (`052`, `061`, `062`) exist.
   - Remaining: formal production migration checklist; rollback plan for irreversible migrations; adopt timestamped migration naming before commercial launch. Extends High Priority item 7.
   - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 22.

8. Model and prompt governance policy
   - Prompt versions and AI costs are stored and tracked in generation logs and usage tables.
   - Remaining: formal prompt change QA process; rollback process for AI model or prompt changes; prompt regression suite covering unsafe-wording and cost-impact checks.
   - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 32.

9. Incident response playbook
   - No formal incident playbook exists.
   - Remaining: define incident severity levels, data-correction process, user notification policy, rollback process, provider-outage playbook, and unsafe AI output handling before first paying users.
   - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 28.

10. Accessibility audit
    - Remaining: color contrast, keyboard navigation, focus states, screen-reader semantics, and chart accessibility labels review before broader launch.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 29.

11. Browser and device compatibility audit
    - Remaining: cross-browser test (Chrome, Edge, Safari) and viewport test (mobile, tablet, desktop) before broader launch. Auth flow, chart rendering, tables and scrolling should be verified.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 30.

12. Support operations readiness
    - No support workflow exists.
    - Remaining: support contact, bug report process, data-issue escalation path, calculation dispute process, and internal triage categories before first paying users.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 31.

13. Commercial readiness — pricing, payments, subscription flows
    - Not started. Pricing page, payment flow, subscription enforcement, onboarding, and refund/cancellation process are not yet productized.
    - Not required for private alpha. Required before paid launch.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 20.

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
