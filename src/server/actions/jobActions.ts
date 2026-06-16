"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

export async function runTelemetryEvaluationAction() {
  const container = createContainer();
  await container.authProvider.requireAdmin();
  const result = await container.jobRunService.runManual("telemetry-evaluation", () => container.jobs.telemetryEvaluation.run());

  revalidatePath("/admin/jobs");
  revalidatePath("/telemetry");

  const params = new URLSearchParams({
    jobsMessage: `Telemetry evaluation ${result.status}: ${String(result.summary.message ?? "Completed manual run.")}`
  });
  if (result.errors.length > 0) params.set("jobsError", result.errors.join(" | "));
  redirect(`/admin/jobs?${params.toString()}`);
}
