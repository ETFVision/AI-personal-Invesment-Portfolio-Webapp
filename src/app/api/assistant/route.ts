import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/server/container";

export async function POST(request: NextRequest) {
  try {
    const container = createContainer();
    const authUser = await container.authProvider.getCurrentUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { question?: unknown; conversationId?: unknown };
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });
    const { user, portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
    if (!portfolio) return NextResponse.json({ error: "Portfolio is required before using the assistant." }, { status: 400 });

    const answer = await container.portfolioAssistantService.answer({
      question,
      userId: user.id,
      portfolioId: portfolio.id,
      conversationId: typeof body.conversationId === "string" ? body.conversationId : null
    });

    return NextResponse.json({
      conversationId: answer.conversation.id,
      route: answer.route,
      message: {
        id: answer.assistantMessage.id,
        role: answer.assistantMessage.role,
        content: answer.assistantMessage.content,
        createdAt: answer.assistantMessage.createdAt
      },
      userMessage: {
        id: answer.userMessage.id,
        role: answer.userMessage.role,
        content: answer.userMessage.content,
        createdAt: answer.userMessage.createdAt
      },
      costEstimate: answer.costEstimate,
      responseTimeMs: answer.responseTimeMs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    if (message.includes("Daily conversation limit")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
