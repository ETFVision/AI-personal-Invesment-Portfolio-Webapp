export type MacroProviderObservation = {
  indicatorCode: string;
  observationDate: string;
  value: number | null;
  providerMetadata: Record<string, unknown>;
};

export type MacroProviderFetchRequest = {
  indicatorCode: string;
  observationStart?: string;
  observationEnd?: string;
  limit?: number;
};

export interface MacroDataProvider {
  readonly name: string;
  fetchObservations(input: MacroProviderFetchRequest): Promise<MacroProviderObservation[]>;
}
