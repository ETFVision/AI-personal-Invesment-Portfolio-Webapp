# Benchmarking

## Purpose

The Benchmarking module compares the portfolio against relevant market references: S&P 500, Nasdaq, global equities, 60/40 portfolio, gold, Bitcoin, and bond benchmarks.

## Benchmark Set

Recommended defaults:

- S&P 500: `SPY` or `VOO`
- Nasdaq: `QQQ`
- Global equities: `VT` or `ACWI`
- 60/40 portfolio: 60% global equities, 40% aggregate bonds
- Gold: `GLD` or `IAU`
- Bitcoin: `BTC`
- Aggregate bonds: `AGG` or `BND`
- Short Treasury: `SGOV`, `BIL`, or `SHY`
- Long Treasury: `TLT`
- Inflation-linked bonds: `TIP` or `VTIP`

## Logic Flow

```text
Load benchmark definitions
  -> Fetch daily benchmark prices
  -> Calculate benchmark return series
  -> Build blended benchmarks
  -> Compare portfolio snapshots against benchmark series
  -> Calculate excess return, volatility, drawdown, beta, and tracking difference
  -> Store benchmark performance and comparison records
  -> Feed dashboard, recommendations, telemetry, and allocation review
```

## Database Tables

Primary tables:

- `benchmarks`
- `benchmark_performance`
- `daily_prices`
- `portfolio_snapshots`

Recommended table:

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
```

## Pseudo-Code

```ts
export class BenchmarkingService {
  async comparePortfolio(portfolioId: string, benchmarkId: string, period: Period) {
    const portfolioSeries = await this.portfolios.getSnapshotSeries(portfolioId, period);
    const benchmarkSeries = await this.benchmarks.getPerformanceSeries(benchmarkId, period);
    return calculateBenchmarkComparison(portfolioSeries, benchmarkSeries);
  }
}
```

## UI Concepts

- Benchmark selector.
- Portfolio vs benchmark line chart.
- Relative return chart.
- Drawdown comparison.
- Benchmark tiles.
- Custom blended benchmark builder.

## Example

```text
The portfolio underperformed the 60/40 benchmark by 1.8% over the last month but had a smaller drawdown. The difference came mainly from lower equity exposure and higher cash allocation.
```

