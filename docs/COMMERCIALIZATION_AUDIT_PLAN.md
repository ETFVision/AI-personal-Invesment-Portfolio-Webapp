# ETFVision Commercialization Audit Plan

Last updated: 2026-06-17 +08:00

## Purpose

This document defines the audits ETFVision should complete before public alpha, first paying users, and broader commercial launch.

ETFVision is a portfolio analytics platform. The main commercialization risks are:

1. Incorrect portfolio calculations.
2. Poor data quality.
3. Inaccurate ETF look-through analysis.
4. AI hallucinations or advice-like outputs.
5. Weak security or user isolation.
6. Inadequate legal and compliance positioning.
7. Poor observability and reproducibility.
8. Unclear product-mode separation between alpha, internal, full, and future paid versions.

The key commercialization principle is:

ETFVision should be able to explain every user-facing result using source data, normalized taxonomy, calculation logic, snapshot version, prompt version, confidence level, and timestamp. If a result cannot be explained or reproduced, it should not be shown commercially.

## Audit Status Definitions

| Status | Meaning |
|---|---|
| Completed | Core implementation and documentation are in place, with no known launch-blocking gap. |
| Mostly completed | Core implementation exists, but final live checks, regression fixtures, or monitoring remain. |
| Partly completed | Some implementation exists, but meaningful audit work remains. |
| In progress | Active work has started, but the audit is not yet stable. |
| Not completed | Audit has not been meaningfully performed. |
| Not started | Product capability or commercial process is not built yet. |

## 1. Instrument Taxonomy Audit

Goal: verify the approved ETF and stock universe is correctly classified and ready for product use.

Checks:
- Approved ETF count confirmed.
- Approved stock count confirmed.
- No duplicate symbols.
- No symbol assigned to multiple categories.
- No ETF classified as stock.
- No stock classified as ETF.
- ETF category populated.
- Stock sector populated.
- Asset category populated.
- Coverage status populated where applicable.
- Raw crypto references remain inactive or intentionally scoped.

Key fields:
- `instrument_type`
- `asset_category`
- `sector`
- `etf_category`
- `coverage_status`
- `is_active`
- `is_user_selectable`

Output:
- Instrument count report.
- Duplicate symbol report.
- Unknown category report.
- Alpha versus development universe recommendation.

Current status: completed.

Notes:
- Current source-of-truth universe lives in `src/domain/universe/alphaUniverse.ts`.
- Live Supabase verification on 2026-06-12 confirmed 306 active instruments: 201 ETF-style products and 105 stocks.
- Raw crypto references are inactive; crypto ETF proxies remain active ETF-style products.
- No active duplicate symbols, missing active ETF categories, missing active stock canonical sectors, or missing active asset categories were found.
- A future ETF universe completion item has been logged for Factor Investing and Option Income ETFs.

## 2. Data Provider Audit

Goal: verify FMP and other provider data is reliable enough for each approved instrument.

Checks:
- Recent price data exists.
- Historical price data exists.
- Metadata/profile exists.
- ETF sector exposure exists where required.
- ETF geography exposure exists where required.
- ETF holdings data exists where required.
- Fundamentals available for supported stocks.
- Stale data detected.
- Unsupported symbols detected.

Coverage status:
- `SUPPORTED`
- `PARTIAL_SUPPORT`
- `UNSUPPORTED`
- `UNKNOWN`

Output:
- Supported instruments.
- Partial support instruments.
- Unsupported instruments.
- Instruments to move to development-only.
- Provider gaps requiring fallback data.

Current status: partly completed.

Notes:
- FMP coverage has been tested for many active instruments and candidate ETFs.
- Formal full-universe provider coverage matrix is still needed.
- ETF look-through coverage confirmed 169/169 eligible equity ETFs as of 2026-06-18: sector 169/169, country 169/169, top holdings 169/169.
- Five ETFs (IYW, VCR, JXI, VOX, PXE) return empty from FMP's `/etf/sector-weightings` endpoint — a data gap in FMP's database, not a plan limitation. All five are pure-play single-sector ETFs handled by a seeded sector fallback. Live FMP data takes priority if FMP adds sector data for them in future.

## 3. Data Normalization Audit

Goal: ensure raw provider data is normalized into ETFVision's internal taxonomy before use.

Checks:
- FMP raw fields preserved.
- Normalized fields populated.
- Provider categories not used directly in calculations.
- Unknown mappings detected.
- Manual ETFVision taxonomy overrides provider category where needed.

Provider fields:
- `provider_sector`
- `provider_industry`
- `provider_category`
- `provider_asset_class`
- `provider_raw_json`

Normalized fields:
- `instrument_type`
- `asset_category`
- `sector`
- `etf_category`

Output:
- Raw-provider usage report.
- Mapping gap report.
- Normalization test results.

Current status: completed.

Notes:
- ETF product taxonomy and portfolio sector allocation are intentionally separated.
- Portfolio sector allocation should use ETF look-through exposure where available, not `etf_category`.
- Live verification on 2026-06-12 confirmed all active instruments have normalized `asset_category`, `canonical_sector`, `canonical_themes` and `taxonomy_review_status`; all active ETF-style products have `etf_category`.
- Code-level cleanup now accepts generic provider labels and ETF category slugs that are already safely normalized. After deployment, run Seed Universe or Instrument Metadata Refresh to recalculate stored `taxonomy_review_status` values.

## 4. Security Master Audit

Goal: ensure each underlying security maps to one canonical identity.

Checks:
- Internal security ID exists.
- Ticker stored.
- Name stored.
- ISIN stored where available.
- FIGI stored where available.
- Country stored.
- Sector stored.
- Duplicate securities detected.
- Alias mappings maintained.
- Ticker changes handled.

Examples:
- `FB` to `META`
- `BRK.B`, `BRK-B`, `BRK/B`
- `SPLG` to `SPYM` replacement handling where provider support requires substitution.

Output:
- Duplicate security report.
- Alias mapping report.
- Unmapped holding report.

Current status: completed for the current commercialization checkpoint.

Notes:
- `docs/SECURITY_MASTER_AUDIT.md` documents the current state, implementation phases, QA queries, issuer logic, and next hardening steps.
- Migrations 091 through 105 add canonical securities, identifiers, aliases, internal ETF underlyings, dual-run QA, issuer master, issuer aliases, clean issuer display names, issuer-level look-through rollups, recommendation/history/telemetry identity propagation, Admin QA monitoring, corporate-action readiness tables, and provider reconciliation review tables.
- Active user-selectable instruments now link to canonical securities; ETF top holdings can map to canonical/internal securities.
- Security-master dual-run QA has returned `pass` for the current portfolio look-through snapshot.
- Portfolio Review concentration, top underlying company exposure, top indirect company exposure, Portfolio Assistant hidden-overlap context, and recommendation portfolio-fit logic can use issuer-level look-through exposure.
- Direct ETF/fund wrappers remain direct product positions and are not mixed into underlying company exposure.
- Direct stock holdings that also appear inside ETFs now display as direct `Stock` positions, while ETF-only rows remain indirect underlying exposure.
- Phase 5 has propagated optional `security_id` / `issuer_id` into recommendation snapshots/history and telemetry snapshots, while Portfolio Review reports carry a `security_identity_snapshot`.
- Phase 8 Admin/Data Sources monitoring is live through `get_security_master_health_snapshot()` and `security_master_mapping_gap_report`.
- Phase 6/7 tables are readiness layers. Corporate actions and provider observations are intentionally empty until a real corporate-action source or second identifier provider is connected.
- Final QA snapshot on 2026-06-13 showed 306/306 selectable instruments mapped, 357/357 active securities issuer-linked, 240/240 ETF top holdings mapped, 0 unmapped or ambiguous ETF holdings, 0 stale identifiers, 1053/1053 recommendations and recommendation-history rows identity-linked, 389/389 telemetry recommendation snapshots identity-linked, and 24/24 Portfolio Review reports at Phase 5.

## 5. ETF Holdings Data Audit

Goal: verify ETF holdings data is complete, fresh, and usable for look-through analysis.

Checks:
- ETF holdings snapshot exists.
- Holdings refresh date stored.
- Holdings weight sum approximately 100%.
- No duplicate holdings.
- Missing holdings detected.
- Top holdings reasonable.
- Large day-over-day changes flagged.
- Holdings source stored.
- Holdings snapshot version stored.

Output:
- Holdings completeness report.
- Weight-sum validation report.
- Missing holdings report.
- Drift detection report.

Current status: partly completed.

Notes:
- Sector, country, and top holdings are now fully populated: 169/169 eligible equity ETFs as of 2026-06-18.
- ON CONFLICT duplicate-holdings bug fixed 2026-06-18: FMP occasionally returns duplicate `holdingSymbol` entries; deduplication by Map (keeping highest weight) now runs before upsert.
- Portfolio indirect-holding company overlap is now fully operational via `sharedCompanyCount`, `sharedCompanyWeight`, and `topSharedSymbols` on each gap-analysis candidate (Task B, 2026-06-18).
- Remaining formal audit items: holdings weight-sum validation, drift detection, and a full completeness report have not been produced.

## 6. Calculation And Logic Audit

Goal: verify all portfolio analytics calculations are correct and reproducible.

Areas:
- Portfolio valuation.
- Cash balance.
- Deposits and withdrawals.
- Buy and sell transactions.
- Time-weighted returns.
- Volatility.
- Annualized volatility.
- Drawdown.
- Sharpe ratio.
- Sortino ratio.
- Asset allocation.
- Sector allocation.
- Country allocation.
- ETF look-through.
- Indirect holdings.
- Concentration.
- ETF overlap.
- Benchmark comparison.
- Portfolio score.

Key rules:
- Deposits and withdrawals must not count as investment return.
- Buy and sell transactions are internal reallocations.
- Volatility must be calculated from cash-flow-adjusted daily returns.
- Sector allocation must use ETF sector exposure or holdings look-through, not ETF product category.
- Calculations must be reproducible from stored snapshots or documented source tables.

Output:
- Golden portfolio regression suite.
- Formula documentation.
- Calculation bug report.
- Excel/manual validation examples.

Current status: mostly completed.

Notes:
- Calculation and score methodology documentation exists.
- A golden regression suite and manual/Excel validation pack should still be added before paid users.

## 7. Portfolio Review Audit

Goal: verify portfolio review outputs are accurate, consistent, and not advice-like.

Checks:
- Portfolio score methodology documented.
- Allocation review correct.
- Concentration review correct.
- Diversification review correct.
- Risk review correct.
- Fixed income review correct.
- Missing data lowers confidence.
- No buy/sell recommendation language.
- Review findings traceable to data.

Output:
- Review methodology report.
- Portfolio review regression tests.
- Unsafe wording report.

Current status: mostly completed.

Notes:
- Portfolio Review uses ETF look-through exposure and deterministic review sections.
- Portfolio Review gap analysis is now framed as deterministic underweighted-category screening, not as action or trade guidance.
- Instrument cards in the gap section include disclaimer chips and why-this-appeared context.
- Candidate explanation and ranking can be refined further.

## 8. AI Output Audit

Goal: prevent hallucinations, invented numbers, and advice-like outputs.

Checks:
- AI uses structured metrics only.
- AI does not independently calculate exposures.
- AI does not invent returns, scores, or allocations.
- AI does not recommend buy/sell/hold actions.
- AI explains uncertainty.
- AI respects missing-data states.
- Prompt version stored.
- Output version stored.

Output:
- AI regression tests.
- Unsafe wording report.
- Prompt governance report.

Current status: partly completed.

Notes:
- Assistant and Market Vision prompts have been hardened.
- More question-based regression tests should be added for portfolio assistant, Market Vision, and Insight explanations.

## 9. Market Vision Audit

Goal: verify Market Vision is evidence-based, traceable, and telemetry-ready.

Checks:
- Regime scorecard generated.
- Supporting evidence shown.
- Conflicting evidence shown.
- Evidence gaps shown.
- Confidence scores calibrated.
- Theme IDs stored.
- Forecast objects stored.
- Portfolio context does not recommend trades.
- No allocation recommendation language.
- Previous regime transition tracked.

Output:
- Market Vision evidence audit.
- Forecast metadata audit.
- Confidence calibration audit.
- No-recommendation wording audit.

Current status: partly completed.

Notes:
- Market Vision exists and has structured metadata.
- Publish versus draft lifecycle still requires final operating decision and scheduled-job QA.

## 10. Recommendation / Insights Audit

Goal: ensure recommendation logic is commercially safe and framed as analytics.

Checks:
- "Recommendation Engine" renamed or hidden where appropriate.
- Buy/sell/hold labels removed from user-facing UI where needed.
- Instrument characteristics separated from portfolio impact.
- Scores are explainable.
- Diagnostics internal-only.
- No investment advice wording.

Safer terms:
- Portfolio Insights.
- Instrument Characteristics.
- Assessment Label.
- Characteristics Score.
- Portfolio Relevance.
- Gap Analysis.
- Analytical Gap Summary.

Output:
- Risky terminology report.
- Consumer-facing label audit.
- API response audit.

Current status: mostly completed.

Notes:
- User-facing Insights labels now use neutral characteristics language: `Excellent`, `Good`, `Neutral`, `Weak`, `Poor`, `Significant Concerns`, `Insufficient Data`, and `Not Applicable`.
- Internal scoring labels remain unchanged for telemetry, historical records, and guardrail compatibility, but should not be shown as user-facing investment recommendations.
- Instrument detail summaries now describe characteristics assessments instead of saying an instrument is rated Buy/Hold/Reduce/Sell.
- Portfolio Review user-facing wording now refers to insight alignment rather than recommendation alignment.
- Public `/methodology` explains the Characteristics Score and Portfolio Score calculations using neutral user-facing labels.
- Recommendation calibration should still be rerun after the next complete weekly refresh; this is a calibration QA item, not a remaining language-cleanup blocker.

## 11. Security Audit

Goal: protect user data and platform integrity.

Checks:
- Authentication secure.
- Authorization enforced.
- User isolation tested.
- Admin routes protected.
- API routes guarded.
- Supabase RLS enabled and verified.
- Secrets not exposed.
- SQL injection protected.
- XSS protected.
- CSRF considered.
- SSRF considered.
- Dependency vulnerabilities scanned.
- HTTPS enforced.
- Security headers configured.

Output:
- Security checklist.
- RLS test report.
- Dependency scan report.
- Penetration test report when external testing begins.

Current status: partly completed.

Notes:
- Admin authorization is implemented: `ADMIN_USER_IDS` and `ADMIN_EMAILS` env allowlists, `requireAdmin()`, route-level guards on `/admin/*` and `/setup/taxonomy`, and server-action guards on all admin-only operations.
- Signup access control is implemented: `ALLOWED_SIGNUP_EMAILS` invite-only gating in `SupabaseAuthProvider.signUpWithPassword`, QA-verified on Vercel.
- RLS coverage has expanded: migration 106 enables RLS on `assets` with an authenticated SELECT policy; migrations 107 and 108 add user-scoped SELECT policies on `portfolio_dashboard_summary` and `portfolio_performance_summary` using the correct `auth_provider_user_id` join pattern.
- **Updated 2026-06-17:** full RLS policy audit completed (migration `109_rls_hardening.sql`). Assistant conversation tables (`assistant_conversations`, `assistant_messages`, `assistant_usage_logs`) and portfolio telemetry tables are now user-scoped. `pg_policies` verification returned 7/7 PASS. See `docs/qa-log.md` — Task 14.
- Remaining items: confirm no service-role key is used in client components, confirm job endpoints reject unauthenticated requests in production, external penetration test before 100+ users.
- This remains a high-priority blocker before broader external alpha or paid users.

## 12. Feature Flags And Product Modes Audit

Goal: ensure alpha, pro, internal, and admin features are properly separated.

Checks:
- Alpha users cannot access internal routes.
- Admin routes role-gated.
- API guards exist.
- Sidebar hides unavailable features.
- Unsupported instruments blocked.
- Development-only features not exposed.
- Assistant, Market Vision, Recommendations, Telemetry, Admin and diagnostics gated as intended.

Product modes:
- `alpha`
- `pro`
- `internal`
- `admin`

Output:
- Route access matrix.
- API access matrix.
- Feature flag test report.

Current status: partly completed.

Notes:
- Runtime product mode implemented: `PRODUCT_MODE=alpha|full` server-only env var in `src/config/productMode.ts`, no `NEXT_PUBLIC_` exposure, Edge Runtime safe.
- Middleware route blocking active: all non-API, non-asset paths not in `alphaAllowedPrefixes` redirect to `/portfolio?feature=alpha-disabled` in alpha mode.
- Nav gating implemented: News & Themes, Macro, Assistant, Telemetry, and Admin hidden in alpha mode; `PortfolioAssistantDrawer` suppressed.
- Market Vision alpha surface: published-only report filter, editorial actions and draft editor hidden in alpha mode.
- Browser QA (Task 3 + Task 10) passed on Vercel: 14/14 checks verified 2026-06-16.
- Branch methodology still exists: `development`, `main`, and `alpha`.
- Remaining items: formal route access matrix document; alpha git branch audit to confirm the branch can receive main updates without patchwork drift.

## 13. Performance And Rendering Audit

Goal: ensure pages load quickly and avoid unnecessary render-time calculations.

Checks:
- Slow routes identified.
- Query timings logged.
- Heavy calculations moved to summary tables where appropriate.
- Summary tables refreshed correctly.
- Pages do not over-fetch.
- Pagination used for large tables.
- Expensive admin diagnostics lazy-loaded.
- Stale summary states handled.

Candidate summary tables:
- `portfolio_dashboard_summary`
- `portfolio_performance_summary`
- `portfolio_risk_summary`
- `portfolio_review_summary`
- `instrument_market_summary`
- `macro_dashboard_summary`
- `market_vision_summary`
- `bond_analytics_summary`

Output:
- Page rendering audit.
- Slow query report.
- Summary table design.
- Before/after timing report.

Current status: in progress.

Notes:
- Render timing logs exist.
- Portfolio performance, holdings and cash summary optimizations were implemented.
- Universe/watchlist summary-table approach was tested and partially reverted/limited because it was not consistently faster.

## 14. Observability And Reproducibility Audit

Goal: ensure every important output can be traced and reproduced.

Checks:
- Data refresh logs stored.
- Job logs stored.
- Calculation logs stored.
- AI call logs stored.
- Error logs stored.
- Portfolio snapshot stored.
- Holdings snapshot stored.
- Price snapshot date stored.
- Calculation version stored.
- Prompt version stored.
- Taxonomy version stored.

Output:
- Reproducibility report.
- Missing snapshot/version report.
- Logging coverage report.

Current status: mostly completed.

Notes:
- Many refresh, job, AI and telemetry logs exist.
- A final reproducibility matrix should prove every major user-facing result can be traced.

## 15. Legal And Compliance Audit

Goal: ensure ETFVision is positioned as portfolio analytics, not regulated investment advice.

Checks:
- Terms of Service reviewed.
- Privacy Policy reviewed.
- Disclaimers reviewed.
- Data licensing reviewed.
- No personalized investment advice language.
- No buy/sell/hold instructions.
- No discretionary portfolio management.
- No regulated advisory claims.
- PDPA obligations reviewed.
- Cookie/tracking disclosures reviewed.

Output:
- Legal review memo.
- Disclaimer audit.
- Data licensing confirmation.
- Privacy compliance checklist.

Current status: partly completed.

Notes:
- First-login disclaimer acknowledgement, persistent footer disclaimer, full-disclaimer modal, export/report disclaimer helper, public `/methodology`, and `/legal/disclosures` placeholder are implemented.
- Public wording now states that scores are deterministic analytical classifications for informational purposes only and not investment advice, securities ratings, or buy/sell/hold recommendations.
- This still requires qualified legal review before paid users. The current implementation is product compliance positioning, not a legal opinion.

## 16. Data Licensing Audit

Goal: confirm ETFVision has the right to use data commercially.

Checks:
- FMP commercial usage rights.
- ETF holdings usage rights.
- Fundamentals usage rights.
- News usage rights.
- Redistribution restrictions.
- Attribution requirements.
- API plan limits.
- Caching/storage rights.
- User-facing display rights.

Output:
- Provider licensing matrix.
- Commercial-use confirmation.
- Data-risk register.

Current status: not completed.

Notes:
- This is a blocker before commercialization with paying users.

## 17. Scheduled Jobs And Refresh Audit

Goal: ensure scheduled data refreshes work reliably.

Checks:
- Daily price jobs.
- Daily macro/news jobs.
- Weekly fundamentals jobs.
- Weekly Market Vision jobs.
- Weekly recommendation/insight jobs.
- ETF exposure refresh jobs.
- Job retries.
- Job failure alerts.
- `CRON_SECRET` protection.
- Manual fallback jobs.

Output:
- Job schedule matrix.
- Failed job report.
- Refresh freshness report.

Current status: mostly completed.

Notes:
- Supabase cron schedule exists.
- Live drift check against Supabase `cron.job` and several successful daily/weekly cycles remain important.

## 18. Database And Backup Audit

Goal: ensure data is reliable, recoverable, and efficient.

Checks:
- Database indexes.
- Query performance.
- RLS policies.
- Backup policy.
- Restore process.
- Migration safety.
- Foreign keys.
- Constraint checks.
- Duplicate prevention.
- Sensitive data handling.

Output:
- Database health report.
- Index audit.
- Backup/restore checklist.

Current status: partly completed.

Notes:
- Schema documentation exists.
- RLS coverage has expanded: migration 106 enables RLS on `assets` with an authenticated SELECT policy; migrations 107 and 108 add user-scoped SELECT policies on `portfolio_dashboard_summary` and `portfolio_performance_summary`, with migration 108 correcting the ownership join from `user_id = auth.uid()` to the correct `exists()` pattern via `users.auth_provider_user_id = auth.uid()::text`.
- `instrument_directory_summary` confirmed as an orphaned experimental table with no source references; no policy needed.
- **Updated 2026-06-17:** full RLS policy audit completed via migration `109_rls_hardening.sql`.
- Remaining items: formal index audit, backup policy, and restore process verification.

## 19. User Privacy Audit

Goal: protect user portfolios and personal information.

Checks:
- User data minimization.
- Portfolio privacy.
- Conversation storage review.
- Assistant logs review.
- Data retention policy.
- Delete/export capability.
- Access controls.
- Third-party sharing disclosure.

Output:
- Privacy impact checklist.
- Data retention matrix.
- User data inventory.

Current status: not completed.

Notes:
- This should be completed before external paid users and ideally before broad alpha.

## 20. Commercial Readiness Audit

Goal: verify the app is ready for paying users.

Checks:
- Pricing page accurate.
- Payment flow tested.
- Subscription status enforced.
- Free/pro/internal features separated.
- Support contact available.
- Error states user-friendly.
- Disclaimers visible.
- Data freshness visible.
- Known limitations disclosed.
- Onboarding tested.
- Refund/cancellation process defined.

Output:
- Commercial launch checklist.
- Alpha readiness checklist.
- Paid-user readiness checklist.

Current status: not started.

Notes:
- This is not required for private internal testing but is required before paid launch.

## 21. Branch And Deployment Governance Audit

Goal: ensure development, main and alpha branches can be maintained without drift or accidental exposure.

Checks:
- `development` is the active integration branch.
- `main` is the finalized full product codebase.
- `alpha` contains feature-gated external-alpha behavior.
- Merge direction is documented and followed.
- Rollback process exists.
- Deployment targets are known.
- Environment variables are branch/environment-specific where needed.
- Alpha is updated from main safely without manual patchwork drift.

Output:
- Branch governance policy.
- Deployment target matrix.
- Rollback checklist.

Current status: partly completed.

Notes:
- Branch workflow exists in practice.
- Runtime `PRODUCT_MODE=alpha|full` is now the primary mechanism for feature-surface control, reducing dependency on a separate alpha git branch for feature gating and reducing drift risk.
- Remaining items: formal governance policy documenting merge direction, deployment targets, and rollback process; verify the alpha branch can receive main updates safely.

## 22. Migration Safety Audit

Goal: ensure Supabase migrations can be applied safely across development, main and alpha workflows.

Checks:
- Migration order is clear.
- Irreversible migrations are flagged.
- Production migration rollback plan exists.
- Branch-specific migration risks are documented.
- Functions, cron jobs and table changes are versioned.
- Manual SQL instructions are captured when needed.

Output:
- Migration risk register.
- Rollback plan.
- Production migration checklist.

Current status: partly completed.

Notes:
- Migration usage is active and frequent; formal safety review is still needed before commercialization.

## 23. Alpha User Experience Audit

Goal: ensure the limited alpha product still feels coherent, useful and commercially credible.

Checks:
- Hidden features do not leave broken navigation or empty states.
- Alpha landing/dashboard is understandable.
- Pages available in alpha have complete enough data.
- Internal/admin language is hidden.
- Known limitations are disclosed cleanly.
- Feature labels match alpha positioning.

Output:
- Alpha UX checklist.
- Hidden-feature regression report.
- User-facing limitation copy review.

Current status: not completed.

## 24. Data Freshness UX Audit

Goal: ensure users understand stale, partial, unsupported, and refreshed data states.

Checks:
- Freshness labels are visible where needed.
- Partial support states are understandable.
- Provider-limited data is not presented as complete.
- Stale data does not silently drive high-confidence outputs.
- Manual refresh status is clear in Admin.

Output:
- Freshness display matrix.
- Missing/partial data UX checklist.
- Confidence downgrade policy.

Current status: partly completed.

## 25. Cost Control Audit

Goal: keep provider, AI, Vercel and Supabase usage controlled.

Checks:
- OpenAI usage logs and cost calculations.
- Market Vision cost tracking.
- Assistant cost tracking.
- News provider quota tracking.
- FMP call volume risk.
- Scheduled job frequency versus provider limits.
- Alerting or budget limits defined.

Output:
- Cost dashboard checklist.
- Provider quota register.
- Budget alert recommendation.

Current status: partly completed.

Notes:
- `ASSISTANT_DAILY_LIMIT` per-user daily conversation cap is implemented and enforced in `PortfolioAssistantService`; returns HTTP 429 when exceeded. This is a cost-control mechanism in addition to a rate limit.
- `estimateTokenCost()` shared helper is in `src/application/services/ai/costEstimate.ts` for consistent token cost calculation.
- `PORTFOLIO_ASSISTANT_*_COST_PER_1M` and `MARKET_VISION_*_COST_PER_1M` env-based cost constants are defined; `.env.example` documents current OpenAI pricing ($0.75 input / $4.50 output per 1M tokens for gpt-5.4-mini).
- News AI cost tracking is explicitly deferred until `ENABLE_AI_NEWS_CLASSIFICATION` and `ENABLE_WEEKLY_NEWS_RECONCILIATION` are enabled.
- Remaining items: provider quota register, FMP call volume tracking, budget alerting.

## 26. Error Handling And Empty State Audit

Goal: ensure provider failures, missing data, unsupported instruments and empty states are commercially polished.

Checks:
- Provider error states are readable.
- Empty tables have useful explanations.
- Missing metrics show reason when appropriate.
- Refresh failures are logged and summarized.
- User-facing pages avoid raw technical errors.

Output:
- Error state inventory.
- Empty state UX report.
- Provider failure playbook.

Current status: partly completed.

## 27. Export And User Data Portability Audit

Goal: prepare for future user trust, data portability and account lifecycle needs.

Checks:
- Portfolio export capability.
- Transaction export capability.
- Reports export capability.
- User data export policy.
- Account deletion policy.
- Data retention rules.

Output:
- Export capability matrix.
- Retention and deletion checklist.

Current status: not started.

## 28. Incident Response Audit

Goal: define what happens if calculations, provider data, scheduled jobs or AI outputs are wrong.

Checks:
- Incident severity levels.
- Data correction process.
- User notification policy.
- Rollback process.
- Provider outage playbook.
- Unsafe AI output handling.

Output:
- Incident response playbook.
- Escalation matrix.
- Postmortem template.

Current status: not completed.

## 29. Accessibility Audit

Goal: ensure the app is usable and readable for a broader audience.

Checks:
- Color contrast.
- Keyboard navigation.
- Focus states.
- Screen-reader semantics.
- Responsive layout.
- Table readability.
- Chart accessibility labels.

Output:
- Accessibility checklist.
- Known accessibility issues.
- Remediation plan.

Current status: not completed.

## 30. Browser And Device Compatibility Audit

Goal: ensure the app works across expected browsers and devices.

Checks:
- Chrome.
- Edge.
- Safari.
- Mobile viewport.
- Tablet viewport.
- Desktop viewport.
- Auth flow.
- Chart rendering.
- Tables and scrolling.

Output:
- Browser/device test matrix.
- Visual regression findings.

Current status: not completed.

## 31. Support Operations Audit

Goal: prepare for users reporting bugs, data issues, calculation concerns and billing issues.

Checks:
- Support contact exists.
- Bug report process.
- Data issue escalation.
- Calculation dispute process.
- Refund/cancellation support path.
- Internal triage categories.

Output:
- Support runbook.
- Issue taxonomy.
- Response-time target.

Current status: not started.

## 32. Model And Prompt Governance Audit

Goal: ensure AI prompts and model choices are versioned, reviewed and reversible.

Checks:
- Prompt versions stored.
- Model versions stored.
- Output versions stored.
- Prompt change QA process.
- Rollback process.
- Unsafe wording tests.
- Cost impact review.

Output:
- Prompt governance policy.
- AI change checklist.
- Prompt regression suite.

Current status: partly completed.

## 33. Email Deliverability And Auth Configuration Audit

Goal: ensure alpha and paying users can receive Supabase auth emails and complete signup.

Checks:
- Supabase auth email sender configured (custom SMTP or verified Supabase sender).
- Sender domain has SPF and DKIM records where applicable.
- Signup confirmation email delivers successfully to a test inbox.
- Password reset email delivers successfully.
- Emails do not land in spam for common providers (Gmail, Outlook).
- Auth email templates reviewed for brand and clarity.
- `ALLOWED_SIGNUP_EMAILS` env var set in Vercel before alpha invites.

Output:
- Email deliverability test results.
- SMTP/sender configuration confirmation.
- Auth template review.

Current status: not completed.

Notes:
- This is a hard blocker for alpha invites. If signup confirmation email fails or goes to spam, users cannot complete registration regardless of the invite gate.
- Should be tested end-to-end before the first alpha invite is sent.

## 34. Runtime Error Monitoring Audit

Goal: ensure platform errors are detected and reported before users experience silent failures.

Checks:
- Error monitoring service integrated (Sentry or equivalent).
- Next.js server-side errors captured.
- Client-side React rendering errors captured.
- Source maps configured for readable stack traces.
- Alerting configured for error spikes.
- Sensitive data excluded from error payloads.
- Error monitoring tested with a deliberate error.

Output:
- Error monitoring integration confirmation.
- Alert configuration record.
- Source map verification.

Current status: not completed.

Notes:
- No error monitoring service is currently configured. When alpha users hit unhandled exceptions or API 500s, there is no automatic detection.
- This is a prerequisite for alpha so that regressions and user-facing crashes surface without requiring manual bug reports.

## 35. New User Onboarding And Empty State Audit

Goal: ensure a first-time user can understand and begin using the product without external guidance.

Checks:
- Portfolio dashboard empty state is informative, not blank or broken.
- Clear call to action exists for adding first holdings and transactions.
- Empty states on holdings, transactions, risk, portfolio review, and insights pages explain what data is needed.
- No error states or broken UI appear for a portfolio with zero data.
- Onboarding copy does not use investment advice language.
- Limitations relevant to empty portfolios (no data to display, no refresh output yet) are clearly communicated.

Output:
- Empty state walkthrough report.
- Onboarding copy review.
- First-login UX checklist.

Current status: not completed.

Notes:
- The product currently assumes users arrive with portfolio data. A new alpha user landing on an empty portfolio with no guidance is a significant friction point.
- This audit should be conducted alongside the Alpha UX walkthrough (Section 23) using a fresh test account with no portfolio data.

## Recommended Audit Timing

### Before Public Alpha

Must complete:

1. Instrument Taxonomy Audit.
2. Data Provider Audit.
3. Data Normalization Audit.
4. Calculation And Logic Audit.
5. AI Output Audit.
6. Feature Flags And Product Modes Audit.
7. Security Basic Audit.
8. Observability Audit.
9. Branch And Deployment Governance Audit.
10. Alpha User Experience Audit.
11. Scheduled Jobs And Refresh Audit.
12. Data Freshness UX Audit.
13. Email Deliverability And Auth Configuration Audit.
14. Runtime Error Monitoring Audit.
15. New User Onboarding And Empty State Audit.

### Before First Paying User

Must complete:

1. Legal And Compliance Audit.
2. Data Licensing Audit.
3. Privacy Audit.
4. Security Audit.
5. Portfolio Review Audit.
6. Performance Audit.
7. Cost Control Audit.
8. Error Handling And Empty State Audit.
9. Database And Backup Audit.
10. Support Operations Audit.

### Before Scaling To 100+ Paying Users

Strongly recommended:

1. External code review.
2. External calculation review.
3. External penetration test.
4. PDPA review.
5. Backup/restore audit.
6. Data provider contract review.
7. Incident response drill.
8. Browser and accessibility review.

### Before Scaling To 500+ Paying Users

Recommended:

1. Annual security review.
2. Formal compliance review.
3. Cyber insurance review.
4. Vendor risk review.
5. Incident response drill.
6. Formal support operations review.

## Audit Priority Ranking

1. Calculation And Logic Audit.
2. Data Provider Audit.
3. Instrument Taxonomy Audit.
4. AI Output Audit.
5. Feature Flags And Product Modes Audit.
6. Security Audit.
7. Email Deliverability And Auth Configuration Audit.
8. Runtime Error Monitoring Audit.
9. Legal And Compliance Audit.
10. Data Licensing Audit.
11. Observability Audit.
12. Performance Audit.
13. ETF Holdings Data Audit.
14. Market Vision Audit.
15. Recommendation / Insights Audit.
16. Privacy Audit.
17. Scheduled Jobs And Refresh Audit.
18. Branch And Deployment Governance Audit.
19. Migration Safety Audit.
20. Commercial Readiness Audit.
21. Cost Control Audit.
22. Alpha User Experience Audit.
23. New User Onboarding And Empty State Audit.

## Current Commercialization Audit Status

| # | Audit | Status | Current assessment |
|---:|---|---|---|
| 1 | Instrument Taxonomy Audit | Completed | Taxonomy is implemented, documented and live-count verified. Repeat the live count check after future ETF additions. |
| 2 | Data Provider Audit | Partly completed | Provider coverage has been tested ad hoc. A formal full-universe provider matrix is still needed. |
| 3 | Data Normalization Audit | Completed | Raw provider metadata is preserved, normalized fields are populated and look-through exposure is separated from ETF product taxonomy. Review queue alias cleanup is implemented; stored statuses need recalculation after deployment. |
| 4 | Security Master Audit | Completed | Canonical securities, identifiers, aliases, internal ETF underlyings, issuer master, dual-run QA, issuer-level look-through rollups, Phase 5 stable identity propagation, Phase 8 monitoring, Phase 6 corporate-action readiness, and Phase 7 provider-reconciliation readiness are implemented. Final QA passed with 306/306 selectable instruments mapped, 240/240 ETF holdings mapped, and 0 unmapped/ambiguous holdings. |
| 5 | ETF Holdings Data Audit | Mostly completed for current portfolio | Sector/country look-through works. ETF top holdings are mapped through security master/internal underlyings for current coverage. Full provider-plan expansion and mapping monitoring remain. |
| 6 | Calculation And Logic Audit | Mostly completed | Methodology and core optimizations exist. Golden regression/manual validation pack remains. |
| 7 | Portfolio Review Audit | Mostly completed | Engine works and is documented. Issuer-level look-through and direct/indirect exposure QA passed. Gap analysis wording has been reframed as deterministic underweighted-category screening. Broader regression fixtures remain. |
| 8 | AI Output Audit | Partly completed | Prompts hardened. Formal regression suite still needed. |
| 9 | Market Vision Audit | Partly completed | Engine exists. Draft/publish lifecycle and evidence traceability need final audit. |
| 10 | Recommendation / Insights Audit | Mostly completed | User-facing label and wording cleanup is complete for the current surface. Public methodology now documents Characteristics Score calculations with neutral labels. Post-refresh calibration QA and internal API terminology review remain. |
| 11 | Security Audit | Partly completed | Admin auth layer, signup restriction, RLS migrations 106/107/108, and full RLS policy audit (migration 109) completed. CRON_SECRET query-param path removed; Bearer header only. Service-role client check, job endpoint auth verification, and penetration test remain. |
| 12 | Feature Flags And Product Modes Audit | Partly completed | Runtime PRODUCT_MODE=alpha/full implemented and browser QA passed 2026-06-16. Formal route access matrix and alpha git branch audit remain. |
| 13 | Performance And Rendering Audit | In progress | Render timing and some summary optimizations done. Further route work remains. |
| 14 | Observability And Reproducibility Audit | Mostly completed | Logs and snapshots exist. Full reproducibility matrix still needed. |
| 15 | Legal And Compliance Audit | Partly completed | Product disclaimers, acknowledgement modal, footer disclaimer, export/report disclaimer helper, public methodology, and legal-disclosures placeholder are implemented. Qualified legal review remains required. |
| 16 | Data Licensing Audit | Not completed | Needs provider licensing confirmation. |
| 17 | Scheduled Jobs And Refresh Audit | Mostly completed | Supabase cron exists. Needs live drift and reliability checks. |
| 18 | Database And Backup Audit | Partly completed | Schema documented. RLS expanded: migrations 106/107/108 add policies on assets and portfolio summaries; migration 109 completes user-scoped hardening for assistant and telemetry tables. Formal index audit, backup policy, and restore process verification remain. |
| 19 | User Privacy Audit | Not completed | Needs data retention, export/delete and assistant log review. |
| 20 | Commercial Readiness Audit | Not started | Pricing, payments, subscription, support and onboarding are not yet productized. |
| 21 | Branch And Deployment Governance Audit | Partly completed | Runtime PRODUCT_MODE reduces alpha branch dependency for feature gating. Formal governance policy and alpha branch update verification remain. |
| 22 | Migration Safety Audit | Partly completed | Migrations are active. Formal rollback and production safety process remains. |
| 23 | Alpha User Experience Audit | Not completed | Needs direct alpha product walkthrough. |
| 24 | Data Freshness UX Audit | Partly completed | Freshness and diagnostics exist, but product-facing stale/partial state audit remains. |
| 25 | Cost Control Audit | Partly completed | ASSISTANT_DAILY_LIMIT cap, estimateTokenCost() helper, and env-based cost constants implemented. Provider quota register and budget alerting remain. |
| 26 | Error Handling And Empty State Audit | Partly completed | Some states improved. Full product error-state inventory remains. |
| 27 | Export And User Data Portability Audit | Not started | Export/delete/retention flows not productized. |
| 28 | Incident Response Audit | Not completed | No formal incident playbook yet. |
| 29 | Accessibility Audit | Not completed | Needs visual, keyboard and semantic review. |
| 30 | Browser And Device Compatibility Audit | Not completed | Needs cross-device/browser testing. |
| 31 | Support Operations Audit | Not started | Support workflow not productized. |
| 32 | Model And Prompt Governance Audit | Partly completed | Prompt versions and costs exist. Formal governance and regression suite remain. |
| 33 | Email Deliverability And Auth Configuration Audit | Not completed | Supabase auth email delivery, SMTP sender, and domain authentication have not been verified. Hard blocker before alpha invites. |
| 34 | Runtime Error Monitoring Audit | Not completed | No error monitoring service is configured. Alpha regressions and user-facing crashes will be invisible without it. |
| 35 | New User Onboarding And Empty State Audit | Not completed | No first-login guidance or onboarding flow exists for users with an empty portfolio. |

## Current Commercialization Readiness Summary

ETFVision is progressing toward public alpha, but it is not ready for paid users yet.

Strong areas:
- Instrument taxonomy, now completed for the current commercialization checkpoint.
- Portfolio calculations.
- Stored metrics architecture.
- ETF look-through sector/country exposure.
- Portfolio Review.
- Documentation and methodology handover.
- Scheduled refresh architecture.

Main blockers before public alpha:
- Security/RLS audit (admin auth, signup restriction, RLS migrations 106/107/108, and full RLS policy audit via migration 109 completed; service-role client check, job endpoint auth verification, and penetration test remain).
- Alpha feature-gate audit (runtime PRODUCT_MODE gate implemented and QA passed; formal route access matrix and alpha git branch audit remain).
- Email deliverability and Supabase auth email configuration (hard blocker — must be verified before first invite).
- Runtime error monitoring setup (needed to detect alpha regressions without relying on user reports).
- Data provider coverage matrix.
- Calculation regression examples.
- AI output regression tests.
- Scheduled job drift/reliability check.
- Alpha UX walkthrough.
- New user onboarding and empty state.

Main blockers before paid users:
- Legal/compliance review.
- Data licensing review.
- Privacy/data retention review.
- Full security audit.
- Backup/restore audit.
- Cost-control audit.
- Commercial readiness/payments/support process.
