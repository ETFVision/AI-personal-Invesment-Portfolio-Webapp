import { setupPortfolioAction } from "@/server/actions/portfolioActions";
import { createContainer } from "@/server/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Manual setup</p>
        <h1 className="text-2xl font-semibold">Portfolio setup</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{portfolio ? "Portfolio already exists" : "Create your portfolio baseline"}</CardTitle>
          <CardDescription>
            Start with a base currency and risk profile. Cash, holdings, and transactions are added next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</div> : null}
          {portfolio ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <a className="rounded-md bg-primary px-4 py-2 text-center text-sm text-primary-foreground" href="/portfolio">
                Go to dashboard
              </a>
              <a className="rounded-md border px-4 py-2 text-center text-sm" href="/cash">
                Add cash
              </a>
            </div>
          ) : (
            <form action={setupPortfolioAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Portfolio name</Label>
                <Input id="name" name="name" defaultValue="Personal Portfolio" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCurrency">Base currency</Label>
                <Input id="baseCurrency" name="baseCurrency" defaultValue="USD" required maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskProfile">Risk profile</Label>
                <Select id="riskProfile" name="riskProfile" defaultValue="balanced">
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="growth">Growth</option>
                  <option value="aggressive">Aggressive</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Create portfolio</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

