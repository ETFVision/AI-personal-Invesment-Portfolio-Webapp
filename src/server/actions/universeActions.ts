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

function formNullableNumber(formData: FormData, key: string) {
  const value = formString(formData, key);
  if (!value) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function seedUniverseAction(formData?: FormData) {
  await createContainer().authProvider.requireUser();
  const result = await createContainer().universeManagementService.ensureSeededUniverse();
  const rawReturnTo = String(formData?.get("returnTo") ?? "/instruments/universe");
  const returnTo = rawReturnTo.startsWith("/") ? rawReturnTo : "/instruments/universe";
  redirect(`${returnTo}?message=${encodeURIComponent(`Seeded ${result.instruments} instruments and ${result.watchlistItems} watchlist items.`)}`);
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
  redirect(`/instruments/universe?${params.toString()}`);
}

export async function refreshInstrumentPricesAction() {
  await createContainer().authProvider.requireUser();
  const result = await createContainer().instrumentMarketService.refreshInstrumentPrices({ lookbackDays: 30, maxSymbols: 40 });
  const params = new URLSearchParams({
    priceMessage: result.message
  });
  if (result.errors.length > 0) params.set("priceError", result.errors.join(" | "));
  redirect(`/instruments/universe?${params.toString()}`);
}

export async function toggleInstrumentActiveAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const instrumentId = formString(formData, "instrumentId");
  const isActive = formBoolean(formData, "isActive");
  await createContainer().instrumentService.setInstrumentActive(instrumentId, isActive);
  redirect("/instruments/universe?message=Instrument%20status%20updated.");
}

export async function saveInstrumentTagsAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const instrumentId = formString(formData, "instrumentId");
  const benchmarkTags = formTags(formData, "benchmarkTags");
  const thematicTags = formTags(formData, "thematicTags");
  await createContainer().instrumentService.updateInstrumentTags([{ instrumentId, benchmarkTags, thematicTags }]);
  redirect("/instruments/universe?message=Instrument%20tags%20updated.");
}

export async function saveBondProfileAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const container = createContainer();
  const instrumentId = formString(formData, "instrumentId");
  const instruments = await container.instrumentService.listInstruments({ isActive: true });
  if (!instruments.some((instrument) => instrument.id === instrumentId)) {
    redirect("/bonds?error=Bond%20profile%20can%20only%20be%20saved%20for%20curated%20instrument%20universe%20rows.");
  }
  const symbol = formString(formData, "symbol") || null;
  await container.instrumentService.updateBondProfile({
    instrumentId,
    symbol,
    durationCategory: formString(formData, "durationCategory") || null,
    treasuryClassification: formString(formData, "treasuryClassification") || null,
    inflationLinked: formBoolean(formData, "inflationLinked"),
    creditQuality: formString(formData, "creditQuality") || null,
    geoExposure: formString(formData, "geoExposure") || null,
    rateSensitivity: formString(formData, "rateSensitivity") || null,
    inflationSensitivity: formString(formData, "inflationSensitivity") || null,
    recessionSensitivity: formString(formData, "recessionSensitivity") || null,
    liquidityRole: formString(formData, "liquidityRole") || null,
    currency: formString(formData, "currency") || null,
    secYield: formNullableNumber(formData, "secYield"),
    distributionYield: formNullableNumber(formData, "distributionYield"),
    yieldToMaturity: formNullableNumber(formData, "yieldToMaturity"),
    yieldAsOfDate: formString(formData, "yieldAsOfDate") || null,
    effectiveDuration: formNullableNumber(formData, "effectiveDuration"),
    averageMaturity: formNullableNumber(formData, "averageMaturity"),
    spreadDuration: formNullableNumber(formData, "spreadDuration"),
    optionAdjustedSpread: formNullableNumber(formData, "optionAdjustedSpread"),
    expenseRatio: formNullableNumber(formData, "expenseRatio"),
    isManualOverride: true,
    updatedAt: null,
    providerMetadata: { source: "manual_admin" }
  });
  redirect("/bonds?message=Bond%20profile%20updated.");
}

export async function addWatchlistItemAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const watchlistId = formString(formData, "watchlistId");
  const instrumentId = formString(formData, "instrumentId");
  const itemRankValue = formString(formData, "itemRank");
  const itemRank = itemRankValue ? Number(itemRankValue) : null;
  const rationale = formString(formData, "rationale") || null;
  await createContainer().watchlistService.addInstrumentToWatchlist({ watchlistId, instrumentId, itemRank, rationale });
  redirect("/instruments/watchlist?message=Watchlist%20item%20added.");
}

export async function removeWatchlistItemAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const watchlistId = formString(formData, "watchlistId");
  const instrumentId = formString(formData, "instrumentId");
  await createContainer().watchlistService.removeInstrumentFromWatchlist({ watchlistId, instrumentId });
  redirect("/instruments/watchlist?message=Watchlist%20item%20removed.");
}
