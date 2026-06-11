export type ReleaseMode = "alpha" | "full";

const rawReleaseMode = process.env.NEXT_PUBLIC_APP_RELEASE_MODE ?? process.env.APP_RELEASE_MODE ?? "alpha";

export const releaseMode: ReleaseMode = rawReleaseMode.toLowerCase() === "full" ? "full" : "alpha";

export const isAlphaRelease = releaseMode === "alpha";

const alphaRoutePrefixes = [
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
  "/login",
  "/auth",
  "/setup"
];

export function isRouteEnabledForRelease(pathname: string) {
  if (!isAlphaRelease) return true;
  return alphaRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
