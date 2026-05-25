# Watchlist Intelligence Layer Design

## 1. Objective

The Watchlist Intelligence Layer helps the user maintain a focused, high-signal investment universe for future portfolio decisions.

It should not behave like a broad market scanner or social trading feed. It should evaluate a curated set of ETFs, stocks, benchmarks, crypto assets, and defensive proxies against the user's existing portfolio, target allocation, risk profile, and ETF-first philosophy.

The layer should answer:

- What should stay on the watchlist?
- What should be removed?
- What deserves deeper research?
- What is already covered by existing holdings?
- What is a better ETF-first expression of the same idea?
- What, if anything, is close to becoming actionable?

## 2. Recommended Universe Size

The app should encourage a bounded research universe:

| Category | Recommended Count | Purpose |
| --- | ---: | --- |
| ETFs | 25-35 | Core portfolio building blocks, sector/thematic exposures, regional diversification |
| Stocks | 30-50 | Selective satellite exposure candidates |
| Benchmark instruments | 6-10 | Performance, risk, and regime comparison |
| Crypto assets | 5-10 | Major crypto assets and high-conviction watch candidates |
| Bond/gold/cash proxy ETFs | 8-12 | Defensive, income, duration, inflation, and liquidity proxies |

Recommended total universe: 74-117 instruments.

This range is intentionally small enough for personal use, weekly review, and affordable API usage within the USD 50-100 monthly budget.

## 3. Watchlist Tiers

### Tier 1: Core Long-Term Quality Stock Watchlist

Purpose:

Maintain a focused list of high-quality individual stocks that may justify selective satellite exposure over time.

Typical holding horizon:

- Multi-year.

Primary question:

- Is this stock good enough to justify individual company risk versus owning a diversified ETF?

Selection criteria:

- Durable business quality.
- Strong balance sheet.
- Consistent revenue and earnings growth.
- High or improving margins.
- Strong free cash flow generation.
- Reasonable valuation relative to growth and quality.
- Competitive advantage or market leadership.
- Low probability of permanent impairment.
- Clear portfolio role.
- Limited overlap with existing ETF exposure or a strong reason to accept overlap.

Exclusion criteria:

- Weak or deteriorating fundamentals.
- Excessive debt without durable cash flow.
- Speculative turnaround without evidence.
- Highly promotional or narrative-only thesis.
- Position would create excessive single-name concentration.
- ETF alternative provides cleaner exposure.

Suggested size:

- 20-35 stocks from the total 30-50 stock universe.

### Tier 2: Tactical and Thematic Watchlist

Purpose:

Track ETFs, stocks, and crypto assets linked to specific themes, sectors, macro regimes, or tactical opportunities.

Typical holding horizon:

- 3-24 months.

Primary question:

- Is this theme attractive enough, and controlled enough, to add as a satellite allocation?

Selection criteria:

- Clear theme or macro driver.
- Defined catalyst or regime dependency.
- Liquid ETF or instrument available.
- Measurable relation to portfolio goals.
- Acceptable volatility for a satellite position.
- Limited redundancy with current holdings.
- Clear exit or review condition.

Examples:

- Semiconductor ETF.
- Cybersecurity ETF.
- Healthcare innovation ETF.
- Emerging markets ETF.
- Long-duration Treasury ETF.
- Gold ETF.
- BTC or ETH.

Exclusion criteria:

- Theme is too vague.
- Exposure is already captured by existing ETFs.
- Instrument has poor liquidity or high fees.
- Theme requires constant monitoring beyond the app's intended cadence.
- Risk contribution is too large for the user's profile.

Suggested size:

- 20-35 instruments across ETFs, stocks, crypto, and proxies.

### Tier 3: Opportunistic Watchlist

Purpose:

Track assets that are not currently attractive enough to buy but could become interesting at the right price, valuation, yield, drawdown, or macro condition.

Typical holding horizon after action:

- Variable.

Primary question:

- What condition would make this asset worth researching or adding?

Selection criteria:

- High-quality asset currently too expensive.
- ETF or asset that becomes attractive during drawdowns.
- Bond ETF that becomes attractive at a target yield or rate environment.
- Gold or cash proxy that becomes useful under specific macro conditions.
- Crypto asset that is interesting only after major deleveraging or valuation reset.
- Clear trigger condition can be expressed.

Trigger examples:

- Price below target range.
- Drawdown greater than threshold.
- Valuation multiple below historical band.
- Treasury yield above target.
- Credit spread above target.
- ETF discount or momentum reset.
- Relative performance reversal.

Exclusion criteria:

- No clear trigger.
- Asset only appears interesting because of recent hype.
- Data needed to evaluate the trigger is unavailable or too expensive.
- Risk is too high even at a lower price.

Suggested size:

- 15-30 instruments.

## 4. Watchlist Item Classification

Each watchlist item should have:

- Symbol.
- Asset name.
- Asset class.
- Watchlist tier.
- Portfolio role.
- Region.
- Sector or theme.
- Currency.
- Provider identifiers.
- Current status.
- Thesis summary.
- Trigger conditions.
- Review cadence.
- Data refresh priority.
- Related ETF alternative.
- Related benchmark.
- Overlap notes.

Recommended statuses:

- `active_monitor`
- `research_candidate`
- `near_trigger`
- `candidate_to_add`
- `candidate_to_remove`
- `paused`
- `rejected`
- `converted_to_holding`

## 5. Selection Criteria by Asset Type

### ETFs

Criteria:

- Low expense ratio.
- Strong liquidity.
- Adequate assets under management.
- Clear index or strategy.
- Low tracking error where available.
- Useful portfolio role.
- Limited overlap with existing ETFs.
- Diversification benefit.
- Tax and distribution considerations where relevant.

ETF categories:

- Broad US equity.
- International developed equity.
- Emerging markets equity.
- Factor ETFs.
- Sector ETFs.
- Thematic ETFs.
- Aggregate bond ETFs.
- Treasury ETFs.
- TIPS ETFs.
- Gold ETFs.
- Cash-equivalent ETFs.

### Individual Stocks

Criteria:

- Business quality.
- Financial strength.
- Revenue and earnings durability.
- Free cash flow.
- Valuation discipline.
- Competitive moat.
- Management quality where available.
- Sector balance.
- Portfolio concentration impact.
- ETF substitution check.

### Benchmarks

Criteria:

- Broad relevance.
- Liquidity.
- Clean asset class representation.
- Availability of reliable price history.
- Usefulness for attribution.

Benchmark examples:

- US large-cap equity ETF.
- Total US market ETF.
- Global ex-US ETF.
- Aggregate bond ETF.
- Long Treasury ETF.
- Gold ETF.
- BTC.
- 60/40 blended benchmark.

### Crypto

Criteria:

- Market capitalization.
- Liquidity.
- Long-term relevance.
- Ecosystem maturity.
- Volatility.
- Correlation with risk assets.
- Regulatory risk.
- Custody and data availability.

Crypto watchlist should be narrow by default.

### Bond, Gold, and Cash Proxy ETFs

Criteria:

- Duration.
- Yield.
- Credit quality.
- Inflation sensitivity.
- Liquidity.
- Expense ratio.
- Role in drawdown protection.
- Correlation with equities.
- Sensitivity to rate changes.

## 6. Quarterly Update Cadence

The full watchlist universe should be reviewed quarterly.

Quarterly tasks:

- Re-score all active watchlist items.
- Remove low-quality or redundant items.
- Promote high-conviction candidates.
- Demote candidates with weaker thesis quality.
- Refresh ETF alternatives for individual stocks.
- Refresh benchmark list if portfolio strategy changed.
- Review tactical themes for continued relevance.
- Review opportunistic triggers.
- Archive stale or unmonitorable items.
- Update data refresh priorities.

Suggested quarterly outputs:

- Watchlist additions.
- Watchlist removals.
- Tier changes.
- Updated trigger conditions.
- Updated rationale.
- Cost impact of expanded or reduced universe.

Weekly jobs should evaluate current status and triggers. Quarterly jobs should evaluate whether each asset still belongs in the universe.

## 7. Scoring Model

The watchlist scoring system should produce multiple scores, not a single magic number.

Recommended scores:

- `quality_score`
- `valuation_score`
- `momentum_score`
- `portfolio_fit_score`
- `diversification_score`
- `risk_score`
- `liquidity_score`
- `cost_efficiency_score`
- `trigger_score`
- `conviction_score`

### Score Implications

Scores should drive user-facing states:

| Condition | Suggested Status |
| --- | --- |
| High quality, good fit, fair valuation | `research_candidate` |
| High quality, strong fit, trigger reached | `candidate_to_add` |
| Strong theme, high momentum, acceptable risk | `active_monitor` or `research_candidate` |
| High overlap with current holdings | `candidate_to_remove` or `paused` |
| Good asset but valuation too high | `active_monitor` |
| Opportunistic trigger almost reached | `near_trigger` |
| Poor quality or broken thesis | `candidate_to_remove` |

### Tier-Specific Weighting

Core long-term quality stocks:

- Quality: high weight.
- Valuation: medium-high weight.
- Portfolio fit: high weight.
- Momentum: low-medium weight.
- Risk: high weight.

Tactical/thematic:

- Theme strength: high weight.
- Momentum: medium-high weight.
- Portfolio fit: high weight.
- Risk: high weight.
- Valuation: medium weight.

Opportunistic:

- Trigger score: high weight.
- Valuation or yield: high weight.
- Quality: high weight.
- Momentum: lower weight unless trigger depends on trend reversal.
- Risk: high weight.

### Example Scoring Pseudo-Code

```ts
export function scoreWatchlistItem(input: WatchlistScoringInput): WatchlistScore {
  const base = {
    qualityScore: scoreQuality(input),
    valuationScore: scoreValuation(input),
    momentumScore: scoreMomentum(input.priceHistory),
    portfolioFitScore: scorePortfolioFit(input, input.currentPortfolio),
    diversificationScore: scoreDiversification(input, input.currentPortfolio),
    riskScore: scoreRisk(input),
    liquidityScore: scoreLiquidity(input),
    costEfficiencyScore: scoreCostEfficiency(input),
    triggerScore: scoreTriggers(input.triggerRules, input.marketData),
  };

  const weights = getTierWeights(input.watchlistTier);
  const convictionScore = weightedAverage(base, weights);

  return {
    ...base,
    convictionScore,
    suggestedStatus: inferWatchlistStatus(base, convictionScore, input.watchlistTier),
  };
}
```

## 8. Suggestion Engine Logic

The suggestion engine should generate concise, explainable suggestions.

Suggestion categories:

- Add to watchlist.
- Remove from watchlist.
- Promote tier.
- Demote tier.
- Research now.
- Consider adding to portfolio.
- Replace with ETF.
- Keep monitoring.
- Pause monitoring.

### Signal Inputs

Inputs:

- Current portfolio holdings.
- Target allocation.
- Existing watchlist.
- User risk profile.
- User preference profile.
- Asset scores.
- Price history.
- Benchmark context.
- Macro regime.
- Bond/rate context.
- Recommendation feedback history.
- API data freshness.

### Suggestion Rules

Example rules:

- If an individual stock has high overlap with existing ETFs and low quality score, suggest removal.
- If an opportunistic item reaches price or yield trigger and portfolio fit is strong, mark as `near_trigger` or `candidate_to_add`.
- If a tactical theme has underperformed but thesis remains intact, suggest continued monitoring rather than automatic removal.
- If a theme is already represented by a broad ETF, suggest using the existing ETF exposure instead.
- If a bond ETF's duration is inappropriate for the user's risk profile, suggest an alternative duration bucket.
- If cash is above target and several high-fit ETFs are near target allocation, surface deployment candidates.
- If crypto allocation is already at or above policy limit, block crypto add suggestions except as research-only.

### Suggestion Pseudo-Code

```ts
export class WatchlistSuggestionService {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly portfolios: PortfolioRepository,
    private readonly prices: PriceRepository,
    private readonly benchmarks: BenchmarkService,
    private readonly telemetry: TelemetryRepository,
  ) {}

  async generateSuggestions(userId: string): Promise<WatchlistSuggestion[]> {
    const portfolio = await this.portfolios.getPortfolioByUserId(userId);
    const holdings = await this.portfolios.listHoldings(portfolio.id);
    const items = await this.watchlist.listActiveItems(userId);
    const priceData = await this.prices.getLatestAndHistoricalForAssets(
      items.map((item) => item.assetId),
    );
    const preferences = await this.telemetry.getUserPreferenceProfile(userId);

    return items.flatMap((item) => {
      const score = scoreWatchlistItem({
        item,
        currentPortfolio: { portfolio, holdings },
        priceHistory: priceData[item.assetId],
        userPreferences: preferences,
      });

      return inferSuggestions(item, score, portfolio, holdings, preferences);
    });
  }
}
```

## 9. Telemetry Considerations

Telemetry should help the app learn what the user actually values without creating a manipulative feedback loop.

Track:

- Item added to watchlist.
- Item removed from watchlist.
- Tier changed.
- Suggestion accepted.
- Suggestion rejected.
- Suggestion ignored.
- Watchlist item converted to holding.
- Holding later sold.
- Trigger reached but user ignored.
- User manually edits thesis or trigger.
- User repeatedly rejects certain asset classes.
- User repeatedly favors certain ETFs or themes.

Derived telemetry:

- User prefers ETF substitutions.
- User tolerates or avoids single-stock risk.
- User reacts to drawdowns opportunistically or defensively.
- User prefers quality over valuation.
- User ignores crypto recommendations.
- User frequently keeps too many stale watchlist items.

Telemetry should influence:

- Recommendation wording.
- Scoring weights within safe limits.
- Watchlist cleanup suggestions.
- Future candidate suggestions.
- Research prioritization.

Telemetry should not:

- Automatically add holdings.
- Automatically remove watchlist items without confirmation.
- Push higher-risk assets only because the user clicked on them.
- Treat ignored suggestions as negative feedback immediately.

## 10. Database Design

### Tables

```sql
create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  asset_id uuid not null references assets(id),
  tier text not null,
  status text not null,
  portfolio_role text,
  thesis text,
  trigger_summary text,
  data_refresh_priority text not null default 'normal',
  review_frequency text not null default 'weekly',
  added_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table watchlist_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references watchlist_items(id),
  trigger_type text not null,
  operator text not null,
  threshold_numeric numeric,
  threshold_text text,
  lookback_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table watchlist_scores (
  id uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references watchlist_items(id),
  score_date date not null,
  quality_score numeric,
  valuation_score numeric,
  momentum_score numeric,
  portfolio_fit_score numeric,
  diversification_score numeric,
  risk_score numeric,
  liquidity_score numeric,
  cost_efficiency_score numeric,
  trigger_score numeric,
  conviction_score numeric,
  suggested_status text,
  score_inputs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (watchlist_item_id, score_date)
);

create table watchlist_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  watchlist_item_id uuid references watchlist_items(id),
  suggestion_type text not null,
  priority text not null,
  title text not null,
  rationale text not null,
  supporting_data jsonb not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table watchlist_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  review_period text not null,
  review_type text not null,
  summary text,
  additions jsonb not null default '[]',
  removals jsonb not null default '[]',
  tier_changes jsonb not null default '[]',
  generated_at timestamptz not null default now()
);
```

### Enum-Like Values

`tier`:

- `core_quality`
- `tactical_thematic`
- `opportunistic`
- `benchmark`
- `defensive_proxy`

`data_refresh_priority`:

- `low`
- `normal`
- `high`

`suggestion_type`:

- `add_to_watchlist`
- `remove_from_watchlist`
- `promote_tier`
- `demote_tier`
- `research_now`
- `consider_add_to_portfolio`
- `replace_with_etf`
- `keep_monitoring`
- `pause_monitoring`

## 11. Service and Repository Interfaces

```ts
export interface WatchlistRepository {
  listActiveItems(userId: string): Promise<WatchlistItem[]>;
  listItemsByTier(userId: string, tier: WatchlistTier): Promise<WatchlistItem[]>;
  upsertItem(input: UpsertWatchlistItemInput): Promise<WatchlistItem>;
  archiveItem(itemId: string, reason: string): Promise<void>;
  saveScore(score: WatchlistScore): Promise<void>;
  saveSuggestion(suggestion: WatchlistSuggestion): Promise<void>;
  recordReview(review: WatchlistReview): Promise<void>;
}
```

```ts
export interface WatchlistIntelligenceService {
  scoreUniverse(userId: string): Promise<WatchlistScore[]>;
  generateWeeklySuggestions(userId: string): Promise<WatchlistSuggestion[]>;
  runQuarterlyReview(userId: string): Promise<WatchlistReview>;
  evaluateTriggers(userId: string): Promise<WatchlistSuggestion[]>;
}
```

## 12. UI Concepts

### Watchlist Home

Primary view:

- Three tier tabs: Core Quality, Tactical/Thematic, Opportunistic.
- Compact summary of counts by asset class.
- Items needing attention.
- Trigger-near items.
- Candidate additions.
- Candidate removals.

### Watchlist Table

Columns:

- Symbol.
- Name.
- Asset class.
- Tier.
- Status.
- Portfolio role.
- Conviction score.
- Trigger score.
- Portfolio fit score.
- Overlap warning.
- Latest price.
- Distance to trigger.
- Last reviewed.

Recommended controls:

- Tier filter.
- Asset class filter.
- Status filter.
- Sort by score.
- Sort by distance to trigger.
- Hide paused/rejected.

### Watchlist Item Detail

Sections:

- Thesis.
- Scores.
- Trigger rules.
- ETF alternatives.
- Portfolio overlap.
- Price history.
- Benchmark comparison.
- Risk notes.
- Suggestion history.
- User feedback.

### Quarterly Review UI

Sections:

- Additions proposed.
- Removals proposed.
- Tier changes.
- Stale items.
- Overlapping exposures.
- Cost impact.
- Confirm changes.

## 13. API Cost-Control Strategy

The watchlist should be designed around controlled refresh frequency and provider batching.

### Universe Limits

Soft limits:

- ETFs: 35.
- Stocks: 50.
- Benchmarks: 10.
- Crypto: 10.
- Bond/gold/cash proxies: 12.

Hard warning:

- Show a warning above 125 total instruments.
- Require user confirmation above 150 instruments.

### Refresh Priority

High priority:

- Portfolio holdings.
- Watchlist items near trigger.
- Candidate-to-add items.
- Benchmarks.

Normal priority:

- Active watchlist items.
- Tactical/thematic items.

Low priority:

- Paused items.
- Opportunistic items far from trigger.
- Rejected or archived items.

### Refresh Cadence

Daily:

- Latest prices for holdings.
- Latest prices for active watchlist items.
- Benchmarks.
- Crypto watchlist prices.

Weekly:

- Watchlist scores.
- Suggestion generation.
- ETF alternatives.
- Portfolio overlap analysis.

Quarterly:

- Full universe review.
- Deeper fundamentals refresh.
- ETF metadata refresh.
- Stale item cleanup.

On demand:

- User opens item detail.
- User requests refresh.
- Trigger condition is close.

### Provider Cost Controls

- Batch symbols in provider calls.
- Cache daily price responses.
- Store normalized snapshots.
- Avoid repeated AI calls for unchanged items.
- Use deterministic scoring before AI summarization.
- Generate AI text only for top suggestions and quarterly review summaries.
- Use stale-while-revalidate for UI.
- Track provider request counts in `api_usage_logs`.
- Enforce per-day budget guards.

### AI Cost Controls

AI should not score every item from scratch.

Recommended flow:

1. Deterministic scoring ranks items.
2. The system selects top items needing explanation.
3. AI generates concise rationale for selected suggestions.
4. AI skips unchanged low-priority items.
5. Quarterly AI summaries operate on aggregated score deltas, not full raw history.

```ts
const candidatesForAi = suggestions
  .filter((suggestion) => suggestion.priority === "high")
  .slice(0, 10);
```

## 14. Weekly and Quarterly Jobs

### Weekly Watchlist Job

```ts
export function createWeeklyWatchlistJob(deps: {
  watchlistService: WatchlistIntelligenceService;
  users: UserRepository;
  jobRuns: JobRunRepository;
}): AppJob {
  return {
    name: "weekly-watchlist-intelligence",

    async run(input) {
      const users = await deps.users.listActiveUsers();

      for (const user of users) {
        await deps.watchlistService.scoreUniverse(user.id);
        await deps.watchlistService.evaluateTriggers(user.id);
        await deps.watchlistService.generateWeeklySuggestions(user.id);
      }

      return { ok: true };
    },
  };
}
```

### Quarterly Review Job

```ts
export function createQuarterlyWatchlistReviewJob(deps: {
  watchlistService: WatchlistIntelligenceService;
  users: UserRepository;
}): AppJob {
  return {
    name: "quarterly-watchlist-review",

    async run() {
      const users = await deps.users.listActiveUsers();

      for (const user of users) {
        await deps.watchlistService.runQuarterlyReview(user.id);
      }

      return { ok: true };
    },
  };
}
```

## 15. Integration With Weekly Portfolio Recommendations

The weekly portfolio recommendation engine should consume watchlist intelligence as one input, not as the whole recommendation.

Include:

- Top 3 candidate additions.
- Top 3 remove or pause candidates.
- Trigger-near opportunistic items.
- ETF alternatives to individual stocks.
- Watchlist items that improve target allocation.
- Watchlist items that would worsen concentration.

The recommendation engine should avoid suggesting new holdings when:

- Cash is below reserve target.
- Asset class is already above allocation band.
- Single-name concentration would exceed limit.
- Crypto exposure is already at policy cap.
- Bond duration risk conflicts with user profile.
- Data freshness is poor.

## 16. Success Metrics

The Watchlist Intelligence Layer is successful if:

- The user maintains a focused research universe.
- Stale watchlist items are cleaned up quarterly.
- Weekly recommendations surface only a few high-signal items.
- ETF alternatives are consistently considered before individual stocks.
- Opportunistic triggers are explicit and measurable.
- API costs remain predictable.
- The user can explain why each watchlist item exists.

