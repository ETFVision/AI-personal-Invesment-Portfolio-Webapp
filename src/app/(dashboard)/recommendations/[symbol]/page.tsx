import Link from "next/link";
import { notFound } from "next/navigation";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryMetric } from "@/components/instruments/instrument-cards";
import { formatPercent } from "@/lib/utils";

type RecommendationDetailPageProps = {
  params: Promise<{ symbol: string }>;
};

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

export default async function RecommendationDetailPage({ params }: RecommendationDetailPageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  const container = createContainer();
  await container.authProvider.requireUser();
  const instruments = await container.instrumentService.listInstruments({ query: decodedSymbol });
  const instrument = instruments.find((item) => item.symbol?.toUpperCase() === decodedSymbol);
  if (!instrument) notFound();
  const recommendation = await container.recommendationService.getLatestForInstrument(instrument.id);
  if (!recommendation) notFound();
  const components = Array.isArray((recommendation.scoringBreakdown as any).components)
    ? ((recommendation.scoringBreakdown as any).components as Array<{ key: string; label: string; score: number | null; weight: number; reason: string }>)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/recommendations" className="hover:underline">Recommendations</Link>
        <span>/</span>
        <span>{decodedSymbol}</span>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Recommendation detail</p>
        <h1 className="text-2xl font-semibold">{decodedSymbol}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Deterministic V1 recommendation trace. No trades are placed.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{recommendation.recommendationLabel}</CardTitle>
          <CardDescription>{recommendation.recommendationReasoningSummary}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Overall score" value={score(recommendation.overallScore)} />
          <SummaryMetric label="Confidence" value={formatPercent(recommendation.confidenceScore / 100)} />
          <SummaryMetric label="Risk level" value={recommendation.riskLevel.replaceAll("_", " ")} />
          <SummaryMetric label="Time horizon" value={recommendation.timeHorizon.replaceAll("_", " ")} />
          <SummaryMetric label="Instrument type" value={recommendation.instrumentType} />
          <SummaryMetric label="Updated" value={recommendation.updatedAt?.slice(0, 10) ?? "-"} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Drivers</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Positive</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{(recommendation.positiveDrivers.length ? recommendation.positiveDrivers : ["-"]).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Negative</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{(recommendation.negativeDrivers.length ? recommendation.negativeDrivers : ["-"]).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Guardrails & Limitations</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Guardrails</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{(recommendation.guardrailsApplied.length ? recommendation.guardrailsApplied : ["-"]).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Data limitations</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{(recommendation.dataLimitations.length ? recommendation.dataLimitations : ["-"]).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Breakdown</CardTitle>
          <CardDescription>Weighted components used by the deterministic recommendation rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Component</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {components.map((component) => (
                  <tr key={component.key} className="border-b last:border-0">
                    <td className="p-3">{component.label}</td>
                    <td className="p-3">{score(component.score)}</td>
                    <td className="p-3">{formatPercent(component.weight)}</td>
                    <td className="p-3 text-muted-foreground">{component.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
