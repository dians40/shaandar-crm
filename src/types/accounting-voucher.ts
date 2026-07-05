export type ExpenseReceiptKind = "expense" | "receipt";

export type LedgerPostingLine = {
  id: string;
  accountDebitedId: string;
  accountDebitedName: string;
  accountCreditedId: string;
  accountCreditedName: string;
  amount: number;
  narration: string;
};

export type ExpenseReceiptVoucherRecord = {
  id: string;
  voucherKind: ExpenseReceiptKind;
  voucherNumber: string;
  voucherDate: string;
  partyDisplayName: string;
  lines: LedgerPostingLine[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseReceiptFormState = Omit<
  ExpenseReceiptVoucherRecord,
  "id" | "totalAmount" | "createdAt" | "updatedAt"
>;

export type JournalEntrySide = "DR" | "CR";

export type JournalEntryLine = {
  id: string;
  accountId: string;
  accountName: string;
  side: JournalEntrySide;
  amount: number;
  narration: string;
};

export type JournalEntryRecord = {
  id: string;
  entryNumber: string;
  entryDate: string;
  primaryAccountName: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JournalEntryFormState = Omit<
  JournalEntryRecord,
  "id" | "totalDebit" | "totalCredit" | "isBalanced" | "createdAt" | "updatedAt"
>;

export type TransferVoucherLine = {
  id: string;
  sourceGodownId: string;
  sourceGodownName: string;
  destinationGodownId: string;
  destinationGodownName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  transferReference: string;
};

export type TransferVoucherRecord = {
  id: string;
  transferNumber: string;
  transferDate: string;
  displayLabel: string;
  lines: TransferVoucherLine[];
  createdAt: string;
  updatedAt: string;
};

export type TransferVoucherFormState = Omit<
  TransferVoucherRecord,
  "id" | "createdAt" | "updatedAt"
>;

export function createEmptyLedgerLine(): LedgerPostingLine {
  return {
    id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountDebitedId: "",
    accountDebitedName: "",
    accountCreditedId: "",
    accountCreditedName: "",
    amount: 0,
    narration: "",
  };
}

export function createEmptyJournalLine(side: JournalEntrySide = "DR"): JournalEntryLine {
  return {
    id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountId: "",
    accountName: "",
    side,
    amount: 0,
    narration: "",
  };
}

export function createEmptyTransferLine(): TransferVoucherLine {
  return {
    id: `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceGodownId: "",
    sourceGodownName: "",
    destinationGodownId: "",
    destinationGodownName: "",
    itemId: "",
    itemName: "",
    quantity: 0,
    transferReference: "",
  };
}

export function emptyExpenseReceiptForm(kind: ExpenseReceiptKind): ExpenseReceiptFormState {
  return {
    voucherKind: kind,
    voucherNumber: "",
    voucherDate: new Date().toISOString().slice(0, 10),
    partyDisplayName: "",
    lines: [createEmptyLedgerLine()],
  };
}

export function emptyJournalEntryForm(): JournalEntryFormState {
  return {
    entryNumber: "",
    entryDate: new Date().toISOString().slice(0, 10),
    primaryAccountName: "",
    lines: [createEmptyJournalLine("DR"), createEmptyJournalLine("CR")],
  };
}

export function emptyTransferVoucherForm(): TransferVoucherFormState {
  return {
    transferNumber: "",
    transferDate: new Date().toISOString().slice(0, 10),
    displayLabel: "",
    lines: [createEmptyTransferLine()],
  };
}

function normalizeLedgerLine(line: Partial<LedgerPostingLine>): LedgerPostingLine {
  return {
    id: line.id ?? createEmptyLedgerLine().id,
    accountDebitedId: line.accountDebitedId ?? "",
    accountDebitedName: line.accountDebitedName ?? "",
    accountCreditedId: line.accountCreditedId ?? "",
    accountCreditedName: line.accountCreditedName ?? "",
    amount: Number(line.amount) || 0,
    narration: line.narration ?? "",
  };
}

function normalizeJournalLine(line: Partial<JournalEntryLine>): JournalEntryLine {
  return {
    id: line.id ?? createEmptyJournalLine().id,
    accountId: line.accountId ?? "",
    accountName: line.accountName ?? "",
    side: line.side === "CR" ? "CR" : "DR",
    amount: Number(line.amount) || 0,
    narration: line.narration ?? "",
  };
}

function normalizeTransferLine(line: Partial<TransferVoucherLine>): TransferVoucherLine {
  return {
    id: line.id ?? createEmptyTransferLine().id,
    sourceGodownId: line.sourceGodownId ?? "",
    sourceGodownName: line.sourceGodownName ?? "",
    destinationGodownId: line.destinationGodownId ?? "",
    destinationGodownName: line.destinationGodownName ?? "",
    itemId: line.itemId ?? "",
    itemName: line.itemName ?? "",
    quantity: Number(line.quantity) || 0,
    transferReference: line.transferReference ?? "",
  };
}

export function normalizeExpenseReceiptRecord(
  row: Partial<ExpenseReceiptVoucherRecord> & Pick<ExpenseReceiptVoucherRecord, "id">
): ExpenseReceiptVoucherRecord {
  const lines = Array.isArray(row.lines) ? row.lines.map(normalizeLedgerLine) : [];
  const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    id: row.id,
    voucherKind: row.voucherKind === "receipt" ? "receipt" : "expense",
    voucherNumber: row.voucherNumber ?? "",
    voucherDate: row.voucherDate ?? new Date().toISOString().slice(0, 10),
    partyDisplayName: row.partyDisplayName ?? "",
    lines,
    totalAmount: Number(row.totalAmount) || totalAmount,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function normalizeJournalEntryRecord(
  row: Partial<JournalEntryRecord> & Pick<JournalEntryRecord, "id">
): JournalEntryRecord {
  const lines = Array.isArray(row.lines) ? row.lines.map(normalizeJournalLine) : [];
  const totalDebit = lines.filter((l) => l.side === "DR").reduce((s, l) => s + l.amount, 0);
  const totalCredit = lines.filter((l) => l.side === "CR").reduce((s, l) => s + l.amount, 0);
  const roundedDebit = Math.round(totalDebit * 100) / 100;
  const roundedCredit = Math.round(totalCredit * 100) / 100;
  return {
    id: row.id,
    entryNumber: row.entryNumber ?? "",
    entryDate: row.entryDate ?? new Date().toISOString().slice(0, 10),
    primaryAccountName: row.primaryAccountName ?? "",
    lines,
    totalDebit: roundedDebit,
    totalCredit: roundedCredit,
    isBalanced: roundedDebit === roundedCredit && roundedDebit > 0,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function normalizeTransferVoucherRecord(
  row: Partial<TransferVoucherRecord> & Pick<TransferVoucherRecord, "id">
): TransferVoucherRecord {
  const lines = Array.isArray(row.lines) ? row.lines.map(normalizeTransferLine) : [];
  return {
    id: row.id,
    transferNumber: row.transferNumber ?? "",
    transferDate: row.transferDate ?? new Date().toISOString().slice(0, 10),
    displayLabel: row.displayLabel ?? "",
    lines,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}
