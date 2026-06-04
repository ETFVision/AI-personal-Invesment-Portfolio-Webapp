import type { EtfExposureProviderSnapshot } from "@/domain/etfLookthrough/types";

export interface EtfExposureProvider {
  readonly name: string;
  getEtfExposure(symbol: string): Promise<EtfExposureProviderSnapshot>;
}
