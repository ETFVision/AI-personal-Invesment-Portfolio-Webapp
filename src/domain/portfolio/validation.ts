import { z } from "zod";

const currencySchema = z
  .string()
  .trim()
  .length(3, "Currency must be a 3-letter ISO code")
  .transform((value) => value.toUpperCase());

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const positiveNumber = z.coerce.number().finite().positive();
const nonNegativeNumber = z.coerce.number().finite().min(0);

export const setupPortfolioSchema = z.object({
  name: z.string().trim().min(1, "Portfolio name is required").max(80),
  baseCurrency: currencySchema,
  riskProfile: z.string().trim().max(40).optional()
});

export const cashBalanceSchema = z.object({
  id: z.string().uuid().optional(),
  portfolioId: z.string().uuid(),
  amount: z.coerce.number().finite(),
  currency: currencySchema,
  accountName: optionalText,
  brokerName: optionalText,
  asOfDate: z.string().min(1, "As-of date is required"),
  notes: optionalText
});

export const holdingSchema = z.object({
  id: z.string().uuid().optional(),
  portfolioId: z.string().uuid(),
  assetType: z.enum(["stock", "etf", "bond_etf", "gold_etf", "crypto", "cash", "other"]),
  ticker: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value.toUpperCase()))
    .nullable()
    .optional(),
  assetName: z.string().trim().min(1, "Asset name is required").max(120),
  quantity: positiveNumber,
  averageCost: nonNegativeNumber.optional(),
  costCurrency: currencySchema,
  accountName: optionalText,
  brokerName: optionalText,
  firstPurchaseDate: z
    .string()
    .optional()
    .transform((value) => (!value ? null : value)),
  notes: optionalText
});

export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  portfolioId: z.string().uuid(),
  transactionType: z.enum(["buy", "sell", "deposit_cash", "withdraw_cash", "interest_cash", "dividend", "fee", "manual_adjustment"]),
  assetType: z.enum(["stock", "etf", "bond_etf", "gold_etf", "crypto", "cash", "other"]).optional(),
  ticker: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value.toUpperCase()))
    .nullable()
    .optional(),
  assetName: z.string().trim().optional(),
  quantity: z.coerce.number().finite().positive().optional(),
  price: z.coerce.number().finite().min(0).optional(),
  fees: z.coerce.number().finite().min(0).default(0),
  currency: currencySchema,
  accountName: optionalText,
  brokerName: optionalText,
  transactionDate: z.string().min(1, "Transaction date is required"),
  notes: optionalText
}).superRefine((input, ctx) => {
  if (input.transactionType === "buy" || input.transactionType === "sell") {
    if (!input.ticker && !input.assetName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ticker"],
        message: "Ticker or asset name is required for buy/sell transactions"
      });
    }
    if (input.quantity == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Quantity is required for buy/sell transactions"
      });
    }
    if (input.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Price is required for buy/sell transactions"
      });
    }
  }
  if (["deposit_cash", "withdraw_cash", "interest_cash", "dividend", "fee"].includes(input.transactionType)) {
    if (input.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Amount is required for cash movements, income, dividends, and fees"
      });
    }
  }
});

export type SetupPortfolioInput = z.infer<typeof setupPortfolioSchema>;
export type CashBalanceInput = z.infer<typeof cashBalanceSchema>;
export type HoldingInput = z.infer<typeof holdingSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
