import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DataSourcesPage() {
  const container = createContainer();
  await container.authProvider.requireUser();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold">Provider Config</h1>
        <p className="mt-1 text-sm text-muted-foreground">Provider configuration and data-source health will live here later.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Data source placeholder</CardTitle>
          <CardDescription>FMP, FRED, GDELT and OpenAI keys remain server-side environment variables.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            This phase only creates the admin information architecture.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
