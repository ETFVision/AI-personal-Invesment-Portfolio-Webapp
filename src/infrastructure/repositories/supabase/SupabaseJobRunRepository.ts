import type { JobRunRepository, RecordJobRunInput } from "@/application/ports/repositories/JobRunRepository";
import type { JobRun, JobRunStatus } from "@/domain/jobs/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

function mapJobRun(row: any): JobRun {
  return {
    id: row.id,
    jobName: row.job_name,
    runSource: row.run_source,
    status: row.status as JobRunStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    summary: row.summary ?? {},
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

export class SupabaseJobRunRepository implements JobRunRepository {
  private readonly db = createSupabaseAdminClient();

  async listRecent(limit = 30): Promise<JobRun[]> {
    const { data, error } = await this.db
      .from("job_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) {
      const message = error.message ?? "";
      if (message.includes("job_runs") || message.includes("schema cache")) return [];
      throw error;
    }
    return (data ?? []).map(mapJobRun);
  }

  async record(input: RecordJobRunInput): Promise<void> {
    const { error } = await this.db.from("job_runs").insert({
      job_name: input.jobName,
      run_source: input.runSource,
      status: input.status,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      duration_ms: input.durationMs,
      summary: input.summary,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {}
    });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("job_runs") || message.includes("schema cache")) return;
      throw error;
    }
  }
}
