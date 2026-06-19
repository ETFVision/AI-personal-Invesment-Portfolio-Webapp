# Portfolio Review Methodology

Last updated: 2026-06-19

## Purpose

Portfolio Review is a deterministic portfolio-level diagnostic engine. It does not execute trades. It generates observations, section scores, gap findings, and explanatory diagnostics. User-facing wording should avoid action-oriented framing and should not imply personalised investment advice.

## Main Code Paths

- Orchestration: `src/application/services/portfolioReview/PortfolioReviewService.ts`
- Run service: `src/application/services/portfolioReview/PortfolioReviewRunService.ts`
- Scoring helpers: `src/application/services/portfolioReview/portfolioReviewScoring.ts`
- Gap and diversification diagnostics: `PortfolioImprovementSuggestionService.ts`, `PortfolioActionSuggestionService.ts`, `DiversificationBenefitService.ts`
- Reports: `portfolio_review_runs`, `portfolio_review_reports`

## Section Weights

Current weights from `portfolioReviewScoring.ts`:

| Component | Weight |
|---|---:|
| Allocation | 15% |
| Concentration | 15% |
| Diversification | 15% |
| Risk | 15% |
| Macro fit | 15% |
| Insight alignment | 10% |
| Fixed income | 10% |
| Theme exposure | 5% |
| Geography | 0% |

The overall score is a weighted average of available section scores and is clamped from 0 to 100.

Formula-level section score calculations are documented in [Score Methodology](SCORE_METHODOLOGY.md).

## Review Sections

Portfolio Review includes:

- Allocation review.
- Concentration review.
- Diversification review.
- Portfolio risk review.
- Macro fit review.
- Insight alignment review.
- Fixed income review.
- Theme exposure review.
- Geography review.
- Gap analysis findings.
- Analytical gap summary.

Insight alignment uses `60 + constructiveHeldCount * 4 - weakHeldCount * 8 + coverage * 12`, capped at 94 when the section has any incomplete-coverage or weak-holding finding. Recommendation coverage is a 0-1 fraction and should be displayed as a percentage.

## Exposure Inputs

Portfolio sector/geography/theme exposure should prefer ETF look-through data where available. ETF product category is not a portfolio sector allocation source.

## Security Master And Issuer Rollup Methodology

Portfolio Review now separates direct product holdings from underlying company exposure:

- **Direct Portfolio Positions** show what the portfolio directly owns: ETF wrappers, direct stocks, bond ETFs, gold ETFs, crypto ETFs, and cash-like products.
- **Top Underlying Company Exposure** shows issuer-level company exposure after ETF look-through. ETF wrappers are excluded from this chart.
- **Top Indirect Company Exposure** shows ETF-derived underlying exposure only. Direct stock exposure is excluded from the bar value, while total-with-direct can be shown in the detail text.
- Concentration Review measures top-one and top-five concentration at the underlying-company issuer level on a total-value basis, including cash in the denominator. Direct single-stock holdings are included in issuer exposure; diversified ETF wrappers are retained in `largestDirectHolding` metadata but do not trigger single-company concentration findings.
- Risk Analytics diversification scoring uses the same wrapper-excluded underlying-company issuer top-one and top-five look-through concentration as its concentration-penalty inputs when issuer exposure is available, with a direct-concentration fallback when no underlying-company issuer look-through exists. Its holding-count component remains based on direct meaningful holdings.

Identity priority for underlying concentration:

1. `holding_issuer_id` / `exposure_issuer_id` when issuer links exist.
2. `holding_security_id` / `exposure_security_id` when issuer links are unavailable.
3. Raw symbol/name fallback for older reports or unmapped holdings.

Important display rule:

- Direct holdings win the direct-position display class. If an ETF indirect row creates an issuer/security row first as `Underlying Security`, a later direct MSFT/NVDA holding must still display as `Stock`.
- Share-class variants such as `GOOG` and `GOOGL` can roll up under one issuer, such as `Alphabet Inc`, while `inputsSnapshot.securityBreakdown` preserves security-level detail.

### ETF Self-Reference Exclusion (equityEtfSymbols Guard)

During look-through accumulation in `PortfolioLookthroughExposureService`, a Set named `equityEtfSymbols` is built from all instruments in the universe whose `hasEquityLookthrough()` returns `true`. For each ETF's top holdings, any holding whose `holdingSymbol` is in `equityEtfSymbols` is skipped with a `continue` statement before accumulation.

**Why this is necessary:**

FMP's ETF holdings API can return rows that resolve to an ETF ticker for certain fund-of-funds structures and, historically, due to blank-asset rows resolving to the parent ETF symbol. Without this guard, an ETF like VT (which holds many other ETFs indirectly) or a malformed data row would cause ETF wrappers (VOO, VT, QQQ) to appear in "Top Underlying Company Exposure" with small but non-zero indirect weights.

**Effect:**

- ETF wrappers never appear in company-level look-through exposure, regardless of data source behaviour.
- Only equity stocks and non-equity leaf instruments (bond names, commodity names) accumulate as underlying company exposure.
- The guard is belt-and-suspenders: the FMP provider also drops blank-asset rows by excluding `"symbol"` from the holdingSymbol field priority list. See `docs/DATA_INGESTION_AND_PROVIDERS.md` → FMP ETF Holdings API Behaviour.

Related files:

- `src/application/services/etfLookthrough/PortfolioLookthroughExposureService.ts`
- `src/application/services/portfolioReview/ConcentrationReviewService.ts`
- `src/app/(dashboard)/portfolio-review/page.tsx`
- `docs/SECURITY_MASTER_AUDIT.md`

## Gap Analysis Findings

Gap Analysis is framed as a mechanical screener, not as a suggestion or action engine. Instruments appear only when their category is underweighted in the current portfolio look-through exposure, they are in the active approved universe, and they have passed all guardrail filters.

Candidate instruments should explain:

- What portfolio issue they address.
- Why the exposure is different.
- Diversification benefit.
- Trade-offs and overlap risk.

Candidate `primaryReason` text is issue-category-aware for newer gap findings:

- `excessive_crypto_risk` bond, treasury, fixed-income, and credit candidates reference ballast characteristics relative to crypto and high-volatility alternative exposure.
- `concentration_risk` geographic diversifiers reference issuer/geographic diversification relative to concentrated single-name look-through exposure; bond, treasury, fixed-income, credit, gold, and inflation-hedge candidates reference generally lower-correlation ballast relative to the flagged concentration.

The candidate logic should not change internal scoring labels. It uses stored insight outputs and active universe data as inputs into portfolio-level gap findings. Category-remedy findings surface diversified funds where appropriate; `insufficient_defensive_exposure` excludes individual single-stock instruments so Healthcare & Defensive examples are sector/diversified ETF instruments rather than individual company names. The Healthcare & Defensive finding presents candidates in per-sleeve subsections ordered by the most-underweight defensive sleeve first, with up to two examples per sleeve. User-facing cards should include the disclaimer chip: `Shown because category is underweighted - not a buy recommendation`.

The Portfolio Review page should use the following public language:

- `Gap Analysis - Instruments in Underweighted Categories`
- `Analytical Gap Summary`
- `Gap findings`
- `Healthcare & Defensive - Underweighted Category`
- `International Equity - Underweighted Category`

The page should not present these outputs as recommendations to buy, sell, hold, review, or trade an instrument. Explanatory tooltips can show why an instrument appeared, using existing look-through exposure data and guardrail-pass status.

### Gap Trigger Conditions

Primary code: `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`

Seven triggers are active in `PortfolioImprovementSuggestionService.build()`. Triggers fire independently; multiple findings can appear in the same review run. All rationale strings include the disclaimer "Analytical observation only — not a position sizing recommendation."

| Issue Category | Firing Condition | Priority Rule |
|---|---|---|
| `insufficient_fixed_income` | `bondAllocation < 0.05` | medium |
| `insufficient_international_exposure` | `usExposure > 0.7` OR `internationalExposure < 0.3` OR `topHolding > 0.25` OR `diversificationScore < 55` | high if usExposure > 0.85; medium if usExposure > 0.7; low otherwise |
| `insufficient_defensive_exposure` | `dominantSectorWeight > 0.35` OR `technologyWeight > 0.3` OR (`healthcareWeight < 0.08` AND `technologyWeight > 0.25`) | low |
| `excessive_crypto_risk` | `cryptoAllocation > 0.05` | high if cryptoAllocation > 0.1; medium otherwise |
| `concentration_risk` | `concentratedLookthroughHoldings.length > 0` (any non-ETF issuer look-through holding above 10%) | high if top look-through holding > 15%; medium otherwise |
| `macro_vulnerability` | `growthRegime` includes "contraction" or "slowdown" AND `recessionHedgeAllocation < 0.25` | medium |
| `insufficient_inflation_hedge` | `goldAllocation < 0.03` AND `inflationRegime` includes "elevated" | low |

Instruments with recommendation labels `"Reduce"`, `"Sell"`, `"Insufficient Data"`, or `"Not Applicable"` are blocked from all candidate pools.

### SuggestionContext

`SuggestionContext` is assembled in `build()` from the portfolio review input and passed to all trigger and candidate evaluation logic. Fields:

| Field | Source | Notes |
|---|---|---|
| `dominantSector` | Top sector from look-through sectorExposures; falls back to dashboard allocationBySector | |
| `dominantSectorWeight` | Weight of the dominant sector (0–1) | |
| `technologyWeight` | Look-through technology sector weight (0–1) | |
| `healthcareWeight` | Look-through healthcare sector weight (0–1) | |
| `utilitiesWeight` | Look-through utilities sector weight (0–1) | |
| `consumerStaplesWeight` | Look-through consumer staples sector weight (0–1) | |
| `usExposure` | Look-through US country weight; 0 if unavailable | |
| `internationalExposure` | `max(0, 1 − usExposure)` | |
| `bondAllocation` | `bondReport.totalBondAllocation` | |
| `goldAllocation` | Sum of `allocationByType` entries whose label includes "gold" | |
| `cryptoAllocation` | Sum of `allocationByType` entries whose label includes "crypto" | |
| `growthRegime` | `macroRegime.growthRegime` lowercased; null if unavailable | From FRED-derived macro regime |
| `recessionHedgeAllocation` | `bondAllocation + goldAllocation` | Proxy for defensive ballast |
| `concentratedLookthroughHoldings` | See below | Added 2026-06-18 |
| `heldSymbols` | Set of ticker strings from current portfolio holdings | Used to block already-held instruments |
| `etfTopHoldings` | `context.etfTopHoldings` | Used for company-level overlap scoring |
| `lookthroughReport` | `context.lookthroughReport` | Full look-through report including holdingExposures |

**`concentratedLookthroughHoldings` computation:**

Built inline as an IIFE in `build()`:
1. Build a map of `{ symbol → assetClass }` from all universe instruments.
2. Filter `lookthroughReport.holdingExposures` to rows where `totalWeight > 0.10` AND the holding's asset class is NOT in `["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"]`.
3. Sort descending by `totalWeight`, take top 3.
4. Store as `Array<{ symbol: string; totalWeight: number }>`.

This represents the top non-ETF look-through positions by combined direct + indirect weight. A non-empty array fires the `concentration_risk` trigger.

### Candidate Role Assignments

`candidateRole(instrument)` maps each instrument to a `CandidateRole` enum used for candidate pool filtering and role-based explanation text. Evaluation order is symbol override first, then correctly enriched sector fallbacks, then curated ETF category fallback, then broader asset/theme fallbacks:

**Symbol overrides (highest priority):**

| Symbol(s) | Role |
|---|---|
| VXUS | `international_equity` |
| VEA | `developed_international_equity` |
| VWO, IEMG | `emerging_market_equity` |
| VT, ACWI | `global_equity` |
| BNDX | `international_bond` |
| BND, AGG | `core_us_bond` |
| IEF | `intermediate_treasury` |
| TLT | `long_duration_treasury` |
| SHY, SGOV, BIL | `short_treasury_cash_like` |
| TIP | `tips_inflation_linked` |
| LQD | `investment_grade_credit` |
| HYG | `high_yield_credit` |
| GLD, IAU | `gold_hedge` |

**Fallback rules (evaluated after symbol overrides):**

| Condition | Role |
|---|---|
| `inflationLinked = true` OR theme includes "inflation hedge" | `tips_inflation_linked` |
| `creditQuality` includes "investment" AND `treasuryClassification` includes "corporate" | `investment_grade_credit` |
| `creditQuality` includes "high yield" | `high_yield_credit` |
| `assetClass = "gold_etf"` | `gold_hedge` |
| `canonicalSector = "healthcare"` | `healthcare_defensive` |
| `canonicalSector = "utilities"` | `utilities_defensive` |
| `canonicalSector = "consumer staples"` | `consumer_staples_defensive` |
| `canonicalSector = "real estate"` | `real_estate` |
| `canonicalSector = "energy"` | `energy_inflation_equity` |
| `canonicalSector = "financials"` | `financials_cyclical` |
| `canonicalSector = "industrials"` | `industrials_cyclical` |
| ETF symbol belongs to curated `ALPHA_ETF_CATEGORIES` sector groups `HEALTHCARE`, `UTILITIES`, `CONSUMER_STAPLES`, `ENERGY`, `FINANCIALS`, `INDUSTRIALS`, or `REAL_ESTATE` and no earlier rule matched | Matching sector role; used as authoritative fallback when provider `canonicalSector` is missing or incorrectly enriched to broad market |
| `assetClass = "crypto"` | `crypto_alternative` |
| `assetClass = "bond_etf"` AND `durationCategory = "long"` | `long_duration_treasury` |
| `assetClass = "bond_etf"` AND `durationCategory` is ultra-short or short | `short_treasury_cash_like` |
| `assetClass = "bond_etf"` (other duration) | `core_us_bond` |
| Theme includes "global diversification" OR `instrumentIsInternationalDiversifier()` | `global_equity` |
| `assetClass = "etf"` AND sector is "multi-asset / broad market" | `broad_market` |
| All other | `other` |

**Role labels** (used as `roleLabel` in DiversificationBenefitService and for display):

| Role | Label |
|---|---|
| `international_equity` | International equity |
| `developed_international_equity` | Developed international equity |
| `emerging_market_equity` | Emerging-market equity |
| `global_equity` | Global equity |
| `healthcare_defensive` | Healthcare defensive sector |
| `utilities_defensive` | Defensive utilities |
| `consumer_staples_defensive` | Defensive consumer staples |
| `core_us_bond` | Core US bond ballast |
| `international_bond` | International fixed income |
| `intermediate_treasury` | Intermediate Treasury ballast |
| `long_duration_treasury` | Long-duration recession hedge |
| `short_treasury_cash_like` | Short-duration / cash-like ballast |
| `tips_inflation_linked` | Inflation-linked bonds |
| `investment_grade_credit` | Investment-grade corporate credit |
| `high_yield_credit` | High-yield credit |
| `gold_hedge` | Gold / inflation hedge |
| `real_estate` | Real estate |
| `energy_inflation_equity` | Energy / inflation-sensitive equity |
| `financials_cyclical` | Financial cyclicals |
| `industrials_cyclical` | Industrial cyclicals |
| `crypto_alternative` | Crypto / high-risk alternative |
| `broad_market` | Broad-market equity |
| `other` | Diversifying exposure |

### Role Priority per Issue Category

`rolePriority(issueCategory)` returns a ranked list of preferred candidate roles. Candidates whose `candidateRole` is earlier in the list receive higher `issueFitScore`. `roleFit` score = `max(16, 35 − index × 3)`.

| Issue Category | Preferred Role Order |
|---|---|
| `insufficient_international_exposure` | international_equity → developed_international_equity → emerging_market_equity → global_equity → international_bond |
| `insufficient_fixed_income` | core_us_bond → international_bond → intermediate_treasury → short_treasury_cash_like → tips_inflation_linked → long_duration_treasury → investment_grade_credit |
| `insufficient_inflation_hedge` | gold_hedge → tips_inflation_linked → energy_inflation_equity |
| `insufficient_defensive_exposure` | healthcare_defensive / utilities_defensive / consumer_staples_defensive ordered by lowest look-through sleeve weight first, with deterministic tie order healthcare → utilities → consumer_staples |
| `concentration_risk` | international_equity → developed_international_equity → core_us_bond → gold_hedge → intermediate_treasury → international_bond |
| `excessive_crypto_risk` | short_treasury_cash_like → core_us_bond → gold_hedge |
| `macro_vulnerability` | gold_hedge → tips_inflation_linked → intermediate_treasury → healthcare_defensive → utilities_defensive → consumer_staples_defensive |

Additional `issueFit` blocking rules:
- `insufficient_defensive_exposure`: single-stock instruments are blocked (`issueFit = 0`) and displayed candidates are scoped to diversified healthcare, utilities, and consumer staples sector instruments. Bond and cash-like ballast roles remain available to fixed-income, crypto-ballast, and macro findings instead.
- `insufficient_defensive_exposure`: the three defensive sector roles are sub-category-gap-aware. The role with the lowest current look-through sleeve weight receives the highest `issueFitScore`; this is observational sector-sleeve measurement, not a personalised security ranking.
- `insufficient_defensive_exposure`: instruments classified to international/global equity roles are blocked (`issueFit = 0`) as a consistency guard, even if provider metadata carries a defensive theme.
- `concentration_risk`: single-stock instruments and instruments in the same dominant sector as the portfolio are blocked (`issueFit = 0`).
- `excessive_crypto_risk`: instruments with `assetClass` in `["cash_proxy", "bond_etf", "gold_etf"]` receive a minimum fit of 24 even if not in the role priority list.
- `macro_vulnerability`: instruments with themes "defensive", "inflation hedge", or "recession hedge" receive a minimum fit of 24 even if not in the role priority list.

### Candidate Ranking Formula

`candidateRankScore` combines multiple signals into a composite sort key:

```
rankScore =
  issueFitScore    × 0.35
  + diversificationBenefitScore × 0.30
  + recommendationScore         × 0.15
  + confidenceScore             × 0.10
  + macroFitScore               × 0.05
  − overlapPenalty              × 0.05
```

- `issueFitScore`: derived from `roleFit` via `relevanceScore(fit) = clamp(round((fit / 35) × 100))`.
- `diversificationBenefitScore` and `overlapPenalty`: from `DiversificationBenefitService.evaluate()`, which applies role-label matching, portfolio exposure context, and company-level ETF overlap penalties.
- `recommendationScore`: `recommendation.overallScore`; falls back to 55 if no recommendation exists.
- `confidenceScore`: `recommendation.confidenceScore`; falls back to 50.
- `macroFitScore`: from recommendation scoring breakdown components `["macro_fit", "market_vision_alignment", "theme_alignment"]`; falls back to 50.

Up to 5 candidates are returned per non-defensive gap finding, sorted by `rankScore` descending. On the Portfolio Review page, those already-selected candidates are displayed by category fit (`issueFitScore` descending, with `recommendationScore` as a tie-breaker) so broad/core instruments for the underweighted category appear first. For `insufficient_defensive_exposure`, candidates are selected by equity sector sleeve only: up to two Utilities, Consumer Staples, or Healthcare candidates per sleeve, with sleeve order following the same most-underweight role priority used for `issueFitScore`. Instrument quality remains visible as a per-card badge, but display order is category-intrinsic rather than a personalised ranking.

## ETF Company-Level Overlap Detection (Gap Analysis)

Added 2026-06-18. Wires `etf_top_holdings` data into gap-analysis candidate scoring so overlap reflects real underlying company exposure rather than a sector/ticker proxy.

### Candidate Overlap Fields

Each `PortfolioReviewCandidate` now carries:

| Field | Type | Description |
|---|---|---|
| `sharedCompanyCount` | `number \| null` | Number of top-100 holdings symbols the candidate ETF shares with the user's portfolio look-through company symbols. Null when ETF top-holdings data is unavailable. |
| `sharedCompanyWeight` | `number \| null` | Sum of the candidate ETF's holding weights for those shared companies (0–1 decimal). |
| `topSharedSymbols` | `string[]` | Up to 3 highest-weight shared symbols, sorted descending by holding weight. |

### Computation (PortfolioImprovementSuggestionService)

1. Filter `context.etfTopHoldings` by `etfInstrumentId === candidate.instrument.id` to get the candidate's holdings.
2. Build a `Set` of the user's company symbols from `context.lookthroughReport.holdingExposures` (uppercased).
3. Intersect: accumulate `holdingWeight` for each candidate holding whose `holdingSymbol` is in the user's symbol set → `companyOverlapWeight`.
4. Collect the top 3 shared symbols by weight → `topSharedSymbols`.
5. Pass `companyOverlapWeight` into `DiversificationBenefitService.evaluate()`.

When `etfTopHoldings` is empty (before backfill or if ETF has no holdings data), `companyOverlapWeight` is 0 and all overlap fields are null — behaviour is identical to the pre-Task-B baseline.

### Penalty Scoring (DiversificationBenefitService)

Company overlap adds to the existing `overlapPenalty` deducted from `diversificationBenefitScore`:

| Threshold | Additional penalty |
|---|---|
| `companyOverlapWeight >= 0.35` | +20 |
| `companyOverlapWeight >= 0.15` | +10 |

The `overlapWarning` string is extended to include "including top company holding overlap via ETF look-through" when `companyOverlapWeight >= 0.15`.

### Data Source

- `etf_top_holdings` table — top 100 holdings per ETF by weight, populated by `EtfLookthroughRefreshService`.
- Coverage: 169/169 eligible equity ETFs as of 2026-06-18.
- Five ETFs (IYW, VCR, JXI, VOX, PXE) have no sector data from FMP but do have top-holdings data. A seeded single-sector fallback covers those for sector exposure.

## Current Limitations

- Gap-finding explanations are deterministic templates and exposure-aware, but not a full optimizer.
- Geography currently has 0% score weight in the overall portfolio score.
- `roleExplanation()` in `PortfolioImprovementSuggestionService.ts` contains well-crafted role-and-context-specific text but is currently dead code. The fallback `benefit.primaryReason || roleExplanation(...)` at line 340 never fires because `DiversificationBenefitService` always sets a non-empty `primaryReason`. Effective candidate explanation text is controlled entirely by `DiversificationBenefitService.evaluate()`.
- Concentration thresholds are intentionally configurable candidates for future calibration. Current issuer-level finding thresholds are watch above 10% and attention above 20%.
- Historical reports generated before Security Master Phase 4C/4D may not contain issuer IDs or `securityBreakdown`; refresh Portfolio Review before using issuer-level outputs for QA.
