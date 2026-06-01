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
};

const SEEDED_BOND_PROFILES: Record<string, Omit<NormalizedBondProfile, "instrumentId" | "symbol">> = {
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
    liquidityRole: "cash-like stability"
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
    liquidityRole: "cash-like stability"
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
    liquidityRole: "stability"
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
    liquidityRole: "recession hedge"
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
    liquidityRole: "long-duration recession hedge"
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
    liquidityRole: "core stability"
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
    liquidityRole: "core stability"
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
    liquidityRole: "inflation hedge"
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
    liquidityRole: "income"
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
    liquidityRole: "income with credit risk"
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
    liquidityRole: "international diversification"
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
      liquidityRole: profile?.liquidityRole ?? instrument.liquidityRole ?? seeded?.liquidityRole ?? "stability"
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
