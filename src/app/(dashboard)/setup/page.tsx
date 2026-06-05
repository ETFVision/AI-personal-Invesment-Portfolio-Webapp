import { setupPortfolioAction, updatePortfolioSetupAction } from "@/server/actions/portfolioActions";
import { createContainer } from "@/server/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string; metadataMessage?: string; metadataError?: string; refreshMessage?: string; refreshError?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio, user } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  const instruments = await container.instrumentService.listInstruments();
  const historyCoverage = await container.instrumentMarketService.getHistoryCoverageSummary(instruments, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Manual setup</p>
          <h1 className="text-2xl font-semibold">Portfolio setup</h1>
        </div>
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
          {params.refreshMessage ? (
            <div className={`mb-4 rounded-md p-3 text-sm ${params.refreshError ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
              {params.refreshError ?? params.refreshMessage}
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
            <CardTitle>Admin settings</CardTitle>
            <CardDescription>Manage controlled app configuration that supports analytics and future intelligence layers.</CardDescription>
          </CardHeader>
          <CardContent>
            <a className="inline-flex rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/setup/taxonomy">
              Manage taxonomy
            </a>
          </CardContent>
        </Card>
      ) : null}
      {portfolio ? (
        <Card>
          <CardHeader>
            <CardTitle>Universe history coverage</CardTitle>
            <CardDescription>Backfill status for 3Y and 5Y instrument return calculations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 text-sm md:grid-cols-3 lg:grid-cols-6">
              <CoverageMetric label="Eligible" value={historyCoverage.totalEligible} />
              <CoverageMetric label="5Y complete" value={historyCoverage.completeFiveYear} />
              <CoverageMetric label="Need 5Y" value={historyCoverage.missingFiveYear} />
              <CoverageMetric label="3Y complete" value={historyCoverage.completeThreeYear} />
              <CoverageMetric label="Need 3Y" value={historyCoverage.missingThreeYear} />
              <CoverageMetric label="Est. clicks" value={historyCoverage.estimatedBackfillClicks} />
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">
                {historyCoverage.missingFiveYear === 0
                  ? "5Y history is complete for eligible instruments."
                  : `${historyCoverage.missingFiveYear} eligible instrument${historyCoverage.missingFiveYear === 1 ? "" : "s"} still need 5Y history. About ${historyCoverage.estimatedBackfillClicks} Backfill history click${historyCoverage.estimatedBackfillClicks === 1 ? "" : "s"} remaining.`}
              </div>
              {historyCoverage.excludedCrypto > 0 ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {historyCoverage.excludedCrypto} crypto instrument{historyCoverage.excludedCrypto === 1 ? "" : "s"} excluded from 3Y/5Y completeness because crypto ETF history may be shorter.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CoverageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
