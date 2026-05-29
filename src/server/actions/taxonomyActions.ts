"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formTags(formData: FormData, key: string) {
  return formString(formData, key)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function saveInstrumentTaxonomyAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const instrumentId = formString(formData, "instrumentId");
  const canonicalSector = formString(formData, "canonicalSector");
  const canonicalThemes = formTags(formData, "canonicalThemes");
  const rawSector = formString(formData, "rawSector") || null;
  const rawIndustry = formString(formData, "rawIndustry") || null;

  if (!instrumentId || !canonicalSector || canonicalThemes.length === 0) {
    redirect("/taxonomy?taxonomyError=Canonical%20sector%20and%20at%20least%20one%20theme%20are%20required.");
  }

  await createContainer().instrumentService.updateInstrumentTaxonomy([
    {
      instrumentId,
      rawSector,
      rawIndustry,
      canonicalSector,
      canonicalThemes,
      sourceProvider: "manual",
      confidence: 1,
      isManualOverride: true,
      reviewStatus: "mapped"
    }
  ]);

  redirect("/taxonomy?taxonomyMessage=Instrument%20taxonomy%20override%20saved.");
}

export async function approveTaxonomyMappingAction(formData: FormData) {
  await createContainer().authProvider.requireUser();
  const instrumentId = formString(formData, "instrumentId");
  const canonicalSector = formString(formData, "canonicalSector");
  const canonicalThemes = formTags(formData, "canonicalThemes");
  const rawSector = formString(formData, "rawSector") || null;
  const rawIndustry = formString(formData, "rawIndustry") || null;

  if (!instrumentId || !canonicalSector || canonicalThemes.length === 0) {
    redirect("/taxonomy?taxonomyError=Cannot%20approve%20an%20incomplete%20taxonomy%20mapping.");
  }

  await createContainer().instrumentService.updateInstrumentTaxonomy([
    {
      instrumentId,
      rawSector,
      rawIndustry,
      canonicalSector,
      canonicalThemes,
      sourceProvider: "application",
      confidence: 1,
      isManualOverride: false,
      reviewStatus: "mapped"
    }
  ]);

  redirect("/taxonomy?taxonomyMessage=Taxonomy%20mapping%20approved.");
}
