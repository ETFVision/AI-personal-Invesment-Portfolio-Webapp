export type EtfSectorExposure = {
  etfInstrumentId: string;
  etfSymbol: string;
  sector: string;
  exposureWeight: number;
  asOfDate: string;
  sourceProvider: string;
  providerMetadata: Record<string, unknown>;
};

export type EtfCountryExposure = {
  etfInstrumentId: string;
  etfSymbol: string;
  country: string;
  exposureWeight: number;
  asOfDate: string;
  sourceProvider: string;
  providerMetadata: Record<string, unknown>;
};

export type EtfTopHolding = {
  etfInstrumentId: string;
  etfSymbol: string;
  holdingSymbol: string;
  holdingName: string | null;
  holdingSecurityId?: string | null;
  mappingStatus?: string | null;
  mappingConfidenceScore?: number | null;
  holdingWeight: number;
  asOfDate: string;
  sourceProvider: string;
  providerMetadata: Record<string, unknown>;
};

export type EtfThemeExposure = {
  etfInstrumentId: string;
  etfSymbol: string;
  theme: string;
  exposureWeight: number;
  confidenceScore: number;
  derivationMethod: string;
  asOfDate: string;
};

export type PortfolioLookthroughExposure = {
  portfolioId: string;
  exposureType: "sector" | "country" | "currency" | "theme" | "top_holding";
  exposureName: string;
  exposureSecurityId?: string | null;
  exposureWeight: number;
  directWeight: number;
  etfLookthroughWeight: number;
  asOfDate: string;
};

export type PortfolioLookthroughHoldingSourceEtf = {
  symbol: string;
  weight: number;
};

export type PortfolioLookthroughHolding = {
  portfolioId: string;
  asOfDate: string;
  holdingSymbol: string;
  holdingName: string | null;
  holdingSecurityId?: string | null;
  mappingStatus?: string | null;
  mappingConfidenceScore?: number | null;
  directWeight: number;
  indirectWeight: number;
  totalWeight: number;
  sourceEtfs: PortfolioLookthroughHoldingSourceEtf[];
  inputsSnapshot: Record<string, unknown>;
};

export type EtfExposureRefreshLog = {
  id: string;
  jobName: string;
  startedAt: string;
  completedAt: string | null;
  status: "success" | "partial_success" | "failed";
  etfsRequested: number;
  etfsRefreshed: number;
  sectorRows: number;
  countryRows: number;
  topHoldingRows: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type EtfExposureProviderSnapshot = {
  symbol: string;
  asOfDate: string;
  sectorExposures: Array<Omit<EtfSectorExposure, "etfInstrumentId" | "sourceProvider">>;
  countryExposures: Array<Omit<EtfCountryExposure, "etfInstrumentId" | "sourceProvider">>;
  topHoldings: Array<Omit<EtfTopHolding, "etfInstrumentId" | "sourceProvider">>;
};

export type PortfolioLookthroughReport = {
  asOfDate: string;
  sectorExposures: PortfolioLookthroughExposure[];
  countryExposures: PortfolioLookthroughExposure[];
  currencyExposures: PortfolioLookthroughExposure[];
  themeExposures: PortfolioLookthroughExposure[];
  topHoldingExposures: PortfolioLookthroughExposure[];
  holdingExposures: PortfolioLookthroughHolding[];
  coverage: {
    etfCount: number;
    etfsWithSectorExposure: number;
    etfsWithCountryExposure: number;
    etfsWithTopHoldings: number;
    lookthroughWeight: number;
    fallbackWeight: number;
  };
  diagnostics: string[];
};
