import type { Instrument } from "@/domain/universe/types";

export type CanonicalInstrumentType = "stock" | "etf" | "bond_etf" | "gold_etf" | "crypto" | "benchmark";

export function resolveInstrumentType(instrument: Instrument): CanonicalInstrumentType {
  if (instrument.assetClass === "benchmark" || instrument.instrumentType === "benchmark") return "benchmark";
  if (instrument.assetClass === "bond_etf" || instrument.instrumentType === "bond_etf") return "bond_etf";
  if (instrument.assetClass === "gold_etf" || instrument.instrumentType === "gold_etf") return "gold_etf";
  if (instrument.assetClass === "crypto" || instrument.instrumentType === "crypto" || instrument.instrumentType === "crypto_etf") return "crypto";
  if (instrument.assetClass === "stock") return "stock";
  return "etf";
}

export function instrumentTypeLabel(type: CanonicalInstrumentType) {
  const labels: Record<CanonicalInstrumentType, string> = {
    stock: "Stock",
    etf: "ETF",
    bond_etf: "Bond ETF",
    gold_etf: "Gold ETF",
    crypto: "Crypto",
    benchmark: "Benchmark"
  };
  return labels[type];
}
