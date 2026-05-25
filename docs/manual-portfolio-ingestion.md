# Manual Portfolio Ingestion Layer Design

## 1. Objective

The Manual Portfolio Ingestion Layer lets the user create and maintain a personal portfolio in Phase 1 through manual entry of cash, holdings, and transactions.

The layer should be simple enough for personal use, but structured enough to support:

- Multi-currency portfolios.
- Cost basis tracking.
- Broker/account attribution.
- Validation and duplicate warnings.
- Editing and deleting entries.
- Future CSV import.
- Future Interactive Brokers import.

The ingestion layer should normalize raw user input into durable portfolio records and transaction history. It should not be tightly coupled to the UI form that created the data.

## 2. Phase 1 Scope

Supported in Phase 1:

- Manual cash balance entry.
- Manual holding entry.
- Manual transaction entry.
- Editing cash, holdings, and transactions.
- Soft delete or archive behavior.
- Duplicate warnings.
- Multi-currency fields.
- Basic cost basis tracking.
- Broker/account name.
- Notes.

Future extensibility:

- CSV upload.
- Copy-paste table import.
- Interactive Brokers activity statement import.
- Broker sync adapters.
- Tax-lot-level accounting.
- Dividend and interest income ingestion.

## 3. Supported Entry Types

### Cash Entry

Used to record available cash by currency and account.

Fields:

- Cash available.
- Currency.
- Broker/account name.
- Notes.
- As-of date.

### Holding Entry

Used to create or update a current position directly.

Fields:

- Asset type.
- Ticker.
- Asset name.
- Quantity.
- Average cost.
- Purchase date.
- Currency.
- Broker/account name.
- Notes.

Holding entry is useful when the user wants to quickly initialize a portfolio without entering every historical trade.

### Transaction Entry

Used to record an event that changes holdings or cash.

Fields:

- Transaction type.
- Asset type.
- Ticker.
- Asset name.
- Quantity.
- Price.
- Fees.
- Transaction date.
- Currency.
- Broker/account name.
- Notes.

Recommended transaction types:

- `buy`
- `sell`
- `deposit_cash`
- `withdraw_cash`
- `dividend`
- `interest`
- `fee`
- `transfer_in`
- `transfer_out`
- `split`
- `manual_adjustment`

Phase 1 can support a smaller visible set:

- Buy.
- Sell.
- Deposit cash.
- Withdraw cash.
- Manual adjustment.

## 4. User Flow

### First-Time Portfolio Setup

1. User opens Portfolio Setup.
2. User selects base currency.
3. User adds cash balances by currency/account.
4. User adds current holdings manually.
5. App validates entries.
6. App warns about duplicates or missing data.
7. User reviews normalized portfolio.
8. User confirms import.
9. App creates holdings, cash balances, transactions, and an ingestion event.
10. App calculates current allocation once market data is available.

### Add Holding Flow

1. User clicks Add Holding.
2. User selects asset type.
3. User enters ticker and optional asset name.
4. App attempts to resolve the asset.
5. User enters quantity, average cost, purchase date, currency, account, and notes.
6. App validates values.
7. App checks for duplicate existing holding in same account.
8. User confirms add or merge/update.
9. App creates or updates holding and records a synthetic opening transaction.

### Add Transaction Flow

1. User clicks Add Transaction.
2. User selects transaction type.
3. Form adapts required fields based on type.
4. User enters ticker, quantity, price, date, currency, account, and notes.
5. App validates transaction.
6. App previews impact on holdings and cash.
7. User confirms.
8. App records transaction and recalculates holding quantity and cost basis.

### Edit Flow

1. User opens holding, cash balance, or transaction detail.
2. User edits fields.
3. App validates changes.
4. App previews recalculated impact.
5. User confirms.
6. App stores an audit record and updates derived holdings/cash.

### Delete Flow

1. User requests delete.
2. App explains whether deleting affects holdings, cash, and cost basis.
3. User confirms.
4. App soft deletes the source record.
5. App recalculates derived portfolio state.

## 5. Database Design

### Accounts

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  broker_name text,
  account_type text,
  base_currency text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Cash Balances

```sql
create table cash_balances (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id),
  account_id uuid references accounts(id),
  currency text not null,
  amount numeric not null,
  as_of_date date not null,
  notes text,
  source_type text not null default 'manual',
  source_event_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, account_id, currency, as_of_date)
);
```

### Holdings

```sql
create table holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id),
  account_id uuid references accounts(id),
  asset_id uuid not null references assets(id),
  asset_type text not null,
  ticker text,
  asset_name text,
  quantity numeric not null,
  average_cost numeric,
  cost_currency text not null,
  first_purchase_date date,
  notes text,
  source_type text not null default 'manual',
  source_event_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, account_id, asset_id)
);
```

### Transactions

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id),
  account_id uuid references accounts(id),
  asset_id uuid references assets(id),
  transaction_type text not null,
  asset_type text,
  ticker text,
  asset_name text,
  quantity numeric,
  price numeric,
  gross_amount numeric,
  fees numeric not null default 0,
  net_amount numeric,
  currency text not null,
  transaction_date date not null,
  notes text,
  source_type text not null default 'manual',
  source_event_id uuid,
  external_id text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Ingestion Events

```sql
create table ingestion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  portfolio_id uuid not null references portfolios(id),
  source_type text not null,
  source_name text,
  status text not null,
  raw_payload jsonb not null default '{}',
  normalized_payload jsonb not null default '{}',
  validation_errors jsonb not null default '[]',
  duplicate_warnings jsonb not null default '[]',
  created_records jsonb not null default '[]',
  updated_records jsonb not null default '[]',
  deleted_records jsonb not null default '[]',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
```

### Cost Basis Lots

Phase 1 can store simple average cost on holdings. Add lots early if future tax-lot tracking is likely.

```sql
create table cost_basis_lots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id),
  account_id uuid references accounts(id),
  holding_id uuid references holdings(id),
  asset_id uuid not null references assets(id),
  acquisition_date date not null,
  quantity numeric not null,
  remaining_quantity numeric not null,
  unit_cost numeric not null,
  currency text not null,
  source_transaction_id uuid references transactions(id),
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 6. Validation Logic

### Common Validation

Required:

- Portfolio ID.
- Currency.
- Account or broker/account name.
- Source type.

Rules:

- Currency must be a valid ISO currency code.
- Dates cannot be unreasonably far in the future.
- Notes must be length-limited.
- Asset type must be from allowed values.
- Ticker should be normalized to uppercase for listed instruments and preserved separately as raw input if needed.

Allowed asset types:

- `stock`
- `etf`
- `bond_etf`
- `gold_etf`
- `crypto`
- `cash`
- `other`

### Cash Validation

Rules:

- Cash amount is required.
- Currency is required.
- Negative cash can be allowed only if user explicitly confirms margin, overdraft, or adjustment behavior.
- As-of date is required.
- Duplicate same-date cash balance for same account and currency should warn before overwrite.

### Holding Validation

Rules:

- Asset type is required.
- Ticker is required unless asset type is cash.
- Quantity must be greater than zero.
- Average cost must be greater than or equal to zero.
- Currency is required.
- Purchase date should not be after today.
- Asset must be resolvable or user must confirm manual unresolved asset.
- Duplicate holding in same account should warn.

### Transaction Validation

Rules:

- Transaction type is required.
- Transaction date is required.
- Currency is required.
- Buy/sell transactions require ticker, quantity, and price.
- Quantity must be positive for user input; transaction direction comes from transaction type.
- Fees must be greater than or equal to zero.
- Sell quantity cannot exceed current quantity unless user confirms short sale or correction.
- Deposit/withdraw cash requires amount and currency.
- Split requires split ratio.

### Validation Pseudo-Code

```ts
export function validateManualHolding(input: ManualHoldingInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!input.assetType) errors.push(fieldError("assetType", "Asset type is required"));
  if (input.assetType !== "cash" && !input.ticker) {
    errors.push(fieldError("ticker", "Ticker is required"));
  }
  if (input.quantity <= 0) errors.push(fieldError("quantity", "Quantity must be greater than zero"));
  if (input.averageCost != null && input.averageCost < 0) {
    errors.push(fieldError("averageCost", "Average cost cannot be negative"));
  }
  if (!isIsoCurrency(input.currency)) {
    errors.push(fieldError("currency", "Currency must be a valid ISO code"));
  }
  if (isFutureDate(input.purchaseDate)) {
    errors.push(fieldError("purchaseDate", "Purchase date cannot be in the future"));
  }

  return { ok: errors.length === 0, errors, warnings };
}
```

## 7. Duplicate Warning Logic

Duplicate detection should warn, not automatically block, unless the duplicate would corrupt a unique portfolio state.

### Holding Duplicate Checks

Warn when:

- Same portfolio, account, ticker, and asset type already exists.
- Same ticker exists in another account.
- Same asset exists under a different ticker alias.
- Same unresolved asset name looks similar to existing asset.

Actions:

- Add as separate account holding.
- Merge with existing holding.
- Replace existing holding.
- Cancel.

### Transaction Duplicate Checks

Warn when:

- Same account, ticker, transaction type, quantity, price, currency, and date already exists.
- Imported future CSV/IBKR external ID matches an existing transaction.
- Manual transaction closely matches another transaction within a configurable date window.

### Duplicate Pseudo-Code

```ts
export async function findPotentialHoldingDuplicates(input: ManualHoldingInput) {
  const sameAccount = await holdings.findByAccountAndAsset({
    portfolioId: input.portfolioId,
    accountId: input.accountId,
    ticker: normalizeTicker(input.ticker),
  });

  const crossAccount = await holdings.findByAssetAcrossPortfolio({
    portfolioId: input.portfolioId,
    ticker: normalizeTicker(input.ticker),
  });

  return buildDuplicateWarnings({ sameAccount, crossAccount });
}
```

## 8. Reconciliation Logic

The system should reconcile source inputs into current holdings and cash balances.

### Two Ingestion Modes

Snapshot mode:

- User enters current holdings and cash.
- App treats values as current state.
- App can create synthetic opening transactions for auditability.
- Best for first-time setup.

Transaction mode:

- User enters buys, sells, deposits, withdrawals, fees, dividends, and adjustments.
- App derives holdings and cash from transaction history.
- Best for ongoing maintenance.

Phase 1 should support both, but clearly label them.

### Holding Reconciliation

For buys:

- Increase quantity.
- Increase total cost basis by quantity times price plus fees.
- Recalculate average cost.
- Create cost basis lot.

For sells:

- Decrease quantity.
- Reduce cost basis according to Phase 1 method.
- Phase 1 default: average cost.
- Future: FIFO, LIFO, specific lot.

For manual holding snapshot:

- Upsert current holding.
- Set average cost from user input.
- Create or update an opening cost basis lot.

### Cash Reconciliation

For buy:

- Reduce cash by net amount plus fees in transaction currency.

For sell:

- Increase cash by net proceeds minus fees.

For deposit:

- Increase cash.

For withdrawal:

- Decrease cash.

For multi-currency:

- Maintain native cash balances by currency.
- Convert to portfolio base currency only for reporting.
- Store FX rate used for reporting snapshots when available.

### Reconciliation Pseudo-Code

```ts
export class PortfolioReconciliationService {
  async applyTransaction(transaction: Transaction): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (transaction.transactionType === "buy") {
        await this.holdings.increasePosition(tx, transaction);
        await this.costBasis.addLot(tx, transaction);
        await this.cash.decrease(tx, cashImpactOfBuy(transaction));
      }

      if (transaction.transactionType === "sell") {
        await this.holdings.decreasePosition(tx, transaction);
        await this.costBasis.reduceLotsByAverageCost(tx, transaction);
        await this.cash.increase(tx, cashImpactOfSell(transaction));
      }

      await this.transactions.save(tx, transaction);
    });
  }
}
```

## 9. Multi-Currency Design

### Storage

Store transaction and holding cost basis in native currency.

Store:

- `currency`
- `cost_currency`
- `base_currency`
- `fx_rate_to_base`
- `fx_rate_as_of`

### Reporting

Portfolio dashboards should show:

- Native value.
- Base-currency value.
- FX conversion date.
- Missing FX warnings.

### Rules

- Do not overwrite native cost basis with converted values.
- Convert only for reporting, allocation, benchmarking, and risk analytics.
- If FX data is unavailable, keep native values and display a warning.

## 10. Error States

### Field-Level Errors

Examples:

- Missing ticker.
- Invalid currency.
- Quantity must be greater than zero.
- Average cost cannot be negative.
- Purchase date cannot be in the future.
- Sell quantity exceeds current holding.

### Asset Resolution Errors

Examples:

- Ticker not found.
- Ticker maps to multiple exchanges.
- Asset type conflicts with known provider metadata.
- Crypto symbol ambiguous.

User options:

- Choose from matches.
- Save as unresolved manual asset.
- Cancel entry.

### Duplicate Warnings

Examples:

- This holding already exists in the selected account.
- A similar transaction already exists.
- This ticker exists in another account.

User options:

- Merge.
- Add separately.
- Replace.
- Cancel.

### Reconciliation Errors

Examples:

- Sell quantity exceeds available quantity.
- Cash balance would become negative.
- Transaction edit would create inconsistent holding state.
- Missing FX rate for reporting.

### System Errors

Examples:

- Market data provider unavailable.
- Database save failed.
- Auth session expired.
- Background reconciliation failed.

System errors should preserve draft input where possible.

## 11. UI Components

### Portfolio Setup Wizard

Steps:

- Base currency.
- Accounts.
- Cash balances.
- Holdings.
- Review and confirm.

### Manual Holding Form

Fields:

- Asset type.
- Ticker.
- Asset name.
- Quantity.
- Average cost.
- Purchase date.
- Currency.
- Broker/account name.
- Notes.

UI behavior:

- Resolve ticker after entry.
- Show duplicate warning inline.
- Show estimated market value when price is available.
- Show cost basis preview.

### Manual Transaction Form

Fields:

- Transaction type.
- Asset type.
- Ticker.
- Asset name.
- Quantity.
- Price.
- Fees.
- Transaction date.
- Currency.
- Broker/account name.
- Notes.

UI behavior:

- Dynamic fields based on transaction type.
- Cash impact preview.
- Holding impact preview.
- Cost basis preview.

### Cash Balance Form

Fields:

- Cash available.
- Currency.
- Broker/account name.
- As-of date.
- Notes.

UI behavior:

- Warn on duplicate same-account same-currency balance.
- Show base-currency conversion if FX rate exists.

### Ingestion Review Screen

Shows:

- New holdings.
- Updated holdings.
- New transactions.
- Cash changes.
- Duplicate warnings.
- Validation errors.
- Unresolved assets.
- Estimated portfolio allocation.

### Reconciliation Drawer

Shows:

- Before and after quantity.
- Before and after cash.
- Before and after average cost.
- Affected cost basis lots.
- Warnings.

### Activity Log

Shows:

- Manual entries.
- Edits.
- Deletes.
- Import events.
- Reconciliation events.
- Error states.

## 12. Service Interfaces

```ts
export interface IngestionService {
  createManualCashEntry(input: ManualCashInput): Promise<IngestionResult>;
  createManualHolding(input: ManualHoldingInput): Promise<IngestionResult>;
  createManualTransaction(input: ManualTransactionInput): Promise<IngestionResult>;
  updateManualEntry(input: UpdateManualEntryInput): Promise<IngestionResult>;
  deleteManualEntry(input: DeleteManualEntryInput): Promise<IngestionResult>;
  validateDraft(input: ManualIngestionDraft): Promise<ValidationResult>;
  previewReconciliation(input: ManualIngestionDraft): Promise<ReconciliationPreview>;
}
```

```ts
export interface AssetResolutionService {
  resolveAsset(input: ResolveAssetInput): Promise<AssetResolutionResult>;
  createManualAsset(input: CreateManualAssetInput): Promise<Asset>;
}
```

```ts
export interface PortfolioReconciliationService {
  applyTransaction(transaction: Transaction): Promise<void>;
  rebuildPortfolioState(portfolioId: string): Promise<ReconciliationResult>;
  previewTransactionImpact(input: ManualTransactionInput): Promise<ReconciliationPreview>;
}
```

## 13. Future CSV and IBKR Extensibility

Manual entry, CSV import, and IBKR import should all use the same pipeline:

```text
Raw source input
  -> Source parser
  -> Normalized ingestion draft
  -> Validation
  -> Asset resolution
  -> Duplicate detection
  -> User review
  -> Reconciliation
  -> Portfolio records
```

### Source Adapter Interface

```ts
export interface IngestionSourceAdapter {
  sourceType: "manual" | "csv" | "ibkr";
  parse(input: unknown): Promise<NormalizedIngestionDraft[]>;
}
```

### Normalized Draft

```ts
export interface NormalizedIngestionDraft {
  sourceType: "manual" | "csv" | "ibkr";
  entryType: "cash" | "holding" | "transaction";
  accountName?: string;
  assetType?: AssetType;
  ticker?: string;
  assetName?: string;
  quantity?: number;
  averageCost?: number;
  price?: number;
  fees?: number;
  cashAmount?: number;
  transactionType?: TransactionType;
  date: string;
  currency: string;
  notes?: string;
  rawRow?: Record<string, unknown>;
  externalId?: string;
}
```

CSV and IBKR should not bypass validation, duplicate detection, or reconciliation.

## 14. Example Outputs

### Duplicate Holding Warning

```text
This holding already exists in your IBKR account:

AAPL - 12 shares, USD average cost 181.20

Choose whether to merge the new quantity into the existing holding, replace the existing holding snapshot, or add it as a separate account position.
```

### Reconciliation Preview

```text
Buy 5 shares of VOO at USD 480.00

Holding impact:
- VOO quantity: 10 -> 15
- Average cost: USD 455.00 -> USD 463.33

Cash impact:
- USD cash: 8,000.00 -> 5,595.00
- Includes USD 5.00 fee
```

### Multi-Currency Warning

```text
This transaction is in HKD, while your portfolio base currency is USD.

The transaction will be stored in HKD. Portfolio value will be converted to USD for reporting once an FX rate is available.
```

## 15. Implementation Rules

- UI forms submit drafts, not final domain records.
- All entry paths use the same validation service.
- All entry paths use the same reconciliation service.
- Manual entries create ingestion events.
- Edits and deletes preserve audit history.
- Native currencies are preserved.
- Supabase calls stay inside repositories or infrastructure adapters.
- CSV and IBKR imports should reuse the normalized draft model.

