import type { FundamentalsRefreshService } from "@/application/services/fundamentals/FundamentalsRefreshService";

export class FundamentalsRefreshJob {
  constructor(private readonly service: FundamentalsRefreshService) {}

  run(options: { force?: boolean; symbol?: string } = {}) {
    return this.service.refreshAll(options);
  }
}
