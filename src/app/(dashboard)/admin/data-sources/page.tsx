import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { env } from "@/infrastructure/config/env";

function statusLabel(enabled: boolean, configured = true) {
  if (!configured) return { label: "Missing key", className: "text-destructive" };
  if (!enabled) return { label: "Disabled", className: "text-amber-600" };
  return { label: "Ready", className: "text-emerald-600" };
}

const providers = [
  {
    name: "Financial Modeling Prep",
    role: "Prices, metadata, fundamentals and instrument news",
    status: statusLabel(Boolean(env.FMP_API_KEY), Boolean(env.FMP_API_KEY)),
    notes: "Server-side API key only."
  },
  {
    name: "FRED",
    role: "Macro indicators and macro theme signals",
    status: statusLabel(Boolean(env.FRED_API_KEY), Boolean(env.FRED_API_KEY)),
    notes: `${env.FRED_BACKFILL_YEARS}y backfill window.`
  },
  {
    name: "NewsData.io",
    role: "Primary macro and world-news stream",
    status: statusLabel(env.ENABLE_NEWSDATA_INGESTION, Boolean(env.NEWSDATA_API_KEY)),
    notes: `${env.NEWSDATA_MAX_QUERY_GROUPS} query groups/run, ${env.NEWSDATA_RUN_FREQUENCY_DAYS}d success cadence.`
  },
  {
    name: "GDELT",
    role: "Fallback macro and world-news stream",
    status: statusLabel(env.ENABLE_GDELT_INGESTION),
    notes: `${env.GDELT_MAX_QUERY_GROUPS_PER_RUN} query group/run with queue pacing.`
  },
  {
    name: "OpenAI",
    role: "Market Vision generation and optional news classification",
    status: statusLabel(Boolean(env.OPENAI_API_KEY), Boolean(env.OPENAI_API_KEY)),
    notes: `Market Vision model: ${env.MARKET_VISION_MODEL}.`
  }
];

export default async function DataSourcesPage() {
  const container = createContainer();
  await container.authProvider.requireUser();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Data Sources"
        description="Provider configuration, macro data and data-source health."
        meta={<StatusBadge tone="info">{providers.length} providers</StatusBadge>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Provider configuration</CardTitle>
          <CardDescription>Provider keys remain server-side environment variables. Detailed NewsData and GDELT queue diagnostics live on News & Themes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.name} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{provider.role}</p>
                </div>
                <span className={`shrink-0 text-sm font-medium ${provider.status.className}`}>{provider.status.label}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{provider.notes}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
