# Recommendation and Scoring Engine Design

## 1. Objective

The Recommendation and Scoring Engine evaluates assets and portfolio actions using deterministic scoring rules, then maps those scores to recommendation labels:

- `Strong Buy`
- `Buy`
- `Hold`
- `Watch`
- `Reduce`
- `Sell`

AI may summarize, classify, and explain information, but deterministic rules make the final recommendation. This prevents unstable, emotion-driven, or news-reactive recommendations.

The engine should support:

- ETFs.
- Individual stocks.
- Bond ETFs.
- Gold ETFs.
- Crypto assets.
- Cash-like instruments.
- Watchlist candidates.
- Existing holdings.

## 2. Design Principles

- Final recommendations are rule-based.
- AI produces structured summaries, classifications, and rationale drafts.
- Every recommendation stores score inputs and rule evidence.
- News should rarely trigger immediate recommendation changes by itself.
- Portfolio fit matters as much as asset attractiveness.
- ETF-first construction should influence scoring and recommendation thresholds.
- Bond ETFs use a specialized scoring layer.
- Recommendations should be stable across short-term noise unless risk materially changes.

## 3. Recommendation Labels

### Strong Buy

Meaning:

- Asset has high score, strong portfolio fit, acceptable risk, and clear role.
- For individual stocks, quality and valuation must both be strong.
- For ETFs, broad/core portfolio role or exceptional fit should be present.

Typical use:

- Core ETF underweight versus target.
- High-quality asset with strong fit and favorable score.
- Bond ETF that strongly fits current risk profile and macro regime.

### Buy

Meaning:

- Asset is attractive and fits the portfolio, but conviction is not extreme.

Typical use:

- Add to existing allocation.
- Deploy cash toward target.
- Add small satellite exposure.

### Hold

Meaning:

- Asset remains appropriate, but no new allocation is recommended.

Typical use:

- Existing holding is still aligned.
- Score is acceptable but not compelling.
- Asset remains near target allocation.

### Watch

Meaning:

- Asset is not actionable now but should stay monitored.

Typical use:

- Valuation too high.
- Trigger not reached.
- News or macro signal requires monitoring but not action.
- Data is incomplete or stale.

### Reduce

Meaning:

- Position is too large, risk has increased, score has deteriorated, or better ETF alternative exists.

Typical use:

- Concentration issue.
- Portfolio drift.
- Bond duration or credit risk mismatch.
- Satellite holding has grown beyond policy limits.

### Sell

Meaning:

- Strong negative score, broken thesis, severe portfolio mismatch, or unacceptable risk.

Typical use:

- Fundamental deterioration.
- Thesis invalidated.
- Risk concentration is excessive and cannot be solved by minor trimming.
- Asset no longer belongs in ETF-first portfolio construction.

Sell should require more evidence than Reduce.

## 4. Score Dimensions

All scores should normalize to 0-100.

### Fundamentals Score

Applies mainly to stocks and some ETFs.

Inputs:

- Revenue growth.
- Earnings growth.
- Margin quality.
- Free cash flow.
- Balance sheet strength.
- Return on invested capital.
- Dividend sustainability where relevant.
- ETF issuer/fund quality where relevant.

Interpretation:

- 80-100: strong fundamentals.
- 60-79: acceptable.
- 40-59: mixed.
- Below 40: weak.

### Valuation Score

Inputs:

- Price/earnings.
- Price/free cash flow.
- Enterprise value metrics.
- Yield for bond ETFs.
- Historical valuation range.
- Sector-relative valuation.
- Growth-adjusted valuation.

Interpretation:

- Higher score means more attractive valuation.
- Expensive assets can still be Hold, but rarely Strong Buy unless quality and portfolio fit are exceptional.

### Momentum Score

Inputs:

- 1-month return.
- 3-month return.
- 6-month return.
- 12-month return.
- Trend versus moving averages.
- Drawdown/recovery behavior.

Interpretation:

- Momentum should support timing and confidence.
- Momentum should not override poor fundamentals or portfolio mismatch.

### News Impact Score

Inputs:

- AI-classified news sentiment.
- Severity.
- Relevance to asset thesis.
- Source reliability.
- Recency.
- Whether news is confirmed or speculative.

Interpretation:

- News impact adjusts monitoring status and confidence.
- News alone should not trigger Sell or Strong Buy except in rare, severe, confirmed events.

### Macro Score

Inputs:

- Rate regime.
- Inflation outlook.
- Recession risk.
- Credit-spread regime.
- Risk-on/risk-off conditions.
- Currency regime.
- Sector macro sensitivity.

Interpretation:

- Measures whether macro conditions support the asset category.

### Portfolio Fit Score

Inputs:

- Target allocation gap.
- Asset class role.
- Existing holdings.
- ETF overlap.
- Correlation.
- Cash deployment need.
- User risk profile.
- Time horizon.

Interpretation:

- High score means the asset improves portfolio construction.
- Low score can block Buy even when asset-level scores are good.

### Risk Concentration Score

Inputs:

- Single-position weight.
- Asset class weight.
- Sector weight.
- Country/region weight.
- Currency weight.
- Crypto exposure.
- High-yield bond exposure.
- Individual stock exposure.

Interpretation:

- Higher score means concentration risk is acceptable.
- Low score pushes recommendations toward Reduce or Watch.

### Market Vision Adjustment Score

Inputs:

- Market regime summary.
- Equity/bond/gold/crypto regime.
- Market Vision signals.
- Portfolio-specific implications.

Interpretation:

- Adjustment layer, not primary score.
- Should be bounded to avoid whipsaw.

### Benchmark-Relative Performance Score

Inputs:

- Return versus benchmark.
- Volatility versus benchmark.
- Drawdown versus benchmark.
- Rolling relative strength.
- Tracking behavior versus intended benchmark.

Interpretation:

- Helps identify underperforming assets.
- Should distinguish bad performance from intentional defensive role.

### Bond-Specific Score

Applies to bond ETFs.

Inputs:

- Duration fit.
- Rate sensitivity.
- Credit risk.
- Yield attractiveness.
- Inflation sensitivity.
- Portfolio stabilisation value.

Interpretation:

- Used alongside general scores, but weighted heavily for bond ETFs.

## 5. Bond-Specific Scoring

Bond ETFs need specialized scoring because their role is often stability, income, duration exposure, or inflation protection rather than equity-like growth.

### Duration Fit

Inputs:

- Effective duration.
- User duration preference.
- Risk tolerance.
- Time horizon.
- Current portfolio weighted duration.

High score:

- Duration matches user preference and portfolio need.

Low score:

- Long duration for low-duration user.
- Ultra-short duration when portfolio needs recession ballast.

### Rate Sensitivity

Inputs:

- Effective duration.
- Rate regime.
- Yield curve trend.
- Estimated impact of +1% and -1% rate shock.

High score:

- Rate sensitivity is appropriate for regime and user goal.

Low score:

- High sensitivity in rising-rate regime without explicit hedge purpose.

### Credit Risk

Inputs:

- Treasury, investment-grade, high-yield, or mixed classification.
- Credit spread regime.
- Recession risk.
- Current high-yield exposure.

High score:

- Treasury or investment-grade when defensive ballast is needed.
- Credit exposure only when risk profile and spread regime support it.

Low score:

- High-yield exposure during rising recession or credit-stress regime.

### Yield Attractiveness

Inputs:

- SEC yield.
- Yield to maturity.
- Short-term Treasury yield.
- Inflation rate.
- Credit spread compensation.

High score:

- Yield compensates for duration and credit risk.

Low score:

- Low yield relative to risk.

### Inflation Sensitivity

Inputs:

- TIPS exposure.
- Inflation trend.
- Breakeven inflation.
- Real-rate trend.
- Duration.

High score:

- Inflation-linked exposure is useful during inflation pressure.

Low score:

- Long nominal exposure during inflation pressure and rising rates.

### Portfolio Stabilisation Value

Inputs:

- Correlation with equities.
- Treasury quality.
- Historical drawdown behavior.
- Portfolio volatility reduction.
- Recession hedge potential.

High score:

- Improves portfolio resilience.

Low score:

- Behaves like equity risk while being labeled as fixed income.

### Bond Score Pseudo-Code

```ts
export function scoreBondEtf(input: BondScoreInput): BondSpecificScore {
  const durationFit = scoreDurationFit(input.profile, input.user, input.portfolio);
  const rateSensitivity = scoreRateSensitivity(input.profile, input.macro);
  const creditRisk = scoreCreditRisk(input.profile, input.macro, input.portfolio);
  const yieldAttractiveness = scoreYieldAttractiveness(input.profile, input.macro);
  const inflationSensitivity = scoreInflationSensitivity(input.profile, input.macro);
  const stabilisationValue = scoreStabilisationValue(input.profile, input.portfolio);

  const bondSpecificScore = weightedAverage({
    durationFit,
    rateSensitivity,
    creditRisk,
    yieldAttractiveness,
    inflationSensitivity,
    stabilisationValue,
  }, {
    durationFit: 0.20,
    rateSensitivity: 0.15,
    creditRisk: 0.20,
    yieldAttractiveness: 0.15,
    inflationSensitivity: 0.10,
    stabilisationValue: 0.20,
  });

  return {
    durationFit,
    rateSensitivity,
    creditRisk,
    yieldAttractiveness,
    inflationSensitivity,
    stabilisationValue,
    bondSpecificScore,
  };
}
```

## 6. Composite Score Construction

Different asset types should use different weights.

### Broad ETF Weights

```ts
const broadEtfWeights = {
  fundamentals: 0.10,
  valuation: 0.10,
  momentum: 0.10,
  newsImpact: 0.05,
  macro: 0.15,
  portfolioFit: 0.25,
  riskConcentration: 0.15,
  marketVisionAdjustment: 0.05,
  benchmarkRelativePerformance: 0.05,
};
```

### Individual Stock Weights

```ts
const stockWeights = {
  fundamentals: 0.25,
  valuation: 0.15,
  momentum: 0.10,
  newsImpact: 0.05,
  macro: 0.10,
  portfolioFit: 0.15,
  riskConcentration: 0.15,
  marketVisionAdjustment: 0.025,
  benchmarkRelativePerformance: 0.025,
};
```

### Bond ETF Weights

```ts
const bondEtfWeights = {
  fundamentals: 0.00,
  valuation: 0.05,
  momentum: 0.05,
  newsImpact: 0.025,
  macro: 0.15,
  portfolioFit: 0.20,
  riskConcentration: 0.10,
  marketVisionAdjustment: 0.05,
  benchmarkRelativePerformance: 0.05,
  bondSpecific: 0.35,
};
```

### Crypto Weights

```ts
const cryptoWeights = {
  fundamentals: 0.05,
  valuation: 0.05,
  momentum: 0.20,
  newsImpact: 0.05,
  macro: 0.15,
  portfolioFit: 0.20,
  riskConcentration: 0.25,
  marketVisionAdjustment: 0.025,
  benchmarkRelativePerformance: 0.025,
};
```

### Composite Pseudo-Code

```ts
export function calculateCompositeScore(input: CompositeScoreInput): CompositeScore {
  const weights = getWeightsForAssetType(input.asset.assetType);

  const rawScore = weightedAverage({
    fundamentals: input.fundamentalsScore,
    valuation: input.valuationScore,
    momentum: input.momentumScore,
    newsImpact: input.newsImpactScore,
    macro: input.macroScore,
    portfolioFit: input.portfolioFitScore,
    riskConcentration: input.riskConcentrationScore,
    marketVisionAdjustment: input.marketVisionAdjustmentScore,
    benchmarkRelativePerformance: input.benchmarkRelativePerformanceScore,
    bondSpecific: input.bondSpecificScore,
  }, weights);

  const adjustedScore = applyScoreGuards(rawScore, input);

  return {
    rawScore,
    adjustedScore,
    scoreBreakdown: input,
  };
}
```

## 7. Deterministic Recommendation Mapping

Final recommendation is based on:

- Composite score.
- Existing holding status.
- Portfolio fit.
- Risk concentration.
- Data quality.
- News stability rules.
- Asset-specific guardrails.

### Base Score Mapping

```text
90-100: Strong Buy candidate
75-89: Buy candidate
55-74: Hold candidate
40-54: Watch candidate
25-39: Reduce candidate
0-24: Sell candidate
```

The label is then adjusted by deterministic guardrails.

### Guardrails

Strong Buy blocked if:

- Asset is an individual stock and portfolio single-name concentration would exceed limit.
- Asset is crypto and crypto allocation would exceed cap.
- Asset has stale or missing price data.
- News impact is severe negative and unresolved.
- Portfolio fit score is below 70.
- Risk concentration score is below 60.

Buy blocked if:

- Portfolio fit score is below 60.
- Data quality is poor.
- Asset duplicates existing exposure without justification.
- Asset conflicts with user restrictions.

Sell requires one of:

- Broken thesis.
- Severe fundamental deterioration.
- Severe risk mismatch.
- User no longer wants the asset class.
- Persistent score deterioration across review windows.
- Confirmed material negative event with lasting impact.

### Recommendation Pseudo-Code

```ts
export function mapScoreToRecommendation(input: RecommendationInput): RecommendationLabel {
  const base = mapCompositeScoreToBaseLabel(input.compositeScore.adjustedScore);

  if (input.dataQuality === "poor") return "Watch";

  if (base === "Strong Buy" && blocksStrongBuy(input)) return "Buy";
  if (base === "Buy" && blocksBuy(input)) return "Watch";

  if (base === "Sell" && !sellEvidenceIsSufficient(input)) {
    return input.isCurrentHolding ? "Reduce" : "Watch";
  }

  if (!input.isCurrentHolding && base === "Hold") return "Watch";

  if (input.isCurrentHolding && base === "Watch") return "Hold";

  return base;
}
```

## 8. Avoiding Knee-Jerk News Reactions

News should be classified and summarized by AI, but deterministic dampening rules should decide whether it changes scores or recommendations.

### News Classification

AI may classify news as:

- `irrelevant`
- `minor`
- `moderate`
- `material`
- `severe`

AI may classify direction as:

- `positive`
- `neutral`
- `negative`
- `mixed`

AI may classify thesis impact as:

- `no_thesis_change`
- `temporary_noise`
- `needs_monitoring`
- `thesis_weakened`
- `thesis_broken`

### News Dampening Rules

Rules:

- One negative news item cannot cause Sell unless severity is severe and confirmed.
- News impact decays over time unless reinforced.
- Unconfirmed news can move an asset to Watch, not Sell.
- Positive news cannot cause Strong Buy unless valuation, portfolio fit, and risk scores already support it.
- Repeated related negative news over multiple review periods can reduce scores.
- News about broad macro regime should flow through macro and Market Vision scores, not individual panic adjustments.

### News Score Pseudo-Code

```ts
export function applyNewsDampening(input: NewsImpactInput): number {
  if (input.classification.relevance === "irrelevant") return 50;

  const baseImpact = classifyBaseNewsImpact(input.classification);
  const confirmationMultiplier = input.isConfirmed ? 1 : 0.4;
  const recurrenceMultiplier = Math.min(1.5, 1 + input.relatedEventCount * 0.1);
  const decayMultiplier = calculateTimeDecay(input.daysSincePublished);

  const dampened = 50 + baseImpact * confirmationMultiplier * recurrenceMultiplier * decayMultiplier;

  return clamp(dampened, 0, 100);
}
```

## 9. Score Stability Rules

To avoid excessive churn:

- Use rolling averages for momentum and benchmark-relative performance.
- Require multiple review periods for major label downgrades unless severe risk event occurs.
- Use hysteresis bands around recommendation thresholds.
- Store previous recommendations and score history.
- Treat Watch as a buffer state.

### Hysteresis Example

```ts
export function applyRecommendationHysteresis(input: {
  previousLabel: RecommendationLabel | null;
  proposedLabel: RecommendationLabel;
  adjustedScore: number;
}): RecommendationLabel {
  if (!input.previousLabel) return input.proposedLabel;

  if (input.previousLabel === "Buy" && input.proposedLabel === "Hold") {
    return input.adjustedScore >= 70 ? "Buy" : "Hold";
  }

  if (input.previousLabel === "Hold" && input.proposedLabel === "Reduce") {
    return input.adjustedScore >= 35 ? "Hold" : "Reduce";
  }

  return input.proposedLabel;
}
```

## 10. Recommendation Engine Flow

```text
Collect data
  -> Validate data freshness
  -> Calculate deterministic factor scores
  -> Ask AI to summarize/classify news and complex context
  -> Convert AI classifications into bounded scores
  -> Calculate composite score
  -> Apply portfolio constraints and guardrails
  -> Map to deterministic recommendation label
  -> Apply stability/hysteresis rules
  -> Generate explanation
  -> Store recommendation and score evidence
```

## 11. Service Interfaces

```ts
export interface ScoringEngine {
  scoreAsset(input: ScoreAssetInput): Promise<AssetScoreResult>;
  scoreBondEtf(input: BondScoreInput): Promise<BondSpecificScore>;
  calculateCompositeScore(input: CompositeScoreInput): CompositeScore;
}
```

```ts
export interface RecommendationEngine {
  generateAssetRecommendation(input: RecommendationInput): Promise<RecommendationResult>;
  generatePortfolioRecommendations(portfolioId: string): Promise<RecommendationResult[]>;
}
```

```ts
export interface AiClassificationProvider {
  classifyNews(input: NewsClassificationInput): Promise<NewsClassification>;
  summarizeSignals(input: SignalSummaryInput): Promise<SignalSummary>;
}
```

## 12. Database Outputs

Use:

- `asset_scores` for general score breakdowns.
- `bond_scores` for bond-specific scoring.
- `recommendations` for current recommendations.
- `recommendation_history` for status changes and feedback.
- `scoring_weights` for configurable factor weights.
- `scoring_weight_change_suggestions` for telemetry-driven changes.

Recommended evidence fields:

- Raw factor inputs.
- AI classifications.
- Deterministic rule outcomes.
- Guardrails applied.
- Previous recommendation label.
- Final recommendation label.
- Confidence score.

## 13. Example Outputs

### Broad ETF

```text
Recommendation: Buy

Reason: This ETF fills an underweight core equity allocation, has strong portfolio fit, low concentration risk, and acceptable benchmark-relative performance. Valuation is not especially cheap, so the recommendation is Buy rather than Strong Buy.
```

### Individual Stock

```text
Recommendation: Watch

Reason: Fundamentals remain strong, but valuation is stretched and the stock overlaps heavily with existing technology ETF exposure. Keep it on the core quality watchlist and reconsider if valuation improves or portfolio concentration falls.
```

### Bond ETF

```text
Recommendation: Buy

Reason: The ETF has short-duration Treasury exposure, strong portfolio stabilisation value, low credit risk, and attractive yield relative to current cash. It fits the user's low-duration preference in the current rate regime.
```

### Negative News Event

```text
Recommendation: Hold

Reason: Recent news is negative and material enough to monitor, but deterministic scores do not indicate a broken thesis. The item has been moved to heightened monitoring, and the news impact will be reassessed in the next weekly review.
```

### Concentrated Holding

```text
Recommendation: Reduce

Reason: The asset remains high quality, but it now exceeds the portfolio's single-position concentration limit. Reducing the position would lower risk while preserving exposure through broad ETFs.
```

## 14. Implementation Rules

- AI never writes the final recommendation label directly.
- AI classifications must be converted into bounded numeric scores.
- Recommendations must store deterministic evidence.
- News cannot trigger rapid buy/sell changes without confirmation and guardrails.
- Sell requires stronger evidence than Reduce.
- Watch should absorb uncertainty.
- Portfolio fit can override attractive asset-level scores.
- Bond ETFs must use bond-specific scoring.
- ETF-first philosophy should raise the threshold for individual stock Buy and Strong Buy recommendations.

