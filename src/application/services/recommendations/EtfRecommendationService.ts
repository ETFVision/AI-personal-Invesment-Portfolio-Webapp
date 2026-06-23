import { buildEvaluation, scoreMacroFit, scoreMarketVisionAlignment, scoreMomentum, scoreRisk, scoreThemeFit, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";
import type { EtfCategory } from "@/domain/universe/alphaUniverse";
import type { Instrument } from "@/domain/universe/types";

const BENCHMARK_RELATIVE_SCALE = 100;
const BENCHMARK_EXCESS_RETURN_LIMIT = 0.50;

const SP500_ETF_CATEGORIES = new Set<EtfCategory>([
  "US_BROAD_MARKET",
  "TECHNOLOGY",
  "SEMICONDUCTOR",
  "AI_ROBOTICS",
  "CYBERSECURITY",
  "CLOUD_COMPUTING",
  "HEALTHCARE",
  "FINANCIALS",
  "INDUSTRIALS",
  "CONSUMER_DISCRETIONARY",
  "CONSUMER_STAPLES",
  "ENERGY",
  "MATERIALS",
  "UTILITIES",
  "COMMUNICATION_SERVICES",
  "REAL_ESTATE",
  "DIVIDEND",
  "GROWTH",
  "VALUE",
  "SMALL_CAP",
  "FACTOR_INVESTING",
  "OPTION_INCOME",
  "MID_CAP",
  "ESG_SOCIALLY_RESPONSIBLE",
  "INFRASTRUCTURE",
  "AEROSPACE_DEFENSE",
  "CLEAN_ENERGY"
]);

const DEVELOPED_COUNTRY_ETFS = new Set(["EWJ", "DXJ", "JPXN", "EWU", "EWC", "EWG"]);
const EMERGING_COUNTRY_ETFS = new Set(["MCHI", "FXI", "KWEB", "INDA", "INDY", "EWZ", "EWY", "EWT"]);

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizedSymbol(instrument: Instrument) {
  return instrument.symbol?.trim().toUpperCase() ?? "";
}

export function benchmarkKeyForEtf(instrument: Instrument): string | null {
  const category = instrument.etfCategory as EtfCategory | null | undefined;
  if (!category) return null;
  if (SP500_ETF_CATEGORIES.has(category)) return "sp500";
  if (category === "GLOBAL_EQUITY") return "global_equities";
  if (category === "DEVELOPED_MARKETS" || category === "INTERNATIONAL_DIVIDEND") return "developed_ex_us";
  if (category === "EMERGING_MARKETS") return "emerging_markets";
  if (category === "COUNTRY") {
    const symbol = normalizedSymbol(instrument);
    if (DEVELOPED_COUNTRY_ETFS.has(symbol)) return "developed_ex_us";
    if (EMERGING_COUNTRY_ETFS.has(symbol)) return "emerging_markets";
    return null;
  }
  if (category === "MULTI_ASSET_BALANCED") return "global_equities";
  if (
    category === "BOND" ||
    category === "CASH_EQUIVALENT" ||
    category === "PREFERRED_STOCK" ||
    category === "MUNICIPAL_BOND" ||
    category === "EMERGING_MARKET_BOND"
  ) return "us_aggregate_bonds";
  if (category === "GOLD_PRECIOUS_METALS" || category === "COMMODITY") return "gold";
  if (category === "CRYPTO_ETF") return "bitcoin";
  return null;
}

export function scoreBenchmarkRelative(etfOneYearReturn: number | null | undefined, benchmarkOneYearReturn: number | null | undefined) {
  if (etfOneYearReturn == null || benchmarkOneYearReturn == null) return null;
  const excessReturn = Math.max(-BENCHMARK_EXCESS_RETURN_LIMIT, Math.min(BENCHMARK_EXCESS_RETURN_LIMIT, etfOneYearReturn - benchmarkOneYearReturn));
  return clamp(50 + excessReturn * BENCHMARK_RELATIVE_SCALE);
}

export class EtfRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const benchmarkRelative = scoreBenchmarkRelative(input.marketMetric?.oneYearReturn, input.benchmarkRelative?.benchmarkReturn1y);
    const components: ScoreComponent[] = [
      { key: "risk_analytics", label: "Risk Analytics", score: scoreRisk(input.riskMetric), weight: 0.30, reason: "ETF risk is controlled" },
      { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.20, reason: "Positive ETF momentum" },
      { key: "macro_fit", label: "Macro Fit", score: scoreMacroFit(input.instrument, input.macroRegime), weight: 0.18, reason: "Macro context supports ETF exposure" },
      { key: "benchmark_relative", label: "Benchmark Relative", score: benchmarkRelative, weight: 0.18, reason: "Historical return profile is supportive" },
      { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMarketVisionAlignment(input), weight: 0.09, reason: "Market Vision supports ETF exposure" },
      { key: "theme_fit", label: "Theme Fit", score: scoreThemeFit(input.instrument), weight: 0.05, reason: "ETF theme exposure is useful" }
    ];
    return buildEvaluation(input, this.rules, components);
  }
}
