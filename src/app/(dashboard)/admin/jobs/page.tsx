import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JobsPage() {
  const container = createContainer();
  await container.authProvider.requireUser();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational job status will consolidate scheduled refreshes here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Job console placeholder</CardTitle>
          <CardDescription>Prepared for future cron and queue visibility.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Existing refresh controls remain on their current pages for this phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
