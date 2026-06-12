export type SecurityType = "STOCK" | "ETF" | "BOND" | "FUND" | "CASH" | "CRYPTO" | "INTERNAL_SECURITY" | "UNKNOWN";

export type SecurityMasterRecord = {
  id: string;
  canonicalSymbol: string | null;
  canonicalName: string;
  securityType: SecurityType;
  assetCategory?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  currency?: string | null;
  primaryExchange?: string | null;
  isin?: string | null;
  figi?: string | null;
  cusip?: string | null;
  sedol?: string | null;
  lei?: string | null;
  isActive?: boolean;
};

export type SecurityIdentifier = {
  securityId: string;
  identifierType: "SYMBOL" | "PROVIDER_SYMBOL" | "EXCHANGE_SYMBOL" | "ISIN" | "FIGI" | "CUSIP" | "SEDOL" | "LEI" | "NAME_ALIAS" | "OLD_TICKER" | "PROVIDER_ID";
  identifierValue: string;
  source: string;
  isPrimary?: boolean;
  confidenceScore?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
};

export type SecurityAlias = {
  securityId: string;
  oldSymbol: string | null;
  newSymbol: string | null;
  aliasType: "SYMBOL_FORMAT_VARIANT" | "TICKER_CHANGE" | "RELATED_SHARE_CLASS" | "PROVIDER_VARIANT" | string;
  effectiveDate?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  source?: string | null;
};

export type ResolveSecurityInput = {
  figi?: string | null;
  isin?: string | null;
  cusip?: string | null;
  sedol?: string | null;
  lei?: string | null;
  exchange?: string | null;
  symbol?: string | null;
  provider?: string | null;
  providerSymbol?: string | null;
  name?: string | null;
};

export type SecurityMappingStatus = "MAPPED" | "AMBIGUOUS" | "UNMAPPED";

export type ResolveSecurityResult = {
  status: SecurityMappingStatus;
  security: SecurityMasterRecord | null;
  matchedBy: string | null;
  confidenceScore: number;
  candidates: SecurityMasterRecord[];
  warnings: string[];
};

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function upper(value: string | null | undefined) {
  const trimmed = clean(value);
  return trimmed ? trimmed.toUpperCase() : "";
}

function key(value: string | null | undefined) {
  return upper(value).replace(/[^A-Z0-9]+/g, "");
}

function active(record: SecurityMasterRecord) {
  return record.isActive !== false;
}

function uniqueById(records: SecurityMasterRecord[]) {
  const byId = new Map<string, SecurityMasterRecord>();
  for (const record of records) byId.set(record.id, record);
  return Array.from(byId.values());
}

function mapped(security: SecurityMasterRecord, matchedBy: string, confidenceScore: number, warnings: string[] = []): ResolveSecurityResult {
  return { status: "MAPPED", security, matchedBy, confidenceScore, candidates: [security], warnings };
}

function ambiguous(candidates: SecurityMasterRecord[], matchedBy: string, warnings: string[] = []): ResolveSecurityResult {
  return { status: "AMBIGUOUS", security: null, matchedBy, confidenceScore: 35, candidates, warnings };
}

function unmapped(warnings: string[] = []): ResolveSecurityResult {
  return { status: "UNMAPPED", security: null, matchedBy: null, confidenceScore: 0, candidates: [], warnings };
}

export function normalizeTickerSymbol(symbol: string | null | undefined) {
  const normalized = upper(symbol);
  if (!normalized) return "";
  if (["BRK-B", "BRK/B", "BRK B"].includes(normalized)) return "BRK.B";
  return normalized;
}

export class SecurityMasterService {
  private readonly securities: SecurityMasterRecord[];
  private readonly securityById: Map<string, SecurityMasterRecord>;
  private readonly identifiers: SecurityIdentifier[];
  private readonly aliases: SecurityAlias[];

  constructor(input: { securities: SecurityMasterRecord[]; identifiers?: SecurityIdentifier[]; aliases?: SecurityAlias[] }) {
    this.securities = input.securities.filter(active);
    this.securityById = new Map(this.securities.map((security) => [security.id, security]));
    this.identifiers = input.identifiers ?? [];
    this.aliases = input.aliases ?? [];
  }

  resolveSecurity(input: ResolveSecurityInput): ResolveSecurityResult {
    const byFigi = this.resolveByIdentifier("FIGI", input.figi, 98);
    if (byFigi.status !== "UNMAPPED") return byFigi;

    const byIsin = this.resolveByIdentifier("ISIN", input.isin, 95);
    if (byIsin.status !== "UNMAPPED") return byIsin;

    const byCusip = this.resolveByIdentifier("CUSIP", input.cusip, 90);
    if (byCusip.status !== "UNMAPPED") return byCusip;

    const bySedol = this.resolveByIdentifier("SEDOL", input.sedol, 88);
    if (bySedol.status !== "UNMAPPED") return bySedol;

    const byExchangeSymbol = this.resolveByExchangeSymbol(input.exchange, input.symbol);
    if (byExchangeSymbol.status !== "UNMAPPED") return byExchangeSymbol;

    const byProviderSymbol = this.resolveByProviderSymbol(input.provider, input.providerSymbol ?? input.symbol);
    if (byProviderSymbol.status !== "UNMAPPED") return byProviderSymbol;

    const byAlias = this.resolveByAlias(input.symbol);
    if (byAlias.status !== "UNMAPPED") return byAlias;

    const byName = this.resolveByNameFallback(input.name);
    if (byName.status !== "UNMAPPED") return byName;

    return unmapped(["No security match found from identifiers, exchange symbol, provider symbol, alias, or name."]);
  }

  resolveByFigi(figi: string | null | undefined) {
    return this.resolveByIdentifier("FIGI", figi, 98);
  }

  resolveByIsin(isin: string | null | undefined) {
    return this.resolveByIdentifier("ISIN", isin, 95);
  }

  resolveByCusip(cusip: string | null | undefined) {
    return this.resolveByIdentifier("CUSIP", cusip, 90);
  }

  resolveByExchangeSymbol(exchange: string | null | undefined, symbol: string | null | undefined): ResolveSecurityResult {
    const normalizedSymbol = normalizeTickerSymbol(symbol);
    if (!normalizedSymbol) return unmapped();
    const exchangeKey = upper(exchange);
    const matches = this.securities.filter((security) =>
      normalizeTickerSymbol(security.canonicalSymbol) === normalizedSymbol &&
      (!exchangeKey || upper(security.primaryExchange) === exchangeKey)
    );
    if (matches.length === 1) return mapped(matches[0], "EXCHANGE_SYMBOL", exchangeKey ? 82 : 75);
    if (matches.length > 1) return ambiguous(matches, "EXCHANGE_SYMBOL", ["Multiple active securities matched the same exchange/symbol input."]);
    return unmapped();
  }

  resolveByProviderSymbol(provider: string | null | undefined, providerSymbol: string | null | undefined): ResolveSecurityResult {
    const normalized = normalizeTickerSymbol(providerSymbol);
    if (!normalized) return unmapped();
    const providerKey = upper(provider);
    const matches = this.identifiers
      .filter((identifier) =>
        identifier.identifierType === "PROVIDER_SYMBOL" &&
        normalizeTickerSymbol(identifier.identifierValue) === normalized &&
        (!providerKey || upper(identifier.source) === providerKey)
      )
      .map((identifier) => this.securityById.get(identifier.securityId))
      .filter((security): security is SecurityMasterRecord => Boolean(security));
    const unique = uniqueById(matches);
    if (unique.length === 1) return mapped(unique[0], "PROVIDER_SYMBOL", 82);
    if (unique.length > 1) return ambiguous(unique, "PROVIDER_SYMBOL", ["Multiple securities matched the provider symbol."]);
    return unmapped();
  }

  resolveByNameFallback(name: string | null | undefined): ResolveSecurityResult {
    const normalizedName = key(name);
    if (!normalizedName) return unmapped();
    const matches = this.securities.filter((security) => key(security.canonicalName) === normalizedName);
    if (matches.length === 1) return mapped(matches[0], "NAME_FALLBACK", 55, ["Name fallback match should be reviewed before use in high-impact calculations."]);
    if (matches.length > 1) return ambiguous(matches, "NAME_FALLBACK", ["Multiple securities matched the same normalized name."]);
    return unmapped();
  }

  private resolveByIdentifier(identifierType: SecurityIdentifier["identifierType"], value: string | null | undefined, confidenceScore: number): ResolveSecurityResult {
    const normalized = upper(value);
    if (!normalized) return unmapped();
    const matches = [
      ...this.securities.filter((security) => upper(this.fieldForIdentifier(security, identifierType)) === normalized),
      ...this.identifiers
        .filter((identifier) => identifier.identifierType === identifierType && upper(identifier.identifierValue) === normalized)
        .map((identifier) => this.securityById.get(identifier.securityId))
        .filter((security): security is SecurityMasterRecord => Boolean(security))
    ];
    const unique = uniqueById(matches);
    if (unique.length === 1) return mapped(unique[0], identifierType, confidenceScore);
    if (unique.length > 1) return ambiguous(unique, identifierType, [`Multiple securities share ${identifierType} ${normalized}.`]);
    return unmapped();
  }

  private resolveByAlias(symbol: string | null | undefined): ResolveSecurityResult {
    const normalized = normalizeTickerSymbol(symbol);
    if (!normalized) return unmapped();
    const matches = this.aliases
      .filter((alias) => normalizeTickerSymbol(alias.oldSymbol) === normalized || normalizeTickerSymbol(alias.newSymbol) === normalized)
      .map((alias) => this.securityById.get(alias.securityId))
      .filter((security): security is SecurityMasterRecord => Boolean(security));
    const unique = uniqueById(matches);
    if (unique.length === 1) return mapped(unique[0], "ALIAS", 78);
    if (unique.length > 1) return ambiguous(unique, "ALIAS", ["Multiple securities matched the same alias."]);
    return unmapped();
  }

  private fieldForIdentifier(security: SecurityMasterRecord, identifierType: SecurityIdentifier["identifierType"]) {
    if (identifierType === "FIGI") return security.figi;
    if (identifierType === "ISIN") return security.isin;
    if (identifierType === "CUSIP") return security.cusip;
    if (identifierType === "SEDOL") return security.sedol;
    if (identifierType === "LEI") return security.lei;
    if (identifierType === "SYMBOL") return security.canonicalSymbol;
    return null;
  }
}
