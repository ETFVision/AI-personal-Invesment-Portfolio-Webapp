# ETFVision Feature-Gated Production Architecture Audit

Date: 2026-06-06  
Scope: Architecture audit only. No implementation, feature removal, branch split, or code changes.

## 1. Executive Summary

ETFVision can support a lighter consumer/free-testing production version using feature flags and access controls without maintaining a permanently separate stripped-down production branch.

The current repository is already organized in a way that makes feature gating practical:

- Authenticated app routes are grouped under `src/app/(dashboard)`.
- Admin pages are grouped under `src/app/(dashboard)/admin`.
- Scheduled job endpoints are grouped under `src/app/api/jobs`.
- The main navigation is centralized in `src/components/layout/app-shell.tsx`.
- Existing server-side environment flags already control several ingestion and AI features.
- Jobs are already protected by `CRON_SECRET`.
- Advanced systems such as Market Vision, News Intelligence, Telemetry, Recommendations, Assistant, ETF look-through, Fundamentals, and Portfolio Review are mostly modular.

The main gap is not the overall architecture. The main gap is that UI hiding alone is not enough. Before external alpha, the app needs a central feature flag layer plus route/API/server-action guards.

Recommended model:

- `main`: production-ready full codebase.
- `develop`: active integration branch.
- feature branches: isolated work.
- feature flags: control what users can see/use.
- one production database schema: advanced tables may exist while features are hidden.

Do not create long-lived `light` and `full` branches. That would create drift, repeated migrations, inconsistent scheduled jobs, and duplicated QA burden.

## 2. Can This Repo Support Feature-Gated Light Production?

Yes.

The repo can support:

- Free Testing / Alpha Mode.
- Full Internal / Development Mode.
- Future Standard / Pro / Premium modes.
- Internal-only admin tools.

The app is suitable for a one-codebase model where advanced features are present in code and schema but hidden or disabled by flags.

### Current Readiness

| Area | Readiness | Comment |
|---|---:|---|
| Route separation | High | App, admin, API jobs, and feature pages are identifiable. |
| Navigation gating | High | Main nav is centralized. |
| Feature modularity | Medium-high | Most features have distinct pages/services/jobs. |
| Server-side feature flags | Medium | Some flags exist, but product-mode flags are missing. |
| Admin protection | Medium-low | Admin routes are auth-protected, but need role protection. |
| API/job protection | Medium-high | Jobs use `CRON_SECRET`; feature-specific job flags need expansion. |
| Portfolio Review partial gating | Medium | Needs section-level presentation policy. |
| Recommendation commercial gating | Medium | Labels are still visible in several places. |
| Universe/watchlist gating | Medium | Needs visibility/eligibility fields or equivalent policy. |

## 3. Route Inventory And Gating Classification

### Core Routes

| Route | Classification | Alpha Visibility | Notes |
|---|---|---:|---|
| `/portfolio` | Free-visible | Show | Basic dashboard should remain the alpha home. |
| `/holdings` | Free-visible | Show | Required for manual portfolio management. |
| `/transactions` | Free-visible | Show | Required for transaction-based returns. |
| `/cash` | Free-visible | Show | Required for cash handling. |
| `/setup` | Authenticated-visible | Show | Required onboarding/setup route. |

### Instruments

| Route | Classification | Alpha Visibility | Notes |
|---|---|---:|---|
| `/instruments/universe` | Free-visible limited | Show partial | Use alpha-visible instrument subset. |
| `/instruments/watchlist` | Free-visible limited | Show partial | Use alpha-visible watchlist subset. |
| `/instruments/[symbol]` | Authenticated-visible with tab gating | Show partial | Hide Recommendations, advanced fundamentals, advanced risk, and internal-only tabs as needed. |
| `/universe` | Redirect | Show if target visible | Redirects to `/instruments/universe`. |
| `/watchlists` | Redirect | Show if target visible | Redirects to `/instruments/watchlist`. |

### Research

| Route | Classification | Alpha Visibility | Notes |
|---|---|---:|---|
| `/portfolio-review` | Free-visible partial | Show partial | Hide advanced sections. |
| `/risk` | Free-visible basic / Pro | Show basic | Basic risk summary can remain. |
| `/bonds` | Pro / Hidden-for-alpha | Hide initially | Fixed income intelligence is advanced. |
| `/macro` | Pro / Hidden-for-alpha | Hide initially | FRED macro intelligence is advanced. |
| `/market-vision` | Pro / Internal | Hide initially | AI/CIO-style reporting should not be in free alpha. |
| `/news` | Internal / Pro | Hide initially | News provider diagnostics and reconciliation are internal-heavy. |
| `/fundamentals` | Pro | Hide or partial | Fundamentals are advanced stock research. |
| `/recommendations` | Pro / Internal | Hide initially | Commercially sensitive labels. |
| `/assistant` | Pro / Internal | Hide initially | AI cost and advice-risk sensitive. |
| `/telemetry` | Internal-only | Hide | Learning/evaluation layer. |

### Admin

| Route | Classification | Alpha Visibility | Notes |
|---|---|---:|---|
| `/admin/data-sources` | Admin-only | Hide | Manual refresh controls and ingestion diagnostics. |
| `/admin/jobs` | Admin-only | Hide | Manual job controls. |
| `/admin/assistant-usage` | Admin-only | Hide | AI usage/cost logs. |
| `/admin/system-health` | Admin-only | Hide | Internal operations. |
| `/setup/taxonomy` | Admin/Internal | Hide | Taxonomy control. |
| `/taxonomy` | Redirect/Internal | Hide | Redirects to taxonomy setup. |

### API Routes

| Route | Required Protection | Notes |
|---|---|---|
| `/api/assistant` | Auth + server feature flag | Must check `ENABLE_ASSISTANT_API`. |
| `/api/jobs/*` | `CRON_SECRET` + job feature flags | Already protected by `CRON_SECRET`; add per-job feature checks. |
| `/auth/callback` | Auth flow | No product feature gating needed. |

## 4. Navigation Inventory And Gating Classification

Main navigation is defined in:

- `src/components/layout/app-shell.tsx`

This is a good starting point. The `navGroups` array is centralized and can be filtered by feature flags and user role.

### Current Nav Groups

- Dashboard
- Portfolio
- Instruments
- Research
- Admin

### Recommended Change

Move navigation metadata into a feature-aware config:

```ts
type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  feature?: FeatureKey;
  requiredRole?: "user" | "admin" | "internal";
};
```

Then filter items before rendering.

### Suggested Navigation Flags

| Nav Item | Suggested Flag |
|---|---|
| Market Vision | `enableMarketVision` |
| News & Themes | `enableNewsIntelligence` |
| Macro | `enableMacro` |
| Fundamentals | `enableFundamentals` |
| Risk | `enableRiskAnalytics` |
| Fixed Income | `enableFixedIncome` |
| Recommendations | `enableRecommendations` |
| Portfolio Review advanced sections | `enableAdvancedReview` |
| Assistant | `enableAssistant` |
| Telemetry | `enableTelemetry` |
| Admin group | `enableAdmin` + admin role |

Navigation hiding is necessary but not sufficient. Direct URL access must also be blocked.

## 5. Feature Boundary Assessment

### Portfolio Assistant

Current boundary:

- Page: `src/app/(dashboard)/assistant/page.tsx`
- Drawer: `src/components/assistant/portfolio-assistant-drawer.tsx`
- API: `src/app/api/assistant/route.ts`
- Services: `src/application/services/assistant/*`
- Prompt: `src/server/ai/prompts/portfolio-assistant.ts`
- Storage: assistant conversation/message tables
- External provider: OpenAI

Readiness: Medium-high.

Needs:

- Hide drawer and page when disabled.
- Add server-side API guard.
- Keep OpenAI key server-side only.
- Keep cost tracking admin-only.
- Support future plan-based usage limits.

### Telemetry

Current boundary:

- Page: `src/app/(dashboard)/telemetry/page.tsx`
- Services: `src/application/services/telemetry/*`
- Job: `/api/jobs/telemetry-evaluation`
- Admin run button exists under jobs.

Readiness: High.

Needs:

- Hide page and nav.
- Disable evaluation job unless enabled.
- Keep telemetry tables in production schema.

### Market Vision

Current boundary:

- Page: `src/app/(dashboard)/market-vision/page.tsx`
- Actions: `src/server/actions/marketVisionActions.ts`
- Prompts: `src/server/ai/prompts/market-vision.ts`
- Job: `/api/jobs/weekly-market-vision`

Readiness: Medium-high.

Needs:

- Hide page in alpha.
- Gate AI generation actions.
- Gate weekly job.
- Move admin/manual generation controls behind admin/internal role.

### Recommendation Engine

Current boundary:

- Page: `src/app/(dashboard)/recommendations/page.tsx`
- Instrument detail recommendation card.
- Actions: `src/server/actions/recommendationActions.ts`
- Services: `src/application/services/recommendations/*`
- Job: `/api/jobs/recommendation-run`

Readiness: Medium.

Needs:

- Hide recommendations page in alpha.
- Hide or remap labels in instrument detail page.
- Gate recommendation run action/job.
- Centralize commercial label mapping for user-facing display.

### Portfolio Review Engine

Current boundary:

- Page: `src/app/(dashboard)/portfolio-review/page.tsx`
- Actions: `src/server/actions/portfolioReviewActions.ts`
- Services: `src/application/services/portfolioReview/*`
- Job: `/api/jobs/portfolio-review-run`

Readiness: Medium.

Needs:

- Section-level gating.
- Free alpha should show basic review only.
- Advanced recommendation, Market Vision, telemetry, theme, and improvement sections should be hidden.

### News Intelligence And Theme Intelligence

Current boundary:

- Page: `src/app/(dashboard)/news/page.tsx`
- Actions: `src/server/actions/newsActions.ts`
- Providers: FMP, NewsData, GDELT
- Services: `src/application/services/news/*`
- Jobs:
  - `/api/jobs/daily-news-ingestion`
  - `/api/jobs/newsdata-news-ingestion`
  - `/api/jobs/gdelt-news-ingestion`
  - `/api/jobs/weekly-news-reconciliation`

Readiness: High.

Needs:

- Hide page in alpha.
- Keep provider flags server-side.
- Gate manual actions.
- Keep reconciliation internal unless Market Vision is enabled.

### Fundamentals And Fundamental Trends

Current boundary:

- Page: `src/app/(dashboard)/fundamentals/page.tsx`
- Instrument detail tabs.
- Actions: `src/server/actions/fundamentalsActions.ts`
- Job: `/api/jobs/fundamentals-refresh`

Readiness: High.

Needs:

- Hide overview page in alpha or show only limited instrument detail snippets.
- Gate refresh actions.
- Keep weekly refresh optional/pro.

### Admin Jobs And Data Sources

Current boundary:

- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `src/app/(dashboard)/admin/jobs/page.tsx`
- `src/app/(dashboard)/admin/system-health/page.tsx`
- `src/app/(dashboard)/admin/assistant-usage/page.tsx`

Readiness: Medium.

Needs:

- Admin role guard.
- Hide from nav for all non-admin users.
- Protect server actions, not just pages.

## 6. API And Server-Action Protection Assessment

### UI-Only Gating Is Sufficient For

- Pure display sections where no sensitive data or external calls are exposed.
- Some basic Portfolio Review sections.
- Some instrument detail tabs when data is already public/basic.

### Server-Side Route Guard Required For

- `/assistant`
- `/market-vision`
- `/recommendations`
- `/telemetry`
- `/admin/*`
- `/news`
- `/macro`
- `/fundamentals` if considered premium

### API Guard Required For

- `/api/assistant`
- all `/api/jobs/*`

### Admin-Only Guard Required For

- Admin data sources page.
- Admin jobs page.
- Admin assistant usage page.
- Admin system health page.
- Taxonomy management.
- Manual refresh actions.
- Universe seeding/backfills.

### CRON_SECRET Required For

All scheduled job endpoints. This already exists, but per-job feature flags should be added.

## 7. Background Jobs Gating Assessment

### Daily Jobs

| Job | Alpha Need | Recommended State |
|---|---:|---|
| Instrument price refresh | Required | Enabled |
| Portfolio valuation refresh | Required | Enabled |
| Benchmark refresh | Useful | Enabled |
| ETF look-through refresh | Useful for alpha | Enabled if basic look-through shown |
| FRED macro refresh | Advanced | Disabled unless macro enabled |
| FMP news ingestion | Advanced/internal | Disabled unless news enabled |
| NewsData ingestion | Advanced/internal | Disabled unless news enabled |
| GDELT ingestion | Advanced/fallback | Disabled unless news enabled |

### Weekly Jobs

| Job | Alpha Need | Recommended State |
|---|---:|---|
| Portfolio Review run | Required partial | Enabled |
| News reconciliation | Advanced | Disabled unless news/Market Vision enabled |
| Market Vision generation | Advanced/Internal | Disabled unless Market Vision enabled |
| Recommendation run | Advanced/Pro | Disabled unless recommendations enabled |
| Telemetry snapshots/evaluation | Internal | Disabled unless telemetry enabled |
| Fundamentals refresh | Pro/Internal | Optional; weekly if fundamentals enabled |

### Monthly Jobs

| Job | Alpha Need | Recommended State |
|---|---:|---|
| ETF exposure refresh | Useful if look-through enabled | Enabled |
| Fundamentals deeper backfill | Pro/Internal | Disabled unless fundamentals enabled |

### Job Disable Risk

| Job | Risk If Disabled |
|---|---|
| Prices | High: portfolio values stale. |
| Portfolio valuation | High: dashboard/review stale. |
| ETF look-through | Medium: basic allocation still works, but look-through quality falls. |
| Benchmarks | Medium: comparisons stale. |
| FRED | Low for alpha if macro hidden. |
| News | Low for alpha if news/Market Vision hidden. |
| Recommendations | Low for alpha if labels hidden. |
| Telemetry | Low for alpha if hidden. |
| Fundamentals | Low for ETF-focused alpha, medium if stocks are shown. |

## 8. Portfolio Review Partial-Gating Assessment

The Portfolio Review page can be used in alpha if it is filtered.

### Free Alpha Sections

- Overall score.
- Basic allocation review.
- Basic diversification review.
- Basic concentration review.
- Basic risk summary.
- Basic ETF look-through.
- Basic top exposure tables.

### Hidden Alpha Sections

- Recommendation alignment.
- Market Vision impact.
- Telemetry observations.
- Advanced improvement suggestions.
- Advanced theme exposure.
- Advanced fixed income intelligence if too detailed.
- Candidate relevance/diversification scoring if it exposes recommendation labels.

### Required Refactor

Add a presentation policy, for example:

```ts
portfolioReviewPresentationPolicy({
  mode: "alpha" | "full",
  features
})
```

This policy should decide which sections are rendered without changing the underlying review engine.

## 9. Assistant Gating Assessment

Assistant is working and structurally separable.

### Gating Readiness

| Area | Status |
|---|---|
| Page hiding | Easy |
| Sidebar hiding | Easy |
| API disabling | Needs explicit server flag |
| OpenAI key exposure | Safe, server-side |
| Guardrails | Server-side |
| Cost tracking | Present |
| Plan/usage limits | Not fully implemented |
| Conversation storage | Separate enough |

### Required Before External Alpha

- Hide assistant nav item and drawer.
- Add `ENABLE_ASSISTANT_API`.
- Return 404 or 403 when disabled.
- Keep assistant usage page admin-only.
- Add usage limits before any broad public release.

## 10. Recommendation Label And Commercial Risk Assessment

Recommendation labels are commercially sensitive.

Current labels include:

- Strong Buy
- Buy
- Hold
- Watch
- Reduce
- Sell

They appear in:

- Recommendations page.
- Instrument detail page.
- Assistant context.
- Portfolio Review candidate cards.
- Telemetry recommendation tables.

### Risk

For alpha/free testing, these labels may look like investment advice, even if the system is deterministic and guarded.

### Recommended Alpha Handling

Hide recommendation pages and labels entirely, or map labels to softer analytical language:

| Internal Label | Alpha-Safe Display |
|---|---|
| Strong Buy | Very high alignment |
| Buy | High alignment |
| Hold | Neutral alignment |
| Watch | Watchlist candidate |
| Reduce | Elevated caution |
| Sell | High caution |

This should be centralized, not hardcoded in each page.

## 11. Universe And Watchlist Gating

Universe and watchlist size should be controlled by product mode.

The internal universe can remain large, but the alpha/free-testing universe should be smaller and cleaner.

### Current Concern

The full internal universe contains many instruments. Some may have incomplete fundamentals, limited ETF look-through, weaker news coverage, or experimental taxonomy. Showing all of them to alpha users can make the app feel noisy and can increase data-refresh cost.

### Recommended Approach

Use one database, but add visibility and eligibility fields.

Recommended fields:

```text
universe_visibility:
- alpha
- standard
- pro
- internal

watchlist_visibility:
- alpha
- standard
- pro
- internal
```

Alternative or additional booleans:

```text
is_alpha_visible
is_internal_only
is_news_tracked
is_recommendation_eligible
is_watchlist_visible
is_refresh_eligible
```

### Alpha Universe Recommendation

Show a smaller, robust ETF-first set:

- Core US equity: `VOO`, `SPY`, `VTI`, `QQQ`
- Global/international equity: `VT`, `VXUS`, `VEA`, `VWO`, `IEMG`
- Bonds: `BND`, `AGG`, `TLT`, `IEF`, `TIP`, `SGOV`
- Gold: `GLD`, `IAU`
- Sectors: `XLK`, `XLV`, `XLF`, `XLE`, `XLP`, `XLU`
- Optional testing stocks: a small set such as `MSFT`, `AAPL`, `NVDA`, `GOOGL`, `META`

Hide from alpha:

- Long stock universe.
- Experimental symbols.
- Instruments without reliable pricing.
- Instruments without stable taxonomy.
- Instruments with incomplete fundamentals/risk data if the page exposes those sections.
- Internal QA/test rows.

### Required Gating Points

Hiding instruments from the table is not enough.

The same eligibility policy should be respected by:

- Universe page.
- Watchlist page.
- Instrument detail route.
- Recommendation runs.
- News tracking.
- Price refresh jobs if using alpha-only refresh mode.
- Fundamentals refresh.
- ETF look-through refresh.
- Portfolio Review candidate selection.
- Assistant context retrieval.

### Direct URL Risk

If `/instruments/[symbol]` remains open for every authenticated user, a hidden internal symbol could still be viewed directly.

Recommended behavior:

- Alpha users: block or redirect if symbol is not alpha-visible.
- Internal users: allow all active instruments.
- Admin users: allow inactive/internal rows if needed.

### Refresh Job Impact

For internal mode, refresh all eligible active instruments.

For alpha mode, consider:

- prices: refresh portfolio holdings + alpha-visible universe
- news: refresh only `is_news_tracked`
- recommendations: run only `is_recommendation_eligible`
- fundamentals: run only stock instruments that are visible or held
- ETF exposure: run only ETF instruments that are visible, held, or used in review candidates

This reduces cost and improves QA clarity without deleting anything.

## 12. Database Readiness

One schema is preferred.

Advanced tables can exist in production even if hidden:

- recommendation tables
- telemetry tables
- news tables
- market vision reports
- macro indicators
- fundamentals history
- ETF look-through tables
- assistant conversations

This is safe if:

- routes handle empty data
- disabled features do not run jobs
- hidden features are not exposed through direct links
- admin-only tables are not exposed to normal users
- migrations are idempotent and portable PostgreSQL

Do not maintain separate production-light and internal schemas.

## 13. Risks

### Critical

None requiring a branch split.

### High

1. Admin pages and actions need role-based protection before external alpha.
2. Advanced pages must be blocked by direct URL, not only removed from navigation.
3. Assistant API should have a server-side feature guard.
4. Recommendation labels should be hidden or remapped for external alpha.

### Medium

1. Portfolio Review needs section-level gating.
2. Instrument detail page needs tab-level gating.
3. Universe/watchlist need visibility tiers.
4. Job endpoints need per-feature enable/disable flags.
5. Manual refresh server actions need admin guards.

### Low

1. Navigation config should move out of `app-shell.tsx`.
2. Product-mode feature flags should be documented.
3. Route inventory should be kept in docs.
4. Feature flags should be surfaced in Admin/System Health for internal debugging.

## 14. Required Refactors Before Alpha

1. Create central feature config:

```text
src/config/features.ts
```

2. Add route guard helpers:

```text
requireFeature(feature)
requireAdmin()
requireInternal()
```

3. Gate navigation centrally.

4. Gate advanced pages server-side.

5. Gate `/api/assistant`.

6. Gate AI generation server actions.

7. Gate recommendation server actions and job routes.

8. Add Portfolio Review presentation policy.

9. Add instrument visibility/eligibility policy.

10. Add admin role checks to admin pages/actions.

11. Add product-mode handling:

```text
PRODUCT_MODE=alpha | full_internal | pro
```

12. Add tests for:

- hidden nav items
- direct route blocking
- disabled API routes
- admin-only access
- alpha universe filtering
- portfolio review section filtering

## 15. Nice-To-Have Refactors Later

1. Plan-based feature access stored in database.
2. Usage limits for assistant and AI generation.
3. Soft recommendation label mapping for external users.
4. Feature flag dashboard under Admin/System Health.
5. Per-user feature overrides.
6. A/B testing hooks for future commercial rollout.
7. Per-provider data-cost controls.
8. Better audit logging for admin actions.

## 16. Recommended Feature Flag List

### Public / UI Flags

```text
NEXT_PUBLIC_PRODUCT_MODE=alpha
NEXT_PUBLIC_ENABLE_ASSISTANT=false
NEXT_PUBLIC_ENABLE_TELEMETRY=false
NEXT_PUBLIC_ENABLE_MARKET_VISION=false
NEXT_PUBLIC_ENABLE_RECOMMENDATIONS=false
NEXT_PUBLIC_ENABLE_ADVANCED_REVIEW=false
NEXT_PUBLIC_ENABLE_NEWS_INTELLIGENCE=false
NEXT_PUBLIC_ENABLE_THEME_INTELLIGENCE=false
NEXT_PUBLIC_ENABLE_MACRO=false
NEXT_PUBLIC_ENABLE_FUNDAMENTALS=false
NEXT_PUBLIC_ENABLE_FIXED_INCOME=false
NEXT_PUBLIC_ENABLE_ADMIN=false
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

### Server-Only Flags

```text
PRODUCT_MODE=alpha
ENABLE_ADMIN_ACTIONS=false
ENABLE_ASSISTANT_API=false
ENABLE_SCHEDULED_JOBS=true
ENABLE_PRICE_JOBS=true
ENABLE_PORTFOLIO_VALUATION_JOBS=true
ENABLE_BENCHMARK_JOBS=true
ENABLE_ETF_LOOKTHROUGH_JOBS=true
ENABLE_MACRO_JOBS=false
ENABLE_NEWS_JOBS=false
ENABLE_TELEMETRY_JOBS=false
ENABLE_MARKET_VISION_JOBS=false
ENABLE_RECOMMENDATION_JOBS=false
ENABLE_FUNDAMENTALS_JOBS=false
```

Existing provider flags can remain:

```text
ENABLE_GDELT_INGESTION
ENABLE_NEWSDATA_INGESTION
ENABLE_AI_NEWS_CLASSIFICATION
ENABLE_WEEKLY_NEWS_RECONCILIATION
ENABLE_FUNDAMENTALS_REFRESH
ENABLE_ETF_LOOKTHROUGH_REFRESH
```

## 17. Recommended Implementation Prompt If Audit Passes

```text
Implement ETFVision feature-gated alpha mode.

Goal:
Keep one production-ready codebase while allowing a lighter free-testing/alpha user experience.

Do not delete advanced features.
Do not split branches.
Do not change portfolio calculations.
Do not change recommendation scoring.

Build:

1. Central feature config:
- src/config/features.ts
- product modes: alpha, full_internal, pro
- public UI flags
- server-only flags

2. Navigation gating:
- move nav items to feature-aware config
- hide advanced research/admin items in alpha

3. Route guards:
- requireFeature
- requireAdmin
- requireInternal
- use on advanced routes

4. API/server-action guards:
- assistant API
- admin actions
- recommendation actions
- Market Vision AI actions
- job endpoints

5. Portfolio Review partial gating:
- alpha shows basic allocation, diversification, concentration, risk, ETF look-through
- hide recommendations, telemetry, Market Vision, advanced suggestions

6. Instrument detail tab gating:
- alpha shows overview, performance, basic risk/look-through where available
- hide recommendations, advanced fundamentals, telemetry-linked sections

7. Universe/watchlist gating:
- add visibility/eligibility policy
- support alpha-visible subset
- prevent direct access to hidden symbols for alpha users
- ensure jobs can use eligibility filters

8. Recommendation label commercial gating:
- hide recommendations in alpha
- prepare central label display mapping for future external modes

9. Tests:
- nav item hidden when disabled
- direct route blocked when disabled
- API blocked when disabled
- admin route blocked for non-admin
- portfolio review alpha sections filtered
- instrument detail tabs filtered
- alpha universe filtering works

Run:
- lint
- typecheck
- tests
- build

Return:
- files changed
- flags added
- routes gated
- tests added
- validation results
```

## 18. Final Assessment

ETFVISION is ready for a feature-gated production-light architecture.

The correct next step is not to strip the app down. The correct next step is to add a small but disciplined product-mode and feature-flag layer, then use it to hide or disable advanced features for alpha users.

The highest-priority before any external tester access:

1. Admin role protection.
2. Direct route guards.
3. Assistant/API feature guard.
4. Recommendation label hiding/remapping.
5. Universe/watchlist visibility filtering.
6. Portfolio Review section filtering.

After those are in place, the same `main` branch can safely serve both:

- a clean alpha/free-testing product
- the full internal ETFVision intelligence platform

