"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function classifyBackfill(container: ReturnType<typeof createContainer>) {
  return container.newsClassificationService.classifyPending();
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
    const result = await container.jobs.gdeltNewsIngestion.run();
    const suffix = result.skipped
      ? result.skippedReason === "not_due"
        ? "No GDELT query group is due yet. The next scheduled batch will run later."
        : "GDELT ingestion is disabled. Set ENABLE_GDELT_INGESTION=true and redeploy/restart."
      : `GDELT queued batch fetched ${result.articlesFetched}, saved ${result.articlesInserted}, filtered ${result.articlesFiltered}, duplicates ${result.duplicatesDetected}, failed query groups ${result.failedQueryGroups}${result.rateLimitHit ? ". Rate limit hit; this group was backed off automatically." : "."}`;
    const classification = await classifyBackfill(container);
    target = `/news?source=gdelt&message=${encodeURIComponent(`${suffix} Classified ${classification.classified} pending articles.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "GDELT ingestion failed.")}`;
  }
  redirect(target);
}

export async function runNewsDataNewsIngestionAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=NewsData%20ingestion%20failed.";
  try {
    const result = await container.jobs.newsDataNewsIngestion.run();
    const suffix = result.skipped
      ? result.skippedReason === "not_due"
        ? "No NewsData query group is due yet. The next scheduled batch will run later."
        : "NewsData ingestion is disabled. Set ENABLE_NEWSDATA_INGESTION=true, add NEWSDATA_API_KEY, and redeploy/restart."
      : `NewsData queued batch fetched ${result.articlesFetched}, saved ${result.articlesInserted}, filtered ${result.articlesFiltered}, duplicates ${result.duplicatesDetected}, failed query groups ${result.failedQueryGroups}${result.rateLimitHit ? ". Rate limit or quota hit; this group was backed off automatically." : "."}`;
    const classification = await classifyBackfill(container);
    target = `/news?source=newsdata&message=${encodeURIComponent(`${suffix} Classified ${classification.classified} pending articles.`)}`;
  } catch (error) {
    target = `/news?error=${encodeURIComponent(error instanceof Error ? error.message : "NewsData ingestion failed.")}`;
  }
  redirect(target);
}

export async function runMacroNewsIngestionAction() {
  const container = createContainer();
  await container.authProvider.requireUser();
  let target = "/news?error=Macro%20news%20ingestion%20failed.";
  try {
    const newsDataResult = await container.jobs.newsDataNewsIngestion.run();
    const shouldFallback = newsDataResult.skipped ||
      newsDataResult.rateLimitHit ||
      newsDataResult.articlesInserted === 0 ||
      newsDataResult.failedQueryGroups > 0;
    if (!shouldFallback) {
      const classification = await classifyBackfill(container);
      const suffix = `NewsData macro batch fetched ${newsDataResult.articlesFetched}, saved ${newsDataResult.articlesInserted}, filtered ${newsDataResult.articlesFiltered}, duplicates ${newsDataResult.duplicatesDetected}.`;
      target = `/news?source=newsdata&message=${encodeURIComponent(`${suffix} Classified ${classification.classified} pending articles.`)}`;
    } else {
      const gdeltResult = await container.jobs.gdeltNewsIngestion.run();
      const classification = await classifyBackfill(container);
      const newsDataReason = newsDataResult.skipped
        ? newsDataResult.skippedReason === "not_due"
          ? "NewsData had no due query group"
          : "NewsData is disabled"
        : newsDataResult.rateLimitHit
          ? "NewsData rate limit/quota was hit"
          : newsDataResult.articlesInserted === 0
            ? "NewsData saved no usable articles"
            : "NewsData had a partial query-group failure";
      const gdeltSuffix = gdeltResult.skipped
        ? gdeltResult.skippedReason === "not_due"
          ? "GDELT fallback had no due query group."
          : "GDELT fallback is disabled."
        : `GDELT fallback fetched ${gdeltResult.articlesFetched}, saved ${gdeltResult.articlesInserted}, filtered ${gdeltResult.articlesFiltered}, duplicates ${gdeltResult.duplicatesDetected}, failed query groups ${gdeltResult.failedQueryGroups}.`;
      target = `/news?source=newsdata&message=${encodeURIComponent(`${newsDataReason}; ${gdeltSuffix} Classified ${classification.classified} pending articles.`)}`;
    }
  } catch (error) {
    try {
      const gdeltResult = await container.jobs.gdeltNewsIngestion.run();
      const suffix = gdeltResult.skipped
        ? "NewsData failed; GDELT fallback had no due query group or is disabled."
        : `NewsData failed; GDELT fallback fetched ${gdeltResult.articlesFetched}, saved ${gdeltResult.articlesInserted}, filtered ${gdeltResult.articlesFiltered}, duplicates ${gdeltResult.duplicatesDetected}.`;
      const classification = await classifyBackfill(container);
      target = `/news?source=gdelt&message=${encodeURIComponent(`${suffix} Classified ${classification.classified} pending articles.`)}`;
    } catch (fallbackError) {
      const primaryMessage = error instanceof Error ? error.message : "NewsData ingestion failed.";
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "GDELT fallback failed.";
      target = `/news?error=${encodeURIComponent(`${primaryMessage} Fallback: ${fallbackMessage}`)}`;
    }
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

export async function duplicateOverrideAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const newsItemId = formString(formData, "newsItemId");
  const duplicateOfId = formString(formData, "duplicateOfId") || null;
  await createContainer().newsRepository.markDuplicate(newsItemId, duplicateOfId);
  redirect("/news?message=Duplicate%20status%20updated.");
}
