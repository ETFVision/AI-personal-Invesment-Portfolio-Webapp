import type { TelemetryRepository } from "@/application/ports/repositories/TelemetryRepository";

export class TelemetryDashboardService {
  constructor(private readonly telemetryRepository: TelemetryRepository) {}

  getDashboard() {
    return this.telemetryRepository.getDashboard();
  }
}
