import type { ExpenseReceiptKind } from "@/types/accounting-voucher";

export type ExpenseReceiptPanelConfig = {
  kind: ExpenseReceiptKind;
  moduleName: string;
  voucherLabel: string;
  partyLabel: string;
  numberPrefix: string;
};

export const EXPENSE_RECEIPT_CONFIGS: Record<
  "expenses" | "receipt",
  ExpenseReceiptPanelConfig
> = {
  expenses: {
    kind: "expense",
    moduleName: "Expenses",
    voucherLabel: "Expense Voucher",
    partyLabel: "Payee Name",
    numberPrefix: "EXP",
  },
  receipt: {
    kind: "receipt",
    moduleName: "Receipt",
    voucherLabel: "Receipt Voucher",
    partyLabel: "Party Name",
    numberPrefix: "RCT",
  },
};
