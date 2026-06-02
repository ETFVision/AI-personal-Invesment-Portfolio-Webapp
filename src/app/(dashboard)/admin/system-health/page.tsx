import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SystemHealthPage() {
  const container = createContainer();
  await container.authProvider.requireUser();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold">System Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">A future home for provider freshness, job health, and data quality checks.</p>
      </div>
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
    </div>
  );
}
