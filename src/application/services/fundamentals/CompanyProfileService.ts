import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";

export class CompanyProfileService {
  constructor(private readonly repository: FundamentalsRepository) {}

  getProfile(symbol: string) {
    return this.repository.getDetailBySymbol(symbol);
  }
}
