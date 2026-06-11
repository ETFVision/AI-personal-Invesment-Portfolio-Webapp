# ETFVision Architecture Overview

Last updated: 2026-06-11 20:11:07 +08:00

Authoritative status: current handover snapshot for future developers. This document supersedes older overlapping architecture notes where the contents conflict, while older audit logs remain useful as historical context.

## Purpose

ETFVision is a Next.js web application for portfolio tracking, instrument research, macro/news intelligence, deterministic recommendation insights, portfolio review, telemetry, and a portfolio assistant. The app is designed around stored Supabase data and scheduled refresh jobs so interactive pages can read precomputed metrics instead of recalculating expensive analytics on every request.

## Runtime Stack

- Frontend and server rendering: Next.js 15 App Router, React 19.
- Language: TypeScript.
- Styling: Tailwind CSS and shared React components.
- Database: Supabase Postgres with RLS, service-role server operations, cron, vault secrets, and `pg_net` HTTP calls.
- Auth: Supabase auth helpers through `src/infrastructure/providers/auth/SupabaseAuthProvider.ts`.
- AI providers: OpenAI-backed Market Vision, news classification/reconciliation, and portfolio assistant providers.
- External data providers: FMP, FRED, NewsData.io, GDELT, OpenAI.

## Layering

The codebase follows a mostly clean architecture layout:

| Layer | Main location | Role |
|---|---|---|
| App routes | `src/app` | Pages, API routes, route-level composition. |
| Server actions | `src/server/actions` | Form actions and UI-triggered mutations/jobs. |
| Container | `src/server/container.ts` | Dependency assembly for repositories, providers, services, and jobs. |
| Application services | `src/application/services` | Business logic, scoring, classification, metrics, dashboards. |
| Application jobs | `src/application/jobs` | Job orchestration for scheduled/manual refreshes. |
| Ports | `src/application/ports` | Repository/provider contracts. |
| Infrastructure | `src/infrastructure` | Supabase repositories, provider adapters, observability helpers. |
| Domain types | `src/domain` | Shared domain model types. |
| Database | `supabase/migrations` | Schema, functions, indexes, cron schedule. |
| Docs | `docs` | Product, architecture, QA, schedule, audit, and handover notes. |

## Main User Areas

- Dashboard: `/portfolio`
- Portfolio: `/holdings`, `/transactions`, `/cash`
- Instruments: `/instruments/universe`, `/instruments/watchlist`, `/instruments/[symbol]`
- Research: `/market-vision`, `/news`, `/macro`, `/risk`, `/bonds`, `/fundamentals`, `/recommendations`, `/portfolio-review`, `/telemetry`, `/assistant`
- Admin: `/admin/data-sources`, `/admin/jobs`, `/admin/assistant-usage`, `/admin/system-health`, `/setup/taxonomy`

## API Job Routes

Protected job endpoints live under `src/app/api/jobs`. They are wrapped by `src/server/jobs/runCronJob.ts`, which handles:

- `CRON_SECRET` authorization.
- Supabase `job_locks` overlap prevention.
- Supabase `job_runs` logging.
- Structured JSON status with `success`, `partial_success`, `failed`, or `skipped`.

Important job routes include instrument prices, daily returns, return anchors, market metrics, risk metrics, metadata, ETF look-through, fundamentals, FRED macro, FMP news, NewsData.io, GDELT, benchmarks, portfolio valuation, summary refresh, Market Vision, recommendations, portfolio review, and telemetry evaluation.

## Current Performance Architecture

The app has moved from direct heavy page calculations toward stored summary and metric tables:

- `instrument_daily_returns`: daily/weekly returns derived from raw prices.
- `instrument_return_anchors`: latest price, prior close, YTD/1Y/3Y/5Y anchors, 52-week range.
- `instrument_market_metrics`: page-facing instrument metrics.
- `instrument_risk_metrics`: volatility/drawdown/downside risk metrics.
- `holding_market_metrics` and `portfolio_current_metrics`: holding and portfolio derived metrics.
- `portfolio_performance_summary`: cached portfolio performance series and benchmark comparisons.
- `portfolio_dashboard_summary`: cached dashboard/holdings/cash summary payloads.

Render timing instrumentation is in `src/infrastructure/observability/renderTiming.ts` and controlled by `ENABLE_RENDER_TIMING`.

## Branching Model

Current working convention:

- `development`: default branch for testing and future feature work.
- `main`: finalized full product branch.
- `alpha`: consumer-facing limited feature branch with feature-gated surface area.

Alpha should be maintained from main/development with feature gates rather than permanent one-off patchwork.

## Key Design Principles

- Store expensive calculations in Supabase and refresh via scheduled jobs.
- Keep page rendering mostly read-only and summary-table driven where possible.
- Treat AI outputs as narrative/intelligence layers, not raw portfolio calculation sources.
- Keep recommendation logic deterministic; OpenAI is not used to decide recommendation labels.
- Use ETF look-through exposure for portfolio sector/geography exposure, not ETF product category.
- Keep admin diagnostics and refresh buttons out of consumer-facing alpha surfaces unless explicitly enabled.
