export type NewsSentiment = "positive" | "neutral" | "negative" | "mixed";
export type NewsClassificationLabel = "short_term_noise" | "medium_term_theme" | "structural_long_term_shift" | "existential_risk";
export type NewsGroupType = "company" | "sector" | "theme" | "macro" | "geopolitical" | "asset_class";
export type WeeklyNewsStatus = "draft" | "published" | "archived";
export type NewsIngestionStatus = "success" | "partial_success" | "failed";
export type NewsCanonicalTheme =
  | "Rates"
  | "Inflation"
  | "Growth"
  | "Employment"
  | "Yield Curve"
  | "Currency"
  | "Geopolitical"
  | "Energy"
  | "AI"
  | "Credit"
  | "Trade / Supply Chain"
  | "Consumer"
  | "Healthcare"
  | "Financials"
  | "Technology"
  | "Industrials"
  | "Real Estate"
  | "Utilities"
  | "Materials"
  | "Quality"
  | "Value"
  | "Dividend"
  | "Defensive"
  | "High Beta"
  | "Long Duration"
  | "Inflation Hedge"
  | "Recession Hedge";
export type NewsThemeCategory = "Macro" | "Sector" | "Investment";
export type NewsThemeTrend = "Rising" | "Stable" | "Declining" | "Low confidence trend" | "Insufficient history";
export type SourceQualityTier = "tier_1" | "tier_2" | "tier_3";

export type NewsItem = {
  id: string;
  sourceProvider: string;
  sourceId: string | null;
  url: string | null;
  title: string;
  summary: string | null;
  contentSnippet: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  tickers: string[];
  relatedInstrumentIds: string[];
  rawSymbols: string[];
  sourceName: string | null;
  sourceQualityScore: number;
  sourceQualityTier: SourceQualityTier;
  author: string | null;
  imageUrl: string | null;
  language: string | null;
  country: string | null;
  providerMetadata: Record<string, unknown>;
  contentHash: string;
  canonicalHash: string;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsClassification = {
  id: string;
  newsItemId: string;
  classificationModel: string;
  sentiment: NewsSentiment;
  eventType: string | null;
  classification: NewsClassificationLabel;
  severityScore: number;
  persistenceScore: number;
  confidenceScore: number;
  affectedAssetClasses: string[];
  affectedSectors: string[];
  affectedThemes: string[];
  primaryTheme: NewsCanonicalTheme | null;
  secondaryThemes: NewsCanonicalTheme[];
  themeConfidence: number;
  affectedInstruments: string[];
  affectedMacroCategories: string[];
  reasoningSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsGroup = {
  id: string;
  groupKey: string;
  groupTitle: string;
  groupType: NewsGroupType;
  periodStart: string;
  periodEnd: string;
  relatedNewsItemIds: string[];
  affectedInstruments: string[];
  affectedThemes: string[];
  affectedAssetClasses: string[];
  groupSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyNewsReconciliation = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: WeeklyNewsStatus;
  equitiesSummary: string | null;
  bondsSummary: string | null;
  goldSummary: string | null;
  cryptoSummary: string | null;
  macroSummary: string | null;
  ratesSummary: string | null;
  inflationSummary: string | null;
  currencySummary: string | null;
  geopoliticalSummary: string | null;
  keyRisks: string[];
  keyOpportunities: string[];
  portfolioImplications: Record<string, unknown>;
  coverageMetadata: Record<string, unknown>;
  modelUsed: string | null;
  tokenUsage: Record<string, unknown>;
  costEstimate: number | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsIngestionLog = {
  id: string;
  jobName: string;
  sourceProvider: string;
  startedAt: string;
  completedAt: string | null;
  status: NewsIngestionStatus;
  instrumentsRequested: number;
  articlesFetched: number;
  articlesInserted: number;
  duplicatesDetected: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type NormalizedNewsArticle = {
  sourceProvider: string;
  sourceId: string | null;
  url: string | null;
  title: string;
  summary: string | null;
  contentSnippet: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  tickers: string[];
  rawSymbols: string[];
  sourceName: string | null;
  author: string | null;
  imageUrl: string | null;
  language: string | null;
  country: string | null;
  providerMetadata: Record<string, unknown>;
};

export type GdeltQueryGroup = {
  id: string;
  queryKey: string;
  queryName: string;
  queryText: string;
  canonicalTheme: NewsCanonicalTheme;
  category: string;
  isActive: boolean;
  maxArticlesPerRun: number;
  lastAttemptedAt: string | null;
  lastSuccessAt: string | null;
  nextRunAt: string | null;
  failureCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsDataQueryGroup = GdeltQueryGroup;

export type GdeltIngestionLog = {
  id: string;
  jobName: string;
  queryGroupId: string | null;
  startedAt: string;
  completedAt: string | null;
  status: NewsIngestionStatus;
  articlesFetched: number;
  articlesInserted: number;
  duplicatesDetected: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type GdeltArticleMetadata = {
  id: string;
  newsItemId: string;
  domain: string | null;
  sourceCountry: string | null;
  sourceLanguage: string | null;
  tone: number | null;
  gdeltThemes: string[];
  locations: unknown[];
  persons: string[];
  organizations: string[];
  providerMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NewsDataIngestionLog = GdeltIngestionLog;

export type NewsDataArticleMetadata = {
  id: string;
  newsItemId: string;
  sourceId: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  country: string | null;
  language: string | null;
  category: string[];
  creator: unknown[];
  keywords: string[];
  providerMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NewsDashboard = {
  latestNews: Array<NewsItem & { classification?: NewsClassification | null }>;
  stats: NewsDashboardStats;
  weeklyReconciliations: WeeklyNewsReconciliation[];
  ingestionLogs: NewsIngestionLog[];
  gdeltQueryStatuses: GdeltQueryStatus[];
  newsDataQueryStatuses: NewsDataQueryStatus[];
  latestWeeklyReconciliation: WeeklyNewsReconciliation | null;
  themeSummary: NewsThemeSummary[];
  themeIntelligence: NewsThemeIntelligence;
};

export type NewsDashboardStats = {
  totalArticles: number;
  classifiedArticles: number;
  duplicateArticles: number;
  weeklyReconciliations: number;
};

export type GdeltQueryStatus = {
  queryGroup: GdeltQueryGroup;
  latestLog: GdeltIngestionLog | null;
};

export type NewsDataQueryStatus = {
  queryGroup: NewsDataQueryGroup;
  latestLog: NewsDataIngestionLog | null;
};

export type NewsThemeSummary = {
  theme: NewsCanonicalTheme;
  categories?: NewsThemeCategory[];
  count: number;
  newsItemCount?: number;
  macroSignalCount?: number;
  sources?: string[];
  impactScore?: number;
  averageConfidence: number;
  averageSeverity: number;
  averagePersistence: number;
  rolling4WeekFrequency?: number;
  weeksWithData?: number;
  trend?: NewsThemeTrend;
  structuralCount: number;
  topHeadlines: string[];
  topMacroSignals?: string[];
};

export type NewsThemeReviewItem = {
  newsItemId: string;
  title: string;
  publishedAt: string | null;
  primaryTheme: NewsCanonicalTheme | null;
  secondaryThemes: NewsCanonicalTheme[];
  themeConfidence: number;
  reason: string;
};

export type NewsThemeIntelligence = {
  topThemesThisWeek: NewsThemeSummary[];
  emergingThemes: NewsThemeSummary[];
  persistentThemes: NewsThemeSummary[];
  structuralThemes: NewsThemeSummary[];
  reviewQueue: NewsThemeReviewItem[];
};
