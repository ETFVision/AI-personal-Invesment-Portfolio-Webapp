# Bond Intelligence Layer Design

## 1. Objective

The Bond Intelligence Layer helps the app classify, score, explain, and recommend bond ETF exposure inside an ETF-first portfolio.

Phase 1 should support bond ETFs rather than individual bonds. Individual bonds add complexity around maturity schedules, coupon payments, credit events, liquidity, tax treatment, and execution. Bond ETFs are a better fit for the app's initial operating model because they are easier to price, compare, rebalance, and analyze.

The layer should answer:

- What role does each bond ETF play?
- How sensitive is the bond allocation to interest rates, inflation, recession risk, credit spreads, and liquidity stress?
- Is the portfolio's fixed-income exposure appropriate for the user's risk profile and time horizon?
- Should new capital go into ultra-short, short, intermediate, long-duration, inflation-linked, aggregate, Treasury, corporate, high-yield, or international bond ETFs?
- How should bond intelligence affect recommendations, scenarios, and Market Vision?

## 2. Phase 1 Scope

Supported:

- Bond ETFs.
- Treasury ETFs.
- Aggregate bond ETFs.
- Corporate bond ETFs.
- Investment-grade bond ETFs.
- High-yield bond ETFs.
- Inflation-linked bond ETFs.
- International bond ETFs.
- Cash-like ultra-short bond ETFs.

Not supported in Phase 1:

- Individual bonds.
- Bond ladders.
- Municipal bond tax optimization.
- Callable bond modeling.
- Exact yield-to-maturity by constituent.
- Credit event prediction.
- Intraday fixed-income trading signals.

## 3. Bond ETF Classification

Every bond ETF should be classified across five required dimensions:

### Duration

- `ultra_short`: typically below 1 year.
- `short`: typically 1-3 years.
- `intermediate`: typically 3-7 years.
- `long`: typically above 7 years.

Duration classification should use effective duration when available. If effective duration is unavailable, use category metadata, provider description, or a manually maintained classification.

### Credit Quality

- `treasury`: sovereign Treasury exposure, generally no corporate credit risk.
- `investment_grade`: corporate or aggregate exposure mostly investment grade.
- `high_yield`: below-investment-grade credit exposure.
- `mixed`: blended quality, multi-sector, aggregate, international, or unclear.

### Type

- `government`
- `corporate`
- `aggregate`
- `inflation_linked`
- `international`

### Currency

Primary currency of pricing and exposure, for example:

- `USD`
- `SGD`
- `EUR`
- `GBP`
- `JPY`
- `mixed`

### Geographic Exposure

Examples:

- `us`
- `global`
- `developed_ex_us`
- `emerging_markets`
- `single_country`
- `mixed`

## 4. Bond ETF Categories

### Cash-Like and Ultra-Short Bond ETFs

Role:

- Liquidity reserve.
- Lower volatility.
- Cash yield enhancement.
- Parking capital before deployment.

Typical traits:

- Ultra-short duration.
- Lower rate sensitivity.
- Lower volatility.
- Lower return potential.

Risks:

- Reinvestment risk.
- Modest credit risk if not pure Treasury.
- May underperform longer-duration bonds when rates fall sharply.

### Short-Term Treasury ETFs

Role:

- Defensive ballast.
- Liquidity.
- Lower volatility government exposure.

Typical traits:

- Short duration.
- Treasury credit quality.
- Lower credit-spread sensitivity.

Risks:

- Lower upside in recessionary rate-cut environments than long-duration Treasuries.
- Rate sensitivity still present.

### Intermediate Treasury ETFs

Role:

- Core defensive Treasury exposure.
- Moderate duration ballast.
- Recession hedge.

Typical traits:

- Intermediate duration.
- Treasury quality.
- More rate sensitivity than short-term ETFs.

Risks:

- Can decline when rates rise.
- May underperform credit in strong risk-on environments.

### Long Treasury ETFs

Role:

- High-duration recession hedge.
- Strong sensitivity to falling rates.
- Portfolio convexity-like ballast during some equity drawdowns.

Typical traits:

- Long duration.
- High rate sensitivity.
- Higher volatility than short/intermediate bonds.

Risks:

- Significant losses when rates rise.
- Poor fit for users who cannot tolerate bond volatility.

### Aggregate Bond ETFs

Role:

- Core fixed-income allocation.
- Broad exposure to government, securitized, and investment-grade corporate bonds.

Typical traits:

- Intermediate duration.
- Mixed government and investment-grade credit.
- Useful default bond allocation.

Risks:

- Contains both rate and credit-spread sensitivity.
- May not be defensive enough in severe credit stress.

### Investment-Grade Corporate Bond ETFs

Role:

- Income enhancement.
- Credit exposure.
- Moderate portfolio diversifier.

Typical traits:

- Investment-grade corporate credit.
- Spread sensitivity.
- Duration varies by fund.

Risks:

- Credit spreads can widen during recessions.
- More correlated with equities than Treasuries.

### High-Yield Bond ETFs

Role:

- Income/risk asset satellite.
- Tactical credit exposure.

Typical traits:

- Below-investment-grade credit.
- High spread sensitivity.
- Equity-like behavior in stress periods.

Risks:

- Drawdowns during recessions.
- Liquidity stress.
- Default risk embedded in ETF holdings.
- Should not be treated as defensive ballast.

### Inflation-Linked Bond ETFs

Role:

- Inflation protection.
- Real-rate exposure.
- Diversifier for inflationary environments.

Typical traits:

- Treasury inflation-protected securities or local equivalent.
- Inflation sensitivity.
- Real-rate sensitivity.

Risks:

- Can decline when real rates rise.
- Not a perfect hedge for short-term inflation surprises.

### International Bond ETFs

Role:

- Geographic and currency diversification.
- Exposure to non-US rate cycles.

Typical traits:

- Foreign sovereign, aggregate, or corporate exposure.
- May be hedged or unhedged.

Risks:

- Currency risk if unhedged.
- Sovereign risk.
- Data comparability may be weaker.

## 5. Recommended Phase 1 Bond ETF Universe

The exact tickers can be configurable by market and user location. For a USD-centric MVP, use a compact universe of liquid ETFs.

| Role | Example ETF | Category |
| --- | --- | --- |
| Ultra-short cash-like | SGOV | Ultra-short Treasury |
| Ultra-short cash-like | BIL | 1-3 month Treasury |
| Short Treasury | SHY | 1-3 year Treasury |
| Intermediate Treasury | IEF | 7-10 year Treasury |
| Long Treasury | TLT | 20+ year Treasury |
| Aggregate core | AGG | US aggregate bond |
| Aggregate core | BND | Total US bond market |
| Investment-grade corporate | LQD | Investment-grade corporate |
| Short corporate | VCSH | Short-term corporate |
| High-yield credit | HYG | High-yield corporate |
| High-yield credit | JNK | High-yield corporate |
| Inflation-linked | TIP | US TIPS |
| Short inflation-linked | VTIP | Short-term TIPS |
| International aggregate | BNDX | International bonds |
| Emerging market bonds | EMB | USD emerging market bonds |

Recommended Phase 1 active set:

- 8-12 bond/gold/cash proxy ETFs in the main watchlist universe.
- 10-15 bond ETFs in the internal classification catalog.
- User-facing recommendations should usually surface only 2-4 bond ETF candidates at a time.

## 6. Scoring Framework

The Bond Intelligence Layer should calculate several scores rather than one opaque rank.

Recommended scores:

- `duration_fit_score`
- `credit_quality_score`
- `income_score`
- `stability_score`
- `recession_hedge_score`
- `inflation_hedge_score`
- `liquidity_score`
- `portfolio_fit_score`
- `rate_regime_fit_score`
- `spread_regime_fit_score`
- `overall_bond_fit_score`

### Score Implications

| Condition | Implication |
| --- | --- |
| High stability, low duration, Treasury quality | Good cash reserve or defensive parking candidate |
| Intermediate Treasury or aggregate with strong fit | Good core fixed-income candidate |
| Long Treasury and recession risk rising | Potential hedge, but volatility warning required |
| High-yield credit and recession risk rising | Reduce or avoid defensive classification |
| TIPS and inflation risk rising | Consider inflation-linked allocation |
| Corporate spreads tight and recession risk rising | Caution on credit-heavy exposure |
| Cash is high and bond allocation low | Suggest staged allocation into short/intermediate bond ETFs |

### Scoring Pseudo-Code

```ts
export function scoreBondEtf(input: BondEtfScoringInput): BondEtfScore {
  const durationFitScore = scoreDurationFit({
    effectiveDuration: input.profile.effectiveDuration,
    userRiskProfile: input.userRiskProfile,
    targetRole: input.targetRole,
  });

  const creditQualityScore = scoreCreditQuality(input.profile.creditQuality);
  const incomeScore = scoreIncome(input.profile.yieldToMaturity, input.macro);
  const stabilityScore = scoreStability(input.profile, input.priceHistory);
  const recessionHedgeScore = scoreRecessionHedge(input.profile, input.macro);
  const inflationHedgeScore = scoreInflationHedge(input.profile, input.macro);
  const liquidityScore = scoreLiquidity(input.profile.aum, input.profile.averageVolume);
  const portfolioFitScore = scoreBondPortfolioFit(input.profile, input.portfolio);
  const rateRegimeFitScore = scoreRateRegimeFit(input.profile, input.macro);
  const spreadRegimeFitScore = scoreSpreadRegimeFit(input.profile, input.macro);

  const overallBondFitScore = weightedAverage({
    durationFitScore,
    creditQualityScore,
    incomeScore,
    stabilityScore,
    recessionHedgeScore,
    inflationHedgeScore,
    liquidityScore,
    portfolioFitScore,
    rateRegimeFitScore,
    spreadRegimeFitScore,
  });

  return {
    durationFitScore,
    creditQualityScore,
    incomeScore,
    stabilityScore,
    recessionHedgeScore,
    inflationHedgeScore,
    liquidityScore,
    portfolioFitScore,
    rateRegimeFitScore,
    spreadRegimeFitScore,
    overallBondFitScore,
  };
}
```

## 7. Duration Logic

Duration is the primary estimate of interest-rate sensitivity.

Approximate rule:

```text
Estimated price impact = -effective duration * change in yield
```

Example:

- ETF effective duration: 7 years.
- Interest rates rise by 1.00%.
- Estimated price impact: about -7%.

This is only an approximation. Convexity, yield curve shape, credit spreads, and fund composition can change the actual result.

### Duration Buckets

```ts
export function classifyDuration(effectiveDurationYears: number | null): DurationBucket {
  if (effectiveDurationYears == null) return "unknown";
  if (effectiveDurationYears < 1) return "ultra_short";
  if (effectiveDurationYears < 3) return "short";
  if (effectiveDurationYears < 7) return "intermediate";
  return "long";
}
```

### User Fit Logic

```ts
export function preferredDurationBands(profile: UserRiskProfile): DurationBucket[] {
  switch (profile) {
    case "conservative":
      return ["ultra_short", "short", "intermediate"];
    case "balanced":
      return ["short", "intermediate"];
    case "growth":
      return ["intermediate"];
    case "aggressive":
      return ["ultra_short", "short"];
  }
}
```

Interpretation:

- Conservative users may need bonds for stability, so ultra-short through intermediate duration can be appropriate.
- Balanced users often use intermediate duration as core ballast.
- Growth users may use intermediate bonds mainly as a diversifier.
- Aggressive users may hold mostly cash-like or short-duration bonds unless they explicitly want recession hedging.

## 8. Sensitivity Estimates

### Interest-Rate Sensitivity

Inputs:

- Effective duration.
- Historical volatility.
- Treasury yield movement.
- Yield curve segment.

Output:

- Low, medium, or high sensitivity.
- Estimated impact for +1% and -1% rate moves.

```ts
export function estimateRateShockImpact(
  marketValue: number,
  effectiveDuration: number,
  rateShockBps: number,
): number {
  const rateShock = rateShockBps / 10_000;
  return marketValue * -effectiveDuration * rateShock;
}
```

### Inflation Sensitivity

High:

- TIPS and inflation-linked ETFs.
- Short-duration instruments that reset quickly.

Medium:

- Ultra-short and short-duration bonds.

Low or negative:

- Long nominal bonds, especially when inflation pushes rates higher.

### Recession Sensitivity

Potentially positive:

- Treasury ETFs, especially intermediate and long duration if rates fall.

Potentially negative:

- High-yield corporate bonds.
- Credit-heavy aggregate exposures.
- Emerging market debt.

Mixed:

- Investment-grade corporate bonds.
- Aggregate bonds.

### Credit-Spread Sensitivity

High:

- High-yield ETFs.
- Emerging market bond ETFs.

Medium:

- Investment-grade corporate ETFs.
- Aggregate bond ETFs.

Low:

- Treasury ETFs.
- TIPS ETFs.
- Treasury bills and ultra-short Treasury ETFs.

### Liquidity and Stability Role

Classifications:

- `cash_like`
- `defensive_ballast`
- `core_income`
- `inflation_hedge`
- `credit_income`
- `risk_asset_proxy`
- `diversifier`

High-yield bond ETFs should usually be classified closer to risk assets than defensive bonds.

## 9. Macro Regime Logic

The Bond Intelligence Layer should consume macro indicators from FRED and market data providers.

Useful inputs:

- Fed funds rate.
- 3-month Treasury yield.
- 2-year Treasury yield.
- 10-year Treasury yield.
- 10-year minus 2-year spread.
- Inflation rate or CPI trend.
- Breakeven inflation if available.
- Investment-grade credit spreads.
- High-yield credit spreads.
- Unemployment trend.
- Equity drawdown or volatility proxy.

### Regime Labels

Suggested labels:

- `falling_rates`
- `rising_rates`
- `stable_rates`
- `inverted_curve`
- `steepening_curve`
- `disinflation`
- `inflation_pressure`
- `credit_stress`
- `risk_on`
- `risk_off`
- `recession_watch`

### Macro Interpretation Rules

```ts
export function inferBondMacroRegime(input: MacroSnapshot): BondMacroRegime {
  return {
    rateTrend:
      input.tenYearYieldChange90d > 0.005 ? "rising_rates" :
      input.tenYearYieldChange90d < -0.005 ? "falling_rates" :
      "stable_rates",

    curve:
      input.tenYearMinusTwoYear < 0 ? "inverted_curve" :
      input.tenYearMinusTwoYearChange90d > 0.003 ? "steepening_curve" :
      "normal_curve",

    inflation:
      input.cpiTrend90d > 0.002 ? "inflation_pressure" : "disinflation",

    credit:
      input.highYieldSpreadChange90d > 0.01 ? "credit_stress" : "normal_credit",

    risk:
      input.equityDrawdownFromHigh > 0.1 ? "risk_off" : "risk_on",
  };
}
```

### Regime-to-Bond Implications

| Regime | Likely Bond Implication |
| --- | --- |
| Rising rates | Favor shorter duration; caution on long-duration bonds |
| Falling rates | Longer duration may benefit, especially Treasuries |
| Inflation pressure | Consider TIPS or short-duration exposure |
| Disinflation | Intermediate and long Treasuries may become more attractive |
| Credit stress | Favor Treasuries over high-yield or credit-heavy exposure |
| Risk off | Treasury ballast may be useful; high yield may behave like equities |
| Risk on | Credit exposure can perform, but may reduce defensive quality |
| Inverted curve | Short-duration yields may be attractive; recession watch may increase |

## 10. Integration With Core App Layers

### Initial Capital Allocation Engine

Bond intelligence should help select the fixed-income sleeve of the initial allocation.

Inputs:

- User risk profile.
- Investment horizon.
- Cash reserve target.
- Existing holdings.
- Macro regime.
- Bond ETF scores.

Outputs:

- Suggested bond allocation percentage.
- Suggested split by duration.
- Suggested split by credit quality.
- Candidate ETFs.
- Rationale.

Example:

```text
Balanced user:
- 20% fixed income target.
- 5% ultra-short Treasury/cash-like.
- 10% aggregate or intermediate Treasury.
- 5% TIPS or short-term TIPS if inflation pressure is elevated.
```

### Market Vision

Market Vision should include a Bond and Rates panel.

Outputs:

- Rate trend.
- Yield curve status.
- Inflation trend.
- Credit-spread condition.
- Bond ETF category implications.
- Portfolio-specific bond note.

### Scenario Analysis

Bond intelligence should provide shock assumptions and estimates.

Scenarios:

- Rates up 1%.
- Rates down 1%.
- Inflation shock.
- Recession/risk-off.
- Credit-spread widening.
- Yield curve steepening.

### Risk Analytics

Risk analytics should include:

- Portfolio duration estimate.
- Bond sleeve duration estimate.
- Bond credit quality mix.
- Treasury versus corporate split.
- High-yield exposure.
- Inflation-linked exposure.
- Currency and geography exposure.
- Estimated rate shock impact.

### Recommendation Engine

Recommendations should use bond intelligence to:

- Flag duration mismatch.
- Recommend shorter duration if rate risk is too high.
- Recommend Treasury ballast if equity risk is high and fixed income is low.
- Warn that high-yield ETFs are not defensive bonds.
- Suggest TIPS when inflation sensitivity is desired.
- Suggest reducing credit exposure during credit stress.

### Telemetry Learning

Telemetry should learn:

- Whether the user accepts bond recommendations.
- Whether the user prefers stability over yield.
- Whether the user avoids duration risk.
- Whether the user reacts defensively during drawdowns.
- Whether the user repeatedly ignores bond allocation suggestions.

## 11. Scenario Analysis Integration

### Rate Shock Scenario

```ts
export function runBondRateShockScenario(input: {
  holdings: BondHolding[];
  rateShockBps: number;
}): BondScenarioResult {
  const impacts = input.holdings.map((holding) => ({
    holdingId: holding.id,
    symbol: holding.symbol,
    estimatedImpact: estimateRateShockImpact(
      holding.marketValue,
      holding.effectiveDuration,
      input.rateShockBps,
    ),
  }));

  return {
    scenario: `rates_${input.rateShockBps > 0 ? "up" : "down"}`,
    totalEstimatedImpact: sum(impacts.map((impact) => impact.estimatedImpact)),
    impacts,
  };
}
```

### Credit Spread Shock

Credit spread sensitivity can be estimated through category-level assumptions when fund-level spread duration is unavailable.

Example assumptions:

- Treasury: minimal spread impact.
- Aggregate: moderate spread impact.
- Investment grade corporate: medium-high spread impact.
- High yield: high spread impact.
- Emerging market debt: high spread and currency impact.

```ts
export function estimateCreditSpreadShockImpact(
  holding: BondHolding,
  spreadShockBps: number,
): number {
  const sensitivity = getSpreadSensitivityMultiplier(holding.creditQuality, holding.type);
  return holding.marketValue * -sensitivity * (spreadShockBps / 10_000);
}
```

### Recession Scenario

Combine:

- Equity drawdown assumptions.
- Treasury rate decline assumptions.
- Credit spread widening assumptions.
- High-yield drawdown assumptions.
- Flight-to-quality behavior.

Bond output should explain which bond ETFs help and which behave like risk assets.

## 12. Database Design

### Tables

```sql
create table bond_etf_profiles (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  duration_bucket text not null,
  effective_duration numeric,
  credit_quality text not null,
  bond_type text not null,
  currency text not null,
  geographic_exposure text not null,
  yield_to_maturity numeric,
  sec_yield numeric,
  expense_ratio numeric,
  aum numeric,
  average_volume numeric,
  distribution_frequency text,
  stability_role text,
  data_source text not null,
  data_as_of date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id)
);

create table bond_etf_scores (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  score_date date not null,
  duration_fit_score numeric,
  credit_quality_score numeric,
  income_score numeric,
  stability_score numeric,
  recession_hedge_score numeric,
  inflation_hedge_score numeric,
  liquidity_score numeric,
  portfolio_fit_score numeric,
  rate_regime_fit_score numeric,
  spread_regime_fit_score numeric,
  overall_bond_fit_score numeric,
  score_inputs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (asset_id, score_date)
);

create table bond_macro_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  fed_funds_rate numeric,
  treasury_3m numeric,
  treasury_2y numeric,
  treasury_10y numeric,
  ten_year_minus_two_year numeric,
  cpi_yoy numeric,
  breakeven_inflation_10y numeric,
  investment_grade_spread numeric,
  high_yield_spread numeric,
  rate_regime text,
  curve_regime text,
  inflation_regime text,
  credit_regime text,
  risk_regime text,
  raw_inputs jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table bond_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id),
  snapshot_date date not null,
  total_bond_value numeric not null,
  weighted_duration numeric,
  treasury_weight numeric,
  investment_grade_weight numeric,
  high_yield_weight numeric,
  inflation_linked_weight numeric,
  international_weight numeric,
  currency_exposure jsonb not null default '{}',
  geography_exposure jsonb not null default '{}',
  estimated_impact_rates_up_100bps numeric,
  estimated_impact_rates_down_100bps numeric,
  created_at timestamptz not null default now(),
  unique (portfolio_id, snapshot_date)
);
```

### Enum-Like Values

`duration_bucket`:

- `ultra_short`
- `short`
- `intermediate`
- `long`
- `unknown`

`credit_quality`:

- `treasury`
- `investment_grade`
- `high_yield`
- `mixed`

`bond_type`:

- `government`
- `corporate`
- `aggregate`
- `inflation_linked`
- `international`

`stability_role`:

- `cash_like`
- `defensive_ballast`
- `core_income`
- `inflation_hedge`
- `credit_income`
- `risk_asset_proxy`
- `diversifier`

## 13. Repository and Service Interfaces

```ts
export interface BondIntelligenceRepository {
  getBondEtfProfile(assetId: string): Promise<BondEtfProfile | null>;
  listBondEtfProfiles(): Promise<BondEtfProfile[]>;
  upsertBondEtfProfile(profile: BondEtfProfile): Promise<void>;
  saveBondEtfScore(score: BondEtfScore): Promise<void>;
  saveBondMacroSnapshot(snapshot: BondMacroSnapshot): Promise<void>;
  saveBondPortfolioSnapshot(snapshot: BondPortfolioSnapshot): Promise<void>;
}
```

```ts
export interface BondIntelligenceService {
  classifyBondEtf(asset: Asset): Promise<BondEtfProfile>;
  scoreBondEtf(assetId: string, context: BondScoringContext): Promise<BondEtfScore>;
  evaluatePortfolioBondExposure(portfolioId: string): Promise<BondPortfolioAnalysis>;
  generateBondAllocationCandidates(input: BondAllocationInput): Promise<BondAllocationSuggestion[]>;
  runBondScenario(input: BondScenarioInput): Promise<BondScenarioResult>;
}
```

## 14. UI Components

### Bond Intelligence Panel

Appears on portfolio dashboard.

Shows:

- Bond allocation percentage.
- Weighted duration.
- Credit quality mix.
- Treasury versus corporate split.
- Estimated +1% and -1% rate shock impact.
- Role summary: cash-like, ballast, income, inflation hedge, or credit risk.

### Bond ETF Detail Drawer

Shows:

- Duration bucket.
- Effective duration.
- Credit quality.
- Bond type.
- Currency.
- Geographic exposure.
- Yield fields.
- Expense ratio.
- Rate sensitivity.
- Inflation sensitivity.
- Recession sensitivity.
- Credit-spread sensitivity.
- Liquidity/stability role.

### Market Vision Bond and Rates Card

Shows:

- Current rate regime.
- Yield curve status.
- Inflation regime.
- Credit spread regime.
- Implications for short, intermediate, long, TIPS, and high-yield ETFs.

### Scenario Analysis Bond Impact Table

Columns:

- Symbol.
- Bond category.
- Market value.
- Duration.
- Rate shock impact.
- Credit-spread shock impact.
- Scenario note.

### Allocation Engine Bond Sleeve Builder

Controls:

- Target bond allocation.
- Stability versus income preference.
- Duration preference.
- Inflation protection toggle.
- Credit exposure limit.

Outputs:

- Suggested ETF mix.
- Duration estimate.
- Credit mix.
- Scenario vulnerability.

## 15. Telemetry Considerations

Track:

- User accepts or rejects bond allocation suggestion.
- User chooses shorter duration than recommended.
- User chooses higher yield or credit risk than recommended.
- User reduces high-yield exposure after warning.
- User ignores rate sensitivity warnings.
- User frequently holds excess cash instead of bond ETFs.
- User adds TIPS after inflation-related Market Vision note.
- User sells long-duration bonds after drawdown.

Derived preferences:

- Stability preference.
- Income preference.
- Duration tolerance.
- Credit risk tolerance.
- Inflation hedge interest.
- Cash comfort level.

Telemetry should adjust:

- Recommendation tone.
- Default bond sleeve examples.
- Whether to prioritize stability, income, inflation protection, or recession hedging.

Telemetry should not:

- Encourage higher credit risk just because the user chased yield once.
- Automatically reclassify user risk tolerance based on one action.
- Hide risk warnings due to repeated dismissal.

## 16. Example Outputs

### Example Portfolio Bond Summary

```text
Your bond sleeve is 14.2% of the portfolio with an estimated weighted duration of 5.8 years.

Most of the exposure is intermediate-duration aggregate bonds, so the sleeve has moderate interest-rate sensitivity and some credit-spread sensitivity. A 1% rise in rates is estimated to reduce the bond sleeve by about 5.8%, before any spread or income effects.

The current bond allocation is acting as core income, but it is not a pure defensive Treasury ballast.
```

### Example Recommendation

```text
Consider shifting part of the bond sleeve from high-yield credit to short or intermediate Treasuries.

Reason: credit spreads are widening, recession risk is rising, and the current high-yield ETF behaves more like a risk asset than a defensive bond. This would reduce credit-spread sensitivity and improve the portfolio's defensive balance.
```

### Example Market Vision Note

```text
Bond and rates: yields have been rising over the last quarter, while the curve remains inverted. Short-duration Treasury ETFs remain attractive for stability and income, while long-duration Treasury ETFs carry higher volatility but may become useful if recession risk rises and rates begin falling.
```

### Example Scenario Output

```text
Rates up 1% scenario:
- SGOV: estimated impact -0.3%
- AGG: estimated impact -6.1%
- TLT: estimated impact -16.8%

The portfolio's largest bond sensitivity comes from long-duration Treasury exposure. If the goal is stability rather than recession hedging, consider reducing long-duration exposure or pairing it with shorter-duration ETFs.
```

### Example Initial Allocation Output

```text
Suggested bond sleeve for a balanced profile:
- 5% ultra-short Treasury ETF for liquidity.
- 10% aggregate bond ETF for core fixed income.
- 5% TIPS ETF for inflation sensitivity.

Estimated bond sleeve duration: 4-6 years.
Primary role: core income and moderate defensive ballast.
```

## 17. API Cost-Control Strategy

Bond ETF intelligence should use low-frequency metadata refreshes and daily price updates.

Daily:

- Prices for bond ETFs held or actively watched.
- Benchmark bond ETF prices.

Weekly:

- Bond ETF scores.
- Portfolio bond exposure analysis.
- Recommendation inputs.

Monthly or quarterly:

- ETF metadata refresh.
- Duration and yield fields.
- Expense ratio and AUM refresh.
- Bond ETF universe review.

FRED macro data:

- Refresh daily or weekly depending on series frequency.
- Cache macro snapshots.
- Do not call FRED repeatedly during user page loads.

AI usage:

- Use deterministic sensitivity calculations.
- Use AI only to summarize implications and recommendations.
- Avoid sending full price history when score summaries are sufficient.

