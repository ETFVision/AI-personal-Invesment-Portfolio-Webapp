import type { JobRun } from "@/domain/jobs/types";

export interface JobRunRepository {
  listRecent(limit?: number): Promise<JobRun[]>;
}
