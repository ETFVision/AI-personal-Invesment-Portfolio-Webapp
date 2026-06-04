type SeedHolding = {
  symbol: string;
  name: string;
  weight: number;
};

const seededHoldings: Record<string, SeedHolding[]> = {
  SPY: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.072 },
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.069 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.062 },
    { symbol: "AMZN", name: "Amazon.com Inc", weight: 0.039 },
    { symbol: "META", name: "Meta Platforms Inc", weight: 0.030 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.026 },
    { symbol: "GOOGL", name: "Alphabet Inc Class A", weight: 0.022 },
    { symbol: "GOOG", name: "Alphabet Inc Class C", weight: 0.018 },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc Class B", weight: 0.017 },
    { symbol: "LLY", name: "Eli Lilly and Co", weight: 0.015 }
  ],
  VOO: [],
  IVV: [],
  VTI: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.062 },
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.059 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.053 },
    { symbol: "AMZN", name: "Amazon.com Inc", weight: 0.034 },
    { symbol: "META", name: "Meta Platforms Inc", weight: 0.026 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.023 },
    { symbol: "GOOGL", name: "Alphabet Inc Class A", weight: 0.019 },
    { symbol: "GOOG", name: "Alphabet Inc Class C", weight: 0.016 },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc Class B", weight: 0.015 },
    { symbol: "LLY", name: "Eli Lilly and Co", weight: 0.013 }
  ],
  QQQ: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.087 },
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.082 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.074 },
    { symbol: "AMZN", name: "Amazon.com Inc", weight: 0.055 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.050 },
    { symbol: "META", name: "Meta Platforms Inc", weight: 0.044 },
    { symbol: "NFLX", name: "Netflix Inc", weight: 0.029 },
    { symbol: "COST", name: "Costco Wholesale Corp", weight: 0.026 },
    { symbol: "TSLA", name: "Tesla Inc", weight: 0.025 },
    { symbol: "GOOGL", name: "Alphabet Inc Class A", weight: 0.024 }
  ],
  XLK: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.160 },
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.155 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.140 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.055 },
    { symbol: "AMD", name: "Advanced Micro Devices Inc", weight: 0.030 },
    { symbol: "CRM", name: "Salesforce Inc", weight: 0.026 },
    { symbol: "ORCL", name: "Oracle Corp", weight: 0.025 },
    { symbol: "ADBE", name: "Adobe Inc", weight: 0.024 },
    { symbol: "CSCO", name: "Cisco Systems Inc", weight: 0.023 },
    { symbol: "ACN", name: "Accenture PLC", weight: 0.021 }
  ],
  VGT: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.155 },
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.145 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.135 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.060 },
    { symbol: "AMD", name: "Advanced Micro Devices Inc", weight: 0.032 },
    { symbol: "CRM", name: "Salesforce Inc", weight: 0.028 },
    { symbol: "ORCL", name: "Oracle Corp", weight: 0.026 },
    { symbol: "ADBE", name: "Adobe Inc", weight: 0.025 },
    { symbol: "CSCO", name: "Cisco Systems Inc", weight: 0.023 },
    { symbol: "ACN", name: "Accenture PLC", weight: 0.020 }
  ],
  SMH: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.210 },
    { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing Co", weight: 0.120 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.085 },
    { symbol: "AMD", name: "Advanced Micro Devices Inc", weight: 0.060 },
    { symbol: "ASML", name: "ASML Holding NV", weight: 0.055 },
    { symbol: "QCOM", name: "Qualcomm Inc", weight: 0.045 },
    { symbol: "TXN", name: "Texas Instruments Inc", weight: 0.040 },
    { symbol: "MU", name: "Micron Technology Inc", weight: 0.035 },
    { symbol: "AMAT", name: "Applied Materials Inc", weight: 0.032 },
    { symbol: "LRCX", name: "Lam Research Corp", weight: 0.030 }
  ],
  SOXX: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.115 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.090 },
    { symbol: "AMD", name: "Advanced Micro Devices Inc", weight: 0.075 },
    { symbol: "QCOM", name: "Qualcomm Inc", weight: 0.070 },
    { symbol: "TXN", name: "Texas Instruments Inc", weight: 0.065 },
    { symbol: "MU", name: "Micron Technology Inc", weight: 0.055 },
    { symbol: "AMAT", name: "Applied Materials Inc", weight: 0.050 },
    { symbol: "LRCX", name: "Lam Research Corp", weight: 0.048 },
    { symbol: "KLAC", name: "KLA Corp", weight: 0.045 },
    { symbol: "ADI", name: "Analog Devices Inc", weight: 0.040 }
  ],
  VHT: [
    { symbol: "LLY", name: "Eli Lilly and Co", weight: 0.105 },
    { symbol: "UNH", name: "UnitedHealth Group Inc", weight: 0.072 },
    { symbol: "JNJ", name: "Johnson & Johnson", weight: 0.055 },
    { symbol: "ABBV", name: "AbbVie Inc", weight: 0.048 },
    { symbol: "MRK", name: "Merck & Co Inc", weight: 0.044 },
    { symbol: "TMO", name: "Thermo Fisher Scientific Inc", weight: 0.035 },
    { symbol: "ABT", name: "Abbott Laboratories", weight: 0.033 },
    { symbol: "DHR", name: "Danaher Corp", weight: 0.030 },
    { symbol: "ISRG", name: "Intuitive Surgical Inc", weight: 0.028 },
    { symbol: "AMGN", name: "Amgen Inc", weight: 0.027 }
  ],
  XLV: [],
  XLF: [
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc Class B", weight: 0.130 },
    { symbol: "JPM", name: "JPMorgan Chase & Co", weight: 0.110 },
    { symbol: "V", name: "Visa Inc", weight: 0.075 },
    { symbol: "MA", name: "Mastercard Inc", weight: 0.060 },
    { symbol: "BAC", name: "Bank of America Corp", weight: 0.045 },
    { symbol: "WFC", name: "Wells Fargo & Co", weight: 0.035 },
    { symbol: "GS", name: "Goldman Sachs Group Inc", weight: 0.032 },
    { symbol: "MS", name: "Morgan Stanley", weight: 0.030 },
    { symbol: "AXP", name: "American Express Co", weight: 0.028 },
    { symbol: "SPGI", name: "S&P Global Inc", weight: 0.026 }
  ],
  XLE: [
    { symbol: "XOM", name: "Exxon Mobil Corp", weight: 0.235 },
    { symbol: "CVX", name: "Chevron Corp", weight: 0.175 },
    { symbol: "COP", name: "ConocoPhillips", weight: 0.065 },
    { symbol: "EOG", name: "EOG Resources Inc", weight: 0.045 },
    { symbol: "SLB", name: "Schlumberger NV", weight: 0.043 },
    { symbol: "MPC", name: "Marathon Petroleum Corp", weight: 0.040 },
    { symbol: "PSX", name: "Phillips 66", weight: 0.035 },
    { symbol: "VLO", name: "Valero Energy Corp", weight: 0.032 },
    { symbol: "WMB", name: "Williams Companies Inc", weight: 0.030 },
    { symbol: "OKE", name: "ONEOK Inc", weight: 0.028 }
  ],
  XLP: [
    { symbol: "COST", name: "Costco Wholesale Corp", weight: 0.115 },
    { symbol: "WMT", name: "Walmart Inc", weight: 0.105 },
    { symbol: "PG", name: "Procter & Gamble Co", weight: 0.095 },
    { symbol: "KO", name: "Coca-Cola Co", weight: 0.070 },
    { symbol: "PEP", name: "PepsiCo Inc", weight: 0.065 },
    { symbol: "PM", name: "Philip Morris International Inc", weight: 0.055 },
    { symbol: "MDLZ", name: "Mondelez International Inc", weight: 0.040 },
    { symbol: "MO", name: "Altria Group Inc", weight: 0.035 },
    { symbol: "CL", name: "Colgate-Palmolive Co", weight: 0.030 },
    { symbol: "TGT", name: "Target Corp", weight: 0.026 }
  ],
  XLU: [
    { symbol: "NEE", name: "NextEra Energy Inc", weight: 0.135 },
    { symbol: "SO", name: "Southern Co", weight: 0.085 },
    { symbol: "DUK", name: "Duke Energy Corp", weight: 0.080 },
    { symbol: "CEG", name: "Constellation Energy Corp", weight: 0.075 },
    { symbol: "SRE", name: "Sempra", weight: 0.055 },
    { symbol: "AEP", name: "American Electric Power Co", weight: 0.050 },
    { symbol: "D", name: "Dominion Energy Inc", weight: 0.045 },
    { symbol: "EXC", name: "Exelon Corp", weight: 0.040 },
    { symbol: "PEG", name: "Public Service Enterprise Group", weight: 0.038 },
    { symbol: "XEL", name: "Xcel Energy Inc", weight: 0.034 }
  ],
  VNQ: [
    { symbol: "PLD", name: "Prologis Inc", weight: 0.075 },
    { symbol: "AMT", name: "American Tower Corp", weight: 0.070 },
    { symbol: "EQIX", name: "Equinix Inc", weight: 0.060 },
    { symbol: "WELL", name: "Welltower Inc", weight: 0.050 },
    { symbol: "SPG", name: "Simon Property Group Inc", weight: 0.045 },
    { symbol: "DLR", name: "Digital Realty Trust Inc", weight: 0.040 },
    { symbol: "O", name: "Realty Income Corp", weight: 0.035 },
    { symbol: "PSA", name: "Public Storage", weight: 0.034 },
    { symbol: "CBRE", name: "CBRE Group Inc", weight: 0.032 },
    { symbol: "CCI", name: "Crown Castle Inc", weight: 0.030 }
  ],
  SCHD: [
    { symbol: "HD", name: "Home Depot Inc", weight: 0.045 },
    { symbol: "TXN", name: "Texas Instruments Inc", weight: 0.043 },
    { symbol: "AMGN", name: "Amgen Inc", weight: 0.042 },
    { symbol: "PEP", name: "PepsiCo Inc", weight: 0.040 },
    { symbol: "KO", name: "Coca-Cola Co", weight: 0.039 },
    { symbol: "ABBV", name: "AbbVie Inc", weight: 0.038 },
    { symbol: "CSCO", name: "Cisco Systems Inc", weight: 0.037 },
    { symbol: "BMY", name: "Bristol-Myers Squibb Co", weight: 0.035 },
    { symbol: "VZ", name: "Verizon Communications Inc", weight: 0.034 },
    { symbol: "BLK", name: "BlackRock Inc", weight: 0.033 }
  ],
  VIG: [
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.052 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.045 },
    { symbol: "JPM", name: "JPMorgan Chase & Co", weight: 0.038 },
    { symbol: "V", name: "Visa Inc", weight: 0.035 },
    { symbol: "UNH", name: "UnitedHealth Group Inc", weight: 0.033 },
    { symbol: "MA", name: "Mastercard Inc", weight: 0.030 },
    { symbol: "PG", name: "Procter & Gamble Co", weight: 0.029 },
    { symbol: "COST", name: "Costco Wholesale Corp", weight: 0.028 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.027 },
    { symbol: "HD", name: "Home Depot Inc", weight: 0.026 }
  ],
  ACWI: [
    { symbol: "NVDA", name: "NVIDIA Corp", weight: 0.045 },
    { symbol: "MSFT", name: "Microsoft Corp", weight: 0.043 },
    { symbol: "AAPL", name: "Apple Inc", weight: 0.038 },
    { symbol: "AMZN", name: "Amazon.com Inc", weight: 0.025 },
    { symbol: "META", name: "Meta Platforms Inc", weight: 0.019 },
    { symbol: "AVGO", name: "Broadcom Inc", weight: 0.017 },
    { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing Co", weight: 0.015 },
    { symbol: "GOOGL", name: "Alphabet Inc Class A", weight: 0.014 },
    { symbol: "NOVO.B", name: "Novo Nordisk A/S", weight: 0.012 },
    { symbol: "ASML", name: "ASML Holding NV", weight: 0.011 }
  ],
  VT: [],
  VXUS: [
    { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing Co", weight: 0.025 },
    { symbol: "ASML", name: "ASML Holding NV", weight: 0.018 },
    { symbol: "NOVO.B", name: "Novo Nordisk A/S", weight: 0.014 },
    { symbol: "SAP", name: "SAP SE", weight: 0.012 },
    { symbol: "NESN", name: "Nestle SA", weight: 0.011 },
    { symbol: "AZN", name: "AstraZeneca PLC", weight: 0.010 },
    { symbol: "SHEL", name: "Shell PLC", weight: 0.010 },
    { symbol: "TM", name: "Toyota Motor Corp", weight: 0.010 },
    { symbol: "NOVN", name: "Novartis AG", weight: 0.009 },
    { symbol: "ROG", name: "Roche Holding AG", weight: 0.009 }
  ],
  VEA: [
    { symbol: "ASML", name: "ASML Holding NV", weight: 0.022 },
    { symbol: "NOVO.B", name: "Novo Nordisk A/S", weight: 0.018 },
    { symbol: "SAP", name: "SAP SE", weight: 0.016 },
    { symbol: "NESN", name: "Nestle SA", weight: 0.015 },
    { symbol: "AZN", name: "AstraZeneca PLC", weight: 0.014 },
    { symbol: "SHEL", name: "Shell PLC", weight: 0.013 },
    { symbol: "TM", name: "Toyota Motor Corp", weight: 0.013 },
    { symbol: "NOVN", name: "Novartis AG", weight: 0.012 },
    { symbol: "ROG", name: "Roche Holding AG", weight: 0.012 },
    { symbol: "HSBA", name: "HSBC Holdings PLC", weight: 0.011 }
  ],
  VWO: [
    { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing Co", weight: 0.065 },
    { symbol: "TCEHY", name: "Tencent Holdings Ltd", weight: 0.035 },
    { symbol: "BABA", name: "Alibaba Group Holding Ltd", weight: 0.025 },
    { symbol: "005930", name: "Samsung Electronics Co Ltd", weight: 0.024 },
    { symbol: "INFY", name: "Infosys Ltd", weight: 0.015 },
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", weight: 0.014 },
    { symbol: "PDD", name: "PDD Holdings Inc", weight: 0.013 },
    { symbol: "HDB", name: "HDFC Bank Ltd", weight: 0.012 },
    { symbol: "VALE", name: "Vale SA", weight: 0.011 },
    { symbol: "MELI", name: "MercadoLibre Inc", weight: 0.010 }
  ],
  IEMG: []
};

seededHoldings.VOO = seededHoldings.SPY;
seededHoldings.IVV = seededHoldings.SPY;
seededHoldings.XLV = seededHoldings.VHT;
seededHoldings.VT = seededHoldings.ACWI;
seededHoldings.IEMG = seededHoldings.VWO;

export function seededEtfTopHoldings(symbol: string, asOfDate: string, reason: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return (seededHoldings[normalizedSymbol] ?? []).map((holding) => ({
    etfSymbol: normalizedSymbol,
    holdingSymbol: holding.symbol,
    holdingName: holding.name,
    holdingWeight: holding.weight,
    asOfDate,
    providerMetadata: {
      source: "seeded_etf_holdings_fallback",
      reason,
      isLiveProviderData: false,
      note: "Curated approximate top-holding fallback used only when the live ETF holdings endpoint returns no usable rows."
    }
  }));
}

