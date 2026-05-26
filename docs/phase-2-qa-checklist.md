# Phase 2 MVP QA Checklist

## Scope

This checklist reviews the current Phase 2 core MVP only:

- Auth flow.
- Manual portfolio setup.
- Cash balances.
- Holdings.
- Transactions.
- Portfolio dashboard.
- Holdings table.
- Core PostgreSQL schema.
- Error handling.
- Mobile responsiveness.
- Cloud-portable service/repository pattern.

Out of scope for this QA pass:

- AI recommendations.
- Market Vision.
- Telemetry learning.
- Scenario analysis.
- Daily market prices.
- FX conversion.
- Brokerage imports.

## 1. Auth Flow

Checks:

- User can create account from `/login`.
- User can sign in from `/login`.
- Authenticated dashboard routes redirect unauthenticated users to `/login`.
- Sign out clears session and returns to `/login`.
- Supabase auth client is isolated in `SupabaseAuthProvider`, middleware, and auth callback route.

Status:

- Pass for MVP.

Notes:

- Email confirmation behavior depends on Supabase project settings.
- Local `.env.local` and Vercel env vars must both be maintained.

## 2. Manual Portfolio Setup

Checks:

- User can create a default portfolio.
- User can view portfolio name, base currency, and risk profile.
- User can edit setup after creation.
- Setup edit derives portfolio identity from authenticated user rather than trusting hidden form IDs.
- Duplicate default portfolios are guarded by migration `002_default_portfolio_guard.sql`.

Status:

- Pass after critical fix.

Critical fix applied:

- Removed trusted hidden `portfolioId` from setup edit flow.

## 3. Cash Balances

Checks:

- User can add cash amount, currency, account, broker, as-of date, and notes.
- User can edit cash balance.
- User can delete cash balance.
- Currency is normalized to uppercase.
- Dashboard includes cash in MVP estimate.

Status:

- Pass for MVP.

Residual risk:

- Negative cash is currently allowed by validation. This can represent margin/overdraft, but the UI does not explicitly label that yet.

## 4. Holdings

Checks:

- User can add ETF, stock, bond ETF, gold ETF, crypto, and other holdings.
- User can edit holdings.
- User can soft-delete holdings.
- Average cost and estimated value show explicit currency code.
- Holdings table is usable on desktop and mobile.

Status:

- Pass for MVP.

Residual risk:

- No duplicate warning yet for same ticker/account.
- No live market price yet; estimated value is `quantity * average cost`.

## 5. Transactions

Checks:

- User can add buy, sell, cash deposit, cash withdrawal, fee, and manual adjustment.
- User can edit and soft-delete transactions.
- Buy/sell transactions require asset identifier, quantity, and price.
- Transaction ledger stores asset context and native currency.

Status:

- Pass for MVP.

Residual risk:

- Transactions do not reconcile holdings/cash yet. This is intentionally deferred and should be clearly treated as ledger-only in this phase.

## 6. Dashboard Calculations

Checks:

- Total estimate displays cash plus holding estimated cost basis.
- Cash estimate displays manually entered cash.
- Holdings estimate displays total holding cost basis.
- Holdings table shows estimated row value.
- Allocation groups by asset type.
- Mixed/non-base currency warning is shown.

Status:

- Pass for MVP.

Residual risk:

- Mixed-currency aggregate totals and allocation percentages are unconverted estimates. FX conversion is required in the market data foundation milestone.

## 7. Database Schema Consistency

Checks:

- Tables exist for users, portfolios, assets, cash balances, holdings, transactions, and ingestion events.
- Transactions schema includes asset type, ticker, and asset name.
- Default portfolio uniqueness guard exists.
- Indexes exist for core lookups.
- RLS is enabled for user-owned tables.

Status:

- Pass for MVP.

Notes:

- Runtime writes use server-side service key through repository layer. UI components do not call Supabase directly.

## 8. Error Handling

Checks:

- Form validation uses Zod.
- Validation errors redirect back to form pages with query-string error messages.
- Missing portfolio redirects to setup.
- Supabase repository errors are surfaced as messages.

Status:

- Pass for MVP.

Residual risk:

- Delete actions do not yet wrap repository errors in friendly messages.
- Query-string error display is basic and can be improved with structured form state later.

## 9. Mobile Responsiveness

Checks:

- Sidebar becomes mobile top navigation.
- Forms use stacked responsive grids.
- Holdings table becomes labeled row layout on mobile.
- Dashboard cards stack naturally.

Status:

- Pass for MVP.

Residual risk:

- Full visual QA across multiple mobile widths should be done after the next UI polish pass.

## 10. Cloud-Portable Service/Repository Pattern

Checks:

- UI pages call server actions or services.
- UI components do not import Supabase clients.
- Supabase is isolated in auth provider, middleware, callback route, and repository implementation.
- Domain validation and service logic are provider-independent.
- Repository interface can be replaced with another Postgres implementation later.

Status:

- Pass for MVP.

Notes:

- A future Cloud SQL migration should add a direct Postgres repository adapter while preserving the existing `PortfolioRepository` interface.

## Critical Fixes Applied In This QA Pass

- Setup edit flow no longer trusts a hidden `portfolioId`.
- `package-lock.json` and `next-env.d.ts` should be committed for reproducible installs and Next TypeScript support.

## Readiness Verdict

Phase 2 MVP is ready for continued manual testing and light user acceptance testing.

Do not proceed to feature expansion until:

- Latest Vercel build passes.
- Local smoke test passes after fresh restart.
- Supabase migrations `001` and `002` are applied.
- No critical form save/delete errors remain.

