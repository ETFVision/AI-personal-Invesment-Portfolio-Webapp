import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";

export const dynamic = "force-static";

export default function LegalDisclosuresPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-8 lg:px-10">
      <PageContainer>
        <PageHeader
          eyebrow="Legal"
          title="Legal Disclosures"
          description="Placeholder for ETFVision legal disclosure materials."
          meta={<StatusBadge tone="warning">Draft placeholder</StatusBadge>}
        />
        <Card>
          <CardHeader>
            <CardTitle>Disclosures are being prepared</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              This placeholder route exists so legal navigation is available without returning a missing page. ETFVision analytical outputs are informational only and do not constitute investment advice, a recommendation to buy, sell, or hold any security, or a solicitation for any transaction.
            </p>
            <p>
              For current scoring methodology, see{" "}
              <Link href="/methodology" className="font-medium text-teal-800 underline-offset-4 hover:underline">
                Analytical Methodology
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
