# Portfolio Review UX Fixes — Working Notes

**Status:** Temporary working document. Delete after all four fixes are implemented and verified.

**Source:** UX review of Portfolio Review page output, 2026-06-18.

**Implementation order:** P1 → P2 (single Codex task) → P3 → P4 (separate Codex tasks).

---

## Files Read During This Review

The following files were read in full or in part to identify root causes and draft the Codex prompts.
Listed per finding with the specific lines or sections inspected and what each contributed.

### PortfolioImprovementSuggestionService.ts
`src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`

Read in full. Key findings:

- `rolePriority("concentration_risk")` leading with `healthcare_defensive` — the root cause of P1
  (identical candidate pools across two gap findings).
- `rolePriority("insufficient_defensive_exposure")` also leads with `healthcare_defensive` — confirmed
  the overlap.
- `roleExplanation()` function (lines 206–234) has role-and-context-specific text but is dead code:
  line 340 uses `benefit.primaryReason || roleExplanation(...)` and `DiversificationBenefitService`
  always sets a non-empty `primaryReason`, so the fallback never fires. Relevant to P2.
- `SuggestionContext` type — includes `cryptoAllocation`, `concentratedLookthroughHoldings`,
  `growthRegime`, `recessionHedgeAllocation`. Used to understand what data is available to the
  gap trigger logic.
- All five active gap triggers — `insufficient_international_exposure`, `insufficient_defensive_exposure`,
  `excessive_crypto_risk`, `concentration_risk`, `macro_vulnerability` — and their firing conditions.

### DiversificationBenefitService.ts
`src/application/services/portfolioReview/DiversificationBenefitService.ts`

Read in full. Key findings:

- Line 56: default `primaryReason` is always set to a non-empty string:
  `"${symbol} appears for ${issueCategory.replaceAll('_', ' ')} with ${roleLabel.toLowerCase()}."`.
  This confirmed that `roleExplanation()` in `PortfolioImprovementSuggestionService` is dead code.
- Lines 86–94: bond branch — fires for ALL bond/treasury candidates regardless of `issueCategory`.
  Root cause of P2 (crypto ballast candidates receiving generic bond text).
- Lines 68–74: `hasAny(role, ["healthcare defensive"])` — confirms "Healthcare defensive sector"
  roleLabel matches correctly.
- Lines 76–84: `hasAny(role, ["defensive utilities", "defensive consumer staples"])` — confirms
  these labels match correctly for P2 override blocks.
- Lines 103–112: existing `sector_concentration`/`concentration_risk` tech-overlap override block —
  used as the architectural model for the new P2 issueCategory-specific override blocks.
- `issueCategory` is in scope throughout `evaluate()` — confirmed that adding issueCategory-specific
  overrides requires no signature changes.

### RecommendationAlignmentReviewService.ts
`src/application/services/portfolioReview/RecommendationAlignmentReviewService.ts`

Read in full (27 lines). Key findings:

- Line 8: `weakHeld` — instruments with "Reduce", "Sell", or "Watch" recommendation labels.
- Line 9: `constructiveHeld` — instruments with "Strong Buy", "Buy", or "Hold" labels.
- Line 10: `coverage` — decimal 0–1 fraction (heldRecommendations / total holdings).
- Line 13: "Some holdings need review" watch finding fires independently when `weakHeld.length > 0`.
- Line 15: `score = 60 + constructiveHeld.length * 4 - weakHeld.length * 8 + coverage * 12` —
  score cap formula analysis: at coverage=1, constructive=9, weak=1 → score=100. Root cause of P3
  score contradiction.
- Line 17: `recommendationCoverage: coverage` — confirmed the metadata field stores a raw 0–1
  decimal, not a percentage. Root cause of the "Recommendation Coverage: 1" display bug in P3.

### ConcentrationReviewService.ts
`src/application/services/portfolioReview/ConcentrationReviewService.ts`

Read in full (125 lines). Key findings:

- Lines 19–22: `isFundWrapper()` — correctly identifies ETF/fund wrappers by checking
  `directWeight > 0 && indirectWeight === 0` and asset class in
  `["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"]`. Already present, not yet applied
  to the concentration threshold.
- Line 55: `isFundWrapper` is used only inside `issuerGroupedUnderlying()` (to exclude fund wrappers
  from issuer rollup). Confirmed it is NOT applied to the concentration finding. Root cause of P4.
- Lines 86–101: `topDirectHolding` computation — filters `holdingExposures` for `directWeight > 0`,
  sorts descending, takes first. This is the same position as `topHolding` from the risk report,
  so `isFundWrapper(topDirectHolding)` is a valid and safe check.
- Line 108: `topHolding > 0.25 ? finding("attention", "Top holding concentration", ...)` — the
  single unchanged finding that fires for both stocks and ETF wrappers. Root cause of P4.
- Line 115: Score formula — computed from raw `topHolding` value independently of the finding.
  Confirmed the P4 fix only affects findings, not score.

### portfolio-review/page.tsx
`src/app/(dashboard)/portfolio-review/page.tsx`

Read in parts. Sections inspected:

- Lines 53–58: `metricLabel()` — camelCase-to-title-case converter. Confirmed `recommendationCoverage`
  would render as "Recommendation Coverage".
- Lines 60–64: `normalizeDisplayRatio()` — divides by 100 while `Math.abs(value) > 1`. Confirmed
  that for `coverage=1`, no division occurs (1 is not > 1), so the value stays as 1.0.
- Lines 132–143: `isRatioMetric()` — matched terms: "allocation", "concentration", "drawdown",
  "exposure", "volatility", "percent", "correlation". Confirmed `recommendationCoverage` does not
  match any term → falls through to `Intl.NumberFormat` → displays as "1". Root cause of P3
  display bug. Fix: add "coverage" to this list.
- Lines 145–149: `metricValue()` — if `isRatioMetric` is true, uses `formatPercent(normalizeDisplayRatio(value))`.
  Confirmed that adding "coverage" to the term list would produce "100%" for `coverage=1`.
- Lines 236–251: `SectionMetrics` component — iterates `Object.entries(metrics)` and renders each
  via `metricLabel(key)` / `metricValue(key, value)`. Confirmed the display path for section
  metadata including `recommendationCoverage`.

### methodology/page.tsx
`src/app/methodology/page.tsx`

Inspected via grep. Key finding:

- Line 214: `["Insight Alignment", "60 + constructiveHeldCount x 4 - weakHeldCount x 8 + coverage x 12."]`
  — the user-facing formula description that must be updated to document the P3 score cap.

### docs/PORTFOLIO_REVIEW_METHODOLOGY.md

Read in full. Relevant sections:

- Section Weights table — confirmed Insight Alignment has 10% overall weight.
- Review Sections list — confirmed all section names and their described scope.
- Security Master And Issuer Rollup Methodology — context for understanding `isFundWrapper()` and
  the distinction between Direct Portfolio Positions and Top Underlying Company Exposure (P4 framing).
- Gap Analysis Findings section — confirmed the compliance language requirements for gap finding
  descriptions (no buy/sell language; candidates are "underweighted category" not recommendations).
- ETF Company-Level Overlap Detection section — confirmed current state of overlap scoring in
  `DiversificationBenefitService` (P2 context).

### docs/DATA_INGESTION_AND_PROVIDERS.md

Read in full. Relevant to session context (FMP holdings normalisation work) rather than directly
to P1–P4 findings. Confirmed the `normalizePercentage()` fix and holdingSymbol field priority
documented as a prior session's work — not a pending item.

### Grep Searches That Contributed to Findings

The following targeted searches were run to confirm or rule out hypotheses:

| Search | Purpose | Finding |
|---|---|---|
| `recommendationCoverage` across all files | Confirm field is a 0–1 fraction at storage point | Confirmed: stored as decimal in section metadata; telemetry page has a separate `recommendationCoverage` field which is unrelated |
| `insightAlignment`, `weakHeldCount`, `heldRecommendations` in `src/app/**/*.tsx` | Check if page.tsx has special rendering for insight alignment section | No special handling found — all rendered via generic `SectionMetrics` component |
| `isRatioMetric`, `metricValue`, `function metricLabel` in `page.tsx` | Locate the display formatting functions | Found all three; confirmed `isRatioMetric` is the fix point for the "1" display bug |
| `Recommendation Coverage`, `insightAlignment` in `src/app/**/*.tsx` | Check if there is a dedicated insight alignment rendering block | No matches — confirmed rendering is fully generic via `SectionMetrics` |
| `function normalizeDisplayRatio` in `page.tsx` | Understand display ratio normalisation for coverage values | Confirmed: no division for values ≤ 1, so `coverage=1` stays as `1.0` before `formatPercent` |

---

## Summary of Findings

| # | Priority | Area | Root Cause | Files |
|---|---|---|---|---|
| P1 | Critical | Gap Analysis candidates | concentration_risk rolePriority leads with healthcare → same candidates as insufficient_defensive_exposure | `PortfolioImprovementSuggestionService.ts` |
| P2 | High | Gap Analysis candidate text | Bond branch in DiversificationBenefitService fires for ALL issue categories — crypto ballast candidates get generic bond text | `DiversificationBenefitService.ts` |
| P3 | High | Insight Alignment section | Score can reach 100/100 with a watch finding present; `recommendationCoverage: 1` displays as "1" not "100%" | `RecommendationAlignmentReviewService.ts`, `page.tsx` |
| P4 | Medium | Concentration section | VOO at 30% fires "attention" single-name finding; `isFundWrapper()` exists but is not applied to concentration threshold | `ConcentrationReviewService.ts` |

---

## P1 — Critical: Identical Gap Analysis Candidates Across Two Gap Findings

### Root Cause

`rolePriority("concentration_risk")` in `PortfolioImprovementSuggestionService.ts` currently leads with:

```
["healthcare_defensive", "utilities_defensive", "consumer_staples_defensive", "gold_hedge",
 "international_bond", "core_us_bond", "international_equity", "developed_international_equity",
 "emerging_market_equity"]
```

`rolePriority("insufficient_defensive_exposure")` also leads with `healthcare_defensive`. Both gap findings
pull from the same candidate pool (ISRG, AMGN, GILD, BMY, PFE) making the two gap sections appear
identical in the UI.

### Fix

Change `rolePriority("concentration_risk")` to lead with utilities/staples/gold so the candidate pools are
clearly differentiated:

```typescript
["utilities_defensive", "consumer_staples_defensive", "gold_hedge", "tips_inflation_linked",
 "intermediate_treasury", "core_us_bond", "international_equity", "developed_international_equity",
 "healthcare_defensive"]
```

This produces XLU/XLP-type candidates for concentration_risk vs ISRG/AMGN for insufficient_defensive_exposure.

---

## P2 — High: Wrong Primary Reason Text for Crypto Ballast and Concentration Candidates

### Root Cause

`DiversificationBenefitService.evaluate()` has a bond branch (around line 86-94) that fires for ALL
bond/treasury candidates regardless of `issueCategory`. When `issueCategory === "excessive_crypto_risk"`,
bond candidates receive generic text:

> "{symbol} provides exposure to fixed income where bond allocation is X%."

This makes no reference to crypto ballast context. Similarly, when `issueCategory === "concentration_risk"`,
utilities/staples/bond candidates receive role-based text with no reference to single-name concentration.

### Fix

Add issueCategory-specific override blocks in `DiversificationBenefitService.evaluate()` after the bond
branch, modelled on the existing `sector_concentration/concentration_risk` tech-overlap block:

**For `excessive_crypto_risk` + bond/treasury candidates:**
```
"${symbol} is a bond or treasury instrument. Ballast instruments such as this may provide
characteristics that differ from crypto and high-volatility alternative exposure."
```

**For `concentration_risk` + utilities/staples candidates:**
```
"${symbol} provides utilities or consumer staples exposure. These sectors have historically
shown lower correlation to individual growth stocks, which may address single-name concentration."
```

**For `concentration_risk` + bond candidates:**
```
"${symbol} provides fixed income exposure. Bond instruments are generally lower-correlation
to the concentrated equity positions flagged in look-through analysis."
```

Note: `roleExplanation()` in `PortfolioImprovementSuggestionService.ts` has well-crafted role-and-context
text (lines 206-234) but is dead code because `benefit.primaryReason` from DiversificationBenefitService
is always non-empty (line 340: `benefit.primaryReason || roleExplanation(...)` never falls through).
The fix should be implemented in `DiversificationBenefitService` directly, not by trying to invoke
`roleExplanation()`.

---

## Codex Prompt — P1 + P2 (Single Task)

```
## ETFVision — Portfolio Review Gap Analysis: Fix Candidate Differentiation and Primary Reason Text

### Context

Portfolio Review Gap Analysis surfaces instruments in underweighted categories. Two bugs exist:

1. **P1 — Identical candidates across two gap findings:**
   `rolePriority("concentration_risk")` and `rolePriority("insufficient_defensive_exposure")` both lead
   with `healthcare_defensive`, producing the same candidate pool (ISRG, AMGN, GILD, BMY, PFE) for
   both findings. The two gap sections appear identical in the UI.

2. **P2 — Wrong candidate explanation text:**
   The bond branch in `DiversificationBenefitService.evaluate()` fires for ALL issue categories.
   When `issueCategory === "excessive_crypto_risk"`, bond/treasury candidates receive generic text
   about fixed income allocation with no reference to crypto ballast context.
   When `issueCategory === "concentration_risk"`, candidates receive generic role text with no
   reference to single-name concentration.

### Files to Change

1. `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
2. `src/application/services/portfolioReview/DiversificationBenefitService.ts`
3. `tests/portfolio-review.test.ts`
4. `docs/implementation-log.md`

### Change 1 — Fix concentration_risk rolePriority (PortfolioImprovementSuggestionService.ts)

Find `rolePriority("concentration_risk")` and update the returned array to lead with
utilities/staples/gold instead of healthcare:

Replace the current concentration_risk return value with:

```typescript
return ["utilities_defensive", "consumer_staples_defensive", "gold_hedge", "tips_inflation_linked",
        "intermediate_treasury", "core_us_bond", "international_equity",
        "developed_international_equity", "healthcare_defensive"];
```

Do not change any other `rolePriority` case.

### Change 2 — Add issueCategory-specific primaryReason overrides (DiversificationBenefitService.ts)

Locate the existing `sector_concentration`/`concentration_risk` tech-overlap penalty block (around
lines 103-112). This block is the model for the new overrides — it checks issueCategory to write
a tailored primaryReason.

Add a new override block **before** the tech-overlap block, covering `excessive_crypto_risk` and
`concentration_risk` with role-aware text:

```typescript
// Crypto ballast context — override bond/treasury text when candidate addresses crypto risk
if (issueCategory === "excessive_crypto_risk") {
  const isBondLike = hasAny(role, ["bond", "treasury", "fixed income", "credit"]);
  if (isBondLike) {
    primaryReason = `${symbol} is a bond or treasury instrument. Ballast instruments such as this may provide characteristics that differ from crypto and high-volatility alternative exposure.`;
  }
}

// Single-name concentration context — override role text when candidate addresses concentration
if (issueCategory === "concentration_risk") {
  const isDefensiveUtility = hasAny(role, ["defensive utilities", "defensive consumer staples"]);
  const isBondLike = hasAny(role, ["bond", "treasury", "fixed income", "credit"]);
  if (isDefensiveUtility) {
    primaryReason = `${symbol} provides utilities or consumer staples exposure. These sectors have historically shown lower correlation to individual growth stocks, which may address single-name concentration.`;
  } else if (isBondLike) {
    primaryReason = `${symbol} provides fixed income exposure. Bond instruments are generally lower-correlation to the concentrated equity positions flagged in look-through analysis.`;
  }
}
```

Do not change the existing tech-overlap block. Do not change any other branch.

### Change 3 — Tests (tests/portfolio-review.test.ts)

Add three regression tests:

Test A — "concentration_risk candidates prefer defensive roles before healthcare":
- Build a suggestion context with concentration_risk trigger
- Assert that the first candidate role is utilities_defensive or consumer_staples_defensive,
  not healthcare_defensive

Test B — "excessive_crypto_risk bond candidate primaryReason references crypto ballast context":
- Build a context with excessive_crypto_risk trigger and a bond ETF candidate
- Assert that `candidate.diversificationPrimaryReason` (or the text field from DiversificationBenefitService)
  includes the word "ballast" or "crypto"

Test C — "concentration_risk utilities candidate primaryReason references single-name concentration":
- Build a context with concentration_risk trigger and a utilities ETF candidate
- Assert that the primaryReason includes "correlation" or "concentration"

### Change 4 — Implementation Log (docs/implementation-log.md)

Prepend a new entry at the top:

## Fix Gap Analysis Candidate Differentiation and Primary Reason Text

Date: 2026-06-18
Commit: [fill after commit]

### P1 — Identical Candidates
concentration_risk rolePriority now leads with utilities_defensive, consumer_staples_defensive,
gold_hedge, tips_inflation_linked, intermediate_treasury instead of healthcare_defensive.
This produces XLU/XLP-type candidates for concentration_risk vs ISRG/AMGN for
insufficient_defensive_exposure, eliminating duplicate candidate pools across the two findings.

### P2 — Primary Reason Text
Added issueCategory-specific primaryReason overrides in DiversificationBenefitService.evaluate():
- excessive_crypto_risk + bond/treasury candidate → references crypto ballast context
- concentration_risk + utilities/staples candidate → references single-name concentration correlation
- concentration_risk + bond candidate → references fixed income / equity correlation

### Tests
Three new tests in tests/portfolio-review.test.ts verify candidate role ordering and
primaryReason text for the two new issueCategory contexts.

### Constraints

- Do not modify any other rolePriority case.
- Do not change the `roleExplanation()` function — it is deliberately not invoked in the current
  architecture (the `benefit.primaryReason || roleExplanation()` fallback at line 340 never fires
  because DiversificationBenefitService always sets a non-empty primaryReason).
- After implementation, run `npx tsc --noEmit` and `npx vitest run tests/portfolio-review.test.ts`
  and confirm all 280+ tests pass including the 3 new ones.
- After deploy, re-run Portfolio Review from the Admin panel to regenerate the report.
```

---

## P3 — High: Insight Alignment 100/100 with Watch Finding Active

### Root Cause

**Score formula** (`RecommendationAlignmentReviewService.ts` line 15):
```
score = 60 + constructiveHeld.length × 4 − weakHeld.length × 8 + coverage × 12
```

At `coverage=1`, `constructive=9`, `weak=1`: `60 + 36 − 8 + 12 = 100`. The additive formula allows
a single weak instrument to be offset by constructive ones, producing a 100/100 score while "Some
holdings need review" fires simultaneously. A perfect score co-existing with a watch finding is
semantically broken.

**Display bug:** `isRatioMetric()` in `page.tsx` (line 132) matches keys containing "allocation",
"concentration", "drawdown", "exposure", "volatility", "percent", or "correlation". The key
`recommendationCoverage` matches none of these, so it is formatted by `Intl.NumberFormat` and
displays as `"1"` instead of `"100%"`.

### Fix

1. In `RecommendationAlignmentReviewService.ts`: clamp score to 94 when `weakHeld.length > 0`.
2. In `page.tsx`: add `"coverage"` to the `isRatioMetric` term list.
3. In `src/app/methodology/page.tsx`: update the Insight Alignment formula description to note the cap.

Cap of 94 chosen to be visually below the "excellent" ceiling while leaving headroom between the
two states (0 weak = potentially 100; any weak = max 94).

---

## Codex Prompt — P3

```
## ETFVision — Portfolio Review: Fix Insight Alignment Score Cap and Coverage Display

### Context

Portfolio Review has an Insight Alignment section scored by:

  score = 60 + constructiveHeld.length × 4 − weakHeld.length × 8 + coverage × 12

where `coverage` is a 0–1 decimal fraction.

There are two bugs:

1. **Score contradiction:** The formula can produce 100/100 while a "Some holdings need review"
   watch finding is also present (when many constructive instruments offset one weak one). A perfect
   score must not coexist with a weak/watch finding.

2. **Display bug:** `recommendationCoverage` (decimal fraction 0–1) displays as raw number "1"
   instead of "100%" because the `isRatioMetric()` key-matching list in `page.tsx` does not
   include "coverage".

### Files to Change

1. `src/application/services/portfolioReview/RecommendationAlignmentReviewService.ts`
2. `src/app/(dashboard)/portfolio-review/page.tsx`
3. `src/app/methodology/page.tsx`
4. `tests/portfolio-review.test.ts`
5. `docs/implementation-log.md`

### Change 1 — Score Cap (RecommendationAlignmentReviewService.ts)

Replace line 15:
```typescript
const score = 60 + constructiveHeld.length * 4 - weakHeld.length * 8 + coverage * 12;
```
with:
```typescript
const rawScore = 60 + constructiveHeld.length * 4 - weakHeld.length * 8 + coverage * 12;
const score = weakHeld.length > 0 ? Math.min(rawScore, 94) : rawScore;
```

Do not change any other logic in this file.

### Change 2 — Coverage Display (page.tsx)

In `isRatioMetric()` (around line 132), add `"coverage"` to the term array:

```typescript
return [
  "allocation",
  "concentration",
  "drawdown",
  "exposure",
  "volatility",
  "percent",
  "correlation",
  "coverage"
].some((term) => normalized.includes(term));
```

This causes `recommendationCoverage: 1` to be formatted as "100%" via the existing
`formatPercent(normalizeDisplayRatio(value))` path. No other changes to `metricValue()`.

### Change 3 — Methodology Page (src/app/methodology/page.tsx)

Find the row for "Insight Alignment" in the formula table. Update description from:

  "60 + constructiveHeldCount x 4 - weakHeldCount x 8 + coverage x 12."

to:

  "60 + constructiveHeldCount x 4 - weakHeldCount x 8 + coverage x 12. Capped at 94 when any
  holdings carry weak or watch insight assessments."

### Change 4 — Tests (tests/portfolio-review.test.ts)

Add two tests:

Test A — "insight alignment score is capped at 94 when weak holdings are present":
- coverage=1, 9 constructive held, 1 weak held
- Raw score would be 60 + 36 − 8 + 12 = 100; capped score should be 94
- Assert section.score === 94
- Assert findings contains "Some holdings need review"

Test B — "insight alignment score reaches 100 when no weak holdings and full coverage":
- coverage=1, 10 constructive held, 0 weak held
- Raw score = 60 + 40 + 12 = 112, clamped by section() to 100
- Assert section.score === 100
- Assert findings is empty

### Change 5 — Implementation Log (docs/implementation-log.md)

Prepend a new entry at the top:

## Fix Insight Alignment Score Cap and Coverage Display

Date: 2026-06-18
Commit: [fill after commit]

### Problem
The Insight Alignment section score could reach 100/100 while a "Some holdings need review"
watch finding was simultaneously present. Root cause: the additive formula allowed a large
constructive count to mathematically offset a weak holding. Additionally,
`recommendationCoverage: 1` displayed as the raw number "1" rather than "100%" because
`isRatioMetric()` did not include "coverage" as a recognized ratio key.

### Fix
- Added score cap: Math.min(rawScore, 94) when weakHeld.length > 0.
  Ensures a section with any weak/watch holdings cannot score above 94.
- Added "coverage" to the isRatioMetric() term list in page.tsx.
  recommendationCoverage now renders as "100%" instead of "1".
- Updated src/app/methodology/page.tsx formula description to document the cap.

### Tests
Two new tests in tests/portfolio-review.test.ts:
- Score is capped at 94 when weakHeld.length > 0
- Score is uncapped (100) when weakHeld.length === 0 and full coverage

### Constraints

- Do not change the section() call signature, metadata fields, or any other review section.
- Do not rewrite the score formula beyond the cap line.
- After implementation, run `npx tsc --noEmit` and `npx vitest run tests/portfolio-review.test.ts`
  and confirm all tests pass including the 2 new ones.
```

---

## P4 — Medium: Concentration Review Fires Incorrect Warning for ETF Wrappers (VOO)

### Root Cause

`ConcentrationReviewService.ts` line 108:
```typescript
topHolding > 0.25 ? finding("attention", "Top holding concentration", "The largest holding exceeds 25% of invested assets.") : null,
```

`topHolding = riskReport.concentration.topHoldingConcentration` fires identically for a diversified
ETF (VOO at 30.62%) and a single stock (NVDA at 30%). The message "The largest holding exceeds 25%
of invested assets" implies single-name issuer risk where none exists for a 500-company fund.

`isFundWrapper()` already exists and correctly classifies ETF wrappers:
- `directWeight > 0 && indirectWeight === 0`
- asset class in `["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"]`

`topDirectHolding` (line 86-101) is already computed as the HoldingExposure row with the highest
`directWeight` — the same position as `topHolding`. `isFundWrapper(topDirectHolding)` is a clean,
zero-cost addition.

### Proposed Severity Logic

| Condition | Finding |
|---|---|
| `topDirectHolding` null or not fund wrapper, `topHolding > 0.25` | `"attention"`, "Top holding concentration", original message (unchanged) |
| fund wrapper, `topHolding > 0.40` | `"attention"`, "Largest position is an ETF product", look-through reference |
| fund wrapper, `0.25 < topHolding ≤ 0.40` | `"watch"`, "Largest position is an ETF product", look-through reference |
| `topHolding ≤ 0.25` | null (unchanged) |

40% threshold for fund wrapper attention: even a diversified ETF at 40%+ leaves 60% for remaining
portfolio, warranting attention for portfolio balance reasons.

---

## Codex Prompt — P4

```
## ETFVision — Portfolio Review: Fix Concentration Finding for ETF Fund Wrappers

### Context

`ConcentrationReviewService.ts` fires an "attention" finding "The largest holding exceeds 25% of
invested assets" whenever `topHolding > 0.25`. This fires identically whether the largest holding
is a single stock (NVDA) or a diversified ETF (VOO, SPY, VTI). For ETF wrappers, the message
implies single-name issuer risk where none exists.

`isFundWrapper()` already exists at lines 19-22 and correctly identifies ETF wrappers:
- directWeight > 0
- indirectWeight === 0
- asset class in ["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"]

`topDirectHolding` (computed at line 86-101) is the HoldingExposure row with the highest
directWeight — the same position represented by `topHolding` from the risk report.

### File to Change

`src/application/services/portfolioReview/ConcentrationReviewService.ts`

### Change — Replace Concentration Finding with Fund-Wrapper-Aware Logic

Find line 108:
```typescript
topHolding > 0.25 ? finding("attention", "Top holding concentration", "The largest holding exceeds 25% of invested assets.") : null,
```

Replace with:
```typescript
topHolding > 0.25 && topDirectHolding != null && isFundWrapper(topDirectHolding) && topHolding > 0.40
  ? finding("attention", "Largest position is an ETF product", "The largest position is a diversified ETF or fund product accounting for more than 40% of the portfolio. Review look-through holdings for underlying concentration.")
  : topHolding > 0.25 && topDirectHolding != null && isFundWrapper(topDirectHolding)
    ? finding("watch", "Largest position is an ETF product", "The largest position is a diversified ETF or fund product. Review look-through holdings for underlying single-name concentration.")
    : topHolding > 0.25
      ? finding("attention", "Top holding concentration", "The largest holding exceeds 25% of invested assets.")
      : null,
```

Logic summary:
- ETF wrapper > 40% → attention with fund-wrapper wording
- ETF wrapper 25–40% → watch with look-through reference
- Non-wrapper above 25% → attention, original wording (unchanged)
- topHolding ≤ 25% → null (unchanged)
- topDirectHolding === null → falls through to the third branch, preserving existing behaviour

### Additional Files

1. `tests/portfolio-review.test.ts` — add three tests:

   Test A — "concentration review emits watch for ETF wrapper between 25% and 40%":
   - Top direct holding: directWeight=0.30, indirectWeight=0, inputsSnapshot.instrumentAssetClass="etf"
   - topHolding=0.30
   - Assert finding severity is "watch"
   - Assert finding title is "Largest position is an ETF product"

   Test B — "concentration review emits attention for ETF wrapper above 40%":
   - Same ETF wrapper characteristics, topHolding=0.45
   - Assert finding severity is "attention"
   - Assert finding title is "Largest position is an ETF product"

   Test C — "concentration review emits attention for non-wrapper above 25%":
   - topHolding=0.30, indirectWeight=0, inputsSnapshot.instrumentAssetClass="stock"
   - Assert finding severity is "attention"
   - Assert finding title is "Top holding concentration"

2. `docs/implementation-log.md` — prepend a new entry at the top:

## Fix Concentration Finding for ETF Fund Wrappers

Date: 2026-06-18
Commit: [fill after commit]

### Problem
ConcentrationReviewService fired an "attention" finding "The largest holding exceeds 25% of
invested assets" for any holding above 25%, including diversified ETF wrappers such as VOO
(30.62%). This falsely implied single-name issuer risk for a fund that holds 500 companies.
isFundWrapper() already existed but was only used in the issuer rollup exclusion path.

### Fix
Applied isFundWrapper(topDirectHolding) to the concentration finding:
- ETF wrapper 25–40%: downgraded to "watch" with message referencing look-through concentration.
- ETF wrapper > 40%: remains "attention" with clarified fund-wrapper wording.
- Non-wrapper (single stock/bond): unchanged "attention" finding.
- topDirectHolding === null: preserves existing behaviour.

### Tests
Three new tests in tests/portfolio-review.test.ts:
- ETF wrapper at 30% → watch finding
- ETF wrapper at 45% → attention finding
- Single stock at 30% → attention finding (existing title preserved)

### Constraints

- Do not modify isFundWrapper() itself.
- Do not change the score formula in ConcentrationReviewService. Score is computed from the raw
  topHolding value independently of this finding change.
- Do not touch any other findings in the findings array.
- After implementation, run `npx tsc --noEmit` and `npx vitest run tests/portfolio-review.test.ts`
  and confirm all tests pass.
```

---

## P5 — Low: Polish Items (No Prompt Yet)

For future reference — low-priority items from the same UX review:

1. **Em dash inconsistency** — some gap finding titles use `—` (em dash) and others use `-` (hyphen).
   Standardise to ` — ` (spaced em dash) across all gap finding title strings.

2. **Country Count: 1 label** — label says "Country Count" but the value 1 appears to count only
   direct holdings. Should clarify whether look-through country count is included.

3. **Direct Portfolio Positions cap** — LLY (Eli Lilly) missing from "Direct Portfolio Positions"
   list despite being a direct holding. Investigate if there is a display cap or rendering cutoff.

4. **Exchange ticker format in overlap text** — overlap text shows Japanese tickers as `8306.T`,
   `7203.T`. Consider whether the dot-numeric format needs normalisation for display or if the
   exchange suffix should be suppressed in user-facing text.

---

*End of working notes. Delete this file once all four Codex tasks are completed and verified.*
