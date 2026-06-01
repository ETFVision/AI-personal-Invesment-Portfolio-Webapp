# QA Log

This file records completed QA reviews, fixes, test coverage, residual risks, and follow-up items for future phases.

## 2026-06-01 - Portfolio And Benchmark Return QA

Scope:
- Portfolio return accuracy.
- Benchmark comparison accuracy.
- Long-term performance chart behavior.
- Manual portfolio edge cases with incomplete transaction history.

Fixes made:
- Guarded portfolio returns against stale tiny manual snapshots.
- Switched portfolio performance to TWR-style chained subperiod returns where snapshot and cash-flow history supports it.
- Preserved manual-capital fallback where transaction history is incomplete.
- Aligned benchmark comparisons to nearest prior benchmark snapshot when exact dates are missing.
- Flattened stale pre-capital portfolio chart baselines to avoid artificial dips and spikes.
- Restored benchmark chart history without reintroducing stale portfolio return artifacts.

Tests added or improved:
- Decimal return formatting guard.
- Portfolio deposits excluded from returns.
- Portfolio withdrawals not treated as losses.
- TWR chaining across multiple subperiods.
- Stale tiny snapshot guard.
- Nearest prior benchmark date alignment.
- Long-term chart baseline guard.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Related commits:
- `4195ad6` - QA portfolio and benchmark returns
- `e8b0405` - Use TWR for portfolio returns
- `87d658c` - Guard TWR against stale manual snapshots
- `9120aa8` - Restore guarded benchmark chart history
- `0cb0356` - Align benchmarks to nearest prior snapshot
- `be10ee0` - Flatten stale portfolio chart baseline

Residual risks / follow-ups:
- Add true money-weighted return / XIRR as a separate personal-investor return.
- Add clearer methodology tooltips for TWR, benchmark price returns, and manual-capital fallback.
- Consider derived portfolio return tables once formulas stabilize.
- Add FX-aware returns once currency conversion is implemented.

## 2026-06-01 - Risk Analytics Layer QA

Scope:
- Volatility calculations.
- Drawdown calculations.
- Concentration risk.
- Correlation analysis.
- Risk contribution.
- Diversification score.
- Data integrity, architecture, UI, and performance review.

Fixes made:
- Fixed holding and asset-class correlations to align return series by date instead of by array position.
- Switched same-folder risk math import in `CorrelationService` to a relative import for test/runtime portability.

Tests added or improved:
- Uneven price-history correlation test.
- Existing coverage confirmed for volatility, drawdown, concentration, diversification, covariance risk contribution, and synthetic portfolio drawdown.

Validation run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Related commit:
- `8a85616` - Align risk correlations by date

Findings:
- No critical issues remained after the correlation fix.
- Service/repository pattern is preserved.
- No direct Supabase or FMP calls from UI components.
- Risk report caching through `portfolio_risk_reports` is working as a portable derived-report table.

Residual risks / follow-ups:
- Portfolio volatility currently uses stored portfolio snapshots, so deposits/withdrawals can distort volatility until TWR-style volatility or synthetic current-weight volatility is added.
- Multi-currency risk remains native-currency based until FX conversion is added.
- Risk cache invalidation currently relies mainly on taxonomy version/date behavior; later it should consider latest snapshot and price freshness.
- Add methodology tooltips for snapshot volatility, covariance risk contribution, proxy risk contribution, and synthetic drawdown.
- Add explicit tests for cash-only, crypto-heavy, and bond-heavy portfolio reports at the service level.
