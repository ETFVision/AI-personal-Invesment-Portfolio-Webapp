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
