## 2026-06-19 - Gap Analysis Defensive ETF Examples and Category-Fit Display Order

### Source
Claude Code

### Objective
Improve Portfolio Review Gap Analysis candidate examples by excluding single stocks from the Healthcare & Defensive gap and displaying selected candidates by category fit rather than standalone instrument quality.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/gapCandidateDisplay.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added a stock exclusion guard for `insufficient_defensive_exposure` issue fit so Healthcare & Defensive candidate examples come from diversified ETFs/funds rather than individual healthcare stocks.
- Added a pure `compareGapCandidatesByCategoryFit()` helper that sorts already-selected candidate cards by `issueFitScore` descending and then `recommendationScore` descending.
- Updated the Portfolio Review Gap Analysis card description and "Ordered by" chip from `Instrument quality` to `Category fit` while keeping the per-card Quality badge.
- Added tests for defensive ETF-only candidates and category-fit display sorting.
- Updated Portfolio Review methodology to document defensive stock exclusion and display ordering.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (295/295)

### Result
Completed.

### Notes for Claude
- Verified XLV, VHT, XLU, and XLP are present in the seeded universe and default active.
- Defensive gap examples move from single-stock names such as ISRG, AMGN, GILD, BMY, and PFE to diversified sector ETFs such as XLV, VHT, XLU, and XLP after a fresh Portfolio Review run.
- Candidate selection still occurs in the service via `candidateRankScore`; this task changes display order for the selected cards to category-intrinsic fit.
- Portfolio Review must be re-run from the Admin panel to regenerate stored report output.

---
## 2026-06-19 - Insight Alignment Score Cap and Coverage Display

### Source
Claude Code

### Objective
Fix Portfolio Review Insight Alignment so a watch/attention finding cannot display with a 95-100 section score, and format recommendation coverage as a percentage.

### Files Changed
- `src/application/services/portfolioReview/RecommendationAlignmentReviewService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `src/app/methodology/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Preserved the Insight Alignment raw formula terms: `60 + constructiveHeldCount * 4 - weakHeldCount * 8 + coverage * 12`.
- Added a presentation cap of 94 whenever the section has any non-info finding, covering both weak-holding and incomplete-coverage findings.
- Added `coverage` to the Portfolio Review page ratio metric detector so `recommendationCoverage: 1` renders as `100%`.
- Added tests for weak-holding cap, incomplete-coverage cap, and clean-section 100 score.
- Updated methodology documentation and the public methodology page to describe the cap.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (293/293)

### Result
Completed.

### Notes for Claude
- Reference Portfolio Review Insight Alignment moves from 100 to 94 when the existing `Some holdings need review` finding is present.
- `Recommendation Coverage` now renders as `100%` instead of `1`.
- Portfolio Review must be re-run from the Admin panel to regenerate stored reports.

---
## 2026-06-19 - Wrapper-Excluded Diversification Penalty Fix

### Source
Claude Code

### Objective
Fix the Task 2 issuer-level diversification penalty so it uses wrapper-excluded underlying-company concentration, matching the Concentration Review section basis.

### Files Changed
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/app/methodology/page.tsx`
- `tests/risk-math.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added `wrapperExcludedIssuerConcentration()` to derive diversification penalty top-one/top-five from latest Portfolio Review holding exposures while excluding direct ETF, bond ETF, gold ETF, crypto ETF, and cash-proxy wrappers.
- Kept direct single-stock holdings included in the underlying-company rollup.
- Replaced the prior `exposureContext.issuerExposures` concentration input, which could include ETF wrappers such as VOO, with the wrapper-excluded rollup.
- Left `holdingScore`, direct concentration metadata, and Risk page direct-concentration warnings unchanged.
- Added a regression test where VOO is 30% direct but NVDA is 8% underlying; the helper returns 8% top-one and the diversification score is materially higher than the direct-concentration result.
- Updated score methodology, Portfolio Review methodology, and public methodology wording to specify wrapper-excluded underlying-company concentration.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (290/290)

### Result
Completed.

### Notes for Claude
- Live symptom corrected: the penalty input should no longer treat VOO around 30% as the top issuer; it should use the top underlying company, e.g. NVDA around 7.9%, when fresh look-through is available.
- Reference portfolio before the Task 2 change was approximately 79; the incorrect intermediate fix only moved to approximately 80 because VOO still dominated. After this correction and a fresh risk/report refresh, the expected movement is into the high-80s.
- Risk Analytics / risk-report refresh and Portfolio Review refresh are required before stored pages show the corrected value.

---
## 2026-06-19 - Issuer-Level Risk Diversification Concentration Penalty

### Source
Claude Code

### Objective
Make the Risk Analytics and Portfolio Review diversification score use issuer-level look-through top-one and top-five concentration for the diversification concentration penalty when issuer exposure is available, with direct concentration fallback.

### Files Changed
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/application/services/risk/RiskAnalyticsService.ts`
- `src/application/services/risk/DiversificationService.ts`
- `src/application/services/risk/CorrelationService.ts`
- `src/app/methodology/page.tsx`
- `tests/risk-math.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Refactored `RiskAnalyticsDataService.buildReport()` to compute the existing portfolio exposure context once, derive issuer-level top-one and top-five concentration from `issuerExposures`, and pass those values into `RiskAnalyticsService.calculateRiskAnalytics()`.
- Updated `RiskAnalyticsService.calculateRiskAnalytics()` to use issuer-level concentration only for `DiversificationService.score()` inputs when available; direct concentration remains the fallback.
- Left `holdingScore`, Risk page direct-concentration warnings, and the `concentration` metadata object on direct holding concentration.
- Left `riskMath.diversificationScore()` formula unchanged; only the upstream concentration inputs changed.
- Added service-level regression tests for diversified-wrapper improvement, direct fallback, genuine issuer-concentration penalty, and direct holding-count behavior.
- Updated score methodology, Portfolio Review methodology, and public methodology page text to describe issuer-level concentration penalty inputs and direct fallback.
- Converted risk-service runtime imports touched by the new tests to relative/type-only imports so the compiled Node test runner can load the service directly.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (289/289)

### Result
Completed.

### Notes for Claude
- Existing live/reference portfolio baseline from the task prompt: diversification score was approximately 79 before this change; after risk-report refresh with issuer look-through available, expected movement is toward the high-80s.
- Exact live after-value requires re-running Risk Analytics / risk-report refresh and then re-running Portfolio Review so stored reports read the updated risk diversification score.
- Risk Analytics page and Portfolio Review both read the same stored `riskReport.diversification.score`, so they should move together after refresh.
- Direct concentration warnings and the direct `concentration` metadata object intentionally remain unchanged.

---
## 2026-06-19 - Issue-Aware Gap Candidate Primary Reasons

### Source
Claude Code

### Objective
Make Portfolio Review gap-analysis candidate `primaryReason` text issue-category-aware for `excessive_crypto_risk` and `concentration_risk`.

### Files Changed
- `src/application/services/portfolioReview/DiversificationBenefitService.ts`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Added issue-category-specific `primaryReason` overrides for crypto-ballast bond, treasury, fixed-income, and credit candidates.
- Added issue-category-specific `primaryReason` overrides for concentration-risk international/geographic diversifiers and ballast candidates.
- Left the existing technology-overlap override intact so it still wins for technology-dominant candidates that are not strong diversifiers.
- No score, overlap penalty, finding, secondary benefit, role-priority, or candidate-filtering logic changed.
- Added regression assertions for crypto-ballast text, concentration-risk text, and unchanged insufficient-fixed-income bond text.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (285/285)

### Result
Completed.

### Notes for Claude
- Portfolio Review must be re-run from the Admin panel to regenerate stored report text.
- Before crypto-ballast bond candidate text: `BND provides exposure to fixed income where bond allocation is 0.0%.`
- After crypto-ballast bond candidate text: `BND is a bond or treasury instrument. Ballast characteristics such as these may differ from crypto and high-volatility alternative exposure.`

---
## 2026-06-19 - Portfolio Review Issuer-Level Concentration Coherence

### Source
Claude Code

### Objective
Make Portfolio Review concentration measurement coherent by using underlying-company issuer look-through concentration on a total-value basis for the Concentration Review section and `concentration_risk` gap finding.

### Files Changed
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `src/app/methodology/page.tsx`
- `tests/portfolio-review.test.ts`
- `docs/PORTFOLIO_REVIEW_METHODOLOGY.md`
- `docs/SCORE_METHODOLOGY.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Changed Concentration Review top-one measurement from wrapper/direct concentration to issuer-level underlying-company concentration when look-through exists, falling back to direct concentration only when issuer rows are unavailable.
- Included direct single-stock holdings in issuer exposure while excluding diversified ETF, bond ETF, gold ETF, crypto ETF, and cash-proxy wrappers from single-company concentration measurement.
- Recalibrated the Concentration section formula to `90 - max(0, topIssuerConcentration - 0.10) * 150 - max(0, topCombinedFive - 0.40) * 80 - max(0, sectorTop - 0.40) * 60`.
- Replaced the old largest-holding finding with issuer-level single-company findings: watch above 10%, attention above 20%.
- Lowered top-five issuer concentration finding to watch above 50%.
- Raised `concentration_risk` gap threshold from >5% to >10%, with high priority above 15%.
- Changed `concentration_risk` candidate roles to diversified products only and excluded stock instruments from that issue fit.
- Added total-value basis labels to Direct Portfolio Positions and Top Underlying Company Exposure.
- Updated methodology documentation and public methodology page to describe issuer-level, total-value concentration measurement.
- Added tests for ETF-wrapper false-positive removal, watch/attention thresholds, direct single-stock inclusion, fallback behaviour, concentration-gap thresholding, and stock-candidate exclusion.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (285/285)

### Result
Completed.

### Notes for Claude
- Expected reference portfolio Concentration section score moves from approximately 69 to approximately 90 when the largest issuer is below 10%, top five issuers are below 40%, and largest sector is below 40%.
- `largestDirectHolding` metadata still retains wrapper/product visibility such as VOO, but diversified ETF wrappers no longer trigger single-company concentration findings.
- Risk Analytics diversification scoring (`riskMath` / `RiskAnalyticsService`) was intentionally not changed; issuer-level diversification score migration remains a separate follow-on task.
- Portfolio Review must be re-run from the Admin panel to regenerate stored reports and confirm the score jump with owner approval.

---
## 2026-06-18 - Harden Portfolio Review Gap Analysis Tests

### Source
Claude Code

### Objective
Make the macro vulnerability test self-documenting and remove the dead `sector_concentration` candidate-priority branch after the duplicate gap trigger cleanup.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Updated the macro vulnerability regression test to explicitly set allocation by type to 85% equity ETF, 10% bond ETF, and 2% gold ETF so recession-hedge allocation is fixed at 12%.
- Removed the dead `sector_concentration`/`theme_concentration` branch from `rolePriority()`.
- Left a comment noting `theme_concentration` is currently a reserved issue category with no active gap-analysis trigger.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (280/280)

### Result
Completed.

### Notes for Claude
- No scoring methodology, portfolio calculation logic, or user-facing compliance wording changed.

---
## 2026-06-18 - Fix Duplicate Portfolio Review Gap Findings

### Source
Claude Code

### Objective
Remove duplicate gap findings in `PortfolioImprovementSuggestionService` and add analytically distinct triggers for crypto ballast, single-name look-through concentration, and macro growth-regime vulnerability.

### Files Changed
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Removed the legacy `sector_concentration` trigger and the duplicate `concentration_risk` trigger that repeated the international underweight message.
- Expanded the international gap condition to absorb portfolio concentration/diversification signals without creating a duplicate concentration finding.
- Broadened the defensive underweight trigger to use dominant-sector and technology exposure signals.
- Added distinct factual triggers for crypto/alternative ballast, single-name look-through concentration, and slowing-growth macro vulnerability.
- Updated concentration-risk candidate ordering to prioritize defensive, hedge, and fixed-income roles before international equity.
- Added regression tests for duplicate removal, new trigger thresholds, macro gating, and concentration candidate ordering.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (280/280)

### Result
Completed.

### Notes for Claude
- New gap rationales are observational and include "Analytical observation only - not a position sizing recommendation." where the finding could otherwise sound action-oriented.
- No scoring methodology, recommendation labels, user-facing investment advice language, or portfolio calculation logic was changed.

---
## 2026-06-18 - Drop 'symbol' from FMP holdingSymbol field fallback

### Source
Claude (direct)

### Objective
Prevent FMP cash, derivative, and money-market rows with a blank `asset` field from being stored as self-referential ETF holdings (e.g. VOO appearing as its own top holding).

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
- `docs/implementation-log.md`

### Summary
Root cause investigation confirmed that FMP's `/stable/etf/holdings` response includes rows for cash positions, securities-lending collateral, and derivative instruments that have `asset: ""`. The `textField` helper fell through to the `"symbol"` key, which FMP always sets to the parent ETF ticker. This caused every blank-asset row to be stored as `holding_symbol = "VOO"` (or VT, QQQ etc.), making the ETF appear to hold itself.

Removed `"symbol"` from the holdingSymbol field priority list:
- Before: `["asset", "ticker", "holdingSymbol", "symbol"]`
- After: `["asset", "ticker", "holdingSymbol"]`

With `holdingSymbol = null` these rows now hit the existing `if (!holdingSymbol || holdingWeight == null) return []` guard and are dropped cleanly. Cash and non-ticker instruments should not be stored in `etf_top_holdings`.

### Manual follow-up
Run in Supabase SQL editor to remove existing self-referential rows from the database:
```sql
DELETE FROM etf_top_holdings WHERE holding_symbol = etf_symbol;
```
This removes rows such as VOO holding VOO (weight 0.18%), VT holding VT (0.82%), QQQ holding QQQ (0.11%), IVV holding IVV (0.19%), and SPY holding SPY (0.20%). These originated from the blank-asset FMP data bug and carry no analytical meaning. Re-refresh is not required — the fix prevents new self-referential rows on next ingestion.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- FMP returns blank-asset rows for: Vanguard market-liquidity instruments ("MKTLIQ 12/31/2049"), securities-lending collateral ("SLBBH1142"), cash ("US Dollar"), futures ("CME E-Mini NASDAQ 100"), and various currency positions. VT has 505 such rows due to its broad international mandate and many local cash instruments.
- `"symbol"` must never be re-added to the holdingSymbol field list. In FMP's ETF holdings schema, `symbol` is always the parent ETF ticker, not the holding ticker.

---
## 2026-06-18 - Exclude equity ETF sub-holdings during portfolio look-through accumulation

### Source
Claude (direct)

### Objective
Prevent ETF wrappers (VOO, VT, QQQ, etc.) from appearing in "Top Underlying Company Exposure" and "Top Indirect Company Exposure" in Portfolio Review.

### Files Changed
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `docs/implementation-log.md`

### Summary
After the Security Master and issuer-link backfill, ETF wrappers appeared in company exposure with tiny indirect weights (VOO 0.05%, VT 0.06%, QQQ 0.01%). Root cause: some ETFs in the portfolio had blank-asset FMP rows that were stored as self-referential holdings (see entry above). These rows gave VOO/VT/QQQ a small holding weight inside other ETFs, which was then accumulated as indirect company exposure.

Added a Set `equityEtfSymbols` containing the uppercased symbols of all equity ETFs in the universe. Added a `continue` guard at the start of the `for (const holding of etfHoldings)` loop to skip any holding whose `holdingSymbol` is in `equityEtfSymbols`.

This serves as a belt-and-suspenders defence: even if a blank-asset FMP row slips through in future (or if a genuine fund-of-funds structure appears), equity ETF wrappers will never accumulate as indirect company exposure.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

---
## 2026-06-18 - Fix ETF holdings refresh batch ordering — sort by holdings date

### Source
Claude (direct)

### Objective
Fix the ETF look-through refresh job so each batch of 50 ETFs advances through the backlog rather than repeating the same first-50 alphabetically.

### Files Changed
- `src/application/ports/repositories/EtfExposureRepository.ts`
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `src/application/services/etfLookthrough/EtfLookthroughRefreshService.ts`
- `docs/implementation-log.md`

### Summary
Root cause: `getLatestExposureDateForEtf()` queries `etf_sector_exposures`. After full sector backfill (169/169), every ETF had sector date = "2026-06-18". All 169 passed the stale cutoff check and the first 50 alphabetically were selected every pass — no progress on ETFs missing holdings data.

Fix: added `getLatestHoldingsDateForEtf()` to `EtfExposureRepository` interface and `SupabaseEtfExposureRepository`, querying `etf_top_holdings` for the latest `as_of_date` per ETF. Changed `EtfLookthroughRefreshService.refresh()` to collect all eligible ETFs first, then sort by `holdingsLatest` ascending (nulls first — ETFs with no holdings data are prioritised), then slice to `maxEtfsPerRun`. Each pass now reliably covers the 50 ETFs furthest from holdings coverage.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- `getLatestExposureDateForEtf()` remains in place and is still used for the stale cutoff check. It is not replaced — the holdings date is only used for priority ordering within the eligible set.

---
## 2026-06-18 - Fix FMP weightPercentage normalisation (100x weight overstatement)

### Source
Claude (direct)

### Objective
Fix ETF holdings weights being stored at 100x their correct value for holdings below 1%.

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
- `docs/implementation-log.md`

### Summary
Root cause: FMP's `weightPercentage` field is always on a 0–100 scale (e.g. 7.89 = 7.89%, 0.93 = 0.93%). The existing `normalizeWeight()` function uses a heuristic: `value > 1 ? value / 100 : value`. For holdings below 1%, `weightPercentage` is less than 1 (e.g. 0.93 for XOM at ~0.93%), so `normalizeWeight` treated it as an already-normalised fraction and stored 0.93 (93%) instead of 0.0093 (0.93%). This caused a 100x overstatement for all holdings below 1%.

Fix: added a `normalizePercentage()` function that always divides by 100, bypassing the `> 1` heuristic. Used `normalizePercentage` specifically for the `weightPercentage` field across holdings, sector, and country exposure ingestion. The generic `normalizeWeight` heuristic is retained for other weight fields (`weight`, `percentage`, `assetPercentage`, `value`) as a fallback.

```typescript
function normalizePercentage(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value / 100;
}
```

### Manual follow-up
After deploying this fix, all 169 ETFs were re-refreshed from the admin panel to replace incorrect weight data. `sync_etf_holding_security_ids()` was re-run to restore `holding_security_id` mappings on the fresh rows (upsert resets `holding_security_id` to null on conflict). Confirmed via cross-check: NVDA weight in VOO = 7.89% (raw from FMP), stored = 0.07899, portfolio review indirect = 30.62% × 7.89% = 2.42% — matches report.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- `normalizeWeight` must not be used for FMP `weightPercentage`. The `> 1` heuristic is only valid for weight fields that may be expressed in either 0–1 or 0–100 scale depending on the provider. FMP `weightPercentage` is always 0–100.
- Sector and country exposure weights from FMP also use `weightPercentage` and are now correctly normalised.

---
## 2026-06-18 - Fix portfolio review 414 URL-too-large on issuer link fetch

### Source
Claude (direct)

### Objective
Fix HTTP 414 Request-URI Too Large error when running Portfolio Review, caused by Supabase `.in()` serialising thousands of security IDs as GET URL parameters.

### Files Changed
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`
- `docs/implementation-log.md`

### Summary
`listIssuerLinksForSecurityIds()` fetched issuer links using a single `.in("security_id", ids)` query. After Security Master backfill created 3,724 issuer links, the query passed ~3,800 UUIDs as URL parameters, exceeding Cloudflare's URL length limit and returning HTTP 414.

Fix: chunked the security ID array into batches of 150 and executed all chunks in parallel using `Promise.all`. Same pattern applied to the issuer ID lookup immediately after. Initial sequential implementation was corrected to parallel in the same session to avoid latency regression (~1.3s per sequential chunk).

```typescript
const CHUNK = 150;
const chunks = <T>(arr: T[]) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, (i + 1) * CHUNK));
const linkResults = await Promise.all(chunks(ids).map(async (chunk) => { ... }));
```

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- Supabase `.in()` uses GET requests with URL-encoded parameters. Any `.in()` query on UUIDs should be chunked if the ID list can exceed ~150 entries. The Cloudflare URL limit is ~8KB; a UUID is 36 characters, so 150 UUIDs ≈ 5.4KB including encoding.
- The chunk size of 150 was chosen conservatively. It can be increased to 200 if needed, but 150 avoids the limit with margin.

---
## 2026-06-18 - Security Master backfill and issuer sync for ETF holdings

### Source
Claude (direct — SQL editor operations)

### Objective
Map `etf_top_holdings` symbols to `securities_master` entries and create issuer links for company-level portfolio look-through rollup.

### Files Changed
- Supabase database (SQL editor operations — no migration file)
- `docs/implementation-log.md`

### Summary
After 169 ETF holdings refresh, 13,626 holding rows existed with `holding_security_id = null` (unmapped). The following operations were run in the Supabase SQL editor:

**Step 1 — Create stubs for new holding symbols:**
```sql
SELECT * FROM public.backfill_etf_holding_stubs();
```
Created 3,810 `is_internal_only` stubs in `securities_master` for holding symbols not in the selectable universe. Stubs use `identifier_quality_score = 40` and `source_priority = ["etf_holding_stub"]`.

**Step 2 — Stamp security IDs onto holding rows:**
```sql
SELECT * FROM public.sync_etf_holding_security_ids();
```
Result: 13,563 mapped, 63 unmapped, 16 ambiguous. Unmapped/ambiguous are non-material (obscure tickers, non-equity instruments).

**Step 3 — Create issuers and issuer links:**
```sql
SELECT * FROM public.sync_security_issuer_links();
```
Result: 3,724 issuers created, 3,811 links created, 87 securities reused existing issuers via normalized name matching (e.g. share-class variants).

### Result
Completed. ETF holdings mapped: 13,563 / 13,626 (99.5%). Company-level look-through rollup operational for Portfolio Review.

### Notes for Claude
- 63 unmapped and 16 ambiguous holdings remain. These are mostly obscure tickers or non-equity instruments with no FMP profile. Not material for portfolio review accuracy.
- `sync_security_issuer_links()` is idempotent — safe to re-run after any stub creation or canonical_name update.
- `backfill_etf_holding_stubs()` is also idempotent via `ON CONFLICT DO NOTHING`.

---
## 2026-06-18 - Fix portfolio lookthrough duplicate holding symbol conflict

### Source
Codex

### Objective
Fix "ON CONFLICT DO UPDATE command cannot affect row a second time" during portfolio review run. Root cause: direct positions and ETF holding stubs for the same ticker can link to separate issuer records, producing two holdingExposures entries with the same holdingSymbol. Both entries then collide in upsertPortfolioLookthroughHoldings.

### Files Changed
- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `docs/implementation-log.md`

### Summary
- Added `deduplicateHoldingsBySymbol` and `deduplicateExposuresByName` helpers.
- Applied holding deduplication before `upsertPortfolioLookthroughHoldings`.
- Applied top-holding exposure deduplication before adding `top_holding` rows to the batch passed to `upsertPortfolioLookthroughExposures`.
- Merging logic sums direct, indirect and total weights, merges source ETF weights, and prefers richer non-null identity data.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- Upstream root cause (stub issuerId not shared with universe instrument issuerId) remains a Security Master data quality gap (Medium 40 / Medium 41 in `docs/DOCUMENTATION_GAPS.md`). This fix is a defensive deduplication in the service layer.

---
## 2026-06-18 - Fix Gap Analysis quality score display fallback

### Source
Codex

### Objective
Restore the legacy `candidate.score` fallback for Gap Analysis candidate quality display when historical reports do not have `recommendationScore`.

### Files Changed
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/implementation-log.md`

### Summary
- Updated the Quality badge expression from `candidate.recommendationScore ?? 0` to `candidate.recommendationScore ?? candidate.score ?? 0`.
- Preserves Task C quality ordering while preventing legacy candidates from displaying as `Quality 0` when only `candidate.score` is available.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- No scoring, methodology, labels, backend, or data model changes.

---
## 2026-06-18 - Gap Analysis UI Redesign - instrument quality ordering and impact indicators

### Source
Codex

### Objective
Compliance improvement separating universal quality ordering from portfolio-specific impact indicators in the Gap Analysis card.

### Files Changed
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/implementation-log.md`

### Summary
- Updated the Gap Analysis card description to state that ordering is by instrument quality score only and portfolio impact indicators are factual observations.
- Sorted candidate instruments by `recommendationScore` descending instead of rendering the existing candidate order.
- Added a column indicator strip separating universal instrument-quality ordering from portfolio-specific exposure and overlap indicators.
- Replaced the old flat score-chip candidate layout with a two-column card showing Exposure impact and Holdings overlap.
- Removed relevance, diversification, overlap-penalty, diversification-type, candidate-level context, and candidate-level trade-off rows from candidate cards to reduce composite-ranking impression.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run build` - PASS
- `npm.cmd run test` - PASS (275/275)

### Result
Completed.

### Notes for Claude
- This completes the compliance improvement cycle for the Gap Analysis section (Tasks A, B, C).

---
## 2026-06-18 - Security Master internal-only and stub-collision counts in Admin QA panel

### Source
Codex

### Objective
Surface two new Security Master monitoring metrics in the Admin Data Sources QA panel: count of is_internal_only stubs (ETF holding symbols outside the selectable universe) and count of stub-collision cases where a stub symbol has been added as a universe instrument but not yet cleaned up (Medium 40, docs/DOCUMENTATION_GAPS.md).

### Files Changed
- `supabase/migrations/113_security_master_internal_only_count.sql`
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added internalOnlySecurities field to get_security_master_health_snapshot(), counting active is_internal_only stubs. This should be stable at rest, drop by 1 per instrument promoted from stub to universe, and rise after an ETF re-backfill adds new holding symbols.
- Added stubCollisionCount field, counting stubs whose canonical_symbol matches an active instrument symbol. Greater than zero means a promotion cleanup (Medium 40) was skipped and ETF holdings for that symbol are likely ambiguous.
- Surfaced both fields in the Admin Data Sources Security Master QA panel, with Stub collisions shown in amber when greater than zero.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (275/275)
- `npm.cmd run build` - PASS

### Result
Completed.
- internalOnlySecurities: 51
- stubCollisionCount: 0

### Notes for Claude
- Migration 113 was applied successfully. Stub collisions are currently zero, which is the expected clean state.

---
## 2026-06-18 - Security Master ETF Holdings Re-sync (Migration 112)

### Source
Codex

### Objective
Re-map ETF top holdings to Security Master entries after clearAllExposures() reset all mapping_status values to `unmapped`. Expand normalize_issuer_name generically to improve share-class issuer rollup beyond the four hardcoded symbols.

### Files Changed
- `supabase/migrations/112_resync_etf_holding_security_ids.sql`
- `docs/implementation-log.md`

### Summary
- Expanded normalize_issuer_name to strip capital stock, series, depositary receipt, and non-voting suffixes, improving issuer rollup for companies with these naming conventions rather than relying on hardcoded ticker lists.
- Re-ran 095 backfill logic to create is_internal_only stubs for new holding symbols that entered etf_top_holdings after the expanded 169-ETF backfill.
- Re-ran sync_etf_holding_security_ids() to restore holding_security_id and mapping_status = `mapped` across all etf_top_holdings rows.
- Re-ran sync_security_issuer_links() to create issuer links for new stubs, enabling portfolio look-through to aggregate share-class variants at the company/issuer level.

### Tests Run
- `npm.cmd run typecheck` - PASS
- `npm.cmd run lint` - PASS
- `npm.cmd run test` - PASS (275/275)
- `npm.cmd run build` - PASS

### Result
Completed.
- ETF holdings mapped: 169 / 169
- ETF holdings unmapped: 0
- Mapping gap rows: 5
- New is_internal_only stubs created: 0
- New issuer links created: 0

### Notes for Claude
- Migration number is 112 because migrations 110 and 111 already existed locally.
- normalize_issuer_name is now generic for class/series/ADR/capital-stock/non-voting patterns. If FMP introduces new name suffixes in future, extend this function rather than adding hardcoded ticker lists.
- sync_security_issuer_links() can be re-run at any time; it is idempotent. Run it after any bulk stub creation or canonical_name update.

---
## 2026-06-18 - ETF Look-through Operational Fixes and Coverage Completion

### Source
Claude (direct)

### Objective
Fix three operational bugs discovered during ETF look-through backfill and close the remaining coverage gap to 169/169 across all exposure types.

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts` — deduplicate holdings by symbol before sort/slice (ON CONFLICT fix)
- `src/application/services/etfLookthrough/EtfLookthroughRefreshService.ts` — collect all eligible ETFs before slicing, sort nulls-first then oldest-date-first so refreshes always progress rather than repeating the same first-50 alphabetically
- `src/app/(dashboard)/admin/data-sources/page.tsx` — add `force=true` hidden input to ETF refresh form; add "Clear ETF exposure data" destructive button
- `src/application/ports/repositories/EtfExposureRepository.ts` — add `clearAllExposures(): Promise<void>` to interface
- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts` — implement `clearAllExposures()` (deletes all 4 ETF exposure tables); fix PostgREST 1000-row cap in all four `listLatest*` methods by replacing single `limit(5000)` queries with paginated `fetchAllExposureRows` helper using `.range()`
- `src/server/actions/portfolioReviewActions.ts` — add `clearEtfLookthroughExposureAction` server action
- `src/infrastructure/providers/etf/seededEtfSectorFallback.ts` — new file: seeded single-sector fallback for IYW, VCR, JXI, VOX, PXE
- `docs/implementation-log.md`

### Summary
- **ON CONFLICT fix:** FMP returns duplicate `holdingSymbol` entries for the same ETF in some cases. Deduplicated via Map (keep highest weight) before sort/slice to prevent upsert conflict errors.
- **Refresh ordering fix:** With `force=true`, the old early-break loop always selected the first 50 alphabetically on every pass. Changed to collect all eligible, sort by `latest` date ascending (nulls first), then slice — each pass now processes the 50 ETFs furthest from coverage.
- **Force=true button fix:** The ETF refresh admin button was missing the `force` hidden input, so it defaulted to false and skipped already-covered ETFs.
- **Clear ETF exposure data button:** New destructive admin button triggers `clearAllExposures()` across all 4 ETF exposure tables for a clean backfill reset without affecting the refresh button's incremental behaviour.
- **PostgREST 1000-row cap fix:** `etf_sector_exposures` grew to 1,253 rows. PostgREST's `db-max-rows` cap silently truncated `listLatestSectorExposures` to 1,000 rows, causing 33 ETFs to appear as "missing sector" in the coverage UI despite having data in the DB. Same bug class as `f447bde`. Fixed by paginating all four `listLatest*` methods using `.range()` in a loop until all rows are returned.
- **Seeded sector fallback:** Direct FMP testing confirmed IYW, VCR, JXI, VOX, and PXE return `[]` from `/etf/sector-weightings` — a data gap in FMP's database (all five do have country and holdings data). All five are pure-play single-sector ETFs; added a seeded 100% weight fallback matching their known sector. Coverage reached 169/169 after backfill.

### Tests Run
- `npm run typecheck` - PASS
- `npm test` - PASS (275/275)

### Result
Completed. ETF look-through coverage: 169/169 sector, 169/169 country, 169/169 top holdings.

### Notes for Claude
- The five seeded-sector ETFs (IYW=Technology, VCR=Consumer Discretionary, JXI=Utilities, VOX=Communication Services, PXE=Energy) should be re-tested against FMP periodically. If FMP adds sector data for them in future, the seeded fallback is bypassed automatically (live data takes priority when `sectorPayload.length > 0`).
- The PostgREST row-cap pattern may affect other large tables as the universe grows. Any `listLatest*` or bulk-read query using `limit(N)` should be audited once row counts approach 1,000.

---
## 2026-06-18 - ETF Holdings Integration into Portfolio Review Gap Analysis

### Source
Codex

### Objective
Use cached ETF top-holding data in Portfolio Review gap analysis so candidate overlap reflects real company-level ETF look-through holdings.

### Files Changed
- `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`
- `src/application/services/portfolioReview/portfolioReviewScoring.ts`
- `src/application/services/portfolioReview/PortfolioReviewService.ts`
- `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
- `src/application/services/portfolioReview/DiversificationBenefitService.ts`
- `src/domain/portfolioReview/types.ts`
- `src/server/container.ts`
- `tests/portfolio-review.test.ts`
- `docs/implementation-log.md`

### Summary
- Capped FMP ETF top holdings, including seeded fallback holdings, to the top 100 by weight.
- Added `etfTopHoldings` to the Portfolio Review input context and fetched latest ETF top holdings for all active instruments.
- Added candidate metadata for shared company count, shared company weight, and top shared symbols.
- Gap-analysis candidates now compute candidate ETF company overlap against the portfolio look-through holding symbols.
- Diversification benefit scoring now adds overlap penalties when candidate ETF top-company overlap is 15%+ or 35%+.
- Added a regression test for ETF top-company overlap metadata and warning text.
- No Portfolio Review UI, scoring weights, recommendation labels, telemetry, migrations, jobs, or compliance wording changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.
- `npm.cmd run test` - PASS (275/275).

### Result
Completed.

### Notes for Claude
- After deployment, run `POST /api/jobs/etf-lookthrough-refresh?force=true` from Admin > Jobs until job logs show `etfsRefreshed = 0`; expect 3-5 passes for the full universe.
- Then run `POST /api/jobs/portfolio-review-run` from Admin > Jobs to regenerate the stored report with real company overlap data.
- Until ETF top-holding backfill is complete, `etfTopHoldings` is an empty array and `companyOverlapWeight` is 0, so behavior is identical to the current state.

---
## 2026-06-18 - Phase 2C: Methodology page and SCORE_METHODOLOGY.md weight update

### Source
Codex

### Objective
Update the public methodology page and score methodology document to reflect Phase 2 stock Characteristics Score weights, Business Quality composition, and stock guardrails.

### Files Changed
- `docs/SCORE_METHODOLOGY.md`
- `src/app/methodology/page.tsx`
- `docs/implementation-log.md`

### Summary
- Updated stock Characteristics Score weights to Business Quality 40%, Valuation 20%, Fundamental Trends 15%, Risk Analytics 10%, Market Vision alignment 7%, Theme alignment 5%, and Momentum 3%.
- Added Business Quality composition: Growth 25%, Profitability 25%, Cash Flow 20%, Balance Sheet 15%, and Quality 15%, with Valuation intentionally excluded.
- Updated stock Market Vision component wording from 10% to 7%.
- Updated stock guardrail wording to Phase 2 behavior: Business Quality below 35 caps at Weak, and Valuation below 15 caps at Neutral.
- Left ETF, Bond ETF, Gold ETF, Crypto weights, Overall Fundamental Score sub-weights, and assessment range thresholds unchanged.
- `METHODOLOGY_LAST_UPDATED` was already `2026-06-18` and was not changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.
- `npm.cmd run test` - PASS (274/274).

### Result
Completed.

### Notes for Claude
- This is documentation/UI methodology catch-up only. No scoring service code, feature flags, or database schema were changed.

---
## 2026-06-18 - Fix fundamentals statement counts RPC

### Source
Codex

### Objective
Fix Admin fundamentals coverage counts by replacing the raw `financial_statements` row scan with an aggregate RPC that is not affected by PostgREST row limits.

### Files Changed
- `supabase/migrations/111_fix_statement_counts_rpc.sql`
- `src/infrastructure/repositories/supabase/SupabaseFundamentalsRepository.ts`
- `docs/implementation-log.md`

### Summary
- Added `get_statement_counts(p_instrument_ids uuid[])` SQL function returning one count row per instrument.
- Updated `listStatementCounts()` to call the RPC instead of selecting every `financial_statements.instrument_id` row and counting in JavaScript.
- Root cause: PostgREST `db-max-rows` silently truncated the raw row scan, so later instruments could appear to have zero statements in Admin Data Sources despite complete data.
- Applied the migration to Supabase and verified the RPC returns 105 instruments with statement counts.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (274/274).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- RPC with `GROUP BY` returns at most one row per requested instrument, so it avoids the statement-table row cap that caused 20 complete / 85 incomplete in Vercel.

---
## 2026-06-18 - Force Admin Data Sources live rendering

### Source
Codex

### Objective
Prevent the Admin Data Sources page from serving stale fundamentals coverage counts on Vercel.

### Files Changed
- `src/app/(dashboard)/admin/data-sources/page.tsx`
- `docs/implementation-log.md`

### Summary
- Verified live Supabase fundamentals coverage is complete: 105 eligible, 105 complete, 0 incomplete, 0 stale.
- Added explicit `dynamic = "force-dynamic"` and `revalidate = 0` route settings to `/admin/data-sources`.
- This ensures operational diagnostics, including fundamentals coverage, are rendered from live server data instead of any cached deployment snapshot.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Vercel was still displaying 20 complete / 85 incomplete even though source tables showed full coverage. This change targets route-level caching rather than fundamentals data.

---
## 2026-06-18 - Financial sector BQ scoring fix

### Source
Codex

### Objective
Correct financial-sector fundamentals scoring so bank and financial company Business Quality is assessed with sector-appropriate profitability, balance sheet, and cash-flow treatment.

### Problem
Financial-sector stocks were being scored using industrial-company balance sheet and cash-flow assumptions. This could penalize banks for structurally high debt/equity and could include free-cash-flow metrics that are not directly comparable to operating companies.

### Fix
- Added financial-sector detection based on profile sector and industry text.
- Excluded gross margin from financial-sector profitability scoring.
- Applied financial-sector ROA profitability thresholds.
- Excluded cash flow score for financial-sector instruments.
- Replaced industrial leverage/liquidity balance sheet inputs with ROE, ROA, and price/book capital-quality proxies.
- Left recommendation scoring, valuation adjustment logic, weights, schema, and user-facing copy unchanged.

### Files Changed
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `tests/fundamentals.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/implementation-log.md`

### Summary
- Financial-sector instruments now avoid industrial debt/equity and net debt/EBITDA penalties in balance sheet scoring.
- Financial-sector `cashFlowScore` is now `null`, allowing quality averages to exclude that non-comparable component.
- Methodology documentation now explains the financial-sector scoring treatment and why CET1 is not included.
- Added tests covering financial-sector detection, non-financial exclusion, and high-leverage bank scoring behavior.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (275/275).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Post-deploy, rerun fundamentals refresh for JPM, BAC, GS, MA, V, and any other financial-sector instruments so stored `fundamental_scores` reflect the corrected methodology.
- Correction: isFinancialSector() tightened to match on profile.industry only using "banks" and "capital markets". Previous implementation incorrectly matched Credit Services (MA, V, PYPL) and Asset Management (BLK) via sector-level keyword matching.
- No recommendation labels, scoring weights, valuation logic, database schema, or user-facing compliance copy were changed.

---
## 2026-06-18 - Characteristics label threshold calibration and valuation label wording

### Source
Codex

### Objective
Recalibrate Characteristics label thresholds from 85/70/50/35/20 to 80/65/48/35/20 to better reflect the Phase 2 score distribution. Replace valuation labels "Stretched" with "Premium" and "Expensive" with "Elevated" for institutional-grade UX wording. No scoring weights, guardrail thresholds, or database schema changes.

### Files Changed
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/app/(dashboard)/recommendations/page.tsx`
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `docs/SCORE_METHODOLOGY.md`
- `tests/recommendations.test.ts`
- `docs/implementation-log.md`

### Summary
- `labelFromScore()` updated: 85 -> 80 (Excellent), 70 -> 65 (Good), 50 -> 48 (Neutral). Weak (35), Poor (20), Significant Concerns (<20) unchanged.
- `valuationLabel()` updated: "Stretched" -> "Premium", "Expensive" -> "Elevated". "Fair" and "Attractive" unchanged.
- `assessmentRows` in the public methodology page updated to 80-100, 65-79, 48-64, 35-47, 20-34.
- `SCORE_METHODOLOGY.md` threshold table updated to match the calibrated label bands.
- Six boundary assertions added to the existing recommendation threshold test.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (272/272).
- `npm.cmd run build` - PASS.
- Manual compiled boundary check - PASS: 80 -> Strong Buy, 79 -> Buy, 65 -> Buy, 64 -> Hold, 48 -> Hold, 47 -> Watch.

### Result
Completed.

### Notes for Claude
- Historical stored `recommendationLabel` values update only on the next insights run. Run insights manually after deployment to see new labels live.
- Portfolio Review Insight Alignment scores will increase for portfolios holding AAPL, COST, MA and similar stocks that move from Watch to Hold. This is expected.
- Phase 2C (methodology page stock weight table update from Phase 1 to Phase 2 weights) is still pending and was not touched in this task.
- The test count remains 272 because the six new boundary checks were added as assertions inside the existing threshold test, not as separate test cases.

---
## 2026-06-17 - Phase 2B: Business Quality and Valuation labels on Insights page

### Source
Codex

### Objective
Surface Business Quality and Valuation assessment labels as colour-coded chips in the Insights page table for stock instruments. ETF, Bond ETF, Gold ETF, and Crypto rows show a dash. One numeric score (Characteristics Score) is shown per row. Column renames: Assessment -> Characteristics, Characteristics score -> Characteristics Score, Characteristics (drivers text) -> Signals.

### Files Changed
- `src/app/(dashboard)/recommendations/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added render-only helpers to derive Business Quality and Valuation chip labels from `scoringBreakdown`.
- Stock rows use `row.instrumentType === "Stock"` and show colour-coded Business Quality and Valuation chips when scores are available.
- Non-stock rows show `-` in the Business Quality and Valuation columns.
- Renamed the table headers to Characteristics, Characteristics Score, and Signals while preserving the existing overall assessment, numeric score, confidence, risk, signal text, and guardrail rendering logic.
- No backend, service, scoring, database, or type files were changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (272/272).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Business Quality and Valuation chips are derived from `scoringBreakdown` at render time; no new stored fields or backend changes.
- Stock detection uses `row.instrumentType === "Stock"`.
- Phase 2C (`SCORE_METHODOLOGY.md` and methodology page update) is still pending.
- Browser verification of `/recommendations` was attempted but blocked by the in-app browser automation permission error (`CreateProcessAsUserW failed: 5`). Build output confirms `/recommendations` compiles successfully.

---
## 2026-06-17 - Phase 2A stock scoring: Business Quality and Valuation separation

### Source
Codex

### Objective
Eliminate double-counting of valuation in stock Characteristics Score by introducing a separate Business Quality Score that excludes valuation. Feature-flagged behind `ENABLE_STOCK_PHASE2_SCORES`. Phase 1 behavior is unchanged when the flag is off.

### Files Changed
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/StockRecommendationService.ts`
- `src/application/services/recommendations/RecommendationRulesService.ts`
- `tests/recommendations.test.ts`
- `.env.example`
- `docs/implementation-log.md`

### Summary
- Added `scoreBusinessQuality()` using growth 25%, profitability 25%, cash flow 20%, balance sheet 15%, and quality 15%; valuation is excluded and missing sub-scores are excluded from the denominator.
- Added the `ENABLE_STOCK_PHASE2_SCORES` flag. When absent or not `true`, the stock scorer keeps the Phase 1 component weights and valuation guardrail behavior.
- Added Phase 2 stock component weights: Business Quality 40%, Valuation 20%, Fundamental Trends 15%, Risk Analytics 10%, Market Vision Alignment 7%, Theme Alignment 5%, Momentum 3%.
- Added optional `businessQualityScore` passthrough to guardrails and scoring breakdown so telemetry can compare Phase 1 and Phase 2 behavior.
- Added Phase 2-only guardrail behavior: weak business quality can cap at Watch, valuation below 15 caps at Hold, and valuation between 15 and 25 no longer triggers the old valuation cap when business quality is intact.
- Documented the feature flag in `.env.example`.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (272/272).
- `npm.cmd run build` - PASS.
- Manual compiled stock scorer check - PASS: with `ENABLE_STOCK_PHASE2_SCORES=true`, the component breakdown uses `business_quality` and omits `fundamentals`; a high-quality expensive stock fixture produced a higher Phase 2 overall score than Phase 1 in tests.

### Result
Completed.

### Notes for Claude
- Phase 2B (UI display of Business Quality and Valuation as separate score cards) is a separate task and was not implemented here.
- SCORE_METHODOLOGY.md and methodology page Phase 2C updates are a separate task and were not changed here.
- Valuation guardrail is softened under Phase 2: below 15 caps at Hold only; between 15 and 25 no longer triggers a cap when Business Quality is intact.
- `businessQualityScore` is stored in `scoringBreakdown` for telemetry comparison regardless of flag state.
- 2026-06-17 Claude fix: `confidenceScore()` `strategicAgreementBonus` updated to recognise `"business_quality"` key alongside `"fundamentals"` so Phase 2 stocks with high Business Quality and Market Vision alignment correctly receive the +5 confidence bonus. Tests: 272/272.

---
## 2026-06-17 - Update methodology page for universal Characteristics Score model

### Source
Codex

### Objective
Remove portfolio-dependent component rows and update instrument weight tables and guardrail rows on the static methodology page to match the universal scoring model introduced in the same-day scoring update.

### Files Changed
- `src/app/methodology/page.tsx`
- `src/app/methodology/constants.ts`
- `docs/implementation-log.md`

### Summary
- Removed portfolio fit/allocation fit, ETF diversification benefit, and crypto portfolio concentration rows from component calculation details.
- Updated stock, ETF, bond ETF, gold ETF, and crypto Characteristics Score weight tables to the universal scoring weights.
- Removed portfolio concentration, duplicate exposure, and crypto allocation guardrail rows from the public methodology page.
- Updated `METHODOLOGY_LAST_UPDATED` to `2026-06-17`.
- Updated the Market Vision weight sentence to match the current instrument-type weights.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS (`/methodology` generated as a static route).

### Result
Completed.

---
## 2026-06-17 - Remove Portfolio-Dependent Recommendation Scoring Components

### Source
Claude Code

### Objective
Remove portfolio-dependent score components from the stored recommendation scoring pipeline so instrument Characteristics Scores are universal and based on instrument, macro, Market Vision, fundamentals, risk, market, theme, and bond-profile inputs only.

### Files Changed
- `src/application/services/recommendations/recommendationScoring.ts`
- `src/application/services/recommendations/RecommendationService.ts`
- `src/application/services/recommendations/StockRecommendationService.ts`
- `src/application/services/recommendations/EtfRecommendationService.ts`
- `src/application/services/recommendations/BondEtfRecommendationService.ts`
- `src/application/services/recommendations/GoldRecommendationService.ts`
- `src/application/services/recommendations/CryptoRecommendationService.ts`
- `tests/recommendations.test.ts`
- `docs/SCORE_METHODOLOGY.md`
- `docs/RECOMMENDATION_INSIGHTS_METHODOLOGY.md`
- `docs/implementation-log.md`

### Summary
- Removed `portfolioFit` from `RecommendationInput`, `buildEvaluation()`, stored input snapshots, data limitations, positive/negative drivers, and change triggers.
- Removed portfolio-dashboard and portfolio-review lookups from recommendation runs while preserving telemetry `portfolioId` capture.
- Reweighted stock, ETF, bond ETF, gold, and crypto scorer components to use only universal instrument and market/macro signals.
- Removed ETF allocation/diversification, stock portfolio fit, bond diversification, gold diversification/portfolio fit, and crypto portfolio concentration components.
- Left `portfolioFitService.ts` unchanged as a standalone diagnostic service and kept `RecommendationRulesService.applyGuardrails()` signature unchanged.
- Updated recommendation methodology docs to state that stored instrument Characteristics Scores no longer use portfolio fit, allocation fit, duplicate exposure, or portfolio concentration.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.
- Manual compiled scorer check - PASS: stock, ETF, bond ETF, gold, and crypto all returned non-null `overallScore` with `macroRegime: null` and `marketVisionReport: null` when other instrument data was present.

### Result
Completed.

### Notes for Claude
- `portfolioFitService.ts` remains on disk unchanged and is still covered by its direct test.
- `RecommendationRulesService.applyGuardrails()` still accepts optional concentration and duplicate-exposure inputs for backward compatibility, but `buildEvaluation()` no longer passes those portfolio-dependent fields.
- Existing stored recommendation rows will retain historical snapshots until the next recommendation run rewrites current instrument scores under the universal weighting.
- With macro and Market Vision missing, some services can still produce a numeric `overallScore` but may receive `Insufficient Data` labels because confidence is reduced by unavailable components.

---
## 2026-06-17 - Cache MacroContextSection FRED data on market-vision page

### Source
Claude Code

### Objective
Cache the `getDashboardSummary()` call that was the last uncached DB hit on the market-vision page (~700–760ms on every warm request).

### Files Changed
- `src/app/(dashboard)/market-vision/page.tsx`

### Summary
- Added a module-level `getCachedMacroDashboardSummary` wrapper using `unstable_cache` around `macroDashboardService.getDashboardSummary()`.
- Tagged with `macro-data` so the `fred-macro-ingestion` job invalidates it on success via its `onSuccess` callback.
- `revalidate: 86400` safety TTL matches other shared-data pages.
- `MacroContextSection` now receives the pre-fetched cached summary instead of issuing a live DB call on each render.

### Tests Run
- `npm.cmd run lint` — PASS.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run test` — PASS (268/268).
- `npm.cmd run build` — PASS.

### Result
Completed. Market-vision macro-context-data warm timing: 700–760ms → ~12ms.

---
## 2026-06-17 - Shared-data page caching with tag-based invalidation

### Source
Claude Code

### Objective
Add `unstable_cache` wrappers for shared non-personalized data pages and invalidate those cache tags after successful scheduled data refresh jobs.

### Files Changed
- `src/server/jobs/runCronJob.ts`
- `src/app/api/jobs/instrument-price-refresh/route.ts`
- `src/app/api/jobs/instrument-daily-returns-refresh/route.ts`
- `src/app/api/jobs/instrument-return-anchors-refresh/route.ts`
- `src/app/api/jobs/instrument-market-metrics-refresh/route.ts`
- `src/app/api/jobs/instrument-risk-refresh/route.ts`
- `src/app/api/jobs/instrument-metadata-refresh/route.ts`
- `src/app/api/jobs/benchmark-refresh/route.ts`
- `src/app/api/jobs/etf-lookthrough-refresh/route.ts`
- `src/app/api/jobs/fred-macro-ingestion/route.ts`
- `src/app/api/jobs/daily-news-ingestion/route.ts`
- `src/app/api/jobs/newsdata-news-ingestion/route.ts`
- `src/app/api/jobs/weekly-news-reconciliation/route.ts`
- `src/app/api/jobs/weekly-market-vision/route.ts`
- `src/app/api/jobs/fundamentals-refresh/route.ts`
- `src/app/api/admin/revalidate/route.ts`
- `src/app/(dashboard)/macro/page.tsx`
- `src/app/(dashboard)/fundamentals/page.tsx`
- `src/app/(dashboard)/instruments/universe/page.tsx`
- `src/app/(dashboard)/news/page.tsx`
- `src/app/(dashboard)/market-vision/page.tsx`
- `docs/implementation-log.md`

### Summary
- Added optional `onSuccess` support to `runCronJob`, invoked only after `success` or `partial_success` job logging and isolated from the HTTP response if invalidation fails.
- Wired `revalidateTag` into 14 scheduled job endpoints while preserving existing job names, query parameters, lock TTLs, and job bodies.
- Added module-level `unstable_cache` fetchers for shared default views on `/macro`, `/fundamentals`, `/instruments/universe`, `/news`, and `/market-vision`.
- Cached News theme intelligence and Market Vision macro/world-news support data with `news-data` tag invalidation.
- Added `POST /api/admin/revalidate` protected by `x-admin-secret` and `ADMIN_SECRET` for manual cache flushes across market, macro, news, Market Vision, and fundamentals tags.
- Preserved auth checks outside cache boundaries and did not cache personalized portfolio, risk, bonds, recommendations, portfolio-review, telemetry, assistant, holdings, transactions, or watchlist pages.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Universe caching applies only to the default active/no-search view. Text search, inactive status, and all-status views bypass cache to preserve existing filter behavior.
- Cache safety revalidate is 24 hours for daily shared pages and 7 days for the default Market Vision dashboard; job-driven tag invalidation is expected to refresh data earlier.
- No compliance wording, scoring, methodology, feature flags, PRODUCT_MODE logic, or personalized page data paths were changed.

---
## 2026-06-17 - Page Rendering Query Path Optimization

### Source
Claude Code

### Objective
Reduce unnecessary query work on instrument detail symbol lookup and Market Vision macro/world-news input.

### Files Changed
- `src/application/ports/repositories/UniverseRepository.ts`
- `src/application/services/InstrumentService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `src/app/(dashboard)/instruments/[symbol]/page.tsx`
- `src/app/(dashboard)/market-vision/page.tsx`
- `supabase/migrations/110_optimize_route_queries.sql`
- `docs/implementation-log.md`

### Summary
- Added `getBySymbol(symbol)` to the universe repository contract and exposed it through `InstrumentService`.
- Implemented direct active-symbol lookup in `SupabaseUniverseRepository` using the existing instrument mapper.
- Updated `/instruments/[symbol]` to call `getBySymbol(decodedSymbol)` instead of running a text-search list query and filtering in JavaScript.
- Reduced `/market-vision` NewsData classification fetch limit from 12 to 8 while preserving the existing filtering and display behavior.
- Confirmed `listNewsWithClassifications({ includeDuplicates: false })` already applies `is_duplicate = false` in SQL.
- Added `idx_news_items_provider_published` on `news_items (source_provider, published_at desc)` to support provider-filtered latest-news reads.
- No product logic, UI copy, compliance wording, calculation methodology, feature flags, or data model tables were changed.

### Tests Run
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run build` - PASS.
- `npm.cmd run test` - PASS (268/268).

### Result
Completed.

### Notes for Claude
- Expected timing improvement: `/instruments/[symbol]` removes the broad text-search/list-plus-filter lookup; `/market-vision` transfers fewer NewsData rows and gains a composite provider/date index for the latest-news access pattern.
- `docs/chatgpt-handover.md` was listed in AGENTS.md but is not present in this worktree; `docs/ARCHITECTURE_OVERVIEW.md` and task-specific files were read instead.

---
## 2026-06-17 - Page Data Map Documentation

### Source
Claude Code

### Objective
Create `docs/PAGE_DATA_MAP.md` covering all 25 product routes.

### Files Changed
- `docs/PAGE_DATA_MAP.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Added a canonical page data map covering Portfolio, Instruments, Research, Admin, Public, and Legacy route groups.
- Documented alpha visibility, UI sections, route files/actions, services, repositories, tables/views, refresh jobs, cache/summary layers, and performance notes for each primary product route.
- Closed `docs/DOCUMENTATION_GAPS.md` items 13-23 with 2026-06-17 closure notes pointing to `docs/PAGE_DATA_MAP.md`.
- No TypeScript, SQL, migration, methodology, or QA-log changes were made for this documentation-only task.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- `docs/PAGE_DATA_MAP.md` contains explicit `* - inferred from architecture docs` markers where direct page-to-service-to-repository inspection did not prove the full data chain.
- Legacy redirect routes `/universe`, `/watchlists`, and `/taxonomy` are noted but not mapped as primary entries.

---
## 2026-06-17 - Full Pre-Commercial RLS Hardening

### Source
Claude Code

### Objective
Replace broad-authenticated-read policies on assistant and telemetry tables with user-scoped SELECT policies before multi-user alpha invites.

### Files Changed
- `supabase/migrations/109_rls_hardening.sql`
- `src/server/jobs/cronAuth.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`

### Summary
- Added and applied migration `109_rls_hardening.sql`.
- Replaced broad `auth.role() = 'authenticated'` read policies for three assistant tables and four telemetry tables.
- Assistant conversations and usage logs are scoped through direct `user_id`; assistant messages are scoped through parent conversation ownership.
- Telemetry snapshots are scoped through authenticated user's portfolio ownership; telemetry outcomes are scoped through parent snapshot portfolio ownership.
- Live `pg_policies` verification returned exactly 7 targeted rows, all with `users can read own ...` policy names.
- No user-facing content, scoring, methodology, feature flags, or advisory language changed.
- Fixed `src/server/jobs/cronAuth.ts` to use an equivalent relative import for `isCronSecretValid`; this was needed because the existing compiled Node test runner cannot resolve the `@/` alias at runtime.

### Tests Run
- Applied migration with `psql` - PASS.
- `pg_policies` verification query - PASS (7/7 targeted policies updated).
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- `instrument_directory_summary` was not changed; it remains documented as a closed orphaned experimental table with no policy needed.
- Service-role application writes and scheduled jobs continue to bypass RLS; this migration hardens direct authenticated PostgREST reads only.

---
## 2026-06-17 - CRON_SECRET Header-Only Authentication

### Source
Claude Code

### Objective
Remove the `?secret=` query-parameter path from cron authentication and require `Authorization: Bearer <CRON_SECRET>` header only.

### Files Changed
- `src/server/jobs/cronAuth.ts`
- `tests/cronAuth.test.ts`
- `package.json`
- `docs/JOBS_AND_OPERATIONS.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/qa-log.md`
- `docs/implementation-log.md`

### Summary
- Removed `request.nextUrl.searchParams.get("secret")` from `assertCronAuthorized`.
- Cron authorization now validates only the `Authorization: Bearer` header value.
- Added unit coverage for valid Bearer auth, invalid Bearer auth, missing Authorization header, query-param-only rejection, and missing configured `CRON_SECRET`.
- Added the new cron auth test to the explicit `npm run test` command.
- Documented bearer-only cron authentication and closed the CRON_SECRET query-param documentation gap.
- No database migration was required because Supabase Cron and manual fallback scripts already send the Bearer header.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (268/268).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- `package.json` was updated because the project test script enumerates compiled test files explicitly; without that change, the new `tests/cronAuth.test.ts` would compile but not run under `npm run test`.
- Build route list was unchanged apart from prior tasks; all existing `/api/jobs/*` routes still build, and no `/api/jobs/price-refresh` route reappeared.

---
## 2026-06-17 - Add GitHub Actions CI Workflow

### Source
Codex

### Objective
Add a GitHub Actions CI workflow for pull requests and pushes targeting `development` and `main`.

### Files Changed
- `.github/workflows/ci.yml` (new)
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Added CI workflow triggered by `pull_request` and `push` events for `development` and `main`.
- Workflow installs dependencies with `npm ci` and runs lint, typecheck, test, and build.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are sourced from GitHub secrets.
- Server-only runtime values use CI placeholder values where real credentials are not needed.
- No source files, package scripts, existing workflows, scoring, methodology, or user-facing wording changed.

### Tests Run
- Workflow YAML created and inspected for valid structure.
- PowerShell workflow structure check - PASS.
- `git diff --check` - PASS.
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (263/263).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Branch protection rules must be enabled in GitHub repository settings to enforce the status check as a merge gate.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be added as repository secrets before the build step will pass.

---
## 2026-06-17 - Remove Orphaned price-refresh HTTP Route

### Source
Codex

### Objective
Remove the orphaned `/api/jobs/price-refresh` HTTP route while preserving the live `instrument-price-refresh` route and user-triggered portfolio price refresh job wiring.

### Files Changed
- `src/app/api/jobs/price-refresh/route.ts` (deleted)
- `docs/DOCUMENTATION_GAPS.md`
- `docs/implementation-log.md`

### Summary
- Deleted the orphaned `/api/jobs/price-refresh` route.
- Preserved `RefreshPortfolioPricesJob`, `jobs.refreshPortfolioPrices` container wiring, `dataRefreshActions.ts`, `portfolioActions.ts`, and `/api/jobs/instrument-price-refresh`.
- Closed the DOCUMENTATION_GAPS.md High Priority item 3 price-refresh route reconciliation entry.
- Direct local SQL rerun was unavailable because this sandbox has no `psql`, Supabase CLI, or Postgres driver installed. Cron cleanliness is based on the existing live database confirmation in `docs/ARCHITECTURE_AUDIT_2026-06-16.md`, which records 31 active `cron.job` rows and confirms `price-refresh` is absent from `cron.job`.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS after removing stale generated `.next/types/app/api/jobs/price-refresh` route type folder.
- `npm.cmd run test` - PASS (263/263).
- `npm.cmd run build` - PASS. Build route list no longer includes `/api/jobs/price-refresh`.

### Result
Completed.

### Notes for Claude
- If a live Supabase SQL console is available, re-run: `SELECT jobname, command FROM cron.job WHERE command LIKE '%price-refresh%';` Expected result should include only `instrument-price-refresh` rows and no `/api/jobs/price-refresh` row.

---
## 2026-06-16 - Middleware Alpha Mode Asset Blocking Fix (QA Residuals)

### Source
Claude Code (QA session)

### Objective
Fix three middleware bugs discovered during Task 3 + Task 10 browser QA: alpha mode was blocking `/_next/image` requests and Vercel's internal image optimizer fetch of public source images.

### Files Changed
- `src/middleware.ts`
- `src/config/productMode.ts`
- `docs/implementation-log.md`
- `docs/qa-log.md`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`

### Summary
- Added `isAssetRequest` guard in `src/middleware.ts` to skip the alpha mode check for any request starting with `/_next` or matching a file extension. Vercel's image optimization service makes a server-side HTTP fetch of the source image (`/brand/etfvision-light-lockup.png`) which went through the middleware and was blocked by the alpha mode check — the browser-level `_next/image` exclusion is not sufficient because of this internal fetch.
- Added `"/_next"` and `"/brand"` to `alphaAllowedPrefixes` in `src/config/productMode.ts` as belt-and-suspenders coverage.
- Three commits: `9e7de98`, `bb9ea0b`, `743cf20`.

### Tests Run
- Manual browser QA confirmed logo loads correctly in alpha mode after `743cf20`.

### Result
Completed. Logo loads in both alpha and full mode.

### Notes for Claude
- Vercel's image optimizer fetches source images via HTTP from the same origin. Public asset paths (`/brand/`) must be in `alphaAllowedPrefixes` or excluded by `isAssetRequest`.
- The `config.matcher` pattern did not reliably exclude `_next/image` in Next.js 15 on Vercel. The runtime `isAssetRequest` guard in the middleware function body is the reliable exclusion path.

---
## 2026-06-16 - Runtime Product Mode

### Source
Claude Code

### Objective
Implement a server-only runtime product-mode module that gates alpha versus full product surface without using a client-exposed release variable.

### Files Changed
- `.env.example`
- `package.json`
- `src/config/productMode.ts`
- `src/middleware.ts`
- `src/components/layout/app-shell.tsx`
- `src/app/(dashboard)/market-vision/page.tsx`
- `tests/product-mode.test.ts`
- `docs/DOCUMENTATION_GAPS.md`
- `docs/SECURITY_AND_ACCESS_ARCHITECTURE.md`
- `docs/implementation-log.md`
- `docs/qa-log.md`

### Summary
- Added `PRODUCT_MODE=alpha|full` runtime module in `src/config/productMode.ts`, defaulting unset or unrecognized values to `alpha`.
- Added alpha-mode middleware route blocking for non-API paths, redirecting disabled routes to `/portfolio?feature=alpha-disabled`.
- Hid News & Themes, Macro, Assistant, Telemetry, and the entire Admin nav group in alpha mode.
- Suppressed `PortfolioAssistantDrawer` in alpha mode.
- Restricted Market Vision in alpha mode to published reports and hid report editorial actions and draft editing.
- Updated `.env.example` with server-only `PRODUCT_MODE=full` local-development guidance.
- Added product-mode unit tests for mode derivation and alpha/full route decisions.
- Updated security, documentation gaps, and QA documentation.

### Tests Run
- `npm.cmd run lint` - PASS.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd run test` - PASS (263/263).
- `npm.cmd run build` - PASS.

### Result
Completed.

### Notes for Claude
- Manual browser QA is still needed in Vercel to confirm alpha vs full navigation, route blocking, Portfolio Assistant drawer suppression, and Market Vision published-only/editorial-hidden behavior.
- Stale security-doc sentence updated to reflect implemented product-mode gating.

---
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
