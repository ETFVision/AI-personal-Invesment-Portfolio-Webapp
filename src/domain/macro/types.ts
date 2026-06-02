import type { MacroIndicatorCategory } from "@/domain/marketVision/types";

export type MacroFrequency = "daily" | "weekly" | "monthly" | "quarterly" | string;
export type MacroDirection = "rising" | "falling" | "stable" | "insufficient_data";
export type MacroAcceleration = "accelerating" | "decelerating" | "stable" | "insufficient_data";
export type MacroIngestionStatus = "success" | "partial_success" | "failed";

export type MacroIndicatorDefinition = {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  sourceProvider: string;
  category: MacroIndicatorCategory;
  unit: string | null;
  frequency: MacroFrequency | null;
  description: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MacroObservation = {
  id: string;
  indicatorId: string;
  observationDate: string;
  value: number | null;
  sourceProvider: string;
  providerMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MacroTrend = {
  id: string;
  indicatorId: string;
  asOfDate: string;
  latestValue: number | null;
  previousValue: number | null;
  changeValue: number | null;
  changePercent: number | null;
  oneMonthChange: number | null;
  threeMonthChange: number | null;
  sixMonthChange: number | null;
  oneYearChange: number | null;
  direction: MacroDirection;
  acceleration: MacroAcceleration;
  persistenceScore: number;
  severityScore: number;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
};

export type MacroRegimeSnapshot = {
  id: string;
  snapshotDate: string;
  ratesRegime: string;
  inflationRegime: string;
  growthRegime: string;
  employmentRegime: string;
  yieldCurveRegime: string;
  liquidityRegime: string;
  dollarRegime: string;
  commoditiesRegime: string;
  overallMacroSummary: string;
  createdAt: string;
  updatedAt: string;
};

export type MacroIngestionLog = {
  id: string;
  jobName: string;
  sourceProvider: string;
  startedAt: string;
  completedAt: string | null;
  status: MacroIngestionStatus;
  indicatorsRequested: number;
  indicatorsSuccessful: number;
  indicatorsFailed: number;
  observationsInserted: number;
  observationsUpdated: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type MacroDashboardIndicator = MacroIndicatorDefinition & {
  latestTrend: MacroTrend | null;
  latestObservation: MacroObservation | null;
  observations: MacroObservation[];
};

export type MacroDashboard = {
  indicators: MacroDashboardIndicator[];
  latestRegime: MacroRegimeSnapshot | null;
  ingestionLogs: MacroIngestionLog[];
};
