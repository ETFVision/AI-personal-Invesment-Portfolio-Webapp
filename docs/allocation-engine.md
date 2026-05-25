# Initial Capital Allocation Engine Design

## 1. Objective

The Initial Capital Allocation Engine recommends how available cash should be allocated across ETFs, selective individual stocks, bond ETFs, gold ETFs, crypto, and retained cash.

The engine should prioritize ETF-first portfolio construction. Broad, diversified ETFs form the core portfolio. Individual stocks, thematic ETFs, crypto, gold, and high-yield credit are optional satellite exposures that must pass stricter portfolio-fit and risk checks.

The engine produces an allocation plan, not trade execution.

## 2. Core Inputs

User inputs:

- Available cash amount.
- Cash currency.
- Portfolio base currency.
- Risk tolerance.
- Time horizon.
- Existing holdings.
- Existing cash balances.
- Target cash reserve.
- ETF-first preference.
- Optional individual stock preference.
- Duration preference.
- Crypto maximum allocation.
- Gold maximum allocation.
- Restricted assets or asset classes.

Market inputs:

- Current asset prices.
- Current yields.
- Inflation outlook.
- Rate regime.
- Recession risk.
- Credit-spread regime.
- Equity market regime.
- Crypto risk regime.
- Gold/inflation context.

Portfolio intelligence inputs:

- Bond ETF scores.
- Asset scores.
- Watchlist scores.
- Benchmark context.
- Portfolio risk metrics.
- Correlation estimates.
- Allocation model weights.
- Telemetry-inferred user preferences.

## 3. Allocation Philosophy

### ETF-First Core

The default allocation should use ETFs for:

- Broad US equity.
- International developed equity.
- Emerging markets equity.
- Aggregate or Treasury bond exposure.
- Inflation-linked bond exposure.
- Gold exposure where appropriate.
- Cash-like exposure.

### Selective Stock Satellite

Individual stock exposure is allowed only when:

- User permits individual stocks.
- Stock has high quality and portfolio-fit scores.
- Position size remains within concentration limits.
- Existing ETF exposure overlap is acceptable.
- The stock adds a clear role not already met by ETFs.

### Risk-Bucket Thinking

Every recommended allocation should map to a role:

- Growth core.
- International diversification.
- Defensive ballast.
- Cash reserve.
- Inflation hedge.
- Opportunistic satellite.
- Credit income.
- Crypto satellite.

## 4. Portfolio Models

These are starting templates. The app can tune them by user preference and market regime.

### Conservative Model

Suggested baseline:

- Equity ETFs: 30-45%
- Bond ETFs: 35-50%
- Gold ETFs: 5-10%
- Crypto: 0-3%
- Selective stocks: 0-5%
- Cash: 10-20%

Intent:

- Preserve capital.
- Maintain liquidity.
- Use bonds and cash as stabilizers.
- Keep satellites small.

### Balanced Model

Suggested baseline:

- Equity ETFs: 50-65%
- Bond ETFs: 20-35%
- Gold ETFs: 3-8%
- Crypto: 0-5%
- Selective stocks: 0-10%
- Cash: 5-15%

Intent:

- Build long-term growth with meaningful diversification.
- Use bonds as ballast and income.
- Allow modest satellite exposure.

### Growth Model

Suggested baseline:

- Equity ETFs: 65-80%
- Bond ETFs: 10-20%
- Gold ETFs: 0-5%
- Crypto: 0-7%
- Selective stocks: 0-15%
- Cash: 3-10%

Intent:

- Prioritize long-term capital appreciation.
- Keep defensive allocation smaller but present.
- Allow selective stock exposure if scores justify it.

### Aggressive Model

Suggested baseline:

- Equity ETFs: 75-90%
- Bond ETFs: 0-15%
- Gold ETFs: 0-5%
- Crypto: 0-10%
- Selective stocks: 0-20%
- Cash: 2-8%

Intent:

- Maximize growth potential.
- Accept higher volatility.
- Keep cash and bonds mainly for liquidity, optionality, or tactical risk control.

## 5. Asset Sleeve Design

### Equity ETF Sleeve

Core building blocks:

- US total market or S&P 500 ETF.
- International developed market ETF.
- Emerging markets ETF.
- Optional factor or sector ETF if justified.

Rules:

- Broad equity ETFs should usually receive most equity allocation.
- Sector/thematic ETFs are satellites.
- Avoid stacking overlapping ETFs unless intentional.

### Selective Stock Sleeve

Candidate source:

- Core long-term quality stock watchlist.

Rules:

- Default maximum single-stock position: 3-5%.
- Default total stock satellite cap: 5-15%, depending on risk profile.
- No stock recommendation if ETF alternative has better portfolio fit.
- No stock recommendation if portfolio concentration risk is already elevated.

### Bond ETF Sleeve

Candidate source:

- Bond Intelligence Layer.

Inputs:

- Risk tolerance.
- Time horizon.
- Current yields.
- Inflation outlook.
- Rate regime.
- Recession risk.
- Duration preference.

Roles:

- Ultra-short Treasury or cash-like ETF for liquidity.
- Short-duration Treasury or corporate ETF for stability and income.
- Intermediate aggregate or Treasury ETF for core bond exposure.
- Long Treasury ETF for recession hedging when appropriate.
- TIPS ETF for inflation sensitivity.
- Investment-grade corporate ETF for income.
- High-yield ETF only as a risk asset satellite.

### Gold ETF Sleeve

Rules:

- Gold is an optional diversifier and inflation/geopolitical hedge.
- Default allocation: 0-8%.
- Use gold ETFs rather than physical gold handling in Phase 1.
- Avoid oversized gold allocation unless user explicitly chooses defensive real-asset tilt.

### Crypto Sleeve

Rules:

- Crypto is a satellite risk asset.
- Default allocation: 0-5%.
- Aggressive users may allow up to 10%.
- BTC and ETH should dominate Phase 1 crypto allocation.
- Do not recommend crypto if user risk profile or telemetry indicates avoidance.

### Cash Sleeve

Rules:

- Maintain minimum cash reserve before investing.
- Cash reserve can be native currency or base currency.
- Excess cash above reserve is deployable.
- Cash-like ETFs can be recommended separately from true cash.

## 6. Bond Allocation Logic

### Risk Tolerance

Conservative:

- Higher bond allocation.
- Favor ultra-short, short, and intermediate duration.
- Favor Treasury, aggregate, and investment-grade.
- Avoid or minimize high-yield credit.

Balanced:

- Moderate bond allocation.
- Favor intermediate aggregate, Treasury, and optional TIPS.
- Allow limited investment-grade corporate exposure.

Growth:

- Lower bond allocation.
- Use bonds for ballast and rebalancing dry powder.
- Favor short/intermediate duration unless recession hedge is desired.

Aggressive:

- Minimal bond allocation.
- Use cash-like or short-duration bonds.
- Long-duration Treasuries only if explicit tactical hedge.

### Time Horizon

Short horizon, below 3 years:

- Higher cash and ultra-short bond allocation.
- Avoid long-duration bonds and volatile satellites.

Medium horizon, 3-7 years:

- Short and intermediate bonds.
- Moderate equity ETF exposure.

Long horizon, 7+ years:

- Higher equity ETF allocation.
- Bonds used for stability, rebalancing, and psychological durability.

### Current Yields

If short-term yields are attractive:

- Favor ultra-short Treasury or short-duration ETFs for cash-like reserve.

If intermediate yields are attractive:

- Favor intermediate Treasury or aggregate bond ETFs for core ballast.

If credit spreads are tight:

- Be cautious on high-yield and corporate credit.

If credit spreads are wide but recession risk is stabilizing:

- Consider limited investment-grade or high-yield credit only for suitable risk profiles.

### Inflation Outlook

Inflation pressure rising:

- Add or increase TIPS sleeve.
- Favor shorter duration nominal bonds.
- Avoid over-concentration in long nominal duration.

Disinflation:

- Intermediate and long Treasuries may improve as defensive ballast.

### Rate Regime

Rising rates:

- Favor ultra-short and short duration.
- Reduce long-duration allocation unless explicitly tactical.

Stable rates:

- Use target duration by risk profile.
- Intermediate aggregate or Treasury exposure can serve as core.

Falling rates:

- Intermediate and long Treasuries may become more attractive.
- Recession risk should influence whether duration is hedge or return-seeking.

### Recession Risk

Low recession risk:

- Core aggregate and short/intermediate bonds are sufficient.
- Avoid overpaying for long-duration hedges.

Rising recession risk:

- Increase Treasury quality.
- Reduce high-yield credit.
- Consider intermediate or long Treasury exposure if duration tolerance allows.

High recession risk:

- Favor Treasury ballast and cash reserve.
- Treat high-yield as equity-like risk.

### Duration Preference

User duration preference:

- `low`: ultra-short and short duration.
- `moderate`: short and intermediate duration.
- `high`: intermediate and long duration allowed.
- `auto`: engine selects based on risk profile and macro regime.

## 7. Deployment Scheduling

The engine should support staged deployment rather than assuming all cash is invested immediately.

### Deployment Modes

Immediate:

- Invest all deployable cash now.
- Best when portfolio is far below target allocation and market conditions are neutral or favorable.

Staged:

- Deploy over multiple tranches.
- Default for uncertain markets or large cash balances.

Defensive:

- Keep higher cash reserve.
- Deploy only into cash-like, short-duration, or core ETFs initially.

Opportunistic:

- Hold some cash for watchlist triggers.
- Deploy into core now, reserve cash for opportunistic entries.

### Suggested Schedules

Small amount relative to portfolio, below 5%:

- Deploy immediately if no risk warnings.

Medium amount, 5-20%:

- Deploy over 2-4 tranches.

Large amount, above 20%:

- Deploy over 3-6 tranches.

High market uncertainty:

- Deploy core bond/cash-like sleeve first.
- Deploy equity sleeve in scheduled tranches.

### Schedule Pseudo-Code

```ts
export function buildDeploymentSchedule(input: DeploymentInput): DeploymentSchedule {
  if (input.deployableCashPctOfPortfolio < 0.05 && input.marketRisk !== "high") {
    return { mode: "immediate", tranches: [{ pct: 1, dateOffsetDays: 0 }] };
  }

  if (input.marketRisk === "high" || input.deployableCashPctOfPortfolio > 0.2) {
    return {
      mode: "staged",
      tranches: [
        { pct: 0.25, dateOffsetDays: 0 },
        { pct: 0.25, dateOffsetDays: 30 },
        { pct: 0.25, dateOffsetDays: 60 },
        { pct: 0.25, dateOffsetDays: 90 },
      ],
    };
  }

  return {
    mode: "staged",
    tranches: [
      { pct: 0.5, dateOffsetDays: 0 },
      { pct: 0.5, dateOffsetDays: 30 },
    ],
  };
}
```

## 8. Scoring Logic

Allocation candidates should be scored before recommendation.

### Candidate Scores

- `asset_quality_score`
- `portfolio_fit_score`
- `diversification_score`
- `risk_fit_score`
- `cost_efficiency_score`
- `liquidity_score`
- `valuation_or_yield_score`
- `macro_fit_score`
- `telemetry_fit_score`
- `overall_allocation_score`

### ETF Candidate Rules

ETF candidates score higher when:

- They fill a target allocation gap.
- They are broad, liquid, and low cost.
- They reduce concentration.
- They improve benchmark alignment.
- They have low overlap with existing holdings unless intentionally core.

### Stock Candidate Rules

Stock candidates score higher when:

- They are core-quality watchlist names.
- They pass quality and valuation checks.
- They add useful exposure.
- Position size remains small.

Stocks score lower when:

- ETF overlap is high.
- Concentration would become excessive.
- Risk profile is conservative.
- User has previously rejected stock-specific risk.

### Bond Candidate Rules

Bond ETF candidates score higher when:

- Duration matches user preference.
- Credit quality matches risk profile.
- Macro regime supports the category.
- Portfolio needs ballast, income, inflation sensitivity, or liquidity.
- Yield is attractive relative to risk.

### Scoring Pseudo-Code

```ts
export function scoreAllocationCandidate(input: AllocationCandidateInput): AllocationCandidateScore {
  const assetQualityScore = scoreAssetQuality(input.asset);
  const portfolioFitScore = scoreAllocationGapFit(input.asset, input.portfolio, input.targetModel);
  const diversificationScore = scoreDiversificationImpact(input.asset, input.portfolio);
  const riskFitScore = scoreRiskFit(input.asset, input.userProfile);
  const costEfficiencyScore = scoreCostEfficiency(input.asset);
  const liquidityScore = scoreLiquidity(input.asset);
  const valuationOrYieldScore = scoreValuationOrYield(input.asset, input.market);
  const macroFitScore = scoreMacroFit(input.asset, input.macroRegime);
  const telemetryFitScore = scoreTelemetryFit(input.asset, input.userPreferences);

  const weights = getAllocationScoringWeights(input.asset.assetType, input.userProfile);

  return {
    assetId: input.asset.id,
    assetQualityScore,
    portfolioFitScore,
    diversificationScore,
    riskFitScore,
    costEfficiencyScore,
    liquidityScore,
    valuationOrYieldScore,
    macroFitScore,
    telemetryFitScore,
    overallAllocationScore: weightedAverage({
      assetQualityScore,
      portfolioFitScore,
      diversificationScore,
      riskFitScore,
      costEfficiencyScore,
      liquidityScore,
      valuationOrYieldScore,
      macroFitScore,
      telemetryFitScore,
    }, weights),
  };
}
```

## 9. Allocation Algorithm

### Step-by-Step Logic

1. Determine investable cash after reserve.
2. Select portfolio model from risk tolerance and time horizon.
3. Adjust target allocation for macro regime and user constraints.
4. Calculate current allocation including existing holdings.
5. Identify allocation gaps.
6. Generate ETF-first candidate set.
7. Add eligible selective stocks from watchlist.
8. Add eligible bond ETF candidates from Bond Intelligence.
9. Score all candidates.
10. Allocate cash to highest-fit candidates within constraints.
11. Build deployment schedule.
12. Generate rationale and warnings.
13. Save allocation recommendation.

### Pseudo-Code

```ts
export class InitialCapitalAllocationService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly prices: PriceRepository,
    private readonly assets: AssetRepository,
    private readonly watchlist: WatchlistRepository,
    private readonly bonds: BondIntelligenceService,
    private readonly risk: RiskAnalyticsService,
    private readonly telemetry: TelemetryRepository,
  ) {}

  async recommend(input: InitialAllocationInput): Promise<AllocationRecommendation> {
    const portfolio = await this.portfolios.getPortfolio(input.portfolioId);
    const holdings = await this.portfolios.listHoldings(input.portfolioId);
    const userPreferences = await this.telemetry.getUserPreferenceProfile(portfolio.userId);

    const deployableCash = calculateDeployableCash({
      availableCash: input.availableCash,
      targetCashReserve: input.targetCashReserve,
    });

    const baseModel = selectAllocationModel({
      riskTolerance: input.riskTolerance,
      timeHorizonYears: input.timeHorizonYears,
    });

    const adjustedModel = adjustModelForMacro({
      model: baseModel,
      macro: input.macroRegime,
      durationPreference: input.durationPreference,
      recessionRisk: input.recessionRisk,
      inflationOutlook: input.inflationOutlook,
    });

    const currentAllocation = calculateCurrentAllocation(holdings, portfolio.baseCurrency);
    const gaps = calculateAllocationGaps(currentAllocation, adjustedModel);

    const candidates = [
      ...await this.assets.listCoreEtfCandidates(),
      ...await this.watchlist.listEligibleStockCandidates(portfolio.userId),
      ...await this.bonds.generateBondAllocationCandidates({
        riskTolerance: input.riskTolerance,
        timeHorizonYears: input.timeHorizonYears,
        durationPreference: input.durationPreference,
        macroRegime: input.macroRegime,
      }),
    ];

    const scored = candidates
      .map((candidate) => scoreAllocationCandidate({
        asset: candidate,
        portfolio,
        targetModel: adjustedModel,
        market: input.marketSnapshot,
        macroRegime: input.macroRegime,
        userProfile: input.riskTolerance,
        userPreferences,
      }))
      .sort((a, b) => b.overallAllocationScore - a.overallAllocationScore);

    const allocation = allocateWithinConstraints({
      deployableCash,
      gaps,
      scoredCandidates: scored,
      constraints: buildAllocationConstraints(input, userPreferences),
    });

    const schedule = buildDeploymentSchedule({
      deployableCashPctOfPortfolio: deployableCash / currentAllocation.totalValue,
      marketRisk: input.marketRisk,
    });

    return buildAllocationRecommendation({
      portfolio,
      baseModel,
      adjustedModel,
      allocation,
      schedule,
      warnings: generateAllocationWarnings(allocation, input),
    });
  }
}
```

## 10. Constraint Rules

Default constraints:

- Preserve target cash reserve.
- Do not exceed asset-class max allocation.
- Do not exceed crypto cap.
- Do not exceed gold cap.
- Do not exceed single-stock cap.
- Do not recommend high-yield bonds as defensive ballast.
- Do not recommend long-duration bonds if user selected low duration preference.
- Do not recommend individual stocks if ETF-first strict mode is enabled.
- Do not allocate to assets with stale or missing price data unless user confirms.
- Do not allocate below minimum practical order size.

## 11. Recommendation Output Format

Each allocation recommendation should include:

- Total available cash.
- Cash reserve retained.
- Deployable cash.
- Recommended allocation by asset class.
- Recommended instruments.
- Suggested dollar amounts.
- Suggested percentages.
- Deployment schedule.
- Rationale.
- Risk warnings.
- ETF alternatives considered.
- Bond duration explanation.
- Scenario vulnerability summary.

## 12. Recommendation Examples

### Balanced Investor, USD 50,000 Available

```text
Available cash: USD 50,000
Retained cash reserve: USD 7,500
Deployable cash: USD 42,500

Recommended allocation:
- USD 22,000 to broad equity ETFs.
- USD 10,000 to bond ETFs.
- USD 3,000 to international equity ETF.
- USD 2,500 to gold ETF.
- USD 2,000 to BTC/ETH crypto sleeve.
- USD 3,000 reserved for opportunistic watchlist triggers.

Bond sleeve:
- 60% aggregate or intermediate Treasury exposure.
- 25% ultra-short Treasury exposure.
- 15% TIPS exposure.

Reasoning:
This keeps the portfolio ETF-first while adding moderate bond ballast and inflation sensitivity. Current rate conditions favor some short-duration exposure, while recession risk justifies maintaining intermediate Treasury or aggregate bond exposure.
```

### Conservative Investor, Rising Rate Regime

```text
Recommendation:
Deploy gradually, prioritizing cash-like and short-duration bond ETFs before adding equity exposure.

Suggested first tranche:
- 40% ultra-short Treasury ETF.
- 20% short Treasury ETF.
- 25% broad equity ETF.
- 10% international equity ETF.
- 5% gold ETF.

Warning:
Long-duration bond ETFs are not recommended in this allocation because the user selected low duration preference and the current rate regime is rising.
```

### Growth Investor With Strong Watchlist Stock

```text
Recommendation:
Use ETFs for the core allocation and add a small selective stock satellite.

Suggested deployment:
- 70% broad equity ETFs.
- 10% international equity ETF.
- 10% short/intermediate bond ETF.
- 5% gold ETF.
- 3% BTC.
- 2% high-quality individual stock from the core quality watchlist.

Reasoning:
The individual stock has a high quality score and acceptable portfolio-fit score, but the position is capped at 2% to preserve ETF-first construction and limit single-name risk.
```

## 13. Integration Points

### Bond Intelligence Layer

Provides:

- Bond ETF classifications.
- Duration fit.
- Yield context.
- Rate-regime fit.
- Inflation sensitivity.
- Recession hedge score.
- Credit-spread risk.

### Watchlist Intelligence Layer

Provides:

- Eligible stock candidates.
- Opportunistic candidates.
- ETF alternatives.
- Trigger-near assets.

### Risk Analytics Layer

Provides:

- Concentration checks.
- Volatility estimates.
- Crypto exposure limits.
- Bond duration exposure.
- Scenario vulnerability.

### Scenario Analysis Layer

Provides:

- Estimated impact of rates up/down.
- Equity correction impact.
- Crypto drawdown impact.
- Inflation shock impact.
- Recession/risk-off impact.

### Telemetry Learning

Provides:

- User preference for ETFs versus individual stocks.
- Duration tolerance.
- Crypto avoidance or appetite.
- Cash comfort level.
- Prior accepted/rejected recommendation patterns.

## 14. Database Outputs

Primary output table:

- `allocation_recommendations`

Recommended stored fields:

- User ID.
- Portfolio ID.
- Allocation model ID.
- Input cash amount.
- Input currency.
- Risk tolerance.
- Time horizon.
- Macro regime snapshot.
- Recommended allocations.
- Recommended instruments.
- Deployment schedule.
- Rationale.
- Warnings.
- Status.

Supporting tables:

- `allocation_models`
- `asset_scores`
- `bond_scores`
- `portfolio_risk_metrics`
- `scenario_results`
- `recommendations`
- `recommendation_history`

## 15. Success Criteria

The engine is successful if:

- It produces a clear ETF-first allocation.
- It preserves a sensible cash reserve.
- It handles bonds by role, duration, yield, and macro regime.
- It prevents excessive single-stock or crypto concentration.
- It explains why each sleeve exists.
- It supports immediate and staged deployment.
- It can be audited through stored inputs, scores, and outputs.

