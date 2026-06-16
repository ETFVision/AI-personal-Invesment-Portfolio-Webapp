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

## Service Role Usage

Server-side jobs and admin operations use `SUPABASE_SERVICE_ROLE_KEY` through `createSupabaseAdminClient`. This key must only exist in server-side Vercel environment variables.

## Database RLS Model

The codebase uses three Row Level Security policy patterns:

- User-scoped policies: tables with user or portfolio ownership check the authenticated Supabase user against the app user or portfolio relationship.
- Authenticated global-reference policies: shared reference tables such as `assets`, securities master tables, issuer tables, ETF exposure tables, and admin/reference diagnostics use `auth.role() = 'authenticated'` for SELECT.
- Open market-data policies: fully open market/reference data can use `using (true)` when unauthenticated reads are explicitly intended.

Writes to most application tables intentionally go through server-side services using `SUPABASE_SERVICE_ROLE_KEY`. The service role bypasses RLS. For tables with zero INSERT, UPDATE, or DELETE policies, Postgres default-denies writes from anon/authenticated non-service-role callers. This zero-write-policy model is intentional where writes are service-role-only, but it still needs table-by-table documentation and verification before commercialization.

`assets` status: completed in migration `106_assets_rls.sql`. RLS is enabled on the global instrument reference catalog and exactly one SELECT policy permits authenticated users to read rows through Supabase REST. No write policies were added, so non-service-role writes remain blocked.

Open Task 2B items: `ingestion_events`, `instrument_directory_summary`, `portfolio_dashboard_summary`, and `portfolio_performance_summary` are RLS-enabled with no policies and still need explicit review/documentation.

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

Admin pages and admin-only actions are now separated from ordinary authenticated users through `requireAdmin()` and the env allowlists above. Broader product-mode or route-level alpha feature gating remains a separate follow-up.

## Security Follow-Ups

- Full RLS policy audit before commercialization.
- Confirm assistant usage and conversation tables are user-scoped.
- Consider replacing the env allowlist with a DB-backed admin role such as `users.is_admin` after the initial alpha hardening pass.
- Confirm no service-role key is imported into client components.
- Confirm job endpoints reject unauthenticated requests in production.
