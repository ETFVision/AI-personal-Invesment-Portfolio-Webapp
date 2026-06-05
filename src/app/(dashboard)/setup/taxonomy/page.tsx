import { createContainer } from "@/server/container";
import { approveTaxonomyMappingAction, saveInstrumentTaxonomyAction } from "@/server/actions/taxonomyActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";

type TaxonomyPageProps = {
  searchParams?: Promise<{
    taxonomyMessage?: string;
    taxonomyError?: string;
  }>;
};

function asThemeInput(themes: string[]) {
  return themes.join(", ");
}

export default async function TaxonomyPage({ searchParams }: TaxonomyPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const [sectors, themes, providerMappings, instrumentMappings] = await Promise.all([
    container.instrumentService.listCanonicalSectors(),
    container.instrumentService.listCanonicalThemes(),
    container.instrumentService.listProviderTaxonomyMappings(),
    container.instrumentService.listInstrumentTaxonomyMappings()
  ]);

  const unmapped = instrumentMappings.filter(
    (mapping) =>
      mapping.taxonomyReviewStatus === "needs_review" ||
      !mapping.canonicalSector ||
      mapping.canonicalThemes.length === 0
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Taxonomy Management"
        description="Canonical sectors, themes, provider mappings and manual taxonomy overrides."
        meta={
          <>
            <StatusBadge tone="info">{sectors.length} sectors</StatusBadge>
            <StatusBadge tone="info">{themes.length} themes</StatusBadge>
            <StatusBadge tone={unmapped.length > 0 ? "warning" : "positive"}>{unmapped.length} review items</StatusBadge>
          </>
        }
      />

      {params?.taxonomyMessage || params?.taxonomyError ? (
        <Card>
          <CardContent className={params.taxonomyError ? "p-4 text-sm text-destructive" : "p-4 text-sm text-muted-foreground"}>
            {params.taxonomyError ?? params.taxonomyMessage}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <TaxonomyList title="Canonical sectors" description="Controlled sector list used by allocation, risk and future scoring." items={sectors.map((item) => item.name)} />
        <TaxonomyList title="Canonical themes" description="Controlled theme list used by watchlists, Market Vision and future recommendations." items={themes.map((item) => item.name)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Unmapped provider values</CardTitle>
          <CardDescription>Rows here need review because provider metadata did not map cleanly or useful themes are missing.</CardDescription>
        </CardHeader>
        <CardContent>
          {unmapped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unmapped active values found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Raw sector</th>
                    <th className="py-2 pr-3">Raw industry</th>
                    <th className="py-2 pr-3">Canonical</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unmapped.slice(0, 25).map((mapping) => (
                    <tr key={mapping.instrumentId} className="border-b align-top last:border-0">
                      <td className="py-3 pr-3 font-medium">{mapping.symbol ?? "-"}</td>
                      <td className="py-3 pr-3">{mapping.rawSector ?? "-"}</td>
                      <td className="py-3 pr-3">{mapping.rawIndustry ?? "-"}</td>
                      <td className="py-3 pr-3">{mapping.canonicalSector ?? "-"} / {mapping.canonicalThemes.join(", ") || "-"}</td>
                      <td className="py-3 pr-3">
                        <form action={approveTaxonomyMappingAction}>
                          <input type="hidden" name="instrumentId" value={mapping.instrumentId} />
                          <input type="hidden" name="rawSector" value={mapping.rawSector ?? ""} />
                          <input type="hidden" name="rawIndustry" value={mapping.rawIndustry ?? ""} />
                          <input type="hidden" name="canonicalSector" value={mapping.canonicalSector ?? "Multi-Asset / Broad Market"} />
                          <input type="hidden" name="canonicalThemes" value={asThemeInput(mapping.canonicalThemes.length > 0 ? mapping.canonicalThemes : ["Quality"])} />
                          <Button type="submit" size="sm" variant="outline">Approve</Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current instrument mappings</CardTitle>
          <CardDescription>Canonical values are used by the UI and intelligence logic. Raw provider fields stay visible for audit only.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Raw provider</th>
                  <th className="py-2 pr-3">Canonical sector</th>
                  <th className="py-2 pr-3">Canonical themes</th>
                  <th className="py-2 pr-3">Override</th>
                </tr>
              </thead>
              <tbody>
                {instrumentMappings.slice(0, 100).map((mapping) => (
                  <tr key={mapping.instrumentId} className="border-b align-top last:border-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{mapping.symbol ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{mapping.name}</div>
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      <div>{mapping.rawSector ?? "-"}</div>
                      <div>{mapping.rawIndustry ?? "-"}</div>
                    </td>
                    <td className="py-3 pr-3">{mapping.canonicalSector ?? "-"}</td>
                    <td className="py-3 pr-3">{mapping.canonicalThemes.join(", ") || "-"}</td>
                    <td className="py-3 pr-3">
                      <form action={saveInstrumentTaxonomyAction} className="grid min-w-80 gap-2">
                        <input type="hidden" name="instrumentId" value={mapping.instrumentId} />
                        <input type="hidden" name="rawSector" value={mapping.rawSector ?? ""} />
                        <input type="hidden" name="rawIndustry" value={mapping.rawIndustry ?? ""} />
                        <select name="canonicalSector" defaultValue={mapping.canonicalSector ?? ""} className="h-9 rounded-md border bg-background px-3 text-xs">
                          <option value="">Select sector</option>
                          {sectors.map((sector) => (
                            <option key={sector.id} value={sector.name}>{sector.name}</option>
                          ))}
                        </select>
                        <Input name="canonicalThemes" defaultValue={asThemeInput(mapping.canonicalThemes)} placeholder="Theme, Theme" className="h-9 text-xs" />
                        <div className="flex items-center gap-2">
                          <Button type="submit" size="sm" variant="outline">Save override</Button>
                          {mapping.taxonomyIsManualOverride ? <span className="text-xs text-amber-600">Manual</span> : null}
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider taxonomy mappings</CardTitle>
          <CardDescription>Raw source values mapped into controlled canonical vocabulary.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
            {providerMappings.map((mapping) => (
              <div key={mapping.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="font-medium">{mapping.rawValue}</div>
                <div className="text-xs text-muted-foreground">{mapping.sourceProvider} / {mapping.mappingType}</div>
                <div className="mt-1 text-xs">{mapping.canonicalValue}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function TaxonomyList({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
            {item}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
