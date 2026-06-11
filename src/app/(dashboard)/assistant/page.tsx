import Link from "next/link";
import { Bot, Clock3, ShieldCheck } from "lucide-react";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { PortfolioAssistantDrawer } from "@/components/assistant/portfolio-assistant-drawer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";

type AssistantPageProps = {
  searchParams?: Promise<{ conversationId?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore"
  }).format(new Date(value));
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { user, portfolio } = await measureRenderStep("assistant:portfolio-context", () =>
    container.portfolioService.getOrCreateDefaultPortfolio(authUser)
  );
  const conversations = await measureRenderStep(`assistant:${user.id}:conversation-list`, () =>
    container.assistantRepository.listConversations(user.id, 12)
  );
  const requestedConversation = await measureRenderStep(`assistant:${user.id}:selected-conversation`, () =>
    params?.conversationId
      ? container.assistantRepository.getConversation(params.conversationId)
      : Promise.resolve(conversations[0] ?? null)
  );
  const selectedConversation = requestedConversation?.userId === user.id ? requestedConversation : null;
  const selectedMessages = await measureRenderStep(`assistant:${user.id}:selected-messages`, () =>
    selectedConversation
      ? container.assistantRepository.listMessages(selectedConversation.id, 20)
      : Promise.resolve([])
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Portfolio Assistant"
        description="Ask portfolio-aware questions using ETFVision intelligence. The assistant explains existing evidence and does not create trades or new investment recommendations."
        meta={
          <>
            <StatusBadge tone="info">Scope-limited</StatusBadge>
            <StatusBadge tone="neutral">Portfolio: {portfolio?.name ?? "Default"}</StatusBadge>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[320px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Stored assistant history for follow-up context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No assistant conversations yet.</p>
            ) : conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/assistant?conversationId=${conversation.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-teal-300"
              >
                <p className="line-clamp-2 font-medium text-slate-950">{conversation.title}</p>
                <p className="mt-1 text-xs text-slate-500">{conversation.latestQuestionCategory ?? "portfolio"} - {formatDate(conversation.updatedAt)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <PortfolioAssistantDrawer
          mode="embedded"
          initialConversationId={selectedConversation?.id ?? null}
          initialMessages={selectedMessages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({
              id: message.id,
              role: message.role as "user" | "assistant",
              content: message.content,
              createdAt: message.createdAt
            }))}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assistant Scope</CardTitle>
              <CardDescription>Designed for ETFVision intelligence only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Bot className="mt-0.5 h-4 w-4 text-teal-700" />
                <p>Explains portfolio reviews, risk, insights, Market Vision, telemetry, ETF exposures and monitoring.</p>
              </div>
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-teal-700" />
                <p>Does not provide buy/sell instructions, position sizing, target allocations or return predictions.</p>
              </div>
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-teal-700" />
                <p>Uses recent conversation history for follow-up questions while keeping context focused and cost-controlled.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
