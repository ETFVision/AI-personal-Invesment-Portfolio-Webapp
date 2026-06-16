export type ProductMode = "alpha" | "full";

const alphaAllowedPrefixes = [
  "/portfolio",
  "/holdings",
  "/transactions",
  "/cash",
  "/instruments",
  "/market-vision",
  "/fundamentals",
  "/risk",
  "/bonds",
  "/recommendations",
  "/portfolio-review",
  "/methodology",
  "/legal",
  "/login",
  "/auth",
  "/setup"
];

export function deriveProductMode(raw: string | undefined): ProductMode {
  return raw?.toLowerCase() === "full" ? "full" : "alpha";
}

export const productMode: ProductMode = deriveProductMode(process.env.PRODUCT_MODE);
export const isAlphaMode = productMode === "alpha";

export function isRouteEnabledInMode(pathname: string, mode: ProductMode = productMode): boolean {
  if (mode !== "alpha") return true;
  return alphaAllowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
