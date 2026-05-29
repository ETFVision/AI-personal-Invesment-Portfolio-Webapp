"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { createContainer } from "@/server/container";
import {
  cashBalanceSchema,
  holdingSchema,
  setupPortfolioSchema,
  transactionSchema
} from "@/domain/portfolio/validation";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return raw == null ? undefined : String(raw);
}

function validationMessage(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Invalid input";
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

async function requirePortfolioId() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");
  return portfolio.id;
}

export async function setupPortfolioAction(formData: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  try {
    const input = setupPortfolioSchema.parse({
      name: value(formData, "name"),
      baseCurrency: value(formData, "baseCurrency"),
      riskProfile: value(formData, "riskProfile")
    });
    await container.portfolioService.setupPortfolio(authUser, input);
  } catch (error) {
    redirect(`/setup?error=${encodeURIComponent(validationMessage(error))}`);
  }
  redirect("/portfolio");
}

export async function updatePortfolioSetupAction(formData: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  try {
    const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
    if (!portfolio) redirect("/setup");
    const input = setupPortfolioSchema.parse({
      name: value(formData, "name"),
      baseCurrency: value(formData, "baseCurrency"),
      riskProfile: value(formData, "riskProfile")
    });
    await container.portfolioService.updatePortfolioSetup(authUser, portfolio.id, input);
  } catch (error) {
    redirect(`/setup?edit=true&error=${encodeURIComponent(validationMessage(error))}`);
  }
  revalidatePath("/setup");
  revalidatePath("/portfolio");
  redirect("/setup");
}

export async function upsertCashBalanceAction(formData: FormData) {
  const portfolioId = await requirePortfolioId();
  try {
    const input = cashBalanceSchema.parse({
      id: value(formData, "id") || undefined,
      portfolioId,
      amount: value(formData, "amount"),
      currency: value(formData, "currency"),
      accountName: value(formData, "accountName"),
      brokerName: value(formData, "brokerName"),
      asOfDate: value(formData, "asOfDate"),
      notes: value(formData, "notes")
    });
    await createContainer().portfolioService.upsertCashBalance(input);
  } catch (error) {
    redirect(`/cash?error=${encodeURIComponent(validationMessage(error))}`);
  }
  revalidatePath("/cash");
  revalidatePath("/portfolio");
  redirect("/cash");
}

export async function deleteCashBalanceAction(formData: FormData) {
  const portfolioId = await requirePortfolioId();
  await createContainer().portfolioService.deleteCashBalance(String(formData.get("id")), portfolioId);
  revalidatePath("/cash");
  revalidatePath("/portfolio");
  redirect("/cash");
}

export async function upsertHoldingAction(formData: FormData) {
  const portfolioId = await requirePortfolioId();
  try {
    const input = holdingSchema.parse({
      id: value(formData, "id") || undefined,
      portfolioId,
      assetType: value(formData, "assetType"),
      ticker: value(formData, "ticker"),
      assetName: value(formData, "assetName"),
      quantity: value(formData, "quantity"),
      averageCost: value(formData, "averageCost"),
      costCurrency: value(formData, "costCurrency"),
      accountName: value(formData, "accountName"),
      brokerName: value(formData, "brokerName"),
      firstPurchaseDate: value(formData, "firstPurchaseDate"),
      notes: value(formData, "notes")
    });
    await createContainer().portfolioService.upsertHolding(input);
  } catch (error) {
    redirect(`/holdings?error=${encodeURIComponent(validationMessage(error))}`);
  }
  revalidatePath("/holdings");
  revalidatePath("/portfolio");
  redirect("/holdings");
}

export async function deleteHoldingAction(formData: FormData) {
  const portfolioId = await requirePortfolioId();
  await createContainer().portfolioService.deleteHolding(String(formData.get("id")), portfolioId);
  revalidatePath("/holdings");
  revalidatePath("/portfolio");
  redirect("/holdings");
}

export async function upsertTransactionAction(formData: FormData) {
  const portfolioId = await requirePortfolioId();
  try {
    const input = transactionSchema.parse({
      id: value(formData, "id") || undefined,
      portfolioId,
      transactionType: value(formData, "transactionType"),
      assetType: value(formData, "assetType"),
      ticker: value(formData, "ticker"),
      assetName: value(formData, "assetName"),
      quantity: value(formData, "quantity") || undefined,
      price: value(formData, "price") || undefined,
      fees: value(formData, "fees") || "0",
      currency: value(formData, "currency"),
      accountName: value(formData, "accountName"),
      brokerName: value(formData, "brokerName"),
      transactionDate: value(formData, "transactionDate"),
      notes: value(formData, "notes")
    });
    await createContainer().portfolioService.upsertTransaction(input);
  } catch (error) {
    redirect(`/transactions?error=${encodeURIComponent(validationMessage(error))}`);
  }
  revalidatePath("/transactions");
  revalidatePath("/portfolio");
  redirect("/transactions");
}

export async function deleteTransactionAction(formData: FormData) {
  const portfolioId = await requirePortfolioId();
  await createContainer().portfolioService.deleteTransaction(String(formData.get("id")), portfolioId);
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function refreshPricesAction() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { user, portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const result = await container.jobs.refreshPortfolioPrices.run({
    userId: user.id,
    portfolioId: portfolio.id
  });
  if (result.ok) {
    await container.portfolioService.createAnalyticsSnapshot(portfolio.id);
  }

  revalidatePath("/portfolio");
  const params = new URLSearchParams({
    priceMessage: result.message
  });
  if (!result.ok) params.set("priceError", result.message);
  redirect(`/portfolio?${params.toString()}`);
}

export async function refreshBenchmarksAction() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const result = await container.jobs.refreshBenchmarkData.run({
    lookbackDays: 1825
  });

  revalidatePath("/portfolio");
  const params = new URLSearchParams({
    benchmarkMessage: result.message
  });
  if (!result.ok) params.set("benchmarkError", result.message);
  redirect(`/portfolio?${params.toString()}`);
}

export async function refreshMetadataAction() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { user, portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const result = await container.assetMetadataService.refreshPortfolioAssetMetadata({
    userId: user.id,
    portfolioId: portfolio.id
  });

  revalidatePath("/setup");
  revalidatePath("/portfolio");
  revalidatePath("/holdings");
  const params = new URLSearchParams({
    metadataMessage: result.message
  });
  if (result.errors.length > 0) params.set("metadataError", result.errors.join(" "));
  redirect(`/setup?${params.toString()}`);
}
