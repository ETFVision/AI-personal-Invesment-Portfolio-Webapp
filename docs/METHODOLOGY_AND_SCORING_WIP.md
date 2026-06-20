# Methodology Page & Scoring Refinements — Working Notes

**Status:** OPEN (opened 2026-06-20). Tracks the methodology-page rewrite + a small set of scoring-methodology
refinements that came out of a page-vs-codebase alignment audit and a design-reasoning ("calculation") audit.
Source of truth is the codebase. Delete once the spec sequence below is shipped and validated.

Related: `docs/DOCUMENTATION_GAPS.md` → Prioritized Execution Order (this doc is the detail behind the
methodology/calc items); ties to **Med 26** (golden regression — the Spec 3 validation script is this) and
**Med 29** (recalibration QA — the post-Spec-3 step).

---

## Verification result (page vs code, 2026-06-20)
A full alignment pass confirmed the public methodology page's **math matches the codebase**. Everything
checked aligned: all five Characteristics-Score instrument-type weight tables; every component formula
(momentum, risk, theme, macro fit, Market Vision alignment, business quality); the confidence formula; the
label bands; the portfolio composite weights and all eight section formulas; the diversification formula;
Risk Analytics (vol ×√252, proxy weights, instrument-risk composite 35/35/20/10, buckets — incl. migration
`043`); Fundamentals (overall weights, Business Quality sub-weights, normalization helpers, quality-valuation
adjustment, confidence ÷16); and Market Vision macro constants (`MacroTrendService`). **No numeric/formula
errors.** The required changes are naming, structure, disclosure, and a few deliberate refinements.

## Resolved decisions
- **Phase-2 is canonical.** The Stock table (Business Quality 40 / Valuation 20 / Trends 15 / Risk 10 / MV 7 /
  Theme 5 / Mom 3) and the BQ<35 / Val<15 guardrails are the current model. The phase-1 model (Fundamentals
  32% table, `fundamentals<35` / `valuation<25` guardrails) is **stale → remove from all docs + page**, and
  make phase-2 unconditional in code (delete `ENABLE_STOCK_PHASE2_SCORES` + the `else` branch). Confirm the
  flag is set to `true` in prod before removing.
- **Fundamentals = Business Quality (valuation excluded).** Product decision: a company's fundamental health
  is Business Quality (Growth/Profitability/Cash Flow/Balance Sheet/Quality, valuation removed). Valuation is
  shown **separately** because it reflects market price, not business health. Valuation is finally taken into
  the Characteristics Score, where Business Quality is the majority weight (40%) so quality drives the score.
- **The six-category "Overall Fundamental Score" is still live and user-facing** (Fundamentals page,
  instrument detail "Overall", directory) — it is **not** obsolete in code. The fix is to switch those
  surfaces to Business Quality + separate Valuation, then retire the valuation-blended "Overall" from the UI.
- **Generalization / calibration principle.** Thresholds and scales are **fixed, economically anchored
  constants**, validated once against the active universe and reviewed on a scheduled basis — **not refit to
  each data refresh**. Relative measures reference an **external benchmark**, so a score changes only when the
  instrument or the market moves, not when the universe composition changes.

## Spec sequence (build in this order)
1. **#3 — Concentration / Diversification split** *(spec written).* Remove the `concentrationPenalty` from the
   `riskMath.ts` diversification formula so Concentration owns concentration and Diversification owns breadth +
   correlation; no more ~30% double-count. Lowest effort; no calibration. Update the three methodology docs +
   page formula line.
2. **Spec 1 — Fundamentals surfaces → Business Quality + separate Valuation** *(to write).* Code/UX change on
   the Fundamentals page, instrument detail, and directory: show Business Quality as the headline "Fundamentals"
   number, Valuation as a separate metric; retire the valuation-blended Overall from the UI. Confirm no
   internal consumer (guardrail/telemetry) breaks before retiring it.
3. **Spec 2 — Methodology page + docs rewrite** *(to write).* End-user/compliance rewrite: rename Fundamentals
   → Business Quality (no "Fundamentals Score" umbrella); single Business Quality table (Growth 25 /
   Profitability 25 / Cash Flow 20 / Balance Sheet 15 / Quality 15); remove the six-category table from the
   user page; strip developer/changelog/version language ("V1", "phase", "prevent double-counting"); remove
   stale phase-1 from docs; mark the three dead portfolio-dependent guardrails inactive; **plus the Tier-1/2
   disclosures below.** Bump `METHODOLOGY_LAST_UPDATED`.
4. **Spec 3 — #2 + #5 scoring refinements** *(spec written).* ETF Benchmark Relative → true relative vs a
   stable external asset-class benchmark (frozen `SCALE`, seed 200), de-overlapped from Momentum; Quality
   sub-score → orthogonal (earnings stability / cash conversion / ROIC durability / capital discipline, with
   absolute economic anchors). Includes a **validation + sign-off gate**: a one-off universe pass reports the
   Part A score distribution + benchmark coverage and the Part B orthogonality correlation matrix (target each
   < ~0.4 vs Profitability/Cash Flow/Balance Sheet); constants frozen after sign-off, anchor regression tests
   pinned. Runs **after #3 and Spec 1**. Follow with Med 29 recalibration QA.

## Calculation-audit findings (change-the-math vs disclose-only)
Tier-1:
1. **Portfolio Score effective ceiling (~mid-80s, not 100)** — *disclose now*; optional post-alpha rescale.
2. **ETF "Benchmark Relative" = absolute 1Y return (misnomer + 1Y double-count)** — *change* (Spec 3 #2).
3. **Concentration ~30% of score (Concentration + Diversification overlap)** — *change* (#3) + disclose.
4. **"Business Quality" includes 25% Growth (quality+growth blend)** — *disclose only* (keep weight).
5. **"Quality" sub-score overlaps other categories** — *change* (Spec 3 #5, make it orthogonal).

Tier-2 (disclose-only): 6. absolute (non-sector-relative) thresholds; 7. bond/gold/crypto scores are
regime-dependent; 8. Geography at 0% weight (diagnostic only). All land as methodology/Limitations copy in
Spec 2.

## Companion code-hygiene item
Make phase-2 unconditional: delete `ENABLE_STOCK_PHASE2_SCORES`, the phase-1 `else` branch in
`StockRecommendationService`, the phase-1 guardrail branch in `RecommendationRulesService`, and the commented
flag in `.env.example`. Confirm prod has the flag `=true` first. Pairs with Spec 2.
