import { refreshMetadataAction, setupPortfolioAction, updatePortfolioSetupAction } from "@/server/actions/portfolioActions";
import { createContainer } from "@/server/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string; metadataMessage?: string; metadataError?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio, user } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

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
          {params.metadataMessage ? (
            <div className={`mb-4 rounded-md p-3 text-sm ${params.metadataError ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
              {params.metadataError ?? params.metadataMessage}
            </div>
          ) : null}
          {portfolio && params.edit !== "true" ? (
            <div className="space-y-5">
              <dl className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Portfolio</dt>
                  <dd className="mt-1 text-sm font-medium">{portfolio.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Base currency</dt>
                  <dd className="mt-1 text-sm font-medium">{portfolio.baseCurrency}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Risk profile</dt>
                  <dd className="mt-1 text-sm font-medium capitalize">{user.riskProfile ?? "Not set"}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a className="rounded-md border px-4 py-2 text-center text-sm" href="/setup?edit=true">
                  Edit setup
                </a>
                <a className="rounded-md bg-primary px-4 py-2 text-center text-sm text-primary-foreground" href="/portfolio">
                  Go to dashboard
                </a>
                <a className="rounded-md border px-4 py-2 text-center text-sm" href="/cash">
                  Add cash
                </a>
              </div>
            </div>
          ) : (
            <form action={portfolio ? updatePortfolioSetupAction : setupPortfolioAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Portfolio name</Label>
                <Input id="name" name="name" defaultValue={portfolio?.name ?? "Personal Portfolio"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCurrency">Base currency</Label>
                <Input id="baseCurrency" name="baseCurrency" defaultValue={portfolio?.baseCurrency ?? "USD"} required maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskProfile">Risk profile</Label>
                <Select id="riskProfile" name="riskProfile" defaultValue={user.riskProfile ?? "balanced"}>
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="growth">Growth</option>
                  <option value="aggressive">Aggressive</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit">{portfolio ? "Save setup" : "Create portfolio"}</Button>
                {portfolio ? (
                  <a className="ml-3 inline-flex rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/setup">
                    Cancel
                  </a>
                ) : null}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      {portfolio ? (
        <Card>
          <CardHeader>
            <CardTitle>Asset metadata</CardTitle>
            <CardDescription>Refresh sector, industry, country, region, exchange, and currency metadata for current holdings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={refreshMetadataAction}>
              <Button type="submit" variant="secondary">Refresh metadata</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
