"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formBoolean(formData: FormData, key: string) {
  const value = formString(formData, key).toLowerCase();
  return value === "true" || value === "1" || value === "on";
}

function formTags(formData: FormData, key: string) {
  return formString(formData, key)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function seedUniverseAction() {
  await createContainer().authProvider.requireUser();
  const result = await createContainer().universeManagementService.ensureSeededUniverse();
  redirect(`/universe?message=${encodeURIComponent(`Seeded ${result.instruments} instruments and ${result.watchlistItems} watchlist items.`)}`);
}

export async function refreshUniverseMetadataAction() {
  const authUser = await createContainer().authProvider.requireUser();
  const container = createContainer();
  const appUser = await container.portfolioService.ensureApplicationUser(authUser);
  const result = await container.metadataRefreshService.refreshUniverseMetadata({ requestedByUserId: appUser.id });
  const params = new URLSearchParams({
    metadataMessage: result.message
  });
  if (result.errors.length > 0) params.set("metadataError", result.errors.join(" | "));
  redirect(`/universe?${params.toString()}`);
}

export async function refreshInstrumentPricesAction() {
  await createContainer().authProvider.requireUser();
  const result = await createContainer().instrumentMarketService.refreshInstrumentPrices({ lookbackDays: 1825, maxSymbols: 12 });
  const params = new URLSearchParams({
    priceMessage: result.message
  });
  if (result.errors.length > 0) params.set("priceError", result.errors.join(" | "));
  redirect(`/universe?${params.toString()}`);
}

export async function toggleInstrumentActiveAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const instrumentId = formString(formData, "instrumentId");
  const isActive = formBoolean(formData, "isActive");
  await createContainer().instrumentService.setInstrumentActive(instrumentId, isActive);
  redirect("/universe?message=Instrument%20status%20updated.");
}

export async function saveInstrumentTagsAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const instrumentId = formString(formData, "instrumentId");
  const benchmarkTags = formTags(formData, "benchmarkTags");
  const thematicTags = formTags(formData, "thematicTags");
  await createContainer().instrumentService.updateInstrumentTags([{ instrumentId, benchmarkTags, thematicTags }]);
  redirect("/universe?message=Instrument%20tags%20updated.");
}

export async function addWatchlistItemAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const watchlistId = formString(formData, "watchlistId");
  const instrumentId = formString(formData, "instrumentId");
  const itemRankValue = formString(formData, "itemRank");
  const itemRank = itemRankValue ? Number(itemRankValue) : null;
  const rationale = formString(formData, "rationale") || null;
  await createContainer().watchlistService.addInstrumentToWatchlist({ watchlistId, instrumentId, itemRank, rationale });
  redirect("/watchlists?message=Watchlist%20item%20added.");
}

export async function removeWatchlistItemAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const watchlistId = formString(formData, "watchlistId");
  const instrumentId = formString(formData, "instrumentId");
  await createContainer().watchlistService.removeInstrumentFromWatchlist({ watchlistId, instrumentId });
  redirect("/watchlists?message=Watchlist%20item%20removed.");
}
