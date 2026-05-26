export type BackgroundJobResult = {
  ok: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

export interface BackgroundJob {
  readonly name: string;
  run(input?: Record<string, unknown>): Promise<BackgroundJobResult>;
}
