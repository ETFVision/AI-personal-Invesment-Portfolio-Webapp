import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  return runCronJob(request, { jobName: "universe-validation", lockTtlSeconds: 20 * 60 }, async () => {
    const result = await createContainer().universeManagementService.ensureSeededUniverse();
    return {
      status: "success",
      message: "Seeded universe validation completed.",
      ...result
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
