# Telemetry Learning

## Purpose

Monthly Telemetry evaluates recommendation outcomes, benchmark comparison, signal accuracy, bond signal accuracy, overreaction detection, scoring weight adjustments, and human approval.

## Logic Flow

```text
Collect monthly recommendation history
  -> Compare accepted, rejected, ignored, completed recommendations
  -> Measure subsequent asset and portfolio outcomes
  -> Compare portfolio to benchmarks
  -> Evaluate signal accuracy and bond signal accuracy
  -> Detect overreaction and underreaction
  -> Suggest scoring weight changes
  -> Require human approval before applying changes
  -> Store telemetry review
```

## Database Tables

Primary tables:

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
```

## Signal Accuracy

Evaluate:

- Did Buy/Strong Buy candidates outperform relevant benchmarks?
- Did Reduce/Sell reduce risk or avoid underperformance?
- Did Watch items remain uncertain or become actionable?
- Did bond duration calls match rate movement?
- Did Treasury vs corporate calls match credit-spread behavior?
- Did TIPS calls match inflation behavior?

## Weight Adjustment Rules

- Suggest changes only.
- Require human approval.
- Use small changes, usually +/-2% to +/-5%.
- Never eliminate risk or portfolio-fit weights.
- Do not increase news impact after a noisy month.
- Do not change weights from too few observations.

## Pseudo-Code

```ts
export class MonthlyTelemetryService {
  async runMonthlyReview(userId: string, portfolioId: string, month: Date) {
    const recommendations = await this.recommendations.listForMonth(userId, month);
    const outcomes = await this.evaluateRecommendationOutcomes(recommendations);
    const benchmarkComparison = await this.benchmarks.comparePortfolioForMonth(portfolioId, month);
    const signalAccuracy = await this.evaluateSignalAccuracy(recommendations, outcomes);
    const bondSignalAccuracy = await this.evaluateBondSignals(recommendations, outcomes);
    const overreactions = detectOverreaction(buildRecommendationEvents(recommendations, outcomes));
    const weightSuggestions = suggestScoringWeightChanges({ outcomes, signalAccuracy, bondSignalAccuracy, overreactions });
    return this.telemetry.saveReview({ userId, portfolioId, month, outcomes, benchmarkComparison, signalAccuracy, bondSignalAccuracy, overreactions, weightSuggestions });
  }
}
```

## UI Concepts

- Monthly intelligence review.
- Recommendation outcome table.
- Benchmark comparison chart.
- Signal accuracy cards.
- Bond signal accuracy card.
- Overreaction warnings.
- Approve/reject weight changes.

## Example

```text
Bond duration signals were useful this month. Short-duration bond recommendations performed as expected during rising rates. Suggested change: increase bond duration fit weight by 2 points and reduce bond momentum by 2 points. Human approval required.
```

