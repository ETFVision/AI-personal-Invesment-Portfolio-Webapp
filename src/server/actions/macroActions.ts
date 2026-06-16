"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

export async function refreshMacroIndicatorsAction() {
  const container = createContainer();
  await container.authProvider.requireAdmin();
  let target = "/macro?error=FRED%20macro%20refresh%20failed.";
  try {
    const result = await container.jobs.fredMacroIngestion.run();
    target = `/macro?message=${encodeURIComponent(`Refreshed ${result.indicatorsSuccessful} indicators, ${result.observationsInserted} new observations.`)}`;
  } catch (error) {
    target = `/macro?error=${encodeURIComponent(error instanceof Error ? error.message : "FRED macro refresh failed.")}`;
  }
  redirect(target);
}

export async function backfillMacroIndicatorsAction() {
  const container = createContainer();
  await container.authProvider.requireAdmin();
  let target = "/macro?error=FRED%20macro%20backfill%20failed.";
  try {
    const result = await container.jobs.fredMacroIngestion.run({ backfill: true });
    target = `/macro?message=${encodeURIComponent(`Backfilled ${result.indicatorsSuccessful} indicators, ${result.observationsInserted} new observations.`)}`;
  } catch (error) {
    target = `/macro?error=${encodeURIComponent(error instanceof Error ? error.message : "FRED macro backfill failed.")}`;
  }
  redirect(target);
}
