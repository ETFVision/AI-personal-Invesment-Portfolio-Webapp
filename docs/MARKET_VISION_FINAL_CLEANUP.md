# Market Vision Final Cleanup

Last updated: 2026-06-14 22:30:00 +08:00

## Purpose

This document captures the final Market Vision calibration cleanup after comparing the 2026-06-07 and 2026-06-14 generated reports. The earlier regression fix restored portfolio context and deterministic metadata. This cleanup tightens transition logic, confidence display, portfolio impact scoring, tactical theme display, and advice-language guardrails.

## Issues Addressed

1. Inflation wording moved from `Reaccelerating` to `high and sticky / reaccelerating` and was incorrectly shown as a full regime shift.
2. Yield curve wording moved from `Mixed / normal with conflicting slope signals` to `mixed` and was incorrectly shown as a full regime shift.
3. Overall Market confidence could show High/95 even when the regime was mixed with competing supportive and adverse forces.
4. Portfolio macro impact could show composite driver percentages above 100, such as Geopolitics above 100%.
5. Tactical themes could show inactive or contradicted themes, such as `TACTICAL_WEAKENING_USD` while the USD regime was strengthening.
6. Opportunity wording could drift toward advice-adjacent language such as `tradeable attention`.

## Implementation Summary

### Canonical Regime Mapping

Market Vision now maps raw regime labels into canonical families before transition comparison:

- Growth: `GROWTH_EXPANDING`, `GROWTH_SLOWING`, `GROWTH_CONTRACTING`, `GROWTH_MIXED`
- Inflation: `INFLATION_ELEVATED`, `INFLATION_COOLING`, `INFLATION_LOW`
- Rates: `RATES_FALLING`, `RATES_RISING`, `RATES_STABLE`
- Yield curve: `CURVE_MIXED`, `CURVE_NORMAL`, `CURVE_INVERTED`, `CURVE_STEEPENING`, `CURVE_FLATTENING`
- Liquidity: `LIQUIDITY_TIGHTENING`, `LIQUIDITY_NEUTRAL`, `LIQUIDITY_EASING`
- USD: `USD_WEAKENING`, `USD_STRENGTHENING`, `USD_STABLE_OR_MIXED`
- Commodities: `COMMODITY_ENERGY_PRESSURE`, `COMMODITY_ENERGY_RELIEF`, `COMMODITY_NEUTRAL_OR_MIXED`
- Overall Market: `OVERALL_MIXED`, `OVERALL_CONSTRUCTIVE`, `OVERALL_DEFENSIVE`

Transition labels are derived from canonical movement:

- Same canonical label: `No Change`
- Same family, different subtype: `Minor Classification Change`
- Opposite directional move: `Regime Shift Detected`
- No prior comparable signal: `New Signal`

### Overall Market Confidence Cap

Overall Market is treated as a synthesis dimension. Its confidence is capped when:

- The overall canonical regime is mixed.
- Supportive and adverse regime forces coexist.
- Multiple macro dimensions are neutral or mixed.

This prevents mixed-but-constructive reports from showing an overly strong confidence score.

### Portfolio Macro Impact Display

Composite portfolio impact rows now store both raw and display-safe values:

- `rawDriverScore`: uncapped diagnostic composite.
- `displayDriverScoreCapped`: capped user-facing score.
- `driverBreakdown`: component exposures explaining the composite.

Geopolitics should now explain the component mix rather than display a single over-100 percentage.

### Tactical Theme Filtering

Tactical themes now support:

- `active`
- `inactive`
- `contradicted`
- `watch_only`
- `internal_only`

Only active and useful watch-only themes are shown to users. Suppressed themes remain available in `themeDiagnostics` for telemetry and QA.

Specific rules:

- Suppress weakening USD when USD regime is strengthening.
- Add USD strength when USD regime is strengthening and absent from model output.
- Suppress tightening liquidity when liquidity regime is neutral.

### Language Guardrails

Generated output is sanitized to remove advice-adjacent terms:

- `tradeable attention` becomes `monitoring attention`
- `tradeable` becomes `notable`
- `entry point` becomes `monitoring point`
- `buying opportunity` becomes `area to monitor`

The prompt also instructs the model to avoid recommendation-style language.

## Validation Expectations

Expected QA checks:

- Inflation reaccelerating to high-and-sticky/reaccelerating is not a full regime shift.
- Yield curve mixed/normal/conflicting to mixed is not a full regime shift.
- USD weakening to strengthening remains a full regime shift.
- Overall Market mixed-but-constructive confidence is capped below High/95.
- Portfolio impact rows do not show over-100 display percentages.
- Tactical weakening-USD is hidden when USD is strengthening.
- `TACTICAL_USD_STRENGTH` appears when USD is strengthening.
- Output text does not include `tradeable`.

## Files

- `src/application/services/marketVision/MarketVisionGenerationService.ts`
- `src/domain/marketVision/types.ts`
- `tests/market-vision.test.ts`
- `docs/MARKET_VISION_METHODOLOGY.md`
- `docs/MARKET_VISION_FINAL_CLEANUP.md`
- `docs/qa-log.md`
