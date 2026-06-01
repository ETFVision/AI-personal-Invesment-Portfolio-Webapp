import type { AllocationItem, HoldingValuation } from "@/domain/portfolio/types";
import type { BondProfile, Instrument } from "@/domain/universe/types";

export type BondHoldingExposure = {
  instrumentId: string;
  holdingId: string;
  symbol: string;
  name: string;
  value: number;
  allocationPercent: number;
  bondAllocationPercent: number;
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
  estimatedRateShockDown1Pct: number | null;
  estimatedRateShockUp1Pct: number | null;
  estimatedSpreadWidening1Pct: number | null;
  isManualOverride: boolean;
  profileCanBeEdited: boolean;
};

export type BondRoleSummary = {
  stability: string;
  income: string;
  recessionHedge: string;
  inflationHedge: string;
};

export type BondScenarioImpact = {
  scenarioKey: "rates_up" | "rates_down" | "inflation_surprise" | "recession" | "credit_spread_widening";
  label: string;
  estimatedPortfolioImpact: number | null;
  estimatedBondSleeveImpact: number | null;
  explanation: string;
};

export type BondAnalyticsReport = {
  totalPortfolioValue: number;
  totalBondValue: number;
  totalBondAllocation: number;
  bondHoldings: BondHoldingExposure[];
  byDuration: AllocationItem[];
  byBondType: AllocationItem[];
  byCreditQuality: AllocationItem[];
  byGeography: AllocationItem[];
  byCurrency: AllocationItem[];
  treasuryExposure: number;
  corporateExposure: number;
  investmentGradeExposure: number;
  highYieldExposure: number;
  inflationLinkedExposure: number;
  cashLikeExposure: number;
  longDurationExposure: number;
  recessionHedgeExposure: number;
  creditRiskExposure: number;
  roleSummary: BondRoleSummary;
  warnings: string[];
  diagnostics: string[];
  allocationGuidance: string[];
  scenarioImpacts: BondScenarioImpact[];
  profileCoverage: number;
};

export type BondAnalyticsInput = {
  holdingValuations: HoldingValuation[];
  instruments: Instrument[];
  bondProfiles: BondProfile[];
  totalPortfolioValue: number;
};
