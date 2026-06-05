export type AssistantQuestionCategory =
  | "portfolio_overview"
  | "portfolio_review"
  | "risk"
  | "market_vision"
  | "recommendation"
  | "telemetry"
  | "etf"
  | "monitoring"
  | "unsupported";

export type AssistantMessageRole = "user" | "assistant" | "system";
export type AssistantConversationStatus = "active" | "archived";

export type AssistantConversation = {
  id: string;
  userId: string | null;
  portfolioId: string | null;
  title: string;
  latestQuestionCategory: AssistantQuestionCategory | string | null;
  status: AssistantConversationStatus;
  createdAt: string;
  updatedAt: string;
};

export type AssistantMessage = {
  id: string;
  conversationId: string;
  userId: string | null;
  portfolioId: string | null;
  role: AssistantMessageRole;
  questionCategory: AssistantQuestionCategory | string | null;
  content: string;
  metadata: Record<string, unknown>;
  tokenUsage: Record<string, unknown>;
  costEstimate: number | null;
  responseTimeMs: number | null;
  createdAt: string;
};

export type AssistantUsageLog = {
  id: string;
  conversationId: string | null;
  userId: string | null;
  portfolioId: string | null;
  questionCategory: AssistantQuestionCategory | string | null;
  supported: boolean;
  modelUsed: string | null;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number | null;
  responseTimeMs: number | null;
  createdAt: string;
};

export type AssistantRouteResult = {
  category: AssistantQuestionCategory;
  supported: boolean;
  confidence: number;
  reason: string;
};

export type AssistantContextPackage = {
  category: AssistantQuestionCategory;
  portfolio: {
    id: string | null;
    name: string | null;
    totalValue: number | null;
    latestPriceDate: string | null;
    portfolioScore: number | null;
    diversificationScore: number | null;
    concentrationScore: number | null;
    riskScore: number | null;
    fixedIncomeScore: number | null;
    macroFitScore: number | null;
  };
  holdings: Array<{ symbol: string; name: string; value: number; percent: number | null }>;
  indirectHoldings: Array<{ symbol: string; name?: string | null; percent?: number | null; value?: number | null }>;
  exposures: {
    sectors: Array<{ label: string; percent: number }>;
    geographies: Array<{ label: string; percent: number }>;
    themes: Array<{ label: string; percent: number }>;
  };
  portfolioReview: {
    summary: string | null;
    watchAreas: string[];
    suggestions: string[];
    riskFindings: string[];
    concentrationFindings: string[];
  };
  recommendations: {
    distribution: Record<string, number>;
    focused: Array<{
      symbol: string;
      label: string;
      score: number | null;
      confidence: number;
      positiveDrivers: string[];
      negativeDrivers: string[];
      guardrails: string[];
      portfolioFit?: number | null;
      marketVisionAlignment?: number | null;
    }>;
  };
  marketVision: {
    title: string | null;
    executiveSummary: string | null;
    risks: string[];
    opportunities: string[];
    portfolioImplications: Record<string, unknown>;
  };
  telemetry: {
    available: boolean;
    recommendationCoverage: number | null;
    bestFactors: string[];
    worstFactors: string[];
    confidenceCalibration: string[];
    marketVisionAccuracy: string[];
    portfolioReviewEffectiveness: string | null;
  };
  recentMessages: Array<{ role: AssistantMessageRole; content: string; questionCategory: string | null }>;
  dataLimitations: string[];
};

export type AssistantAnswer = {
  conversation: AssistantConversation;
  userMessage: AssistantMessage;
  assistantMessage: AssistantMessage;
  route: AssistantRouteResult;
  tokenUsage: Record<string, unknown>;
  costEstimate: number | null;
  responseTimeMs: number;
};

export const ASSISTANT_UNSUPPORTED_RESPONSE =
  "The Portfolio Assistant is designed specifically for portfolio-related questions such as portfolio reviews, risk analysis, Market Vision, recommendations and ETF exposures.";
