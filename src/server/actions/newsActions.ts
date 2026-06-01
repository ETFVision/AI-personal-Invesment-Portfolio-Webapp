"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function runDailyNewsIngestionAction() {
  await createContainer().authProvider.requireUser();
  try {
    const result = await createContainer().jobs.dailyNewsIngestion.run();
    redirect(`/news?message=Fetched%20${result.ingestion.articlesFetched}%20articles%20and%20classified%20${result.classification.classified}.`);
  } catch (error) {
    redirect(`/news?error=${encodeURIComponent(error instanceof Error ? error.message : "News ingestion failed.")}`);
  }
}

export async function runWeeklyNewsReconciliationAction() {
  await createContainer().authProvider.requireUser();
  try {
    const reconciliation = await createContainer().jobs.weeklyNewsReconciliation.run();
    redirect(`/news?message=${encodeURIComponent(`Weekly reconciliation created for ${reconciliation.periodStart} to ${reconciliation.periodEnd}.`)}`);
  } catch (error) {
    redirect(`/news?error=${encodeURIComponent(error instanceof Error ? error.message : "Weekly reconciliation failed.")}`);
  }
}

export async function reclassifyPendingNewsAction() {
  await createContainer().authProvider.requireUser();
  try {
    const result = await createContainer().newsClassificationService.classifyPending();
    redirect(`/news?message=${encodeURIComponent(`Classified ${result.classified} of ${result.requested} pending articles.`)}`);
  } catch (error) {
    redirect(`/news?error=${encodeURIComponent(error instanceof Error ? error.message : "News classification failed.")}`);
  }
}

export async function duplicateOverrideAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const newsItemId = formString(formData, "newsItemId");
  const duplicateOfId = formString(formData, "duplicateOfId") || null;
  await createContainer().newsRepository.markDuplicate(newsItemId, duplicateOfId);
  redirect("/news?message=Duplicate%20status%20updated.");
}
