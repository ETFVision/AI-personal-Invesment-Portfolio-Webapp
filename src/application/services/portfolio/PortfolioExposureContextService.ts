import type { PortfolioLookthroughExposure, PortfolioLookthroughReport } from "../../../domain/etfLookthrough/types";
import { consolidatePortfolioLookthroughExposures } from "../../../domain/etfLookthrough/exposureNormalization";
import type { AllocationItem, PortfolioDashboard } from "../../../domain/portfolio/types";
import type { PortfolioReviewReport } from "../../../domain/portfolioReview/types";

export type PortfolioExposureSource = "lookthrough" | "direct_metadata";

export type PortfolioExposureContext = {
  assetAllocation: AllocationItem[];
  sectorAllocation: AllocationItem[];
  geographyAllocation: AllocationItem[];
  sectorSource: PortfolioExposureSource;
  geographySource: PortfolioExposureSource;
  coverage: PortfolioLookthroughReport["coverage"] | null;
  diagnostics: string[];
};

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toLookthroughExposure(value: unknown): PortfolioLookthroughExposure | null {
  const row = toObject(value);
  const exposureName = typeof row.exposureName === "string" ? row.exposureName : null;
  const exposureType = typeof row.exposureType === "string" ? row.exposureType : null;
  const exposureWeight = Number(row.exposureWeight);
  if (!exposureName || !exposureType || !Number.isFinite(exposureWeight)) return null;
  return {
    portfolioId: typeof row.portfolioId === "string" ? row.portfolioId : "",
    exposureType: exposureType as PortfolioLookthroughExposure["exposureType"],
    exposureName,
    exposureWeight,
    directWeight: Number.isFinite(Number(row.directWeight)) ? Number(row.directWeight) : 0,
    etfLookthroughWeight: Number.isFinite(Number(row.etfLookthroughWeight)) ? Number(row.etfLookthroughWeight) : 0,
    asOfDate: typeof row.asOfDate === "string" ? row.asOfDate : ""
  };
}

function exposureRows(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => {
    const exposure = toLookthroughExposure(item);
    return exposure ? [exposure] : [];
  }) : [];
}

function allocationFromExposure(rows: PortfolioLookthroughExposure[]): AllocationItem[] {
  return rows
    .map((row) => ({
      label: row.exposureName,
      value: row.exposureWeight,
      percent: row.exposureWeight
    }))
    .sort((a, b) => b.percent - a.percent);
}

function coverage(value: unknown): PortfolioLookthroughReport["coverage"] | null {
  const row = toObject(value);
  const etfCount = Number(row.etfCount);
  if (!Number.isFinite(etfCount)) return null;
  return {
    etfCount,
    etfsWithSectorExposure: Number.isFinite(Number(row.etfsWithSectorExposure)) ? Number(row.etfsWithSectorExposure) : 0,
    etfsWithCountryExposure: Number.isFinite(Number(row.etfsWithCountryExposure)) ? Number(row.etfsWithCountryExposure) : 0,
    etfsWithTopHoldings: Number.isFinite(Number(row.etfsWithTopHoldings)) ? Number(row.etfsWithTopHoldings) : 0,
    lookthroughWeight: Number.isFinite(Number(row.lookthroughWeight)) ? Number(row.lookthroughWeight) : 0,
    fallbackWeight: Number.isFinite(Number(row.fallbackWeight)) ? Number(row.fallbackWeight) : 0
  };
}

export function buildPortfolioExposureContext(
  dashboard: PortfolioDashboard,
  latestReview?: Pick<PortfolioReviewReport, "inputsSnapshot"> | null
): PortfolioExposureContext {
  const snapshot = toObject(latestReview?.inputsSnapshot);
  const lookthrough = toObject(snapshot.lookthroughExposure);
  const sectorRows = consolidatePortfolioLookthroughExposures(exposureRows(lookthrough.sectorExposures));
  const countryRows = consolidatePortfolioLookthroughExposures(exposureRows(lookthrough.countryExposures));
  const lookthroughCoverage = coverage(lookthrough.coverage);

  return {
    assetAllocation: dashboard.allocationByType,
    sectorAllocation: sectorRows.length > 0 ? allocationFromExposure(sectorRows) : dashboard.allocationBySector,
    geographyAllocation: countryRows.length > 0 ? allocationFromExposure(countryRows) : dashboard.allocationByGeography,
    sectorSource: sectorRows.length > 0 ? "lookthrough" : "direct_metadata",
    geographySource: countryRows.length > 0 ? "lookthrough" : "direct_metadata",
    coverage: lookthroughCoverage,
    diagnostics: [
      sectorRows.length === 0 ? "Sector exposure is using direct metadata fallback because no look-through sector rows are available." : null,
      countryRows.length === 0 ? "Geography exposure is using direct metadata fallback because no look-through country rows are available." : null
    ].filter((item): item is string => Boolean(item))
  };
}

export function dashboardWithExposureContext(dashboard: PortfolioDashboard, context: PortfolioExposureContext): PortfolioDashboard {
  return {
    ...dashboard,
    allocationBySector: context.sectorAllocation,
    allocationByGeography: context.geographyAllocation
  };
}
