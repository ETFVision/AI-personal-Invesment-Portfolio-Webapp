import { createContainer } from "@/server/container";
import { runTelemetryEvaluationAction } from "@/server/actions/jobActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";

type JobsPageProps = {
  searchParams?: Promise<{
    jobsMessage?: string;
    jobsError?: string;
  }>;
};

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
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" | ");
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const runs = await container.jobRunService.listRecent(30);
  const params = await searchParams;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Jobs"
        description="Latest scheduled and manual refresh summaries from the app job endpoints."
        meta={<StatusBadge tone="info">{runs.length} recent runs</StatusBadge>}
      />
      {params?.jobsMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {params.jobsMessage}
        </div>
      ) : null}
      {params?.jobsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {params.jobsError}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Manual evaluation controls</CardTitle>
          <CardDescription>
            Operational controls for admin-only catch-up runs. Supabase Cron is the normal automation path; GitHub workflows remain manual fallbacks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-950">Telemetry evaluation</p>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Checks matured telemetry snapshots, evaluates ready horizons and refreshes factor evidence. This does not change recommendations or portfolio review logic.
            </p>
          </div>
          <form action={runTelemetryEvaluationAction}>
            <SubmitButton pendingLabel="Evaluating telemetry...">Run telemetry evaluation</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent job runs</CardTitle>
          <CardDescription>Stored from protected refresh endpoints called by Supabase Cron, manual controls or fallback GitHub workflows.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {runs.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No scheduled job runs recorded yet. Runs will appear here after the new migration is applied and a protected job endpoint is called.
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Job</th>
                  <th className="py-2 pr-4 font-medium">Source</th>
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
                    <td className="py-3 pr-4 text-muted-foreground">{run.runSource.replace("_", " ")}</td>
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
