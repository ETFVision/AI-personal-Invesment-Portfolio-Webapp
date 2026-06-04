import {
  allocationPercent,
  finding,
  isBondAllocationLabel,
  isCryptoAllocationLabel,
  isEquityAllocationLabel,
  isGoldAllocationLabel,
  section,
  type PortfolioReviewInputContext
} from "./portfolioReviewScoring";

export class AllocationReviewService {
  review({ dashboard }: PortfolioReviewInputContext) {
    const equity = allocationPercent(dashboard.allocationByType, isEquityAllocationLabel);
    const bonds = allocationPercent(dashboard.allocationByType, isBondAllocationLabel);
    const gold = allocationPercent(dashboard.allocationByType, isGoldAllocationLabel);
    const crypto = allocationPercent(dashboard.allocationByType, isCryptoAllocationLabel);
    const cash = dashboard.cashPercent;
    const findings = [
      equity > 0.85 ? finding("watch", "Equity-heavy allocation", "Equities and equity ETFs dominate the portfolio, so market beta is likely the main driver.") : null,
      bonds < 0.05 ? finding("watch", "Limited fixed-income ballast", "Bond ETF exposure is low, which may reduce defensive balance during equity drawdowns.") : null,
      cash > 0.35 ? finding("attention", "High cash allocation", "Cash is a large part of current portfolio value and may create performance drag in risk-on markets.") : null,
      crypto > 0.1 ? finding("attention", "Crypto allocation is material", "Crypto exposure is above a conservative sleeve size and can dominate volatility.") : null,
      gold > 0.15 ? finding("watch", "Gold hedge is sizeable", "Gold exposure is useful for hedging, but a large sleeve can reduce equity participation.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 82
      - Math.max(0, equity - 0.85) * 80
      - Math.max(0, 0.08 - bonds) * 90
      - Math.max(0, cash - 0.35) * 55
      - Math.max(0, crypto - 0.1) * 90;
    return section(score, "Allocation is reviewed across cash, equities, fixed income, gold and crypto using current derived portfolio values.", findings, {
      equityAllocation: equity,
      bondAllocation: bonds,
      goldAllocation: gold,
      cryptoAllocation: crypto,
      cashAllocation: cash
    });
  }
}
