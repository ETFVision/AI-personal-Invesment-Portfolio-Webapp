import Link from "next/link";
import { AlertCircle } from "lucide-react";
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
  ["85-100", "Excellent", "Strong Buy"],
  ["70-84", "Good", "Buy"],
  ["50-69", "Neutral", "Hold"],
  ["35-49", "Weak", "Watch"],
  ["20-34", "Poor", "Reduce"],
  ["Below 20", "Significant Concerns", "Sell"],
  ["Missing", "Insufficient Data", "Insufficient Data"]
];

const instrumentPanels = [
  {
    title: "Stocks",
    rows: [
      ["Fundamentals", "30%"],
      ["Fundamental trends", "20%"],
      ["Valuation", "10%"],
      ["Market Vision alignment", "10%"],
      ["Theme alignment", "10%"],
      ["Risk analytics", "10%"],
      ["Portfolio fit", "5%"],
      ["Momentum", "5%"]
    ]
  },
  {
    title: "ETFs",
    rows: [
      ["Allocation fit", "25%"],
      ["Diversification benefit", "20%"],
      ["Risk analytics", "15%"],
      ["Macro fit", "10%"],
      ["Momentum", "10%"],
      ["Benchmark relative", "10%"],
      ["Market Vision alignment", "5%"],
      ["Theme fit", "5%"]
    ]
  },
  {
    title: "Bond ETFs",
    rows: [
      ["Duration fit", "20%"],
      ["Rate regime", "20%"],
      ["Inflation regime", "15%"],
      ["Yield curve", "12%"],
      ["Credit risk", "10%"],
      ["Portfolio stability", "10%"],
      ["Diversification", "8%"],
      ["Market Vision alignment", "5%"]
    ],
    note: "Duration fit scores are ultra-short/short = 72, intermediate = 62, and long = 48. Rate and inflation regimes can further affect the bond ETF score through deterministic macro rules."
  },
  {
    title: "Gold ETFs",
    rows: [
      ["Inflation hedge", "25%"],
      ["Geopolitical hedge", "20%"],
      ["Diversification", "20%"],
      ["Portfolio fit", "10%"],
      ["Momentum", "10%"],
      ["Rates context", "10%"],
      ["Market Vision alignment", "5%"]
    ]
  },
  {
    title: "Crypto",
    rows: [
      ["Risk", "30%"],
      ["Portfolio concentration", "25%"],
      ["Momentum", "15%"],
      ["Liquidity regime", "15%"],
      ["Theme score", "5%"],
      ["Macro risk appetite", "7%"],
      ["Market Vision alignment", "3%"]
    ],
    note: "Crypto scores weight risk and concentration heavily to reflect the elevated volatility profile of digital assets."
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

const confidenceRows = [
  ["Fundamentals", "Available data points divided by 16 defined inputs, clamped to 0-100."],
  ["Trend scores", "3-4 observations produce 62%; 5+ observations produce 82%; volatile direction subtracts 18."],
  ["Risk metrics", "30 days = 40%, 60 days = 55%, 120 days = 70%, 252+ days = 90%."],
  ["Characteristics Score", "Composite of available component ratio, score dispersion, strategic agreement, and signal conflict; strong/weak conflict subtracts 8."]
];

const guardrailRows = [
  ["Low confidence cap", "Confidence below 50", "Insufficient Data"],
  ["Weak fundamentals cap", "Fundamentals score below 35", "Capped at Weak"],
  ["Poor valuation cap", "Valuation below 25 and fundamentals below 70 or missing", "Capped at Weak"],
  ["Quality valuation cap", "Valuation below 25 and fundamentals at least 70", "Capped at Neutral"],
  ["Excessive instrument risk cap", "Instrument risk score above 75", "Capped at Weak unless already Poor or Significant Concerns"],
  ["Portfolio concentration cap", "Direct holding concentration above 25%", "Capped at Neutral"],
  ["Duplicate exposure cap", "Duplicate direct holding or exposure detected by portfolio-fit logic", "Capped at Neutral"],
  ["Crypto allocation cap", "Crypto portfolio concentration above 5%", "Capped at Weak"],
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
                    The engine maps internal score labels to user-facing analytical assessment labels. Internal label names are implementation terminology only; the displayed assessment labels do not mean buy, sell, hold, reduce, or any other trade instruction.
                  </Paragraph>
                  <MethodologyTable columns={["Score range", "Displayed assessment label", "Internal engine label"]} rows={assessmentRows} />
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
                  <MethodologyTable columns={["Component", "Weight"]} rows={fundamentalRows} />
                  <Paragraph>
                    Growth inputs include revenue growth, EPS growth, net income growth, and free cash flow growth. Profitability inputs include gross margin, operating margin, net margin, ROE, ROIC, and ROA. Valuation inputs include P/E, forward P/E, price/sales, price/book, EV/EBITDA, and free cash flow yield.
                  </Paragraph>
                  <Paragraph>
                    Lower valuation multiples score higher, while higher free cash flow yield scores higher. For large-cap quality-growth companies with market capitalization at least $50B in technology, communication, semiconductor, software, internet, healthcare, biotechnology, or pharmaceutical sectors, a quality valuation tolerance may add 12-22 points plus a possible 4-point growth bonus, capped at 55.
                  </Paragraph>
                  <Paragraph>
                    Fundamentals confidence is calculated from 16 defined data points and clamped to 0-100.
                  </Paragraph>
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
                  <Paragraph>
                    Higher confidence means more complete underlying data. It does not represent expected return, probability of outperformance, or suitability.
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
                    Daily portfolio returns are calculated as current value less external cash flow, divided by previous value, minus one. This TWR-style adjustment avoids treating deposits as gains or withdrawals as drawdowns.
                  </Paragraph>
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
                    Market Vision alignment uses weekly macro and market-context text as scoring input. Its component weight is 10% for stocks, 5% for ETFs, bond ETFs, and gold ETFs, and 3% for crypto.
                  </Paragraph>
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
