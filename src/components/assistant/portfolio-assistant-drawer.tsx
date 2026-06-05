"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

const suggestedQuestions = [
  "Why is my portfolio score 77?",
  "What changed this week?",
  "What are my biggest risks?",
  "How does Market Vision affect me?",
  "Why is VOO a Buy?",
  "Which factors have worked best?",
  "How diversified am I?"
];

async function parseAssistantResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 240) || "Assistant returned a non-JSON response." };
  }
}

export function PortfolioAssistantDrawer({
  mode = "floating",
  initialConversationId = null,
  initialMessages = []
}: {
  mode?: "floating" | "embedded";
  initialConversationId?: string | null;
  initialMessages?: AssistantChatMessage[];
}) {
  const [open, setOpen] = useState(mode === "embedded");
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isPending) return;
    setError(null);
    const optimisticUserMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };
    setMessages((current) => [...current, optimisticUserMessage]);
    setQuestion("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed, conversationId })
        });
        const payload = await parseAssistantResponse(response);
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Assistant request failed.");
        if (typeof payload.conversationId === "string") setConversationId(payload.conversationId);
        const message = payload.message as AssistantChatMessage | undefined;
        if (!message?.id || !message.content || message.role !== "assistant") throw new Error("Assistant response was incomplete.");
        setMessages((current) => [...current, message]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assistant request failed.");
      }
    });
  }

  const panel = (
    <div className={cn(
      "flex h-full flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl",
      mode === "embedded" ? "min-h-[720px] rounded-2xl shadow-[0_18px_55px_rgba(15,23,42,0.08)]" : "fixed inset-y-0 right-0 z-50 w-full max-w-md"
    )}>
      <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Portfolio Assistant</p>
            <h2 className="mt-1 text-lg font-semibold">ETFVision intelligence interface</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">Ask about your portfolio, reviews, risk, Market Vision, recommendations, telemetry and ETF exposures.</p>
          </div>
          {mode === "floating" ? (
            <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestedQuestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => submit(item)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-800"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">Learning interface ready</p>
            <p className="mt-2 leading-6">The assistant explains ETFVision intelligence. It does not create trades, target allocations, or new recommendations.</p>
          </div>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className={cn("rounded-xl p-3 text-sm leading-6 shadow-sm", message.role === "user" ? "ml-8 bg-teal-700 text-white" : "mr-8 border border-slate-200 bg-white text-slate-700")}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {isPending ? (
          <div className="mr-8 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading ETFVision context...
          </div>
        ) : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
      </div>

      <form
        className="border-t border-slate-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
      >
        <label className="sr-only" htmlFor={mode === "embedded" ? "assistant-question-page" : "assistant-question-drawer"}>Ask Portfolio Assistant</label>
        <div className="flex items-end gap-2">
          <textarea
            id={mode === "embedded" ? "assistant-question-page" : "assistant-question-drawer"}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            placeholder="Ask about your portfolio, risk, recommendations or ETF exposures..."
            className="min-h-12 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
          />
          <Button type="submit" size="icon" disabled={isPending || !question.trim()} aria-label="Send assistant question">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Scope-limited. No buy/sell instructions, position sizing or return predictions.</p>
      </form>
    </div>
  );

  if (mode === "embedded") return panel;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-slate-900"
      >
        <Bot className="h-4 w-4" />
        Assistant
      </button>
      {open ? (
        panel
      ) : null}
    </>
  );
}
