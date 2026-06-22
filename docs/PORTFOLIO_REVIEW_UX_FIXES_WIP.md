# Portfolio Review UX Fixes — Working Notes

**Status:** CLOSED (2026-06-19) — all planned candidate-quality, trigger-semantics, presentation,
compliance-wording, and DRY items shipped, reviewed, and validated live. No open work items remain; the
one cosmetic nit below is deferred to ride along with the next Portfolio Review prompt rather than its own
change. Safe to delete this doc once that carry-along lands (or is waived).

Final shipped sequence (commits): International broad-representative (`9503306`); breadth tiers +
crypto-ballast + T1 (`7795895`); intl variety + labels + inflation ack + display names (`1ec41aa`);
International subsections (`c86bbcb`); "Portfolio Balance Review" rename + shared issuer-exposure helper
(`0c9fd30`); Real Estate sleeve + disclaimer capitalization (`ddbaf92`); REIT exposure-impact text +
fallback guard test (`ee4ea78`). All validated against the live 2026-06-19 report (score 85; Concentration
90, Risk 88 unchanged throughout).

**Carry-along (fold into the next Portfolio Review prompt — do not spec standalone):**
- Pluralize the executive-summary counts: "1 watch areas" → "1 watch area" (and "1 balance findings" /
  "1 data limitations" — singular when the count is 1). Lives in `portfolioReviewExecutiveSummary`
  (`PortfolioReviewService.ts`). Trivial; bundle it with whatever next touches this area.

**Latest shipped note (2026-06-19):** Portfolio Balance Review backlog clearance shipped. User-facing "Gap
Analysis" language is now "Portfolio Balance Review", "Analytical Gap Summary" is now "Portfolio Balance
Summary", generic "Underweighted Category" subtitles are softened to "Lightly Represented Category",
wrapper-exclusion logic is shared across Concentration/Risk/page display, curated gap-engine sets are
co-located, and taxonomy/display guard tests cover the cleanup.

**Latest shipped note (2026-06-19):** Real Estate / REIT balance finding shipped. Low real-estate
look-through exposure now surfaces a flat Real Estate - Lightly Represented Category finding led by broad US
REIT representatives, and the executive-summary balance-finding disclaimer capitalization is fixed.

**Source:** UX review of Portfolio Review page output, 2026-06-18. Trigger logic and new findings
(T1, T2, A–E) confirmed against the live 2026-06-18 report (score 81).

## Current Status & Remaining Backlog (updated 2026-06-19)

### Shipped, reviewed, committed & pushed, validated live
- **Task 1 — issuer-level concentration** (`a095414`): concentration measured at underlying-company
  level, total-value basis; VOO no longer false-positives; Concentration 90. (Absorbed original A + P4 + T2 + B.)
- **P2 — issue-category-aware candidate text** (`fe3b882`): crypto-ballast candidates reference
  ballast-vs-crypto context instead of generic bond text.
- **Task 2 — issuer-level diversification + wrapper-exclusion fix** (`90432b7`): diversification
  `concentrationPenalty` uses wrapper-excluded underlying-company concentration; `holdingScore` stays
  direct. Validated Diversification 79 → 88.
- **P3 — insight-alignment cap + coverage display** (`acbd49a`): section score capped at 94 when any
  non-info finding present; "Recommendation Coverage" renders as %. Validated 100 → 94, overall → 85.
- **Gap-analysis examples (#1)** (`550f4cc`): defensive gap surfaces diversified ETFs (XLV/VHT/XLU/XLP)
  not single stocks; candidate cards ordered by category fit (`issueFitScore`) via the pure helper
  `gapCandidateDisplay.ts`. Validated live: defensive shows ETFs, International leads with VXUS over DXJ.

### Also shipped (gap-analysis quality cluster, 2026-06-19)
- **Per-sleeve defensive targeting (#2)** (`f0eb7ec`); **#ETF-TAXONOMY Part A** curated-category routing + role/finding guard (`ed8f4e6`); **defensive per-sleeve subsections** (`d5de677`); **rename to "Defensive Sectors" + broad-flagship preference + biotech/genomic exclusion + sleeve-aware tooltip** (`e0f6841`). All validated live.

### Also shipped (gap-engine quality + trigger-semantics, 2026-06-19)
- **International broad-representative preference** (`9503306`) — shared `categoryRepresentativeScore` so
  broad ex-US diversifiers lead over single-country/dividend funds, in both selection and display. Validated
  live (VXUS/VEA led; DXJ/SCHY/IDV/JPXN/EWJ removed from the lead).
- **International breadth tiers + crypto-ballast trigger + T1** (`7795895`) — graded
  `internationalRepresentativeScore` (core ex-US 100 / variant 60 / global-incl-US 30 / country-dividend 0)
  so VXUS/VEA/VWO/IEMG lead over HEFA/EMXC and over IOO/VT/ACWI; `excessive_crypto_risk` made ballast-aware
  (`recessionHedgeAllocation = bond+gold < crypto`) so it no longer fires when ballast already exceeds crypto;
  T1 — dropped `topHolding>0.25 || diversificationScore<55` from the international trigger. *Awaiting live re-run.*

### Design convention — "broad representative" preference (category-remedy findings)
Any gap finding that remedies a **missing category sleeve** (defensive sectors, international, and any future
sleeve trigger such as **Real Estate / REIT**) should reuse the shared broad-representative ranking rather
than introduce its own curated symbol set: prefer the broad, canonical representative(s) of the target
category over narrow sub-theme / single-country / niche variants, and do **not** let overlap with existing
broad exposure bury the representative candidate. This keeps candidate quality consistent and avoids a
proliferation of per-finding hand-curated lists. A Real Estate sleeve, if added, should lead with broad REIT
funds (VNQ/SCHH/IYR-style) over narrow specialty / mortgage / international-REIT variants via this mechanism.

### Remaining backlog (recommended sequence)
1. **"Gap Analysis" → "Portfolio Balance Review" rename (user-facing strings only)** — shipped 2026-06-19. Previously requested to rename the section
   from "Gap Analysis" (the "gap" framing implies an action to take) to **"Portfolio Balance Review"**, and
   soften the "Underweighted Category" subtitle. (Label decided 2026-06-19. "Balance" chosen because "Coverage"
   collides with Data/Lookthrough/Recommendation/Profile Coverage and "Exposure" collides with Theme Exposure
   Review + look-through tables.) Scope: section title, subtitles, exec-summary "N gap findings" wording,
   "Analytical Gap Summary" block, methodology doc — UI strings only; keep internal code names
   (`gapCandidateDisplay.ts`, `issueCategory`, etc.) unchanged.
2. **D + E polish** — shipped 2026-06-19. Country Count labels now state materiality thresholds, and the
   macro inflation finding acknowledges held TIP/GLD-style hedges when present.
3. **DRY cleanup** — shipped 2026-06-19. Extract the wrapper-exclusion helper (`isFundWrapper`/`isIssuerExposure`/`issuerKey`)
   duplicated in `ConcentrationReviewService` and `RiskAnalyticsDataService`; consider consolidating the
   gap-engine curated symbol sets (`nonDefensiveSectorEtfs`/`broadDefensiveSectorEtfs`/`coreInternationalEtfs`/
   `globalIncludingUsEtfs`).
4. **Display polish** — shipped 2026-06-19. Gap titles use em dashes, and overlap text prefers company
   names with ticker cleanup fallback.
5. *(optional)* **Real Estate / REIT sleeve trigger** — shipped 2026-06-19. Reuses the shared
   broad-representative mechanism; broad REIT funds lead.
6. *(optional)* **Taxonomy verification test** — read-only test asserting every active instrument's stored
   sector == `TaxonomyService.normalizeInstrument` output. *Needs prompt if pursued.*

### Diagnostic finding (2026-06-19) — systemic ETF sector mis-classification
Surfaced by the post-#1 live re-run (FXU appeared in Healthcare & Defensive with "non-US equity" text).
SQL diagnostic over the active universe found it is **systemic, ~60 sector/thematic ETFs**, two root causes:
1. **`canonical_sector` mis-enriched to "Multi-Asset / Broad Market"** for most non-flagship sector ETFs
   (FXU, VPU, IDU, JXI, IYH, FHLC, XBI, IBB, VFH, IYF, KBE, KRE, VDE, IYE, IXC, XOP, VAW, MXI, VCR, VDC,
   FSTA, …). Only flagship SPDR/Vanguard sector ETFs (XLV, XLU, XLP, XLK, XLC, XLY, XLB, VGT, VHT, SOXX)
   enriched to their real sector.
2. **`"Global Diversification"` theme is applied to essentially every ETF** (incl. US-only funds like XLU/XLK).
Mechanism: `candidateRole` checks sector before the theme branch; a mis-enriched ETF fails the sector
checks, hits `hasAnyTheme(["global diversification"])` → `global_equity` → "non-US equity" text. Correctly
enriched ETFs (XLU = "Utilities") never reach the theme branch, so they classify right. Broader impact:
mis-enriched US sector ETFs are eligible for the **International** gap finding as "non-US equity" diversifiers
(e.g. a US healthcare/financials/energy ETF surfacing as an international candidate), not just the FXU cosmetic case.

Notes:
- Sort-fallback nit (`recommendationScore ?? score` badge vs `?? 0` sort) is absorbed by #1B (shipped).
- "Direct Positions — LLY missing" was display truncation (top-12 cap), not a bug — dropped.
- Finding C (candidates reading as ranked picks) is largely addressed by #1 (ETFs + category-fit ordering + disclaimers).

---

**Historical note — superseded earlier sequence (kept for context):** The original plan ordered the work
as Concentration coherence (A+P4+T2+B) → Task 2 → T1 → P1+P2 → P3 → C/D/E. Task 1 absorbed A/P4/T2/B and
the concentration portion of P1; P1's defensive/international differentiation became unnecessary once Task 1
made concentration_risk diversifier-only. The standalone P1–P4 prompts below remain as historical drafts.

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
| T1 | High | Gap trigger semantics | `insufficient_international_exposure` fires on `topHolding > 0.25 \|\| diversificationScore < 55` — emits a "US-concentrated" finding for portfolios that are not US-concentrated | `PortfolioImprovementSuggestionService.ts:479` |
| T2 | High | Concentration split-brain | `concentration_risk` gap finding flags single underlying names >5% (NVDA 7.9%) while the real concentration (VOO 30%+) is flagged only in Concentration Review. Two sections, two stories. | `PortfolioImprovementSuggestionService.ts:518`, `ConcentrationReviewService.ts` |
| A | High | Concentration metrics | Top Holding (32.88%, ex-cash direct) vs Top Five (28%, total-basis issuer look-through) computed on different bases → top-five appears smaller than top-one | `ConcentrationReviewService.ts`, risk analytics |
| B | High (compliance) | Concentration candidates | `concentration_risk` suggests individual stocks (ISRG, AMGN…) to address single-name concentration — logically backwards and the most advice-like output | `PortfolioImprovementSuggestionService.ts` |
| C | Medium (compliance) | Gap candidate framing | Named securities ranked by quality badge under "underweighted category" reads as a curated shortlist of picks | `page.tsx` |
| D | Low | Geography/diversification | `Country Count: 1` is a ≥3% threshold count shown next to a 56-country table; misleading label (no score impact here — sector count already maxes the +8 bonus) | `DiversificationReviewService.ts:8` |
| E | Low | Macro fit finding | Inflation finding suggests inflation-linked/commodity sleeves "may be useful" while portfolio already holds TIP + GLD | `MacroFitReviewService.ts` (verify) |

Findings P1–P5 were identified from the page output and code read. Findings T1, T2, A–E were
confirmed against the live 2026-06-18 report (score 81) and verified in code.

---

## Trigger Logic Review (2026-06-18 live report)

Verified all 7 documented gap triggers against code and against the live report's 4 fires
(international, defensive, crypto, concentration). The trigger **conditions** match the methodology
doc exactly and all 4 fires were correct. Two structural defects found:

### T1 — International trigger fires on non-international clauses

`PortfolioImprovementSuggestionService.ts:479`:
```typescript
if (usExposure > 0.7 || internationalExposure < 0.3 || topHolding > 0.25 || diversificationScore < 55) {
  // emits "International Equity - Underweighted Category", rationale hardcoded to US look-through %
```

`topHolding > 0.25` and `diversificationScore < 55` are concentration/diversification signals, not
international-exposure signals. The finding title and rationale are hardcoded around US look-through,
so a globally-diversified portfolio (e.g. US 40%) carrying one ETF above 25% would fire this finding
and **falsely state it is US-concentrated**. In the live report it fired legitimately on US 89.12%,
so the defect is latent here but will emit misleading findings in other portfolios.

This appears to be a refactor artifact: the old `sector_concentration`/`concentration_risk` clauses
were folded into the international trigger. They belong in the concentration trigger.

**Fix:** remove `topHolding > 0.25` and `diversificationScore < 55` from the international trigger.
Route those signals to the concentration finding (see T2 / merged concentration task below).

### T2 — Concentration is split-brain across two sections

- **Concentration Review** (section) flags **VOO at 32.88%** — the real concentration (a single product
  at ~1/3 of the book).
- **`concentration_risk` gap finding** flags **NVDA at 7.9%** look-through — a single underlying name
  that is not a genuine concentration problem.

The gap trigger fires on `concentratedLookthroughHoldings.length > 0` where the filter is
`totalWeight > 0.05`. A 5% trigger (8% "high") is too sensitive — no single underlying company below
~8% look-through is a real concentration risk, and the finding ignores the actual concentrated
position (the VOO wrapper) entirely. The user sees two different concentration narratives for one
portfolio.

**Fix:** unify the concentration story. The gap finding and the Concentration Review section should
draw on the same concentration definition (same basis, same decomposition level), raise the
single-name look-through threshold (≥10%), and — per finding B — surface broad diversifiers, not
individual stocks.

### Minor documentation gaps (PORTFOLIO_REVIEW_METHODOLOGY.md)

- The trigger table omits the **`data_quality`** finding (fires when `recommendations.length === 0`).
- `rolePriority` carries **dead branches** with no active trigger: `insufficient_cash_like_exposure`,
  `insufficient_geopolitical_hedge`, `sector_concentration`, `theme_concentration`. Mark them
  reserved/inactive so future readers don't assume they fire.

---

## Merged Task 1 — Concentration Coherence (A + P4 + T2 + B) — Codex Prompt

**Decisions locked 2026-06-19: Decision 1 = Option B (underlying-issuer level for both top-1 and
top-5); Decision 2 = Total value (incl. cash).**

This is the highest-impact cluster. It supersedes the standalone **P4** prompt (P4 is structurally
solved by issuer-level measurement) and the **concentration_risk** portion of **P1**.

> **Behaviour change to expect:** measuring at issuer level, the largest *company* in the live
> portfolio is NVDA at 7.87%. No single company exceeds ~8%, so the Concentration Review finding
> stops firing and the section **score rises from 69 → ~90**. This is the honest reading at the
> company level; the single-product risk of holding 30% in VOO is reflected in the Risk Review.
> Re-run Portfolio Review after deploy and confirm the new score is acceptable before sign-off.

> **Owner-tunable defaults:** the issuer-level finding thresholds (10% watch / 20% attention) and the
> recalibrated score coefficients below are proposed defaults. They replace coefficients that were
> calibrated for *direct-holding* concentration and are meaningless at issuer level. Adjust if the
> resulting scores across sample portfolios are not acceptable.

```
## ETFVision — Portfolio Review: Issuer-Level Concentration Coherence

### Context

Concentration is currently incoherent across the report:

1. Concentration Review reports top-1 at the WRAPPER level on an ex-cash basis (VOO = 32.88%) but
   top-5 at the underlying-ISSUER level on a total-value basis (NVDA…LLY = 28%). top-1 therefore
   appears larger than top-5, which is impossible for like-for-like measures. It also fires
   "largest holding exceeds 25%" for VOO, a diversified S&P 500 wrapper. (Finding A + P4)
2. The `concentration_risk` gap finding flags the largest underlying name (NVDA 7.9%) — not a
   genuine single-name concentration — and suggests individual STOCKS (ISRG, AMGN, GILD, BMY, PFE)
   to "address" it, which is logically backwards and the most advice-like output on the page. (T2 + B)

Decision: measure concentration at the UNDERLYING-ISSUER level on a TOTAL-VALUE basis (incl. cash),
consistently for top-1 and top-5. The look-through issuer exposures (`underlyingExposures`) are
already issuer-level and total-basis, so this aligns top-1 with the existing top-5.

### Files to Change

1. `src/application/services/portfolioReview/ConcentrationReviewService.ts`
2. `src/application/services/portfolioReview/PortfolioImprovementSuggestionService.ts`
3. `src/app/methodology/page.tsx` (concentration score formula description)
4. `tests/portfolio-review.test.ts`
5. `docs/implementation-log.md`

### Change 1 — Measure Concentration Review at issuer level (A + P4)

In `ConcentrationReviewService.ts`:

(a) Derive an issuer-level top-1 from the already-computed `underlyingExposures` (issuer-grouped,
total-basis, sorted desc). Fall back to the direct `topHolding` only when no look-through exists:

```typescript
const topIssuerConcentration = underlyingExposures.length
  ? (underlyingExposures[0]?.totalWeight ?? 0)
  : topHolding;   // topHolding = riskReport direct concentration, used only as no-look-through fallback
```

(b) Replace the wrapper-level finding (line ~108) with issuer-level wording and thresholds. With this,
a diversified wrapper like VOO never trips a single-company finding:

```typescript
topIssuerConcentration > 0.20
  ? finding("attention", "Single-company concentration", "A single underlying company exceeds 20% of look-through exposure.")
  : topIssuerConcentration > 0.10
    ? finding("watch", "Single-company concentration", "A single underlying company exceeds 10% of look-through exposure.")
    : null,
```

(c) The existing top-five finding (line ~109) currently fires `topCombinedFive > 0.65` "attention".
Lower to a watch at issuer level for consistency:

```typescript
topCombinedFive > 0.50
  ? finding("watch", "Top five company concentration", "The top five underlying companies account for a large share of look-through exposure.")
  : null,
```

(d) Recalibrate the section score for issuer level (old coefficients assumed direct concentration):

```typescript
const score = 90
  - Math.max(0, topIssuerConcentration - 0.10) * 150
  - Math.max(0, topCombinedFive - 0.40) * 80
  - Math.max(0, sectorTop - 0.40) * 60;
```

(e) Update the metadata so the displayed top-holding is the issuer-level figure, and keep the direct
holding for transparency:

```typescript
topHoldingConcentration: topIssuerConcentration,   // was topHolding (wrapper/ex-cash)
topFiveConcentration: topCombinedFive,
largestDirectHolding: topDirectHolding,             // keep — shows VOO 30.62% as product-level context
```

Do NOT change `riskReport.concentration` or `riskMath` (the diversification score still uses
direct-level concentration — that is a separate surface, flagged as a follow-on decision below).
Do NOT modify `isFundWrapper()`.

### Change 2 — Raise the single-name gap trigger threshold (T2)

In `PortfolioImprovementSuggestionService.ts`, in the `concentratedLookthroughHoldings` IIFE, raise
the filter threshold from `0.05` to `0.10`:

```typescript
if (!h.holdingSymbol || h.totalWeight <= 0.10) return false;   // was 0.05
```

Rationale: no single underlying company below ~10% look-through is a genuine concentration risk.
With this change the gap finding only fires on real underlying concentration; the wrapper-level
concentration (VOO) is handled solely by the Concentration Review section, eliminating the
split-brain. Update the "high" priority threshold accordingly (e.g. `totalWeight > 0.15`).

### Change 3 — Concentration candidates must be diversified funds, not single stocks (B)

In `PortfolioImprovementSuggestionService.ts`:

(a) Change `rolePriority("concentration_risk")` to a diversifier-only set (drop defensive *sectors*,
which resolve to individual stocks and overlap with insufficient_defensive_exposure):

```typescript
if (issueCategory === "concentration_risk") {
  return ["international_equity", "developed_international_equity", "core_us_bond",
          "gold_hedge", "intermediate_treasury", "international_bond"];
}
```

(b) In `issueFit()` for `concentration_risk`, exclude single-stock instruments so the finding never
suggests individual equities to fix single-name concentration:

```typescript
if (issueCategory === "concentration_risk") {
  if (instrument.assetClass === "stock") return 0;          // diversified products only
  if (instrumentIsSameDominantSector(instrument, context)) return 0;
  return roleFit(role, issueCategory, context);
}
```

This supersedes the concentration_risk role change proposed under P1. P1's remaining scope is only
the international-vs-defensive differentiation.

### Change 4 — Methodology page (src/app/methodology/page.tsx)

Update the Concentration row in the formula table to the recalibrated issuer-level formula:

  "90 - max(0, topCompany - 0.10) x 150 - max(0, topFiveCompanies - 0.40) x 80 - max(0, sectorTop - 0.40) x 60.
  Concentration is measured at the underlying-company (issuer look-through) level on a total-value basis."

### Change 5 — Tests (tests/portfolio-review.test.ts)

- "concentration review measures top-1 at issuer level" — look-through with largest company 0.07,
  largest direct holding an ETF wrapper at 0.30 → `topHoldingConcentration` metadata ≈ 0.07 (NOT 0.30),
  and no single-company finding fires.
- "concentration review emits watch when a single company exceeds 10%" (largest company 0.12) →
  severity "watch", title "Single-company concentration".
- "concentration review emits attention when a single company exceeds 20%" (largest company 0.22) →
  severity "attention".
- "concentration review falls back to direct concentration when no look-through" (empty
  underlyingExposures, riskReport topHoldingConcentration 0.30) → uses 0.30.
- "concentration_risk gap finding does not fire when no underlying name exceeds 10%" (largest
  underlying 0.08) → no concentration_risk suggestion emitted.
- "concentration_risk candidates exclude single stocks" → every candidate has assetClass !== "stock".

### Change 6 — Implementation Log

Prepend an entry documenting: issuer-level concentration measurement (Decision B + total basis),
the recalibrated score coefficients, the 10%/20% single-company finding thresholds, the 10% gap
trigger threshold, and the diversifier-only concentration candidate set with the single-stock exclusion.

### Constraints

- Do NOT change `riskReport.concentration` or `riskMath` — the risk diversification score continues
  to use direct-level concentration (separate surface; follow-on decision below).
- Do NOT modify isFundWrapper().
- Run `npx tsc --noEmit` and `npx vitest run tests/portfolio-review.test.ts`; all tests pass.
- After deploy, re-run Portfolio Review from the Admin panel and confirm the new concentration score
  (~90 for the reference portfolio) is acceptable.
```

### Follow-on decisions (resolved 2026-06-19)

1. **Risk diversification score → issuer-level: YES.** An ETF is held to increase diversification, so
   the score must not penalize it as a concentrated direct holding. Implemented as **Task 2** below
   (touches `riskMath`, shared with the Risk page — separate blast radius from Task 1).
2. **Add explicit basis label to displays: YES.** Folded into Task 1 as Change 7.

---

## Merged Task 1 — Change 7 — Basis label (Decision 2 follow-up)

Add to Task 1's file list: `src/app/(dashboard)/portfolio-review/page.tsx`.

On the **Direct Portfolio Positions** and **Look-Through** exposure blocks, add a short caption noting
the denominator, e.g. "Weights shown as % of total portfolio value (including cash)." This pre-empts
the 30.62% vs 32.88% style confusion now that concentration is reported on a total-value basis.
Display-only; no calculation change.

---

## Task 2 — Issuer-Level Diversification Score

**Decision (2026-06-19): the diversification score should honor look-through.** An ETF is added to
increase diversification; the score must not penalize a diversified wrapper as a concentrated direct
holding.

### Root cause

`riskMath.diversificationScore` (`src/application/services/risk/riskMath.ts:342`):

```
concentrationPenalty = topHoldingConcentration × 20 + max(0, topFiveConcentration − 0.5) × 30
```

Both inputs are **direct-holding** concentration computed in `RiskAnalyticsService.ts:101-102`
(`concentrationRatio(holdingValues, n)`), i.e. VOO 32.88% and direct top-5 ≈ 63% (ex-cash). On the
reference portfolio this is a ~10-point penalty purely for holding a diversified fund. Backwards.

### Design (pure swap; `holdingScore` is the residual)

- Feed `concentrationPenalty` with **issuer-level look-through** top-1 and top-5 (total basis) — the
  same figures Task 1 surfaces in Concentration Review. Requires computing issuer-grouped look-through
  concentration in the risk data layer, mirroring `issuerGroupedUnderlying` from
  `ConcentrationReviewService`.
- **Keep `holdingScore = min(meaningfulHoldings / 12, 1) × 20` on the DIRECT holding count.** This is
  deliberate: it naturally retains a single-product/structural-risk penalty (a 100%-one-ETF portfolio
  still scores near-zero on holdingScore), so moving `concentrationPenalty` to issuer level does NOT
  erase product-concentration risk from the score. Single-product risk also remains visible in Risk
  Review's risk-contribution finding. No artificial hybrid coefficient needed.
- Fall back to direct concentration when look-through is unavailable.

Expected effect on the reference portfolio: diversification ~79 → ~88.

Self-consistency check across portfolio shapes:
- 100% one ETF → holdingScore ~0 (single-product penalty), concentrationPenalty low (correctly not an
  equity-concentration problem) → moderate diversification. Sensible.
- 15-ETF portfolio (reference) → holdingScore maxed, concentrationPenalty low → high diversification. Sensible.
- 100% one stock → holdingScore ~0, concentrationPenalty high (issuer 100%) → very low. Correct.

### Verification (2026-06-19) — feasible, no new data plumbing

Confirmed in code:

- **Single chokepoint, shared by both surfaces.** The diversification score is computed once by
  `RiskAnalyticsService.calculateRiskAnalytics` → `DiversificationService.score`
  (`riskMath.diversificationScore`), stored via `upsertRiskReport`, and read by BOTH the Risk
  Analytics page and Portfolio Review (`riskReport.diversification.score`). Changing it at the source
  fixes both surfaces consistently — no divergence risk.
- **Risk layer currently has NO look-through.** `calculateRiskAnalytics` receives only
  `{ dashboard, portfolioSnapshots, holdingSnapshots, dailyPrices, transactions, benchmarkSnapshots }`;
  both `topHoldingConcentration` and `topFiveConcentration` come from direct `holdingValues`
  (`RiskAnalyticsService.ts:98-102`).
- **Issuer-level look-through IS reachable in the data layer, already computed.**
  `RiskAnalyticsDataService.buildReport` already fetches the latest review (`getLatestReportSummary`,
  line 196) and calls `buildPortfolioExposureContext(canonicalDashboard, latestPortfolioReview)`
  (line 277). That builder produces `issuerExposures: Array<{ issuerId, issuerName, symbols,
  totalWeight, directWeight, indirectWeight }>`, **already sorted descending by `totalWeight`**
  (`PortfolioExposureContextService.ts:34-60`). So issuer top-1 = `issuerExposures[0].totalWeight`,
  top-5 = sum of `issuerExposures.slice(0,5)`. No new repository or fetch needed.

### Files to Change

1. `src/application/services/risk/RiskAnalyticsDataService.ts` — compute the exposure context once
   (refactor the inline `buildPortfolioExposureContext` call into a variable), derive issuer top-1/top-5
   from `issuerExposures`, and pass them into `calculateRiskAnalytics`.
2. `src/application/services/risk/RiskAnalyticsService.ts` — accept optional issuer-level top-1/top-5
   params; feed them to `DiversificationService.score`'s concentration inputs; fall back to direct
   concentration when absent.
3. `src/application/services/risk/riskMath.ts` — no formula change needed if inputs are swapped
   upstream; confirm `concentrationPenalty` semantics still hold.
4. `tests/` — riskMath, risk analytics, and portfolio-review diversification tests.
5. `docs/SCORE_METHODOLOGY.md` + `src/app/methodology/page.tsx` — update the diversification description.

### Caveats to document in the implementation

- **Staleness / bootstrap dependency.** `issuerExposures` come from the LAST stored portfolio review's
  `inputsSnapshot`, not the current run. So issuer-level diversification reflects the previous review's
  look-through, and on first run / no prior review the array is empty → **fall back to direct
  concentration**. This mirrors how sector/country exposure context already works in this service, so
  it is an accepted pattern, but state it explicitly.
- `holdingScore` stays on the DIRECT holding count — load-bearing residual (the 100%-one-ETF sanity
  case depends on it). Do not change it.

### Open sub-decisions (confirm when writing the prompt)

1. Pure-swap (recommended — `holdingScore` is the residual) vs retaining a small reduced direct-level
   concentration penalty. Recommendation: pure-swap.
2. The Risk page's standalone concentration **warnings** (`RiskAnalyticsService.ts:176-177`, "Top
   holding exceeds 25% of invested assets") still use direct concentration. Decide whether those move
   to issuer-level too, or stay as an explicit direct/product-concentration warning. Recommendation:
   leave as direct (they are honestly framed as direct "invested assets"), so the Risk page retains a
   visible single-product signal while the diversification score honors look-through.

### Validation before sign-off

- Risk page diversification and PR diversification move together — confirm the Risk Analytics page
  number change is acceptable.
- Re-validate across sample portfolios (100% VOO, single stock, multi-ETF) for sensible ordering.

---

## Finding A — RESOLVED (folded into Merged Task 1)

**Decision (2026-06-19): Option B (underlying-issuer level) + Total value (incl. cash).**
Implementation now lives in Merged Task 1, Change 1. This section is retained for the root-cause
analysis and the evidence that the 6.89% gap is cash.

Root cause (refined from the live report): the Concentration Review reports `topHoldingConcentration`
at the **wrapper/direct level on an ex-cash basis** (VOO = 32.88%) but `topFiveConcentration` at the
**underlying-issuer level on a total-value basis** (NVDA…LLY = 28%). Two mismatches stacked:

1. **Decomposition level** — wrapper (VOO) vs underlying issuers (NVDA…). VOO isn't in the issuer
   list, so "top one" and "top five" measure different things; top-one can exceed top-five.
2. **Cash basis** — risk analytics excludes cash from the denominator (`RiskAnalyticsService.ts:98–101`);
   Portfolio Review look-through/direct displays use total value including cash.

The score formula (`90 − max(0, topHolding−0.15)×120 − max(0, topCombinedFive−0.50)×80 − …`) also
mixes the two levels, and `topHolding` feeds the risk diversification score via `riskMath`. So any
re-basing has cross-section blast radius. This is why it is held for an explicit decision.

### Evidence: the missing 6.89% is cash (not a data gap)

Confirmed four ways:

1. **Allocation Review states it:** Cash Allocation = 6.89% (Equity 65.11 + Bond 16.96 + Cash 6.89 +
   Gold 5.16 + Crypto 5.89 = 100.01, rounding).
2. **Sector/country tables total 93.11% = 100 − 6.89.** Crypto (5.89%) and Gold (5.16%) *are* listed
   as sector rows, so they are inside the 93.11%. Only cash has no sector/country → it is the gap.
3. **VOO reconciles exactly:** Direct Positions show VOO = 30.62% (of total); concentration metric =
   32.88%. `30.62 ÷ 32.88 = 0.9311 = (1 − 0.0689)` — the concentration denominator removed the 6.89% cash.
4. **Code:** `RiskAnalyticsService.ts:98-101` builds `investedValuations = holdingValuations.filter(value > 0)`
   and divides by their sum. Cash is an allocation, not an instrument holding, so it never enters the denominator.

### Decision 1 — Decomposition level (top-1 vs top-5)

| Option | Pros | Cons |
|---|---|---|
| **A. Two separate views** (direct + underlying, never compared across levels) | Lowest blast radius (display-only; score can stay short-term); keeps both meaningful lenses — product risk AND company risk; the page already has both data blocks (Direct Portfolio Positions + Top Underlying Company Exposure), so this is mostly fixing the metrics panel that pairs a wrapper top-1 with an issuer top-5; honest — a wrapper and a company are different risks | No single headline "concentration" number; the score formula still mixes levels (deferred, not solved); marginally more UI |
| **B. Underlying-issuer level for both** | Most economically meaningful — real issuer concentration drives risk; NVDA 7.87% is the true largest single company; top-1 ≤ top-5 holds naturally; aligns with the platform's look-through philosophy | Requires changing the score's `topHolding` input and re-validating the risk diversification score (`riskMath.ts:342`); a 30% VOO position stops showing as "concentrated" at the headline even though single-product/counterparty/liquidity risk is real; bigger, cross-section change |
| **C. Direct/wrapper level for both** | Simple; matches Direct Positions exactly (VOO 30.62%, top-5 direct = VOO+BND+VT+QQQ+IEF = 58.4%); captures single-product risk; top-1 ≤ top-5 holds | Economically misleading — a diversified ETF dominates the metric and looks dangerous when its underlying is well spread (this is the P4 bug); penalizes sensible index investing; contradicts look-through |

**Claude's recommendation: A now, B-direction later.** Option A stops the contradiction with minimal
risk and preserves both lenses the platform already computes. Treat "should the *score* move to
issuer-level concentration?" as a separate, deliberate methodology change (Option B) with its own validation.

### Decision 2 — Cash basis (denominator)

| Option | Pros | Cons |
|---|---|---|
| **Total value (incl. cash)** | Consistency with everything the user already sees (Direct Positions, look-through, allocation all total-basis); one denominator across the whole report; intuitive "% of my portfolio"; removes the 30.62 vs 32.88 confusion | Cash dilutes the concentration reading (a 50%-cash / 50%-one-stock book would show the stock at 50%, arguably understating invested-book concentration); slightly changes the risk concentration number and diversification score |
| **Invested assets (ex-cash)** | More conservative/standard for concentration analysis; the finding text already says "of invested assets," so wording is correct as-is; cash genuinely isn't a concentration risk | Differs from the total-basis displays everywhere else → the exact cross-section confusion seen now; needs the display side re-based or clearly annotated; two denominators in one report unless fully harmonized |

**Claude's recommendation: Total value (incl. cash), with an explicit basis label.** The whole report
is total-basis; aligning concentration to it removes the confusion the user actually hit, and 6.89%
cash dilution is immaterial here. Reserve ex-cash only if the conservative invested-book reading is
specifically wanted — in which case the displays must be re-based too, not just the metric.

### Net effect of the recommended pair (A + total-basis)

Finding A becomes **low blast radius**: a display/labeling fix in `ConcentrationReviewService` metadata
plus page rendering, with the score formula left for a separate, explicit methodology pass. Safe to
bundle once decided. Two follow-on decisions to log separately:

- Should the concentration **score** move to issuer-level (Option B direction)?
- If ex-cash is ever chosen, re-base all display surfaces (Direct Positions, look-through), not just the metric.

### Decision status

- [x] Decision 1 (decomposition level): **B — underlying-issuer level** (decided 2026-06-19)
- [x] Decision 2 (cash basis): **Total value (incl. cash)** (decided 2026-06-19)

Resolved. Implementation folded into Merged Task 1, Change 1.

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

## P4 — SUPERSEDED by Merged Task 1 (Option B)

> **No longer a separate task.** Option B measures concentration at the issuer level, so a diversified
> wrapper like VOO is never the "top holding" and the false "exceeds 25%" finding cannot fire — P4 is
> structurally solved. The fund-wrapper-aware finding drafted below is **not** being implemented; it is
> retained only as historical context. See Merged Task 1, Change 1.

### Root Cause (historical)

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
