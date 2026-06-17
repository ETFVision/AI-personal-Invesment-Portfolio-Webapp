import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import { MethodologyRelatedLinks } from "@/components/compliance/MethodologyRelatedLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { METHODOLOGY_LAST_UPDATED } from "./constants";

export const dynamic = "force-static";

const toc = [
  { href: "#overview", label: "Overview" },
  { href: "#characteristics-score", label: "Characteristics Score" },
  { href: "#fundamentals", label: "Fundamentals Score" },
  { href: "#confidence", label: "Confidence Metric" },
  { href: "#guardrails", label: "Guardrails" },
  { href: "#portfolio-score", label: "Portfolio Score" },
  { href: "#risk", label: "Risk Analytics" },
  { href: "#gap-analysis", label: "Gap Analysis" },
  { href: "#market-vision", label: "Market Vision" },
  { href: "#limitations", label: "Limitations" }
];

const assessmentRows = [
  ["85-100", "Excellent"],
  ["70-84", "Good"],
  ["50-69", "Neutral"],
  ["35-49", "Weak"],
  ["20-34", "Poor"],
  ["Below 20", "Significant Concerns"],
  ["Missing", "Insufficient Data"]
];

const componentCalculationRows = [
  ["Weighted composite", "Final score = sum(component score x component weight) / sum(available component weights). Missing or non-finite component scores are excluded from both numerator and denominator."],
  ["Momentum", "Starts at 50. Adds clamp(1Y return x 60, -25, 25), clamp(YTD return x 40, -15, 15), and clamp(daily return x 80, -5, 5). Final value is clamped to 0-100."],
  ["Risk analytics", "Uses 100 - instrumentRiskScore. Instrument risk itself is based on volatility, drawdown, downside volatility, and negative-return frequency. A higher risk analytics score means lower measured risk."],
  ["Theme alignment / Theme fit / Theme score", "Starts at 55 + 5 per canonical or thematic tag, capped at +20. Adds +5 for AI / Automation, Quality, or Global Diversification. Subtracts 5 for High Beta. Clamped to 0-100."],
  ["Macro fit", "Starts at 55. Gold gains +20 when inflation is elevated/rising/sticky or liquidity is stress/tight. Crypto loses 25 under stress/tight liquidity. Long-duration bonds lose 20 in restrictive/rising/high rates. Treasuries gain 15 when growth is weak/slowing/recessionary. Technology loses 8 in restrictive rates. Consumer Staples gains 8 when growth is weak."],
  ["Market Vision alignment", "Starts at 55. Adds +8 if Market Vision text mentions the instrument sector, +8 for theme mentions, +5 for supportive/tailwind language, and subtracts 5 for risk/headwind/stress/caution language. Adds asset-specific term bonuses for bonds (+3), gold (+5), and crypto (+3)."],
  ["ETF benchmark relative", "Score = 50 + one-year return x 50, clamped to 0-100. Missing one-year return means this component is excluded."],
  ["Bond duration fit", "Ultra-short or short duration = 72. Intermediate duration = 62. Long duration = 48."],
  ["Bond rate regime", "Long duration in high/restrictive/rising rates = 35. Ultra-short or short duration in restrictive rates = 75. Other available bond/rate combinations = 58."],
  ["Bond inflation regime", "Inflation-linked bond exposure in elevated/rising inflation = 78. Long duration under elevated inflation = 42. Other available combinations = 58."],
  ["Bond credit risk", "High-yield credit quality = 40. Other known credit quality = 65. Missing credit quality is excluded."],
  ["Bond portfolio stability", "Cash-like liquidity role or Treasury classification = 75. Other bond profiles = 55."],
  ["Gold inflation hedge", "Elevated or rising inflation regime = 78. Other available inflation regimes = 55."],
  ["Gold geopolitical hedge", "Stress or tight liquidity regime = 72. Other available liquidity regimes = 55."],
  ["Crypto liquidity regime", "Tight liquidity regime = 35. Macro regime available and not tight = 58. Missing macro regime is excluded."]
];

const instrumentPanels = [
  {
    title: "Stocks",
    rows: [
      ["Fundamentals", "32%"],
      ["Fundamental trends", "21%"],
      ["Valuation", "11%"],
      ["Risk analytics", "11%"],
      ["Market Vision alignment", "10%"],
      ["Theme alignment", "10%"],
      ["Momentum", "5%"]
    ]
  },
  {
    title: "ETFs",
    rows: [
      ["Risk analytics", "30%"],
      ["Momentum", "20%"],
      ["Macro fit", "18%"],
      ["Benchmark relative", "18%"],
      ["Market Vision alignment", "9%"],
      ["Theme fit", "5%"]
    ]
  },
  {
    title: "Bond ETFs",
    rows: [
      ["Duration fit", "22%"],
      ["Rate regime", "22%"],
      ["Inflation regime", "16%"],
      ["Yield curve", "13%"],
      ["Credit risk", "11%"],
      ["Portfolio stability", "11%"],
      ["Market Vision alignment", "5%"]
    ],
    note: "Duration fit scores are ultra-short/short = 72, intermediate = 62, and long = 48. Rate and inflation regimes can further affect the bond ETF score through deterministic macro rules."
  },
  {
    title: "Gold ETFs",
    rows: [
      ["Inflation hedge", "36%"],
      ["Geopolitical hedge", "29%"],
      ["Rates context", "14%"],
      ["Momentum", "14%"],
      ["Market Vision alignment", "7%"]
    ]
  },
  {
    title: "Crypto",
    rows: [
      ["Risk", "40%"],
      ["Momentum", "20%"],
      ["Liquidity regime", "20%"],
      ["Macro risk appetite", "9%"],
      ["Theme score", "7%"],
      ["Market Vision alignment", "4%"]
    ],
    note: "Crypto scores weight risk and liquidity heavily to reflect the elevated volatility profile of digital assets."
  }
];

const fundamentalRows = [
  ["Growth", "20%"],
  ["Profitability", "20%"],
  ["Valuation", "20%"],
  ["Balance sheet", "15%"],
  ["Cash flow", "15%"],
  ["Quality", "10%"]
];

const fundamentalHelperRows = [
  ["Positive percent metrics", "scorePositivePercent(value): value <= -10% gives 10; values up to neutral produce 35-50; values from neutral to excellent produce 50-100; final result is clamped to 0-100. Defaults: neutral 5%, excellent 30%."],
  ["Margin metrics", "scoreMargin(value, weak, strong) = ((value - weak) / (strong - weak)) x 70 + 25, clamped to 0-100."],
  ["Return metrics", "scoreReturn(value, weak, strong) = ((value - weak) / (strong - weak)) x 75 + 20, clamped to 0-100."],
  ["Lower-is-better metrics", "scoreLowerBetter(value, excellent, poor) = 100 - ((value - excellent) / (poor - excellent)) x 80, clamped to 0-100. Null or negative values are excluded."],
  ["Higher-is-better metrics", "scoreHigherBetter(value, poor, excellent) = ((value - poor) / (excellent - poor)) x 80 + 10, clamped to 0-100."]
];

const fundamentalCalculationRows = [
  ["Growth", "Average of revenue growth, EPS growth, net income growth, and free cash flow growth after each input is scored with scorePositivePercent."],
  ["Profitability", "Average of gross margin scoreMargin(0.15, 0.65), operating margin scoreMargin(0.05, 0.35), net margin scoreMargin(0.03, 0.25), ROE scoreReturn(0.03, 0.25), ROIC scoreReturn(0.03, 0.25), and ROA scoreReturn(0.02, 0.15)."],
  ["Valuation", "Average of P/E scoreLowerBetter(12, 60), forward P/E scoreLowerBetter(12, 55), price/sales scoreLowerBetter(2, 20), price/book scoreLowerBetter(1.5, 15), EV/EBITDA scoreLowerBetter(8, 35), and free cash flow yield scoreHigherBetter(0, 0.08)."],
  ["Balance sheet", "Average of debt/equity scoreLowerBetter(0.2, 3), net debt/EBITDA scoreLowerBetter(0.5, 5), current ratio scoreHigherBetter(0.7, 2.5), quick ratio scoreHigherBetter(0.5, 2), and cash/debt scoreHigherBetter(0.05, 1)."],
  ["Cash flow", "Average of operating cash flow relative to 25% of revenue, free cash flow relative to 20% of revenue, free cash flow margin scoreMargin(0, 0.25), and free cash flow growth scorePositivePercent(neutral 3%, excellent 25%)."],
  ["Quality", "Average of profitability score, cash flow score, balance sheet score, ROIC score, and operating margin score."],
  ["Overall fundamentals", "Weighted average of available category scores: growth 20%, profitability 20%, valuation 20%, balance sheet 15%, cash flow 15%, quality 10%. Missing categories are excluded from the denominator."],
  ["Quality valuation adjustment", "For large-cap quality-growth companies with market cap at least $50B in technology, communication, semiconductor, software, internet, healthcare, biotechnology, or pharmaceutical areas, a quality composite of growth/profitability/cash flow/quality at least 70 can add +12 to +22 to raw valuation, plus +4 when growth is at least 70. Adjusted valuation is at least 28 and capped at 55."]
];

const trendRows = [
  ["Observation windows", "Short-term trend uses the latest five quarterly observations where the metric supports quarterly analysis. Long-term trend uses the latest five annual observations. Annual-only metrics use not applicable for short-term direction."],
  ["Direction inputs", "Trend direction compares first-half average, second-half average, latest value, prior value, direction changes, and volatility. Lower-is-better metrics invert the direction."],
  ["Positive directions", "Accelerating or improving scores 90 when strong, 74 when moderate, and 66 when weak. Rebounding scores 78 when strong and 68 otherwise. Stable scores 56."],
  ["Negative directions", "Decelerating scores 44 when strong and 50 otherwise. Deteriorating scores 18 when strong, 34 when moderate, and 42 when weak. Volatile scores 32 when strong and 44 otherwise."],
  ["Trend confidence", "Fewer than 3 observations = 20. 3-4 observations = 62. 5+ observations = 82. Volatile direction subtracts 18. Non-finite values subtract 20."],
  ["Per-metric score", "overallTrendScore = weighted average of short-term and long-term trend scores. Short-term weight = confidence x 0.4. Long-term weight = confidence x 0.6."],
  ["Summary trend score", "Category scores are confidence-weighted and combined as growth 35%, margin 25%, profitability 20%, balance sheet 10%, and quality 10%."]
];

const confidenceRows = [
  ["Fundamentals", "Available data points divided by 16 defined inputs, clamped to 0-100."],
  ["Trend scores", "3-4 observations produce 62%; 5+ observations produce 82%; volatile direction subtracts 18."],
  ["Risk metrics", "30 days = 40%, 60 days = 55%, 120 days = 70%, 252+ days = 90%."],
  ["Characteristics Score", "Composite of available component ratio, score dispersion, strategic agreement, and signal conflict; strong/weak conflict subtracts 8."]
];

const characteristicsConfidenceRows = [
  ["Available ratio", "available component weight / total configured component weight."],
  ["Base confidence", "Usually 72. Crypto uses 62 because crypto classifications are intentionally conservative in V1."],
  ["Completeness bonus", "+8 when available ratio is at least 95%; +4 when at least 80%."],
  ["Agreement bonus", "+5 when component-score dispersion is greater than 0 and below 12."],
  ["Strategic agreement bonus", "+5 when fundamentals, Market Vision alignment, and theme alignment are all at least 70."],
  ["Conflict penalty", "-8 when at least one component is at least 70 and at least one component is below 45."],
  ["Dispersion penalty", "min(12, dispersion x 0.25)."],
  ["Final formula", "confidence = baseConfidence x availableRatio + completenessBonus + agreementBonus + strategicAgreementBonus - conflictPenalty - dispersionPenalty, clamped to 0-100."]
];

const guardrailRows = [
  ["Low confidence cap", "Confidence below 50", "Insufficient Data"],
  ["Weak fundamentals cap", "Fundamentals score below 35", "Capped at Weak"],
  ["Poor valuation cap", "Valuation below 25 and fundamentals below 70 or missing", "Capped at Weak"],
  ["Quality valuation cap", "Valuation below 25 and fundamentals at least 70", "Capped at Neutral"],
  ["Excessive instrument risk cap", "Instrument risk score above 75", "Capped at Weak unless already Poor or Significant Concerns"],
  ["Bond duration and rate regime mismatch cap", "Long-duration bond profile in restrictive, rising, or high-rate regime", "Capped at Neutral"]
];

const portfolioRows = [
  ["Allocation", "15%", "Cash, equity, fixed income, gold and crypto balance"],
  ["Concentration", "15%", "Top holding, top-five, and sector concentration"],
  ["Diversification", "15%", "Holding count, asset class, sector, geography, currency spread and correlations"],
  ["Risk", "15%", "Volatility, drawdown and risk contribution"],
  ["Macro Fit", "15%", "Portfolio posture vs FRED regimes and Market Vision"],
  ["Insight Alignment", "10%", "Holdings agreement with the Characteristics Score engine"],
  ["Fixed Income", "10%", "Duration, credit quality and recession-hedge roles"],
  ["Theme Exposure", "5%", "ETF look-through theme alignment vs current news and macro themes"],
  ["Geography", "0%", "Displayed diagnostic dimension; currently excluded from the composite"]
];

const portfolioDefinitionRows = [
  ["Allocation", "Starts from an 82 baseline and adjusts for equity-heavy exposure, low fixed-income ballast, high cash, and material crypto exposure."],
  ["Concentration", "Uses direct holdings plus ETF look-through where available. Penalizes high largest holding, high top-five exposure, and high largest-sector exposure."],
  ["Diversification", "Uses meaningful holding count, asset-class count, sector count, currency count, average correlation, top holding concentration, and top-five concentration."],
  ["Risk", "Uses portfolio volatility, current drawdown, max drawdown, and risk contribution diagnostics from flow-adjusted return data."],
  ["Macro Fit", "Compares portfolio posture against FRED rates, inflation, growth, liquidity regimes and the latest Market Vision risk context."],
  ["Insight Alignment", "Compares current holdings with the Characteristics Score engine output and measures coverage of scored instruments."],
  ["Fixed Income", "Uses total bond allocation, duration exposure, high-yield exposure, treasury/corporate mix, recession hedge exposure, and bond profile coverage."],
  ["Theme Exposure", "Uses ETF look-through theme exposure and current news/macro theme intelligence where available."],
  ["Geography", "Uses ETF country look-through or direct geography fallback. It is displayed as a diagnostic and currently carries 0% portfolio-score weight."]
];

const portfolioFormulaRows = [
  ["Allocation", "82 - max(0, equity - 0.85) x 80 - max(0, 0.08 - bonds) x 90 - max(0, cash - 0.35) x 55 - max(0, crypto - 0.10) x 90."],
  ["Concentration", "90 - max(0, topHolding - 0.15) x 120 - max(0, topCombinedFive - 0.50) x 80 - max(0, sectorTop - 0.40) x 60."],
  ["Diversification", "Starts from the Risk Analytics diversification score. If ETF look-through exists, adds min(8, sectorCount + countryCount)."],
  ["Risk", "88 - max(0, volatility - 0.18) x 120 - max(0, abs(maxDrawdown) - 0.15) x 100 - max(0, abs(currentDrawdown) - 0.08) x 70."],
  ["Macro Fit", "72 - 8 if rates are restrictive and equity allocation is above 75% - 10 if growth is weak and equity allocation is above 70% + 5 if inflation is elevated and the portfolio has gold exposure."],
  ["Insight Alignment", "60 + constructiveHeldCount x 4 - weakHeldCount x 8 + coverage x 12."],
  ["Fixed Income", "78 - max(0, 0.08 - totalBondAllocation) x 120 - max(0, longDurationExposure - 0.35) x 60 - max(0, highYieldExposure - 0.20) x 80 + min(8, recessionHedgeExposure x 10)."],
  ["Theme Exposure", "64 + min(15, alignedThemeCount x 4) - max(0, largestSectorWeight - 0.45) x 50."],
  ["Geography", "86 - max(0, usWeight - 0.70) x 80 - max(0, 0.12 - internationalWeight) x 120. This is diagnostic only and currently has 0% overall weight."]
];

const portfolioPlainEnglishRows = [
  ["Allocation", "Starts at 82 and is reduced by excess equity concentration, insufficient bond ballast, high cash, or material crypto exposure."],
  ["Concentration", "Starts at 90 and is reduced by large single holdings, high top-five concentration, or dominant sector exposure."],
  ["Diversification", "Builds from the risk analytics diversification score and adds points for broader sector and country coverage from ETF look-through."],
  ["Risk", "Starts at 88 and is reduced by high volatility, large drawdowns, or deep current drawdowns."],
  ["Macro Fit", "Starts at 72 and adjusts based on whether the portfolio posture is appropriate for current rate, growth, and inflation regimes."],
  ["Insight Alignment", "Starts at 60 and increases when current holdings score well in the Characteristics Score engine, and decreases when holdings score poorly."],
  ["Fixed Income", "Starts at 78 and adjusts for bond sleeve size, long-duration exposure, high-yield exposure, and recession-hedge coverage."],
  ["Theme Exposure", "Starts at 64 and increases for theme alignment, and decreases for excessive single-sector concentration."],
  ["Geography", "Calculated as a diagnostic only - currently carries 0% weight in the composite score."]
];

const riskMetricRows = [
  ["Instrument daily return", "daily_return = close_price / previous_close_price - 1."],
  ["Instrument weekly return", "weekly_return = close_price / five_day_close_price - 1."],
  ["Instrument annualized volatility", "stddev_samp(daily_return_window) x sqrt(252). 30D requires at least 10 observations, 90D at least 30, and 1Y at least 60."],
  ["Instrument drawdown", "drawdown = close_price / running_peak - 1. Current drawdown is the latest drawdown. Max drawdown is the most negative drawdown in the analyzed history."],
  ["Instrument risk score", "volScore x 35% + drawdownScore x 35% + downsideScore x 20% + frequencyScore x 10%, where volScore = bounded(1Y volatility / 0.60 x 100), drawdownScore = bounded(abs(maxDrawdown) / 0.50 x 100), downsideScore = bounded(downsideVolatility / 0.45 x 100), and frequencyScore = negativeReturnFrequency x 100 or 50 when missing."],
  ["Risk buckets", "Risk score below 25 = low, below 50 = medium, below 75 = high, 75 or above = very high. Missing risk score = insufficient data."],
  ["Portfolio period return", "periodReturn = (currentTotalValue - netExternalFlow) / previousTotalValue - 1. Deposits are positive external flows; withdrawals are negative external flows."],
  ["Portfolio volatility", "annualizedVolatility = sample standard deviation of flow-adjusted daily portfolio returns x sqrt(252)."],
  ["Portfolio drawdown", "The flow-adjusted return series is chained from a level of 100, a running peak is tracked, current drawdown = current level / peak - 1, and max drawdown is the most negative point."],
  ["Covariance risk contribution", "When at least 30 overlapping observations exist and eligible coverage is about 70% of portfolio value, the system annualizes covariance by multiplying by 252, calculates portfolio variance as weights' x covariance x weights, and derives each holding's contribution from marginal and absolute contribution."],
  ["Proxy risk contribution", "When covariance coverage is insufficient, riskShare = allocationWeight x proxyRiskWeight and riskContribution = riskShare / sum(riskShare). Proxy weights are crypto 1.80, stock 1.25, gold ETF 1.05, bond ETF 0.55, other 1.00."]
];

const macroRows = [
  ["Macro trend confidence", "round(observationCount / needed x 100), clamped to 0-100. Needed observations: quarterly = 6, daily = 30, other = 12."],
  ["Macro trend severity", "Inflation indicators use abs(oneYearChange) x 15, capped at 100. Rates/yields use abs(latestValue) x 10. Unemployment uses max(0, latestValue - 3.5) x 25. Other indicators use abs(oneYearChange) x 10."],
  ["Macro persistence", "Uses the latest six observations and counts how many are non-decreasing versus the prior observation. persistenceScore = min(100, count x 16)."],
  ["FRED theme signals", "Indicator signals are mapped to themes such as Rates, Inflation, Growth, Employment, Yield Curve, Currency, and Energy. Severity, persistence, and confidence are copied or clamped from macro trends."],
  ["Market Vision source text", "Alignment scans the report executive summary, asset-class views, rates/inflation/growth/currency/geopolitical views, opportunities, risks, and portfolio implication text."]
];

function Section({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function MethodologyTable({
  columns,
  rows
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-slate-200">
              {row.map((cell) => (
                <td key={cell} className="px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TocLinks({ compact = false }: { compact?: boolean }) {
  return (
    <nav className={compact ? "grid gap-1" : "space-y-1"} aria-label="Methodology sections">
      {toc.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className="block rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-muted hover:text-slate-950"
        >
          <span className="mr-2 text-xs font-semibold text-teal-700">{index + 1}.</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

function FormulaAccordion({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border bg-muted/40 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-2 font-medium">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          {title}
        </span>
        <span className="text-xs">For transparency - not required reading</span>
      </summary>
      <div className="mt-3">
        {children}
      </div>
    </details>
  );
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-8 md:px-8 lg:px-10">
      <PageContainer>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              This document describes analytical methods only. Nothing on this platform constitutes investment advice, a recommendation to buy, sell, or hold any security, or a securities rating of any kind.
            </p>
          </div>
        </div>

        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
          This page explains how ETFVision calculates the scores and labels you see in the app. Start with Characteristics Score to understand what Good, Neutral, or Weak means. Go to Portfolio Score to understand your overall portfolio rating. Technical formula details are included for transparency - they are not required reading.
        </p>

        <PageHeader
          eyebrow="Public methodology"
          title="Analytical Methodology"
          description="How ETFVision scores and classifications are produced"
          meta={<StatusBadge tone="info">Last updated: {METHODOLOGY_LAST_UPDATED}</StatusBadge>}
        />

        <details className="rounded-xl border border-slate-200 bg-white/85 p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Methodology sections</summary>
          <div className="mt-3">
            <TocLinks compact />
          </div>
        </details>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <article className="space-y-8">
            <Section id="overview" title="Overview">
              <Card>
                <CardContent className="space-y-4 pt-5">
                  <Paragraph>
                    ETFVision uses a deterministic, rules-based scoring engine. All outputs are analytical classifications derived from stored quantitative data. No outputs constitute investment advice, trade instructions, or ratings under any securities regulation.
                  </Paragraph>
                  <Paragraph>
                    Scores are stored on a 0-100 scale. Missing inputs are excluded from weighted averages rather than treated as zero, so scores reflect available data only. Confidence metrics indicate data completeness and recency, not probability of outperformance.
                  </Paragraph>
                  <Paragraph>
                    This page describes the scoring logic implemented in the current ETFVision engine as of {METHODOLOGY_LAST_UPDATED}. Changes to scoring logic should update this page in the same release.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="characteristics-score" title="Characteristics Score">
              <Card>
                <CardHeader>
                  <CardTitle>Characteristics Score Methodology</CardTitle>
                  <CardDescription>
                    The Characteristics Score is a composite quantitative metric from component scores weighted by instrument type.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Paragraph>
                    The Characteristics Score is shown with user-facing analytical assessment labels. These labels do not mean buy, sell, hold, reduce, or any other trade instruction.
                  </Paragraph>
                  <MethodologyTable columns={["Score range", "Assessment label"]} rows={assessmentRows} />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Characteristics Score = weighted average of available component scores for the instrument type. A component contributes only when its score is available and finite. Each result is clamped to the 0-100 scoring scale.
                  </div>
                  <div className="space-y-3">
                    {instrumentPanels.map((panel) => (
                      <details key={panel.title} className="rounded-lg border border-slate-200 bg-white p-3" open={panel.title === "Stocks"}>
                        <summary className="cursor-pointer text-sm font-semibold text-slate-900">{panel.title}</summary>
                        <div className="mt-3 space-y-3">
                          <MethodologyTable columns={["Component", "Weight"]} rows={panel.rows} />
                          {panel.note ? <Paragraph>{panel.note}</Paragraph> : null}
                        </div>
                      </details>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Component Calculation Details</h3>
                    <Paragraph>
                      The table below explains how the main score components, fits, and alignments are calculated before they are combined by instrument type.
                    </Paragraph>
                    <FormulaAccordion title="Show component formula detail">
                      <MethodologyTable columns={["Component / fit / alignment", "Calculation detail"]} rows={componentCalculationRows} />
                    </FormulaAccordion>
                  </div>
                </CardContent>
              </Card>
            </Section>

            <Section id="fundamentals" title="Fundamentals Score">
              <Card>
                <CardHeader>
                  <CardTitle>Fundamentals Score</CardTitle>
                  <CardDescription>Weighted composite across six categories, with unavailable components excluded from the denominator.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    The Fundamentals Score measures the financial health and quality of a company across six dimensions. A higher score means stronger reported financials across growth, profitability, valuation, balance sheet, cash flow, and quality metrics. It does not predict future performance.
                  </Paragraph>
                  <MethodologyTable columns={["Component", "Weight"]} rows={fundamentalRows} />
                  <Paragraph>
                    Only available component scores contribute to the weighted average. Missing components are excluded from the denominator, so a missing input does not become a zero score.
                  </Paragraph>
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Normalization Helpers</h3>
                    <FormulaAccordion title="Show normalization formulas">
                      <MethodologyTable columns={["Helper", "Formula"]} rows={fundamentalHelperRows} />
                    </FormulaAccordion>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Sub-Score Calculations</h3>
                    <FormulaAccordion title="Show sub-score calculations">
                      <MethodologyTable columns={["Sub-score", "Calculation detail"]} rows={fundamentalCalculationRows} />
                    </FormulaAccordion>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Fundamentals confidence = clamp((availableInputs / 16) x 100). The availability count includes growth, profitability, valuation, balance-sheet, and cash-flow data points used by the scoring service.
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Fundamental Trend Calculations</h3>
                    <MethodologyTable columns={["Trend element", "Calculation detail"]} rows={trendRows} />
                  </div>
                </CardContent>
              </Card>
            </Section>

            <Section id="confidence" title="Confidence Metric">
              <Card>
                <CardHeader>
                  <CardTitle>Confidence Metric</CardTitle>
                  <CardDescription>Confidence reflects data completeness, recency, dispersion, and signal agreement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MethodologyTable columns={["Context", "How confidence is calculated"]} rows={confidenceRows} />
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Characteristics Confidence Formula</h3>
                    <FormulaAccordion title="Show confidence formula detail">
                      <MethodologyTable columns={["Input", "Calculation detail"]} rows={characteristicsConfidenceRows} />
                    </FormulaAccordion>
                  </div>
                  <Paragraph>
                    Higher confidence means more complete underlying data. It does not represent expected return, probability of outperformance, or suitability for any individual investor.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="guardrails" title="Guardrails">
              <Card>
                <CardHeader>
                  <CardTitle>Guardrails</CardTitle>
                  <CardDescription>Guardrails are deterministic filters applied after scoring.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MethodologyTable columns={["Guardrail", "Condition", "Effect"]} rows={guardrailRows} />
                  <Paragraph>
                    An instrument may have a high Characteristics Score but still be capped by a guardrail. Guardrails are applied consistently and mechanically. They are not discretionary judgements.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="portfolio-score" title="Portfolio Score">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Score</CardTitle>
                  <CardDescription>Weighted composite across analytical portfolio dimensions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MethodologyTable columns={["Dimension", "Weight", "What it measures"]} rows={portfolioRows} />
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Portfolio Dimension Definitions</h3>
                    <MethodologyTable columns={["Dimension", "How it is evaluated"]} rows={portfolioDefinitionRows} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Portfolio Section Score Formulas</h3>
                    <Paragraph>
                      Each section score is rounded and clamped to 0-100 before the weighted composite is calculated.
                    </Paragraph>
                    <MethodologyTable columns={["Dimension", "Plain-English explanation"]} rows={portfolioPlainEnglishRows} />
                    <FormulaAccordion title="Show portfolio score formulas">
                      <MethodologyTable columns={["Section", "Formula"]} rows={portfolioFormulaRows} />
                    </FormulaAccordion>
                  </div>
                  <Paragraph>
                    The Portfolio Score reflects analytical characteristics at the time of the last review run. It does not predict future performance or assess suitability for any individual.
                  </Paragraph>
                  <Paragraph>
                    Portfolio review confidence starts at 40 and adds points for holdings, recent prices, sufficient risk observations, available Characteristics Score outputs, Market Vision, macro regime, theme intelligence, and ETF look-through coverage.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="risk" title="Risk Analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Analytics</CardTitle>
                  <CardDescription>Portfolio risk metrics use flow-adjusted return series where portfolio snapshots and transactions are available.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Risk Analytics measures how volatile and loss-prone an instrument or portfolio has been based on historical price data. A higher risk score means higher measured risk. These are backward-looking metrics - they describe past behaviour, not future risk.
                  </Paragraph>
                  <Paragraph>
                    Daily portfolio returns are calculated as current value less external cash flow, divided by previous value, minus one. This TWR-style adjustment avoids treating deposits as gains or withdrawals as drawdowns.
                  </Paragraph>
                  <MethodologyTable columns={["Metric", "Calculation detail"]} rows={riskMetricRows} />
                  <Paragraph>
                    Annualized volatility is the sample standard deviation of daily returns multiplied by the square root of 252. Drawdown is calculated from a chained level series starting at 100.
                  </Paragraph>
                  <Paragraph>
                    Risk contribution is covariance-based when at least 30 overlapping observations exist and covariance coverage is at least 70% of portfolio value. Otherwise, proxy risk factors are used: crypto 1.80x, stock 1.25x, gold ETF 1.05x, bond ETF 0.55x, and other 1.00x.
                  </Paragraph>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Diversification Score = holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty - concentrationPenalty.
                    Holding, asset-class, sector, and currency scores are capped components; correlation and concentration reduce the final score.
                  </div>
                </CardContent>
              </Card>
            </Section>

            <Section id="gap-analysis" title="Gap Analysis">
              <Card>
                <CardHeader>
                  <CardTitle>Gap Analysis</CardTitle>
                  <CardDescription>Deterministic category-weight screening for the Portfolio Review page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Gap Analysis identifies instrument categories where look-through exposure is below the median of the approved universe. An instrument appears only when its category is underweighted, it is in the active approved universe, and it has passed all guardrail filters.
                  </Paragraph>
                  <Paragraph>
                    Appearance in Gap Analysis is the output of a deterministic category-weight rule. It is not a recommendation to purchase, review, or take any action on any instrument.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="market-vision" title="Market Vision">
              <Card>
                <CardHeader>
                  <CardTitle>Market Vision</CardTitle>
                  <CardDescription>Market Vision is one mechanical input among several in the Characteristics Score engine.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Market Vision alignment uses weekly macro and market-context text as scoring input. Its component weight is 10% for stocks, 9% for ETFs, 5% for bond ETFs, 7% for gold ETFs, and 4% for crypto.
                  </Paragraph>
                  <FormulaAccordion title="Show macro and Market Vision formula detail">
                    <MethodologyTable columns={["Macro / Market Vision element", "Calculation detail"]} rows={macroRows} />
                  </FormulaAccordion>
                  <Paragraph>
                    Market Vision is not a market forecast, investment outlook, or CIO opinion. References to supportive context or risk language reflect mechanical alignment scores only, not predictions about future returns.
                  </Paragraph>
                  <Paragraph>
                    FRED macroeconomic regime signals are sourced from the Federal Reserve Bank of St. Louis public API and updated on a scheduled basis.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="limitations" title="Limitations">
              <Card>
                <CardHeader>
                  <CardTitle>Limitations</CardTitle>
                  <CardDescription>Known boundaries of ETFVision analytical outputs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                    <li>Scores reflect data available at the time of the last scheduled engine run. Data may be delayed, incomplete, or subject to revision by the source provider.</li>
                    <li>Bond rate and spread shock estimates are first-order approximations and do not model convexity, curve shape, ETF premium/discount behavior, or changing fund composition.</li>
                    <li>Covariance risk contribution requires sufficient price-history overlap. When coverage is insufficient, a proxy model is used and flagged in risk diagnostics.</li>
                    <li>Fundamental scores require financial statement data. Companies with limited reporting history or non-standard reporting may have fewer inputs and lower confidence.</li>
                    <li>ETF look-through data reflects cached provider allocations. Allocations may lag actual fund composition.</li>
                  </ul>
                  <Paragraph>
                    Scores do not account for individual tax circumstances, investment horizons, liquidity needs, or personal financial goals. ETFVision does not have knowledge of users&apos; broader financial situation. All outputs should be considered alongside advice from a qualified financial professional.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <MethodologyRelatedLinks />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white/85 p-3 shadow-sm">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Contents</p>
              <TocLinks />
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
