import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { formatNumber } from "@/lib/utils";

function money(value: number | null | undefined) {
  if (value == null) return "Cost not configured";
  return `$${value.toFixed(6)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore"
  }).format(new Date(value));
}

export default async function AssistantUsagePage() {
  const container = createContainer();
  await container.authProvider.requireUser();
  const summary = await measureRenderStep("admin-assistant-usage:usage-summary", () =>
    container.assistantRepository.getUsageSummary(500)
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="AI Usage"
        description="Portfolio Assistant usage, token and cost tracking. Unsupported questions are logged without invoking the model."
        meta={
          <>
            <StatusBadge tone="info">Portfolio Assistant</StatusBadge>
            <StatusBadge tone="neutral">Latest 500 usage rows</StatusBadge>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Questions" value={summary.totalQuestions} footer={`${summary.supportedQuestions} supported / ${summary.unsupportedQuestions} unsupported`} />
        <MetricCard title="Prompt tokens" value={formatNumber(summary.totalPromptTokens, 0)} footer="Input tokens" />
        <MetricCard title="Completion tokens" value={formatNumber(summary.totalCompletionTokens, 0)} footer="Output tokens" />
        <MetricCard title="Estimated cost" value={money(summary.totalCost)} footer={summary.averageResponseTimeMs == null ? "No response timing yet" : `${Math.round(summary.averageResponseTimeMs)}ms average response`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Category Cost</CardTitle>
            <CardDescription>Cost and volume by routed question category.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.byCategory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No assistant usage has been logged yet.</p>
            ) : (
              <div className="space-y-3">
                {summary.byCategory.map((item) => (
                  <div key={item.category} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium capitalize text-slate-950">{item.category.replaceAll("_", " ")}</p>
                      <p className="font-semibold text-slate-950">{money(item.cost)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.count} questions - {formatNumber(item.promptTokens, 0)} input / {formatNumber(item.completionTokens, 0)} output tokens</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Usage Logs</CardTitle>
            <CardDescription>Latest assistant requests including unsupported routed questions.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentLogs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No usage logs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="pb-3">Time</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Model</th>
                      <th className="pb-3 text-right">Input</th>
                      <th className="pb-3 text-right">Output</th>
                      <th className="pb-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 text-slate-600">{formatDate(log.createdAt)}</td>
                        <td className="py-3">
                          <StatusBadge tone={log.supported ? "info" : "neutral"}>{String(log.questionCategory ?? "unknown").replaceAll("_", " ")}</StatusBadge>
                        </td>
                        <td className="py-3 text-slate-600">{log.modelUsed ?? "No model call"}</td>
                        <td className="py-3 text-right">{formatNumber(log.promptTokens, 0)}</td>
                        <td className="py-3 text-right">{formatNumber(log.completionTokens, 0)}</td>
                        <td className="py-3 text-right font-medium">{money(log.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
