import { redirect } from "next/navigation";

export default async function LegacyFundamentalDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  redirect(`/instruments/${encodeURIComponent(symbol.toUpperCase())}#fundamentals`);
}
