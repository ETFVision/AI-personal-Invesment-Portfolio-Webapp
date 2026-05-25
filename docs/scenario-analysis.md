# Scenario Analysis

## Purpose

Scenario Analysis estimates portfolio impact under recession, high inflation, prolonged high rates, oil spike, USD weakness, crypto crash, AI bubble correction, and geopolitical conflict. Each scenario includes bond impacts.

## Scenario Matrix

| Scenario | Equity Impact | Bond Impact | Gold Impact | Crypto Impact |
| --- | --- | --- | --- | --- |
| Recession | Broad decline | Treasuries may rally; high-yield hurt | Supportive | Risk-off decline |
| High inflation | Valuation pressure | Long nominal bonds hurt; TIPS supported | Supportive | Mixed |
| Prolonged high rates | Growth pressure | Short duration favored; long duration pressured | Mixed | Liquidity headwind |
| Oil spike | Margin pressure | Inflation-linked supported; nominal duration pressured | Supportive | Risk-off pressure |
| USD weakness | International helped in USD terms | Foreign bonds may benefit unhedged | Supportive | May support BTC |
| Crypto crash | Limited unless crypto held | Minimal direct impact | Mixed | Severe drawdown |
| AI bubble correction | Tech/growth drawdown | Treasuries may stabilize if risk-off | Neutral/supportive | Risk-off pressure |
| Geopolitical conflict | Risk-off pressure | Treasuries/cash-like supported; credit hurt | Supportive | High volatility |

## Logic Flow

```text
Load scenario definition
  -> Load holdings and exposures
  -> Load bond profiles
  -> Apply asset-class, sector, geography, currency, rate, and credit shocks
  -> Estimate holding-level impacts
  -> Aggregate portfolio impact
  -> Generate explanation and mitigation ideas
  -> Store scenario result
```

## Database Tables

Primary tables:

- `scenario_tests`
- `scenario_results`
- `holdings`
- `asset_snapshots`
- `bond_etf_profiles`
- `bond_assets`

Recommended table:

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
```

## Pseudo-Code

```ts
export function estimateBondScenarioImpact(holding, snapshot, profile, scenario): number {
  const rateImpact = -profile.effectiveDuration * scenario.rateShock;
  const spreadImpact = getSpreadSensitivity(profile.creditQuality) * scenario.creditSpreadShock * -1;
  const inflationAdjustment = profile.bondType === "inflation_linked"
    ? scenario.inflationLinkedBenefit
    : 0;
  const qualityAdjustment = profile.creditQuality === "treasury"
    ? scenario.flightToQualityBenefit
    : 0;

  return snapshot.marketValue * (rateImpact + spreadImpact + inflationAdjustment + qualityAdjustment);
}
```

## UI Concepts

- Scenario selector.
- Assumption summary.
- Impact waterfall.
- Asset-class impact chart.
- Holding impact table.
- Bond impact breakdown.
- Compare scenarios.

## Example

```text
Recession scenario estimated impact: -14.8%. Intermediate Treasuries offset part of the equity drawdown, while high-yield bond exposure declines due to credit-spread widening.
```

