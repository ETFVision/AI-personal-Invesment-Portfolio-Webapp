# Methodology Page & Scoring Refinements — Working Notes

**Status:** OPEN (opened 2026-06-20). Tracks the methodology-page rewrite + a small set of scoring-methodology
refinements that came out of a page-vs-codebase alignment audit and a design-reasoning ("calculation") audit.
Source of truth is the codebase. Delete once the spec sequence below is shipped and validated.

Related: `docs/DOCUMENTATION_GAPS.md` → Prioritized Execution Order (this doc is the detail behind the
methodology/calc items); ties to **Med 26** (golden regression — the Spec 3 validation script is this) and
**Med 29** (recalibration QA — the post-Spec-3 step).

---

## ▶ RESUME HERE — paused 2026-06-20 EOD

### Shipped today (commits on `development`)
- `823a36a`/`7ab03cd` (the latter mislabeled "noop") — **#3** Concentration/Diversification split. Verified live (Diversification 88→89, Concentration unchanged 90, overall 85).
- `f31f3db` — **#5** orthogonal Quality sub-score. Tests pass; orthogonality met on fixture + live data — **BUT measured with ROIC durability dormant (ROIC was null), so it is PROVISIONAL.**
- `87e5a1e` — **ROIC provider fix**: source `roic` from FMP `key-metrics` (the `/ratios` endpoint doesn't carry it). See [[fmp-stable-ratios-lacks-roic]].
- `ba11fde` — **"Force refresh fundamentals"** button on Admin → Data Sources (the routine button does NOT force).

### ✅ CLOSED 2026-06-20 — ROIC verified + #5 orthogonality re-check passed
ROIC populated across the universe (force-refresh rotation fix `e4260c5` worked). #5 orthogonality re-check
**with ROIC durability live** (n=105): Quality vs Profitability **0.323**, vs Cash Flow **0.303**, vs Balance
Sheet **−0.073** — all < ~0.4. **#5 is validated and DONE**; no `roicDurability` level→consistency tweak
needed (optional future polish only). q_vs_profitability rose from the dormant-ROIC baseline 0.153 → 0.323
(expected — ROIC level is shared with Profitability) but stayed well under threshold.

### (historical) The open loop that is now closed — steps were:
1. Admin → Data Sources → **Force refresh fundamentals** — click ~**3 times** (cap 50, universe 105; the batch now rotates oldest-first per commit `e4260c5`). Watch missing-ROIC drop 55 → ~5 → 0.
2. Run **`recommendation-run`** from Admin (recompute Characteristics/Quality with live ROIC).
3. Confirm ROIC coverage in Supabase SQL editor:
   ```sql
   with active_stocks as (select id from instruments where instrument_type='stock' and is_active=true),
        roic_stocks   as (select distinct instrument_id from financial_ratios where period='annual' and roic is not null)
   select (select count(*) from active_stocks) as active_stocks,
          (select count(*) from active_stocks s join roic_stocks r on r.instrument_id=s.id) as stocks_with_roic;
   ```
   Expect `stocks_with_roic` at/near 105 (a few financials may legitimately be null).
4. **Re-run the #5 orthogonality check** — correlation of Quality vs Profitability / Cash Flow / Balance Sheet across the 105 stocks, now that `roicDurability` is ACTIVE:
   - stays **< ~0.4** → #5 is fully validated with all four signals live → mark #5 DONE.
   - rises **above ~0.4** → `roicDurability` (uses ROIC *level*, shared with Profitability) needs redefining to ROIC *consistency/durability over time* (CoV of ROIC, or sustained ROIC>threshold). Small follow-up spec.

### ✅ DONE (2026-06-20, commit `7a8b5f3`) — Financial-sector scoring fix
Insurers (CB/BRK.B) now caught (detection gates on Financial sector + banks/capital-markets/insurance/
broker/thrifts/mortgage industries); #5 Quality excludes cash-conversion + ROIC for balance-sheet
financials; fee-based (V/MA/PYPL/BLK) stay industrial. Orthogonality re-verified live (Quality vs
Profitability 0.361 / Cash Flow −0.002 / Balance Sheet −0.116, all < 0.4 — note the 0.361 margin is thinner;
optional ROE/ROA bank-quality substitute remains a future lever). Needs Admin force-refresh + recommendation-
run to rescore the ~11 financials. *Original finding/spec below, retained for history:*

### (history) Financial-sector scoring fix — the spec that was run
Found a gap: `isFinancialSector` (`FundamentalScoringService.ts:64`) = `profile.industry` contains
"banks"/"capital markets" only → catches 9/16 universe financials but **misses insurers CB & BRK.B**
(they get industrial debt/equity + FCF scoring the doc says is wrong for financials). Separately, the **#5
Quality redesign applies cashConversion + ROIC to banks** — re-introducing the metrics excluded elsewhere.
Fix spec written (in chat / to paste): Step 1 enumerate live `company_profiles.industry` for the 16
Financials; Step 2 robust curated detection (banks + capital markets + **insurance**; NOT fee-based V/MA/
PYPL/BLK), gated on canonical Financials sector; Step 3 exclude cashConversion + roicDurability from Quality
for balance-sheet financials (drop from denominator; optional future: substitute ROE/ROA durability); Step 4
reconcile SCORE_METHODOLOGY §Financial Sector + limitation note; re-run orthogonality check. **Recommend
running this FIRST** (completes #5 correctly; must precede the Spec 2 methodology rewrite).

### Then — remaining specs (ready). Sequence: Financial-sector fix → Spec 3b (parallel) → Spec 1 → Spec 2 (last)
- **Spec 3b (#2)** — ETF "Benchmark Relative" → true relative vs external benchmark. **Written and ready to hand to Codex.** Part 0 seeds EFA (`developed_ex_us`) + EEM (`emerging_markets`) benchmarks — both confirmed FMP-covered. Independent of the ROIC loop; can run any time.
- **Spec 1** — Fundamentals surfaces (Fundamentals page, instrument detail, directory) → show Business Quality + separate Valuation; retire the valuation-blended six-category "Overall" from the UI (still live in code today). Pre-check internal consumers before retiring.
- **Spec 2** — Methodology page + docs end-user/compliance rewrite: Fundamentals→Business Quality naming, single Business Quality table, strip dev language, remove stale phase-1, mark dead portfolio-dependent guardrails inactive, **+ the Tier-1/2 calc-audit disclosures** (see below). Do this LAST so it documents the final state of #2/#3/#5.

### Calc-audit findings status (from the design review)
- #2 Benchmark-relative → **change** (Spec 3b, ready). #3 Concentration overlap → **done** (#3 shipped). #5 Quality overlap → **done, pending ROIC re-check**.
- Disclose-only (land in Spec 2): #1 Portfolio-score effective ceiling (~mid-80s); #4 Business Quality includes 25% Growth; #6 absolute (non-sector-relative) thresholds; #7 regime-dependence; #8 Geography 0% weight.

### Also open / housekeeping
- Cosmetic carry-along: exec-summary pluralization ("1 watch areas" → "1 watch area") — see [[portfolio-review-exec-summary-pluralization]].
- The `7ab03cd` "noop" commit message is a cosmetic mislabel (content correct); branch protection blocked the relabel — leave it.

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
