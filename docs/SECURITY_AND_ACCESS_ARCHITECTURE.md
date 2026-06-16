# Security and Access Architecture

Last updated: 2026-06-16 SGT

## Authentication

The app uses Supabase authentication. Server pages/actions resolve authenticated user context before reading user-specific data.

## Authorization

Portfolio data should be scoped by user and portfolio ownership. RLS is enabled in migrations for core user/portfolio tables and many intelligence tables.

### Admin Authorization

Admin authorization is enforced in the application layer through `AuthProvider.requireAdmin()`.

Admin identity currently comes from environment allowlists:

- `ADMIN_USER_IDS`: comma-separated Supabase Auth user UUIDs. This is the preferred admin identity source.
- `ADMIN_EMAILS`: optional comma-separated email bootstrap allowlist. Matching is case-insensitive.

Empty allowlists deny all admin access. This is the safe default: new deployments must explicitly set at least one admin UUID before internal admin surfaces are usable.

Enforcement has two layers:

- Route guards: `/admin/*` is protected by `src/app/(dashboard)/admin/layout.tsx`; `/setup/taxonomy` is protected by `src/app/(dashboard)/setup/taxonomy/layout.tsx`.
- Server-action guards: admin-only refresh, ingestion, taxonomy, universe-curation, Market Vision editorial, telemetry job trigger, and ETF look-through refresh actions call `requireAdmin()` directly.

Unauthenticated users are redirected to `/login`. Authenticated non-admin users receive a 404 via Next.js `notFound()` so the admin surface is not advertised.

The Admin navigation group is hidden for non-admin users, but navigation visibility is cosmetic only; route and action guards are the enforcement boundary.

Bootstrap/lockout note: set `ADMIN_USER_IDS` to the owner's Supabase Auth user UUID before deploying this change to an environment where admin access is required. If both allowlists are empty or the UUID is wrong, all users are locked out of admin tools until the environment variables are corrected and the app is redeployed/restarted.

### Signup Access Control

New registration is controlled by `ALLOWED_SIGNUP_EMAILS`, a comma-separated email allowlist checked by `SupabaseAuthProvider.signUpWithPassword`.

- Empty `ALLOWED_SIGNUP_EMAILS` means open signup. This is the development default.
- Non-empty `ALLOWED_SIGNUP_EMAILS` means invite-only signup for alpha/production.
- Existing users are not affected. The check gates only new account registration, not sign-in.
- To onboard a new user, add their email address to `ALLOWED_SIGNUP_EMAILS` and redeploy/restart the app. No database change is required.

Portfolio Assistant usage can be capped with `ASSISTANT_DAILY_LIMIT`.

- `ASSISTANT_DAILY_LIMIT=0` means unlimited usage. This is the default.
- A positive value applies a per-user daily assistant conversation cap based on `assistant_conversations.created_at` in UTC.
- Enforcement occurs in `PortfolioAssistantService` before a new assistant conversation is created.
- When the cap is exceeded, `/api/assistant` returns HTTP 429 with: `Daily conversation limit of N reached. Resets at midnight UTC.`

## Service Role Usage

Server-side jobs and admin operations use `SUPABASE_SERVICE_ROLE_KEY` through `createSupabaseAdminClient`. This key must only exist in server-side Vercel environment variables.

## Database RLS Model

The codebase uses three Row Level Security policy patterns:

- User-scoped policies: tables with user or portfolio ownership check the authenticated Supabase user against the app user or portfolio relationship.
- Authenticated global-reference policies: shared reference tables such as `assets`, securities master tables, issuer tables, ETF exposure tables, and admin/reference diagnostics use `auth.role() = 'authenticated'` for SELECT.
- Open market-data policies: fully open market/reference data can use `using (true)` when unauthenticated reads are explicitly intended.

Writes to most application tables intentionally go through server-side services using `SUPABASE_SERVICE_ROLE_KEY`. The service role bypasses RLS. Zero INSERT, UPDATE, or DELETE policies means Postgres default-denies writes from anon/authenticated non-service-role callers. This is intentional for service-role-only write tables.

`assets` status: completed in migration `106_assets_rls.sql`. RLS is enabled on the global instrument reference catalog and exactly one SELECT policy permits authenticated users to read rows through Supabase REST. No write policies were added, so non-service-role writes remain blocked.

Previously-zero-policy table inventory:

| Table | SELECT policy status | Write policy status | Notes |
|---|---|---|---|
| `portfolio_dashboard_summary` | User-scoped SELECT added in `107_portfolio_summary_rls_policies.sql` (corrected by `108`) via `exists()` join through `users.auth_provider_user_id = auth.uid()::text` | No write policies; service-role-only writes | Defensive only. App reads/writes through `SupabaseAnalyticsRepository` service-role client. |
| `portfolio_performance_summary` | User-scoped SELECT added in `107_portfolio_summary_rls_policies.sql` (corrected by `108`) via `exists()` join through `users.auth_provider_user_id = auth.uid()::text` | No write policies; service-role-only writes | Defensive only. App reads/writes through `SupabaseAnalyticsRepository` service-role client. |
| `ingestion_events` | No SELECT policy | No write policies | Unused legacy/internal table in current `src/`; blocked state is intentional. |
| `instrument_directory_summary` | No policy added | No policy added | Confirmed orphaned experimental table from page-rendering performance work; implementation reverted per `docs/PAGE_RENDERING_AUDIT.md`. Not present in any migration or source file. No policy needed. |

## Job Security

Protected job endpoints require `CRON_SECRET`, accepted either as bearer token or `secret` query parameter. Supabase Cron calls these endpoints using Vault-stored `APP_URL` and `CRON_SECRET`.

## Secrets

Vercel stores provider and app runtime secrets:

- Supabase URL/anon/service keys.
- FMP, FRED, NewsData, OpenAI keys.
- `CRON_SECRET`.
- scheduled user/portfolio IDs.

Supabase Vault stores:

- `APP_URL`.
- `CRON_SECRET`.

## Alpha Feature Gating

Alpha is intended to expose a limited consumer-facing surface. Admin pages and internal diagnostics should not be exposed to alpha end users unless deliberately enabled.

Admin pages and admin-only actions are now separated from ordinary authenticated users through `requireAdmin()` and the env allowlists above. Broader product-mode and route-level feature gating is now implemented via the server-only `PRODUCT_MODE` environment variable. See ## Product Mode below.

## Product Mode

Runtime product mode is controlled by the server-only `PRODUCT_MODE` environment variable. It is not exposed through a `NEXT_PUBLIC_` variable and is not part of the client bundle.

- `PRODUCT_MODE=alpha`: limited alpha surface. This hides News & Themes, Macro, Assistant, Telemetry, and the entire Admin navigation group; middleware redirects blocked routes to `/portfolio?feature=alpha-disabled`; Market Vision shows published reports only and hides editorial actions.
- `PRODUCT_MODE=full`: full authenticated product surface for development and internal operation.
- Unset or unrecognized values default to `alpha`, which is the safer deployment default.
- Local development should set `PRODUCT_MODE=full` in `.env.local`.

Product mode gates route and UI surface only. It does not change stored data, scoring methodology, recommendation labels, or analytical outputs.

## Security Follow-Ups

- Full RLS policy audit before commercialization.
- Confirm assistant usage and conversation tables are user-scoped.
- Consider replacing the env allowlist with a DB-backed admin role such as `users.is_admin` after the initial alpha hardening pass.
- Confirm no service-role key is imported into client components.
- Confirm job endpoints reject unauthenticated requests in production.
