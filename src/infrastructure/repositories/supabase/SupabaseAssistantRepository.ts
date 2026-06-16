import type {
  AssistantRepository,
  AssistantUsageSummary,
  CreateAssistantConversationInput,
  CreateAssistantMessageInput,
  CreateAssistantUsageLogInput
} from "@/application/ports/repositories/AssistantRepository";
import type { AssistantConversation, AssistantMessage, AssistantUsageLog } from "@/domain/assistant/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingAssistantTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || (error?.message ?? "").toLowerCase().includes("assistant_");
}

function numberOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapConversation(row: any): AssistantConversation {
  return {
    id: row.id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    title: row.title,
    latestQuestionCategory: row.latest_question_category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMessage(row: any): AssistantMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    role: row.role,
    questionCategory: row.question_category,
    content: row.content,
    metadata: objectValue(row.metadata),
    tokenUsage: objectValue(row.token_usage),
    costEstimate: numberOrNull(row.cost_estimate),
    responseTimeMs: row.response_time_ms == null ? null : Number(row.response_time_ms),
    createdAt: row.created_at
  };
}

function mapUsage(row: any): AssistantUsageLog {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    questionCategory: row.question_category,
    supported: Boolean(row.supported),
    modelUsed: row.model_used,
    promptTokens: Number(row.prompt_tokens ?? 0),
    completionTokens: Number(row.completion_tokens ?? 0),
    estimatedCost: numberOrNull(row.estimated_cost),
    responseTimeMs: row.response_time_ms == null ? null : Number(row.response_time_ms),
    createdAt: row.created_at
  };
}

export class SupabaseAssistantRepository implements AssistantRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async createConversation(input: CreateAssistantConversationInput) {
    const { data, error } = await this.db.from("assistant_conversations").insert({
      user_id: input.userId,
      portfolio_id: input.portfolioId,
      title: input.title,
      latest_question_category: input.latestQuestionCategory ?? null
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mapConversation(data);
  }

  async updateConversation(input: Parameters<AssistantRepository["updateConversation"]>[0]) {
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = input.title;
    if (input.latestQuestionCategory !== undefined) payload.latest_question_category = input.latestQuestionCategory;
    if (input.status !== undefined) payload.status = input.status;
    if (Object.keys(payload).length === 0) return;
    const { error } = await this.db.from("assistant_conversations").update(payload).eq("id", input.conversationId);
    if (isMissingAssistantTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async countTodayConversations(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error } = await this.db
      .from("assistant_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfDay.toISOString());
    if (isMissingAssistantTable(error)) return 0;
    if (error) return 0;
    return count ?? 0;
  }

  async getConversation(conversationId: string) {
    const { data, error } = await this.db.from("assistant_conversations").select("*").eq("id", conversationId).maybeSingle();
    if (isMissingAssistantTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapConversation(data) : null;
  }

  async listConversations(userId: string, limit = 10) {
    const { data, error } = await this.db
      .from("assistant_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (isMissingAssistantTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapConversation);
  }

  async createMessage(input: CreateAssistantMessageInput) {
    const { data, error } = await this.db.from("assistant_messages").insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      portfolio_id: input.portfolioId,
      role: input.role,
      question_category: input.questionCategory ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
      token_usage: input.tokenUsage ?? {},
      cost_estimate: input.costEstimate ?? null,
      response_time_ms: input.responseTimeMs ?? null
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mapMessage(data);
  }

  async listMessages(conversationId: string, limit = 20) {
    const { data, error } = await this.db
      .from("assistant_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (isMissingAssistantTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMessage).reverse();
  }

  async createUsageLog(input: CreateAssistantUsageLogInput) {
    const { data, error } = await this.db.from("assistant_usage_logs").insert({
      conversation_id: input.conversationId ?? null,
      user_id: input.userId,
      portfolio_id: input.portfolioId,
      question_category: input.questionCategory ?? null,
      supported: input.supported,
      model_used: input.modelUsed ?? null,
      prompt_tokens: input.promptTokens ?? 0,
      completion_tokens: input.completionTokens ?? 0,
      estimated_cost: input.estimatedCost ?? null,
      response_time_ms: input.responseTimeMs ?? null
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mapUsage(data);
  }

  async listUsageLogs(limit = 100) {
    const { data, error } = await this.db
      .from("assistant_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (isMissingAssistantTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapUsage);
  }

  async getUsageSummary(limit = 250): Promise<AssistantUsageSummary> {
    const logs = await this.listUsageLogs(limit);
    const byCategoryMap = new Map<string, { category: string; count: number; cost: number; promptTokens: number; completionTokens: number }>();
    for (const log of logs) {
      const category = log.questionCategory ?? "unknown";
      const row = byCategoryMap.get(category) ?? { category, count: 0, cost: 0, promptTokens: 0, completionTokens: 0 };
      row.count += 1;
      row.cost += log.estimatedCost ?? 0;
      row.promptTokens += log.promptTokens;
      row.completionTokens += log.completionTokens;
      byCategoryMap.set(category, row);
    }
    const responseTimes = logs.map((log) => log.responseTimeMs).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return {
      totalQuestions: logs.length,
      supportedQuestions: logs.filter((log) => log.supported).length,
      unsupportedQuestions: logs.filter((log) => !log.supported).length,
      totalPromptTokens: logs.reduce((sum, log) => sum + log.promptTokens, 0),
      totalCompletionTokens: logs.reduce((sum, log) => sum + log.completionTokens, 0),
      totalCost: logs.reduce((sum, log) => sum + (log.estimatedCost ?? 0), 0),
      averageResponseTimeMs: responseTimes.length === 0 ? null : responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length,
      byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.count - a.count),
      recentLogs: logs.slice(0, 20)
    };
  }
}
