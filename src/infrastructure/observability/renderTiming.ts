import { env } from "@/infrastructure/config/env";

export async function measureRenderStep<T>(label: string, run: () => Promise<T>): Promise<T> {
  if (!env.ENABLE_RENDER_TIMING) return run();

  const startedAt = performance.now();
  try {
    return await run();
  } finally {
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    console.info(`[render-timing] ${label}: ${durationMs}ms`);
  }
}
