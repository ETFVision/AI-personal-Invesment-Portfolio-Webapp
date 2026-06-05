import type { JobRunRepository } from "@/application/ports/repositories/JobRunRepository";
import type { JobRunStatus } from "@/domain/jobs/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractErrors(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const errors = value.errors;
  if (Array.isArray(errors)) return errors.map(String).filter(Boolean);
  if (typeof errors === "string" && errors.trim()) return [errors];
  const metadata = value.metadata;
  if (isRecord(metadata)) return extractErrors(metadata);
  return [];
}

function inferStatus(value: unknown, errors: string[]): JobRunStatus {
  if (isRecord(value)) {
    const explicit = value.status;
    if (explicit === "success" || explicit === "partial_success" || explicit === "failed" || explicit === "skipped") return explicit;
    if (typeof value.ok === "boolean") return value.ok ? (errors.length > 0 ? "partial_success" : "success") : "failed";
    const metadata = value.metadata;
    if (isRecord(metadata) && typeof metadata.ok === "boolean") {
      return metadata.ok ? (errors.length > 0 ? "partial_success" : "success") : "failed";
    }
  }
  return errors.length > 0 ? "partial_success" : "success";
}

function summarize(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const summary: Record<string, unknown> = {};
  for (const [key, source] of Object.entries({ ...metadata, ...value })) {
    if (["providerMetadata", "raw", "data"].includes(key)) continue;
    if (typeof source === "string" || typeof source === "number" || typeof source === "boolean" || source === null) {
      summary[key] = source;
    }
  }
  return summary;
}

export class JobRunService {
  constructor(private readonly repository: JobRunRepository) {}

  listRecent(limit = 30) {
    return this.repository.listRecent(limit);
  }

  async runManual(jobName: string, run: () => Promise<unknown>) {
    const startedAt = new Date();
    try {
      const result = await run();
      const completedAt = new Date();
      const errors = extractErrors(result);
      const status = inferStatus(result, errors);
      await this.repository.record({
        jobName,
        runSource: "manual_ui",
        status,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        summary: summarize(result),
        errorMessage: errors[0] ?? null,
        metadata: isRecord(result) ? result : { result }
      });
      return { status, summary: summarize(result), errors, result };
    } catch (error) {
      const completedAt = new Date();
      const message = error instanceof Error ? error.message : "Unknown manual job error.";
      await this.repository.record({
        jobName,
        runSource: "manual_ui",
        status: "failed",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        summary: {},
        errorMessage: message,
        metadata: { message }
      });
      return { status: "failed" as const, summary: {}, errors: [message], result: null };
    }
  }
}
