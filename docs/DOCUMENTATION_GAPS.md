# Documentation Gaps and Follow-Up Audit List

Last updated: 2026-06-26 SGT (added Medium 44 — ETF expense ratio + equity dividend yield not ingested; updated Low 14 — stored 5Y volatility added, 3Y still deferred)

This document records areas where the handover pack intentionally avoids guessing. These should be verified before commercialization or before a new developer changes related logic.

An independent deep architecture audit with live read-only database verification was completed on 2026-06-16; see `docs/ARCHITECTURE_AUDIT_2026-06-16.md`. Several items below now carry confirmed live evidence from that pass and are marked accordingly.

## Status Summary

| Priority | Total items | Open | Closed |
|---|---|---|---|
| High | 10 | 8 | 2 |
| Medium | 43 | 28 | 15 |
| Low | 14 | 13 | 1 |
| **Total** | **67** | **49** | **18** |

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

## Prioritized Execution Order (2026-06-19)

Consolidated, deduplicated execution order across this document and `COMMERCIALIZATION_AUDIT_PLAN.md`,
grouped by the milestone each item gates. Within each phase, items are in execution order (dependencies
respected). Tags: **[ops]** = configuration/operations, not code; **[build]** = implementation task;
**[external]** = legal/vendor/third-party; **[review]** = analysis/QA pass. IDs reference this document
unless prefixed otherwise.

### Phase A — Gate the first alpha invite
1. Set Vercel env vars `ALLOWED_SIGNUP_EMAILS`, `ASSISTANT_DAILY_LIMIT` (High 5) **[ops]**
2. Email deliverability test — signup/reset to Gmail+Outlook, SPF/DKIM (Med 37) **[ops]** — *hard gate*
3. Sentry error monitoring + job-failure alerting + `server-only` guard on `supabaseAdmin.ts` (Med 38 + High 4 + Med 36) **[build]** — *highest-leverage build*
4. New-user onboarding / empty state on `/portfolio` (Med 39) **[build]**
5. Alpha UX walkthrough — fresh-account end-to-end (Med 32) **[review]** — depends on #4
6. Route access matrix + alpha branch audit (High 2) **[review/doc]**

### Phase B — During alpha (correctness confidence; finish before paid)
7. Calculation golden regression suite + manual/Excel validation (Med 26) **[build]** — *existential for a calc product; start as soon as Phase A is in flight*
8. AI output regression tests — hallucination / no-advice / missing-data (Med 27) **[build]**
9. Data provider full-universe coverage matrix (Med 24) **[build/review]**
10. Recommendation calibration QA after one full production weekly run (Med 29) **[review]**
11. Market Vision evidence traceability audit (Med 28) **[review]**
12. Observability / reproducibility matrix (Med 30) **[review/doc]**
13. Data-freshness UX product audit (Med 33) **[review]**
14. Security Master auto-setup on new-instrument add (Med 41) **[build]** — data-quality gap the first time the universe grows post-launch
15. Migration tracking/numbering + safety review — ledger, dedupe `052/061/062`, timestamped naming (High 7 + Low 7) **[build/ops]**

### Phase C — Before first paying user
16. Legal & compliance review — ToS, privacy, disclaimers, PDPA (High 8) **[external]**
17. Data licensing confirmation — FMP/FRED/NewsData/GDELT (High 9) **[external]**
18. User privacy lifecycle — retention, export, account deletion (High 10) **[build]**
19. DB index audit + backup policy + restore test (Med 31) **[review/ops]**
20. Cost control — provider quota register + budget alerting (Med 34) **[build/ops]**
21. Error-handling / empty-state full inventory (Med 35) **[review/build]**
22. Support operations — contact, bug/triage, dispute path (Low 12) **[ops]**
23. Incident response playbook (Low 9) **[ops/doc]**
24. Commercial readiness — pricing, payments, subscription, refunds (Low 13) **[build]** — biggest net-new product surface
- **Performance & rendering audit** — slow-route identification, summary-table refresh correctness, over-fetch/pagination, lazy-loaded admin diagnostics (`COMMERCIALIZATION_AUDIT_PLAN.md` Section 13, *in progress*) **[review/build]**. Placed in Phase C to match the audit plan's before-paid timing; intentionally left unnumbered so the existing item references (#4, #5, #7, #13, #21, #25, #30, #31, #44) stay stable. The only DOCUMENTATION_GAPS item tracking it today is Low 2 (render-timing baseline).

### Phase D — Analytics correctness/quality (schedule by user impact)
25. Benchmark total-return vs price-return labeling (Med 11) **[build]** — quick win, do early
26. Portfolio volatility distorted by deposits/withdrawals — document or switch to cash-flow-adjusted returns (Med 10) **[build]**
27. XIRR / money-weighted return (Med 12) **[build]**
28. FX conversion for multi-currency portfolios (Med 9) **[build]** — largest of these

### Phase E — Before scaling to 100+ users
29. External code review, external calculation review, penetration test, PDPA review, incident drill (`COMMERCIALIZATION_AUDIT_PLAN.md` "100+" list) **[external]**
30. Accessibility audit (Low 10) **[review]**
31. Browser/device compatibility audit (Low 11) **[review]**

### Phase F — Governance, docs, and lower backlog
32. Branch/deployment governance policy (Low 6) **[doc]**
33. Model/prompt governance policy + regression suite (Low 8) **[doc/build]**
34. News classification formula doc (Med 5) **[doc]**
35. Assistant table/cost schema confirmation (Med 4) **[review]**
36. Security Master provider-observation automation (Med 7) **[build]** — future, after provider-priority rules approved
37. Security Master stub-promotion workflow (Med 40) **[build]** — low until the universe grows often
38. ETF holdings provider-plan expansion monitoring (Med 25 remaining) **[review]**
39. Provider endpoint inventory completion — FMP market/news, FRED, NewsData, GDELT, OpenAI (Low 1) **[doc]**
40. Render-timing baseline table (Low 2) **[review]**
41. Job schedule drift check vs live `cron.job` (Low 3) **[review]**
42. Old docs cleanup / archive pass (Low 4) **[doc]** — needs user approval
43. Future ETF universe additions — mid-cap (MDY/IJH/VO), factor, option-income, ESG, balanced (Low 5) **[completed 2026-06-23]**
44. Executive-summary count pluralization ("1 watch area") — cosmetic carry-along (Portfolio Review WIP) **[build]**

### Cross-cutting — UI/UX improvement track (ongoing)
General visual/interaction polish for commercial credibility — an **iterative track**, not a one-time audit
(the same way the Portfolio Review balance-engine polish was run). Distinct from the *functional* UX items
already in the phases above, which it complements and should not duplicate: onboarding/empty state (#4),
alpha UX walkthrough (#5), data-freshness UX (#13), error/empty-state inventory (#21), accessibility (#30),
browser/device compatibility (#31).

Scope (run as small, reviewable batches):
- Visual consistency — spacing, typography scale, color tokens, card/chip/badge styling across pages.
- Responsive / mobile + tablet layout for the primary dashboard, portfolio, holdings, and review pages.
- Chart readability — axis labels, legends, tooltips, empty/insufficient-data chart states.
- Loading / skeleton states and perceived-performance polish on slower routes.
- Table readability — column alignment, number formatting, pagination/overflow on dense tables.
- Interaction affordances — focus/hover states, disabled states, consistent iconography.
- Copy/microcopy consistency (e.g. observational, non-advisory tone already established in Portfolio Review).

Timing: opportunistic during alpha for credibility; **substantially complete before first paying user**
(Phase C gate). Accessibility (#30) and browser/device (#31) are the formal review counterparts and remain
in their phases. Capture each batch as its own implementation-log entry.

**Sequencing notes:**
- Calculation golden regression (#7) is ranked #1 in `COMMERCIALIZATION_AUDIT_PLAN.md`'s generic audit
  ranking, but it does **not** gate the alpha *invite* (methodology is already documented), so it sits in
  Phase B. It is a hard gate before *paid*.
- #25 (benchmark return labeling) and #44 (pluralization) are tiny; pull them forward opportunistically
  whenever Portfolio/Risk pages are next touched.
- The UI/UX improvement track (above) is cross-cutting and iterative; schedule its batches alongside the
  phased items rather than as a single blocking task.
- **Methodology page + scoring refinements** are tracked in detail in `docs/METHODOLOGY_AND_SCORING_WIP.md`
  (page-vs-code audit result, Fundamentals→Business Quality decision, calc-audit findings, and the spec
  sequence #3 → Spec 1 → Spec 2 → Spec 3). The Spec 3 validation script doubles as the **Med 26** golden
  regression, and a **Med 29** recalibration QA should follow it.
- **Relationship to `COMMERCIALIZATION_AUDIT_PLAN.md` timing:** that doc's "Before Public Alpha" bucket is
  the set needed for a *complete* alpha and is broader than Phase A here. Phase A is deliberately the
  narrower *invite-gating* subset; the remaining "before alpha" audit-plan items (Calculation #7, AI
  regression #8, provider coverage matrix #9, observability matrix #12, data-freshness UX #13) are placed in
  Phase B as "finish during alpha, before paid." Item content and source IDs are identical across both docs;
  only the alpha boundary differs. The audit plan's before-paid / 100+ / 500+ buckets map to Phases C / E.

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

40. Security Master — `is_internal_only` stub promotion when a symbol enters the universe
   - When a holding symbol that exists only as an `is_internal_only` stub in `securities_master` is later added as a user-selectable instrument, two active `securities_master` entries exist for the same symbol: the original stub (UUID_A) and the new instrument-linked security (UUID_B).
   - `sync_etf_holding_security_ids()` sees two candidate security IDs and flags all matching `etf_top_holdings` rows as `ambiguous` rather than `mapped`. ETF holdings mapping breaks for that symbol until resolved.
   - Migration 092 (`repair_security_master_links`) runs once at deployment and does not re-run when new instruments are added, so the new instrument gets `security_id = UUID_B` rather than reusing UUID_A.
   - Resolution requires a manual one-off operation: deactivate the stub (`UPDATE securities_master SET is_active = false WHERE id = UUID_A`), then re-run `sync_etf_holding_security_ids()` and `sync_security_issuer_links()`. This clears the ambiguity and re-maps holdings to the user-selectable security.
   - Long-term resolution: implement an admin "promote instrument" workflow that automates stub deactivation and re-sync when a new instrument is added. The Phase 6 corporate-action lifecycle tables (`104_security_master_phase6_corporate_actions.sql`) are the designed home for this — a `UNIVERSE_PROMOTION` lifecycle link from UUID_A → UUID_B.
   - The `stubCollisionCount` field proposed for the Security Master health snapshot (migration 113 scope) will surface this condition in the Admin QA panel as an amber warning when greater than zero.
   - Priority: low for current universe size; becomes operational debt if ETFVision regularly adds instruments that previously appeared only as ETF holdings.

41. Security Master — no automatic setup when a new instrument is added to the universe
   - Migrations 091 and 092 ran once against the full active universe at Security Master setup time. They are not re-run when new instruments are added via `seedUniverseAction` or any other mechanism.
   - `UniverseManagementService` has no references to `securities_master`, `security_id`, or any sync function. A new instrument is inserted into `instruments` with `security_id = null` and receives no Security Master setup automatically.
   - Impact: any instrument added after migrations 091/092 is invisible to all Security Master-dependent features until manually set up — issuer-level concentration rollup in Portfolio Review, top underlying company exposure, recommendation and telemetry stable identity, and the `selectableWithSecurityId` count in the Admin Security Master QA panel will all be incorrect for the new instrument.
   - Resolution per instrument: (1) insert a `securities_master` row for the new instrument; (2) register identifiers in `security_identifiers`; (3) set `instruments.security_id`; (4) run `sync_security_issuer_links()`. This is the same logic as migrations 091/092 applied incrementally.
   - Long-term resolution: extend `UniverseManagementService.ensureSeededUniverse()` (or the instrument-add path) to call an incremental Security Master upsert after inserting each new instrument, mirroring the one-time migration 091/092 backfill logic.
   - Priority: medium — silent data quality gap that will surface as incorrect Security Master health metrics and missing issuer rollup the first time a new instrument is added to the universe post-launch.

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
    - FMP coverage has been tested ad hoc for active instruments. A formal matrix covering all 391 active instruments (post-2026-06-23 expansion) across each data type (prices, fundamentals, ETF holdings, metadata) has not been produced.
    - Remaining: produce a coverage matrix classifying each instrument as `SUPPORTED`, `PARTIAL_SUPPORT`, `UNSUPPORTED`, or `UNKNOWN` per data type. Identify instruments requiring fallback data or development-only demotion.
    - Source: `docs/COMMERCIALIZATION_AUDIT_PLAN.md` Section 2.

25. ETF holdings provider plan expansion monitoring
    - **Updated 2026-06-18:** Top holdings coverage is now 169/169 eligible equity ETFs. Portfolio indirect-holding company overlap is fully operational (Task B). Five ETFs (IYW, VCR, JXI, VOX, PXE) have no FMP sector data — confirmed as a FMP data gap, not a plan limitation; seeded single-sector fallback covers all five.
    - **Updated 2026-06-18:** FMP `weightPercentage` normalisation bug fixed (100× overstatement for sub-1% holdings). All 169 ETFs re-refreshed after fix; security ID mappings and issuer links re-synced. Stored weights are now correct.
    - **Closed 2026-06-19:** Systemic instrument taxonomy data-quality gap closed in code and documentation. ETF `canonical_sector` is now curated-authoritative from `ALPHA_ETF_CATEGORIES`, stock `canonical_sector` is re-checked from `ALPHA_STOCK_SECTORS`, generic ETF labels no longer blanket-apply `Global Diversification`, and the metadata job exposes `taxonomyBackfill=true` for re-normalizing active rows.
    - Remaining: evaluate whether FMP plan expansion would increase the number of top holdings returned per ETF (currently capped at 100 by the provider service, but FMP may return fewer under the current plan for some ETFs); monitor ETF-to-security mapping coverage in the Security Master after any plan change.
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
    - **Verified 2026-06-19 — no leak found.** All 23 `service_role` / `createSupabaseAdminClient` references are server-side: the `infrastructure/repositories/*` data layer, `server/jobs/*`, API routes, and `admin/data-sources/page.tsx` (a **server** component — no `"use client"`; calls `createSupabaseAdminClient()` at server render). The key is `SUPABASE_SERVICE_ROLE_KEY` with **no `NEXT_PUBLIC_` prefix**, so Next.js does not ship it to the browser. RLS (migration 109) is not being bypassed.
    - **Downgraded to a 1-line hardening:** `src/infrastructure/db/supabaseAdmin.ts` has no `import "server-only"` guard, so server-only usage is enforced by convention rather than at build time. Add `import "server-only";` to that module so any future client-component import fails the build. Folded into Phase A item 3 (Sentry/alerting infra bundle).
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

42. Bond ETF analytical enrichment via issuer fund-characteristics feeds
    - Bond ETF *quantitative* profile fields (`effectiveDuration`, `averageMaturity`, `secYield`, `yieldToMaturity`, `spreadDuration`, `optionAdjustedSpread`, credit-quality breakdown) are hardcoded in `SEEDED_BOND_PROFILES` (`src/application/services/bonds/BondProfileService.ts`) and migrations `016`/`017` — manually maintained and drift as funds reposition. FMP does **not** carry fixed-income portfolio analytics (only ETF expense ratio + holdings/weightings); the authoritative source is the fund issuers (iShares/BlackRock, Vanguard, SPDR/SSGA, Invesco, Schwab).
    - Existing plumbing supports it: `NormalizedBondProfile` already separates the **curated** classification layer (`durationCategory` bucket, `bondType`, `creditQuality` bucket, sensitivities, `liquidityRole` — keep manual) from the **quantitative** metrics, and `isManualOverride` + migration 016's "curated stays deterministic" rule let a provider fill the quantitative fields without clobbering the taxonomy.
    - Approach: a `BondCharacteristicsProvider` port + per-issuer adapters (start with **iShares**, broadest coverage + most structured data), an instrument→issuer mapping, and a low-frequency enrichment job that upserts **only the quantitative fields**, skips `isManualOverride` rows, keeps last-known values on fetch failure, and records `source` + `as_of_date`. Companion quick-win: automate expense ratio (+ distribution yield) from FMP's ETF info endpoint (FMP *does* carry those).
    - **Gate 1 — data licensing (ties to High 9):** scraping issuer pages risks ToS and is fragile; prefer a licensed feed for production. Scraping is alpha/internal only and must be cleared before the first paying user.
    - **Gate 2 — score drift:** `BondEtfRecommendationService` may consume these fields; swapping seeded → sourced values will move bond ETF scores. Economic anchors stay frozen; add a before/after bond-ETF score comparison as a validation gate.
    - Priority: **not an alpha blocker** (manual seeds work today); improves bond-intelligence accuracy and removes manual upkeep. Sequence after the instrument detail-page redesign. Scoped 2026-06-25 (Claude review).

43. Diversification score inconsistency — Risk page vs Portfolio Review (look-through + live/stored)
    - The Risk page shows a "Diversification" score computed **live** and **surface-only** (`riskMath.diversificationScore`: holding/asset-class/sector/currency breadth + 30 − correlationPenalty; **no ETF look-through**). The Portfolio Review "Diversification" section (`DiversificationReviewService`) **starts from that same risk score** and adds a look-through breadth bonus (`min(8, lookthroughSectorCount + lookthroughCountryCount)`), and is a **stored weekly snapshot**. Result: the same portfolio shows different numbers on the two pages (observed **76** on Risk vs **88** on Review), which confuses users.
    - Root cause — two definitions never unified: (a) **depth** — the Risk page ignores what's inside ETFs (understates true diversification for ETF-heavy portfolios), while the Review credits look-through breadth but only as a crude +8 cap on the same base; (b) **timing** — the Risk page is live, the Review is a stored weekly snapshot, so even the shared base differs.
    - The more correct measure of *overall* diversification is **look-through-aware AND live**, combined with the existing holding-level correlation signal — which neither page currently does in full (Risk page has live + correlation but shallow breadth; Review has look-through breadth but stale + crude + reuses the same correlation).
    - Recommended resolution: unify to ONE diversification definition (look-through breadth + holding-level correlation, computed live) shown consistently on both the Risk page and Portfolio Review — make the canonical Risk page the look-through-aware version — or, minimally, clearly label live-vs-stored / with-vs-without look-through.
    - Before changing: confirm the diversification score is display + portfolio-review-section only and does **not** feed instrument scoring/recommendation logic (believed display-only). Document in `SCORE_METHODOLOGY.md`; it shifts a displayed score, so treat as a deliberate methodology update.
    - Priority: **not an alpha blocker** (each score is individually correct); user-facing consistency / commercialization-readiness. Logged 2026-06-25 (Claude review).

44. ETF expense ratio and equity dividend yield are not ingested
    - The UI scaffolding exists but the data is never fetched, so both render blank:
      - **Dividend yield (equities):** the Key Facts card has a `dividendYield` field and a "Dividend yield" `SummaryMetric`, but it is always `null` → renders "—". `FmpFundamentalsProvider` (key-metrics) captures `freeCashFlowYield` but **not** `dividendYield`; `FmpAssetMetadataProvider` (`/profile`) keeps the raw payload (which contains `lastDiv`) but maps only symbol/name/exchange/sector/industry/ids and drops it. No `dividend_yield` column is populated anywhere.
      - **Expense ratio (ETFs):** an `expenseRatio` field exists, but only on the **bond profile** type, and it is populated solely by manual seed (`SEEDED_BOND_PROFILES`) or manual form override (`universeActions`). `FmpEtfExposureProvider` fetches `etf/sector-weightings` / `etf/country-weightings` / `etf/holdings` only — it never calls FMP's `etf/info` endpoint, where `expenseRatio` lives. No automated ETF/equity expense-ratio ingestion exists.
    - Both are available on the FMP Ultimate plan: `key-metrics.dividendYield` (TTM) or `profile.lastDiv ÷ price` for yield; `etf/info.expenseRatio` for ETFs.
    - Fix if wanted: add `dividend_yield` (equities) and `expense_ratio` (ETFs) to the metadata/fundamentals refresh, store them, and wire the existing "—" fields. Display-only (no scoring/guardrail impact); would need a forced recompute/backfill like the 5Y-volatility addition (migration 134).
    - Priority: **not an alpha blocker**; display completeness, relevant to the Fundamentals/Key-Facts surfaces. Logged 2026-06-26 (Claude review).

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
   - **Closed 2026-06-23:** Universe/classification expansion implemented in `alphaUniverse.ts` and `TaxonomyService`.
   - Added 31 ETFs across nine new ETF categories plus four country ETFs, bringing curated ETF coverage to 232 symbols.
   - Added 54 stocks across existing sectors, bringing curated stock coverage to 159 symbols.
   - Raised `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH` default from 150 to 200 so one weekly fundamentals pass still covers the expanded stock universe.
   - Tests now pin category counts, sample new ETF symbol mapping, canonical-sector mapping, asset-category mapping, and ETF benchmark routing for the new categories.
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

   **Future stock universe additions (proposed 2026-06-23):** companion to the ETF additions above — 17 individual stocks identified to broaden sector/industry coverage. Each needs a `canonical_sector` entry in `ALPHA_STOCK_SECTORS`, Security Master setup (see gap #41 — new instruments are not auto-set-up), and the same post-seed refresh runbook (Seed Universe → metadata → market history backfill → ETF look-through → daily returns → anchors → market metrics → risk metrics → summary QA). FMP coverage TBD per symbol. Note: adding these grows the active stock universe from ~105 to ~122, still within one fundamentals pass (`maxStocksPerRefresh=150`); adding the completion-candidate stocks below as well pushes it to ~159, which exceeds the 150 cap and would require raising `FUNDAMENTALS_MAX_STOCKS_PER_REFRESH` to keep it a single pass.

   - Insurance: `PGR` (Progressive Corporation), `AJG` (Arthur J. Gallagher & Co.), `MRSH` (Marsh & McLennan Companies).
   - Exchanges & Market Infrastructure: `ICE` (Intercontinental Exchange), `CME` (CME Group), `NDAQ` (Nasdaq Inc.).
   - Financial Data & Analytics: `SPGI` (S&P Global), `MCO` (Moody's Corporation), `MSCI` (MSCI Inc.), `FDS` (FactSet Research Systems).
   - Environmental Services: `WM` (Waste Management), `RSG` (Republic Services).
   - Data Center / Digital Infrastructure REITs: `EQIX` (Equinix), `DLR` (Digital Realty Trust).
   - Logistics: `FDX` (FedEx Corporation).
   - Optional Luxury: `RACE` (Ferrari N.V.), `LVMUY` (LVMH Moët Hennessy Louis Vuitton SE — ADR).

   Source: user-proposed sector-coverage expansion, 2026-06-23.

   **Coverage-completion candidates (Claude review, 2026-06-23):** with the confirmed ETFs + 18 stocks above seeded, the ETF universe is near-complete but a few asset classes remain absent, and several stock sectors stay too thin to represent fairly in sector/look-through analytics. These are *coverage candidates for analytics completeness* (so portfolio sector/factor exposure is not skewed by missing names), not buy/sell suggestions. FMP coverage TBD per symbol; each stock also needs `ALPHA_STOCK_SECTORS` + Security Master setup (gap #41), each ETF a category entry in `alphaUniverse.ts`.

   ETF asset-class gaps still open after the planned additions:
   - Preferred stock: `PFF`, `PGX`.
   - Municipal bonds (tax-exempt fixed income): `MUB`, `VTEB`.
   - Emerging-market bonds: `EMB`, `VWOB`.
   - Aerospace & defense (thematic; minor — defense single-stocks already present): `ITA`, `PPA`.
   - Single-country depth (majors present; common omissions): `EWG` (Germany), `EWZ` (Brazil), `EWY` (South Korea), `EWT` (Taiwan).

   Stock sector-depth gaps (deepen under-represented sectors; counts are post-additions):
   - **Utilities** (currently 1 name, NEE — most skewed): `DUK`, `SO`, `D`, `AEP`, `EXC`, `SRE`, `XEL`.
   - **Consumer Staples** (5): `MO`, `PM`, `MDLZ`, `CL`, `KMB`, `GIS`, `MNST`, `KDP`.
   - **Energy** (5; no refiners/midstream): `MPC`, `PSX`, `VLO`, `KMI`, `WMB`, `OKE`, `OXY`.
   - **Materials** (4; no mining/gold/steel): `FCX`, `NEM`, `NUE`, `DOW`, `CTVA`.
   - **Industrials** (rails / multi-industry gaps): `CSX`, `NSC`, `MMM`, `EMR`, `ITW`, `GD`.
   - **Real Estate** (broaden REIT subtypes): `CCI` (towers), `PSA` (storage), `WELL` (healthcare), `SPG` (retail).

   Assessment: the planned additions close the major structural gaps (mid-cap, factor, financial-services breadth) and bring the universe to roughly ~85% completeness; the items above are what remain to reach full sector/asset-class balance, prioritised by Utilities → Staples/Energy/Materials → preferred/muni/EM-bond ETFs.

   **Seed-time look-through notes (Claude review, 2026-06-23):** the ETF look-through job skips ETFs whose `canonicalSector` is Bonds/Fixed Income, Commodities/Gold, Crypto, or Cash/Money Market — so of the 31 new ETFs, **25 get exposure look-through and 6 do not** (the bond-like `PFF`, `PGX`, `MUB`, `VTEB`, `EMB`, `VWOB`). Two eligible groups will produce imperfect exposure data; spot-check them after the ETF look-through refresh:
   - **Multi-Asset / Balanced (`AOR`, `AOM`, `AOA`)** — funds-of-funds whose FMP holdings are *other ETFs* (AGG, IEFA, …), not companies; sector/country exposure is partial and ~40–60% is bonds that won't decompose into company holdings. Least meaningful look-through of the set.
   - **Option Income (`JEPI`, `JEPQ`, `SPYI`)** — hold equities plus an options/ELN overlay; FMP captures the equity sleeve but not the option positions, so exposure understates the derivative component.
   - If either group's exposure data is too thin to be useful, treat them like the existing FMP-sector-gap ETFs (the `IYW`/`VCR`/`JXI`/`VOX`/`PXE` seeded single-sector fallback pattern, gap #25).

   **Ticker-change handling note (2026-06-23):** when a universe instrument changes ticker, first update the existing row in SQL with `update instruments set symbol = '<new>', provider_symbol = '<new>' where symbol = '<old>';` so the `instrument_id` is preserved. Then deactivate any old-symbol `is_internal_only` Security Master stub, delete that inactive stub's identifiers, and re-run `sync_etf_holding_security_ids()` so ETF holdings that still list the old ticker map to the renamed security. Then re-fetch prices: delete and backfill if the new ticker carries full history, or gap-fill if the provider only carries post-change data. Finally update `alphaUniverse.ts`. Do not re-run Seed Universe before renaming the row, because seeding would insert a duplicate row under the new ticker and orphan the old one.

   **FMP coverage VERIFIED 2026-06-23 (live, all 31 new ETFs):** every symbol returned FMP profile metadata, recent adjusted EOD history (latest price date `2026-06-22` for all), and holdings. One exception: **`SPLV` returns 0 rows from `etf/sector-weightings`** (it did return country + holdings). `SPLV` is a multi-sector low-volatility S&P 500 fund, so the single-sector seeded fallback (`seededEtfSectorFallback.ts`) does NOT fit it — adding a single-sector seed would misrepresent it. Look-through maps FMP sector rows directly (no holdings-derived sector path), so `SPLV`'s sector-exposure card will be **empty**. Non-blocking: its holdings + country fetched, and holdings still feed company-overlap / issuer rollup via Security Master. Decision: accept the empty sector card, or add an approximate weighted multi-sector seed for `SPLV` (the fallback type supports `SeedSector[]`) — leaning accept, since a curated weight is approximate and drifts on rebalance.

   **Financial-sector scoring note (Claude review, 2026-06-23):** `isFinancialSector()` (FundamentalScoringService) gates on the FMP profile `sector` containing "financial" AND `industry` containing one of bank / capital markets / broker / broker-dealer / insurance / thrifts / mortgage finance. Of the 10 new Financials-sleeve stocks: `PGR` (P&C insurer) correctly uses the financial path; `AJG`/`MRSH` (insurance brokers) are caught by `insurance` but behave like fee-based services firms; `ICE`/`CME`/`NDAQ`/`SPGI`/`MCO`/`MSCI`/`FDS` (data/exchange businesses with real margins + FCF) should land on the **standard** path under FMP's usual "Financial Data & Stock Exchanges" industry label — but if FMP tags any of them "Capital Markets" they flip to the financial path and get mis-scored (FCF/margins nulled). Post-seed: verify each of these 7 names' stored FMP `sector`/`industry` and `isFinancial` outcome; if mis-gated, refine `isFinancialSector` to exclude "Financial Data & Stock Exchanges" (separate scoring change with methodology-doc update).

   **Next ETF batch — PLANNED for 2026-06-24 (8 ETFs, alternatives / quality-dividend / international small-cap / global low-vol):** extends the universe toward fuller asset-class + factor coverage. Same implementation pattern as the 2026-06-23 expansion (add to `alphaUniverse.ts` `EtfCategory` + `ETF_CATEGORY_LABELS` + `ALPHA_ETF_CATEGORIES`; classify in `TaxonomyService.etfCategorySectors`/themes + `EtfRecommendationService` benchmark map + `ETF_ASSET_CATEGORY`; sync methodology page + SCORE_METHODOLOGY benchmark table; then seed runbook). FMP coverage TBD per symbol — verify live before seeding (as done for the prior batch).

   - **NEW category `MANAGED_FUTURES`** (Alternatives): `DBMF` (iMGP DBi Managed Futures), `KMLM` (KFA Mount Lucas), `CTA` (Simplify Managed Futures). Proposed classification: canonical sector `Multi-Asset / Broad Market`, asset category `MULTI_ASSET`. Benchmark = DECISION (managed-futures are absolute-return/trend across asset classes; equity/bond benchmarks fit poorly — likely route to no Benchmark Relative component, like "other single-country ETFs"). Look-through: holdings are futures/derivatives, not companies → expect empty/odd exposure (like the option-income/funds-of-funds cases) → spot-check.
   - **NEW category `INTERNATIONAL_SMALL_CAP`**: `SCZ` (iShares MSCI EAFE Small-Cap — developed ex-US), `VSS` (Vanguard FTSE All-World ex-US Small-Cap). Proposed: canonical sector `Multi-Asset / Broad Market`, asset category `EQUITY`, benchmark `developed_ex_us`.
   - **Existing `DIVIDEND` category** += `QDIV` (Global X S&P 500 Quality Dividend), `DGRS` (WisdomTree US SmallCap Quality Dividend Growth). Inherits DIVIDEND classification (sp500 benchmark, EQUITY).
   - **Existing `FACTOR_INVESTING` category** += `ACWV` (iShares MSCI Global Min Vol). NOTE: FACTOR_INVESTING currently benchmarks to `sp500`, but ACWV is GLOBAL min-vol — consider routing it to `global_equities` instead (small benchmark-map decision at implementation time).

   Source: user-proposed coverage batch, 2026-06-23 (for 2026-06-24 implementation). Category/subcategory taxonomy provided: Alternatives→Managed Futures; Dividend→Quality Dividend / Quality Dividend Growth; International Equity→Developed/Global ex-US Small Cap; Factor→Global Low Volatility.

   **PLANNED FEATURE — 20-year history + long-horizon display metrics (user-requested 2026-06-23):** extend stored price history from 5yr → **20yr** (up to 20yr where FMP has it), and add **10/15/20-year** total return, annualized volatility, and drawdown (current + max) as **DISPLAY-ONLY** metrics alongside the existing 1Y/3Y/5Y. Display-only ⇒ **no scoring/methodology change** (no anchor refit, no frozen-constant impact; risk_score still uses the existing 1Y/full-history inputs). Phases:
   1. **Price window:** `lookbackDays 1825→7300` (backfill action + benchmark backfill); metric-computation `lookbackYears→20`. One-time 20yr backfill (~2M rows; vacuum-between-presses; adaptive daily-returns auto-rebuilds deep history).
   2. **Returns 10/15/20Y:** add `return_10y/15y/20y` columns to `instrument_market_metrics`; extend the in-service baseline/completeBy computation (`InstrumentMarketService` ~1029-1117, copy the 3Y/5Y pattern).
   3. **Vol + drawdown 10/15/20Y:** extend the period-drawdowns RPC `period_definitions` union (`+10y/15y/20y`) + `current_drawdown_/max_drawdown_*` columns (migration 075 pattern); add `volatility_10y/15y/20y` columns + windowed `stddev×√252`. Risk score unchanged.
   4. **UI:** surface the new return/vol/drawdown columns on instrument detail / universe / risk / performance (null = insufficient history, same as 3Y/5Y today).
   5. **Docs:** descriptive note in `CALCULATION_METHODOLOGY.md` + methodology page that the display windows exist (NOT a scoring-math change).
   Caveats: ~4× price + daily-returns data; long-horizon vol/drawdown scans are the heaviest new compute (covered by maxDuration/auto-sizing/autovacuum); "20yr" = up to 20yr available so expect large null coverage on long horizons for recent instruments.

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

14. No stored 3Y volatility window
    - `instrument_risk_metrics` has volatility at 30D / 90D / 1Y (base), 5Y (migration 134), and 10Y / 15Y / 20Y (migration 133). The prior 5Y UI gap is resolved once migration 134 is applied and `refresh_instrument_risk_metrics_only(null)` is run.
    - Remaining: there is still no stored `volatility_3y` field. No current Long-Horizon Overview surface needs 3Y volatility; add it later only if a UI/API surface requires it.
    - Updated 2026-06-26 after the display-only 5Y volatility addition.

## Pending Implementation Tasks

These tasks have been fully scoped and are ready to execute. They are not documentation gaps — they are the next development items in the backlog, recorded here so the session can be resumed without re-deriving context.

---

### Task B — ETF Holdings Integration into Portfolio Review

**Status:** Completed 2026-06-18. See implementation-log.md entry "ETF Holdings Integration into Portfolio Review Gap Analysis".

**Why this is needed:**
The Gap Analysis section in Portfolio Review currently uses a sector/ticker-level proxy (overlapPenalty) to detect candidate overlap with the user's existing holdings. It cannot see what companies are inside each ETF. For example, if the user holds VOO (which contains JNJ, ABT, UNH indirectly) and the gap analysis suggests VHT as a healthcare candidate (which also holds JNJ, UNH, ABT as top positions), the current system has no idea those funds share companies. It treats VHT as if it has zero company overlap. This task wires the existing etf_top_holdings data into the portfolio review computation so overlap is based on real company-level data.

**Architecture note:**
- The etf_top_holdings table already exists in the database.
- SupabaseEtfExposureRepository.listLatestTopHoldings() already exists.
- The FMP provider already calls the etf/holdings endpoint and stores results. The only fix needed there is sorting by holdingWeight and capping at 100 before storage.
- No new migrations, no new jobs, no new tables required.
- PortfolioReviewService currently does NOT fetch etf_top_holdings in buildContext(). That is the missing link.

**Files to change (7 files):**

1. `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
   - After the flatMap that builds topHoldings from the FMP holdings payload, sort by holdingWeight descending and slice to 100.
   - Apply the cap to both the live FMP path and the seeded fallback path so behavior is consistent regardless of data source.

2. `src/application/services/portfolioReview/portfolioReviewScoring.ts`
   - Add `etfTopHoldings: EtfTopHolding[]` to the PortfolioReviewInputContext type.
   - Add `import type { EtfTopHolding } from "@/domain/etfLookthrough/types"`.

3. `src/application/services/portfolioReview/PortfolioReviewService.ts`
   - Add `private readonly etfExposureRepository: EtfExposureRepository` as a constructor parameter immediately after `portfolioLookthroughExposureService` (line 93), before the defaulted service parameters.
   - In buildContext(), add `this.etfExposureRepository.listLatestTopHoldings(instruments.map(i => i.id))` to the existing Promise.all.
   - Add etfTopHoldings to the returned context object.

4. `src/domain/portfolioReview/types.ts`
   - Add to PortfolioReviewCandidate: `sharedCompanyCount: number | null`, `sharedCompanyWeight: number | null`, `topSharedSymbols: string[]`.

5. `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
   - In the candidate() function, before calling diversificationBenefitService.evaluate(), compute company overlap:
     - Filter context.etfTopHoldings by instrument.id to get this candidate's holdings.
     - Build a Set of the user's company symbols from context.lookthroughReport.holdingExposures.
     - Intersect: sum holdingWeight of candidate holdings whose holdingSymbol is in the user's company set → companyOverlapWeight.
     - Collect top 3 shared symbols by weight for topSharedSymbols.
     - Pass companyOverlapWeight into the DiversificationBenefitService call.
     - Populate sharedCompanyCount, sharedCompanyWeight, topSharedSymbols on the returned candidate object.
   - When etfTopHoldings is empty (before backfill), companyOverlapWeight is 0 and behavior is identical to today.

6. `src/application/services/portfolioReview/DiversificationBenefitService.ts`
   - Add `companyOverlapWeight?: number` to the DiversificationBenefitContext input type.
   - After the existing overlapPenalty calculations, add: if companyOverlapWeight >= 0.35 add 20 to overlapPenalty; else if companyOverlapWeight >= 0.15 add 10.
   - Extend the overlapWarning string when companyOverlapWeight >= 0.15 to include "including top company holding overlap via ETF look-through".

7. `src/server/container.ts`
   - etfExposureRepository is already instantiated at line 122. Add it as a constructor argument to PortfolioReviewService at line 311, immediately after portfolioLookthroughExposureService.

**What does NOT change:**
- No migrations.
- portfolioFitService.ts — not touched.
- DiversificationReviewService, ConcentrationReviewService, and all other portfolio review section services — unchanged.
- Recommendation labels, guardrails, compliance wording, telemetry — unchanged.
- Portfolio Review score weights — unchanged.
- Gap Analysis UI (portfolio-review/page.tsx) — NOT changed in this task. UI redesign is the separate task below.

**Tests:** npm.cmd run typecheck, lint, build, test must all pass. The known pre-existing Portfolio Review wording failure (improvement suggestions map concentration issues to diversifying candidates) is unrelated.

**After deployment — required manual steps before new overlap logic produces output:**

Step 1: Run `POST /api/jobs/etf-lookthrough-refresh?force=true` from Admin > Jobs.
- This bypasses the stale cutoff and re-fetches top 100 holdings per ETF.
- Since migration 120 one bounded-concurrency pass covers up to maxEtfsPerRun ETFs (default 250), and since migration 123 maxEtfsPerRun auto-sizes to the eligible-ETF count — enough for the full eligible equity ETF universe (~194 after the 2026-06-23 expansion) in a single run. Check job log topHoldingRows / etfsRefreshed to confirm completion (a second pass is only needed if etfsRefreshed is still non-zero).

Step 2: Run `POST /api/jobs/portfolio-review-run` from Admin > Jobs.
- This regenerates the stored portfolio review report using real company overlap data.
- Until step 1 is complete, etfTopHoldings is an empty array, companyOverlapWeight is 0, and behavior is identical to today.

**Implementation log:** Add entry titled "ETF Holdings Integration into Portfolio Review Gap Analysis" covering objective, files changed, summary of each change, test results, and the backfill steps required post-deployment.

---

### Task C — Gap Analysis UI Redesign

**Status:** Completed 2026-06-18. See implementation-log.md entry "Gap Analysis UI Redesign".

**Why this is needed:**
The current Gap Analysis card layout ranks candidates using a composite score that blends portfolio-specific signals (sector overlap, ticker match) with quality signals. This composite produces a #1/#2/#3 ranked list that reads as "ETFVision is telling the user which instrument is best for their portfolio" — which is the robo-advice compliance risk.

The redesign separates the two concerns:
- Candidates are ordered by universal Characteristics Score (recommendationScore) only — the same score whether the user holds 0 or 50 instruments. This is analytically defensible as instrument classification, not a portfolio recommendation.
- Portfolio-specific signals (exposure impact, holdings overlap) are presented as factual observations about the portfolio — descriptive, not prescriptive.
- The user sees the facts and draws their own conclusion. The platform does not synthesise a recommendation.

**Reference:** A mockup of the target output was reviewed on 2026-06-18 and confirmed as the target design. The mockup shows:
- Category title + "Underweighted category" badge.
- Disclaimer: "Instruments below pass all guardrail filters and belong to an underweighted category. Ordered by instrument quality score only. Portfolio impact indicators are factual observations — not a recommendation to buy, sell, or hold."
- Column indicator strip: "Ordered by: Instrument quality — universal · not portfolio-specific" (left), "Impact indicators: Exposure | Overlap — factual · your portfolio" (right).
- Per-candidate card: rank badge (#N) + quality score + ticker + name + characteristics label chip + Exposure impact bar and text (left) + Holdings overlap label and shared company count (right).
- Overlap label: Low / Moderate / High with green / amber / red colour coding, sourced from sharedCompanyWeight thresholds after Task B.

**File to change:** `src/app/(dashboard)/portfolio-review/page.tsx` only. No backend changes.

**Specific changes to the Suggestions component (around lines 345–435):**

1. **Sort candidates by recommendationScore descending** before rendering, not by candidateRankScore. The internal candidateRankScore computation remains in the service — this is a display-only sort change.

2. **Replace the existing candidate card layout** with a two-column card:
   - Left column: "Exposure impact" — an issueFitScore bar (0–100 mapped to bar width %) and primaryReason text below it.
   - Right column: "Holdings overlap" — a Low/Moderate/High label chip coloured green/amber/red based on sharedCompanyWeight thresholds (< 0.15 = Low green, 0.15–0.35 = Moderate amber, > 0.35 = High red), and detail text:
     - If sharedCompanyCount > 0: "N shared companies via [topSharedSymbols joined] look-through".
     - If sharedCompanyCount is null or 0: overlapWarning text or "No material company overlap detected".

3. **Update the card header area:**
   - Keep the rank badge (#N) and quality score number.
   - Keep the characteristics label chip (mapped through assessmentLabel — already done).
   - Keep the "Shown because category is underweighted — not a buy recommendation" disclaimer chip.

4. **Add a column indicator strip** above the candidate list (inside the card, below the category title and disclaimer paragraph):
   - Left: "Ordered by" label + "Instrument quality" in a highlighted style + "universal · not portfolio-specific" in muted text.
   - Right: "Impact indicators" label + "Exposure" and "Overlap" chips + "factual · your portfolio" in muted text.

5. **Update the card description text** (CardDescription in the Suggestions component, line 351):
   - Current: "Instruments below belong to categories where look-through exposure is below median in the approved universe and have passed all guardrail filters. This is a deterministic filter output only. Not a recommendation to buy, sell, or hold any instrument."
   - New: "Instruments below pass all guardrail filters and belong to an underweighted category. Ordered by instrument quality score only. Portfolio impact indicators are factual observations — not a recommendation to buy, sell, or hold."

6. **Remove** the following fields from the candidate card that are no longer shown in the redesign:
   - relevanceScore ("Rel XX")
   - diversificationBenefitScore ("Diversification XX")
   - overlapPenalty ("Overlap penalty XX")
   - diversificationType text
   - secondaryBenefit / expectedPortfolioBenefit "Context:" line
   Keep: assessmentLabel, recommendationScore, confidenceScore (optional small chip), primaryReason (now the exposure text).

7. **Keep unchanged:** sanitizeGapText on all rendered text, the suggestion-level title and rationale section, the "Analytical context" and "Trade-off" panels on the suggestion card (above the candidate list), and all other compliance language and disclaimer chips.

**Tests:** npm.cmd run typecheck, lint, build, test must all pass.

**Implementation log:** Add entry titled "Gap Analysis UI Redesign — instrument quality ordering and impact indicators" covering objective, files changed, summary of each UI change, test results, and a note that this completes the compliance improvement cycle for the Gap Analysis section.

---

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
