import test from "node:test";
import assert from "node:assert/strict";
import type {
  AssistantRepository,
  AssistantUsageSummary,
  CreateAssistantConversationInput,
  CreateAssistantMessageInput,
  CreateAssistantUsageLogInput
} from "../src/application/ports/repositories/AssistantRepository";
import type { AiPortfolioAssistantProvider } from "../src/application/ports/providers/AiPortfolioAssistantProvider";
import { AssistantQuestionRouter } from "../src/application/services/assistant/AssistantQuestionRouter";
import { AssistantResponseGuardrailService } from "../src/application/services/assistant/AssistantResponseGuardrailService";
import { AssistantPromptBuilder } from "../src/application/services/assistant/AssistantPromptBuilder";
import { PortfolioAssistantService } from "../src/application/services/assistant/PortfolioAssistantService";
import { AssistantContextBuilder } from "../src/application/services/assistant/AssistantContextBuilder";
import {
  ASSISTANT_ADVICE_BLOCKED_RESPONSE,
  ASSISTANT_GENERAL_KNOWLEDGE_BLOCKED_RESPONSE,
  ASSISTANT_UNSUPPORTED_RESPONSE,
  type AssistantConversation,
  type AssistantMessage,
  type AssistantUsageLog
} from "../src/domain/assistant/types";

const now = "2026-06-05T00:00:00.000Z";

class MemoryAssistantRepository implements AssistantRepository {
  conversations: AssistantConversation[] = [];
  messages: AssistantMessage[] = [];
  usageLogs: AssistantUsageLog[] = [];

  async createConversation(input: CreateAssistantConversationInput): Promise<AssistantConversation> {
    const conversation: AssistantConversation = {
      id: `conversation-${this.conversations.length + 1}`,
      userId: input.userId,
      portfolioId: input.portfolioId,
      title: input.title,
      latestQuestionCategory: input.latestQuestionCategory ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    this.conversations.push(conversation);
    return conversation;
  }

  async updateConversation(input: { conversationId: string; title?: string; latestQuestionCategory?: string | null; status?: "active" | "archived" }): Promise<void> {
    const conversation = this.conversations.find((item) => item.id === input.conversationId);
    if (!conversation) return;
    if (input.title !== undefined) conversation.title = input.title;
    if (input.latestQuestionCategory !== undefined) conversation.latestQuestionCategory = input.latestQuestionCategory;
    if (input.status !== undefined) conversation.status = input.status;
    conversation.updatedAt = now;
  }

  async getConversation(conversationId: string): Promise<AssistantConversation | null> {
    return this.conversations.find((item) => item.id === conversationId) ?? null;
  }

  async listConversations(userId: string, limit = 20): Promise<AssistantConversation[]> {
    return this.conversations.filter((item) => item.userId === userId).slice(0, limit);
  }

  async createMessage(input: CreateAssistantMessageInput): Promise<AssistantMessage> {
    const message: AssistantMessage = {
      id: `message-${this.messages.length + 1}`,
      conversationId: input.conversationId,
      userId: input.userId,
      portfolioId: input.portfolioId,
      role: input.role,
      questionCategory: input.questionCategory ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
      tokenUsage: input.tokenUsage ?? {},
      costEstimate: input.costEstimate ?? null,
      responseTimeMs: input.responseTimeMs ?? null,
      createdAt: now
    };
    this.messages.push(message);
    return message;
  }

  async listMessages(conversationId: string, limit = 20): Promise<AssistantMessage[]> {
    return this.messages.filter((item) => item.conversationId === conversationId).slice(-limit);
  }

  async createUsageLog(input: CreateAssistantUsageLogInput): Promise<AssistantUsageLog> {
    const log: AssistantUsageLog = {
      id: `usage-${this.usageLogs.length + 1}`,
      conversationId: input.conversationId ?? null,
      userId: input.userId,
      portfolioId: input.portfolioId,
      questionCategory: input.questionCategory ?? null,
      supported: input.supported,
      modelUsed: input.modelUsed ?? null,
      promptTokens: input.promptTokens ?? 0,
      completionTokens: input.completionTokens ?? 0,
      estimatedCost: input.estimatedCost ?? null,
      responseTimeMs: input.responseTimeMs ?? null,
      createdAt: now
    };
    this.usageLogs.push(log);
    return log;
  }

  async listUsageLogs(limit = 250): Promise<AssistantUsageLog[]> {
    return this.usageLogs.slice(0, limit);
  }

  async getUsageSummary(): Promise<AssistantUsageSummary> {
    return {
      totalQuestions: this.usageLogs.length,
      supportedQuestions: this.usageLogs.filter((item) => item.supported).length,
      unsupportedQuestions: this.usageLogs.filter((item) => !item.supported).length,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCost: 0,
      averageResponseTimeMs: null,
      byCategory: [],
      recentLogs: this.usageLogs
    };
  }
}

class ThrowingAssistantProvider implements AiPortfolioAssistantProvider {
  calls = 0;

  async answer(): Promise<never> {
    this.calls += 1;
    throw new Error("Provider should not be called for unsupported questions.");
  }
}

const minimalAssistantContext = {
  category: "portfolio_overview" as const,
  portfolio: {
    id: "portfolio-1",
    name: "Main",
    totalValue: 1000,
    latestPriceDate: "2026-06-04",
    portfolioScore: 77,
    diversificationScore: 79,
    concentrationScore: 59,
    riskScore: 88,
    fixedIncomeScore: 79,
    macroFitScore: 72
  },
  holdings: [],
  indirectHoldings: [],
  exposures: {
    source: "lookthrough" as const,
    lookthroughCoverage: { etfCount: 3 },
    sectors: [{ label: "Technology", percent: 0.267 }],
    geographies: [{ label: "United States", percent: 0.633 }],
    themes: []
  },
  portfolioReview: {
    summary: "Broadly healthy",
    watchAreas: ["Top holding concentration: Largest holding exceeds 25%."],
    suggestions: [],
    riskFindings: [],
    concentrationFindings: []
  },
  recommendations: { distribution: {}, focused: [] },
  marketVision: { title: null, executiveSummary: null, risks: [], opportunities: [], portfolioImplications: {} },
  telemetry: {
    available: false,
    recommendationCoverage: null,
    bestFactors: [],
    worstFactors: [],
    confidenceCalibration: [],
    marketVisionAccuracy: [],
    portfolioReviewEffectiveness: null
  },
  recentMessages: [],
  dataLimitations: []
};

class CapturingAssistantProvider implements AiPortfolioAssistantProvider {
  input: unknown = null;

  async answer(input: Parameters<AiPortfolioAssistantProvider["answer"]>[0]) {
    this.input = input;
    return {
      answer: "Direct answer.\n\n## Most Important Thing Right Now\nMonitor concentration.\n\n## ETFVision View\nBroadly healthy.",
      tokenUsage: { input_tokens: 10, output_tokens: 10 },
      costEstimate: 0.0001,
      modelUsed: "test-model"
    };
  }
}

test("assistant router maps ETFVision questions and rejects out-of-scope questions", () => {
  const router = new AssistantQuestionRouter();
  assert.equal(router.route("Why is my portfolio score 77?").category, "portfolio_review");
  assert.equal(router.route("What are my biggest risks?").category, "risk");
  assert.equal(router.route("Tell me a joke about markets").supported, false);
});

test("assistant router blocks advice-seeking before recommendation context", () => {
  const router = new AssistantQuestionRouter();
  const blockedQuestions = [
    "What stock should I buy today?",
    "Should I buy NVDA?",
    "Should I sell VOO?",
    "What ETF will outperform?",
    "Give me a target allocation.",
    "Tell me how to beat the market.",
    "Give me a trading strategy."
  ];

  for (const question of blockedQuestions) {
    const route = router.route(question);
    assert.equal(route.supported, false, question);
    assert.equal(route.blockedIntent, "advice_seeking", question);
  }
});

test("assistant router blocks general knowledge unless framed around portfolio context", () => {
  const router = new AssistantQuestionRouter();
  assert.equal(router.route("What is inflation?").blockedIntent, "general_knowledge");
  assert.equal(router.route("What is Bitcoin?").blockedIntent, "general_knowledge");
  assert.equal(router.route("What is ChatGPT?").blockedIntent, "general_knowledge");
  assert.equal(router.route("How does inflation affect my portfolio?").supported, true);
  assert.notEqual(router.route("How does Bitcoin affect my portfolio?").blockedIntent, "general_knowledge");
});

test("assistant router allows recommendation explanations but blocks recommendation advice", () => {
  const router = new AssistantQuestionRouter();
  assert.equal(router.route("Why is NVDA Hold?").supported, true);
  assert.equal(router.route("Why is NVDA not a Buy?").supported, true);
  assert.equal(router.route("Explain VOO's Watch rating.").supported, true);
  assert.equal(router.route("Should I buy NVDA?").supported, false);
});

test("assistant router uses prior category for follow-up questions", () => {
  const router = new AssistantQuestionRouter();
  const route = router.route("Which one contributes most?", "risk");
  assert.equal(route.supported, true);
  assert.equal(route.category, "risk");
});

test("assistant guardrail replaces prohibited investment instructions", () => {
  const guardrails = new AssistantResponseGuardrailService();
  const result = guardrails.validate("You should buy VOO and allocate 20%.");
  assert.equal(result.ok, false);
  assert.match(result.answer, /cannot provide buy\/sell instructions/i);
});

test("assistant prompt builder carries CIO response-quality requirements", () => {
  const payload = new AssistantPromptBuilder().build({
    question: "Is my portfolio healthy?",
    context: minimalAssistantContext
  });
  const requirements = payload.responseRequirements.join("\n");
  assert.match(requirements, /Most Important Thing Right Now/);
  assert.match(requirements, /Rank findings by priority/);
  assert.match(requirements, /ETFVision View/);
  assert.match(requirements, /Executive summaries should be concise/);
  assert.match(requirements, /mention this only when evidence, changes, monitoring, or historical accuracy is relevant/);
});

test("supported assistant questions pass response requirements to the AI provider", async () => {
  const repository = new MemoryAssistantRepository();
  const provider = new CapturingAssistantProvider();
  const service = new PortfolioAssistantService(
    repository,
    new AssistantQuestionRouter(),
    { build: async () => minimalAssistantContext } as never,
    new AssistantPromptBuilder(),
    provider,
    new AssistantResponseGuardrailService()
  );

  await service.answer({
    question: "Is my portfolio healthy?",
    userId: "user-1",
    portfolioId: "portfolio-1"
  });

  const input = provider.input as { responseRequirements?: string[] };
  assert.ok(input.responseRequirements?.some((item) => item.includes("Most Important Thing Right Now")));
  assert.ok(input.responseRequirements?.some((item) => item.includes("ETFVision View")));
});

test("unsupported assistant questions are logged without invoking the AI provider", async () => {
  const repository = new MemoryAssistantRepository();
  const provider = new ThrowingAssistantProvider();
  const service = new PortfolioAssistantService(
    repository,
    new AssistantQuestionRouter(),
    {
      build: async () => {
        throw new Error("Context should not be built for unsupported questions.");
      }
    } as never,
    new AssistantPromptBuilder(),
    provider,
    new AssistantResponseGuardrailService()
  );

  const answer = await service.answer({
    question: "Can you write SQL for me?",
    userId: "user-1",
    portfolioId: "portfolio-1"
  });

  assert.equal(provider.calls, 0);
  assert.equal(answer.route.supported, false);
  assert.equal(answer.assistantMessage.content, ASSISTANT_UNSUPPORTED_RESPONSE);
  assert.equal(repository.usageLogs.length, 1);
  assert.equal(repository.usageLogs[0].supported, false);
  assert.equal(repository.usageLogs[0].modelUsed, null);
});

test("advice-seeking assistant questions do not invoke context or AI and do not expose recommendation data", async () => {
  const repository = new MemoryAssistantRepository();
  const provider = new ThrowingAssistantProvider();
  const service = new PortfolioAssistantService(
    repository,
    new AssistantQuestionRouter(),
    {
      build: async () => {
        throw new Error("Context should not be built for advice-seeking questions.");
      }
    } as never,
    new AssistantPromptBuilder(),
    provider,
    new AssistantResponseGuardrailService()
  );

  const answer = await service.answer({
    question: "What stock should I buy today?",
    userId: "user-1",
    portfolioId: "portfolio-1"
  });

  assert.equal(provider.calls, 0);
  assert.equal(answer.route.blockedIntent, "advice_seeking");
  assert.equal(answer.assistantMessage.content, ASSISTANT_ADVICE_BLOCKED_RESPONSE);
  assert.doesNotMatch(answer.assistantMessage.content, /\b(Strong Buy|highest score|top recommendation|IAU|NVDA)\b/i);
  assert.equal(repository.usageLogs[0].supported, false);
});

test("general knowledge questions are blocked without invoking the AI provider", async () => {
  const repository = new MemoryAssistantRepository();
  const provider = new ThrowingAssistantProvider();
  const service = new PortfolioAssistantService(
    repository,
    new AssistantQuestionRouter(),
    {
      build: async () => {
        throw new Error("Context should not be built for general knowledge questions.");
      }
    } as never,
    new AssistantPromptBuilder(),
    provider,
    new AssistantResponseGuardrailService()
  );

  const answer = await service.answer({
    question: "What is inflation?",
    userId: "user-1",
    portfolioId: "portfolio-1"
  });

  assert.equal(provider.calls, 0);
  assert.equal(answer.route.blockedIntent, "general_knowledge");
  assert.equal(answer.assistantMessage.content, ASSISTANT_GENERAL_KNOWLEDGE_BLOCKED_RESPONSE);
});

test("assistant context prefers ETF look-through exposure over direct broad-market taxonomy", async () => {
  const repository = new MemoryAssistantRepository();
  const builder = new AssistantContextBuilder(
    {
      getDashboard: async () => ({
        portfolio: { id: "portfolio-1", userId: "user-1", name: "Main", baseCurrency: "USD", isDefault: true },
        totalValueEstimate: 1000,
        latestPriceDate: "2026-06-04",
        holdingValuations: [],
        allocationBySector: [
          { label: "Multi-Asset / Broad Market", value: 800, percent: 0.8 },
          { label: "Technology", value: 200, percent: 0.2 }
        ],
        allocationByGeography: [{ label: "North America", value: 1000, percent: 1 }],
        holdings: [],
        cashBalances: [],
        transactions: [],
        totalCash: 0,
        totalHoldingsCost: 0,
        totalHoldingsMarketValue: 1000,
        investedAmount: 1000,
        unrealizedGainLoss: 0,
        unrealizedGainLossPercent: 0,
        realizedGainLoss: 0,
        allocationByType: [],
        currencyExposure: [],
        topWinners: [],
        topLosers: [],
        performance: [],
        productPerformance: [],
        cashPerformance: [],
        cashPercent: 0,
        investedPercent: 1,
        benchmarkComparisons: []
      })
    } as never,
    {
      getLatestReport: async () => ({
        id: "review-1",
        portfolioId: "portfolio-1",
        portfolioReviewRunId: null,
        reviewDate: "2026-06-04",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-04",
        status: "draft",
        executiveSummary: "Broadly healthy",
        allocationReview: { score: 80, summary: "", findings: [], metrics: {} },
        concentrationReview: { score: 59, summary: "", findings: [], metrics: {} },
        diversificationReview: { score: 79, summary: "", findings: [], metrics: {} },
        riskReview: { score: 88, summary: "", findings: [], metrics: {} },
        macroFitReview: { score: 72, summary: "", findings: [], metrics: {} },
        recommendationAlignmentReview: { score: 70, summary: "", findings: [], metrics: {} },
        fixedIncomeReview: { score: 79, summary: "", findings: [], metrics: {} },
        themeExposureReview: { score: 70, summary: "", findings: [], metrics: {} },
        geographyReview: { score: 65, summary: "", findings: [], metrics: {} },
        watchAreas: [],
        portfolioImprovementSuggestions: [],
        potentialActions: [],
        dataLimitations: [],
        overallPortfolioScore: 77,
        confidenceScore: 80,
        inputsSnapshot: {
          lookthroughExposure: {
            coverage: { etfCount: 3, etfsWithSectorExposure: 3, etfsWithCountryExposure: 3 },
            sectorExposures: [
              { exposureName: "Technology", exposureWeight: 0.3058 },
              { exposureName: "Healthcare", exposureWeight: 0.0587 }
            ],
            countryExposures: [
              { exposureName: "United States", exposureWeight: 0.7293 },
              { exposureName: "International", exposureWeight: 0.2707 }
            ],
            holdingExposures: [
              { holdingSymbol: "MSFT", holdingName: "Microsoft", totalWeight: 0.11, directWeight: 0.06, indirectWeight: 0.05 }
            ]
          }
        },
        createdAt: now,
        updatedAt: now
      })
    } as never,
    { listLatestRecommendations: async () => [] } as never,
    { getLatestPublishedReport: async () => null } as never,
    {
      getDashboard: async () => ({
        overview: { evaluatedOutcomes: 0, coverage: { recommendationCoverage: null } },
        factorOutcomes: [],
        bestFactors: [],
        worstFactors: [],
        confidenceCalibration: [],
        marketVisionOutcomes: [],
        portfolioReviewOutcomes: []
      })
    } as never,
    repository
  );

  const context = await builder.build({
    question: "What is my sector exposure?",
    category: "etf",
    userId: "user-1",
    portfolioId: "portfolio-1",
    conversationId: "conversation-1"
  });

  assert.equal(context.exposures.source, "lookthrough");
  assert.deepEqual(context.exposures.sectors.slice(0, 2), [
    { label: "Technology", percent: 0.3058 },
    { label: "Healthcare", percent: 0.0587 }
  ]);
  assert.equal(context.exposures.sectors.some((item) => item.label === "Multi-Asset / Broad Market"), false);
  assert.equal(context.indirectHoldings[0].symbol, "MSFT");
});
