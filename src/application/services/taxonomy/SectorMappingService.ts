import { TaxonomyNormalizationInput, TaxonomyService } from "@/application/services/taxonomy/TaxonomyService";

export class SectorMappingService {
  constructor(private readonly taxonomyService = new TaxonomyService()) {}

  normalize(input: TaxonomyNormalizationInput) {
    return this.taxonomyService.normalizeSector(input);
  }
}
