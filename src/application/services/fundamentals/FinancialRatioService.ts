import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";

export class FinancialRatioService {
  constructor(private readonly repository: FundamentalsRepository) {}

  getCompanyRatios(symbol: string) {
    return this.repository.getDetailBySymbol(symbol);
  }
}
