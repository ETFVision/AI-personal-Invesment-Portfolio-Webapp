export type MarketVisionSourceType = "manual" | "generated" | "imported";
export type MarketVisionStatus = "draft" | "published" | "archived";
export type MarketThemeClassification = "short_term_noise" | "medium_term_theme" | "structural_long_term_shift";

export type PortfolioImplications = {
  equityAllocationImplication: string;
  bondAllocationImplication: string;
  goldImplication: string;
  cryptoImplication: string;
  cashImplication: string;
  riskImplication: string;
  watchlistImplication: string;
};

export type MarketVisionConfidenceLevel = "High" | "Medium" | "Low";
export type MarketVisionPortfolioContextStatus = "available" | "partial" | "missing";
export type MarketVisionPortfolioRelevanceLevel = MarketVisionConfidenceLevel | "Not assessed";
export type MarketVisionViewLabel = "Constructive" | "Mixed" | "Cautious" | "Defensive" | "Neutral";

export type MarketVisionRegimeEntry = {
  label: string;
  regime: string;
  supportingIndicators: string[];
  confidence: MarketVisionConfidenceLevel;
  explanation: string;
};

export type MarketVisionEvidencePanel = {
  section: string;
  view: MarketVisionViewLabel | string;
  confidence: MarketVisionConfidenceLevel;
  supportingIndicators: string[];
  conflictingIndicators: string[];
  evidenceGaps: string[];
};

export type MarketVisionThemeSummary = {
  id: string;
  displayName: string;
  type: "structural" | "tactical" | string;
  name: string;
  evidence: string[];
  persistence: "short" | "medium" | "long" | string;
  confidence: MarketVisionConfidenceLevel;
  themeStatus?: "active" | "inactive" | "contradicted" | "watch_only" | "internal_only";
  displayToUser?: boolean;
  statusReason?: string;
};

export type MarketVisionPortfolioRelevance = {
  equity: MarketVisionPortfolioRelevanceLevel;
  bond: MarketVisionPortfolioRelevanceLevel;
  gold: MarketVisionPortfolioRelevanceLevel;
  crypto: MarketVisionPortfolioRelevanceLevel;
  cash: MarketVisionPortfolioRelevanceLevel;
  risk: MarketVisionPortfolioRelevanceLevel;
};

export type MarketVisionRegimeTransition = {
  dimension: string;
  previous: string | null;
  current: string;
  previousCanonical?: string | null;
  currentCanonical?: string;
  changed: boolean;
  status: "No Change" | "Minor Classification Change" | "Regime Shift Detected" | "New Signal" | "Signal Removed";
  explanation?: string;
};

export type MarketVisionCrossCurrents = {
  positiveForces: string[];
  negativeForces: string[];
  neutralForces: string[];
  netInterpretation: "Constructive" | "Mixed" | "Cautious" | "Defensive" | "Neutral";
};

export type MarketVisionConfidenceScore = {
  section: string;
  confidenceScore: number;
  confidenceLabel: MarketVisionConfidenceLevel;
  supportingCount: number;
  directIndicatorCount?: number;
  conflictingCount: number;
  gapCount: number;
  staleIndicatorCount?: number;
};

export type MarketVisionPortfolioImpact = {
  dimension: string;
  relevance: MarketVisionPortfolioRelevanceLevel;
  reason: string;
  driver?: string;
  value?: number | null;
  rawDriverScore?: number | null;
  displayDriverScoreCapped?: number | null;
  driverBreakdown?: Array<{
    label: string;
    value: number;
  }>;
};

export type MarketVisionTelemetryMetadata = {
  visionId?: string;
  generatedAt?: string;
  overallRegime: string;
  overallConfidence: MarketVisionConfidenceLevel;
  growthRegime: string;
  growthConfidence: MarketVisionConfidenceLevel;
  inflationRegime: string;
  inflationConfidence: MarketVisionConfidenceLevel;
  ratesRegime: string;
  ratesConfidence: MarketVisionConfidenceLevel;
  yieldCurveRegime: string;
  yieldCurveConfidence: MarketVisionConfidenceLevel;
  liquidityRegime: string;
  liquidityConfidence: MarketVisionConfidenceLevel;
  usdRegime: string;
  usdConfidence: MarketVisionConfidenceLevel;
  commoditiesRegime: string;
  commoditiesConfidence: MarketVisionConfidenceLevel;
  equityView: string;
  equityConfidence: MarketVisionConfidenceLevel;
  bondView: string;
  bondConfidence: MarketVisionConfidenceLevel;
  goldView: string;
  goldConfidence: MarketVisionConfidenceLevel;
  cryptoView: string;
  cryptoConfidence: MarketVisionConfidenceLevel;
  keyWatchItems: string[];
  structuralThemeIds: string[];
  tacticalThemeIds: string[];
  structuralThemes: string[];
  tacticalThemes: string[];
  evidenceGaps: string[];
  portfolioContextStatus: MarketVisionPortfolioContextStatus;
  portfolioContextInputs: Record<string, unknown>;
  themeDiagnostics?: MarketVisionThemeSummary[];
  portfolioRelevance: MarketVisionPortfolioRelevance;
  regimeTransitions: MarketVisionRegimeTransition[];
  confidenceScores: MarketVisionConfidenceScore[];
  crossCurrents: MarketVisionCrossCurrents;
  portfolioImpactMatrix: MarketVisionPortfolioImpact[];
};

export type MarketVisionMetadata = {
  regimeScorecard: MarketVisionRegimeEntry[];
  evidencePanels: MarketVisionEvidencePanel[];
  structuralThemes: MarketVisionThemeSummary[];
  tacticalThemes: MarketVisionThemeSummary[];
  keyWatchItems: string[];
  evidenceGaps: string[];
  portfolioContextStatus: MarketVisionPortfolioContextStatus;
  portfolioContextInputs: Record<string, unknown>;
  themeDiagnostics?: MarketVisionThemeSummary[];
  portfolioRelevance: MarketVisionPortfolioRelevance;
  regimeTransitions: MarketVisionRegimeTransition[];
  confidenceScores: MarketVisionConfidenceScore[];
  crossCurrents: MarketVisionCrossCurrents;
  portfolioImpactMatrix: MarketVisionPortfolioImpact[];
  telemetryMetadata: MarketVisionTelemetryMetadata;
};

export type ClassificationSummary = {
  shortTermNoise: number;
  mediumTermThemes: number;
  structuralLongTermShifts: number;
};

export type MarketVisionReport = {
  id: string;
  reportDate: string;
  reportPeriodStart: string | null;
  reportPeriodEnd: string | null;
  title: string;
  executiveSummary: string;
  globalMarketSummary: string;
  equityView: string;
  bondView: string;
  goldView: string;
  cryptoView: string;
  ratesView: string;
  inflationView: string;
  growthView: string;
  employmentView: string;
  currencyView: string;
  geopoliticalRiskView: string;
  opportunities: string[];
  risks: string[];
  portfolioImplications: PortfolioImplications;
  classificationSummary: ClassificationSummary;
  sourceType: MarketVisionSourceType;
  status: MarketVisionStatus;
  confidenceScore: number | null;
  modelUsed: string | null;
  promptVersion: string | null;
  tokenUsage: Record<string, unknown>;
  costEstimate: number | null;
  sourceSnapshot: Record<string, unknown>;
  marketVisionMetadata: MarketVisionMetadata;
  generationDurationMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketVisionGenerationStatus = "success" | "failed" | "skipped";

export type MarketVisionGenerationLog = {
  id: string;
  reportId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  startedAt: string;
  completedAt: string | null;
  status: MarketVisionGenerationStatus;
  modelUsed: string | null;
  promptVersion: string | null;
  tokenUsage: Record<string, unknown>;
  costEstimate: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type MacroIndicatorCategory =
  | "interest_rates"
  | "inflation"
  | "yields"
  | "employment"
  | "growth"
  | "currency"
  | "commodities"
  | "liquidity";

export type MacroIndicator = {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  sourceProvider: string;
  latestValue: number | null;
  previousValue: number | null;
  changeValue: number | null;
  changePercent: number | null;
  observationDate: string | null;
  category: MacroIndicatorCategory;
  unit: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MarketThemeEvent = {
  id: string;
  reportId: string;
  title: string;
  description: string;
  themeCategory: string;
  affectedAssetClasses: string[];
  affectedSectors: string[];
  affectedThemes: string[];
  severityScore: number;
  persistenceScore: number;
  confidenceScore: number;
  classification: MarketThemeClassification;
  createdAt: string;
  updatedAt: string;
};

export type MarketVisionDashboard = {
  latestPublishedReport: MarketVisionReport | null;
  selectedReport: MarketVisionReport | null;
  reports: MarketVisionReport[];
  macroIndicators: MacroIndicator[];
  themeEvents: MarketThemeEvent[];
  generationLogs: MarketVisionGenerationLog[];
};
