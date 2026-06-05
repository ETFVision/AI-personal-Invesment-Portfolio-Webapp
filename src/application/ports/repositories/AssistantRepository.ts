import type {
  AssistantConversation,
  AssistantConversationStatus,
  AssistantMessage,
  AssistantMessageRole,
  AssistantQuestionCategory,
  AssistantUsageLog
} from "@/domain/assistant/types";

export type CreateAssistantConversationInput = {
  userId: string | null;
  portfolioId: string | null;
  title: string;
  latestQuestionCategory?: AssistantQuestionCategory | string | null;
};

export type CreateAssistantMessageInput = {
  conversationId: string;
  userId: string | null;
  portfolioId: string | null;
  role: AssistantMessageRole;
  questionCategory?: AssistantQuestionCategory | string | null;
  content: string;
  metadata?: Record<string, unknown>;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: number | null;
  responseTimeMs?: number | null;
};

export type CreateAssistantUsageLogInput = {
  conversationId?: string | null;
  userId: string | null;
  portfolioId: string | null;
  questionCategory?: AssistantQuestionCategory | string | null;
  supported: boolean;
  modelUsed?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCost?: number | null;
  responseTimeMs?: number | null;
};

export type AssistantUsageSummary = {
  totalQuestions: number;
  supportedQuestions: number;
  unsupportedQuestions: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  averageResponseTimeMs: number | null;
  byCategory: Array<{
    category: string;
    count: number;
    cost: number;
    promptTokens: number;
    completionTokens: number;
  }>;
  recentLogs: AssistantUsageLog[];
};

export interface AssistantRepository {
  createConversation(input: CreateAssistantConversationInput): Promise<AssistantConversation>;
  updateConversation(input: {
    conversationId: string;
    title?: string;
    latestQuestionCategory?: AssistantQuestionCategory | string | null;
    status?: AssistantConversationStatus;
  }): Promise<void>;
  getConversation(conversationId: string): Promise<AssistantConversation | null>;
  listConversations(userId: string, limit?: number): Promise<AssistantConversation[]>;
  createMessage(input: CreateAssistantMessageInput): Promise<AssistantMessage>;
  listMessages(conversationId: string, limit?: number): Promise<AssistantMessage[]>;
  createUsageLog(input: CreateAssistantUsageLogInput): Promise<AssistantUsageLog>;
  listUsageLogs(limit?: number): Promise<AssistantUsageLog[]>;
  getUsageSummary(limit?: number): Promise<AssistantUsageSummary>;
}
