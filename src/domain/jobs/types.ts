export type JobRunStatus = "success" | "partial_success" | "failed" | "skipped";

export type JobRun = {
  id: string;
  jobName: string;
  runSource: string;
  status: JobRunStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  summary: Record<string, unknown>;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
