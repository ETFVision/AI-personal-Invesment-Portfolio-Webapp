"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";
import { emptyPortfolioImplications } from "@/application/services/marketVision/MarketVisionService";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function lines(formData: FormData, key: string) {
  return formString(formData, key)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function portfolioImplicationsFromForm(formData: FormData) {
  return {
    ...emptyPortfolioImplications,
    equityAllocationImplication: formString(formData, "equityAllocationImplication"),
    bondAllocationImplication: formString(formData, "bondAllocationImplication"),
    goldImplication: formString(formData, "goldImplication"),
    cryptoImplication: formString(formData, "cryptoImplication"),
    cashImplication: formString(formData, "cashImplication"),
    riskImplication: formString(formData, "riskImplication"),
    watchlistImplication: formString(formData, "watchlistImplication")
  };
}

export async function createMarketVisionDraftAction() {
  await createContainer().authProvider.requireUser();
  const report = await createContainer().marketVisionService.createDraft();
  redirect(`/market-vision?reportId=${report.id}&message=Draft%20created.`);
}

export async function createMarketVisionDraftFromLatestNewsAction() {
  await createContainer().authProvider.requireUser();
  const container = createContainer();
  const weekly = await container.newsRepository.getLatestWeeklyReconciliation();
  const report = await container.marketVisionService.createDraft({
    title: weekly ? `Market Vision - ${weekly.periodEnd}` : undefined,
    reportDate: weekly?.periodEnd,
    reportPeriodStart: weekly?.periodStart ?? undefined,
    reportPeriodEnd: weekly?.periodEnd ?? undefined,
    globalMarketSummary: weekly?.macroSummary ?? "",
    equityView: weekly?.equitiesSummary ?? "",
    bondView: weekly?.bondsSummary ?? "",
    goldView: weekly?.goldSummary ?? "",
    cryptoView: weekly?.cryptoSummary ?? "",
    ratesView: weekly?.ratesSummary ?? "",
    inflationView: weekly?.inflationSummary ?? "",
    currencyView: weekly?.currencySummary ?? "",
    geopoliticalRiskView: weekly?.geopoliticalSummary ?? "",
    opportunities: weekly?.keyOpportunities ?? [],
    risks: weekly?.keyRisks ?? []
  });
  redirect(`/market-vision?reportId=${report.id}&message=Draft%20created%20from%20latest%20news%20reconciliation.`);
}

export async function saveMarketVisionDraftAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const reportId = formString(formData, "reportId");
  const report = await createContainer().marketVisionService.saveDraft({
    id: reportId,
    reportDate: formString(formData, "reportDate"),
    reportPeriodStart: formString(formData, "reportPeriodStart") || null,
    reportPeriodEnd: formString(formData, "reportPeriodEnd") || null,
    title: formString(formData, "title"),
    executiveSummary: formString(formData, "executiveSummary"),
    globalMarketSummary: formString(formData, "globalMarketSummary"),
    equityView: formString(formData, "equityView"),
    bondView: formString(formData, "bondView"),
    goldView: formString(formData, "goldView"),
    cryptoView: formString(formData, "cryptoView"),
    ratesView: formString(formData, "ratesView"),
    inflationView: formString(formData, "inflationView"),
    currencyView: formString(formData, "currencyView"),
    geopoliticalRiskView: formString(formData, "geopoliticalRiskView"),
    opportunities: lines(formData, "opportunities"),
    risks: lines(formData, "risks"),
    portfolioImplications: portfolioImplicationsFromForm(formData),
    sourceType: "manual",
    status: "draft"
  });
  redirect(`/market-vision?reportId=${report.id}&message=Draft%20saved.`);
}

export async function publishMarketVisionReportAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const reportId = formString(formData, "reportId");
  await createContainer().marketVisionService.publishReport(reportId);
  redirect(`/market-vision?reportId=${reportId}&message=Report%20published.`);
}

export async function archiveMarketVisionReportAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const reportId = formString(formData, "reportId");
  await createContainer().marketVisionService.archiveReport(reportId);
  redirect(`/market-vision?message=Report%20archived.`);
}
