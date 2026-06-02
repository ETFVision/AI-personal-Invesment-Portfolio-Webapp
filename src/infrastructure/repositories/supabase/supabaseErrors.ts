export type SupabaseLikeError = { code?: string; message?: string } | null;

export function isJwtIssuedAtFutureError(error: SupabaseLikeError) {
  return (error?.message ?? "").toLowerCase().includes("jwt issued at future");
}
