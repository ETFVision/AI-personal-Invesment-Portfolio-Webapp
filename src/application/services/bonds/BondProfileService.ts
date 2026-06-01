import type { BondProfile, Instrument } from "@/domain/universe/types";

export type NormalizedBondProfile = {
  instrumentId: string;
  symbol: string | null;
  durationCategory: string;
  bondType: string;
  creditQuality: string;
  geography: string;
  currency: string;
  inflationLinked: boolean;
  rateSensitivity: string;
  inflationSensitivity: string;
  recessionSensitivity: string;
  liquidityRole: string;
  secYield: number | null;
  distributionYield: number | null;
  yieldToMaturity: number | null;
  yieldAsOfDate: string | null;
  effectiveDuration: number | null;
  averageMaturity: number | null;
  spreadDuration: number | null;
  optionAdjustedSpread: number | null;
  expenseRatio: number | null;
  isManualOverride: boolean;
};

const SEEDED_BOND_PROFILES: Record<string, Omit<NormalizedBondProfile, "instrumentId" | "symbol" | "secYield" | "distributionYield" | "yieldToMaturity" | "yieldAsOfDate" | "optionAdjustedSpread" | "expenseRatio" | "isManualOverride">> = {
  SGOV: {
    durationCategory: "ultra-short",
    bondType: "treasury",
    creditQuality: "government",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "low",
    inflationSensitivity: "low",
    recessionSensitivity: "positive",
    liquidityRole: "cash-like stability",
    effectiveDuration: 0.1,
    averageMaturity: 0.1,
    spreadDuration: 0
  },
  BIL: {
    durationCategory: "ultra-short",
    bondType: "treasury",
    creditQuality: "government",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "low",
    inflationSensitivity: "low",
    recessionSensitivity: "positive",
    liquidityRole: "cash-like stability",
    effectiveDuration: 0.15,
    averageMaturity: 0.15,
    spreadDuration: 0
  },
  SHY: {
    durationCategory: "short",
    bondType: "treasury",
    creditQuality: "government",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "low",
    inflationSensitivity: "low",
    recessionSensitivity: "positive",
    liquidityRole: "stability",
    effectiveDuration: 1.9,
    averageMaturity: 2,
    spreadDuration: 0
  },
  IEF: {
    durationCategory: "intermediate",
    bondType: "treasury",
    creditQuality: "government",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "medium",
    inflationSensitivity: "moderate negative",
    recessionSensitivity: "positive",
    liquidityRole: "recession hedge",
    effectiveDuration: 7.5,
    averageMaturity: 8,
    spreadDuration: 0
  },
  TLT: {
    durationCategory: "long",
    bondType: "treasury",
    creditQuality: "government",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "high",
    inflationSensitivity: "negative",
    recessionSensitivity: "positive",
    liquidityRole: "long-duration recession hedge",
    effectiveDuration: 16.5,
    averageMaturity: 25,
    spreadDuration: 0
  },
  BND: {
    durationCategory: "intermediate",
    bondType: "aggregate",
    creditQuality: "mixed investment grade",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "medium",
    inflationSensitivity: "moderate negative",
    recessionSensitivity: "mixed",
    liquidityRole: "core stability",
    effectiveDuration: 6.0,
    averageMaturity: 8.5,
    spreadDuration: 2.5
  },
  AGG: {
    durationCategory: "intermediate",
    bondType: "aggregate",
    creditQuality: "mixed investment grade",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "medium",
    inflationSensitivity: "moderate negative",
    recessionSensitivity: "mixed",
    liquidityRole: "core stability",
    effectiveDuration: 6.0,
    averageMaturity: 8.5,
    spreadDuration: 2.5
  },
  TIP: {
    durationCategory: "intermediate",
    bondType: "inflation-linked",
    creditQuality: "government",
    geography: "US",
    currency: "USD",
    inflationLinked: true,
    rateSensitivity: "medium",
    inflationSensitivity: "positive",
    recessionSensitivity: "mixed",
    liquidityRole: "inflation hedge",
    effectiveDuration: 6.5,
    averageMaturity: 7.5,
    spreadDuration: 0
  },
  LQD: {
    durationCategory: "intermediate",
    bondType: "corporate",
    creditQuality: "investment grade",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "medium",
    inflationSensitivity: "moderate negative",
    recessionSensitivity: "negative",
    liquidityRole: "income",
    effectiveDuration: 8.0,
    averageMaturity: 13,
    spreadDuration: 7.5
  },
  HYG: {
    durationCategory: "short/intermediate",
    bondType: "high yield",
    creditQuality: "high yield",
    geography: "US",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "medium",
    inflationSensitivity: "moderate",
    recessionSensitivity: "negative",
    liquidityRole: "income with credit risk",
    effectiveDuration: 3.5,
    averageMaturity: 4.5,
    spreadDuration: 3.5
  },
  BNDX: {
    durationCategory: "intermediate",
    bondType: "international",
    creditQuality: "investment grade",
    geography: "global",
    currency: "USD",
    inflationLinked: false,
    rateSensitivity: "medium",
    inflationSensitivity: "moderate",
    recessionSensitivity: "mixed",
    liquidityRole: "international diversification",
    effectiveDuration: 7.0,
    averageMaturity: 9,
    spreadDuration: 2
  }
};

function normalizeGeography(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "US";
  if (normalized.includes("international")) return "international";
  if (normalized.includes("global")) return "global";
  if (normalized.includes("united states") || normalized === "us" || normalized === "usa") return "US";
  return value ?? "US";
}

export class BondProfileService {
  normalizeProfile(instrument: Instrument, profile?: BondProfile | null): NormalizedBondProfile | null {
    const symbol = instrument.symbol?.trim().toUpperCase() ?? null;
    if (!symbol) return null;
    const seeded = SEEDED_BOND_PROFILES[symbol];
    const durationCategory = profile?.durationCategory ?? instrument.durationCategory ?? seeded?.durationCategory;
    const bondType = profile?.treasuryClassification ?? instrument.treasuryClassification ?? seeded?.bondType;
    if (instrument.assetClass !== "bond_etf" && !profile && !seeded) return null;

    return {
      instrumentId: instrument.id,
      symbol,
      durationCategory: durationCategory ?? "intermediate",
      bondType: bondType ?? "aggregate",
      creditQuality: profile?.creditQuality ?? instrument.creditQuality ?? seeded?.creditQuality ?? "mixed",
      geography: normalizeGeography(profile?.geoExposure ?? instrument.geoExposure ?? instrument.geography ?? seeded?.geography),
      currency: profile?.currency ?? instrument.currency ?? seeded?.currency ?? "USD",
      inflationLinked: profile?.inflationLinked ?? instrument.inflationLinked ?? seeded?.inflationLinked ?? false,
      rateSensitivity: profile?.rateSensitivity ?? instrument.rateSensitivity ?? seeded?.rateSensitivity ?? this.rateSensitivityForDuration(durationCategory),
      inflationSensitivity:
        profile?.inflationSensitivity ?? instrument.inflationSensitivity ?? seeded?.inflationSensitivity ?? this.inflationSensitivityFor(durationCategory, Boolean(profile?.inflationLinked ?? instrument.inflationLinked)),
      recessionSensitivity:
        profile?.recessionSensitivity ?? instrument.recessionSensitivity ?? seeded?.recessionSensitivity ?? this.recessionSensitivityFor(bondType),
      liquidityRole: profile?.liquidityRole ?? instrument.liquidityRole ?? seeded?.liquidityRole ?? "stability",
      secYield: profile?.secYield ?? null,
      distributionYield: profile?.distributionYield ?? null,
      yieldToMaturity: profile?.yieldToMaturity ?? null,
      yieldAsOfDate: profile?.yieldAsOfDate ?? null,
      effectiveDuration: profile?.effectiveDuration ?? seeded?.effectiveDuration ?? null,
      averageMaturity: profile?.averageMaturity ?? seeded?.averageMaturity ?? null,
      spreadDuration: profile?.spreadDuration ?? seeded?.spreadDuration ?? null,
      optionAdjustedSpread: profile?.optionAdjustedSpread ?? null,
      expenseRatio: profile?.expenseRatio ?? null,
      isManualOverride: profile?.isManualOverride ?? false
    };
  }

  isBondEtf(instrument: Instrument, profile?: BondProfile | null) {
    return instrument.assetClass === "bond_etf" || Boolean(profile);
  }

  private rateSensitivityForDuration(durationCategory: string | null | undefined) {
    if (durationCategory === "long") return "high";
    if (durationCategory === "intermediate" || durationCategory === "short/intermediate") return "medium";
    return "low";
  }

  private inflationSensitivityFor(durationCategory: string | null | undefined, inflationLinked: boolean) {
    if (inflationLinked) return "positive";
    if (durationCategory === "long") return "negative";
    if (durationCategory === "ultra-short" || durationCategory === "short") return "low";
    return "moderate negative";
  }

  private recessionSensitivityFor(bondType: string | null | undefined) {
    if (bondType === "treasury") return "positive";
    if (bondType === "aggregate" || bondType === "inflation-linked" || bondType === "international") return "mixed";
    return "negative";
  }
}

export { SEEDED_BOND_PROFILES };
