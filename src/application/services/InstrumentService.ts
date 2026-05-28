import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";

export class InstrumentService {
  constructor(private readonly repository: UniverseRepository) {}

  listInstruments(filters?: Parameters<UniverseRepository["listInstruments"]>[0]) {
    return this.repository.listInstruments(filters);
  }

  listBondProfiles() {
    return this.repository.listBondProfiles();
  }

  listBenchmarkProfiles() {
    return this.repository.listBenchmarkProfiles();
  }

  listCryptoProfiles() {
    return this.repository.listCryptoProfiles();
  }

  listMetadataRefreshLogs(limit = 25) {
    return this.repository.listMetadataRefreshLogs(limit);
  }

  setInstrumentActive(instrumentId: string, isActive: boolean) {
    return this.repository.setInstrumentActive(instrumentId, isActive);
  }

  updateInstrumentTags(input: Array<{ instrumentId: string; benchmarkTags: string[]; thematicTags: string[] }>) {
    return this.repository.updateInstrumentTags(input);
  }
}
