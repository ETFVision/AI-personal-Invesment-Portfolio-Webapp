import type { AllocationItem, HoldingValuation } from "@/domain/portfolio/types";
import type { BondProfile, Instrument } from "@/domain/universe/types";

export type BondHoldingExposure = {
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
};

export type BondRoleSummary = {
  stability: string;
  income: string;
  recessionHedge: string;
  inflationHedge: string;
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
  profileCoverage: number;
};

export type BondAnalyticsInput = {
  holdingValuations: HoldingValuation[];
  instruments: Instrument[];
  bondProfiles: BondProfile[];
  totalPortfolioValue: number;
};
