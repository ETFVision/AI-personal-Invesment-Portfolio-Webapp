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
      const profileCanBeEdited = Boolean(existingInstrument);
      const profile = profileByInstrumentId.get(instrument.id) ?? profileBySymbol.get(symbol) ?? null;
      const normalizedProfile = this.bondProfileService.normalizeProfile(instrument, profile);
      if (!normalizedProfile) return [];

      return [{
        instrumentId: instrument.id,
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
        liquidityRole: normalizedProfile.liquidityRole,
        secYield: normalizedProfile.secYield,
        distributionYield: normalizedProfile.distributionYield,
        yieldToMaturity: normalizedProfile.yieldToMaturity,
        yieldAsOfDate: normalizedProfile.yieldAsOfDate,
        effectiveDuration: normalizedProfile.effectiveDuration,
        averageMaturity: normalizedProfile.averageMaturity,
        spreadDuration: normalizedProfile.spreadDuration,
        optionAdjustedSpread: normalizedProfile.optionAdjustedSpread,
        expenseRatio: normalizedProfile.expenseRatio,
        estimatedRateShockDown1Pct: normalizedProfile.effectiveDuration == null ? null : normalizedProfile.effectiveDuration / 100,
        estimatedRateShockUp1Pct: normalizedProfile.effectiveDuration == null ? null : -normalizedProfile.effectiveDuration / 100,
        estimatedSpreadWidening1Pct: normalizedProfile.spreadDuration == null ? null : -normalizedProfile.spreadDuration / 100,
        isManualOverride: normalizedProfile.isManualOverride,
        profileCanBeEdited
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

    const treasuryExposure = this.exposureByPredicate(bondHoldingsWithPercents, input.totalPortfolioValue, (holding) => holding.bondType === "treasury" || holding.bondType === "inflation-linked" || holding.creditQuality === "government");
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
      diagnostics: this.buildDiagnostics({ cashLikeExposure, recessionHedgeExposure, inflationLinkedExposure, creditRiskExposure, longDurationExposure, totalBondValue }),
      allocationGuidance: this.buildAllocationGuidance({ totalBondAllocation: input.totalPortfolioValue === 0 ? 0 : totalBondValue / input.totalPortfolioValue, cashLikeExposure, recessionHedgeExposure, inflationLinkedExposure, highYieldExposure }),
      scenarioImpacts: this.buildScenarioImpacts(bondHoldingsWithPercents, totalBondValue, input.totalPortfolioValue),
      profileCoverage: bondHoldingsWithPercents.length === 0
        ? 1
        : bondHoldingsWithPercents.filter((holding) => holding.durationCategory && holding.bondType && holding.creditQuality).length / bondHoldingsWithPercents.length
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

  private buildDiagnostics(input: {
    cashLikeExposure: number;
    recessionHedgeExposure: number;
    inflationLinkedExposure: number;
    creditRiskExposure: number;
    longDurationExposure: number;
    totalBondValue: number;
  }) {
    if (input.totalBondValue === 0) return ["No bond ETF sleeve is currently available for diagnostics."];
    const diagnostics: string[] = [];
    diagnostics.push(input.cashLikeExposure > 0.15 ? "Bond sleeve has a meaningful cash-like stability component." : "Cash-like bond exposure is modest.");
    diagnostics.push(input.recessionHedgeExposure > 0.1 ? "Treasury exposure can support recession-hedging behavior." : "Recession hedge exposure is limited unless aggregate bonds dominate.");
    diagnostics.push(input.inflationLinkedExposure > 0 ? "Inflation-linked exposure is present through TIPS-like bonds." : "No explicit inflation-linked bond exposure is visible.");
    diagnostics.push(input.creditRiskExposure > 0.15 ? "Credit exposure is meaningful and may reduce defensive behavior in stress periods." : "Credit-risk exposure is limited.");
    diagnostics.push(input.longDurationExposure > 0.15 ? "Long duration can help in rate cuts but may be vulnerable if rates rise." : "Long-duration rate sensitivity is limited.");
    return diagnostics;
  }

  private buildAllocationGuidance(input: {
    totalBondAllocation: number;
    cashLikeExposure: number;
    recessionHedgeExposure: number;
    inflationLinkedExposure: number;
    highYieldExposure: number;
  }) {
    const guidance: string[] = [];
    if (input.totalBondAllocation === 0) {
      return ["No bond ETF allocation is currently visible; future allocation logic will treat this as no fixed-income sleeve."];
    }
    if (input.cashLikeExposure / input.totalBondAllocation > 0.6) {
      guidance.push("Bond sleeve is mostly cash-like; useful for liquidity but limited for long-term income or recession upside.");
    }
    if (input.recessionHedgeExposure / input.totalBondAllocation < 0.25) {
      guidance.push("Bond sleeve has limited explicit treasury recession-hedge exposure.");
    }
    if (input.inflationLinkedExposure === 0) {
      guidance.push("No TIPS allocation is visible, so inflation-hedging is mainly coming from non-bond assets.");
    }
    if (input.highYieldExposure / input.totalBondAllocation > 0.25) {
      guidance.push("High-yield share is large within bonds; future allocation logic should treat it closer to credit/equity risk.");
    }
    if (guidance.length === 0) guidance.push("Bond sleeve is reasonably balanced across stability, duration, and credit risk for a foundation-level review.");
    return guidance;
  }

  private buildScenarioImpacts(holdings: BondHoldingExposure[], totalBondValue: number, totalPortfolioValue: number) {
    const portfolioDenominator = totalPortfolioValue || 0;
    const bondDenominator = totalBondValue || 0;
    const weighted = (impactFor: (holding: BondHoldingExposure) => number | null) => {
      let bondImpact = 0;
      let portfolioImpact = 0;
      let hasData = false;
      for (const holding of holdings) {
        const impact = impactFor(holding);
        if (impact == null) continue;
        hasData = true;
        bondImpact += bondDenominator === 0 ? 0 : holding.bondAllocationPercent * impact;
        portfolioImpact += portfolioDenominator === 0 ? 0 : holding.allocationPercent * impact;
      }
      return hasData ? { bondImpact, portfolioImpact } : null;
    };

    const ratesUp = weighted((holding) => holding.estimatedRateShockUp1Pct);
    const ratesDown = weighted((holding) => holding.estimatedRateShockDown1Pct);
    const spreadWidening = weighted((holding) => {
      const spreadImpact = holding.estimatedSpreadWidening1Pct ?? 0;
      return spreadImpact + (holding.creditQuality === "high yield" ? -0.04 : holding.bondType === "corporate" ? -0.015 : 0);
    });
    const recession = weighted((holding) => {
      if (holding.recessionSensitivity === "positive") return (holding.estimatedRateShockDown1Pct ?? 0.02) + 0.01;
      if (holding.recessionSensitivity === "negative") return (holding.estimatedSpreadWidening1Pct ?? -0.03) - 0.03;
      return 0;
    });
    const inflation = weighted((holding) => {
      if (holding.inflationLinked) return 0.025;
      if (holding.inflationSensitivity === "negative") return -0.03;
      if (holding.inflationSensitivity === "moderate negative") return -0.015;
      return -0.005;
    });

    return [
      {
        scenarioKey: "rates_up" as const,
        label: "Rates +1%",
        estimatedPortfolioImpact: ratesUp?.portfolioImpact ?? null,
        estimatedBondSleeveImpact: ratesUp?.bondImpact ?? null,
        explanation: "Uses effective duration where available; roughly price impact = -duration x rate change."
      },
      {
        scenarioKey: "rates_down" as const,
        label: "Rates -1%",
        estimatedPortfolioImpact: ratesDown?.portfolioImpact ?? null,
        estimatedBondSleeveImpact: ratesDown?.bondImpact ?? null,
        explanation: "Uses effective duration where available; long duration benefits most from falling rates."
      },
      {
        scenarioKey: "inflation_surprise" as const,
        label: "Inflation surprise",
        estimatedPortfolioImpact: inflation?.portfolioImpact ?? null,
        estimatedBondSleeveImpact: inflation?.bondImpact ?? null,
        explanation: "TIPS are treated positively; nominal long-duration bonds are treated negatively."
      },
      {
        scenarioKey: "recession" as const,
        label: "Recession",
        estimatedPortfolioImpact: recession?.portfolioImpact ?? null,
        estimatedBondSleeveImpact: recession?.bondImpact ?? null,
        explanation: "Treasuries are treated as positive hedges; high yield and corporate credit are penalized."
      },
      {
        scenarioKey: "credit_spread_widening" as const,
        label: "Credit spreads +1%",
        estimatedPortfolioImpact: spreadWidening?.portfolioImpact ?? null,
        estimatedBondSleeveImpact: spreadWidening?.bondImpact ?? null,
        explanation: "Uses spread duration where available plus deterministic penalties for corporate/high-yield credit."
      }
    ];
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
