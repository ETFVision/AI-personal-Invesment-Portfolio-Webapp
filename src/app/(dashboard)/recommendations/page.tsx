import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RecommendationsPage() {
  const container = createContainer();
  await container.authProvider.requireUser();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Research</p>
        <h1 className="text-2xl font-semibold">Recommendations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Future recommendation workflows will live here after scoring and guardrails are built.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Future layer placeholder</CardTitle>
          <CardDescription>No recommendation engine or buy/sell logic is implemented yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            This page exists only to stabilize the Research navigation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
