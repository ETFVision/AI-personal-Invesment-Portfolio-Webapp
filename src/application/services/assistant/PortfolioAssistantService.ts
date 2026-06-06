import type { AssistantRepository } from "@/application/ports/repositories/AssistantRepository";
import type { AiPortfolioAssistantProvider } from "@/application/ports/providers/AiPortfolioAssistantProvider";
import {
  ASSISTANT_ADVICE_BLOCKED_RESPONSE,
  ASSISTANT_GENERAL_KNOWLEDGE_BLOCKED_RESPONSE,
  ASSISTANT_UNSUPPORTED_RESPONSE,
  type AssistantAnswer,
  type AssistantRouteResult
} from "../../../domain/assistant/types";
import { AssistantContextBuilder } from "./AssistantContextBuilder";
import { AssistantPromptBuilder } from "./AssistantPromptBuilder";
import { AssistantQuestionRouter } from "./AssistantQuestionRouter";
import { AssistantResponseGuardrailService } from "./AssistantResponseGuardrailService";

function titleFromQuestion(question: string) {
  const cleaned = question.trim().replace(/\s+/g, " ");
  return cleaned.length <= 60 ? cleaned : `${cleaned.slice(0, 57)}...`;
}

function tokensFromUsage(usage: Record<string, unknown>) {
  return {
    promptTokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0)
  };
}

function blockedResponse(route: AssistantRouteResult) {
  if (route.blockedIntent === "advice_seeking") return ASSISTANT_ADVICE_BLOCKED_RESPONSE;
  if (route.blockedIntent === "general_knowledge") return ASSISTANT_GENERAL_KNOWLEDGE_BLOCKED_RESPONSE;
  return ASSISTANT_UNSUPPORTED_RESPONSE;
}

export class PortfolioAssistantService {
  constructor(
    private readonly assistantRepository: AssistantRepository,
    private readonly router: AssistantQuestionRouter,
    private readonly contextBuilder: AssistantContextBuilder,
    private readonly promptBuilder: AssistantPromptBuilder,
    private readonly provider: AiPortfolioAssistantProvider,
    private readonly guardrails: AssistantResponseGuardrailService
  ) {}

  async answer(input: {
    question: string;
    userId: string;
    portfolioId: string;
    conversationId?: string | null;
  }): Promise<AssistantAnswer> {
    const startedAt = Date.now();
    const existingConversation = input.conversationId ? await this.assistantRepository.getConversation(input.conversationId) : null;
    const previousMessages = existingConversation ? await this.assistantRepository.listMessages(existingConversation.id, 4) : [];
    const previousCategory = previousMessages.slice().reverse().find((message) => message.questionCategory)?.questionCategory ?? existingConversation?.latestQuestionCategory ?? null;
    const route = this.router.route(input.question, previousCategory);
    const conversation = existingConversation ?? await this.assistantRepository.createConversation({
      userId: input.userId,
      portfolioId: input.portfolioId,
      title: titleFromQuestion(input.question),
      latestQuestionCategory: route.category
    });
    const userMessage = await this.assistantRepository.createMessage({
      conversationId: conversation.id,
      userId: input.userId,
      portfolioId: input.portfolioId,
      role: "user",
      questionCategory: route.category,
      content: input.question,
      metadata: { route }
    });

    if (!route.supported) {
      const responseTimeMs = Date.now() - startedAt;
      const content = blockedResponse(route);
      const assistantMessage = await this.assistantRepository.createMessage({
        conversationId: conversation.id,
        userId: input.userId,
        portfolioId: input.portfolioId,
        role: "assistant",
        questionCategory: route.category,
        content,
        metadata: { route, llmInvoked: false },
        responseTimeMs
      });
      await this.assistantRepository.createUsageLog({
        conversationId: conversation.id,
        userId: input.userId,
        portfolioId: input.portfolioId,
        questionCategory: route.category,
        supported: false,
        responseTimeMs
      });
      await this.assistantRepository.updateConversation({ conversationId: conversation.id, latestQuestionCategory: route.category });
      return { conversation, userMessage, assistantMessage, route, tokenUsage: {}, costEstimate: null, responseTimeMs };
    }

    const context = await this.contextBuilder.build({
      question: input.question,
      category: route.category,
      userId: input.userId,
      portfolioId: input.portfolioId,
      conversationId: conversation.id
    });
    const promptPayload = this.promptBuilder.build({ question: input.question, context });
    const providerResult = await this.provider.answer({
      question: input.question,
      category: route.category,
      context: promptPayload.context,
      responseRequirements: promptPayload.responseRequirements
    });
    const validated = this.guardrails.validate(providerResult.answer);
    const responseTimeMs = Date.now() - startedAt;
    const usageTokens = tokensFromUsage(providerResult.tokenUsage);
    const assistantMessage = await this.assistantRepository.createMessage({
      conversationId: conversation.id,
      userId: input.userId,
      portfolioId: input.portfolioId,
      role: "assistant",
      questionCategory: route.category,
      content: validated.answer,
      metadata: {
        route,
        guardrailPassed: validated.ok,
        dataLimitations: context.dataLimitations
      },
      tokenUsage: providerResult.tokenUsage,
      costEstimate: providerResult.costEstimate,
      responseTimeMs
    });
    await this.assistantRepository.createUsageLog({
      conversationId: conversation.id,
      userId: input.userId,
      portfolioId: input.portfolioId,
      questionCategory: route.category,
      supported: true,
      modelUsed: providerResult.modelUsed,
      promptTokens: usageTokens.promptTokens,
      completionTokens: usageTokens.completionTokens,
      estimatedCost: providerResult.costEstimate,
      responseTimeMs
    });
    await this.assistantRepository.updateConversation({ conversationId: conversation.id, latestQuestionCategory: route.category });
    return {
      conversation,
      userMessage,
      assistantMessage,
      route,
      tokenUsage: providerResult.tokenUsage,
      costEstimate: providerResult.costEstimate,
      responseTimeMs
    };
  }
}
