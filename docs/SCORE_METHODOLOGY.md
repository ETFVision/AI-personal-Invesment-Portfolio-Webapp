# ETFVision Score Methodology

Last updated: 2026-06-18 00:00:00 +08:00

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

### Financial Sector Methodology

Balance-sheet financial instruments use adjusted business-quality benchmarks because bank, insurance, and diversified financial balance sheets are structurally different from industrial company balance sheets.

Detection is intentionally curated: a company must have a financial sector profile and a balance-sheet financial industry such as banks, capital markets / broker-dealers, insurance, thrifts, or mortgage finance. Fee-based financial businesses such as credit services / payments and asset management are not included in this adjusted set, so they retain the standard industrial scoring inputs.

- Profitability is adjusted for balance-sheet financial instruments: gross margin is excluded because it is not a meaningful operating measure for banks, insurers, and similar balance-sheet financial businesses.
- ROA uses financial-sector thresholds: `scoreReturn(roa, 0.005, 0.02)`, where 0.5% is weak and 2.0% is excellent.
- Cash flow score is excluded because free cash flow is not directly comparable to operating companies and is not applicable to bank and insurer balance sheets in the same way.
- Balance sheet score is computed from capital-quality proxies:
  - ROE: `scoreReturn(roe, 0.06, 0.18)`
  - ROA: `scoreReturn(roa, 0.004, 0.015)`
  - Price/book: `scoreLowerBetter(priceToBook, 1.0, 3.5)`
- Debt/equity and net debt/EBITDA are excluded for financial-sector balance sheet scoring because structural banking leverage is not the same as industrial financial risk.
- Quality excludes cash conversion / accruals and ROIC durability for balance-sheet financial instruments. Quality is then re-normalized from earnings stability and capital discipline only.
- ETFVision does not currently score capital adequacy, reserve quality, asset quality, or regulatory capital ratios. Financial-sector scores are therefore lower-resolution than industrial scores. A future enhancement may add ROE/ROA durability signals with financial-specific anchors.

### Quality Score

Quality measures earnings quality and consistency using fixed economic anchors that are validated once against the investable universe and are not refit on each refresh. Missing signals are excluded from the denominator.

| Signal | Measure | Anchor | Weight |
|---|---|---|---|
| Earnings stability | Coefficient of variation across available operating and net margin observations | `scoreLowerBetter(cv, 0.10, 0.50)` | 30% |
| Cash conversion / accruals | `operatingCashFlow / netIncome`; fallback: `1 - (netIncome - operatingCashFlow) / totalAssets` | `scoreHigherBetter(ratio, 0.60, 1.10)` | 30% |
| ROIC durability | Persistence and consistency of value-creating ROIC over the latest five annual observations, requiring at least three annual ROIC values | If average ROIC is below the 8% cost-of-capital proxy, the signal scores 10; otherwise `scoreLowerBetter(coefficientOfVariation(roicSeries), 0.15, 0.60)` | 25% |
| Capital discipline | Year-over-year shares outstanding growth | `scoreLowerBetter(shareGrowth, -0.02, 0.10)` | 15% |

The score is intentionally orthogonal to Profitability, Cash Flow and Balance Sheet sub-scores: those categories measure level and scale; Quality measures stability, conversion, through-time value-creation durability and dilution discipline. ROIC durability is therefore not an average ROIC level; it rewards sustained returns above the cost-of-capital proxy with low variation across annual observations.

For balance-sheet financial instruments, cash conversion / accruals and ROIC durability are excluded from the Quality denominator because those signals overlap with cash-flow and efficiency measures that are not comparable for banks, insurers, and similar balance-sheet financial businesses.

### Fundamentals Confidence

`scoreConfidence = clamp((availableInputs / 16) * 100)`

Availability count includes growth, profitability, valuation, balance-sheet, cash-flow and quality-signal data points listed in the scoring service.

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
- `src/application/services/risk/RiskAnalyticsDataService.ts`
- `src/application/services/risk/VolatilityService.ts`
- `src/application/services/risk/DrawdownService.ts`
- `src/application/services/risk/CorrelationService.ts`

Stored inputs:

- `portfolio_snapshots`
- `holding_snapshots`
- `instrument_prices`
- `instrument_market_metrics`
- `instrument_risk_metrics`
- `portfolio_lookthrough_exposures`
- `portfolio_lookthrough_holdings`
- `transactions`

### Risk Page Data Assembly

`RiskAnalyticsDataService` builds the page report by collecting:

- Recent portfolio snapshots.
- Holding snapshots.
- Portfolio transactions.
- Active holdings and universe metadata.
- Instrument price history for current holdings and benchmark symbols.
- Benchmark snapshots and synthetic benchmark series.
- Latest portfolio review summary where available.
- Portfolio look-through exposure context, including ETF sector/country/theme/top-holding exposure.

The risk page should prefer look-through exposure context for sector and geography views. Product categories such as `US_BROAD_MARKET` are ETF taxonomy labels and should not be used as sector allocation unless no exposure data exists.

### Flow-Adjusted Portfolio Return

Portfolio period return:

`(currentTotalValue - netExternalFlow) / previousTotalValue - 1`

External flows include:

- `deposit_cash` as positive flow.
- `withdraw_cash` as negative flow.

This creates a TWR-style level series for portfolio risk snapshots.

The service excludes implausible daily returns with absolute value above `1` from volatility windows because those normally indicate snapshot or flow anomalies rather than investment volatility.

### Portfolio Volatility

`annualizedVolatility = sampleStdDev(returns) * sqrt(252)`

Windows shown by the risk layer include:

- 30D volatility.
- 90D volatility.
- 1Y volatility.

Each uses the TWR-style portfolio return series, not raw change in account value.

### Portfolio Drawdown

Drawdown is calculated from a chained TWR-style portfolio level series:

1. Start level at 100.
2. Multiply by `1 + portfolioReturn` for each flow-adjusted period.
3. Track running peak.
4. Current drawdown = current level / running peak - 1.
5. Max drawdown = most negative drawdown in the level series.

This means deposits do not create artificial gains and withdrawals do not create artificial drawdowns.

### Correlation Analytics

Primary code: `CorrelationService.ts`

Holding correlations are calculated from holding market-value return series:

1. Build return series for each holding from `holding_snapshots`.
2. Align return observations on common dates.
3. Calculate Pearson correlation for each pair.
4. Mark high-correlation pairs at `>= 0.85`.
5. Average unique pair correlations for portfolio-level correlation diagnostics.

Asset-class correlations use the same principle after grouping holdings by asset type.

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

Eligibility requirements:

- Asset return history comes from `instrument_prices` mapped to current holdings.
- An asset generally needs at least 30 overlapping observations with the other eligible assets.
- Covariance method is used when eligible coverage is at least about 70% of portfolio value.

If covariance coverage is insufficient, the service uses a proxy contribution model:

| Asset type | Proxy risk weight |
|---|---:|
| Crypto | 1.80 |
| Stock | 1.25 |
| Gold ETF | 1.05 |
| Bond ETF | 0.55 |
| Other | 1.00 |

Proxy contribution:

`riskShare = allocationWeight * proxyRiskWeight`

`riskContribution = riskShare / sum(riskShare)`

When covariance is available for only part of the portfolio, covariance contributions replace the eligible proxy items and ineligible holdings retain proxy treatment.

### Diversification Score

Primary code: `diversificationScore` in `riskMath.ts`

Formula:

`score = holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty`

Where:

- `holdingScore = min(meaningfulHoldings / 12, 1) * 20`
- `assetClassScore = min(assetClassCount / 5, 1) * 20`
- `sectorScore = min(sectorCount / 8, 1) * 20`
- `currencyScore = min(currencyCount / 3, 1) * 10`
- `correlationPenalty = averageCorrelation == null ? 5 : max(0, averageCorrelation) * 15`

Concentration is measured in the Concentration section; Diversification measures breadth and correlation so the two are not double-counted. Correlation is the primary risk signal inside this score, while holding count, asset-class spread, sector spread, and currency spread measure breadth.

Final score is rounded and clamped to 0-100.

### Risk Warnings and Diagnostics

The risk page can emit warnings for:

- Top holding concentration above 25%.
- Top five holdings concentration above 65%.
- High-correlation pairs.
- Fewer than 30 usable portfolio snapshots.
- Excluded jump returns.
- Cash exposure above 50%.
- Proxy risk contribution method when covariance coverage is insufficient.

### Benchmark Drawdown and Comparison Context

Benchmark drawdowns use benchmark snapshot level values when available. The data service can also build synthetic benchmark snapshots from instrument prices for configured benchmark symbols. Benchmark comparison is contextual and does not replace portfolio TWR metrics.

## Fixed Income Page Methodology

Primary code:

- `src/application/services/bonds/BondService.ts`
- `src/application/services/bonds/BondAnalyticsService.ts`
- `src/application/services/bonds/BondProfileService.ts`
- `src/application/services/bonds/DurationAnalysisService.ts`
- `src/application/services/bonds/CreditExposureService.ts`
- `src/app/(dashboard)/bonds/page.tsx`

Primary stored inputs:

- `instruments`
- `bond_profiles`
- Portfolio holdings and current holding valuations from the portfolio dashboard.

### Bond Holding Eligibility

A holding is included in the fixed-income analytics report when:

- The universe instrument exists and normalizes as a bond ETF, or
- The holding asset type is `bond_etf`, in which case a synthetic fixed-income instrument can be constructed for analysis.

`BondProfileService.normalizeProfile` resolves profile fields in this priority order:

1. `bond_profiles` row.
2. `instruments` fixed-income metadata.
3. Seeded bond ETF fallback profile for known bond ETFs.
4. Conservative defaults, where applicable.

### Bond Allocation Metrics

`totalBondValue`:

`sum(current market value of eligible bond ETF holdings)`

`totalBondAllocation`:

`totalBondValue / totalPortfolioValue`

For each bond holding:

- `allocationPercent = holdingValue / totalPortfolioValue`
- `bondAllocationPercent = holdingValue / totalBondValue`

Breakdown tables group bond value by:

- Duration bucket.
- Bond type.
- Credit quality.
- Geography.
- Currency.

Each breakdown row uses:

`rowPercent = groupedBondValue / totalBondValue`

### Exposure Metrics

All portfolio-level bond exposures use total portfolio value as the denominator:

| Metric | Formula |
|---|---|
| Treasury exposure | Value of holdings where `bondType` is `treasury` or `inflation-linked`, or `creditQuality` is `government`, divided by total portfolio value. |
| Corporate exposure | Value of holdings where `bondType` is `corporate` or `high yield`, divided by total portfolio value. |
| Investment-grade exposure | Value of holdings where `creditQuality` is `investment grade`, `mixed investment grade`, or `government`, divided by total portfolio value. |
| High-yield exposure | Value of holdings where `creditQuality` or `bondType` is `high yield`, divided by total portfolio value. |
| Inflation-linked exposure | Value of holdings where `inflationLinked = true`, divided by total portfolio value. |
| Cash-like exposure | Value of holdings where duration is `ultra-short`, bond type is `cash-like`, or liquidity role includes `cash-like`, divided by total portfolio value. |
| Long-duration exposure | Value of holdings where duration category is `long`, divided by total portfolio value. |
| Recession hedge exposure | Value of holdings where recession sensitivity is `positive`, divided by total portfolio value. |
| Credit-risk exposure | Value of holdings where credit quality is `high yield`, bond type is `high yield`, or bond type is `corporate`, divided by total portfolio value. |

Profile coverage:

`bond holdings with duration, bond type and credit quality / total bond holdings`

If there are no bond holdings, profile coverage is treated as `1` because there is no missing bond profile to review.

### Rate and Spread Shock Estimates

Per holding:

- `estimatedRateShockUp1Pct = -effectiveDuration / 100`
- `estimatedRateShockDown1Pct = effectiveDuration / 100`
- `estimatedSpreadWidening1Pct = -spreadDuration / 100`

These are first-order approximations. They do not model convexity, curve shape, manager positioning, ETF premium/discount behavior, or changing fund composition.

### Scenario Impacts

Scenario impacts are weighted by both bond-sleeve allocation and total portfolio allocation.

For each scenario:

- Bond sleeve impact = `sum(bondAllocationPercent * holdingScenarioImpact)`.
- Portfolio impact = `sum(allocationPercent * holdingScenarioImpact)`.

Current scenarios:

| Scenario | Holding impact logic |
|---|---|
| Rates +1% | Uses `estimatedRateShockUp1Pct`. |
| Rates -1% | Uses `estimatedRateShockDown1Pct`. |
| Inflation surprise | TIPS/inflation-linked holdings get `+2.5%`; negative inflation sensitivity gets `-3%`; moderate negative gets `-1.5%`; otherwise `-0.5%`. |
| Recession | Positive recession sensitivity gets rate-down estimate plus `+1%`; negative recession sensitivity gets spread-widening estimate minus `3%`; mixed gets `0`. |
| Credit spreads +1% | Uses spread-widening estimate, plus `-4%` for high yield or `-1.5%` for corporate credit. |

### Warnings

The fixed-income page emits warnings when:

- Long-duration bond exposure is above 20% of total portfolio value.
- High-yield exposure is above 10% of total portfolio value.
- Corporate credit-risk exposure is above 25% of total portfolio value.

### Diagnostics and Allocation Guidance

Diagnostics explain whether the bond sleeve has:

- Meaningful cash-like stability.
- Treasury recession-hedge exposure.
- TIPS/inflation-linked exposure.
- Meaningful credit exposure.
- Meaningful long-duration rate sensitivity.

Allocation guidance flags:

- No visible bond sleeve.
- Bond sleeve mostly cash-like.
- Limited Treasury recession-hedge exposure.
- No TIPS/inflation-linked allocation.
- High-yield share large within the bond sleeve.
- Otherwise, a reasonably balanced fixed-income sleeve.

### Relationship to Portfolio Review

The Portfolio Review Fixed Income section consumes the bond analytics report. Its score formula is documented under Portfolio Review Scores:

`78 - max(0, 0.08 - totalBondAllocation) * 120 - max(0, longDurationExposure - 0.35) * 60 - max(0, highYieldExposure - 0.20) * 80 + min(8, recessionHedgeExposure * 10)`

The fixed-income page itself is mainly explanatory and diagnostic; it does not execute trades or create direct recommendations.

## Recommendation Scores

Primary code:

- `src/application/services/recommendations/RecommendationRulesService.ts`
- `src/application/services/recommendations/recommendationScoring.ts`
- Type-specific recommendation services.

Recommendation scores are universal instrument Characteristics Scores. They use instrument quality, market metrics, risk analytics, macro context, Market Vision alignment, fundamentals, themes, and bond profile data where applicable. They do not use a user's current holdings, portfolio concentration, duplicate exposure, allocation fit, or portfolio-fit score.

### Generic Weighted Score

`overallScore = weighted average of available finite component scores`

Missing components are excluded from the denominator.

### Internal Label Thresholds

Internal labels are kept for scoring, guardrails, telemetry, and historical compatibility. They should not be presented to users as investment recommendations.

| Score | Internal label |
|---:|---|
| 80+ | Strong Buy |
| 65-79.99 | Buy |
| 48-64.99 | Hold |
| 35-47.99 | Watch |
| 20-34.99 | Reduce |
| Below 20 | Sell |
| Missing | Insufficient Data |

### User-Facing Insights Labels

The webapp presents the internal labels as neutral characteristics assessments:

| Internal label | User-facing label |
|---|---|
| Strong Buy | Excellent |
| Buy | Good |
| Hold | Neutral |
| Watch | Weak |
| Reduce | Poor |
| Sell | Significant Concerns |
| Insufficient Data | Insufficient Data |
| Not Applicable | Not Applicable |

The user-facing language is intentionally framed around characteristics and concerns. It should not say an instrument is a buy, sell, hold, reduce, purchase candidate, or trade instruction.

Generated instrument insight summaries use wording such as:

`TSM has a Good characteristics assessment with a deterministic score of 74/100.`

They should not use wording such as:

`TSM is rated Buy.`

### Public Methodology Page

The public `/methodology` route is the user-facing presentation layer for this document's formula-level methodology. It is intentionally written as an explanatory methodology page, not as an internal developer spec.

Current presentation rules:

- The page is public and does not require authentication.
- The page shows Characteristics Score assessment ranges using user-facing labels only.
- Internal labels such as Strong Buy, Buy, Hold, Watch, Reduce, and Sell remain internal compatibility labels and should not appear in public assessment tables.
- Formula-level details for Characteristics components, fundamentals normalization, fundamentals sub-scores, confidence, Portfolio Review formulas, and macro/Market Vision inputs remain available for transparency.
- Characteristics Score methodology is presented as universal instrument methodology, separate from the personalized Portfolio Review methodology.
- Dense formula tables are collapsed behind formula-detail accordions by default so non-technical users can skim the page before opening technical detail.
- The page includes compliance positioning that scores are deterministic analytical outputs, not investment advice, trade instructions, securities ratings, or predictions of future performance.

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
- YTD return adds `clamp(ytdReturn * 40, -15, 15)`.
- Daily return adds `clamp(dailyReturn * 80, -5, 5)`.
- The trailing 1-year return is intentionally excluded from Momentum for ETFs because 1-year performance is measured in the Benchmark Relative component.

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

- Portfolio fit is retained as a standalone diagnostic service outside the stored recommendation scoring pipeline.
- It is not included in Characteristics Score weights, stored recommendation inputs, score snapshots, or current recommendation run calculations.
- Portfolio-specific analysis belongs in Portfolio Review scores, gap analysis, and exposure diagnostics, not in universal instrument Characteristics Scores.

### Type-Specific Recommendation Weights

#### Stocks

| Component | Weight |
|---|---:|
| Business Quality | 40% |
| Valuation | 20% |
| Fundamental Trends | 15% |
| Risk Analytics | 10% |
| Market Vision alignment | 7% |
| Theme alignment | 5% |
| Momentum | 3% |

Business Quality is a composite of the fundamental sub-scores: Growth (25%), Profitability (25%), Cash Flow (20%), Balance Sheet (15%), and Quality (15%). Valuation is intentionally excluded to prevent double-counting valuation as both a Business Quality input and a separate top-level component. Missing sub-scores are excluded from both numerator and denominator.

#### ETFs

| Component | Weight |
|---|---:|
| Risk analytics | 30% |
| Momentum | 20% |
| Macro fit | 18% |
| Benchmark relative | 18% |
| Market Vision alignment | 9% |
| Theme fit | 5% |

Benchmark relative compares ETF trailing 1-year return to a stable external asset-class benchmark:

- `excessReturn = ETF 1Y return - benchmark 1Y return`
- Excess return is winsorized at `+/- 0.50`.
- `score = 50 + excessReturn * 100`, clamped to 0-100.
- Benchmark parity scores 50; +25 percentage points of annual excess return scores 75, and about +50 percentage points reaches the top of the scale. This treats +25pp as strong but not the ceiling because concentrated sector and thematic ETFs can exceed broad asset-class benchmarks by 30-50pp in strong years.
- Missing benchmark snapshots or missing 1-year returns exclude this component from the weighted denominator.

ETF benchmark map:

| ETF category | Benchmark |
|---|---|
| US broad market, Growth, Value, Dividend, Small Cap, US sector/thematic categories | `sp500` |
| Global Equity | `global_equities` |
| Developed Markets, International Dividend, developed-market country funds | `developed_ex_us` |
| Emerging Markets, emerging-market country funds | `emerging_markets` |
| Bond, Cash Equivalent | `us_aggregate_bonds` |
| Commodity, Gold / Precious Metals | `gold` |
| Crypto ETF | `bitcoin` |

Relative measures reference external benchmarks. Constants are fixed economic anchors validated once against the universe, not refit per refresh; a score changes when the instrument or market moves, not when universe composition changes.

#### Bond ETFs

| Component | Weight |
|---|---:|
| Duration fit | 22% |
| Rate regime | 22% |
| Inflation regime | 16% |
| Yield curve | 13% |
| Credit risk | 11% |
| Portfolio stability | 11% |
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
| Inflation hedge | 36% |
| Geopolitical hedge | 29% |
| Rates context | 14% |
| Momentum | 14% |
| Market Vision alignment | 7% |

Inflation hedge is 78 when inflation regime includes elevated/rising, otherwise 55. Geopolitical hedge is 72 when liquidity regime includes stress/tight, otherwise 55.

#### Crypto

| Component | Weight |
|---|---:|
| Risk | 40% |
| Momentum | 20% |
| Liquidity regime | 20% |
| Macro risk appetite | 9% |
| Theme score | 7% |
| Market Vision alignment | 4% |

Liquidity score:

- Tight liquidity -> 35.
- Macro regime available and not tight -> 58.
- Missing macro regime -> null.

### Recommendation Guardrails

| Condition | Cap |
|---|---|
| Confidence below 50 | Insufficient Data |
| Business Quality below 35 for stocks | Watch |
| Valuation below 15 for stocks | Hold |
| Risk score above 75 | Hold for stocks with Strong or Exceptional Business Quality; otherwise Watch unless already lower |
| Long-duration bond mismatch with restrictive/rising/high rates | Hold |

The guardrail service still accepts optional concentration and duplicate-exposure inputs for backward compatibility and direct tests. The current stored recommendation scoring pipeline does not pass those portfolio-dependent inputs.

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
| Insight alignment | 10% |
| Fixed income | 10% |
| Theme exposure | 5% |
| Geography | 0% |

### Section Formulas

Allocation:

`82 - max(0, equity - 0.85) * 80 - max(0, 0.08 - bonds) * 90 - max(0, cash - 0.35) * 55 - max(0, crypto - 0.10) * 90`

Concentration:

`90 - max(0, topIssuerConcentration - 0.10) * 150 - max(0, topCombinedFive - 0.40) * 80 - max(0, sectorTop - 0.40) * 60`

Concentration is measured at the underlying-company (issuer look-through) level on a total-value basis, including cash in the denominator. Direct single-stock holdings are included in issuer exposure; diversified ETF wrappers are retained as direct-position metadata but do not trigger single-company concentration findings.

Diversification:

- Starts from Risk Analytics diversification score.
- If ETF look-through exists, adds `min(8, sectorCount + countryCount)`.
- Concentration is measured in the Concentration section; Diversification measures breadth and correlation so the two are not double-counted.

Portfolio risk:

`88 - max(0, volatility - 0.18) * 120 - max(0, abs(maxDrawdown) - 0.15) * 100 - max(0, abs(currentDrawdown) - 0.08) * 70`

Macro fit:

`72 - 8 if restrictive rates and equity allocation > 75% - 10 if weak growth and equity allocation > 70% + 5 if elevated inflation and portfolio has gold exposure`

Insight alignment:

`60 + constructiveHeldCount * 4 - weakHeldCount * 8 + coverage * 12`

The section score is capped at 94 when the section has any incomplete-coverage or weak-holding finding. The cap does not change the formula terms; it prevents a perfect section score from displaying alongside a watch or attention finding.

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
