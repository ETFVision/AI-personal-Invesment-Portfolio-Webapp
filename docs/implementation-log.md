## 2026-06-16 - Signup Restriction, Assistant Limit, and AI Cost Constants

### Source
Claude Code

### Objective
Gate new user registration behind an email allowlist, add a configurable daily Portfolio Assistant conversation cap, and document real OpenAI model IDs and cost constants for active OpenAI-backed services.

### Files Changed
- `.env.example`
- `src/application/ports/repositories/AssistantRepository.ts`
- `src/application/services/ai/costEstimate.ts`
- `src/application/services/assistant/PortfolioAssistantService.ts`
- `src/application/services/auth/adminAccess.ts`
- `src/app/api/assistant/route.ts`
- `src/app/login/page.tsx`
- `src/infrastructure/config/env.ts`
- `src/infrastructure/providers/ai/OpenAiMarketVisionProvider.ts`
- `src/infrastructure/providers/ai/OpenAiPortfolioAssistantProvider.ts`
- `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`
- `src/infrastructure/repositories/supabase/SupabaseAssistantRepository.ts`
- `src/server/container.ts`
- `tests/admin-access.test.ts`
- `tests/assistant.test.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `ALLOWED_SIGNUP_EMAILS` to `env.ts` and gated `signUpWithPassword` with a comma-separated, case-insensitive email allowlist. Empty allowlist preserves open signup for development.
- Updated the login page to hide Create account and show "Early access only. Contact us to request an invitation." when signup is invite-only.
- Added `ASSISTANT_DAILY_LIMIT` to `env.ts`, `AssistantRepository.countTodayConversations`, Supabase implementation over `assistant_conversations.user_id` and `created_at`, Portfolio Assistant service enforcement, and HTTP 429 handling in `/api/assistant`.
- Confirmed `gpt-5.4-mini` is a valid OpenAI model ID for Portfolio Assistant and Market Vision. `.env.example` now lists current pricing from OpenAI: `$0.75` input and `$4.50` output per 1M tokens.
- Added shared `estimateTokenCost` helper and focused tests for signup allowlist behavior, assistant daily-limit enforcement, and cost formula calculation.
- Updated `docs/qa-log.md` with scope, validation results, and residual manual QA items for the signup restriction, assistant limit, and AI cost constants work.
- News AI model cost tracking remains excluded because `ENABLE_AI_NEWS_CLASSIFICATION` and `ENABLE_WEEKLY_NEWS_RECONCILIATION` are disabled by default; add cost tracking when those features are enabled.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (253/253).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Set `ALLOWED_SIGNUP_EMAILS`, `ASSISTANT_DAILY_LIMIT`, `PORTFOLIO_ASSISTANT_*_COST_PER_1M`, and `MARKET_VISION_*_COST_PER_1M` in Vercel before alpha invites.

---
## 2026-06-16 - Fix Portfolio Review Test Assertion

### Source
Claude Code

### Objective
Fix the pre-existing stale test assertion at `tests/portfolio-review.test.ts:331` that referenced a phrase no longer present in the source string.

### Root Cause
`DiversificationBenefitService.ts:81` returns "Provides exposure to regulated demand that can behave differently from growth equities." The test asserted `/regulated demand exposure/` - the substring "regulated demand exposure" does not appear in this string (the word after "regulated demand" is "that"). The source text changed at some point and the test was not updated.

### Files Changed
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Changed test regex from `/regulated demand exposure/` to `/regulated demand/`.
- Changed stale XLP regex checks from `/essential-consumption exposure/` to `/essential-consumption businesses/`.
- No changes to `DiversificationBenefitService.ts` or any other source file.
- No scoring, methodology, or compliance wording changed.

### Tests Run
- `npm run test` blocked by PowerShell execution policy for `npm.ps1`.
- `npm.cmd run test` - PASS (248/248).

### Result
Completed. Test suite now fully green.

---
## 2026-06-16 - instrument_directory_summary Origin Investigation Closed

### Source
Claude Code

### Objective
Close the open origin investigation for the orphaned `instrument_directory_summary` live DB table.

### Root Cause
Table was created experimentally during page-rendering performance work (alongside `portfolio_risk_summary`, `telemetry_summary`, `data_source_health_summary`). All four implementations were reverted. Confirmed by `docs/PAGE_RENDERING_AUDIT.md:661`.

### Files Changed
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/implementation-log.md`

### Summary
- No TypeScript changes.
- No SQL changes.
- No migration added.
- Documentation updated to mark the item closed in DOCUMENTATION_GAPS.md High Priority item 1 and in the SECURITY_AND_ACCESS_ARCHITECTURE.md table inventory.

### Result
Closed. No further action required for this table.
---

## 2026-06-16 - Portfolio Summary RLS Policy Correction

### Source
Claude Code (review-phase correction)

### Objective
Fix the portfolio summary RLS policies from migration 107, which used the wrong
ownership join pattern and returned zero rows for authenticated users.

### Root Cause
`portfolios.user_id` references the internal app `users.id` UUID, which is NOT the
Supabase Auth UUID. `auth.uid()` returns the Supabase Auth UUID, stored separately
in `users.auth_provider_user_id TEXT`. Migration 107 used
`user_id = auth.uid()` which always evaluates to false.

### Files Changed
- `supabase/migrations/107_portfolio_summary_rls_policies.sql` (corrected in-place)
- `supabase/migrations/108_fix_portfolio_summary_rls_policies.sql` (correction migration for live DB)
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Migration 108 drops the two wrong policies (IF EXISTS) and re-creates them using
  the correct `exists()` pattern matching migration 004 (`portfolio_snapshots`):
  `join users on users.id = portfolios.user_id where users.auth_provider_user_id = auth.uid()::text`
- Migration 107 file corrected in-place so fresh deployments get the right SQL.
- No TypeScript changes. No write policies added.

### Tests Run
- Verified manually: after applying migration 108 in Supabase SQL Editor, authenticated
  SELECT with real user UUID returns the correct row.
- `npm run build` and `npm run typecheck` unaffected (SQL-only change).

### Result
Correction applied. Live DB verification pending re-run of Checks 1 and 2.

---

## 2026-06-16 - Portfolio Summary RLS Policies

### Source
Claude Code

### Objective
Add user-scoped SELECT policies to `portfolio_dashboard_summary` and `portfolio_performance_summary` as defense-in-depth while preserving the service-role-only write model.

### Files Changed
- `supabase/migrations/107_portfolio_summary_rls_policies.sql`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Confirmed `106_assets_rls.sql` is present, so the next migration number is `107`.
- Added `supabase/migrations/107_portfolio_summary_rls_policies.sql`.
- SQL written:
  ```sql
  -- Add user-scoped SELECT policies to portfolio summary tables.
  -- RLS is already enabled on both tables. Reads and writes in the app
  -- use the service role (which bypasses RLS), so these policies are
  -- defensive only and do not change application behaviour.

  create policy "users can read own portfolio dashboard summary"
    on portfolio_dashboard_summary for select
    using (
      portfolio_id in (
        select id from portfolios where user_id = auth.uid()
      )
    );

  create policy "users can read own portfolio performance summary"
    on portfolio_performance_summary for select
    using (
      portfolio_id in (
        select id from portfolios where user_id = auth.uid()
      )
    );
  ```
- No ALTER TABLE statements were added.
- No INSERT, UPDATE, or DELETE policies were added.
- No policy was added to `ingestion_events` or `instrument_directory_summary`.
- No TypeScript files were changed for this task.

### Tests Run
- `npm.cmd run lint` - PASS
- `npm.cmd run typecheck` - PASS
- `npm.cmd test` - PARTIAL: 247/248 passed; the known pre-existing Portfolio Review wording assertion `improvement suggestions map concentration issues to diversifying candidates` still fails because it expects `/regulated demand exposure/` while current output is `Provides exposure to regulated demand that can behave differently from growth equities.`
- `npm.cmd run build` - PASS

### Result
Completed, with unrelated pre-existing Portfolio Review test failure noted.

### Notes for Claude
- `portfolio_dashboard_summary`: user-scoped SELECT policy added.
- `portfolio_performance_summary`: user-scoped SELECT policy added.
- `ingestion_events`: source search found no `src/` references; zero-policy blocked state remains intentional.
- `instrument_directory_summary`: not present in migrations or source search; no policy added pending origin investigation.
- `SupabaseAnalyticsRepository` uses `createSupabaseAdminClient()`, so application summary reads/writes remain service-role based and bypass RLS.
## 2026-06-16 - Assets RLS Enablement

### Source
Claude Code

### Objective
Enable Row Level Security on the global `assets` instrument catalog and add a SELECT-only authenticated-user policy while keeping non-service-role writes blocked by default.

### Files Changed
- `supabase/migrations/106_assets_rls.sql`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Confirmed `105_security_master_phase7_provider_reconciliation.sql` is the highest-numbered migration, so the next migration is `106`.
- Added `supabase/migrations/106_assets_rls.sql`.
- SQL written:
  ```sql
  -- Enable RLS on the global instrument reference catalog.
  -- Writes remain service-role only (service role bypasses RLS).
  alter table assets enable row level security;

  create policy "authenticated users can read assets"
    on assets for select
    using (auth.role() = 'authenticated');
  ```
- No INSERT, UPDATE, or DELETE policies were added.
- No TypeScript files were changed for this task.

### Tests Run
- `npm.cmd run lint` - PASS
- `npm.cmd run typecheck` - PASS
- `npm.cmd test` - PARTIAL: 247/248 passed; the known pre-existing Portfolio Review wording assertion `improvement suggestions map concentration issues to diversifying candidates` still fails because it expects `/regulated demand exposure/` while current output is `Provides exposure to regulated demand that can behave differently from growth equities.`
- `npm.cmd run build` - PASS

### Result
Completed, with unrelated pre-existing Portfolio Review test failure noted.

### Notes for Claude
- Manual Supabase verification still needs to be run after applying migration `106`: authenticated SELECT should succeed, authenticated INSERT should fail with permission/RLS error, and service-role seed/metadata refresh writes should continue to work.
- Task 2B remains open: formalize the zero-write-policy model and review the four RLS-enabled zero-policy tables (`ingestion_events`, `instrument_directory_summary`, `portfolio_dashboard_summary`, `portfolio_performance_summary`).

## 2026-06-16 - Dashboard Auth Call Reduction

### Source
Claude Code

### Objective
Reduce the dashboard layout from separate `requireUser()` and `isAdmin()` calls to one Supabase user lookup that returns both the authenticated user and admin flag.

### Files Changed
- `src/application/ports/providers/AuthProvider.ts`
- `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`
- `src/app/(dashboard)/layout.tsx`
- `docs/implementation-log.md`

### Summary
- Added `requireUserWithAdminFlag()` to the auth provider interface.
- Implemented the method in `SupabaseAuthProvider` using one `getCurrentUser()` call and the existing admin allowlist helper.
- Updated the dashboard layout to pass `isAdmin` to `AppShell` from the combined auth result.
- Left `requireUser()`, `isAdmin()`, `requireAdmin()`, admin layouts, server action guards, scoring, methodology, consumer-facing output, and `/api/jobs/*` auth unchanged.

### Tests Run
- `npm.cmd run build` - PASS
- `npm.cmd run typecheck` - PASS when run sequentially after build. A parallel validation attempt hit a transient `.next/types` route-type race, so the final result was taken from the sequential run.

### Result
Completed.

### Notes for Claude
- Admin pages still run their own `requireAdmin()` in the nested admin layout for route-level defense-in-depth.
## 2026-06-16 â€” Admin Authorization Layer

### Source
Claude Code

### Objective
Add an environment-allowlist admin authorization layer so only designated admins can access internal admin routes and invoke admin-only server actions, without changing scoring methodology, user analytics, or cron job authentication.

### Files Changed
- `.env.example`
- `package.json`
- `tsconfig.test.json`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/admin/layout.tsx`
- `src/app/(dashboard)/setup/page.tsx`
- `src/app/(dashboard)/setup/taxonomy/layout.tsx`
- `src/application/ports/providers/AuthProvider.ts`
- `src/application/services/auth/adminAccess.ts`
- `src/components/layout/app-shell.tsx`
- `src/infrastructure/config/env.ts`
- `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`
- `src/server/actions/dataRefreshActions.ts`
- `src/server/actions/fundamentalsActions.ts`
- `src/server/actions/jobActions.ts`
- `src/server/actions/macroActions.ts`
- `src/server/actions/marketVisionActions.ts`
- `src/server/actions/newsActions.ts`
- `src/server/actions/portfolioReviewActions.ts`
- `src/server/actions/taxonomyActions.ts`
- `src/server/actions/universeActions.ts`
- `tests/admin-access.test.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Added optional `ADMIN_USER_IDS` and `ADMIN_EMAILS` env allowlists. Empty values deny all admin access by default.
- Added dependency-free admin allowlist parsing and matching with UUID-first matching and case-insensitive email matching.
- Extended `AuthProvider` with `isAdmin()` and `requireAdmin()`. Unauthenticated users still redirect to `/login`; authenticated non-admin users receive Next.js `notFound()` for admin-only access.
- Added route-level admin guards for `/admin/*` and `/setup/taxonomy`.
- Hid the Admin navigation group and `/setup` taxonomy-admin link unless `authProvider.isAdmin()` returns true. This is cosmetic only; server route/action guards enforce access.
- Added `requireAdmin()` checks to admin-only refresh, ingestion, taxonomy, job, universe-curation, Market Vision editorial, and ETF look-through refresh actions.
- Left user self-service actions unchanged: portfolio setup/holdings/cash/transactions, portfolio price/benchmark/metadata refreshes, watchlist add/remove, manual Portfolio Review run, and manual Insights/recommendation run.
- Left `/api/jobs/*` routes unchanged; they continue to use `CRON_SECRET`.

### Tests Run
- `npm.cmd run typecheck` â€” PASS
- `node --test .test-build\\tests\\admin-access.test.js` â€” PASS, 7 tests
- `npm.cmd run lint` â€” PASS
- `npm.cmd run build` â€” PASS
- `npm.cmd test` â€” PARTIAL: new admin-access tests passed, but the existing Portfolio Review test `improvement suggestions map concentration issues to diversifying candidates` failed because it expects `/regulated demand exposure/` while the current app text is `Provides exposure to regulated demand that can behave differently from growth equities.`

### Result
Completed, with one unrelated existing Portfolio Review wording-test follow-up noted.

### Notes for Claude
- To designate the first admin, set `ADMIN_USER_IDS` to the owner's Supabase Auth user UUID. `ADMIN_EMAILS` can be used as optional bootstrap support but UUIDs should be preferred.
- Admin-vs-user decisions: `recommendationActions.runRecommendationsAction` stayed user-accessible as a self-service Insights run; `portfolioReviewActions.runPortfolioReviewAction` stayed user-accessible; `portfolioReviewActions.refreshEtfLookthroughExposureAction` became admin-only; `marketVisionActions` draft/save/publish/archive/generate actions became admin-only editorial actions because they mutate global Market Vision reports.
- `universeActions` is mixed: seed, metadata/price refresh, active status, tags, and bond profile overrides became admin-only; watchlist add/remove stayed user-accessible.
- This change does not add a DB `users.is_admin` flag, does not alter RLS, and does not address the broader `assets` RLS or write-policy audit.


