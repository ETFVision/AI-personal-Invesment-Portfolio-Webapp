import type { AllocationItem } from "@/domain/portfolio/types";
import type { Instrument } from "@/domain/universe/types";
import { BondProfileService } from "./BondProfileService";
import { CreditExposureService } from "./CreditExposureService";
import { DurationAnalysisService } from "./DurationAnalysisService";
import type { BondAnalyticsInput, BondAnalyticsReport, BondHoldingExposure, BondRoleSummary } from "./BondTypes";

function symbolKey(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

function allocationItems(entries: Map<string, number>, denominator: number): AllocationItem[] {
  return Array.from(entries.entries())
    .map(([label, value]) => ({
      label,
      value,
      percent: denominator === 0 ? 0 : value / denominator
    }))
    .sort((a, b) => b.value - a.value);
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export class BondAnalyticsService {
  constructor(
    private readonly bondProfileService = new BondProfileService(),
    private readonly durationAnalysisService = new DurationAnalysisService(),
    private readonly creditExposureService = new CreditExposureService()
  ) {}

  calculateBondAnalytics(input: BondAnalyticsInput): BondAnalyticsReport {
    const instrumentBySymbol = new Map(input.instruments.map((instrument) => [symbolKey(instrument.symbol), instrument]));
    const profileByInstrumentId = new Map(input.bondProfiles.map((profile) => [profile.instrumentId, profile]));
    const profileBySymbol = new Map(input.bondProfiles.map((profile) => [symbolKey(profile.symbol), profile]));

    const bondHoldings = input.holdingValuations.flatMap((valuation): BondHoldingExposure[] => {
      const symbol = symbolKey(valuation.holding.ticker);
      const existingInstrument = instrumentBySymbol.get(symbol);
      if (!existingInstrument && valuation.holding.assetType !== "bond_etf") return [];
      const instrument = existingInstrument ?? this.syntheticInstrumentFromHolding(valuation.holding.assetId, symbol, valuation.holding.assetName, valuation.holding.costCurrency);
      const profile = profileByInstrumentId.get(instrument.id) ?? profileBySymbol.get(symbol) ?? null;
      const normalizedProfile = this.bondProfileService.normalizeProfile(instrument, profile);
      if (!normalizedProfile) return [];

      return [{
        holdingId: valuation.holding.id,
        symbol,
        name: valuation.holding.assetName,
        value: valuation.value,
        allocationPercent: input.totalPortfolioValue === 0 ? 0 : valuation.value / input.totalPortfolioValue,
        bondAllocationPercent: 0,
        durationCategory: normalizedProfile.durationCategory,
        bondType: normalizedProfile.bondType,
        creditQuality: normalizedProfile.creditQuality,
        geography: normalizedProfile.geography,
        currency: normalizedProfile.currency,
        inflationLinked: normalizedProfile.inflationLinked,
        rateSensitivity: normalizedProfile.rateSensitivity,
        inflationSensitivity: normalizedProfile.inflationSensitivity,
        recessionSensitivity: normalizedProfile.recessionSensitivity,
        liquidityRole: normalizedProfile.liquidityRole
      }];
    });

    const totalBondValue = bondHoldings.reduce((sum, holding) => sum + holding.value, 0);
    const bondHoldingsWithPercents = bondHoldings
      .map((holding) => ({
        ...holding,
        bondAllocationPercent: totalBondValue === 0 ? 0 : holding.value / totalBondValue
      }))
      .sort((a, b) => b.value - a.value);

    const byGeography = new Map<string, number>();
    const byCurrency = new Map<string, number>();
    for (const holding of bondHoldingsWithPercents) {
      byGeography.set(holding.geography, (byGeography.get(holding.geography) ?? 0) + holding.value);
      byCurrency.set(holding.currency, (byCurrency.get(holding.currency) ?? 0) + holding.value);
    }

    const treasuryExposure = this.exposureByPredicate(bondHoldingsWithPercents, input.totalPortfolioValue, (holding) => holding.bondType === "treasury" || holding.bondType === "inflation-linked");
    const corporateExposure = this.exposureByPredicate(bondHoldingsWithPercents, input.totalPortfolioValue, (holding) => holding.bondType === "corporate" || holding.bondType === "high yield");
    const investmentGradeExposure = this.exposureByPredicate(
      bondHoldingsWithPercents,
      input.totalPortfolioValue,
      (holding) => holding.creditQuality === "investment grade" || holding.creditQuality === "mixed investment grade" || holding.creditQuality === "government"
    );
    const highYieldExposure = this.creditExposureService.calculateHighYieldExposure(bondHoldingsWithPercents, input.totalPortfolioValue);
    const inflationLinkedExposure = this.exposureByPredicate(bondHoldingsWithPercents, input.totalPortfolioValue, (holding) => holding.inflationLinked);
    const cashLikeExposure = this.durationAnalysisService.calculateCashLikeExposure(bondHoldingsWithPercents, input.totalPortfolioValue);
    const longDurationExposure = this.durationAnalysisService.calculateLongDurationExposure(bondHoldingsWithPercents, input.totalPortfolioValue);
    const recessionHedgeExposure = this.exposureByPredicate(bondHoldingsWithPercents, input.totalPortfolioValue, (holding) => holding.recessionSensitivity === "positive");
    const creditRiskExposure = this.creditExposureService.calculateCreditRiskExposure(bondHoldingsWithPercents, input.totalPortfolioValue);

    return {
      totalPortfolioValue: input.totalPortfolioValue,
      totalBondValue,
      totalBondAllocation: input.totalPortfolioValue === 0 ? 0 : totalBondValue / input.totalPortfolioValue,
      bondHoldings: bondHoldingsWithPercents,
      byDuration: this.durationAnalysisService.calculateDurationBreakdown(bondHoldingsWithPercents, totalBondValue),
      byBondType: this.creditExposureService.calculateBondTypeBreakdown(bondHoldingsWithPercents, totalBondValue),
      byCreditQuality: this.creditExposureService.calculateCreditBreakdown(bondHoldingsWithPercents, totalBondValue),
      byGeography: allocationItems(byGeography, totalBondValue),
      byCurrency: allocationItems(byCurrency, totalBondValue),
      treasuryExposure,
      corporateExposure,
      investmentGradeExposure,
      highYieldExposure,
      inflationLinkedExposure,
      cashLikeExposure,
      longDurationExposure,
      recessionHedgeExposure,
      creditRiskExposure,
      roleSummary: this.buildRoleSummary({
        totalBondAllocation: input.totalPortfolioValue === 0 ? 0 : totalBondValue / input.totalPortfolioValue,
        cashLikeExposure,
        recessionHedgeExposure,
        inflationLinkedExposure,
        corporateExposure,
        highYieldExposure
      }),
      warnings: this.buildWarnings({ longDurationExposure, highYieldExposure, creditRiskExposure, totalBondValue }),
      profileCoverage: bondHoldingsWithPercents.length === 0 ? 1 : bondHoldingsWithPercents.filter((holding) => holding.durationCategory !== "intermediate" || holding.bondType !== "aggregate").length / bondHoldingsWithPercents.length
    };
  }

  private exposureByPredicate(holdings: BondHoldingExposure[], totalPortfolioValue: number, predicate: (holding: BondHoldingExposure) => boolean) {
    const value = holdings.filter(predicate).reduce((sum, holding) => sum + holding.value, 0);
    return totalPortfolioValue === 0 ? 0 : value / totalPortfolioValue;
  }

  private buildRoleSummary(input: {
    totalBondAllocation: number;
    cashLikeExposure: number;
    recessionHedgeExposure: number;
    inflationLinkedExposure: number;
    corporateExposure: number;
    highYieldExposure: number;
  }): BondRoleSummary {
    return {
      stability: input.totalBondAllocation === 0
        ? "No bond ETF stability sleeve is currently visible."
        : `${percent(input.totalBondAllocation)} of the portfolio is in bond ETFs, with ${percent(input.cashLikeExposure)} in cash-like duration.`,
      income: input.corporateExposure + input.highYieldExposure > 0
        ? `${percent(input.corporateExposure + input.highYieldExposure)} is exposed to corporate credit income risk.`
        : "Income exposure is mostly government or aggregate bond based.",
      recessionHedge: input.recessionHedgeExposure > 0
        ? `${percent(input.recessionHedgeExposure)} is classified as positive recession-hedge exposure.`
        : "No explicit treasury recession hedge is currently visible.",
      inflationHedge: input.inflationLinkedExposure > 0
        ? `${percent(input.inflationLinkedExposure)} is inflation-linked bond exposure.`
        : "No explicit TIPS or inflation-linked bond ETF exposure is visible."
    };
  }

  private buildWarnings(input: {
    longDurationExposure: number;
    highYieldExposure: number;
    creditRiskExposure: number;
    totalBondValue: number;
  }) {
    const warnings: string[] = [];
    if (input.totalBondValue === 0) return warnings;
    if (input.longDurationExposure > 0.2) {
      warnings.push("Long-duration bond exposure is above 20% of the portfolio, so rate sensitivity may be meaningful.");
    }
    if (input.highYieldExposure > 0.1) {
      warnings.push("High-yield bond exposure is above 10% of the portfolio and may behave more like credit risk than a recession hedge.");
    }
    if (input.creditRiskExposure > 0.25) {
      warnings.push("Corporate credit exposure is above 25% of the portfolio; spread widening could reduce bond stability in stress periods.");
    }
    return warnings;
  }

  private syntheticInstrumentFromHolding(id: string, symbol: string, name: string, currency: string): Instrument {
    return {
      id,
      symbol,
      name,
      assetClass: "bond_etf",
      instrumentType: "etf",
      sector: null,
      industry: null,
      canonicalSector: "Bonds / Fixed Income",
      canonicalThemes: [],
      taxonomyIsManualOverride: false,
      taxonomyReviewStatus: "mapped",
      geography: "US",
      currency,
      exchange: null,
      watchlistTier: null,
      benchmarkTags: [],
      thematicTags: [],
      riskCategory: "fixed_income",
      volatilityBucket: null,
      durationCategory: null,
      treasuryClassification: null,
      inflationLinked: null,
      creditQuality: null,
      geoExposure: null,
      rateSensitivity: null,
      inflationSensitivity: null,
      recessionSensitivity: null,
      liquidityRole: null,
      cryptoClassification: null,
      metadataLastRefreshedAt: null,
      providerPrimary: null,
      providerMetadata: {},
      sourceType: "manual",
      isActive: true
    };
  }
}
