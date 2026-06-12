export type AssetMetadata = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  country: string | null;
  region: string | null;
  sector: string | null;
  industry: string | null;
  isin?: string | null;
  cusip?: string | null;
  figi?: string | null;
  raw: unknown;
};

export interface AssetMetadataProvider {
  readonly name: string;
  getAssetMetadata(symbols: string[]): Promise<AssetMetadata[]>;
}
