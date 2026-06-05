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
import { ASSISTANT_UNSUPPORTED_RESPONSE, type AssistantConversation, type AssistantMessage, type AssistantUsageLog } from "../src/domain/assistant/types";

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

test("assistant router maps ETFVision questions and rejects out-of-scope questions", () => {
  const router = new AssistantQuestionRouter();
  assert.equal(router.route("Why is my portfolio score 77?").category, "portfolio_review");
  assert.equal(router.route("What are my biggest risks?").category, "risk");
  assert.equal(router.route("Tell me a joke about markets").supported, false);
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
    question: "Tell me a joke",
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
