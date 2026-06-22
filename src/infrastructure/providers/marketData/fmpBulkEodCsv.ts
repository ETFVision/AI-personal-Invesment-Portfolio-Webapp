import type { MarketPriceQuote } from "@/application/ports/providers/MarketDataProvider";

function cleanCsvCell(value: string | undefined) {
  return (value ?? "").trim().replace(/^"|"$/g, "");
}

export function parseFmpBulkEodCsv(body: string, requestedDate: string): MarketPriceQuote[] {
  const lines = body.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => cleanCsvCell(header).toLowerCase());
  const columnIndex = new Map(headers.map((header, index) => [header, index]));
  const symbolIndex = columnIndex.get("symbol");
  const dateIndex = columnIndex.get("date");
  const adjCloseIndex = columnIndex.get("adjclose");
  const closeIndex = columnIndex.get("close");
  const priceIndex = columnIndex.get("price");

  if (symbolIndex === undefined) return [];

  return lines
    .slice(1)
    .map((line) => {
      const columns = line.split(",").map(cleanCsvCell);
      const symbol = columns[symbolIndex]?.toUpperCase() ?? "";
      const price = Number(
        (adjCloseIndex === undefined ? undefined : columns[adjCloseIndex]) ??
          (closeIndex === undefined ? undefined : columns[closeIndex]) ??
          (priceIndex === undefined ? undefined : columns[priceIndex]) ??
          NaN
      );
      return {
        symbol,
        price,
        currency: null,
        asOfDate: dateIndex === undefined ? requestedDate : columns[dateIndex] || requestedDate,
        raw: Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]))
      };
    })
    .filter((quote) => quote.symbol && Number.isFinite(quote.price));
}
