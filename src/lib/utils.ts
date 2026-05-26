import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatCurrencyWithCode(value: number, currency = "USD") {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

export function formatNumber(value: number, maximumFractionDigits = 4) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatAssetTypeLabel(value: string) {
  const labels: Record<string, string> = {
    stock: "Stock",
    etf: "ETF",
    bond_etf: "Bond ETF",
    gold_etf: "Gold ETF",
    crypto: "Crypto",
    cash: "Cash",
    other: "Other"
  };

  return labels[value] ?? value.replace("_", " ");
}
