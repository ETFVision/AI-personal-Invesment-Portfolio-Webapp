import { TaxonomyNormalizationInput, TaxonomyService } from "@/application/services/taxonomy/TaxonomyService";

export class ThemeMappingService {
  constructor(private readonly taxonomyService = new TaxonomyService()) {}

  normalize(input: TaxonomyNormalizationInput) {
    return this.taxonomyService.normalizeThemes(input);
  }
}
