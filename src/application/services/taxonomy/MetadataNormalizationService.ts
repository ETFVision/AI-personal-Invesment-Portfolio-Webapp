import { TaxonomyNormalizationInput, TaxonomyService } from "@/application/services/taxonomy/TaxonomyService";

export class MetadataNormalizationService {
  constructor(private readonly taxonomyService = new TaxonomyService()) {}

  normalize(input: TaxonomyNormalizationInput) {
    return this.taxonomyService.normalize(input);
  }
}
