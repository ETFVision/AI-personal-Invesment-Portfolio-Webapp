import type { JobRun } from "@/domain/jobs/types";

export type RecordJobRunInput = {
  jobName: string;
  runSource: string;
  status: JobRun["status"];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  summary: Record<string, unknown>;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export interface JobRunRepository {
  listRecent(limit?: number): Promise<JobRun[]>;
  record(input: RecordJobRunInput): Promise<void>;
}
