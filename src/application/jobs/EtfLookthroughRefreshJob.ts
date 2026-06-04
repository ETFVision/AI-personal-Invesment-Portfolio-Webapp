import type { EtfLookthroughRefreshService } from "@/application/services/etfLookthrough/EtfLookthroughRefreshService";

export class EtfLookthroughRefreshJob {
  constructor(private readonly service: EtfLookthroughRefreshService) {}

  run(options: { force?: boolean; symbols?: string[] } = {}) {
    return this.service.refresh(options);
  }
}
