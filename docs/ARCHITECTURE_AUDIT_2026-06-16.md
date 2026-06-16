# ETFVision Deep Architecture Audit Report

Last updated: 2026-06-16

Author: Independent architecture/product/compliance/data/UX/engineering audit (Claude).

Status: Review-only audit. No code, migrations, or documentation behavior were changed in producing this report. Evidence is cited as `path:line` or by document. Items requiring a live database, deployed environment, or a test run that was not executed are marked **"Not verified from repository."**

---

## 1. Executive Summary

ETFVision is a genuinely substantial, well-layered Next.js 15 / Supabase portfolio-analytics application with an unusually mature *documentation* surface (50+ docs, 413 commits, 108 migrations, 18 test files). The core engineering instincts are sound: clean architecture (`domain`/`application`/`infrastructure`), deterministic scoring, precomputed summary tables, AI confined to a narrative layer, and a deliberate compliance posture. The dominant gap is not the analytics — it is **access control, product-surface gating, and doc-vs-reality drift**, all of which become blockers the moment a second untrusted user exists.

The single most important finding: **there is no authorization model beyond "is a user logged in."** `requireUser()` (`src/infrastructure/providers/auth/SupabaseAuthProvider.ts:40`) is the only gate, and the dashboard layout applies it uniformly (`src/app/(dashboard)/layout.tsx:5`). Any authenticated user can open `/admin/data-sources`, `/admin/system-health`, `/admin/jobs`, `/admin/assistant-usage`, and trigger service-role data-refresh/seed server actions. There is **no `is_admin` concept anywhere in the codebase** and **no runtime feature-flag system** (the documented "alpha feature gates" are a git branch convention plus a handful of `ENABLE_*` job toggles in `env.ts`, not per-route product gating).

```txt
Alpha readiness:          Medium
Commercial readiness:     Low
Architecture maturity:    Medium-High
Documentation maturity:   High (but drifting)
Technical debt risk:      Medium
Compliance risk:          Medium-High
```

**Main strengths:** clean layered architecture; deterministic, auditable scoring with formula-level docs; real covariance/correlation risk math (`riskMath.ts`); disciplined job runner with locking/logging (`runCronJob.ts`); Security Master identity layer; explicit AI-as-narrative guardrails.

**Main blockers:** (1) no admin/role authorization; (2) no runtime feature gating to produce a true "alpha" surface; (3) RLS is read-scoped only — write authorization rests entirely on application-layer correctness, and the full RLS audit is admittedly not done; (4) doc drift (the headline "Unified Price Refresh" no longer matches the cron schedule); (5) self-declared launch-blocker: export disclaimer helper is unwired dead code; (6) no CI enforcing the test suite.

**Overall risk level:** **Medium for a small, trusted alpha; High for commercial launch** without the authorization, RLS, and compliance-review work.

---

## 1A. Live Database Verification (2026-06-16, read-only)

A strictly read-only pass was run against the live Supabase Postgres database (direct connection, `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`, SELECT-only; no writes, no DDL; temporary driver installed/removed with no tracked-file changes). This resolves several items previously marked "Not verified from repository" and **hardens two critical findings**.

### Confirmed as documented (positive)
- **Active universe:** 324 total / **306 active** = 196 `etf` + 105 `stock` + 5 `crypto_etf`; asset categories EQUITY 264 / BOND 21 / REAL_ESTATE 10 / COMMODITY 6 / CRYPTO 5. Zero active gaps in `etf_category`, `canonical_sector`, `asset_category`. Matches `INSTRUMENT_TAXONOMY_AUDIT.md` exactly.
- **Taxonomy recalc was completed:** `taxonomy_review_status` is now **301 mapped / 5 needs_review** (the docs said the post-cleanup recalc was still pending; it has been run — the noisy 211/95 snapshot is stale).
- **Security Master is real and complete in production** (`get_security_master_health_snapshot()`): 306/306 selectable instruments carry `security_id`; 301 with ISIN/CUSIP; 240 ETF top-holdings mapped, **0 unmapped / 0 ambiguous**; 0 stale identifiers; 0 open issuer-duplicate candidates; 0 provider conflicts. Recommendations (2277), recommendation history (2277), and telemetry recommendation snapshots (1613) are **100% populated with both `security_id` and `issuer_id`**. The Phase 5 identity-propagation claims are verified.
- **Cron matches `scheduled-jobs.md`:** 31 active `cron.job` rows; daily chain is `instrument-price-refresh` ×5 → daily-returns → anchors → market-metrics → risk ×2 → metadata → benchmark → valuation → summary; weekly + monthly as documented. No failed cron runs in the last 14 days; no stale `job_locks`.

### Hardened critical findings (negative)
- **CR-3 (RLS) — confirmed and worse than inferred.** Every one of the ~96 public tables has **exactly one policy, `SELECT` only**. There are **zero INSERT/UPDATE/DELETE/ALL policies anywhere**, including `portfolios`, `holdings`, `transactions`, `cash_balances`, `users`. Additionally: **`assets` has RLS *disabled* entirely** (an inconsistent, real cross-tenant exposure risk via the auto-generated REST API), and four tables have **RLS enabled but zero policies** (`ingestion_events`, `instrument_directory_summary`, `portfolio_dashboard_summary`, `portfolio_performance_summary`) — deny-all to non-service-role. Net: user isolation depends entirely on the application layer + service role; the database is not an enforcement boundary for writes, and `assets` isn't one for reads either.
- **CR-4 (price-refresh drift) — confirmed.** Live `cron.job` uses `instrument-price-refresh` ×5 + `portfolio-valuation-refresh`. The `/api/jobs/price-refresh` route is **not scheduled at all** — it is an orphan, and the `chatgpt-handover.md` "Unified Price Refresh" narrative is stale.

### New operational findings (from `job_runs`, last 7 days)
- **Daily derived-metrics chain is intermittently failing:** `instrument-daily-returns-refresh` 3 failed / 7 success; `instrument-return-anchors-refresh` 2 failed / 8 success; `instrument-market-metrics-refresh` 1 failed / 9 success. This is exactly the documented dependency-fragility (anchors depend on daily returns). The most recent cycle (2026-06-15) succeeded, so it is intermittent, not down — but it is recurring and unmonitored.
- **Risk-metrics job is mostly skipped:** `refresh_instrument_risk_metrics` 68 skipped / 39 success — very high lock-contention/overlap skip rate worth investigating.
- **NewsData ingestion is chronically degraded:** `newsdata-news-ingestion` is `partial_success` on 7/7 recent runs (likely rate-limit/query-group partial failures).
- **No migration ledger:** `supabase_migrations.schema_migrations` does not exist — migrations are not tracked via the standard Supabase mechanism, so applied-state/drift cannot be verified from a version table. This raises the reproducibility risk behind the duplicate-numbered files (`052/061/062`) beyond what the file listing alone implies.

These verifications are reflected inline in the affected items below (CR-3, CR-4, §6.2, §6.4, §8). Items still not checkable this way (numeric calc correctness, deployed Vercel limits, live UI/mobile, legal sufficiency, current `npm test` pass/fail) remain marked accordingly.

---

## 2. Architecture Summary

- **Frontend / SSR:** Next.js 15 App Router, React 19, TypeScript, Tailwind. 27 dashboard pages under `src/app/(dashboard)`, plus public `/methodology` and `/legal/disclosures`. Server Components read from precomputed summary tables.
- **Backend / API:** Server Actions in `src/server/actions/*` for UI mutations; protected job routes under `src/app/api/jobs/*` (27 routes) wrapped by `runCronJob`; `/api/assistant` for chat; `/api/user/disclaimer-acknowledged`. Dependency assembly via `src/server/container.ts` (448 lines).
- **Database:** Supabase Postgres, 108 migration files, RLS enabled broadly, service-role for jobs (`createSupabaseAdminClient`), `pg_net` + Supabase Cron + Vault secrets for scheduling.
- **Scheduled jobs:** Supabase Cron is production scheduler (GitHub Actions retained only as `workflow_dispatch` fallback — 3 workflow files). Daily chain splits prices→returns→anchors→market-metrics→risk→metadata→benchmark→valuation→summary; weekly does fundamentals/news/Market Vision/recommendations/portfolio-review/telemetry; monthly does ETF look-through + universe validation.
- **External providers:** FMP (prices, metadata, fundamentals, ETF exposure, news), FRED (macro), NewsData.io (scheduled news), GDELT (manual only), OpenAI (Market Vision narrative, news classification, assistant).
- **Analytics engines:** deterministic Fundamentals, Risk (incl. covariance risk contribution), Bond/Fixed-Income, Recommendation/Insights, Portfolio Review, Market Vision (AI narrative over structured inputs), Telemetry (1m/3m/6m/12m outcome evaluation).
- **Telemetry:** snapshot + matured-horizon evaluation across recommendations, Market Vision, portfolio review.
- **Deployment:** Vercel (app + job endpoints), Supabase (DB/cron/vault). **Not verified from repository** beyond config/docs.

---

## 3. Strengths

1. **Clean, consistent layering.** Ports/adapters with a single composition root (`container.ts`); UI does not call providers/DB directly. This is real, not aspirational — confirmed across actions, services, repositories.
2. **Deterministic, documented scoring.** `SCORE_METHODOLOGY.md` gives formula-level detail that matches code helpers (e.g., `scoreLowerBetter`, valuation quality-adjustment). Recommendation labels are rule-based; OpenAI is explicitly excluded from label decisions.
3. **Job infrastructure is production-grade.** `runCronJob.ts` provides auth, `job_locks` overlap prevention, `job_runs` structured logging, and status inference (`success`/`partial_success`/`failed`/`skipped`). Jobs are split into small dependent stages to avoid timeouts.
4. **Real risk math.** `src/application/services/risk/riskMath.ts` implements `correlation`, `sampleCovariance`, and `covarianceRiskContributions` with `sqrt(252)` annualization — not stubbed.
5. **Security Master identity layer.** Additive canonical security/issuer mapping (migrations 091–105) enables issuer-level look-through and overlap detection while preserving raw symbols for audit — a sophisticated, correctly *additive* design.
6. **Compliance posture is deliberate.** Internal buy/sell labels are cleanly mapped to neutral assessments (`recommendationPresentation.ts`); Market Vision sanitizes advice-adjacent wording; disclaimer modal/footer + public `/methodology` + `/legal/disclosures` exist.
7. **Performance discipline.** Precomputed summary tables, render-timing instrumentation, and an honest documented lesson (universe summary-table experiment was reverted when it didn't help).

---

## 4. Critical Risks

### CR-1 — No admin/role authorization (any user is effectively admin)
- **Evidence:** `requireUser()` is the only gate (`SupabaseAuthProvider.ts:40`); `(dashboard)/layout.tsx:5` applies it to *all* dashboard routes including `/admin/*`; admin server actions (e.g. `refreshAllDataAction`, `dataRefreshActions.ts:18`) call `requireUser()` then run service-role operations; grep for `isAdmin`/role returns nothing in `src/`.
- **Impact:** Any authenticated (and signup is open — `authActions.ts` exposes sign-up) user can trigger universe seeding, all data refreshes, view system health, AI cost dashboards, and job logs. Privilege-escalation + cost-abuse + data-integrity risk.
- **Fix:** Add an `is_admin`/role on the user record (or an allowlist), gate `/admin/*` routes and every admin server action and admin job-trigger action behind it. Add a server-side `requireAdmin()`.
- **Priority:** P0 (blocks commercial; blocks alpha if alpha users are untrusted).

### CR-2 — No runtime feature gating; "alpha surface" is not enforceable
- **Evidence:** No feature-flag system in `src/` (all `feature flag` hits are docs/migrations). `is_alpha_enabled` column exists (migration 091) but is not consumed for route visibility. `DOCUMENTATION_GAPS.md` and the architecture doc admit alpha gating is "partly completed."
- **Impact:** The documented principle "keep admin diagnostics out of consumer alpha surfaces" cannot be honored without per-branch patching, which the docs themselves warn against. Alpha users see internal/admin/diagnostic surfaces.
- **Fix:** Introduce a small server-side feature-flag/product-mode module (env- or DB-driven) and gate navigation + routes + admin by mode.
- **Priority:** P0 for a credible alpha.

### CR-3 — RLS is read-scoped; write authorization depends entirely on app code
- **Evidence:** Core schema enables RLS on user tables but defines **SELECT-only** policies (`001_core_mvp_schema.sql`: 5 policies, 0 `for insert/update/delete/all`). Across all migrations: 97 `enable row level security` vs 96 `create policy` — roughly one (mostly read) policy per table. `DATABASE_SCHEMA.md:272` and `DOCUMENTATION_GAPS.md` both flag the full RLS audit as open. **Confirmed live (2026-06-16, §1A):** every public table has exactly one `SELECT`-only policy; **zero write policies anywhere**; `assets` has RLS **disabled**; 4 tables are RLS-enabled with no policy.
- **Impact:** Writes succeed only via service role through server actions; correctness of user isolation rests on every action correctly filtering by `userId`. One missed filter = cross-tenant write. No defense-in-depth at the DB.
- **Fix:** Complete the table-by-table RLS audit; add write policies (or explicitly document and test the service-role-only write model with per-action userId assertions).
- **Priority:** P0 before multi-tenant commercial; P1 for alpha.

### CR-4 — Headline price-refresh architecture is stale / divergent
- **Evidence:** `chatgpt-handover.md` (lines 138–194) describes `/api/jobs/price-refresh` as the **unified** daily path (universe → `instrument_prices` → `instrument_market_metrics` → portfolio sync). The actual route only calls `refreshPortfolioPrices.run` (`price-refresh/route.ts:9-11`). The real cron chain (`scheduled-jobs.md`) uses `instrument-price-refresh` ×5 + `portfolio-valuation-refresh`, and never lists `price-refresh`. Two price routes coexist, contradicting the "do not duplicate price refresh paths" guardrail. **Confirmed live (2026-06-16, §1A):** `price-refresh` is absent from `cron.job`; the active daily chain is `instrument-price-refresh`×5 + `portfolio-valuation-refresh`. The handover's "Unified Price Refresh" section is stale and `price-refresh` is an orphan route.
- **Impact:** A new developer following the handover will operate the wrong job; ambiguity about source of truth; risk of stale/mismatched prices.
- **Fix:** Reconcile docs to the live cron; deprecate/remove whichever price route is orphaned; assert one canonical price path.
- **Priority:** P1.

### CR-5 — Export/report disclaimer is unwired dead code (self-declared launch blocker)
- **Evidence:** `src/lib/compliance/exportDisclaimer.ts:3` — `// TODO: LAUNCH BLOCKER — wire exportDisclaimer into PDF/CSV generators`. `appendCsvDisclaimer`/`reportDisclaimerFooter` have **zero usages**; there is **no CSV/PDF export code anywhere** (`text/csv`, `download`, `toCsv`, `application/pdf` all absent). Yet `ARCHITECTURE_OVERVIEW.md:66` and the handover list the export disclaimer helper as "implemented."
- **Impact:** Either exports don't exist (doc overstates a shipped feature) or, if added, they'd ship without disclaimers. Compliance + doc-trust risk.
- **Fix:** Remove the dead helper or implement exports + wire the disclaimer; correct the docs.
- **Priority:** P1 (compliance-adjacent).

### CR-6 — Disclaimer acknowledgement is localStorage-gated and bypassable
- **Evidence:** `DisclaimerModal` triggers on absence of `localStorage.etfvision_disclaimer_v1` (`ARCHITECTURE_OVERVIEW.md:62`), best-effort PATCH to store server-side metadata only "when a user session is available."
- **Impact:** Clearing storage / incognito / API clients bypass acknowledgement; no hard server enforcement that a user accepted terms before using analytics.
- **Fix:** Treat the server-side acknowledgement timestamp as the source of truth and enforce it server-side for gated surfaces before commercial launch.
- **Priority:** P2 for alpha, P1 for commercial.

### CR-7 — Single-provider (FMP) concentration risk
- **Evidence:** `DATA_INGESTION_AND_PROVIDERS.md` — FMP is sole source for prices, metadata, fundamentals, ETF exposure, and FMP news; `provider_primary = financial_modeling_prep` for all 306 active instruments (per `DATA_NORMALIZATION_AUDIT.md`). Top-holding look-through is "limited under current FMP plan."
- **Impact:** FMP outage/plan-limit/price error degrades nearly every analytic at once. Look-through accuracy is plan-capped.
- **Fix:** Provider-health monitoring + documented degradation/fallback per layer; plan the second identifier/price provider the Phase 7 tables anticipate.
- **Priority:** P1 for commercial.

---

## 5. Documentation vs Implementation Alignment

| Domain | Documentation says | Implementation appears to do | Alignment | Notes |
|---|---|---|---|---|
| Product architecture | Clean layered service/repo, UI never calls providers/DB | Confirmed in code structure | Aligned | Strong. |
| Database schema | 108 migrations, additive Security Master, RLS | Confirmed; dup-numbered files 052/061/062 | Mostly aligned | Numbering collisions; RLS read-only. |
| Data ingestion | FMP/FRED/NewsData/GDELT/OpenAI adapters | Provider adapters present | Aligned | FMP concentration. |
| Scheduled jobs | Supabase cron, split stages, runCronJob | Confirmed; **price-refresh path drift** | Partially aligned | Handover stale (CR-4). |
| Portfolio analytics | Flow-aware TWR, snapshots | Services present (`PerformanceService`, `AnalyticsService`) | Mostly aligned | Formula spot-checked vs doc; full numeric QA not run. |
| Risk analytics | Vol, drawdown, covariance contributions | `riskMath.ts` implements all | Aligned | Genuine strength. |
| Bond intelligence | Bond-ETF only, seeded fallbacks | `bond_profiles` + seeded list documented | Mostly aligned | Coverage map pending (doc-admitted). |
| Fundamentals | FMP lineage, derived fallbacks, scores/trends | Services + field map documented | Aligned | Sector-relative scoring still future. |
| News intelligence | Multi-provider, dedupe, classify, reconcile | Services enumerated; `ENABLE_*` gated | Mostly aligned | AI classification default OFF in env. |
| Theme intelligence | Deterministic + AI-assisted themes | Service present | Partially aligned | Thresholds not documented (gap-listed). |
| Market Vision | AI narrative over structured inputs, sanitized | 1685-line generation service | Mostly aligned | High complexity; draft/publish policy open. |
| Recommendation/Insights | Deterministic, guardrails, neutral labels | `recommendationScoring`, presentation map | Aligned | Internal buy/sell labels persist in DB/types. |
| Portfolio Review | Deterministic sections, gap screener | Services + weights match doc | Aligned | Geography weight 0%. |
| Telemetry | Snapshot + matured-horizon eval | Services + tables present | Mostly aligned | Sparse by design; completeness unmonitored. |
| Assistant | Authed, guardrails, CIO-style | Route authed, guardrail services exist | Mostly aligned | Cost defaults 0; table/cost schema unverified (doc-admitted). |
| Feature flags / access | Alpha feature gates, admin separation | **No runtime gating; no admin role** | Misaligned | CR-1, CR-2. |
| UX / pages | 27 pages, summary-driven | Confirmed | Aligned | Heavy pages (1200+ LOC). |
| Performance | Summary tables, render timing | Confirmed | Aligned | Several pages still un-optimized (doc-listed). |
| Security | RLS + service role | RLS read-only; auth = any user | Partially aligned | CR-1/CR-3. |
| Compliance | Disclaimers, methodology, export copy | Modal/footer/methodology yes; **export unwired** | Partially aligned | CR-5, CR-6. |

---

## 6. Domain-by-Domain Review

*(Format per domain: Current state · Strengths · Gaps · Risks · Fixes · Priority.)*

### 6.1 Product Architecture
**State:** Clean App-Router app, single DI container, ports/adapters. **Strengths:** consistent separation; testable services. **Gaps:** `container.ts` (448 LOC) and several 1000+ LOC files are growing god-objects; no architectural lint enforcing layer boundaries. **Risks:** erosion of boundaries over time. **Fixes:** add dependency-direction lint (e.g., eslint-plugin-boundaries); split largest services. **Priority:** P2.

### 6.2 Database Architecture
**State:** 108 migrations, additive evolution. **Strengths:** additive Security Master; clear table taxonomy. **Gaps:** duplicate-numbered migrations (`052_newsdata_daily_queue` vs `052_portfolio_lookthrough_holdings`; `061`×2; `062`×2) create ordering ambiguity; no schema-as-source dump; RLS read-only. **Risks:** migration replay order on a fresh environment may differ from production. **Fixes:** renumber or adopt timestamped migrations; generate a consolidated schema snapshot; complete RLS write policies. **Priority:** P1.

### 6.3 Data Ingestion & Providers
**State:** Adapter per provider; FMP central. **Strengths:** documented FMP field lineage and derived-ratio fallbacks. **Gaps:** single-provider concentration; no provider-health dashboard (listed as future); top-holding coverage plan-limited. **Risks:** correlated failures (CR-7). **Fixes:** provider-health monitoring, per-layer degradation labels, second-provider plan. **Priority:** P1.

### 6.4 Scheduled Jobs & Operations
**State:** Supabase cron + `runCronJob` (lock/log/status). **Strengths:** overlap locks, TTL, structured `job_runs`. **Gaps:** price-refresh drift (CR-4); 4 overlapping portfolio-summary routes (`portfolio-summary-refresh`, `-dashboard-`, `-performance-`, `-risk-`) — ownership unclear; locks rely on TTL after HTTP timeouts (stale-lock failure mode is documented). **Risks:** wrong/duplicate job operation; stale-lock stalls. **Fixes:** reconcile docs↔cron↔migrations; consolidate/clarify summary jobs; add stale-lock alerting. **Priority:** P1.

### 6.5 Portfolio Analytics
**State:** Flow-aware TWR with deposit/withdrawal handling and manual-capital-base override. **Strengths:** thoughtful edge-case handling (`CALCULATION_METHODOLOGY.md`). **Gaps:** numeric correctness not independently re-verified here (**Not verified from repository** — no live data). **Risks:** return-formula regressions; doc warns formula changes need targeted QA. **Fixes:** golden-fixture regression tests for TWR/holding/cash flows. **Priority:** P1.

### 6.6 Risk Analytics
**State:** Volatility (30/90/1Y), drawdown, downside, covariance risk contributions. **Strengths:** genuine implementation; sqrt(252) convention documented with a QA guard against percent/decimal scale errors. **Gaps:** `/risk` page not yet performance-optimized (doc-listed). **Risks:** scale-mix bugs (explicitly called out). **Fixes:** keep the decimal-scale assertion in tests; optimize `/risk`. **Priority:** P2.

### 6.7 Bond Intelligence
**State:** Bond-ETF only; seeded fallback profiles for ~11 core ETFs. **Strengths:** rich classification schema. **Gaps:** no individual-bond support; coverage map (seeded vs provider vs manual) not documented. **Risks:** users assume single-bond support. **Fixes:** publish a fixed-income coverage table; label estimated/seeded profiles in UI. **Priority:** P2.

### 6.8 Fundamentals
**State:** FMP profiles/statements/ratios → scores + trends, with derived-ratio fallbacks. **Strengths:** transparent fallback marking (`provider_metadata.derivedFallbacks`). **Gaps:** no sector-relative or financial-sector-specific scoring (doc-flagged); fundamentals refresh weekly, sparse-history fixtures wanted. **Risks:** cross-sector comparability of scores. **Fixes:** sector-relative normalization before fundamentals weight increases. **Priority:** P2.

### 6.9 News Intelligence
**State:** Multi-provider ingest, dedupe, classify, weekly reconcile; AI classification and weekly reconciliation default **OFF** in `env.ts` (`ENABLE_AI_NEWS_CLASSIFICATION` / `ENABLE_WEEKLY_NEWS_RECONCILIATION` default false). **Strengths:** provider abstraction, source-quality tiers. **Gaps:** classification thresholds/review-queue rules undocumented; default-off flags mean scheduled docs may not reflect runtime. **Risks:** Market Vision input quality if flags off in prod. **Fixes:** document thresholds; confirm prod flag values. **Priority:** P2.

### 6.10 Theme Intelligence
**State:** Deterministic + optional AI theme classification feeding Market Vision. **Strengths:** canonical taxonomy. **Gaps:** keyword/threshold logic not documented; theme exposure intentionally non-100% (tag-style). **Risks:** opaque theme derivation. **Fixes:** document derivation + confidence. **Priority:** P3.

### 6.11 Market Vision
**State:** Weekly AI CIO narrative; deterministic macro-impact matrix and confidence calibration computed in code, not by LLM. **Strengths:** advice-language sanitization; capped composite drivers; regime-transition normalization. **Gaps:** `MarketVisionGenerationService.ts` is 1685 LOC (complexity hotspot); draft-vs-publish lifecycle policy unresolved (doc-flagged). **Risks:** maintainability; ambiguous publish behavior. **Fixes:** decompose the service; decide publish policy. **Priority:** P2.

### 6.12 Recommendation / Insights Engine
**State:** Deterministic, weighted-by-type, guardrail-capped; public neutral-label mapping. **Strengths:** clean internal→public mapping (`recommendationPresentation.ts`); guardrails auditable. **Gaps:** internal labels `Strong Buy/Buy/Sell/Reduce` persist in DB and the `RecommendationLabel` type — any surface rendering raw labels is a compliance leak; macro-fit "too neutral for many ETFs" (doc-flagged). **Risks:** label leakage; thin differentiation. **Fixes:** assert public mapping at every render path (test); calibrate macro fit. **Priority:** P1 (compliance angle).

### 6.13 Portfolio Review Engine
**State:** Deterministic sections with documented weights; gap analysis framed as underweighted-category screener with "not a buy recommendation" chip. **Strengths:** issuer-level look-through; direct-position display precedence. **Gaps:** Geography weight is 0% (dead section); candidate thresholds undocumented; pre-Phase-4C reports lack issuer IDs. **Risks:** users read screener as advice. **Fixes:** either weight or remove geography; document thresholds; keep disclaimer chips. **Priority:** P2.

### 6.14 Telemetry
**State:** Snapshot + matured-horizon (1/3/6/12m) evaluation across three output types. **Strengths:** identity-stable snapshots (Phase 5). **Gaps:** sparse early data; completeness not monitored; should never auto-tune weights. **Risks:** premature/empty telemetry shown to users. **Fixes:** monitor snapshot/eval completeness; label "early/sparse." **Priority:** P3.

### 6.15 Assistant
**State:** Authed `/api/assistant` (`getCurrentUser` → 401), portfolio-required, intent + response guardrails, issuer-level context. **Strengths:** advice guardrails; conversation continuity; cost tracking surface. **Gaps:** cost defaults are `0` and model IDs are `gpt-5.4-mini/-nano` defaults in `env.ts` — **cost tracking reports $0 unless configured**, and model IDs need provider validation (**Not verified from repository**); exact assistant tables/cost formula doc-admitted unverified; no per-user rate limiting visible. **Risks:** uncontrolled AI spend; no abuse throttle. **Fixes:** validate model IDs + real cost constants; add per-user rate limit/quota; finalize cost schema. **Priority:** P1 for commercial.

### 6.16 Feature Flags & Access Control
**State:** `ENABLE_*` env toggles for jobs/assistant only; **no admin role, no per-route/product-mode gating**. **Strengths:** job-level kill switches exist. **Gaps:** CR-1, CR-2. **Risks:** privilege escalation, cost abuse, internal-surface exposure. **Fixes:** `requireAdmin()` + product-mode module. **Priority:** P0.

### 6.17 UX & Page Architecture
**State:** 27 pages, summary-table-driven, professional component system. **Strengths:** consistent shell; deferred analytics panels. **Gaps:** very large page files (`admin/data-sources` 1231 LOC, `portfolio-review` 919, `market-vision` 777) mix data-fetch + presentation; no documented onboarding flow beyond setup; mobile/institutional polish unverified (**Not verified from repository**). **Risks:** render cost; maintainability. **Fixes:** extract server data loaders from page components; onboarding pass. **Priority:** P2.

### 6.18 Performance
**State:** Precomputed summaries + render-timing flag. **Strengths:** honest, evidence-driven optimization (reverted a non-helpful experiment). **Gaps:** `/risk`, `/bonds`, `/news`, `/market-vision`, `/telemetry` still on the optimization backlog; admin/data-sources page loads many logs + service-role reads on render. **Risks:** slow heavy pages at scale. **Fixes:** complete documented summary phases; paginate admin logs. **Priority:** P2.

### 6.19 Security
**State:** Supabase auth, middleware partial-path protection, layout-level `requireUser`, RLS read policies, service-role jobs, `CRON_SECRET` job auth. **Strengths:** job auth with timing-safe secret check; RLS on user tables. **Gaps:** CR-1 (no role), CR-3 (read-only RLS), `CRON_SECRET` accepted as **URL query param** (`cronAuth.ts:10`) risks secret in logs; middleware `protectedPaths` list is stale/narrow (redundant with layout but misleading); `env.ts` parses at import (a missing required var hard-crashes app — acceptable but blunt). **Risks:** escalation, secret leakage, cross-tenant writes. **Fixes:** role gating, RLS write audit, prefer header-only secret, document env fail-fast. **Priority:** P0/P1.

### 6.20 Commercialization Readiness
**State:** `COMMERCIALIZATION_AUDIT_PLAN.md` is a strong master checklist; several audits "completed," others "partly." **Strengths:** the "explain every result" principle is excellent. **Gaps:** legal review pending; provider coverage matrix incomplete; RLS/feature-gate/admin authz open; no billing/subscription/rate-limit primitives; no CI gating tests. **Risks:** launching analytics that can't be access-controlled or cost-controlled. **Fixes:** see roadmap §16. **Priority:** P0–P1.

---

## 7. Compliance and Advice-Risk Review

The product is deliberately positioned as **analytics/"informational," not advice**, and much of the scaffolding for that is present. Residual risk is concentrated in (a) internal label leakage, (b) enforcement of acknowledgement, and (c) the gap between "personalized portfolio review" and regulated advice.

| Surface | Could be read as… | Current handling | Risk |
|---|---|---|---|
| Recommendation engine naming | Buy/sell recommendation engine | Internal labels `Strong Buy…Sell` mapped to `Excellent…Significant Concerns` (`recommendationPresentation.ts`); DB/type retain raw labels | **Medium** — leak risk on any unmapped render path |
| Portfolio Review "gap analysis" | Personalized advice / robo-advice | Framed as underweighted-category screener + "not a buy recommendation" chip | **Medium** — personalized + portfolio-specific is the highest-scrutiny surface |
| Assistant | Robo-advice | Response guardrails avoid buy/sell instructions; positioned as analytical CIO | **Medium** — LLM output is probabilistic; needs ongoing red-teaming |
| Market Vision | Market-timing advice | Advice-adjacent terms sanitized (`tradeable`, `entry point` → `monitor`) | **Low-Medium** |
| Disclaimers | — | Modal + sticky footer + `/methodology` + `/legal/disclosures` | **Medium** — localStorage-gated (CR-6), `/legal/disclosures` is a placeholder, export disclaimer unwired (CR-5) |
| Labels/headings | — | Neutral assessment vocabulary enforced in docs | **Low** |

**Classification:** Overall advice-risk **Medium**. The combination of *personalized* portfolio review + a conversational assistant + stored buy/sell internal labels is exactly the surface a regulator scrutinizes. **Recommendations:** (1) add an automated test that no consumer surface renders a raw internal label; (2) make `/legal/disclosures` real and have counsel review it; (3) enforce acknowledgement server-side; (4) wire (or remove) export disclaimers; (5) keep an LLM-output compliance test set for the assistant. A qualified securities/financial-regulation attorney should review the jurisdiction-specific advice line before paid launch. **(Legal sufficiency is Not verified from repository — engineering can reduce but not clear this risk.)**

---

## 8. Data and Methodology Risk Review

- **ETF classification quality:** Strong on paper — 201 ETFs/105 stocks, separation of product taxonomy from look-through exposure, canonical sectors. Live counts are **doc-claimed (2026-06-12), not independently verified here.**
- **Provider dependency:** **High FMP concentration** (CR-7); FRED/NewsData stable; GDELT intentionally manual due to rate limits.
- **Missing-data handling:** Documented fallbacks (derived ratios, seeded bond profiles, sector→category exposure fallback marked "estimated/limited"). Generally good.
- **Stale-data handling:** Freshness diagnostics + `coverage_status` *not* a physical column (derived). Trading-day-aware freshness is a future item.
- **Score transparency:** Excellent — formula-level `SCORE_METHODOLOGY.md` matches code; public `/methodology` mirror.
- **Methodology consistency:** Mostly consistent; geography weight 0% and macro-fit "too neutral" are known soft spots.
- **Holdings reliability:** Top-holding look-through is **plan-limited**; portfolio concentration accuracy varies by ETF coverage — a real analytic-quality caveat that should be surfaced in UI.
- **Benchmark/proxy logic:** Documented (daily recent + manual long backfill); not numerically re-verified here.
- **Correlation/covariance:** Implemented (`riskMath.ts`) — a strength.
- **Telemetry thresholds:** Matured-horizon evaluation; early data sparse; must not auto-tune weights (correctly noted).

**Net:** methodology design is a strength; the data-supply chain (single provider, capped look-through) is the methodology's real risk.

---

## 9. Performance and Scalability Review

*Vercel/Supabase quantitative limits and live timings: **Not verified from repository.***

- **10 alpha users:** Comfortable. Read-mostly pages on precomputed tables; scheduled jobs sized for one scheduled portfolio.
- **100 users:** Likely fine for reads. **Watch:** per-user portfolio valuation/summary/review/recommendation jobs are oriented around `SCHEDULED_USER_ID`/`SCHEDULED_PORTFOLIO_ID` (single scheduled portfolio). Multi-user scheduled refresh is **not evidenced** — per-user job fan-out design is needed.
- **1,000 users:** Requires (a) per-user job orchestration/queueing, (b) assistant rate-limiting/cost controls, (c) completion of summary-table phases for `/risk`, `/news`, `/market-vision`, (d) admin log pagination.
- **10,000 users:** Needs a real job queue (beyond cron-staggered passes + TTL locks), connection-pool review (Supabase/Postgres), AI cost budgeting, and caching/CDN for public pages.
- **Specific hotspots:** `admin/data-sources` page loads many logs + service-role reads on render (1231 LOC); `MarketVisionGenerationService` 1685 LOC; large page files do data-fetch inline; indexes documented (`(portfolio_id, updated_at desc)` etc.) but no scale test.
- **Scheduled job duration:** Mitigated by staged passes + TTL locks; stale-lock-after-timeout is the documented failure mode to monitor.

**Verdict:** architecture is read-scalable; the **scheduled-refresh model is the scaling bottleneck** beyond a handful of portfolios.

---

## 10. Security and Privacy Review

- **Authentication:** Supabase email/password, `getUser()` (validates server-side) — sound. Open self-signup (`authActions.ts`).
- **Authorization:** **Weakest area.** Only "logged-in"; no admin role (CR-1); no product gating (CR-2).
- **RLS:** Read policies present; **write policies largely absent** (CR-3); full audit open.
- **API keys / secrets:** Server-side env; `CRON_SECRET` timing-safe compare but accepted via **URL query param** (log-leak risk).
- **Env vars:** Zod-validated, fail-fast at import; required keys enforced.
- **User portfolio data protection:** Depends on app-layer userId scoping (see CR-3).
- **Logging of sensitive data:** `job_runs.metadata` stores job payloads (`runCronJob.ts:157`) — verify no PII/secrets land there; provider payloads are excluded from `summarize()` but full `data` is stored in metadata.
- **Admin-only pages:** **Not actually admin-only** (CR-1).
- **Telemetry privacy:** Snapshots keyed to portfolio/user; covered by same RLS caveat.
- **Assistant context restrictions:** Scoped to the requesting user's portfolio (good); no rate limit/quota (cost + abuse risk).

**Verdict:** Authentication is fine; **authorization and RLS are the launch-blocking security gaps.**

---

## 11. UX and Product Readiness Review

- **Onboarding:** `/setup` + setup/taxonomy exist; first-login disclaimer modal. A guided onboarding for non-experts is **not evidenced**.
- **Portfolio input flow:** Manual holdings/transactions/cash with snapshots; documented to tolerate edits without code changes.
- **Portfolio review clarity:** Strong structure; "underweighted category" framing is clear and compliance-aware.
- **Score explainability:** Excellent (public `/methodology`, neutral labels, accordions).
- **Insights clarity:** Good, given neutral mapping.
- **Market Vision usefulness:** High-effort narrative; draft/publish ambiguity may confuse.
- **Telemetry visibility:** Present but sparse-early; risk of showing empty/low-n results.
- **Alpha UX:** Undermined by internal/admin surfaces being visible (CR-2).
- **Cognitive load:** High for non-experts (dense analytics, many pages) — institutional feel is good, retail accessibility less so. **Not verified from repository** (no live UI run).
- **Mobile usability:** **Not verified from repository.**
- **Professional/institutional feel:** Component system + Singapore-time formatting + methodology transparency suggest a professional bar.

---

## 12. Technical Debt Register

| Item | Area | Severity | Evidence | Impact | Suggested Fix |
|---|---|---|---|---|---|
| No admin/role authorization | Security | **Critical** | `requireUser()` only; no `isAdmin` in `src/` | Any user reaches admin + service-role actions | Add `requireAdmin()` + role |
| No runtime feature gating | Access | **Critical** | No flag system in `src/`; `is_alpha_enabled` unused | No real alpha surface; internal exposure | Product-mode/flag module |
| RLS write policies missing | DB | **High** | `001_core_mvp_schema.sql` SELECT-only; 96 policies/97 enables | User isolation rests on app code | Complete RLS audit + write policies |
| Price-refresh doc/path drift | Jobs | **High** | `price-refresh/route.ts:9` vs handover §138; not in cron | Wrong job operated; dup paths | Reconcile, deprecate orphan |
| Export disclaimer unwired dead code | Compliance | **High** | `exportDisclaimer.ts:3` LAUNCH BLOCKER; 0 usages | Doc overstates; future export risk | Wire or remove; fix docs |
| Duplicate migration numbers | DB | **Medium** | `052/061/062` ×2 | Ordering ambiguity on fresh deploy | Renumber/timestamp |
| No CI for tests/lint/build | Eng process | **Medium** | `.github/workflows` only data-refresh | Regressions merge unblocked | Add CI (typecheck+test+build) |
| AI cost defaults 0 + placeholder models | Observability | **Medium** | `env.ts:23-27,20-25` | $0 cost tracking; possible API failures | Set real constants/model IDs; validate |
| `CRON_SECRET` via query param | Security | **Medium** | `cronAuth.ts:10` | Secret in logs/history | Header-only |
| Disclaimer ack localStorage-gated | Compliance | **Medium** | `ARCHITECTURE_OVERVIEW.md:62` | Bypassable consent | Server-enforced ack |
| God-object services/pages | Maintainability | **Medium** | MV service 1685 LOC; admin page 1231 | Hard to change safely | Decompose |
| Geography review weight 0% | Methodology | **Low** | `PORTFOLIO_REVIEW_METHODOLOGY.md:31` | Dead section | Weight or remove |
| 4 overlapping summary-refresh routes | Jobs | **Low** | api/jobs listing | Unclear ownership | Consolidate/document |
| Single-provider concentration | Data | **Medium** | all `provider_primary=FMP` | Correlated outages | Second provider plan |
| `assets` table has RLS disabled | Security | **High** | Live §1A — only public table with RLS off | Cross-tenant exposure via REST API | Enable RLS + owner policy |
| Daily derived-metrics chain intermittently fails | Jobs | **Medium** | Live §1A — returns/anchors/metrics 3/2/1 fails in 7d | Stale market metrics on some days | Alert on chain failure; retry |
| Risk-metrics job mostly skipped | Jobs | **Medium** | Live §1A — 68 skipped / 39 success | Risk metrics may lag | Investigate lock contention/TTL |
| No migration ledger | DB/Ops | **Medium** | Live §1A — `supabase_migrations.schema_migrations` absent | Applied-state/drift unverifiable | Adopt tracked migrations |
| NewsData ingestion chronically partial | Data | **Low-Med** | Live §1A — 7/7 `partial_success` | Degraded macro-news inputs | Diagnose query-group/rate limits |

---

## 13. Top 20 Improvements Ranked by Impact

1. **Add admin role + `requireAdmin()` gating** — *Why:* closes privilege escalation. *Impact:* High. *Difficulty:* Low-Med. *Owner:* Codex. *Priority:* P0.
2. **Runtime feature-flag / product-mode module** — true alpha surface. High. Med. *Codex.* P0.
3. **Complete RLS audit + add write policies** — defense-in-depth tenant isolation. High. Med-High. *Human + Codex.* P0.
4. **Add CI (typecheck + test + build) on PRs** — prevent regressions. High. Low. *Codex.* P0.
5. **Reconcile price-refresh docs↔cron; remove orphan path** — operational correctness. High. Low. *Codex.* P1.
6. **Wire or remove export disclaimer; make `/legal/disclosures` real** — compliance. High. Low-Med. *Human (counsel) + Codex.* P1.
7. **Server-enforced disclaimer acknowledgement** — consent integrity. Med-High. Med. *Codex.* P1.
8. **Assistant rate-limiting + real cost constants/model validation** — cost/abuse control. High. Med. *Codex.* P1.
9. **Provider-health dashboard + per-layer degradation labels** — resilience. High. Med. *Codex.* P1.
10. **Per-user scheduled-refresh orchestration (queue/fan-out)** — multi-user scaling. High. High. *Human + Codex.* P1.
11. **Renumber/timestamp migrations; generate schema snapshot** — deploy safety. Med. Low-Med. *Codex.* P1.
12. **Test asserting no consumer surface renders raw internal labels** — compliance leak guard. Med-High. Low. *Codex.* P1.
13. **Golden-fixture regression tests for TWR/holding/cash** — calc safety. High. Med. *Codex.* P1.
14. **Decompose `MarketVisionGenerationService` + large admin pages** — maintainability. Med. Med. *Codex.* P2.
15. **`CRON_SECRET` header-only** — secret hygiene. Med. Low. *Codex.* P2.
16. **Complete summary-table phases for `/risk`, `/news`, `/market-vision`, `/telemetry`** — perf. Med. Med. *Codex.* P2.
17. **Sector-relative fundamentals scoring** — analytic quality. Med. Med-High. *Human + Codex.* P2.
18. **Fixed-income & ETF look-through coverage matrices + UI "estimated" labels** — trust. Med. Med. *Codex.* P2.
19. **Resolve Market Vision draft/publish policy** — product clarity. Low-Med. Low. *Human decision.* P2.
20. **Page Data Map doc (`PAGE_DATA_MAP.md`)** — onboarding/maintainability. Med. Med. *Codex.* P3.

---

## 14. Top 10 Risks Before Alpha Testing

1. **Admin/service-role actions reachable by any user** — *Mitigation:* role gate `/admin/*` + admin actions. **P0.**
2. **No alpha surface separation** — internal/diagnostic pages visible. *Mitigation:* product-mode gating. **P0.**
3. **RLS write authorization unproven** — *Mitigation:* verify every write action scopes by userId; spot RLS write policies. **P0/P1.**
4. **Stale handover (price-refresh)** — operator confusion during alpha refresh verification. *Mitigation:* fix docs before onboarding testers. **P1.**
5. **Open signup + no assistant rate limit** — cost/abuse during alpha. *Mitigation:* invite-only signup or allowlist + per-user assistant quota. **P1.**
6. **Disclaimer acknowledgement bypassable** — *Mitigation:* accept the localStorage gate for closed alpha but log server-side ack. **P2.**
7. **No CI** — testers hit regressions. *Mitigation:* CI before inviting users. **P1.**
8. **AI cost tracking shows $0** — can't see alpha spend. *Mitigation:* set real cost constants + validate model IDs. **P1.**
9. **Look-through coverage gaps unlabeled** — testers over-trust concentration numbers. *Mitigation:* "estimated/limited" badges. **P2.**
10. **Multi-portfolio scheduled refresh unproven** — if alpha has >1 portfolio, jobs may only refresh the scheduled one. *Mitigation:* verify per-user refresh path. **P1.**

---

## 15. Top 10 Risks Before Commercial Launch

1. **Authorization/RLS not commercial-grade** — *Mitigation:* full role model + RLS write audit + pen test. *Human review:* **Yes.**
2. **Advice/robo-advice regulatory exposure** (personalized review + assistant + internal buy/sell labels) — *Mitigation:* counsel review, label-leak tests, jurisdiction scoping. *Human:* **Yes (securities attorney).**
3. **Legal disclosures placeholder + unwired export disclaimer** — *Mitigation:* real disclosures, wired/removed exports. *Human:* **Yes.**
4. **Single-provider (FMP) dependency** — *Mitigation:* second provider + SLA monitoring. *Human:* Partly.
5. **AI cost uncontrolled** — *Mitigation:* budgets, quotas, real cost accounting. *Human:* No (eng).
6. **Scaling via cron is a ceiling** — *Mitigation:* job queue + per-user orchestration. *Human:* Architecture sign-off.
7. **No billing/subscription/entitlements** — *Mitigation:* build commercial primitives. *Human:* **Yes (product).**
8. **Data-quality/repro guarantees** — the "explain every result" principle isn't fully enforced (look-through gaps, stale labels). *Mitigation:* coverage/freshness gating before display. *Human:* Partly.
9. **No CI / limited automated QA depth** — *Mitigation:* CI + golden fixtures + load tests. *Human:* No.
10. **Privacy/retention/PII posture undocumented** (`job_runs.metadata`, assistant logs) — *Mitigation:* data-handling/retention policy + log scrubbing. *Human:* **Yes (privacy/legal).**

---

## 16. Recommended 30/60/90-Day Roadmap

### Next 30 Days
- Admin role + `requireAdmin()` gating (**Must do**)
- Runtime feature-flag/product-mode for alpha surface (**Must do**)
- CI: typecheck + test + build on PRs (**Must do**)
- Reconcile price-refresh docs↔cron; remove orphan path (**Must do**)
- Invite-only/allowlist signup + assistant rate limit (**Must do**)
- Real AI cost constants + validate model IDs (**Should do**)
- Label-leak test (no raw internal labels in consumer UI) (**Should do**)

### Next 60 Days
- Full RLS audit + write policies + tenant-isolation tests (**Must do**)
- Server-enforced disclaimer acknowledgement; real `/legal/disclosures`; wire/remove export disclaimer (**Must do** — with counsel)
- Provider-health dashboard + degradation/coverage labels (**Should do**)
- Golden-fixture regression tests for TWR/holding/cash (**Should do**)
- Renumber/timestamp migrations + schema snapshot (**Should do**)
- Per-user scheduled-refresh design (spike) (**Should do**)

### Next 90 Days
- Per-user job orchestration / queue (**Must do** for >~100 users)
- Decompose god-object services/pages; complete summary-table perf phases (**Should do**)
- Sector-relative fundamentals + macro-fit calibration (**Should do**)
- Second data provider integration (**Should do**)
- Billing/entitlements + privacy/retention policy (**Must do** for paid launch — human/product)
- `PAGE_DATA_MAP.md` + load testing (**Nice to have**)

---

## 17. Suggested Codex Task Backlog

1. **Admin authorization layer**
   - *Objective:* Add `is_admin`/role and `requireAdmin()`; gate `/admin/*` routes and all admin server actions + admin job-trigger actions.
   - *Docs:* `SECURITY_AND_ACCESS_ARCHITECTURE.md`, `feature-gated-production-architecture-audit.md`.
   - *Files:* `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`, `src/app/(dashboard)/admin/*`, `src/server/actions/dataRefreshActions.ts`, `jobActions.ts`, `(dashboard)/layout.tsx`, a new migration for the role.
   - *Acceptance:* non-admin authenticated user gets 403/redirect on every admin page and admin action; admin sees them; test coverage.
   - *Risk:* Medium (touches auth/migrations).

2. **Runtime feature-flag / product-mode module**
   - *Objective:* Env- or DB-driven flags; gate nav + routes + admin by mode (alpha/internal/full).
   - *Docs:* `feature-gated-production-architecture-audit.md`, `COMMERCIALIZATION_AUDIT_PLAN.md`.
   - *Files:* new `src/lib/featureFlags.ts`, `components/layout/app-shell.tsx`, route guards.
   - *Acceptance:* alpha mode hides admin/diagnostic/non-alpha routes via config only (no branch patching).
   - *Risk:* Medium.

3. **RLS write-policy audit + tests**
   - *Objective:* Add/verify INSERT/UPDATE/DELETE policies per user table; add isolation tests.
   - *Docs:* `DATABASE_SCHEMA.md` §RLS, `DOCUMENTATION_GAPS.md` High-Priority #1.
   - *Files:* `supabase/migrations/*`, new RLS migration, tests.
   - *Acceptance:* cross-user write attempt fails at DB; documented policy matrix.
   - *Risk:* High (security-sensitive).

4. **CI pipeline**
   - *Objective:* GitHub Actions running `npm run typecheck`, `npm test`, `npm run build` on PRs.
   - *Files:* `.github/workflows/ci.yml`.
   - *Acceptance:* PRs blocked on failure.
   - *Risk:* Low.

5. **Price-refresh reconciliation**
   - *Objective:* Make docs match live cron; deprecate/remove orphan route; single canonical price path.
   - *Docs:* `chatgpt-handover.md`, `scheduled-jobs.md`.
   - *Files:* `src/app/api/jobs/price-refresh/route.ts`, `instrument-price-refresh/route.ts`, docs.
   - *Acceptance:* one documented path; handover updated; no dead route.
   - *Risk:* Medium (operational).

6. **Compliance hardening**
   - *Objective:* Wire (or remove) export disclaimer; real `/legal/disclosures`; server-enforced ack; label-leak test.
   - *Files:* `src/lib/compliance/*`, `src/app/legal/disclosures/page.tsx`, `src/components/compliance/*`, new test.
   - *Acceptance:* no raw internal label on consumer surfaces; ack enforced server-side; no dead disclaimer helper.
   - *Risk:* Medium.

7. **Assistant cost & rate controls**
   - *Objective:* Real cost-per-1M constants, validated model IDs, per-user rate limit/quota.
   - *Files:* `src/infrastructure/config/env.ts`, `OpenAiPortfolioAssistantProvider.ts`, `src/app/api/assistant/route.ts`.
   - *Acceptance:* non-zero cost tracking; throttling enforced; admin usage accurate.
   - *Risk:* Medium.

8. **Migration numbering cleanup**
   - *Objective:* Resolve duplicate `052/061/062`; adopt convention; emit schema snapshot.
   - *Files:* `supabase/migrations/*`.
   - *Acceptance:* unique ordered identifiers; fresh-DB apply verified.
   - *Risk:* Medium (must preserve applied-state).

---

## 18. Questions for the Project Owner

1. **Alpha trust model:** Are alpha users trusted insiders (lowers CR-1 urgency) or external? Is signup invite-only or open?
2. **Admin identity:** Single owner-admin, or multiple roles (admin/analyst/user)? This shapes the role model.
3. **Regulatory scope:** Which jurisdiction(s)/regulators, and is the intended positioning strictly "informational tool" vs any advisory element? Has counsel been engaged?
4. **Multi-portfolio at scale:** Should scheduled refreshes run per-user/per-portfolio at launch, or remain single-scheduled-portfolio for alpha?
5. **AI models/cost:** Are `gpt-5.4-mini/-nano` the intended production models, and what are the real cost constants? (Defaults are 0/placeholder.)
6. **Exports:** Is CSV/PDF export a launch feature? (No export code exists today; the disclaimer helper is unused.)
7. **Market Vision lifecycle:** Should scheduled generation publish or stay draft-only?
8. **Data provider strategy:** Is a second provider (for resilience + better look-through) in scope before commercial launch?
9. **Live verification:** Can you confirm the doc-claimed live Supabase counts (306 active instruments) and that `npm test` currently passes? These could not be verified from the repository.

---

## 19. Final Verdict

**Is the architecture good enough for alpha?** **Yes, for a small, trusted, invite-only alpha — with two non-negotiable pre-conditions:** add admin authorization (CR-1) and a feature/product-mode gate (CR-2), and fix the price-refresh doc drift so operators run the right jobs. The analytics, determinism, and job infrastructure are genuinely alpha-ready; the access model is not.

**Is it good enough for commercial launch?** **No, not yet.** Commercial launch additionally requires: a complete RLS write-policy audit, legal/compliance review (advice positioning, real disclosures, enforced acknowledgement), AI cost/rate controls, provider resilience, per-user scheduled-refresh scaling, CI, and billing/entitlement primitives.

**What should be fixed first?** In order: (1) admin role gating, (2) feature/product-mode gating, (3) CI, (4) price-refresh reconciliation, (5) RLS write audit. These are mostly low-to-medium effort and remove the highest risks.

**What should NOT be touched yet?** The deterministic scoring/calculation formulas, the additive Security Master layer, the TWR/cash-flow methodology, and the recommendation guardrails — these are working, documented, and load-bearing. Change them only behind targeted regression fixtures (the docs' own guardrail). Do not auto-tune weights from sparse telemetry. Do not automate GDELT.

**Safest next step:** Land the admin-authorization + feature-gate + CI trio (Backlog #1, #2, #4) on `development`, reconcile the price-refresh documentation, then run a closed invite-only alpha while the RLS audit and legal review proceed in parallel. That sequence removes the catastrophic risks first, keeps the proven analytics untouched, and is fully reversible.

---

*Constraints honored during the audit: no files modified, no code changed, no migrations run. Unverifiable items (live DB counts, deployed cron state, current test-suite pass/fail, Vercel limits, legal sufficiency, live UI/mobile behavior) are explicitly marked rather than assumed.*
