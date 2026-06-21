import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { MethodologyRelatedLinks } from "@/components/compliance/MethodologyRelatedLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { METHODOLOGY_LAST_UPDATED } from "./constants";

export const dynamic = "force-static";

function Formula({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: true, strict: false });
  return <div className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />;
}

function FormulaDetail({ plain, tex, note }: { plain: string; tex?: string; note?: string }) {
  return (
    <div className="space-y-2">
      <p>
        <span className="font-medium text-slate-900">In plain terms:</span> {plain}
      </p>
      {tex ? <Formula tex={tex} /> : null}
      {note ? <p className="text-xs leading-5 text-muted-foreground">{note}</p> : null}
    </div>
  );
}

const toc = [
  { href: "#overview", label: "Overview" },
  { href: "#how-scores-fit", label: "How scores work" },
  { href: "#characteristics-score", label: "Characteristics Score" },
  { href: "#fundamentals", label: "Fundamentals" },
  { href: "#confidence", label: "Confidence Metric" },
  { href: "#guardrails", label: "Guardrails" },
  { href: "#portfolio-score", label: "Portfolio Score" },
  { href: "#risk", label: "Risk Analytics" },
  { href: "#portfolio-balance-review", label: "Portfolio Balance Review" },
  { href: "#market-vision", label: "Market Vision" },
  { href: "#limitations", label: "Limitations" }
];

const assessmentRows = [
  ["80-100", "Excellent"],
  ["65-79", "Good"],
  ["48-64", "Neutral"],
  ["35-47", "Weak"],
  ["20-34", "Poor"],
  ["Below 20", "Significant Concerns"],
  ["Missing", "Insufficient Data"]
];

const glossaryRows = [
  ["Clamped", "Held within a fixed range; \"clamped to 0-100\" means never below 0 or above 100."],
  ["Denominator", "The components actually used in an average; missing inputs are left out, not counted as zero."],
  ["Drawdown", "The percentage drop from a prior peak."],
  ["Volatility", "How much returns fluctuate; higher means bigger swings."],
  ["Regime", "The prevailing macro environment, such as rates being \"restrictive,\" from FRED."],
  ["Look-through", "Seeing the holdings inside an ETF rather than treating it as one position."],
  ["Flow-adjusted (TWR)", "Returns adjusted for deposits and withdrawals so cash moves are not mistaken for gains or losses."],
  ["Winsorized", "Extreme values capped at a limit before scoring."],
  ["Coefficient of variation", "A consistency measure; lower means steadier."],
  ["Downside volatility", "Volatility from negative returns only."],
  ["Composite / weighted average", "Several scores combined, with some counting more than others."],
  ["Component / sub-score", "One ingredient of a bigger score."],
  ["Benchmark", "A yardstick to compare against, such as the S&P 500."],
  ["Valuation", "Whether a stock looks cheap or expensive for its financials."],
  ["Momentum", "Recent direction of price."],
  ["Allocation", "How money is split across asset types."],
  ["Concentration", "How much sits in one holding, company, or sector."],
  ["Diversification", "How widely spread across holdings, sectors, and regions."],
  ["Liquidity", "How easily something can be traded without moving its price."],
  ["Duration", "For bonds, how much price moves when rates change."],
  ["ROIC", "Return on invested capital."],
  ["Free cash flow", "Cash left after running and investing in the business."],
  ["Macro", "The big-picture economy: rates, inflation, and growth."],
  ["Yield curve", "How short- versus long-term rates compare."],
  ["Median", "The middle value; half above, half below."],
  ["Annualized", "Scaled to a one-year basis."],
  ["Percentage points", "The plain difference between two percentages."],
  ["Theme", "A long-running trend an investment is tied to, such as AI."]
];

const componentCalculationRows = [
  ["Weighted composite", <FormulaDetail key="weighted" plain="Available component scores are multiplied by their weights, added together, and divided by the weights that were actually available." tex="\\mathrm{score}=\\frac{\\sum_i s_i w_i}{\\sum_i w_i}" note="Missing or non-finite component scores are excluded from both numerator and denominator." />],
  ["Momentum", <FormulaDetail key="momentum" plain="Momentum starts at 50, then adds bounded YTD and daily-return effects." tex="\\mathrm{momentum}=\\operatorname{clamp}_{0}^{100}\\!\\left(50+\\operatorname{clamp}_{-15}^{15}(r_{YTD}\\times40)+\\operatorname{clamp}_{-5}^{5}(r_{daily}\\times80)\\right)" note="ETF 1-year return is excluded here because it is measured separately in Benchmark Relative." />],
  ["Risk analytics", <FormulaDetail key="risk-analytics" plain="The component starts from 100 and subtracts the measured instrument risk score, so lower measured risk gives a higher component score." tex="\\mathrm{risk\\ analytics}=100-\\mathrm{instrumentRiskScore}" />],
  ["Theme alignment / Theme fit / Theme score", <FormulaDetail key="theme" plain="Theme fit starts at 55, adds bounded points for themes and a single selected-positive-tag bonus, and subtracts for High Beta." tex="\\mathrm{theme}=\\operatorname{clamp}_{0}^{100}(55+\\min(20,5T)+5\\cdot\\mathbb{1}(A\\lor Q\\lor G)-5H)" note="T is theme count; A, Q, G, and H indicate AI / Automation, Quality, Global Diversification, and High Beta. The +5 applies once when any of A, Q, or G is present." />],
  ["Macro fit", <FormulaDetail key="macro-fit" plain="Macro fit starts at 55 and applies fixed asset-specific adjustments from the current macro regime." tex="\\mathrm{macroFit}=\\operatorname{clamp}_{0}^{100}(55+\\mathrm{regimeAdjustments})" note="Examples: gold can gain 20 in elevated/rising/sticky inflation or stress/tight liquidity; crypto loses 25 under stress/tight liquidity; long-duration bonds lose 20 in restrictive/rising/high rates; Treasuries gain 15 when growth is weak/slowing/recessionary; Technology loses 8 in restrictive rates; Consumer Staples gains 8 when growth is weak." />],
  ["Market Vision alignment", <FormulaDetail key="market-vision" plain="Market Vision alignment starts at 55, adds points for matching sector/theme/supportive language, and subtracts for risk language." tex="\\mathrm{alignment}=\\operatorname{clamp}_{0}^{100}(55+8S+8T+5U-5R+B)" note="S, T, U, and R indicate sector mention, theme mention, supportive/tailwind language, and risk/headwind/stress/caution language. B is the asset-specific macro term bonus for bonds (+3), gold (+5), or crypto (+3)." />],
  ["ETF benchmark relative", <FormulaDetail key="benchmark-relative" plain="Benchmark Relative compares an ETF's 1-year return with its external benchmark return and converts the excess return into a score." tex="\\mathrm{benchmarkRelative}=\\operatorname{clamp}_{0}^{100}\\!\\left(50+\\operatorname{clamp}_{-0.5}^{0.5}(r_{etf}-r_{bench})\\times100\\right)" note="US broad/sector/style ETFs use sp500; global equity uses global_equities; developed ex-US and International Dividend use developed_ex_us; emerging markets uses emerging_markets; curated developed single-country ETFs (EWJ, DXJ, JPXN, EWU, EWC) use developed_ex_us; curated emerging single-country ETFs (MCHI, FXI, KWEB, INDA, INDY) use emerging_markets; other single-country ETFs receive no Benchmark Relative component; bonds/cash equivalents use us_aggregate_bonds; commodity/gold uses gold; crypto ETFs use bitcoin." />],
  ["Bond duration fit", <FormulaDetail key="bond-duration" plain="Bond duration fit maps duration buckets to fixed scores." tex="\\mathrm{durationFit}=\\begin{cases}72&\\text{ultra\\text{-}short or short}\\\\62&\\text{intermediate}\\\\48&\\text{long}\\end{cases}" />],
  ["Bond rate regime", <FormulaDetail key="bond-rate" plain="Rate regime scoring uses fixed scores for long duration in difficult rate regimes and short duration in restrictive rates." tex="\\mathrm{rateRegime}=\\begin{cases}35&\\text{long duration in high/restrictive/rising rates}\\\\75&\\text{ultra\\text{-}short or short in restrictive rates}\\\\58&\\text{other available combinations}\\end{cases}" />],
  ["Bond inflation regime", <FormulaDetail key="bond-inflation" plain="Inflation-linked exposure scores higher in elevated or rising inflation; long duration scores lower under elevated inflation." tex="\\mathrm{inflationRegime}=\\begin{cases}78&\\text{inflation\\text{-}linked in elevated/rising inflation}\\\\42&\\text{long duration under elevated inflation}\\\\58&\\text{other available combinations}\\end{cases}" />],
  ["Bond credit risk", <FormulaDetail key="bond-credit" plain="Credit risk uses a lower fixed score for high-yield credit quality and a higher fixed score for other known credit quality." tex="\\mathrm{creditRisk}=\\begin{cases}40&\\text{high yield}\\\\65&\\text{other known credit quality}\\\\\\varnothing&\\text{missing}\\end{cases}" />],
  ["Bond portfolio stability", <FormulaDetail key="bond-stability" plain="Cash-like liquidity roles and Treasury classifications receive the higher stability score." tex="\\mathrm{stability}=\\begin{cases}75&\\text{cash\\text{-}like or Treasury}\\\\55&\\text{other bond profiles}\\end{cases}" />],
  ["Gold inflation hedge", <FormulaDetail key="gold-inflation" plain="Gold inflation hedge scoring is higher when inflation is elevated or rising." tex="\\mathrm{goldInflation}=\\begin{cases}78&\\text{elevated or rising inflation}\\\\55&\\text{other available inflation regimes}\\end{cases}" />],
  ["Gold geopolitical hedge", <FormulaDetail key="gold-geo" plain="Gold geopolitical hedge scoring is higher when liquidity conditions are stressed or tight." tex="\\mathrm{goldGeopolitical}=\\begin{cases}72&\\text{stress or tight liquidity}\\\\55&\\text{other available liquidity regimes}\\end{cases}" />],
  ["Crypto liquidity regime", <FormulaDetail key="crypto-liquidity" plain="Crypto liquidity regime scoring is lower in tight liquidity and neutral when macro regime data is available but not tight." tex="\\mathrm{cryptoLiquidity}=\\begin{cases}35&\\text{tight liquidity}\\\\58&\\text{macro regime available and not tight}\\\\\\varnothing&\\text{missing macro regime}\\end{cases}" />]
];

const instrumentPanels = [
  {
    title: "Stocks",
    rows: [
      ["Business Quality", "40%"],
      ["Valuation", "20%"],
      ["Fundamental Trends", "15%"],
      ["Risk Analytics", "10%"],
      ["Market Vision alignment", "7%"],
      ["Theme alignment", "5%"],
      ["Momentum", "3%"]
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

const businessQualityRows = [
  ["Growth", "25%"],
  ["Profitability", "25%"],
  ["Cash Flow", "20%"],
  ["Balance Sheet", "15%"],
  ["Quality", "15%"]
];

const fundamentalHelperRows = [
  ["Annual basis", <FormulaDetail key="annual-basis" plain="Stock fundamental sub-scores use the latest annual ratios and statements, not the latest quarter, so flow-sensitive metrics are measured on an annual basis." tex="\\mathrm{selectedInput}=\\mathrm{latestAnnualRow}" />],
  ["Positive percent metrics", <FormulaDetail key="positive-percent" plain="Positive-percent scoring maps weak negative growth low, neutral growth around the middle, and strong growth high." tex="\\mathrm{scorePositivePercent}=\\begin{cases}10&v\\le -0.10\\\\35+\\frac{v+0.10}{neutral+0.10}\\times15&v\\le neutral\\\\50+\\frac{v-neutral}{excellent-neutral}\\times50&v>neutral\\end{cases}" note="Defaults: neutral 5%, excellent 30%; final result is clamped to 0-100." />],
  ["Margin metrics", <FormulaDetail key="margin" plain="Margin metrics scale the value between weak and strong anchors, then clamp the score." tex="\\mathrm{scoreMargin}=\\operatorname{clamp}_{0}^{100}\\!\\left(\\frac{value-weak}{strong-weak}\\times70+25\\right)" />],
  ["Return metrics", <FormulaDetail key="return" plain="Return metrics scale the value between weak and strong anchors, then clamp the score." tex="\\mathrm{scoreReturn}=\\operatorname{clamp}_{0}^{100}\\!\\left(\\frac{value-weak}{strong-weak}\\times75+20\\right)" />],
  ["Lower-is-better metrics", <FormulaDetail key="lower-better" plain="For lower-is-better inputs, values near the excellent anchor score high and values near the poor anchor score low." tex="\\mathrm{scoreLowerBetter}=\\operatorname{clamp}_{0}^{100}\\!\\left(100-\\frac{value-excellent}{poor-excellent}\\times80\\right)" note="Null values are excluded; negative values are excluded unless the metric uses a negative excellent anchor, such as share-count shrinkage." />],
  ["Higher-is-better metrics", <FormulaDetail key="higher-better" plain="For higher-is-better inputs, values near the excellent anchor score high and values near the poor anchor score low." tex="\\mathrm{scoreHigherBetter}=\\operatorname{clamp}_{0}^{100}\\!\\left(\\frac{value-poor}{excellent-poor}\\times80+10\\right)" />]
];

const fundamentalCalculationRows = [
  ["Growth", <FormulaDetail key="growth" plain="Growth averages the available scored growth inputs." tex="\\mathrm{growth}=\\operatorname{avg}(revGrowth,epsGrowth,netIncomeGrowth,fcfGrowth)" note="Each input is first scored with scorePositivePercent." />],
  ["Profitability", <FormulaDetail key="profitability" plain="Profitability averages available margin and return-on-capital inputs." tex="\\mathrm{profitability}=\\operatorname{avg}(GM_{0.15,0.65},OM_{0.05,0.35},NM_{0.03,0.25},ROE_{0.03,0.25},ROIC_{0.03,0.25},ROA_{0.02,0.15})" />],
  ["Valuation", <FormulaDetail key="valuation" plain="Valuation averages lower-is-better valuation multiples and higher-is-better free-cash-flow yield." tex="\\mathrm{valuation}=\\operatorname{avg}(PE_{12,60},FPE_{12,55},PS_{2,20},PB_{1.5,15},EVEBITDA_{8,35},FCFY_{0,0.08})" />],
  ["Balance sheet", <FormulaDetail key="balance" plain="Balance sheet averages leverage, liquidity, and cash-to-debt inputs when available." tex="\\mathrm{balanceSheet}=\\operatorname{avg}(DE_{0.2,3},ND\\!/EBITDA_{0.5,5},CR_{0.7,2.5},QR_{0.5,2},CashDebt_{0.05,1})" />],
  ["Cash flow", <FormulaDetail key="cash-flow" plain="Cash flow compares operating cash flow and free cash flow with revenue scale, then adds margin and growth inputs." tex="\\mathrm{cashFlow}=\\operatorname{avg}(OCF_{0,0.25R},FCF_{0,0.20R},FCFMargin_{0,0.25},FCFGrowth_{0.03,0.25})" />],
  ["Quality", <FormulaDetail key="quality" plain="Quality is a weighted average of stability, cash conversion, ROIC durability, and capital discipline." tex="\\mathrm{quality}=0.30E+0.30C+0.25D+0.15K" note="ROIC durability scores 10 when average ROIC is below the 8% cost-of-capital proxy; otherwise it uses scoreLowerBetter(coefficientOfVariation(roicSeries), 0.15, 0.60). Missing signals are excluded. For balance-sheet financials, cash conversion and ROIC durability are excluded from the denominator." />],
  ["Financial-sector handling", <FormulaDetail key="financial-sector" plain="Balance-sheet financials use adjusted inputs because bank, insurance, thrift, and mortgage-finance balance sheets differ from industrial companies." tex="\\mathrm{financialAdjusted}=\\mathbb{1}(sector=Financials\\ \\land\\ industry\\in\\{banks,capital\\ markets,insurance,thrifts,mortgage\\ finance\\})" note="Fee-based credit-services, payments, and asset-management firms keep standard industrial inputs. Financial scores do not currently include capital adequacy, reserve quality, or asset-quality measures." />],
  ["Quality valuation adjustment", <FormulaDetail key="quality-valuation" plain="Large-cap quality-growth companies can receive a bounded valuation adjustment when quality metrics are strong." tex="\\mathrm{adjustedValuation}=\\operatorname{clamp}_{28}^{55}(rawValuation+premium+growthBonus)" note="Applies only when market cap is at least $50B, eligible sector/industry text is present, quality composite is at least 70, and raw valuation is below 55. Premium is +22, +17, or +12 by quality band; growth score at least 70 adds +4." />]
];

const trendRows = [
  ["Observation windows", <FormulaDetail key="trend-window" plain="Short-term trend uses up to five quarterly observations; long-term trend uses up to five annual observations." tex="n_{short}\\le5,\\quad n_{long}\\le5" note="Annual-only metrics use not applicable for short-term direction." />],
  ["Direction inputs", <FormulaDetail key="trend-direction" plain="Trend direction compares early average, later average, latest value, prior value, direction changes, and volatility." tex="direction=f(\\bar{x}_{first},\\bar{x}_{second},x_{latest},x_{prior},changes,volatility)" note="Lower-is-better metrics invert the direction." />],
  ["Positive directions", <FormulaDetail key="positive-directions" plain="Positive trend labels map to fixed scores by strength." tex="score=\\begin{cases}90&\\text{accelerating/improving strong}\\\\74&\\text{accelerating/improving moderate}\\\\66&\\text{accelerating/improving weak}\\\\78&\\text{rebounding strong}\\\\68&\\text{rebounding other}\\\\56&\\text{stable}\\end{cases}" />],
  ["Negative directions", <FormulaDetail key="negative-directions" plain="Negative or volatile trend labels map to lower fixed scores by strength." tex="score=\\begin{cases}44&\\text{decelerating strong}\\\\50&\\text{decelerating other}\\\\18&\\text{deteriorating strong}\\\\34&\\text{deteriorating moderate}\\\\42&\\text{deteriorating weak}\\\\32&\\text{volatile strong}\\\\44&\\text{volatile other}\\end{cases}" />],
  ["Trend confidence", <FormulaDetail key="trend-confidence" plain="Trend confidence rises with observation count and is reduced for volatility or non-finite values." tex="confidence=base(n)-18\\mathbb{1}_{volatile}-20\\mathbb{1}_{nonfinite}" note="Base confidence: fewer than 3 observations = 20; 3-4 observations = 62; 5+ observations = 82." />],
  ["Per-metric score", <FormulaDetail key="per-metric-trend" plain="Each metric combines short-term and long-term trend scores using confidence-scaled weights." tex="overallTrendScore=\\operatorname{weightedAvg}(shortScore,longScore),\\quad w_{short}=0.4c,\\quad w_{long}=0.6c" />],
  ["Summary trend score", <FormulaDetail key="summary-trend" plain="Category trend scores are confidence-weighted and then combined with fixed category weights." tex="summary=0.35G+0.25M+0.20P+0.10B+0.10Q" />]
];

const confidenceRows = [
  ["Fundamentals", "Available data points divided by 16 defined inputs, clamped to 0-100."],
  ["Trend scores", "3-4 observations produce 62%; 5+ observations produce 82%; volatile direction subtracts 18."],
  ["Risk metrics", "30 days = 40%, 60 days = 55%, 120 days = 70%, 252+ days = 90%."],
  ["Characteristics Score", "Composite of available component ratio, score dispersion, strategic agreement, and signal conflict; strong/weak conflict subtracts 8."]
];

const characteristicsConfidenceRows = [
  ["Available ratio", <FormulaDetail key="available-ratio" plain="The available ratio is the share of configured component weight that has usable data." tex="ratio=\\frac{availableComponentWeight}{totalConfiguredComponentWeight}" />],
  ["Base confidence", <FormulaDetail key="base-confidence" plain="Most instruments start from base confidence 72; crypto starts from 62 because crypto classifications are intentionally conservative." tex="base=\\begin{cases}62&\\text{crypto}\\\\72&\\text{otherwise}\\end{cases}" />],
  ["Completeness bonus", <FormulaDetail key="completeness" plain="The completeness bonus rewards near-complete component coverage." tex="bonus=\\begin{cases}8&ratio\\ge0.95\\\\4&ratio\\ge0.80\\\\0&\\text{otherwise}\\end{cases}" />],
  ["Agreement bonus", <FormulaDetail key="agreement" plain="Agreement bonus adds points when component-score dispersion is positive but low." tex="agreement=\\begin{cases}5&0<dispersion<12\\\\0&\\text{otherwise}\\end{cases}" />],
  ["Strategic agreement bonus", <FormulaDetail key="strategic" plain="Strategic agreement adds points when fundamentals, Market Vision alignment, and theme alignment are all strong." tex="strategic=5\\cdot\\mathbb{1}(fundamentals\\ge70\\land marketVision\\ge70\\land theme\\ge70)" />],
  ["Conflict penalty", <FormulaDetail key="conflict" plain="Conflict penalty subtracts points when strong and weak components coexist." tex="conflict=8\\cdot\\mathbb{1}(\\max(component)\\ge70\\land\\min(component)<45)" />],
  ["Dispersion penalty", <FormulaDetail key="dispersion" plain="Dispersion penalty grows with score spread but is capped at 12." tex="dispersionPenalty=\\min(12,dispersion\\times0.25)" />],
  ["Final formula", <FormulaDetail key="confidence-final" plain="Final confidence starts from base confidence scaled by available data, adds bonuses, subtracts penalties, and clamps to 0-100." tex="confidence=\\operatorname{clamp}_{0}^{100}\\!\\left(base\\cdot ratio+completeness+agreement+strategic-conflict-dispersionPenalty\\right)" />]
];

const guardrailRows = [
  ["Low confidence cap", "Confidence below 50", "Insufficient Data"],
  ["Weak business quality cap", "Business Quality score below 35 (stocks)", "Capped at Weak"],
  ["Severely stretched valuation cap", "Valuation score below 15 (stocks)", "Capped at Neutral"],
  ["Excessive instrument risk cap", "Instrument risk score above 75", "Capped at Neutral for Strong or Exceptional Business Quality; otherwise capped at Weak unless already Poor or Significant Concerns"],
  ["Bond duration and rate regime mismatch cap", "Long-duration bond profile in restrictive, rising, or high-rate regime", "Capped at Neutral"],
  ["Portfolio concentration cap", "Portfolio-level concentration threshold", "Portfolio Review only; not applied to per-instrument Characteristics Score"],
  ["Duplicate exposure cap", "Duplicate exposure detected from holdings or look-through data", "Portfolio Review only; not applied to per-instrument Characteristics Score"],
  ["Crypto allocation cap", "Portfolio-level crypto allocation threshold", "Portfolio Review only; not applied to per-instrument Characteristics Score"]
];

const portfolioRows = [
  ["Allocation", "15%", "Cash, equity, fixed income, gold and crypto balance"],
  ["Concentration", "15%", "Underlying-company top holding, top-five issuer exposure, and sector concentration"],
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
  ["Concentration", "Uses underlying-company issuer exposure on a total-value basis. Direct single-stock holdings are included; diversified ETF wrappers remain visible as direct positions but do not trigger single-company concentration findings."],
  ["Diversification", "Uses meaningful direct holding count, asset-class count, sector count, currency count, and average correlation. Concentration is measured in the Concentration section; Diversification measures breadth and correlation as a separate dimension."],
  ["Risk", "Uses portfolio volatility, current drawdown, max drawdown, and risk contribution diagnostics from flow-adjusted return data."],
  ["Macro Fit", "Compares portfolio posture against FRED rates, inflation, growth, liquidity regimes and the latest Market Vision risk context."],
  ["Insight Alignment", "Compares current holdings with the Characteristics Score engine output and measures coverage of scored instruments."],
  ["Fixed Income", "Uses total bond allocation, duration exposure, high-yield exposure, treasury/corporate mix, recession hedge exposure, and bond profile coverage."],
  ["Theme Exposure", "Uses ETF look-through theme exposure and current news/macro theme intelligence where available."],
  ["Geography", "Uses ETF country look-through or direct geography fallback. It is displayed as a diagnostic and currently carries 0% portfolio-score weight."]
];

const portfolioFormulaRows = [
  ["Allocation", <FormulaDetail key="allocation" plain="Allocation starts at 82 and subtracts points for excess equity, insufficient bonds, high cash, and material crypto exposure." tex="82-80\\max(0,w_{eq}-0.85)-90\\max(0,0.08-w_{bond})-55\\max(0,w_{cash}-0.35)-90\\max(0,w_{crypto}-0.10)" />],
  ["Concentration", <FormulaDetail key="concentration" plain="Concentration starts at 90 and subtracts points for large top issuer, top-five issuer, and sector weights." tex="90-150\\max(0,w_{topIssuer}-0.10)-80\\max(0,w_{top5}-0.40)-60\\max(0,w_{topSector}-0.40)" note="Measured at the underlying-company issuer look-through level on a total-value basis." />],
  ["Diversification", <FormulaDetail key="diversification" plain="Diversification starts from Risk Analytics diversification and adds a small capped benefit for broader sector and country look-through." tex="diversification= riskDiversification + \\min(8, sectorCount+countryCount)" />],
  ["Risk", <FormulaDetail key="portfolio-risk" plain="Portfolio risk starts at 88 and subtracts points for volatility, max drawdown, and current drawdown above thresholds." tex="88-120\\max(0,volatility-0.18)-100\\max(0,|maxDrawdown|-0.15)-70\\max(0,|currentDrawdown|-0.08)" />],
  ["Macro Fit", <FormulaDetail key="portfolio-macro" plain="Macro Fit starts at 72 and applies fixed adjustments for restrictive rates, weak growth, and elevated inflation with gold exposure." tex="72-8R-10G+5I" note="R applies when rates are restrictive and equity allocation is above 75%; G applies when growth is weak and equity allocation is above 70%; I applies when inflation is elevated and the portfolio has gold exposure." />],
  ["Insight Alignment", <FormulaDetail key="insight" plain="Insight Alignment starts at 60, adds for constructive held instruments, subtracts for weak held instruments, and adds coverage." tex="\\min(94,60+4C-8W+12V)" note="The 94 cap applies when the section has any incomplete-coverage or weak-holding finding." />],
  ["Fixed Income", <FormulaDetail key="fixed-income" plain="Fixed Income starts at 78 and adjusts for bond sleeve size, long duration, high yield, and recession-hedge exposure." tex="78-120\\max(0,0.08-w_{bond})-60\\max(0,w_{longDuration}-0.35)-80\\max(0,w_{highYield}-0.20)+\\min(8,w_{recessionHedge}\\times10)" />],
  ["Theme Exposure", <FormulaDetail key="theme-exposure" plain="Theme Exposure starts at 64, adds for aligned themes, and subtracts for a very large largest sector weight." tex="64+\\min(15,alignedThemeCount\\times4)-50\\max(0,w_{largestSector}-0.45)" />],
  ["Geography", <FormulaDetail key="geography" plain="Geography subtracts for high US weight or low international weight, but currently carries 0% overall weight." tex="86-80\\max(0,w_{US}-0.70)-120\\max(0,0.12-w_{international})" note="This is diagnostic only and currently has 0% overall weight." />]
];

const portfolioPlainEnglishRows = [
  ["Allocation", "Starts at 82 and is reduced by excess equity concentration, insufficient bond ballast, high cash, or material crypto exposure."],
  ["Concentration", "Starts at 90 and is reduced by large single-company issuer exposure, high top-five issuer concentration, or dominant sector exposure."],
  ["Diversification", "Builds from the risk analytics diversification score, which measures breadth and correlation, and adds points for broader sector and country coverage from ETF look-through. Concentration is measured separately in the Concentration section."],
  ["Risk", "Starts at 88 and is reduced by high volatility, large drawdowns, or deep current drawdowns."],
  ["Macro Fit", "Starts at 72 and adjusts based on whether the portfolio posture is appropriate for current rate, growth, and inflation regimes."],
  ["Insight Alignment", "Starts at 60 and increases when current holdings score well in the Characteristics Score engine, and decreases when holdings score poorly."],
  ["Fixed Income", "Starts at 78 and adjusts for bond sleeve size, long-duration exposure, high-yield exposure, and recession-hedge coverage."],
  ["Theme Exposure", "Starts at 64 and increases for theme alignment, and decreases for excessive single-sector concentration."],
  ["Geography", "Calculated as a diagnostic only - currently carries 0% weight in the composite score."]
];

const riskMetricRows = [
  ["Instrument daily return", <FormulaDetail key="daily-return" plain="Daily return compares today's close with the previous close." tex="r_{daily}=\\frac{close_t}{close_{t-1}}-1" />],
  ["Instrument weekly return", <FormulaDetail key="weekly-return" plain="Weekly return compares today's close with the close five trading days earlier." tex="r_{weekly}=\\frac{close_t}{close_{t-5}}-1" />],
  ["Instrument annualized volatility", <FormulaDetail key="instrument-vol" plain="Annualized volatility scales daily return fluctuation to a one-year basis." tex="\\sigma_{annual}=\\operatorname{stdev}(r_{daily})\\times\\sqrt{252}" note="30D requires at least 10 observations, 90D at least 30, and 1Y at least 60." />],
  ["Instrument drawdown", <FormulaDetail key="instrument-drawdown" plain="Drawdown measures the percentage drop from the running peak." tex="drawdown=\\frac{close_t}{runningPeak_t}-1" note="Current drawdown is the latest drawdown. Max drawdown is the most negative drawdown in the analyzed history." />],
  ["Instrument risk score", <FormulaDetail key="instrument-risk-score" plain="Instrument risk blends volatility, drawdown, downside volatility, and negative-return frequency." tex="risk=0.35v+0.35d+0.20s+0.10f" note="v = bounded(1Y volatility / 0.60 x 100); d = bounded(abs(maxDrawdown) / 0.50 x 100); s = bounded(downsideVolatility / 0.45 x 100); f = negativeReturnFrequency x 100 or 50 when missing." />],
  ["Risk buckets", <FormulaDetail key="risk-buckets" plain="Risk buckets map risk score ranges to labels." tex="bucket=\\begin{cases}low&risk<25\\\\medium&risk<50\\\\high&risk<75\\\\very\\ high&risk\\ge75\\\\insufficient\\ data&risk=\\varnothing\\end{cases}" />],
  ["Portfolio period return", <FormulaDetail key="portfolio-period-return" plain="Portfolio period return removes deposits and withdrawals before measuring the portfolio's change." tex="periodReturn=\\frac{currentTotalValue-netExternalFlow}{previousTotalValue}-1" note="Deposits are positive external flows; withdrawals are negative external flows." />],
  ["Portfolio volatility", <FormulaDetail key="portfolio-vol" plain="Portfolio volatility annualizes flow-adjusted daily portfolio return fluctuation." tex="annualizedVolatility=\\operatorname{stdev}(r_{portfolio,daily})\\times\\sqrt{252}" />],
  ["Portfolio drawdown", <FormulaDetail key="portfolio-drawdown" plain="Portfolio drawdown chains flow-adjusted returns from 100, tracks the running peak, and measures drops from that peak." tex="level_t=100\\prod_{i=1}^{t}(1+r_i),\\quad drawdown_t=\\frac{level_t}{peak_t}-1" note="Max drawdown is the most negative point in the series." />],
  ["Covariance risk contribution", <FormulaDetail key="covariance" plain="When enough overlapping observations exist, covariance estimates each holding's share of portfolio volatility." tex="\\sigma_p^2=w^{\\mathsf{T}}\\Sigma w" note="Eligibility requires at least 30 overlapping observations and about 70% eligible portfolio-value coverage. Covariance is annualized by multiplying by 252." />],
  ["Proxy risk contribution", <FormulaDetail key="proxy-risk" plain="When covariance coverage is insufficient, proxy risk contribution weights allocations by fixed asset-type risk weights." tex="riskShare_i=w_i\\times proxyWeight_i,\\quad contribution_i=\\frac{riskShare_i}{\\sum_j riskShare_j}" note="Proxy weights are crypto 1.80, stock 1.25, gold ETF 1.05, bond ETF 0.55, other 1.00." />]
];

const macroRows = [
  ["Macro trend confidence", <FormulaDetail key="macro-confidence" plain="Macro trend confidence measures whether enough observations exist for the indicator frequency." tex="confidence=\\operatorname{clamp}_{0}^{100}\\!\\left(round\\left(\\frac{observationCount}{needed}\\times100\\right)\\right)" note="Needed observations: quarterly = 6, daily = 30, other = 12." />],
  ["Macro trend severity", <FormulaDetail key="macro-severity" plain="Macro trend severity uses fixed formulas by indicator type." tex="severity=\\begin{cases}\\min(100,|\\Delta_{1y}|\\times15)&\\text{inflation}\\\\\\min(100,|latest|\\times10)&\\text{rates/yields}\\\\\\min(100,\\max(0,latest-3.5)\\times25)&\\text{unemployment}\\\\\\min(100,|\\Delta_{1y}|\\times10)&\\text{other}\\end{cases}" />],
  ["Macro persistence", <FormulaDetail key="macro-persistence" plain="Macro persistence counts how many of the latest six observations are non-decreasing versus the prior observation." tex="persistenceScore=\\min(100,count\\times16)" />],
  ["FRED theme signals", <FormulaDetail key="fred-themes" plain="FRED theme signals copy or clamp macro trend severity, persistence, and confidence into mapped themes." tex="themeSignal=(theme,\\operatorname{clamp}(severity),\\operatorname{clamp}(persistence),\\operatorname{clamp}(confidence))" note="Themes include Rates, Inflation, Growth, Employment, Yield Curve, Currency, and Energy." />],
  ["Market Vision source text", <FormulaDetail key="mv-source" plain="Market Vision alignment scans the relevant report text sections for deterministic sector, theme, support, and risk language." tex="alignmentText=summary+assetClassViews+rates+inflation+growth+currency+geopolitical+opportunities+risks+portfolioImplications" />]
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
  rows: React.ReactNode[][];
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
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-slate-700">
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
                  <FormulaAccordion title="Key terms">
                    <MethodologyTable columns={["Term", "Plain-English meaning"]} rows={glossaryRows} />
                  </FormulaAccordion>
                </CardContent>
              </Card>
            </Section>

            <Section id="how-scores-fit" title="How ETFVision scores work">
              <Card>
                <CardHeader>
                  <CardTitle>How ETFVision scores work - in plain terms</CardTitle>
                  <CardDescription>Two report cards: one for each investment, and one for your whole portfolio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Think of it as two report cards. First, a report card for each investment: for any stock or fund we ask a few simple questions, such as whether the business is financially strong, whether the price is reasonable, how bumpy it has been, and whether it fits today&apos;s market. Those answers roll into one Characteristics Score with an easy label: Excellent, Good, Neutral, Weak, Poor, or Significant Concerns.
                  </Paragraph>
                  <Paragraph>
                    Second, a report card for your whole portfolio: we look at how your money is spread out, how concentrated it is, how risky it has been, and a few other angles, and roll those into a Portfolio Score. The two are linked: part of your portfolio&apos;s score reflects how well the individual investments you hold score on their own.
                  </Paragraph>
                  <Paragraph>
                    Everything is calculated by fixed rules from your data. No human opinion, market call, or stock tip is involved.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="characteristics-score" title="Characteristics Score">
              <Card>
                <CardHeader>
                  <CardTitle>Characteristics Score Methodology</CardTitle>
                  <CardDescription>
                    One overall score and label for a single investment.
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

            <Section id="fundamentals" title="Fundamentals">
              <Card>
                <CardHeader>
                  <CardTitle>Fundamentals</CardTitle>
                  <CardDescription>How financially strong and well-run a company is, from its reported financials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Business Quality is the stock fundamentals headline displayed in ETFVision. It combines growth, profitability, cash flow, balance-sheet strength, and earnings quality. Valuation remains a separate Characteristics component and is shown separately from Business Quality. These scores do not predict future performance.
                  </Paragraph>
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Business Quality Score</h3>
                    <Paragraph>
                      Business Quality is the 40% weighted component for stocks. It combines Growth (25%), Profitability (25%), Cash Flow (20%), Balance Sheet (15%), and Quality (15%). Valuation is measured separately as its own top-level Characteristics component.
                    </Paragraph>
                    <MethodologyTable columns={["Component", "Weight"]} rows={businessQualityRows} />
                    <Paragraph>
                      Note: &quot;Quality&quot; (the 15% sub-score measuring earnings stability, cash conversion, ROIC durability, and capital discipline) is one ingredient of &quot;Business Quality&quot; (the overall 40% stock component) - they are related but not the same.
                    </Paragraph>
                  </div>
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
                    Fundamentals confidence = clamp((availableInputs / 16) x 100). The availability count includes growth, profitability, valuation, balance-sheet, cash-flow, and quality-signal data points used by the scoring service.
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
                  <CardDescription>How much data we had to work with - not how likely something is to go up.</CardDescription>
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
                  <CardDescription>Safety checks that can lower a label even when the raw score looks high.</CardDescription>
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
                  <CardDescription>A report card for your whole portfolio, not just one holding.</CardDescription>
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
                  <CardDescription>How bumpy and loss-prone something has been in the past.</CardDescription>
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
                    Diversification Score = holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty.
                    Holding, asset-class, sector, and currency scores are capped components; correlation reduces the final score. Concentration is measured in the Concentration section; Diversification measures breadth and correlation as a separate dimension.
                  </div>
                </CardContent>
              </Card>
            </Section>

            <Section id="portfolio-balance-review" title="Portfolio Balance Review">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Balance Review</CardTitle>
                  <CardDescription>Categories where your portfolio looks light, shown for awareness only.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Portfolio Balance Review is the deterministic screener behind the Portfolio Review page&apos;s &quot;Portfolio Balance Review&quot; and &quot;Portfolio Balance Summary&quot; cards. It checks your portfolio&apos;s look-through exposure against a fixed set of category triggers - for example low fixed-income, low international exposure, sector/defensive concentration, low real-estate exposure, elevated crypto risk, single-issuer concentration, macro vulnerability, and low inflation hedge.
                  </Paragraph>
                  <Paragraph>
                    A finding appears only when a trigger&apos;s threshold is met. Where a finding lists example instruments, they appear only if the category is lightly represented, the instrument is in the active approved universe, and it has passed all guardrail filters. Every finding carries the disclaimer &quot;Analytical observation only - not a position sizing recommendation,&quot; and example instruments are labelled &quot;Shown because category is lightly represented - not a buy recommendation.&quot; These are mechanical screens, not suggestions to buy, sell, or hold.
                  </Paragraph>
                </CardContent>
              </Card>
            </Section>

            <Section id="market-vision" title="Market Vision">
              <Card>
                <CardHeader>
                  <CardTitle>Market Vision</CardTitle>
                  <CardDescription>A weekly read of the market backdrop, used as one small input - not a prediction.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Paragraph>
                    Market Vision alignment uses weekly macro and market-context text as scoring input. Its component weight is 7% for stocks, 9% for ETFs, 5% for bond ETFs, 7% for gold ETFs, and 4% for crypto.
                  </Paragraph>
                  <Paragraph>
                    Market Vision reports are generated weekly from macroeconomic (FRED) regime data and news and theme intelligence, and may be produced with AI assistance. They provide analytical context only - not a forecast, outlook, or CIO opinion.
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
                    <li>The Portfolio Score is bounded by its component construction and in practice tops out in the mid-80s rather than 100; a mid-80s score reflects a well-constructed portfolio, not an underperformance signal.</li>
                    <li>Business Quality is a quality-and-growth composite — it includes a 25% growth weight alongside profitability, cash flow, balance-sheet strength, and earnings quality — not a pure quality measure.</li>
                    <li>Sub-score thresholds are fixed absolute economic anchors, not sector-relative; capital-light and capital-intensive businesses are measured against the same anchors, so cross-sector comparisons should account for structural differences.</li>
                    <li>Bond, gold, and crypto component scores are regime-dependent (rates, inflation, liquidity) and shift as the macro regime changes, independent of the instrument.</li>
                    <li>Geography is computed for context and shown diagnostically but carries 0% weight in the composite score.</li>
                    <li>The Excellent band (80-100) is intentionally reserved for instruments with exceptional characteristics across components and is uncommon; most sound instruments fall in the Good or Neutral range.</li>
                    <li>Structurally low-margin business models may score lower on margin-based profitability inputs despite strong returns on capital; profitability should be read alongside the capital-efficiency signals.</li>
                    <li>ETF Benchmark Relative pairs US equity ETFs to the S&amp;P 500 and international developed / emerging-market ETFs to MSCI-family proxies (MSCI EAFE, MSCI EM). Funds tracking FTSE or S&amp;P index families — which classify markets such as South Korea differently — can legitimately diverge from these MSCI benchmarks over a given period; this reflects index construction, not a data issue.</li>
                    <li>Scoring anchors and label bands are fixed absolute thresholds, validated once against the universe as a sanity check and held constant across refreshes and market regimes; they are not refit to the current universe.</li>
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
