import type { EtfExposureProvider } from "@/application/ports/providers/EtfExposureProvider";

export class EtfExposureProviderService {
  constructor(private readonly provider: EtfExposureProvider) {}

  get providerName() {
    return this.provider.name;
  }

  getEtfExposure(symbol: string) {
    return this.provider.getEtfExposure(symbol);
  }
}
