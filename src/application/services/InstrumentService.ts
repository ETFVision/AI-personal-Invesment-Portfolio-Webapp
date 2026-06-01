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

  listCanonicalSectors() {
    return this.repository.listCanonicalSectors();
  }

  listCanonicalThemes() {
    return this.repository.listCanonicalThemes();
  }

  listProviderTaxonomyMappings() {
    return this.repository.listProviderTaxonomyMappings();
  }

  listInstrumentTaxonomyMappings() {
    return this.repository.listInstrumentTaxonomyMappings();
  }

  setInstrumentActive(instrumentId: string, isActive: boolean) {
    return this.repository.setInstrumentActive(instrumentId, isActive);
  }

  updateInstrumentTags(input: Array<{ instrumentId: string; benchmarkTags: string[]; thematicTags: string[] }>) {
    return this.repository.updateInstrumentTags(input);
  }

  updateInstrumentTaxonomy(input: Parameters<UniverseRepository["upsertInstrumentTaxonomy"]>[0]) {
    return this.repository.upsertInstrumentTaxonomy(input);
  }

  updateBondProfile(input: Parameters<UniverseRepository["upsertBondProfiles"]>[0][number]) {
    return this.repository.upsertBondProfiles([input]);
  }
}
