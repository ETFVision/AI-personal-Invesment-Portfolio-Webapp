# Risk Analytics

## Purpose

Risk Analytics quantifies portfolio vulnerabilities across volatility, drawdown, Sharpe ratio, concentration, sector, geography, currency, correlations, diversification quality, bond duration exposure, and bond credit exposure.

## Logic Flow

```text
Load holdings, cash, prices, asset metadata, and bond profiles
  -> Convert market values to base currency
  -> Calculate return series
  -> Calculate volatility, drawdown, Sharpe ratio
  -> Calculate concentration and exposure breakdowns
  -> Calculate correlations and diversification quality
  -> Calculate bond duration and credit exposure
  -> Store portfolio risk metrics
  -> Feed recommendations and scenario analysis
```

## Database Tables

Primary tables:

- `portfolio_risk_metrics`
- `asset_correlations`
- `asset_snapshots`
- `portfolio_snapshots`
- `holdings`
- `bond_etf_profiles`
- `bond_assets`

Recommended table:

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
```

## Pseudo-Code

```ts
export class RiskAnalyticsService {
  async calculateRiskSnapshot(portfolioId: string, asOfDate: Date) {
    const holdings = await this.holdings.listActive(portfolioId);
    const snapshots = await this.assets.getPortfolioAssetSnapshots(portfolioId, asOfDate);
    const returnSeries = await this.portfolios.getReturnSeries(portfolioId, 252);
    const bondProfiles = await this.bonds.getProfilesForHoldings(holdings);

    return {
      volatility: calculateAnnualizedVolatility(returnSeries),
      maxDrawdown: calculateMaxDrawdown(returnSeries),
      sharpeRatio: calculateSharpeRatio(returnSeries, await this.rates.getRiskFreeRate()),
      concentration: calculateConcentration(snapshots),
      exposures: calculateExposureBreakdowns(snapshots),
      bondExposure: calculateBondExposure(holdings, snapshots, bondProfiles),
    };
  }
}
```

## Diversification Quality

Inputs:

- Position distribution.
- Average correlation.
- Sector balance.
- Geography balance.
- Currency balance.
- Asset-class balance.
- ETF overlap where available.
- Bond sleeve quality.

## UI Concepts

- Volatility and drawdown cards.
- Sharpe ratio card.
- Concentration heatmap.
- Sector/geography/currency charts.
- Correlation matrix.
- Diversification quality gauge.
- Bond duration and credit exposure panel.

## Example

```text
Portfolio concentration is moderate, but technology exposure is high at 34%. Bond duration is 6.2 years, creating meaningful sensitivity to rising rates.
```

