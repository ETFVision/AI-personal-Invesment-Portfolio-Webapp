# Cloud-Portable Architecture Design

## 1. Objective

Design the AI portfolio intelligence app so the initial deployment can use Vercel and Supabase Postgres/Auth while preserving a clean migration path to Google Cloud Run, Cloud SQL PostgreSQL, Cloud Scheduler, Cloud Storage, BigQuery, and optionally Vertex AI.

The core rule: application code should depend on domain interfaces, not infrastructure providers.

UI components must not call Supabase directly. They should call application hooks, server actions, route handlers, or typed API clients that delegate to service interfaces.

## 2. Deployment Phases

### Phase 1: Initial Deployment

- Hosting: Vercel
- Frontend/backend runtime: Next.js
- Database: Supabase Postgres
- Auth: Supabase Auth
- Scheduled jobs: Vercel Cron
- File/object storage: Supabase Storage or no object storage for MVP
- Analytics: Postgres tables/views
- AI: OpenAI API
- Market data: Financial Modeling Prep, CoinGecko, FRED

### Phase 2: Portable Runtime

- App runtime: Google Cloud Run
- Database: Cloud SQL PostgreSQL
- Auth: Replaceable auth adapter, initially still compatible with Supabase-style user identity
- Scheduled jobs: Cloud Scheduler calling Cloud Run job endpoints
- Object storage: Cloud Storage
- Analytics: BigQuery export pipeline
- AI: OpenAI API or Vertex AI behind the same `AiProvider` interface

## 3. Architecture Principles

- Keep React components provider-free.
- Keep Supabase calls inside infrastructure adapters only.
- Keep SQL schema PostgreSQL-compatible.
- Keep business logic in service classes or functions under `application`.
- Keep repository interfaces under `domain` or `application/ports`.
- Use dependency injection through provider factories.
- Use environment variables for provider selection.
- Make scheduled jobs executable from Vercel Cron, Cloud Scheduler, or local CLI.
- Store AI inputs and outputs for auditability.
- Prefer structured provider responses over free-form strings.

## 4. High-Level Architecture

```text
UI Components
  -> Hooks / Server Actions / API Routes
    -> Application Services
      -> Domain Rules
      -> Repository Interfaces
      -> Provider Interfaces
        -> Infrastructure Adapters
          -> Supabase / Postgres / FMP / CoinGecko / FRED / OpenAI
```

Future deployment swaps infrastructure adapters without changing UI or domain services.

```text
Initial:
Next.js on Vercel -> Supabase Auth -> Supabase Postgres

Future:
Next.js or API service on Cloud Run -> Auth adapter -> Cloud SQL PostgreSQL
Cloud Scheduler -> Cloud Run job endpoint
BigQuery exporter -> BigQuery
Cloud Storage adapter -> Cloud Storage
```

## 5. Recommended Folder Structure

```text
src/
  app/
    (dashboard)/
      portfolio/
        page.tsx
      market-vision/
        page.tsx
      watchlist/
        page.tsx
      risk/
        page.tsx
    api/
      portfolio/
        route.ts
      jobs/
        daily-price-update/
          route.ts
        weekly-recommendations/
          route.ts
        monthly-telemetry/
          route.ts

  components/
    portfolio/
    market-vision/
    watchlist/
    risk/
    ui/

  hooks/
    usePortfolio.ts
    useWatchlist.ts
    useMarketVision.ts

  domain/
    portfolio/
      entities.ts
      valueObjects.ts
      rules.ts
    allocation/
      allocationPolicy.ts
    risk/
      riskModels.ts
    recommendations/
      recommendationModels.ts
    market/
      marketModels.ts

  application/
    services/
      PortfolioService.ts
      IngestionService.ts
      AllocationService.ts
      RecommendationService.ts
      MarketDataService.ts
      BenchmarkService.ts
      RiskAnalyticsService.ts
      ScenarioAnalysisService.ts
      WatchlistService.ts
      BondIntelligenceService.ts
      TelemetryService.ts
    ports/
      repositories/
        PortfolioRepository.ts
        AssetRepository.ts
        PriceRepository.ts
        WatchlistRepository.ts
        RecommendationRepository.ts
        TelemetryRepository.ts
      providers/
        AuthProvider.ts
        MarketDataProvider.ts
        CryptoDataProvider.ts
        MacroDataProvider.ts
        AiProvider.ts
        ObjectStorageProvider.ts
        AnalyticsWarehouseProvider.ts
        JobRunner.ts

  infrastructure/
    config/
      env.ts
      providers.ts
    db/
      postgres/
        connection.ts
        migrations/
        schema.sql
    repositories/
      postgres/
        PostgresPortfolioRepository.ts
        PostgresAssetRepository.ts
        PostgresPriceRepository.ts
        PostgresWatchlistRepository.ts
        PostgresRecommendationRepository.ts
        PostgresTelemetryRepository.ts
      supabase/
        SupabaseAuthProvider.ts
    providers/
      market-data/
        FmpMarketDataProvider.ts
        CoinGeckoCryptoDataProvider.ts
        FredMacroDataProvider.ts
      ai/
        OpenAiProvider.ts
        VertexAiProvider.ts
      storage/
        SupabaseStorageProvider.ts
        GcsStorageProvider.ts
      analytics/
        PostgresAnalyticsProvider.ts
        BigQueryAnalyticsProvider.ts
      jobs/
        VercelCronJobRunner.ts
        CloudSchedulerJobRunner.ts

  jobs/
    dailyPriceUpdate.ts
    weeklyRecommendations.ts
    monthlyTelemetry.ts

  server/
    container.ts
    actions/
      portfolioActions.ts
      watchlistActions.ts
      recommendationActions.ts

  lib/
    result.ts
    dates.ts
    money.ts
    logging.ts
```

## 6. Data Access Layer and Repository Pattern

Repositories should expose domain-focused methods. They should not leak Supabase client objects, SQL query builders, or provider response shapes.

### Repository Interface

```ts
// src/application/ports/repositories/PortfolioRepository.ts
export interface PortfolioRepository {
  getPortfolioByUserId(userId: string): Promise<Portfolio | null>;
  listHoldings(portfolioId: string): Promise<Holding[]>;
  upsertHolding(portfolioId: string, input: UpsertHoldingInput): Promise<Holding>;
  deleteHolding(portfolioId: string, holdingId: string): Promise<void>;
  savePortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void>;
}
```

### Postgres Implementation

Use a generic PostgreSQL client adapter for both Supabase Postgres and Cloud SQL PostgreSQL. Supabase is Postgres; avoid using Supabase-specific database APIs for domain repositories when direct Postgres access is viable.

```ts
// src/infrastructure/repositories/postgres/PostgresPortfolioRepository.ts
export class PostgresPortfolioRepository implements PortfolioRepository {
  constructor(private readonly db: DbClient) {}

  async getPortfolioByUserId(userId: string): Promise<Portfolio | null> {
    const row = await this.db.oneOrNone<PortfolioRow>(
      `
      select id, user_id, name, base_currency, created_at
      from portfolios
      where user_id = $1
      limit 1
      `,
      [userId],
    );

    return row ? mapPortfolioRow(row) : null;
  }

  async listHoldings(portfolioId: string): Promise<Holding[]> {
    const rows = await this.db.many<HoldingRow>(
      `
      select id, portfolio_id, asset_id, quantity, average_cost, account_label
      from holdings
      where portfolio_id = $1
      order by created_at asc
      `,
      [portfolioId],
    );

    return rows.map(mapHoldingRow);
  }
}
```

### Database Client Interface

```ts
// src/infrastructure/db/postgres/connection.ts
export interface DbClient {
  oneOrNone<T>(sql: string, params?: unknown[]): Promise<T | null>;
  many<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}
```

### Supabase Database Guidance

Supabase should initially provide:

- Managed Postgres.
- Auth.
- Row-level security.
- Connection string.

Application repositories should connect to Postgres through a standard database client where possible. If Supabase row-level security is required for direct browser access, isolate that pattern to auth-aware API routes, not UI components.

## 7. Service Interfaces

Application services coordinate domain logic and repositories.

```ts
// src/application/services/PortfolioService.ts
export class PortfolioService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly prices: PriceRepository,
    private readonly risk: RiskAnalyticsService,
  ) {}

  async getDashboard(userId: string): Promise<PortfolioDashboard> {
    const portfolio = await this.portfolios.getPortfolioByUserId(userId);
    if (!portfolio) throw new Error("Portfolio not found");

    const holdings = await this.portfolios.listHoldings(portfolio.id);
    const latestPrices = await this.prices.getLatestPrices(
      holdings.map((holding) => holding.assetId),
    );

    return buildPortfolioDashboard({
      portfolio,
      holdings,
      latestPrices,
      riskSummary: await this.risk.calculateSummary(portfolio.id),
    });
  }
}
```

```ts
// src/application/services/RecommendationService.ts
export class RecommendationService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly benchmarks: BenchmarkService,
    private readonly risk: RiskAnalyticsService,
    private readonly watchlist: WatchlistService,
    private readonly bonds: BondIntelligenceService,
    private readonly ai: AiProvider,
    private readonly recommendations: RecommendationRepository,
  ) {}

  async generateWeeklyReview(userId: string): Promise<RecommendationReport> {
    const signals = await this.buildRecommendationSignals(userId);

    const aiResult = await this.ai.generateStructuredObject({
      task: "weekly_portfolio_review",
      schemaName: "WeeklyPortfolioReview",
      input: signals,
    });

    const report = mapWeeklyReview(signals, aiResult);
    await this.recommendations.save(report);
    return report;
  }
}
```

## 8. API Provider Abstraction

Each external provider should have a narrow interface that returns normalized app types.

### Market Data Provider

```ts
// src/application/ports/providers/MarketDataProvider.ts
export interface MarketDataProvider {
  getDailyPrices(symbols: string[]): Promise<PricePoint[]>;
  getAssetProfile(symbol: string): Promise<AssetProfile | null>;
  getHistoricalPrices(
    symbol: string,
    range: HistoricalRange,
  ): Promise<PricePoint[]>;
}
```

```ts
// src/infrastructure/providers/market-data/FmpMarketDataProvider.ts
export class FmpMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://financialmodelingprep.com/api",
  ) {}

  async getDailyPrices(symbols: string[]): Promise<PricePoint[]> {
    const response = await fetch(
      `${this.baseUrl}/v3/quote/${symbols.join(",")}?apikey=${this.apiKey}`,
    );

    const data: FmpQuoteResponse[] = await response.json();
    return data.map(mapFmpQuoteToPricePoint);
  }
}
```

### Crypto Provider

```ts
export interface CryptoDataProvider {
  getSpotPrices(ids: string[], currency: string): Promise<CryptoPricePoint[]>;
  getHistoricalPrices(id: string, currency: string, days: number): Promise<PricePoint[]>;
}
```

### Macro Provider

```ts
export interface MacroDataProvider {
  getSeries(seriesId: string, startDate: string, endDate: string): Promise<MacroPoint[]>;
}
```

### AI Provider

```ts
export interface AiProvider {
  generateStructuredObject<TInput, TOutput>(request: {
    task: string;
    schemaName: string;
    input: TInput;
  }): Promise<TOutput>;
}
```

```ts
export class OpenAiProvider implements AiProvider {
  constructor(private readonly apiKey: string) {}

  async generateStructuredObject<TInput, TOutput>(request: {
    task: string;
    schemaName: string;
    input: TInput;
  }): Promise<TOutput> {
    // Call OpenAI Responses API with JSON schema output.
    // Return parsed, validated domain object.
    return parsedOutput as TOutput;
  }
}
```

```ts
export class VertexAiProvider implements AiProvider {
  constructor(private readonly projectId: string, private readonly location: string) {}

  async generateStructuredObject<TInput, TOutput>(request: {
    task: string;
    schemaName: string;
    input: TInput;
  }): Promise<TOutput> {
    // Same interface, different provider implementation.
    return parsedOutput as TOutput;
  }
}
```

## 9. Background Job Abstraction

Jobs should be plain application functions. They should not depend on Vercel-specific or Google-specific request objects.

### Job Handler Interface

```ts
export interface AppJob {
  name: string;
  run(input: JobInput): Promise<JobResult>;
}

export interface JobInput {
  triggeredBy: "vercel-cron" | "cloud-scheduler" | "manual" | "local";
  runId: string;
  now: Date;
}
```

### Daily Price Update Job

```ts
// src/jobs/dailyPriceUpdate.ts
export function createDailyPriceUpdateJob(deps: {
  marketData: MarketDataProvider;
  cryptoData: CryptoDataProvider;
  macroData: MacroDataProvider;
  assets: AssetRepository;
  prices: PriceRepository;
  jobRuns: JobRunRepository;
}): AppJob {
  return {
    name: "daily-price-update",

    async run(input) {
      await deps.jobRuns.start(input.runId, this.name);

      try {
        const assets = await deps.assets.listActivePricedAssets();
        const marketAssets = assets.filter(isMarketPricedAsset);
        const cryptoAssets = assets.filter(isCryptoAsset);

        const prices = await deps.marketData.getDailyPrices(
          marketAssets.map((asset) => asset.symbol),
        );

        const cryptoPrices = await deps.cryptoData.getSpotPrices(
          cryptoAssets.map((asset) => asset.providerId),
          "usd",
        );

        await deps.prices.savePricePoints([...prices, ...cryptoPrices]);
        await deps.jobRuns.complete(input.runId);

        return { ok: true };
      } catch (error) {
        await deps.jobRuns.fail(input.runId, serializeError(error));
        throw error;
      }
    },
  };
}
```

### Vercel Cron Route

```ts
// src/app/api/jobs/daily-price-update/route.ts
import { createContainer } from "@/server/container";
import { createDailyPriceUpdateJob } from "@/jobs/dailyPriceUpdate";

export async function GET(request: Request) {
  assertCronSecret(request);

  const container = createContainer();
  const job = createDailyPriceUpdateJob(container);

  await job.run({
    triggeredBy: "vercel-cron",
    runId: crypto.randomUUID(),
    now: new Date(),
  });

  return Response.json({ ok: true });
}
```

### Cloud Scheduler Route

The same route can be called by Cloud Scheduler, or a separate Cloud Run endpoint can wrap the same job.

```ts
export async function POST(request: Request) {
  assertCloudSchedulerAuth(request);

  const container = createContainer();
  const job = createDailyPriceUpdateJob(container);

  await job.run({
    triggeredBy: "cloud-scheduler",
    runId: crypto.randomUUID(),
    now: new Date(),
  });

  return Response.json({ ok: true });
}
```

## 10. Environment Variable Configuration

Use environment variables to select providers and configure credentials.

### Core Provider Selection

```text
APP_ENV=development
APP_BASE_URL=http://localhost:3000

DB_PROVIDER=postgres
AUTH_PROVIDER=supabase
JOB_PROVIDER=vercel
STORAGE_PROVIDER=supabase
ANALYTICS_PROVIDER=postgres
AI_PROVIDER=openai

MARKET_DATA_PROVIDER=fmp
CRYPTO_DATA_PROVIDER=coingecko
MACRO_DATA_PROVIDER=fred
```

### Initial Vercel + Supabase

```text
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

VERCEL_CRON_SECRET=...

OPENAI_API_KEY=...
FMP_API_KEY=...
COINGECKO_API_KEY=...
FRED_API_KEY=...
```

### Future Google Cloud

```text
DATABASE_URL=postgresql://cloud-sql-user:...
AUTH_PROVIDER=custom
JOB_PROVIDER=cloud-scheduler
STORAGE_PROVIDER=gcs
ANALYTICS_PROVIDER=bigquery
AI_PROVIDER=vertex

GCP_PROJECT_ID=...
GCP_REGION=...
GCS_BUCKET_NAME=...
BIGQUERY_DATASET=...
VERTEX_AI_LOCATION=...
CLOUD_SCHEDULER_AUDIENCE=...
```

### Typed Environment Loader

```ts
// src/infrastructure/config/env.ts
export const env = parseEnv({
  APP_ENV: requiredString(),
  DATABASE_URL: requiredString(),

  AUTH_PROVIDER: enumValue(["supabase", "custom"]),
  JOB_PROVIDER: enumValue(["vercel", "cloud-scheduler", "local"]),
  STORAGE_PROVIDER: enumValue(["supabase", "gcs", "none"]),
  ANALYTICS_PROVIDER: enumValue(["postgres", "bigquery"]),
  AI_PROVIDER: enumValue(["openai", "vertex"]),

  OPENAI_API_KEY: optionalString(),
  FMP_API_KEY: requiredString(),
  COINGECKO_API_KEY: optionalString(),
  FRED_API_KEY: optionalString(),
});
```

## 11. Dependency Container

The container selects infrastructure implementations based on environment variables.

```ts
// src/server/container.ts
export function createContainer() {
  const db = createDbClient(env.DATABASE_URL);

  const portfolioRepository = new PostgresPortfolioRepository(db);
  const assetRepository = new PostgresAssetRepository(db);
  const priceRepository = new PostgresPriceRepository(db);
  const recommendationRepository = new PostgresRecommendationRepository(db);

  const authProvider =
    env.AUTH_PROVIDER === "supabase"
      ? new SupabaseAuthProvider(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
      : new CustomAuthProvider();

  const aiProvider =
    env.AI_PROVIDER === "vertex"
      ? new VertexAiProvider(env.GCP_PROJECT_ID, env.VERTEX_AI_LOCATION)
      : new OpenAiProvider(env.OPENAI_API_KEY);

  const analyticsProvider =
    env.ANALYTICS_PROVIDER === "bigquery"
      ? new BigQueryAnalyticsProvider(env.GCP_PROJECT_ID, env.BIGQUERY_DATASET)
      : new PostgresAnalyticsProvider(db);

  return {
    db,
    authProvider,
    aiProvider,
    analyticsProvider,
    portfolios: portfolioRepository,
    assets: assetRepository,
    prices: priceRepository,
    recommendations: recommendationRepository,
    marketData: new FmpMarketDataProvider(env.FMP_API_KEY),
    cryptoData: new CoinGeckoCryptoDataProvider(env.COINGECKO_API_KEY),
    macroData: new FredMacroDataProvider(env.FRED_API_KEY),
    portfolioService: new PortfolioService(
      portfolioRepository,
      priceRepository,
      new RiskAnalyticsService(priceRepository, portfolioRepository),
    ),
  };
}
```

## 12. UI Boundary: No Direct Supabase Calls

UI components should receive data through hooks or server actions.

### Good Pattern

```tsx
// src/app/(dashboard)/portfolio/page.tsx
import { getPortfolioDashboard } from "@/server/actions/portfolioActions";
import { PortfolioDashboardView } from "@/components/portfolio/PortfolioDashboardView";

export default async function PortfolioPage() {
  const dashboard = await getPortfolioDashboard();
  return <PortfolioDashboardView dashboard={dashboard} />;
}
```

```ts
// src/server/actions/portfolioActions.ts
export async function getPortfolioDashboard() {
  const container = createContainer();
  const user = await container.authProvider.requireUser();
  return container.portfolioService.getDashboard(user.id);
}
```

### Avoid

```tsx
// Do not do this in UI components.
const supabase = createClient(...);
const { data } = await supabase.from("holdings").select("*");
```

## 13. Auth Portability

### Auth Interface

```ts
export interface AuthProvider {
  getCurrentUser(): Promise<AuthUser | null>;
  requireUser(): Promise<AuthUser>;
  getAccessToken(): Promise<string | null>;
}
```

### Supabase Adapter

```ts
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly url: string, private readonly anonKey: string) {}

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = createServerSupabaseClient(this.url, this.anonKey);
    const { data } = await supabase.auth.getUser();
    return data.user ? mapSupabaseUser(data.user) : null;
  }
}
```

Future migration can replace this adapter with a Google Identity Platform, Firebase Auth, Auth.js, or custom OIDC adapter without changing application services.

## 14. Storage Portability

Use object storage for uploaded CSVs, generated reports, exports, and future documents.

```ts
export interface ObjectStorageProvider {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  deleteObject(path: string): Promise<void>;
}
```

Initial:

- `SupabaseStorageProvider`

Future:

- `GcsStorageProvider`

The ingestion service should depend only on `ObjectStorageProvider`.

## 15. Analytics and BigQuery Path

MVP analytics can run in Postgres. For future BigQuery support, keep analytics exports behind an interface.

```ts
export interface AnalyticsWarehouseProvider {
  exportPortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void>;
  exportTelemetryEvent(event: TelemetryEvent): Promise<void>;
  exportRecommendation(report: RecommendationReport): Promise<void>;
}
```

Initial:

- Save analytics records in Postgres tables.
- Use SQL views for dashboard summaries.

Future:

- Stream or batch export daily snapshots, telemetry events, recommendations, and job runs to BigQuery.
- Keep user-facing operational reads in Cloud SQL PostgreSQL.
- Use BigQuery for heavier historical analysis and monthly learning.

## 16. Migration Paths

### Vercel to Cloud Run

1. Ensure Next.js app can run as a container.
2. Add `Dockerfile`.
3. Move cron-triggered routes behind authenticated HTTP endpoints.
4. Deploy container to Cloud Run.
5. Update DNS and environment variables.
6. Keep the same application services and repositories.

### Supabase Postgres to Cloud SQL PostgreSQL

1. Keep schema standard PostgreSQL.
2. Avoid Supabase-specific database functions in domain logic.
3. Export schema and data using `pg_dump`.
4. Restore into Cloud SQL PostgreSQL.
5. Update `DATABASE_URL`.
6. Repoint repositories without changing service code.

### Supabase Auth Migration

1. Keep app identity usage limited to `AuthProvider`.
2. Store application user profile separately from auth provider metadata.
3. Add new auth adapter.
4. Map old Supabase user IDs to new provider IDs if needed.
5. Run migration script for identity mapping.

### Vercel Cron to Cloud Scheduler

1. Keep jobs as plain `AppJob` functions.
2. Expose HTTP endpoints for job triggers.
3. Add Cloud Scheduler jobs with OIDC authentication.
4. Set `JOB_PROVIDER=cloud-scheduler`.
5. Disable Vercel Cron.

### Supabase Storage to Cloud Storage

1. Keep uploaded file references in an `objects` table using logical paths.
2. Copy objects from Supabase Storage to GCS.
3. Switch `STORAGE_PROVIDER=gcs`.
4. Regenerate signed URLs through `ObjectStorageProvider`.

### Postgres Analytics to BigQuery

1. Add `BigQueryAnalyticsProvider`.
2. Export historical snapshots and telemetry records.
3. Validate row counts and date ranges.
4. Move monthly telemetry learning reads to BigQuery where useful.
5. Keep operational data in PostgreSQL.

### OpenAI to Vertex AI, Optional

1. Keep all model calls behind `AiProvider`.
2. Use structured input and output schemas.
3. Implement `VertexAiProvider`.
4. Run output-quality comparison tests.
5. Switch `AI_PROVIDER=vertex` only after validation.

## 17. Suggested Database Boundaries

Operational PostgreSQL tables:

- `users`
- `portfolios`
- `holdings`
- `assets`
- `asset_provider_mappings`
- `price_snapshots`
- `portfolio_snapshots`
- `watchlist_items`
- `recommendations`
- `recommendation_feedback`
- `risk_snapshots`
- `scenario_runs`
- `job_runs`

Future BigQuery datasets:

- `portfolio_snapshots`
- `price_snapshots`
- `recommendation_events`
- `telemetry_events`
- `job_runs`
- `market_vision_reports`

## 18. Request Flow Examples

### Portfolio Dashboard

```text
PortfolioPage
  -> getPortfolioDashboard server action
    -> AuthProvider.requireUser()
    -> PortfolioService.getDashboard(user.id)
      -> PortfolioRepository.getPortfolioByUserId()
      -> PortfolioRepository.listHoldings()
      -> PriceRepository.getLatestPrices()
      -> RiskAnalyticsService.calculateSummary()
    -> PortfolioDashboardView
```

### Weekly Recommendation Job

```text
Vercel Cron or Cloud Scheduler
  -> /api/jobs/weekly-recommendations
    -> createWeeklyRecommendationsJob(container)
      -> PortfolioRepository.listActivePortfolios()
      -> BenchmarkService.calculateRelativePerformance()
      -> RiskAnalyticsService.calculateRiskSnapshot()
      -> WatchlistService.evaluateCandidates()
      -> BondIntelligenceService.evaluateBondExposure()
      -> AiProvider.generateStructuredObject()
      -> RecommendationRepository.save()
      -> AnalyticsWarehouseProvider.exportRecommendation()
```

## 19. Testing Strategy

Unit tests:

- Domain allocation rules.
- Risk calculations.
- Scenario analysis.
- ETF-first substitution logic.
- Provider response mappers.

Integration tests:

- Repository tests against local PostgreSQL.
- Service tests with fake providers.
- Job tests with fake repositories and providers.

Contract tests:

- `MarketDataProvider` implementations.
- `AiProvider` structured output validation.
- `ObjectStorageProvider` signed URL behavior.

Migration tests:

- Run schema on plain PostgreSQL without Supabase extensions unless explicitly required.
- Verify repositories work with standard Postgres connection strings.

## 20. Implementation Rules

- UI components must not import Supabase clients.
- UI components must not import provider clients.
- Application services must not import Next.js request or response objects.
- Repositories must return domain objects, not raw provider rows.
- Provider adapters must normalize external API responses.
- Jobs must be callable from Vercel, Cloud Scheduler, and local scripts.
- Environment variables must be parsed once through a typed config module.
- AI calls must use structured schemas where possible.
- Every scheduled job run must write a `job_runs` record.

