# Market Vision Calibration Notes

Last updated: 2026-06-14 23:00:00 +08:00

## Purpose

This note records the narrow Market Vision v3 calibration pass applied after comparing the 2026-06-07 and 2026-06-14 weekly reports. It supplements the main methodology document and should be read as implementation calibration, not a new product layer.

## Changes

### Liquidity Transitions

Liquidity transitions now treat material movement between tightening, neutral and easing as regime shifts:

- `LIQUIDITY_TIGHTENING -> LIQUIDITY_NEUTRAL`: `Regime Shift Detected`
- `LIQUIDITY_NEUTRAL -> LIQUIDITY_TIGHTENING`: `Regime Shift Detected`
- `LIQUIDITY_EASING -> LIQUIDITY_NEUTRAL`: `Regime Shift Detected`
- `LIQUIDITY_NEUTRAL -> LIQUIDITY_EASING`: `Regime Shift Detected`
- `LIQUIDITY_TIGHTENING -> LIQUIDITY_EASING`: `Regime Shift Detected`

`Tightening` and `Restrictive` normalize to the same tightening family and can remain `No Change`.

### Overall Market Transitions

Overall Market labels are now canonicalized into subtypes before transition labels are assigned:

- `Mixed / selective risk support -> Mixed but constructive`: `Minor Classification Change`
- Same mixed subtype to same mixed subtype: `No Change`
- Mixed to clear `risk-on`: `Regime Shift Detected`
- Mixed to clear `risk-off`: `Regime Shift Detected`

This avoids overstating small wording changes while still flagging a genuine move into a clear risk-on or risk-off regime.

### Confidence Caps

Macro confidence rows still use the mechanical support/direct/conflict/gap/stale formula. After that formula:

- Default macro regime cap is 90.
- 91-95 requires strong direct evidence: at least 5 supporting observations, at least 4 direct indicator observations, zero gaps, zero stale indicators, and a non-mixed regime.
- 96-100 requires exceptional evidence: at least 7 supporting observations, at least 5 direct indicator observations, zero gaps, zero stale indicators, and a non-mixed regime.

Overall Market is capped more conservatively because it is a synthesis row:

- Mixed overall regime caps at 80.
- Supportive and adverse signals coexisting caps at 80.
- Two or more mixed/neutral cross-currents cap at 74 so the displayed label remains Medium.
- Overall Market should rarely exceed 90.

## Preserved Behavior

- Portfolio macro impact matrix remains deterministic and uses portfolio look-through exposure.
- Geopolitics composite driver display remains capped for the UI while raw diagnostics remain stored.
- `TACTICAL_USD_STRENGTH` is shown when USD is strengthening.
- `TACTICAL_WEAKENING_USD` is suppressed when USD is strengthening.
- `TACTICAL_TIGHTENING_LIQUIDITY` is suppressed when liquidity is neutral.
- Market Vision remains draft-first and does not create recommendation actions.

## Validation

- Added tests for liquidity transition variants.
- Added tests for Overall Market subtype transitions.
- Added confidence-cap assertions for mixed Overall Market, normal macro caps, and high direct-evidence macro rows.
- Focused test command passed: `npm.cmd test -- market-vision`.

## Follow-Up

- Re-run the 2026-06-08 to 2026-06-14 weekly draft after this calibration and compare against the 2026-06-07 report.
- Confirm generated report displays Overall Market confidence as Medium when mixed cross-currents remain present.
- Continue Phase B/C Market Vision refinement later after more weekly telemetry observations mature.
