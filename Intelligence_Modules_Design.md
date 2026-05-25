# Intelligence Modules Design

## 1. Objective

Design five intelligence modules for the personal AI portfolio intelligence app:

1. Benchmarking.
2. Risk analytics.
3. Scenario analysis.
4. News intelligence.
5. Monthly telemetry.

Each module should provide deterministic calculations, auditable evidence, UI concepts, and structured outputs that can feed the Recommendation Engine, Market Vision dashboard, Watchlist Intelligence, Bond Intelligence, and Initial Capital Allocation Engine.

AI may summarize and classify information, but deterministic rules should calculate core metrics and final scoring impacts.

## 2. Shared Design Principles

- Store raw inputs, calculated metrics, and generated summaries separately.
- Prefer deterministic calculations for returns, risk, scenarios, scoring, and telemetry.
- Use AI for summarization, classification, clustering, and user-facing explanations.
- Keep module outputs structured so they can be reused by recommendations.
- Use weekly and monthly snapshots to avoid noisy day-to-day overreaction.
- Include bond impacts explicitly in risk, benchmark, scenario, and telemetry outputs.

---

# Module 1: Benchmarking

## 1.1 Purpose

The Benchmarking module compares the portfolio against relevant reference instruments and blended benchmarks.

Required benchmark categories:

- S&P 500.
- Nasdaq.
- Global equities.
- 60/40 portfolio.
- Gold.
- Bitcoin.
- Bond benchmarks.

## 1.2 Recommended Benchmark Set

| Benchmark | Proxy Type | Example Instrument |
| --- | --- | --- |
| S&P 500 | US large-cap equities | SPY or VOO |
| Nasdaq | US growth/technology-heavy equities | QQQ |
| Global equities | Global equity ETF | VT or ACWI |
| 60/40 portfolio | Blended benchmark | 60% global equity, 40% aggregate bond |
| Gold | Gold ETF | GLD or IAU |
| Bitcoin | Crypto benchmark | BTC |
| US aggregate bonds | Bond benchmark | AGG or BND |
| Short Treasury | Cash-like bond benchmark | SGOV, BIL, or SHY |
| Long Treasury | Duration benchmark | TLT |
| Inflation-linked bonds | Inflation-linked benchmark | TIP or VTIP |

The user should be able to choose a primary benchmark and a custom blended benchmark that reflects the target allocation model.

## 1.3 Logic Flow

```text
Load benchmark definitions
  -> Fetch daily prices for benchmark instruments
  -> Calculate benchmark return series
  -> Build blended benchmark if needed
  -> Compare portfolio snapshots to benchmark series
  -> Calculate relative return, volatility, drawdown, beta, tracking behavior
  -> Store benchmark performance
  -> Surface insights in dashboard and recommendations
```

## 1.4 DB Tables

Use existing:

- `benchmarks`
- `benchmark_performance`
- `daily_prices`
- `portfolio_snapshots`

Recommended extension:

```sql
create table portfolio_benchmark_comparisons (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  benchmark_id uuid not null references benchmarks(id),
  comparison_date date not null,
  period text not null,
  portfolio_return numeric(18, 10),
  benchmark_return numeric(18, 10),
  excess_return numeric(18, 10),
  portfolio_volatility numeric(18, 10),
  benchmark_volatility numeric(18, 10),
  portfolio_drawdown numeric(18, 10),
  benchmark_drawdown numeric(18, 10),
  beta_to_benchmark numeric(18, 10),
  tracking_difference numeric(18, 10),
  notes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (portfolio_id, benchmark_id, comparison_date, period)
);

create index idx_portfolio_benchmark_comparisons_portfolio_date
  on portfolio_benchmark_comparisons (portfolio_id, comparison_date desc);
```

## 1.5 Pseudo-Code

```ts
export class BenchmarkingService {
  async updateBenchmarkPerformance(date: Date): Promise<void> {
    const benchmarks = await this.benchmarkRepo.listActiveBenchmarks();

    for (const benchmark of benchmarks) {
      const performance = benchmark.componentWeights
        ? await this.calculateBlendedBenchmark(benchmark, date)
        : await this.calculateSingleAssetBenchmark(benchmark, date);

      await this.benchmarkRepo.savePerformance(performance);
    }
  }

  async comparePortfolio(portfolioId: string, benchmarkId: string, period: Period) {
    const portfolioSeries = await this.portfolios.getSnapshotSeries(portfolioId, period);
    const benchmarkSeries = await this.benchmarks.getPerformanceSeries(benchmarkId, period);

    return calculateBenchmarkComparison(portfolioSeries, benchmarkSeries);
  }
}
```

## 1.6 UI Concepts

- Benchmark selector.
- Portfolio vs benchmark line chart.
- Relative performance table.
- Benchmark tiles: S&P 500, Nasdaq, global equities, 60/40, gold, Bitcoin, bonds.
- Rolling return comparison.
- Drawdown comparison.
- "What this means" explanation.

## 1.7 Example Output

```text
Your portfolio underperformed the 60/40 benchmark by 1.8% over the last month but had a smaller drawdown. The difference came mainly from lower equity exposure and higher cash allocation.
```

---

# Module 2: Risk Analytics

## 2.1 Purpose

The Risk Analytics module quantifies portfolio vulnerabilities and diversification quality.

Required metrics:

- Volatility.
- Drawdown.
- Sharpe ratio.
- Concentration.
- Sector exposure.
- Geography exposure.
- Currency exposure.
- Correlations.
- Diversification quality.
- Bond duration exposure.
- Bond credit exposure.

## 2.2 Logic Flow

```text
Load holdings, cash, prices, asset metadata, bond profiles
  -> Convert values to base currency
  -> Calculate allocation exposures
  -> Calculate returns and volatility
  -> Calculate drawdown and Sharpe ratio
  -> Calculate concentration metrics
  -> Calculate sector/geography/currency exposures
  -> Calculate asset correlations
  -> Calculate diversification quality
  -> Calculate bond duration and credit exposure
  -> Store risk snapshot
  -> Feed recommendations and scenario analysis
```

## 2.3 DB Tables

Use existing:

- `portfolio_risk_metrics`
- `asset_correlations`
- `asset_snapshots`
- `portfolio_snapshots`
- `holdings`
- `bond_etf_profiles`
- `bond_assets`

Recommended extension:

```sql
create table portfolio_exposure_breakdowns (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  exposure_date date not null,
  exposure_type text not null,
  exposures jsonb not null,
  created_at timestamptz not null default now(),
  unique (portfolio_id, exposure_date, exposure_type)
);

create index idx_portfolio_exposure_breakdowns_portfolio_date
  on portfolio_exposure_breakdowns (portfolio_id, exposure_date desc);
```

## 2.4 Pseudo-Code

```ts
export class RiskAnalyticsService {
  async calculateRiskSnapshot(portfolioId: string, asOfDate: Date): Promise<PortfolioRiskMetrics> {
    const holdings = await this.holdings.listActive(portfolioId);
    const snapshots = await this.assets.getPortfolioAssetSnapshots(portfolioId, asOfDate);
    const returnSeries = await this.portfolios.getReturnSeries(portfolioId, 252);
    const bondProfiles = await this.bonds.getProfilesForHoldings(holdings);

    const volatility = calculateAnnualizedVolatility(returnSeries);
    const maxDrawdown = calculateMaxDrawdown(returnSeries);
    const sharpeRatio = calculateSharpeRatio(returnSeries, await this.rates.getRiskFreeRate());
    const concentration = calculateConcentration(snapshots);
    const exposures = calculateExposureBreakdowns(snapshots);
    const bondExposure = calculateBondExposure(holdings, snapshots, bondProfiles);

    return {
      portfolioId,
      metricDate: asOfDate,
      volatility,
      maxDrawdown,
      sharpeRatio,
      concentrationScore: concentration.score,
      singlePositionMaxPct: concentration.maxPositionPct,
      sectorExposure: exposures.sector,
      geographyExposure: exposures.geography,
      currencyExposure: exposures.currency,
      bondDuration: bondExposure.weightedDuration,
      highYieldExposurePct: bondExposure.highYieldPct,
      riskNotes: buildRiskNotes({ concentration, exposures, bondExposure }),
    };
  }
}
```

## 2.5 Diversification Quality Logic

Diversification quality should account for:

- Number of meaningful positions.
- Correlation between holdings.
- Sector concentration.
- Region concentration.
- Currency concentration.
- Asset class balance.
- ETF overlap where available.
- Bond sleeve quality.

```ts
export function calculateDiversificationQuality(input: DiversificationInput): number {
  const positionScore = scorePositionDistribution(input.positionWeights);
  const correlationScore = scoreAverageCorrelation(input.correlations);
  const sectorScore = scoreExposureBalance(input.sectorExposure);
  const geographyScore = scoreExposureBalance(input.geographyExposure);
  const currencyScore = scoreCurrencyBalance(input.currencyExposure);
  const assetClassScore = scoreAssetClassBalance(input.assetClassExposure);

  return weightedAverage({
    positionScore,
    correlationScore,
    sectorScore,
    geographyScore,
    currencyScore,
    assetClassScore,
  });
}
```

## 2.6 UI Concepts

- Risk dashboard summary.
- Volatility and drawdown cards.
- Sharpe ratio card.
- Concentration heatmap.
- Sector/geography/currency exposure charts.
- Correlation matrix.
- Diversification quality gauge.
- Bond duration and credit exposure panel.
- Risk notes with suggested actions.

## 2.7 Example Output

```text
Risk summary: portfolio concentration is moderate, but technology exposure is high at 34%. Bond duration is 6.2 years, creating meaningful sensitivity to rising rates. Diversification quality is acceptable, but could improve with broader international equity exposure and less single-sector concentration.
```

---

# Module 3: Scenario Analysis

## 3.1 Purpose

The Scenario Analysis module estimates portfolio impact under predefined market shocks.

Required scenarios:

- Recession.
- High inflation.
- Prolonged high rates.
- Oil spike.
- USD weakness.
- Crypto crash.
- AI bubble correction.
- Geopolitical conflict.

Each scenario must include bond impacts.

## 3.2 Scenario Assumption Framework

Each scenario includes assumptions for:

- Equities.
- Bonds.
- Gold.
- Crypto.
- Currency.
- Sector impacts.
- Credit spreads.
- Inflation.
- Interest rates.
- Duration impacts.

## 3.3 Scenario Matrix

| Scenario | Equity Impact | Bond Impact | Gold Impact | Crypto Impact |
| --- | --- | --- | --- | --- |
| Recession | Broad equity decline | Treasuries may rally; high-yield hurt by spreads | Often supportive | Risk-off decline |
| High inflation | Valuation pressure | Long nominal bonds hurt; TIPS supported | Supportive | Mixed, often risk-sensitive |
| Prolonged high rates | Growth multiple pressure | Short duration favored; long duration pressured | Mixed | Liquidity headwind |
| Oil spike | Consumer margin pressure | Inflation-linked supported; nominal duration pressured | Supportive | Risk-off pressure |
| USD weakness | International assets helped in USD terms | Foreign bonds may benefit unhedged | Often supportive | May support BTC narrative |
| Crypto crash | Limited unless crypto held | Minimal direct bond impact | Usually minimal/direct mixed | Severe crypto drawdown |
| AI bubble correction | Tech/growth drawdown | Treasuries may stabilize if risk-off | Neutral/supportive | Risk-off pressure |
| Geopolitical conflict | Risk-off equity pressure | Treasuries and cash-like bonds supported; credit hurt | Supportive | Mixed/high volatility |

## 3.4 Logic Flow

```text
Load scenario definition
  -> Load current holdings and exposures
  -> Load asset classifications and bond profiles
  -> Apply asset-class shocks
  -> Apply sector/geography/currency shocks
  -> Apply bond duration and credit-spread shocks
  -> Estimate holding-level impacts
  -> Aggregate portfolio impact
  -> Generate explanation and mitigation ideas
  -> Store scenario result
```

## 3.5 DB Tables

Use existing:

- `scenario_tests`
- `scenario_results`
- `holdings`
- `asset_snapshots`
- `bond_etf_profiles`
- `bond_assets`

Recommended extension:

```sql
create table scenario_assumptions (
  id uuid primary key,
  scenario_test_id uuid not null references scenario_tests(id),
  assumption_scope text not null,
  scope_key text not null,
  shock_type text not null,
  shock_value numeric(18, 10) not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_scenario_assumptions_test
  on scenario_assumptions (scenario_test_id);
```

## 3.6 Pseudo-Code

```ts
export class ScenarioAnalysisService {
  async runScenario(portfolioId: string, scenarioId: string): Promise<ScenarioResult> {
    const scenario = await this.scenarios.getScenario(scenarioId);
    const holdings = await this.holdings.listActive(portfolioId);
    const snapshots = await this.assets.getLatestSnapshots(portfolioId);
    const bondProfiles = await this.bonds.getProfilesForHoldings(holdings);

    const impacts = holdings.map((holding) => {
      const snapshot = snapshots[holding.assetId];
      const baseImpact = estimateAssetClassShock(holding, snapshot, scenario);
      const bondImpact = isBondEtf(holding)
        ? estimateBondScenarioImpact(holding, snapshot, bondProfiles[holding.assetId], scenario)
        : 0;

      return {
        holdingId: holding.id,
        assetId: holding.assetId,
        estimatedImpact: baseImpact + bondImpact,
      };
    });

    return aggregateScenarioImpacts(portfolioId, scenario, impacts);
  }
}
```

## 3.7 Bond Impact Logic

Bond impact combines:

- Duration shock.
- Credit-spread shock.
- Inflation-linked adjustment.
- Flight-to-quality adjustment.
- Currency adjustment for international bonds.

```ts
export function estimateBondScenarioImpact(
  holding: Holding,
  snapshot: AssetSnapshot,
  profile: BondEtfProfile,
  scenario: ScenarioDefinition,
): number {
  const rateImpact = -profile.effectiveDuration * scenario.rateShock;
  const spreadImpact = getSpreadSensitivity(profile.creditQuality) * scenario.creditSpreadShock * -1;
  const inflationAdjustment = profile.bondType === "inflation_linked"
    ? scenario.inflationLinkedBenefit
    : 0;
  const qualityAdjustment = profile.creditQuality === "treasury"
    ? scenario.flightToQualityBenefit
    : 0;

  return snapshot.marketValue * (
    rateImpact +
    spreadImpact +
    inflationAdjustment +
    qualityAdjustment
  );
}
```

## 3.8 UI Concepts

- Scenario selector.
- Scenario assumption editor.
- Portfolio impact summary.
- Asset-class impact chart.
- Holding-level impact table.
- Bond impact breakdown.
- Suggested mitigations.
- Compare scenarios side-by-side.

## 3.9 Example Output

```text
Recession scenario:
Estimated portfolio impact: -14.8%.

Bond impact:
Intermediate Treasury exposure offsets part of the equity drawdown, but high-yield bond exposure is estimated to decline due to credit-spread widening. Long-duration Treasury ETFs would provide more recession hedge, but with higher rate sensitivity in normal markets.
```

---

# Module 4: News Intelligence

## 4.1 Purpose

The News Intelligence module collects daily news, deduplicates related items, scores severity/persistence/confidence, applies time decay, and produces weekly AI summaries.

It should prevent overreaction to headlines.

## 4.2 Logic Flow

```text
Daily news collection
  -> Normalize metadata
  -> Map news to assets, sectors, countries, macro topics
  -> Deduplicate similar stories
  -> AI classify relevance, severity, direction, thesis impact
  -> Score severity, persistence, confidence
  -> Apply time decay
  -> Store news items and clusters
  -> Generate weekly summaries from persistent/high-relevance clusters
  -> Feed Market Vision and recommendation scoring with bounded impacts
```

## 4.3 DB Tables

Use existing:

- `news_items`
- `weekly_news_summaries`

Recommended additions:

```sql
create table news_clusters (
  id uuid primary key,
  cluster_key text not null,
  title text not null,
  topic text,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  severity_score numeric(12, 6),
  persistence_score numeric(12, 6),
  confidence_score numeric(12, 6),
  direction text,
  thesis_impact text,
  affected_asset_ids jsonb not null default '[]',
  affected_topics jsonb not null default '[]',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cluster_key)
);

create table news_cluster_items (
  id uuid primary key,
  news_cluster_id uuid not null references news_clusters(id),
  news_item_id uuid not null references news_items(id),
  similarity_score numeric(12, 6),
  created_at timestamptz not null default now(),
  unique (news_cluster_id, news_item_id)
);

create index idx_news_clusters_last_seen
  on news_clusters (last_seen_at desc);

create index idx_news_clusters_scores
  on news_clusters (severity_score, persistence_score, confidence_score);
```

## 4.4 Scoring Logic

Severity:

- Magnitude of potential impact.
- Asset or macro relevance.
- Financial materiality.

Persistence:

- Number of related items.
- Duration across days/weeks.
- Whether new data confirms previous signal.

Confidence:

- Source reliability.
- Confirmation from multiple sources.
- Data-backed versus rumor.
- AI classification confidence.

Time decay:

- Reduces impact as news ages unless reinforced.

Overreaction prevention:

- Unconfirmed news cannot drive Sell.
- Single-day news usually maps to Watch or confidence reduction.
- Positive news cannot create Strong Buy without valuation and portfolio fit support.
- Repeated persistent news can affect medium-term theme classification.

## 4.5 Pseudo-Code

```ts
export class NewsIntelligenceService {
  async collectDailyNews(date: Date): Promise<void> {
    const rawItems = await this.newsProvider.fetchRelevantNews(date);
    const normalized = rawItems.map(normalizeNewsItem);

    for (const item of normalized) {
      const saved = await this.newsRepo.upsertNewsItem(item);
      const cluster = await this.findOrCreateCluster(saved);
      await this.newsRepo.linkItemToCluster(cluster.id, saved.id);
      await this.rescoreCluster(cluster.id);
    }
  }

  async rescoreCluster(clusterId: string): Promise<void> {
    const items = await this.newsRepo.listClusterItems(clusterId);
    const classification = await this.ai.classifyNewsCluster(items);

    const scores = {
      severity: scoreSeverity(classification, items),
      persistence: scorePersistence(items),
      confidence: scoreConfidence(classification, items),
      decayedImpact: applyTimeDecay(classification.baseImpact, items),
    };

    await this.newsRepo.updateClusterScores(clusterId, classification, scores);
  }
}
```

## 4.6 UI Concepts

- Daily news digest.
- Weekly news summary.
- News cluster cards.
- Severity/persistence/confidence badges.
- Asset impact tags.
- Noise/theme/structural classification.
- "Why not acting yet" explanation.
- Link to affected recommendations or watchlist items.

## 4.7 Example Output

```text
News cluster: Rising oil prices after supply disruption

Severity: Medium
Persistence: High
Confidence: Medium
Classification: Medium-term market theme

Portfolio implication:
Monitor inflation-linked bonds, gold, energy-sensitive equity exposure, and consumer discretionary risk. No immediate allocation change is recommended because the impact depends on duration and policy response.
```

---

# Module 5: Monthly Telemetry

## 5.1 Purpose

Monthly Telemetry evaluates whether recommendations and signals were useful.

Required analysis:

- Recommendation outcomes.
- Benchmark comparison.
- Signal accuracy.
- Bond signal accuracy.
- Overreaction detection.
- Scoring weight adjustments.
- Human approval.

## 5.2 Logic Flow

```text
Collect monthly recommendation history
  -> Compare accepted/rejected/ignored recommendations
  -> Measure subsequent asset and portfolio outcomes
  -> Compare portfolio to benchmarks
  -> Evaluate signal accuracy
  -> Evaluate bond signal accuracy
  -> Detect overreaction or underreaction patterns
  -> Suggest scoring weight changes
  -> Require human approval before applying changes
  -> Store telemetry review
```

## 5.3 DB Tables

Use existing:

- `telemetry_reviews`
- `recommendation_history`
- `recommendations`
- `scoring_weights`
- `scoring_weight_change_suggestions`
- `portfolio_benchmark_comparisons`
- `asset_scores`
- `bond_scores`

Recommended additions:

```sql
create table signal_accuracy_reviews (
  id uuid primary key,
  telemetry_review_id uuid not null references telemetry_reviews(id),
  signal_type text not null,
  scope text not null,
  evaluated_count integer not null default 0,
  correct_count integer not null default 0,
  false_positive_count integer not null default 0,
  false_negative_count integer not null default 0,
  accuracy_score numeric(12, 6),
  notes jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table recommendation_outcome_reviews (
  id uuid primary key,
  telemetry_review_id uuid not null references telemetry_reviews(id),
  recommendation_id uuid not null references recommendations(id),
  user_response text,
  subsequent_return numeric(18, 10),
  benchmark_relative_return numeric(18, 10),
  risk_change jsonb not null default '{}',
  outcome_classification text,
  created_at timestamptz not null default now()
);

create index idx_signal_accuracy_reviews_telemetry
  on signal_accuracy_reviews (telemetry_review_id);

create index idx_recommendation_outcomes_telemetry
  on recommendation_outcome_reviews (telemetry_review_id);
```

## 5.4 Signal Accuracy Logic

Evaluate:

- Did Buy/Strong Buy candidates outperform relevant benchmark?
- Did Reduce/Sell candidates underperform or reduce risk?
- Did Watch items remain uncertain or later become actionable?
- Did bond duration recommendations match actual rate movement?
- Did credit-risk warnings help during spread widening?
- Did Market Vision themes persist or fade?

Bond signal accuracy:

- Duration call accuracy.
- Treasury versus corporate call accuracy.
- TIPS/inflation-linked call accuracy.
- High-yield risk warning accuracy.
- Recession hedge call accuracy.

## 5.5 Overreaction Detection

Detect overreaction when:

- News-driven score changes reversed quickly.
- Recommendation label changed and reversed within one or two review cycles.
- User acted on a recommendation that was mainly news-driven and outcome was poor.
- Market Vision classified noise as theme too often.
- Weight changes overemphasized momentum or news impact.

```ts
export function detectOverreaction(events: RecommendationEvent[]): OverreactionSignal[] {
  return events
    .filter((event) => event.newsImpactContribution > 0.3)
    .filter((event) => event.labelReversedWithinDays <= 30)
    .map((event) => ({
      recommendationId: event.recommendationId,
      signal: "possible_news_overreaction",
      severity: event.outcomeWasPoor ? "high" : "medium",
    }));
}
```

## 5.6 Scoring Weight Adjustment Logic

Rules:

- Suggest changes, do not auto-apply.
- Require human approval.
- Use small changes, usually +/-2% to +/-5%.
- Never eliminate risk or portfolio-fit weights.
- Do not increase news impact weight after a noisy month.
- Do not change weights based on fewer than a minimum number of observations.

```ts
export function suggestScoringWeightChanges(input: TelemetryReviewInput): WeightChangeSuggestion[] {
  const suggestions: WeightChangeSuggestion[] = [];

  if (input.newsOverreactionCount > 2) {
    suggestions.push({
      scoringModel: "asset_recommendation",
      change: { newsImpact: -0.03, portfolioFit: +0.02, riskConcentration: +0.01 },
      rationale: "News-driven adjustments reversed too often this month.",
      requiresApproval: true,
    });
  }

  if (input.bondDurationSignalAccuracy > 0.7) {
    suggestions.push({
      scoringModel: "bond_etf",
      change: { durationFit: +0.02, momentum: -0.02 },
      rationale: "Duration fit signals were more predictive than bond price momentum.",
      requiresApproval: true,
    });
  }

  return suggestions;
}
```

## 5.7 Monthly Telemetry Pseudo-Code

```ts
export class MonthlyTelemetryService {
  async runMonthlyReview(userId: string, portfolioId: string, month: Date): Promise<TelemetryReview> {
    const recommendations = await this.recommendations.listForMonth(userId, month);
    const outcomes = await this.evaluateRecommendationOutcomes(recommendations);
    const benchmarkComparison = await this.benchmarks.comparePortfolioForMonth(portfolioId, month);
    const signalAccuracy = await this.evaluateSignalAccuracy(recommendations, outcomes);
    const bondSignalAccuracy = await this.evaluateBondSignals(recommendations, outcomes);
    const overreactions = detectOverreaction(buildRecommendationEvents(recommendations, outcomes));

    const weightSuggestions = suggestScoringWeightChanges({
      outcomes,
      signalAccuracy,
      bondSignalAccuracy,
      newsOverreactionCount: overreactions.length,
    });

    return this.telemetry.saveReview({
      userId,
      portfolioId,
      month,
      outcomes,
      benchmarkComparison,
      signalAccuracy,
      bondSignalAccuracy,
      overreactions,
      weightSuggestions,
    });
  }
}
```

## 5.8 UI Concepts

- Monthly intelligence review page.
- Recommendation outcome table.
- Benchmark comparison summary.
- Signal accuracy cards.
- Bond signal accuracy card.
- Overreaction warnings.
- Proposed scoring weight changes.
- Approve/reject weight changes.
- "What the system learned" summary.

## 5.9 Example Output

```text
Monthly telemetry review:

The portfolio outperformed the custom 60/40 benchmark by 0.6% with slightly lower volatility.

Recommendation outcomes:
- 4 accepted recommendations.
- 2 ignored recommendations.
- 1 rejected recommendation.

Signal accuracy:
Bond duration signals were useful this month. Short-duration bond recommendations performed as expected during a rising-rate period.

Overreaction check:
One news-driven Watch downgrade reversed within two weeks. No scoring change is recommended from that event alone.

Suggested weight change:
Increase bond duration fit weight by 2 percentage points and reduce bond momentum weight by 2 percentage points. Human approval required.
```

---

# Cross-Module Integration

## Recommendation Engine Inputs

Benchmarking provides:

- Relative performance.
- Benchmark volatility and drawdown.
- Tracking difference.

Risk analytics provides:

- Concentration.
- Diversification quality.
- Correlation.
- Bond duration and credit exposure.

Scenario analysis provides:

- Estimated downside under major scenarios.
- Bond impact under stress.
- Suggested mitigations.

News intelligence provides:

- News severity, persistence, confidence.
- Time-decayed news impact.
- Overreaction guardrails.

Monthly telemetry provides:

- Signal accuracy.
- Recommendation outcome feedback.
- Approved scoring weight changes.

## Final Implementation Rule

The modules should make the app calmer, not noisier. They should turn complex market data into structured evidence, bounded adjustments, and better weekly decisions without pretending that every headline requires a portfolio action.

