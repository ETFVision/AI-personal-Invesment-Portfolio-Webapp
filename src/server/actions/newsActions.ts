"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function runDailyNewsIngestionAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=News%20ingestion%20failed.";
  try {
    const result = await container.jobs.dailyNewsIngestion.run();
    target = `/news?message=Fetched%20${result.ingestion.articlesFetched}%20articles%20and%20classified%20${result.classification.classified}.`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "News ingestion failed.")}`;
  }
  redirect(target);
}

export async function runGdeltNewsIngestionAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=GDELT%20ingestion%20failed.";
  try {
    const result = await container.jobs.gdeltNewsIngestion.run({ force: true });
    target = `/news?message=${encodeURIComponent(`GDELT fetched ${result.articlesFetched} articles and saved ${result.articlesInserted}.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "GDELT ingestion failed.")}`;
  }
  redirect(target);
}

export async function runWeeklyNewsReconciliationAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=Weekly%20reconciliation%20failed.";
  try {
    const reconciliation = await container.jobs.weeklyNewsReconciliation.run();
    target = `/news?message=${encodeURIComponent(`Weekly reconciliation created for ${reconciliation.periodStart} to ${reconciliation.periodEnd}.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "Weekly reconciliation failed.")}`;
  }
  redirect(target);
}

export async function reclassifyPendingNewsAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=News%20classification%20failed.";
  try {
    const result = await container.newsClassificationService.classifyPending();
    target = `/news?message=${encodeURIComponent(`Classified ${result.classified} of ${result.requested} pending articles.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "News classification failed.")}`;
  }
  redirect(target);
}

export async function reclassifyLatestDeterministicNewsAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=News%20reclassification%20failed.";
  try {
    const result = await container.newsClassificationService.reclassifyLatestDeterministic();
    target = `/news?message=${encodeURIComponent(`Reclassified ${result.reclassified} of ${result.requested} latest deterministic articles.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "News reclassification failed.")}`;
  }
  redirect(target);
}

export async function reclassifyCurrentWeekDeterministicNewsAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=Weekly%20news%20reclassification%20failed.";
  try {
    const latest = await container.newsRepository.getLatestWeeklyReconciliation();
    if (!latest) throw new Error("Run Weekly reconcile once before reclassifying the current week.");
    const result = await container.newsClassificationService.reclassifyDeterministicForPeriod(latest.periodStart, latest.periodEnd);
    target = `/news?message=${encodeURIComponent(`Reclassified ${result.reclassified} of ${result.requested} deterministic articles for ${result.periodStart} to ${result.periodEnd}.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "Weekly news reclassification failed.")}`;
  }
  redirect(target);
}

export async function duplicateOverrideAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const newsItemId = formString(formData, "newsItemId");
  const duplicateOfId = formString(formData, "duplicateOfId") || null;
  await createContainer().newsRepository.markDuplicate(newsItemId, duplicateOfId);
  redirect("/news?message=Duplicate%20status%20updated.");
}
