export type SupabaseLikeError = { code?: string; message?: string } | null;

export function isJwtIssuedAtFutureError(error: SupabaseLikeError) {
  return (error?.message ?? "").toLowerCase().includes("jwt issued at future");
}

type SupabaseResultLike = { error: SupabaseLikeError };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSupabaseClockSkewRetry<T extends SupabaseResultLike>(
  operation: () => PromiseLike<T>,
  delayMs = 750
): Promise<T> {
  const result = await operation();
  if (!isJwtIssuedAtFutureError(result.error)) return result;
  await sleep(delayMs);
  return operation();
}
