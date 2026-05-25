import { PortfolioService } from "@/application/services/PortfolioService";
import { SupabaseAuthProvider } from "@/infrastructure/providers/auth/SupabaseAuthProvider";
import { SupabasePortfolioRepository } from "@/infrastructure/repositories/supabase/SupabasePortfolioRepository";

export function createContainer() {
  const portfolioRepository = new SupabasePortfolioRepository();
  return {
    authProvider: new SupabaseAuthProvider(),
    portfolioRepository,
    portfolioService: new PortfolioService(portfolioRepository)
  };
}

