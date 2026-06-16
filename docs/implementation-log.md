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

