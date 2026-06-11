# Security and Access Architecture

Last updated: 2026-06-11 20:11:07 +08:00

## Authentication

The app uses Supabase authentication. Server pages/actions resolve authenticated user context before reading user-specific data.

## Authorization

Portfolio data should be scoped by user and portfolio ownership. RLS is enabled in migrations for core user/portfolio tables and many intelligence tables.

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

Documentation gap: alpha branch feature flags should be audited in the `alpha` branch directly because this current documentation was generated on `development`.

## Security Follow-Ups

- Full RLS policy audit before commercialization.
- Confirm assistant usage and conversation tables are user-scoped.
- Confirm admin routes are protected from ordinary end users if commercialized.
- Confirm no service-role key is imported into client components.
- Confirm job endpoints reject unauthenticated requests in production.
