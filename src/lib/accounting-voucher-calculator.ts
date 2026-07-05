import type {
  ExpenseReceiptFormState,
  JournalEntryFormState,
  JournalEntryLine,
  TransferVoucherFormState,
} from "@/types/accounting-voucher";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeExpenseReceiptTotal(form: ExpenseReceiptFormState): number {
  return round2(
    form.lines
      .filter((row) => row.amount > 0)
      .reduce((sum, row) => sum + row.amount, 0)
  );
}

export function computeJournalTotals(lines: JournalEntryLine[]): {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  const totalDebit = round2(
    lines.filter((row) => row.side === "DR").reduce((sum, row) => sum + row.amount, 0)
  );
  const totalCredit = round2(
    lines.filter((row) => row.side === "CR").reduce((sum, row) => sum + row.amount, 0)
  );
  return {
    totalDebit,
    totalCredit,
    isBalanced: totalDebit === totalCredit && totalDebit > 0,
  };
}

export function validateExpenseReceiptForm(
  form: ExpenseReceiptFormState,
  voucherLabel: string
): string | null {
  if (!form.voucherDate.trim()) return "Date is required.";
  const validLines = form.lines.filter(
    (row) =>
      row.accountDebitedId &&
      row.accountCreditedId &&
      row.amount > 0
  );
  if (validLines.length === 0) {
    return `Add at least one ${voucherLabel} line with accounts and amount.`;
  }
  return null;
}

export function validateJournalEntryForm(form: JournalEntryFormState): string | null {
  if (!form.entryDate.trim()) return "Date is required.";
  const validLines = form.lines.filter((row) => row.accountId && row.amount > 0);
  if (validLines.length < 2) return "Add at least one debit and one credit line.";
  const { isBalanced, totalDebit, totalCredit } = computeJournalTotals(form.lines);
  if (!isBalanced) {
    return `Journal entry must balance. Debit ${totalDebit} ≠ Credit ${totalCredit}.`;
  }
  return null;
}

export function validateTransferVoucherForm(form: TransferVoucherFormState): string | null {
  if (!form.transferDate.trim()) return "Date is required.";
  const validLines = form.lines.filter(
    (row) =>
      row.sourceGodownId &&
      row.destinationGodownId &&
      row.itemId &&
      row.quantity > 0
  );
  if (validLines.length === 0) {
    return "Add at least one transfer line with godowns, item, and quantity.";
  }
  const invalidRoute = validLines.find(
    (row) => row.sourceGodownId === row.destinationGodownId
  );
  if (invalidRoute) return "Source and destination godown must be different.";
  return null;
}

export function isLedgerLineFilled(line: {
  accountDebitedId: string;
  accountCreditedId: string;
  amount: number;
}): boolean {
  return Boolean(line.accountDebitedId && line.accountCreditedId && line.amount > 0);
}

export function isJournalLineFilled(line: {
  accountId: string;
  amount: number;
}): boolean {
  return Boolean(line.accountId && line.amount > 0);
}

export function isTransferLineFilled(line: {
  sourceGodownId: string;
  destinationGodownId: string;
  itemId: string;
  quantity: number;
}): boolean {
  return Boolean(
    line.sourceGodownId &&
      line.destinationGodownId &&
      line.itemId &&
      line.quantity > 0
  );
}
