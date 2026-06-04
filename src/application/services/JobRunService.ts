import type { JobRunRepository } from "@/application/ports/repositories/JobRunRepository";

export class JobRunService {
  constructor(private readonly repository: JobRunRepository) {}

  listRecent(limit = 30) {
    return this.repository.listRecent(limit);
  }
}
