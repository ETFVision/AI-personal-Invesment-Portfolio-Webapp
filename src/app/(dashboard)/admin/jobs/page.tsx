import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";

function statusClass(status: string) {
  if (status === "success") return "bg-emerald-100 text-emerald-800";
  if (status === "partial_success") return "bg-amber-100 text-amber-800";
  if (status === "skipped") return "bg-slate-100 text-slate-700";
  return "bg-rose-100 text-rose-800";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore"
  }).format(new Date(value));
}

function formatDuration(durationMs: number | null) {
  if (durationMs == null) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function summarize(summary: Record<string, unknown>) {
  const entries = Object.entries(summary)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 4);
  if (entries.length === 0) return "No summary payload.";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

export default async function JobsPage() {
  const container = createContainer();
  await container.authProvider.requireUser();
  const runs = await container.jobRunService.listRecent(30);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Jobs"
        description="Latest scheduled and manual refresh summaries from the app job endpoints."
        meta={<StatusBadge tone="info">{runs.length} recent runs</StatusBadge>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent job runs</CardTitle>
          <CardDescription>Stored from protected refresh endpoints called by GitHub Actions or manual controls.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {runs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No scheduled job runs recorded yet. Runs will appear here after the new migration is applied and a protected job endpoint is called.
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Job</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Started</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                  <th className="py-2 pr-4 font-medium">Summary</th>
                  <th className="py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{run.jobName}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(run.status)}`}>
                        {run.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(run.startedAt)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDuration(run.durationMs)}</td>
                    <td className="max-w-[360px] py-3 pr-4 text-muted-foreground">{summarize(run.summary)}</td>
                    <td className="max-w-[260px] py-3 text-muted-foreground">{run.errorMessage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
