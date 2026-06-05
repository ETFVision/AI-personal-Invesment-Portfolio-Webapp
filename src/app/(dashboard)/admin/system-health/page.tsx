import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";

export default async function SystemHealthPage() {
  const container = createContainer();
  await container.authProvider.requireUser();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="System Health"
        description="A future home for provider freshness, job health and data quality checks."
        meta={<StatusBadge tone="neutral">Prepared</StatusBadge>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Health summary placeholder</CardTitle>
          <CardDescription>Prepared for future monitoring without adding telemetry in this phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No system-health aggregation is implemented yet.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
