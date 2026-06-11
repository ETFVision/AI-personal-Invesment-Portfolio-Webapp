# ETFVision Score Methodology

Last updated: 2026-06-11 20:26:47 +08:00

Authoritative status: formula-level handover snapshot based on current code and migrations. This document explains how the main derived scores are calculated. If a score is later recalibrated, update this file in the same commit.

## Score Scale and Storage Convention

- Most scores are stored or displayed on a 0-100 scale.
- Market returns, volatility, drawdowns, and allocation weights are stored as decimals unless a UI formatter converts them to percentages.
- Scores are generally clamped to 0-100.
- Missing inputs are usually excluded from weighted averages rather than treated as zero, unless a service explicitly defines a fallback.

## Fundamentals Score

Primary code: `src/application/services/fundamentals/FundamentalScoringService.ts`

Stored table: `fundamental_scores`

### Overall Weights

| Component | Weight |
|---|---:|
| Growth | 20% |
| Profitability | 20% |
| Valuation | 20% |
| Balance sheet | 15% |
| Cash flow | 15% |
| Quality | 10% |

Only available component scores are included in the denominator.

### Helper Formulas

`scorePositivePercent(value, neutral = 0.05, excellent = 0.30)`:

- `null` -> `null`
- `value <= -0.10` -> `10`
- `value <= neutral` -> `35 + ((value + 0.10) / (neutral + 0.10)) * 15`
- otherwise -> `50 + ((value - neutral) / (excellent - neutral)) * 50`
- clamped to 0-100

`scoreMargin(value, weak, strong)`:

- `(value - weak) / (strong - weak) * 70 + 25`
- clamped to 0-100

`scoreReturn(value, weak, strong)`:

- `(value - weak) / (strong - weak) * 75 + 20`
- clamped to 0-100

`scoreLowerBetter(value, excellent, poor)`:

- `null` or negative -> `null`
- `100 - ((value - excellent) / (poor - excellent)) * 80`
- clamped to 0-100

`scoreHigherBetter(value, poor, excellent)`:

- `(value - poor) / (excellent - poor) * 80 + 10`
- clamped to 0-100

### Growth Score

Inputs:

- Revenue growth
- EPS growth
- Net income growth
- Free cash flow growth

Each input uses `scorePositivePercent` with default neutral/excellent thresholds unless otherwise specified. Growth score is the average of available scored inputs.

### Profitability Score

Inputs:

- Gross margin: `scoreMargin(grossMargin, 0.15, 0.65)`
- Operating margin: `scoreMargin(operatingMargin, 0.05, 0.35)`
- Net margin: `scoreMargin(netMargin, 0.03, 0.25)`
- ROE: `scoreReturn(roe, 0.03, 0.25)`
- ROIC: `scoreReturn(roic, 0.03, 0.25)`
- ROA: `scoreReturn(roa, 0.02, 0.15)`

Profitability score is the average of available scored inputs.

### Valuation Score

Raw valuation inputs:

- P/E: `scoreLowerBetter(peRatio, 12, 60)`
- Forward P/E: `scoreLowerBetter(forwardPe, 12, 55)`
- Price/sales: `scoreLowerBetter(priceToSales, 2, 20)`
- Price/book: `scoreLowerBetter(priceToBook, 1.5, 15)`
- EV/EBITDA: `scoreLowerBetter(evToEbitda, 8, 35)`
- Free cash flow yield: `scoreHigherBetter(freeCashFlowYield, 0, 0.08)`

Raw valuation score is the average of available scored inputs.

Quality-adjusted valuation:

- Applies only to large-cap quality-growth companies.
- Large cap threshold: market cap at least 50 billion.
- Sector/industry text must include technology, communication, semiconductor, software, internet, healthcare, biotechnology, or pharmaceutical.
- Composite of growth, profitability, cash flow, and quality must be at least 70.
- If raw valuation score is already at least 55, no adjustment is needed.
- Otherwise premium tolerance is:
  - quality composite >= 85 -> +22
  - quality composite >= 78 -> +17
  - otherwise -> +12
- Growth score >= 70 adds +4.
- Final adjusted valuation is at least 28 and at most 55.

### Balance Sheet Score

Inputs:

- Debt/equity: `scoreLowerBetter(debtToEquity, 0.2, 3)`
- Net debt/EBITDA: `scoreLowerBetter(netDebtToEbitda, 0.5, 5)`
- Current ratio: `scoreHigherBetter(currentRatio, 0.7, 2.5)`
- Quick ratio: `scoreHigherBetter(quickRatio, 0.5, 2)`
- Cash/debt: `scoreHigherBetter(cashAndEquivalents / totalDebt, 0.05, 1)`

Balance sheet score is the average of available scored inputs.

### Cash Flow Score

Inputs:

- Operating cash flow against revenue scale: `scoreHigherBetter(operatingCashFlow, 0, revenue * 0.25)`
- Free cash flow against revenue scale: `scoreHigherBetter(freeCashFlow, 0, revenue * 0.20)`
- Free cash flow margin: `scoreMargin(freeCashFlow / revenue, 0, 0.25)`
- Free cash flow growth: `scorePositivePercent(freeCashFlowGrowth, 0.03, 0.25)`

Cash flow score is the average of available scored inputs.

### Quality Score

Average of:

- Profitability score
- Cash flow score
- Balance sheet score
- ROIC score
- Operating margin score

### Fundamentals Confidence

`scoreConfidence = clamp((availableInputs / 16) * 100)`

Availability count includes growth, profitability, valuation, balance sheet, and cash-flow data points listed in the scoring service.

## Fundamental Trend Scores

Primary code: `src/application/services/fundamentals/FundamentalTrendCalculationService.ts`

Stored tables:

- `fundamental_trends`
- `fundamental_trend_summaries`

### Windows

- Short-term trend: latest 5 quarterly observations where the metric supports quarterly analysis.
- Long-term trend: latest 5 annual observations.
- Annual-only metrics have short-term direction `not_applicable`.

Annual-only metrics:

- ROE
- ROIC
- ROA
- Debt/equity
- Current ratio
- Interest coverage
- FCF conversion
- Dilution trend

### Direction Logic

The service compares first-half average, second-half average, latest value, prior value, direction changes, and volatility.

Possible directions:

- `accelerating`
- `improving`
- `rebounding`
- `stable`
- `decelerating`
- `deteriorating`
- `volatile`
- `mixed`
- `insufficient_data`
- `not_applicable`

For lower-is-better metrics, direction is inverted.

### Trend Score Mapping

| Direction | Strength | Score |
|---|---|---:|
| accelerating / improving | strong | 90 |
| accelerating / improving | moderate | 74 |
| accelerating / improving | weak | 66 |
| rebounding | strong | 78 |
| rebounding | other | 68 |
| stable | any | 56 |
| decelerating | strong | 44 |
| decelerating | other | 50 |
| deteriorating | strong | 18 |
| deteriorating | moderate | 34 |
| deteriorating | weak | 42 |
| volatile | strong | 32 |
| volatile | other | 44 |
| insufficient / not applicable | any | null |

### Trend Confidence

- Fewer than 3 observations -> 20.
- 3-4 observations -> 62.
- 5+ observations -> 82.
- Volatile direction subtracts 18.
- Non-finite values subtract 20.

### Per-Metric Overall Trend Score

`overallTrendScore = weighted average(shortTerm.score, longTerm.score)`

Weights:

- Short-term weight = `shortTerm.confidence * 0.4`
- Long-term weight = `longTerm.confidence * 0.6`

### Summary Trend Score

Category weights:

| Category | Weight |
|---|---:|
| Growth | 35% |
| Margin | 25% |
| Profitability | 20% |
| Balance sheet | 10% |
| Quality | 10% |

Category scores are confidence-weighted averages of metric trend scores.

## Instrument Risk Score

Primary code:

- `src/application/services/InstrumentRiskService.ts`
- `supabase/migrations/075_precompute_instrument_daily_returns.sql`

Stored table: `instrument_risk_metrics`

### Return Inputs

Daily return:

`daily_return = close_price / previous_close_price - 1`

Weekly return:

`weekly_return = close_price / five_day_close_price - 1`

### Volatility

Annualized volatility:

`stddev_samp(daily_return_window) * sqrt(252)`

Windows:

- 30D requires at least 10 return observations.
- 90D requires at least 30 return observations.
- 1Y requires at least 60 return observations.

Downside volatility:

- Uses negative daily returns from the 1Y window.
- Requires at least 10 negative return observations.

### Drawdown

Running peak is the max close seen so far.

`drawdown = close_price / running_peak - 1`

- Current drawdown = latest drawdown.
- Max drawdown = most negative drawdown over the analyzed history.
- Drawdown duration = days since latest peak while current drawdown is negative.

Period drawdowns are also stored for 1Y, 3Y, and 5Y where enough history exists.

### Risk Score Formula

If 1Y volatility or max drawdown is missing, risk score is `null`.

Components:

- `volScore = bounded((volatility1y / 0.60) * 100)`
- `drawdownScore = bounded((abs(maxDrawdown) / 0.50) * 100)`
- `downsideScore = downsideVolatility == null ? volScore : bounded((downsideVolatility / 0.45) * 100)`
- `frequencyScore = negativeReturnFrequency == null ? 50 : bounded(negativeReturnFrequency * 100)`

Final:

`riskScore = volScore * 0.35 + drawdownScore * 0.35 + downsideScore * 0.20 + frequencyScore * 0.10`

Higher risk score means higher risk.

### Buckets

Risk bucket:

- `<25` -> low
- `<50` -> medium
- `<75` -> high
- `>=75` -> very high
- missing -> insufficient data

Volatility bucket:

- `<12%` -> low
- `<25%` -> medium
- `<45%` -> high
- `>=45%` -> very high

Drawdown bucket:

- `<10%` absolute drawdown -> low
- `<20%` -> moderate
- `<35%` -> elevated
- `>=35%` -> severe

Risk confidence:

- 252+ observations -> 90
- 120+ -> 70
- 60+ -> 55
- 30+ -> 40
- fewer -> 20

## Portfolio Risk and Diversification Scores

Primary code:

- `src/application/services/risk/riskMath.ts`
- `src/application/services/risk/RiskAnalyticsService.ts`

### Flow-Adjusted Portfolio Return

Portfolio period return:

`(currentTotalValue - netExternalFlow) / previousTotalValue - 1`

External flows include:

- `deposit_cash` as positive flow.
- `withdraw_cash` as negative flow.

This creates a TWR-style level series for portfolio risk snapshots.

### Portfolio Volatility

`annualizedVolatility = sampleStdDev(returns) * sqrt(252)`

### Covariance Risk Contribution

For assets with enough common observations:

- Build common-date return vectors.
- Annualize covariance matrix by multiplying by 252.
- Normalize weights.
- Portfolio variance = `w' * covariance * w`.
- Portfolio volatility = square root of variance.
- Marginal contribution = `(covariance * weights)_i / portfolioVolatility`.
- Absolute contribution = `weight_i * marginalContribution`.
- Risk contribution = `absoluteContribution / portfolioVolatility`.

### Diversification Score

Primary code: `diversificationScore` in `riskMath.ts`

Formula:

`score = holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty - concentrationPenalty`

Where:

- `holdingScore = min(meaningfulHoldings / 12, 1) * 20`
- `assetClassScore = min(assetClassCount / 5, 1) * 20`
- `sectorScore = min(sectorCount / 8, 1) * 20`
- `currencyScore = min(currencyCount / 3, 1) * 10`
- `correlationPenalty = averageCorrelation == null ? 5 : max(0, averageCorrelation) * 15`
- `concentrationPenalty = topHoldingConcentration * 20 + max(0, topFiveConcentration - 0.5) * 30`

Final score is rounded and clamped to 0-100.

## Recommendation Scores

Primary code:

- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- Type-specific recommendation services.

### Generic Weighted Score

`overallScore = weighted average of available finite component scores`

Missing components are excluded from the denominator.

### Label Thresholds

| Score | Internal label |
|---:|---|
| 85+ | Strong Buy |
| 70-84.99 | Buy |
| 50-69.99 | Hold |
| 35-49.99 | Watch |
| 20-34.99 | Reduce |
| Below 20 | Sell |
| Missing | Insufficient Data |

### Recommendation Confidence

Inputs:

- Available component weight ratio.
- Base confidence, usually 72 except crypto uses 62.
- Score dispersion.
- Signal conflict.
- Strategic agreement.

Formula:

`confidence = baseConfidence * availableRatio + completenessBonus + agreementBonus + strategicAgreementBonus - conflictPenalty - dispersionPenalty`

Bonuses/penalties:

- Completeness bonus: +8 if available ratio >= 95%, +4 if >= 80%.
- Agreement bonus: +5 if dispersion is greater than 0 and below 12.
- Strategic agreement bonus: +5 if fundamentals, Market Vision alignment, and theme alignment are each at least 70.
- Conflict penalty: -8 if at least one component is >= 70 and at least one is < 45.
- Dispersion penalty: `min(12, dispersion * 0.25)`.

### Generic Component Scores

Momentum:

- Starts at 50.
- 1Y return adds `clamp(oneYearReturn * 60, -25, 25)`.
- YTD return adds `clamp(ytdReturn * 40, -15, 15)`.
- Daily return adds `clamp(dailyReturn * 80, -5, 5)`.

Recommendation risk score:

- `100 - instrumentRiskScore`
- Higher is better.

Theme fit:

- Starts at 55 + 5 per theme, capped at +20.
- +5 if theme includes AI / Automation, Quality, or Global Diversification.
- -5 if theme includes High Beta.

Macro fit:

- Starts at 55.
- Adjusts for sector/asset class against FRED regime text.
- Examples: gold benefits from elevated inflation/risk-off; long-duration bonds are penalized in restrictive rates; Treasuries benefit when growth is weak.

Market Vision alignment:

- Starts at 55.
- +8 for sector mention.
- +8 for theme mention.
- +5 for supportive/tailwind language.
- -5 for risk/headwind/stress/caution language.
- Asset-specific macro term bonuses apply to bonds, gold, and crypto.

Portfolio fit:

- Starts at 65.
- +10 if not already directly held.
- +5 if sector allocation is below 15%.
- -25 if sector allocation is above 35%.
- -20 if existing direct concentration is above 15%.
- Duplicate exposure is true if directly held or sector allocation is above 35%.

### Type-Specific Recommendation Weights

#### Stocks

| Component | Weight |
|---|---:|
| Fundamentals | 30% |
| Fundamental trends | 20% |
| Valuation | 10% |
| Market Vision alignment | 10% |
| Theme alignment | 10% |
| Risk analytics | 10% |
| Portfolio fit | 5% |
| Momentum | 5% |

#### ETFs

| Component | Weight |
|---|---:|
| Allocation fit | 25% |
| Diversification benefit | 20% |
| Risk analytics | 15% |
| Macro fit | 10% |
| Market Vision alignment | 5% |
| Momentum | 10% |
| Benchmark relative | 10% |
| Theme fit | 5% |

ETF diversification benefit is currently 72 unless duplicate exposure is true, then 40. Benchmark relative is `50 + oneYearReturn * 50`, clamped to 0-100.

#### Bond ETFs

| Component | Weight |
|---|---:|
| Duration fit | 20% |
| Rate regime | 20% |
| Inflation regime | 15% |
| Yield curve | 12% |
| Credit risk | 10% |
| Portfolio stability | 10% |
| Diversification | 8% |
| Market Vision alignment | 5% |

Duration fit:

- ultra-short/short -> 72
- intermediate -> 62
- long -> 48

Credit score:

- high yield -> 40
- other known credit quality -> 65
- missing -> null

Stability:

- cash-like or Treasury -> 75
- otherwise -> 55

#### Gold

| Component | Weight |
|---|---:|
| Inflation hedge | 25% |
| Geopolitical hedge | 20% |
| Diversification | 20% |
| Rates context | 10% |
| Market Vision alignment | 5% |
| Portfolio fit | 10% |
| Momentum | 10% |

Inflation hedge is 78 when inflation regime includes elevated/rising, otherwise 55. Geopolitical hedge is 72 when liquidity regime includes stress/tight, otherwise 55.

#### Crypto

| Component | Weight |
|---|---:|
| Risk | 30% |
| Portfolio concentration | 25% |
| Momentum | 15% |
| Liquidity regime | 15% |
| Macro risk appetite | 7% |
| Market Vision alignment | 3% |
| Theme score | 5% |

Crypto concentration score:

`max(0, min(100, 70 - concentrationPercent * 500))`

Liquidity score:

- Tight liquidity -> 35.
- Macro regime available and not tight -> 58.
- Missing macro regime -> null.

### Recommendation Guardrails

| Condition | Cap |
|---|---|
| Confidence below 50 | Insufficient Data |
| Fundamentals below 35 | Watch |
| Valuation below 25 and fundamentals below 70 | Watch |
| Valuation below 25 and fundamentals at least 70 | Hold |
| Risk score above 75 | Watch unless already lower |
| Portfolio concentration above 25% | Hold |
| Duplicate exposure | Hold |
| Crypto concentration above 5% | Watch |
| Long-duration bond mismatch with restrictive/rising/high rates | Hold |

## Portfolio Review Scores

Primary code: `src/application/services/portfolioReview`

### Overall Weights

| Section | Weight |
|---|---:|
| Allocation | 15% |
| Concentration | 15% |
| Diversification | 15% |
| Risk | 15% |
| Macro fit | 15% |
| Recommendation alignment | 10% |
| Fixed income | 10% |
| Theme exposure | 5% |
| Geography | 0% |

### Section Formulas

Allocation:

`82 - max(0, equity - 0.85) * 80 - max(0, 0.08 - bonds) * 90 - max(0, cash - 0.35) * 55 - max(0, crypto - 0.10) * 90`

Concentration:

`90 - max(0, topHolding - 0.15) * 120 - max(0, topCombinedFive - 0.50) * 80 - max(0, sectorTop - 0.40) * 60`

Diversification:

- Starts from Risk Analytics diversification score.
- If ETF look-through exists, adds `min(8, sectorCount + countryCount)`.

Portfolio risk:

`88 - max(0, volatility - 0.18) * 120 - max(0, abs(maxDrawdown) - 0.15) * 100 - max(0, abs(currentDrawdown) - 0.08) * 70`

Macro fit:

`72 - 8 if restrictive rates and equity allocation > 75% - 10 if weak growth and equity allocation > 70% + 5 if elevated inflation and portfolio has gold exposure`

Recommendation alignment:

`60 + constructiveHeldCount * 4 - weakHeldCount * 8 + coverage * 12`

Fixed income:

`78 - max(0, 0.08 - totalBondAllocation) * 120 - max(0, longDurationExposure - 0.35) * 60 - max(0, highYieldExposure - 0.20) * 80 + min(8, recessionHedgeExposure * 10)`

Theme exposure:

`64 + min(15, alignedThemeCount * 4) - max(0, largestSectorWeight - 0.45) * 50`

Geography:

`86 - max(0, usWeight - 0.70) * 80 - max(0, 0.12 - internationalWeight) * 120`

Geography currently has 0% overall weight but is still shown as a diagnostic section.

## Macro/FRED Trend and Theme Scores

Primary code:

- `src/application/services/macro/MacroTrendService.ts`
- `src/application/services/macro/FredThemeSignalService.ts`

### Macro Trend Confidence

`confidence = round((observationCount / needed) * 100)`, clamped to 0-100.

Needed observations:

- Quarterly -> 6
- Daily -> 30
- Other -> 12

### Macro Trend Severity

- Inflation indicators: `abs(oneYearChange) * 15`, capped at 100.
- Interest rates/yields: `abs(latestValue) * 10`, capped at 100.
- Unemployment: `max(0, latestValue - 3.5) * 25`, capped at 100.
- Other: `abs(oneYearChange) * 10`, capped at 100.

### Macro Persistence

Uses the latest six observations and counts how many are non-decreasing versus the previous observation:

`persistenceScore = min(100, count * 16)`

### FRED Theme Signal Scores

FRED theme signals map indicator codes to themes, such as:

- Rates
- Inflation
- Growth
- Employment
- Yield Curve
- Currency
- Energy

Signal severity, persistence, and confidence are copied/clamped from macro trends. Oil can add an extra Inflation signal when rising and the move is material.

## Score QA Rules

When validating scores:

1. Confirm input units are decimals, not percentage-scale numbers.
2. Confirm latest data dates align across raw prices, daily returns, anchors, market metrics, and risk metrics.
3. Confirm missing components are excluded rather than treated as zero.
4. Confirm guardrails explain any label cap.
5. Confirm ETF exposure uses look-through where available.
6. Confirm scheduled jobs refresh upstream layers before downstream score tables.
