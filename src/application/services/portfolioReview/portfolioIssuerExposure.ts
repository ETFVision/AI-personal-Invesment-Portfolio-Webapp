export type PortfolioIssuerExposureRow = {
  directWeight: number;
  indirectWeight: number;
  holdingSymbol: string;
  holdingName?: string | null;
  holdingIssuerId?: string | null;
  inputsSnapshot?: unknown;
};

export function holdingSnapshot(row: PortfolioIssuerExposureRow) {
  return row.inputsSnapshot && typeof row.inputsSnapshot === "object"
    ? row.inputsSnapshot as Record<string, unknown>
    : {};
}

export function instrumentAssetClass(row: PortfolioIssuerExposureRow) {
  const value = holdingSnapshot(row).instrumentAssetClass;
  return typeof value === "string" ? value : null;
}

export function exposureRole(row: PortfolioIssuerExposureRow) {
  const value = holdingSnapshot(row).exposureRole;
  return typeof value === "string" ? value : null;
}

export function isFundWrapper(row: PortfolioIssuerExposureRow) {
  const assetClass = instrumentAssetClass(row);
  return row.directWeight > 0 && row.indirectWeight === 0 && ["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"].includes(assetClass ?? "");
}

export function isUnderlyingExposure(row: PortfolioIssuerExposureRow) {
  return row.indirectWeight > 0 || exposureRole(row) === "underlying_security";
}

export function isIssuerExposure(row: PortfolioIssuerExposureRow) {
  return !isFundWrapper(row) && (isUnderlyingExposure(row) || row.directWeight > 0);
}

export function normalizeIssuerName(name: string | null | undefined, fallback: string) {
  return (name ?? fallback)
    .replace(/\s+Class\s+[A-Z0-9]+$/i, "")
    .replace(/\s+Ordinary\s+Shares?$/i, "")
    .replace(/\s+Common\s+Stock$/i, "")
    .replace(/\s+Sponsored\s+ADR$/i, "")
    .replace(/\s+ADR$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || fallback.toUpperCase();
}

export function issuerKey(row: PortfolioIssuerExposureRow) {
  const snapshot = holdingSnapshot(row);
  const snapshotIssuerId = typeof snapshot.issuerId === "string" ? snapshot.issuerId : null;
  return row.holdingIssuerId ?? snapshotIssuerId ?? normalizeIssuerName(row.holdingName, row.holdingSymbol);
}
