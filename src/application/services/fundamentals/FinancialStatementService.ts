import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";

export class FinancialStatementService {
  constructor(private readonly repository: FundamentalsRepository) {}

  getCompanyStatements(symbol: string) {
    return this.repository.getDetailBySymbol(symbol);
  }
}
