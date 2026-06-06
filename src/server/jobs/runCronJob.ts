import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import { assertCronAuthorized } from "@/server/jobs/cronAuth";

type JobStatus = "success" | "partial_success" | "failed" | "skipped";

type StructuredJobResponse = {
  status: JobStatus;
  job: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  summary: Record<string, unknown>;
  errors: string[];
  data?: unknown;
};

type RunCronJobOptions = {
  jobName: string;
  lockTtlSeconds?: number;
  runSource?: "github_actions" | "manual_ui" | "vercel_cron" | "supabase_cron" | "local";
};

const allowedRunSources = new Set(["github_actions", "manual_ui", "vercel_cron", "supabase_cron", "local"]);

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

function inferStatus(value: unknown, errors: string[]): JobStatus {
  if (isRecord(value)) {
    const explicit = value.status;
    if (explicit === "success" || explicit === "partial_success" || explicit === "failed" || explicit === "skipped") {
      return explicit;
    }
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

function inferRunSource(request: NextRequest, fallback?: RunCronJobOptions["runSource"]) {
  const header = request.headers.get("x-job-source")?.trim().toLowerCase();
  if (header && allowedRunSources.has(header)) return header as NonNullable<RunCronJobOptions["runSource"]>;
  return fallback ?? "github_actions";
}

async function tryAcquireLock(jobName: string, lockOwner: string, ttlSeconds: number) {
  const db = createSupabaseAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const { data: existing } = await db
    .from("job_locks")
    .select("job_name, expires_at")
    .eq("job_name", jobName)
    .maybeSingle();

  if (existing?.expires_at && new Date(existing.expires_at).getTime() > now.getTime()) {
    return { acquired: false, db };
  }

  await db.from("job_locks").upsert({
    job_name: jobName,
    locked_at: now.toISOString(),
    expires_at: expiresAt,
    lock_owner: lockOwner
  });
  return { acquired: true, db };
}

export async function runCronJob(
  request: NextRequest,
  options: RunCronJobOptions,
  run: () => Promise<unknown>
) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const startedAt = new Date();
  const runSource = inferRunSource(request, options.runSource);
  const lockOwner = `${runSource}-${startedAt.getTime()}`;
  const { acquired, db } = await tryAcquireLock(options.jobName, lockOwner, options.lockTtlSeconds ?? 15 * 60);

  if (!acquired) {
    const completedAt = new Date();
    const response: StructuredJobResponse = {
      status: "skipped",
      job: options.jobName,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      summary: { reason: "job_already_running" },
      errors: []
    };
    await db.from("job_runs").insert({
      job_name: options.jobName,
      run_source: runSource,
      status: response.status,
      started_at: response.started_at,
      completed_at: response.completed_at,
      duration_ms: response.duration_ms,
      summary: response.summary
    });
    return NextResponse.json(response);
  }

  try {
    const data = await run();
    const completedAt = new Date();
    const errors = extractErrors(data);
    const status = inferStatus(data, errors);
    const response: StructuredJobResponse = {
      status,
      job: options.jobName,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      summary: summarize(data),
      errors,
      data
    };
    await db.from("job_runs").insert({
      job_name: options.jobName,
      run_source: runSource,
      status,
      started_at: response.started_at,
      completed_at: response.completed_at,
      duration_ms: response.duration_ms,
      summary: response.summary,
      error_message: errors[0] ?? null,
      metadata: isRecord(data) ? data : { data }
    });
    return NextResponse.json(response, { status: status === "failed" ? 500 : 200 });
  } catch (error) {
    const completedAt = new Date();
    const message = error instanceof Error ? error.message : "Unknown scheduled job error.";
    const response: StructuredJobResponse = {
      status: "failed",
      job: options.jobName,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      summary: {},
      errors: [message]
    };
    await db.from("job_runs").insert({
      job_name: options.jobName,
      run_source: runSource,
      status: "failed",
      started_at: response.started_at,
      completed_at: response.completed_at,
      duration_ms: response.duration_ms,
      summary: response.summary,
      error_message: message,
      metadata: { message }
    });
    return NextResponse.json(response, { status: 500 });
  } finally {
    await db.from("job_locks").delete().eq("job_name", options.jobName).eq("lock_owner", lockOwner);
  }
}
