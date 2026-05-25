# Market Vision Dashboard Design

## 1. Objective

The Market Vision dashboard provides a weekly CIO-style market briefing for the user's portfolio.

It should synthesize global markets, world news, interest rates, inflation, currencies, geopolitical risks, equities, bonds, gold, crypto, major risks, opportunities, and portfolio implications.

The dashboard is not a breaking-news feed. It should classify developments by investment relevance and time horizon:

- Short-term noise.
- Medium-term market theme.
- Structural long-term shift.

Market Vision should inform recommendations, scoring, scenario analysis, and allocation decisions, but it should not directly trigger knee-jerk portfolio actions.

## 2. Product Role

Market Vision answers:

- What changed this week?
- What matters for the portfolio?
- What is probably noise?
- What is becoming a medium-term market theme?
- What may be a structural shift?
- Which asset classes are helped or hurt?
- What should the recommendation engine consider?
- What should the user watch next week?

## 3. Weekly Workflow

### Step 1: Collect Signals

Inputs:

- Global equity index performance.
- Bond yields and yield curve data.
- Inflation indicators.
- Currency moves.
- Gold price movement.
- Crypto market movement.
- Credit spreads.
- Major geopolitical developments.
- Major world news.
- Sector and regional equity performance.
- Benchmark performance.
- Portfolio holdings and watchlist exposure.
- Existing risk metrics.

Sources:

- Financial Modeling Prep for market and ETF prices.
- FRED for rates, inflation, credit spreads, macro series.
- CoinGecko for crypto.
- News provider or curated news metadata.
- Internal portfolio, benchmark, and scoring tables.

### Step 2: Normalize and Score Developments

Each development should be classified by:

- Asset class relevance.
- Portfolio relevance.
- Severity.
- Direction.
- Confidence.
- Time horizon.
- Whether it is new, recurring, accelerating, or fading.

### Step 3: Classify Time Horizon

Classification:

- `short_term_noise`
- `medium_term_market_theme`
- `structural_long_term_shift`

### Step 4: Generate Asset-Class Views

Views:

- Global markets.
- Equities.
- Bonds and rates.
- Inflation and real assets.
- Currencies.
- Gold.
- Crypto.
- Geopolitical risks.

### Step 5: Generate Portfolio Implications

Translate views into:

- Allocation implications.
- Watchlist implications.
- Bond duration implications.
- Risk analytics implications.
- Scenario tests to run.
- Recommendation engine adjustments.

### Step 6: Store Report and Evidence

Store:

- Structured signals.
- AI-generated briefing text.
- Classification results.
- Asset-class implications.
- Portfolio-specific implications.
- Recommendation impact flags.

## 4. Development Classification Logic

### Short-Term Noise

Definition:

- Recent development with uncertain durability.
- Likely to affect sentiment or near-term volatility more than long-term portfolio strategy.

Examples:

- One-day equity selloff without broader confirmation.
- Unconfirmed geopolitical headline.
- Single inflation print that does not change trend.
- Company-specific news irrelevant to core allocation.
- Crypto volatility without structural change.

Portfolio impact:

- Usually no allocation change.
- May increase monitoring.
- May adjust confidence slightly.
- May trigger scenario review if severe.

### Medium-Term Market Theme

Definition:

- Development that persists across weeks or months and affects asset-class positioning.

Examples:

- Sustained disinflation.
- Rising recession risk.
- Credit spreads widening for several weeks.
- USD strength affecting international exposure.
- AI infrastructure capex theme affecting sector leadership.
- Gold rally tied to real-rate or geopolitical regime.

Portfolio impact:

- Can adjust scoring weights.
- Can influence weekly recommendations.
- Can affect bond duration preference.
- Can surface watchlist candidates.
- Can influence staged deployment.

### Structural Long-Term Shift

Definition:

- Durable change that may alter strategic allocation or long-term assumptions.

Examples:

- Persistent higher neutral interest-rate regime.
- Long-term deglobalization trend.
- Structural fiscal deficit pressure.
- Secular AI productivity shift.
- Long-term energy transition.
- Crypto institutionalization, if supported by durable evidence.

Portfolio impact:

- May suggest strategic allocation review.
- May affect allocation model templates.
- Should require strong evidence and repeated confirmation.
- Should be reviewed monthly or quarterly, not acted on immediately.

### Classification Pseudo-Code

```ts
export function classifyDevelopment(input: MarketDevelopment): DevelopmentClassification {
  const recurrenceScore = scoreRecurrence(input.relatedEvents);
  const severityScore = scoreSeverity(input);
  const dataConfirmationScore = scoreDataConfirmation(input.supportingData);
  const portfolioRelevanceScore = scorePortfolioRelevance(input);

  if (
    recurrenceScore > 80 &&
    dataConfirmationScore > 75 &&
    input.expectedDurationMonths >= 24
  ) {
    return "structural_long_term_shift";
  }

  if (
    recurrenceScore > 55 &&
    dataConfirmationScore > 50 &&
    input.expectedDurationMonths >= 3
  ) {
    return "medium_term_market_theme";
  }

  return "short_term_noise";
}
```

## 5. UI Sections

### 5.1 Header Summary

Content:

- Weekly Market Vision title.
- Report date.
- Overall market regime.
- Risk posture.
- One-line portfolio implication.

Example:

```text
Market regime: cautious risk-on with rising rate sensitivity.
Portfolio implication: maintain ETF core, avoid extending bond duration aggressively, and keep some cash for staged deployment.
```

### 5.2 Executive Briefing

CIO-style narrative summary.

Content:

- What changed this week.
- What matters.
- What is probably noise.
- What the portfolio should monitor.

Design:

- 4-6 concise bullets.
- No endless news stream.
- Each bullet tagged as noise, theme, or structural shift.

### 5.3 Global Markets Panel

Content:

- US equities.
- International developed equities.
- Emerging markets.
- Global bonds.
- Gold.
- Crypto.
- USD/currency regime.

Metrics:

- Weekly return.
- Monthly return.
- Drawdown from recent high.
- Benchmark-relative trend.

### 5.4 World News and Geopolitical Risk Panel

Content:

- Major world developments.
- Geopolitical risk level.
- Energy/security risks.
- Trade or sanctions risks.
- Election or policy risks where relevant.

Classification:

- Noise/theme/structural.
- Portfolio relevance score.
- Affected asset classes.

### 5.5 Rates, Inflation, and Currency Panel

Content:

- Fed funds or policy rate context.
- 3-month, 2-year, and 10-year yields.
- Yield curve shape.
- Inflation trend.
- Real-rate context where available.
- USD trend and currency implications.

Outputs:

- Rate outlook.
- Inflation outlook.
- Currency view.

### 5.6 Bond Vision Panel

Required bond outputs:

- Yield/rate outlook.
- Duration preference.
- Treasury versus corporate view.
- Inflation-linked bond view.
- Recession hedge view.

Bond panel fields:

- Rate regime: rising, falling, stable.
- Yield curve regime: inverted, steepening, normalizing.
- Credit-spread regime: tight, normal, widening, stressed.
- Inflation regime: disinflation, stable, reaccelerating.
- Recession risk: low, moderate, high.
- Preferred duration: ultra-short, short, intermediate, long, barbell, neutral.
- Preferred credit quality: Treasury, investment-grade, limited high-yield, avoid high-yield.

Example bond interpretation:

```text
Rates remain elevated, but the curve is beginning to normalize. Short-duration Treasuries remain useful for stability and income. Intermediate Treasuries can be added gradually as recession risk rises. Corporate credit should be sized carefully because spreads do not fully compensate for recession risk.
```

### 5.7 Equities Panel

Content:

- Broad equity view.
- US versus international view.
- Sector leadership.
- Valuation context.
- Earnings trend.
- Risk concentration warnings.

Outputs:

- Equity posture: constructive, neutral, cautious, defensive.
- ETF-first implication.
- Selective stock implication.

### 5.8 Gold and Real Assets Panel

Content:

- Gold trend.
- Real-rate relationship.
- Inflation context.
- Geopolitical hedge relevance.

Outputs:

- Gold view: avoid, neutral, modest hedge, increase hedge.
- Portfolio implication.

### 5.9 Crypto Panel

Content:

- BTC and ETH trend.
- Market risk appetite.
- Liquidity conditions.
- Regulatory or institutional developments.

Outputs:

- Crypto posture: avoid, watch, limited satellite, constructive.
- Risk cap reminder.

### 5.10 Major Risks and Opportunities

Risks:

- Equity correction.
- Rate shock.
- Inflation reacceleration.
- Credit stress.
- Currency shock.
- Geopolitical escalation.
- Crypto drawdown.

Opportunities:

- Cash deployment.
- Bond duration entry.
- ETF rebalance.
- Watchlist trigger.
- Gold hedge.
- International diversification.

### 5.11 Portfolio Implications

Content:

- What to do nothing about.
- What to monitor.
- What may affect this week's recommendations.
- What may affect monthly telemetry or allocation model review.

Design:

- Clear action categories:
  - No action.
  - Monitor.
  - Consider in weekly review.
  - Consider in allocation review.
  - Run scenario.

## 6. Database Fields

### market_vision_reports

```sql
create table market_vision_reports (
  id uuid primary key,
  user_id uuid references users(id),
  portfolio_id uuid references portfolios(id),
  report_date date not null,
  report_week_start date not null,
  report_week_end date not null,
  market_regime text,
  risk_posture text,
  executive_summary text not null,
  global_markets_summary text,
  world_news_summary text,
  rates_inflation_currency_summary text,
  bond_summary text,
  equity_summary text,
  gold_summary text,
  crypto_summary text,
  major_risks jsonb not null default '[]',
  opportunities jsonb not null default '[]',
  portfolio_implications text,
  structured_signals jsonb not null default '{}',
  recommendation_impacts jsonb not null default '[]',
  model_provider text,
  model_name text,
  created_at timestamptz not null default now(),
  unique (portfolio_id, report_week_start)
);

create index idx_market_vision_reports_portfolio_date
  on market_vision_reports (portfolio_id, report_date desc);
```

### market_developments

```sql
create table market_developments (
  id uuid primary key,
  market_vision_report_id uuid not null references market_vision_reports(id),
  title text not null,
  description text,
  development_type text not null,
  classification text not null,
  direction text,
  severity_score numeric(12, 6),
  confidence_score numeric(12, 6),
  portfolio_relevance_score numeric(12, 6),
  affected_asset_classes jsonb not null default '[]',
  affected_asset_ids jsonb not null default '[]',
  supporting_data jsonb not null default '{}',
  source_refs jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index idx_market_developments_report
  on market_developments (market_vision_report_id);

create index idx_market_developments_classification
  on market_developments (classification, development_type);
```

### bond_market_views

```sql
create table bond_market_views (
  id uuid primary key,
  market_vision_report_id uuid not null references market_vision_reports(id),
  rate_outlook text not null,
  yield_curve_view text,
  duration_preference text not null,
  treasury_view text not null,
  corporate_credit_view text not null,
  inflation_linked_bond_view text not null,
  recession_hedge_view text not null,
  credit_spread_regime text,
  recession_risk text,
  inflation_regime text,
  supporting_indicators jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (market_vision_report_id)
);
```

### market_vision_recommendation_impacts

```sql
create table market_vision_recommendation_impacts (
  id uuid primary key,
  market_vision_report_id uuid not null references market_vision_reports(id),
  impact_type text not null,
  affected_scope text not null,
  affected_asset_id uuid references assets(id),
  affected_asset_class text,
  scoring_adjustment numeric(12, 6),
  action_bias text,
  rationale text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_market_vision_impacts_report
  on market_vision_recommendation_impacts (market_vision_report_id);

create index idx_market_vision_impacts_asset
  on market_vision_recommendation_impacts (affected_asset_id);
```

## 7. Recommendation Impact Logic

Market Vision should influence recommendations through bounded, auditable adjustments.

It should not directly set:

- Strong Buy.
- Buy.
- Sell.

It may influence:

- Macro score.
- Market Vision adjustment score.
- Bond duration preference.
- Watchlist priority.
- Scenario test priority.
- Confidence level.
- Explanation text.

### Impact Types

- `macro_score_adjustment`
- `market_vision_adjustment`
- `bond_duration_bias`
- `credit_risk_warning`
- `inflation_hedge_bias`
- `currency_risk_warning`
- `scenario_test_suggestion`
- `watchlist_priority_change`
- `allocation_review_suggestion`

### Bounded Adjustment Rules

Rules:

- Short-term noise can adjust scores by at most +/-2 points.
- Medium-term themes can adjust scores by at most +/-5 points.
- Structural shifts can adjust scores by at most +/-8 points, but only after repeated confirmation.
- Market Vision cannot override portfolio concentration limits.
- Market Vision cannot turn a low portfolio-fit asset into Buy.
- Market Vision can move an asset from Hold to Watch if uncertainty rises.
- Sell still requires deterministic scoring and guardrail evidence outside the Market Vision narrative.

### Impact Pseudo-Code

```ts
export function calculateMarketVisionAdjustment(input: {
  development: MarketDevelopment;
  asset: Asset;
  portfolio: PortfolioContext;
}): MarketVisionImpact {
  const relevance = scoreAssetRelevance(input.development, input.asset, input.portfolio);
  const direction = mapDirectionToSign(input.development.direction);
  const maxAdjustment = getMaxAdjustment(input.development.classification);

  const adjustment = direction * maxAdjustment * relevance;

  return {
    affectedAssetId: input.asset.id,
    scoringAdjustment: clamp(adjustment, -maxAdjustment, maxAdjustment),
    actionBias: inferActionBias(input.development),
    rationale: buildImpactRationale(input.development, input.asset),
  };
}
```

### Bond Recommendation Impact Logic

Bond-specific impacts:

- Rising rates: bias toward shorter duration.
- Falling rates with recession risk: allow intermediate or long Treasury exposure.
- Inflation pressure: increase TIPS/inflation-linked bond relevance.
- Credit stress: reduce corporate and high-yield bond attractiveness.
- Risk-off: increase Treasury stabilisation value.

```ts
export function deriveBondMarketVisionImpact(view: BondMarketView): BondRecommendationBias {
  return {
    durationBias:
      view.rateOutlook === "rising" ? "shorter" :
      view.rateOutlook === "falling" && view.recessionRisk !== "low" ? "longer_treasury_allowed" :
      "neutral",

    creditBias:
      view.creditSpreadRegime === "stressed" ? "favor_treasury_over_corporate" :
      view.creditSpreadRegime === "tight" ? "avoid_uncompensated_credit_risk" :
      "neutral",

    inflationLinkedBias:
      view.inflationRegime === "reaccelerating" ? "favor_tips" : "neutral",
  };
}
```

## 8. Market Vision Generation Service

```ts
export interface MarketVisionService {
  generateWeeklyReport(input: GenerateMarketVisionInput): Promise<MarketVisionReport>;
  classifyDevelopments(input: MarketSignalSet): Promise<MarketDevelopment[]>;
  deriveRecommendationImpacts(report: MarketVisionReport): Promise<RecommendationImpact[]>;
}
```

```ts
export class DefaultMarketVisionService implements MarketVisionService {
  constructor(
    private readonly marketData: MarketDataProvider,
    private readonly macroData: MacroDataProvider,
    private readonly cryptoData: CryptoDataProvider,
    private readonly news: NewsProvider,
    private readonly ai: AiClassificationProvider,
    private readonly reports: MarketVisionRepository,
  ) {}

  async generateWeeklyReport(input: GenerateMarketVisionInput): Promise<MarketVisionReport> {
    const signals = await this.collectSignals(input);
    const deterministicClassifications = classifySignalSet(signals);

    const aiSummary = await this.ai.summarizeSignals({
      task: "weekly_market_vision",
      signals,
      deterministicClassifications,
    });

    const report = buildMarketVisionReport({
      input,
      signals,
      classifications: deterministicClassifications,
      aiSummary,
    });

    const impacts = await this.deriveRecommendationImpacts(report);
    await this.reports.save(report, impacts);

    return report;
  }
}
```

## 9. Example Outputs

### Executive Briefing Example

```text
Market Vision: Weekly CIO Briefing

Overall regime: cautious risk-on with elevated rate sensitivity.

Key developments:
- Medium-term theme: US yields remain elevated, keeping pressure on long-duration assets.
- Short-term noise: a one-day equity selloff appears sentiment-driven rather than thesis-changing.
- Medium-term theme: gold continues to benefit from geopolitical hedging and real-rate uncertainty.
- Structural watch: higher fiscal deficits may keep term premiums above the prior decade's norm.

Portfolio implication:
Maintain the ETF-first core, avoid aggressive long-duration bond exposure for now, and keep cash deployment staged unless core allocation gaps are large.
```

### Bond Vision Example

```text
Bond view:
The rate outlook is stable-to-slightly-higher, with recession risk moderate but not yet dominant.

Duration preference:
Favor short to intermediate duration. Long-duration Treasuries can remain on watch as a recession hedge, but they are not the preferred core bond exposure this week.

Treasury vs corporate:
Treasuries are preferred for defensive ballast. Corporate bonds are acceptable only in investment-grade exposure and should not be treated as pure defense.

Inflation-linked bonds:
TIPS remain useful as a modest inflation hedge because inflation progress has slowed.

Recession hedge:
Intermediate Treasuries offer a better balance of defensive value and volatility than long-duration Treasuries in the current regime.
```

### Recommendation Impact Example

```text
Recommendation impact:
- Increase Market Vision adjustment for short-duration Treasury ETFs.
- Keep high-yield bond ETFs capped as risk assets, not defensive bonds.
- Move long-duration Treasury ETFs to Watch unless the user explicitly wants recession-hedge exposure.
- Run a rates-up 1% scenario and a recession/risk-off scenario this week.
```

### Development Classification Example

```text
Development: Oil prices rose sharply after geopolitical escalation.

Classification: Medium-term market theme.

Reason:
The move is linked to a recurring geopolitical risk and may affect inflation expectations if sustained. It is not yet a structural shift because the duration and policy response remain uncertain.

Portfolio implication:
Monitor inflation-linked bonds, gold exposure, and energy-sensitive equity exposure. Do not rebalance solely on this headline.
```

## 10. UI Behavior

Design behavior:

- Show latest weekly report by default.
- Allow previous reports via date selector.
- Tag each development with noise/theme/structural.
- Let user expand supporting evidence.
- Show portfolio-specific implications separately from market narrative.
- Show recommendation impact as bounded adjustments, not commands.
- Include "run scenario" buttons for suggested scenarios.
- Include "add to watchlist" actions only when the watchlist engine validates the candidate.

## 11. Cost-Control Strategy

Weekly:

- Generate one full Market Vision report.
- Summarize only curated high-relevance news items.
- Use deterministic market data calculations before AI synthesis.
- Store report output and reuse throughout the week.

Daily:

- Update underlying prices and macro data.
- Do not regenerate full Market Vision unless manually requested.

AI:

- AI summarizes signal bundles.
- AI classifies news relevance and thesis impact.
- AI does not decide recommendations.
- AI should receive structured inputs, not raw unbounded news feeds.

## 12. Success Criteria

Market Vision is successful if:

- The user understands the week's market regime quickly.
- Developments are clearly separated into noise, themes, and structural shifts.
- Bond views explicitly cover rates, duration, Treasury versus corporate, inflation-linked bonds, and recession hedging.
- Portfolio implications are specific but not reactive.
- Recommendation impacts are bounded, auditable, and deterministic.
- The dashboard feels like a personal CIO briefing, not a noisy market-news page.

