export type AssetMetadata = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  country: string | null;
  region: string | null;
  sector: string | null;
  industry: string | null;
  raw: unknown;
};

export interface AssetMetadataProvider {
  readonly name: string;
  getAssetMetadata(symbols: string[]): Promise<AssetMetadata[]>;
}
